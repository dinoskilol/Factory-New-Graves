import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { AtSign, CircleHelp, CodeXml } from 'lucide-react'
import tippy from 'tippy.js'
import './index.css'
import { ModelViewer } from './components/ModelViewer'
import { UpgradeTree } from './components/UpgradeTree'
import { upgradeDisplayNodes, upgrades } from './data/upgrades'
import { exportBuildCode } from './lib/buildCode'
import { getActivatedUpgrades, getTotalGold, importBuild, normalizeSelectedSet } from './lib/tree'

type TabId = 'builder' | 'full'

function getInitialState() {
  const emptySelectedIds = new Set<string>()
  const emptyCode = exportBuildCode(emptySelectedIds)

  if (typeof window === 'undefined') {
    return {
      selectedIds: emptySelectedIds,
      codeField: emptyCode,
    }
  }

  const url = new URL(window.location.href)
  const buildFromUrl = url.searchParams.get('build')

  if (!buildFromUrl) {
    return {
      selectedIds: emptySelectedIds,
      codeField: emptyCode,
    }
  }

  try {
    const imported = importBuild(upgrades, buildFromUrl)
    return {
      selectedIds: new Set(imported),
      codeField: exportBuildCode(imported),
    }
  } catch (error) {
    return {
      selectedIds: emptySelectedIds,
      codeField: emptyCode,
    }
  }
}

function App() {
  const infoButtonRef = useRef<HTMLButtonElement | null>(null)
  const initialState = useMemo(() => getInitialState(), [])
  const [activeTab, setActiveTab] = useState<TabId>('builder')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(initialState.selectedIds)
  const [codeField, setCodeField] = useState(initialState.codeField)

  const totalGold = useMemo(() => getTotalGold(upgrades, selectedIds), [selectedIds])
  const selectedUpgrades = useMemo(
    () => upgrades.filter((upgrade) => selectedIds.has(upgrade.id)),
    [selectedIds],
  )
  const activatedUpgrades = useMemo(() => getActivatedUpgrades(upgrades, selectedIds), [selectedIds])
  const exportCode = useMemo(() => exportBuildCode(selectedIds), [selectedIds])

  useEffect(() => {
    const url = new URL(window.location.href)

    if (selectedIds.size === 0) {
      url.searchParams.delete('build')
    } else {
      url.searchParams.set('build', exportCode)
    }

    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [exportCode, selectedIds.size])

  useEffect(() => {
    const target = infoButtonRef.current

    if (!target) {
      return
    }

    const instance = tippy(target, {
      content:
        'Build and share Factory New Graves upgrade paths, compare frame trees, and copy importable build codes.',
      maxWidth: 320,
      placement: 'bottom',
    })

    return () => {
      instance.destroy()
    }
  }, [])

  function handleSelect(nodeId: string) {
    const nextSelectedIds = new Set(selectedIds)
    if (nextSelectedIds.has(nodeId)) {
      nextSelectedIds.delete(nodeId)
    } else {
      nextSelectedIds.add(nodeId)
    }

    const normalizedSelectedIds = normalizeSelectedSet(upgrades, nextSelectedIds)
    setSelectedIds(normalizedSelectedIds)
    setCodeField(exportBuildCode(normalizedSelectedIds))
  }

  function handleReset() {
    const nextSelectedIds = new Set<string>()
    setSelectedIds(nextSelectedIds)
    setCodeField('')
  }

  function handleCodeChange(value: string) {
    setCodeField(value)
    const trimmed = value.trim()

    if (trimmed === '') {
      const nextSelectedIds = new Set<string>()
      startTransition(() => {
        setSelectedIds(nextSelectedIds)
      })
      setCodeField('')
      return
    }

    try {
      const imported = importBuild(upgrades, trimmed)

      startTransition(() => {
        setSelectedIds(new Set(imported))
      })

      setCodeField(exportBuildCode(imported))
    } catch {}
  }

  async function handleCopyBuildCode() {
    const valueToCopy = exportCode

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }

    try {
      await navigator.clipboard.writeText(valueToCopy)
      setCodeField(valueToCopy)
    } catch {}
  }

  return (
    <main className="page">
      <section className="builder-panel">
        <div className="builder-header">
          <div className="title-row">
            <h1>TFT Set 17 Factory New Graves Builder</h1>
            <button
              ref={infoButtonRef}
              type="button"
              className="info-button"
              aria-label="About this website"
            >
              <CircleHelp size={16} strokeWidth={2.2} />
            </button>
          </div>

          <div className="link-row">
            <a
              href="https://github.com/dinoskilol/Factory-New-Graves"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub repository"
            >
              <CodeXml size={16} strokeWidth={2.2} />
              <span>GitHub</span>
            </a>
            <a href="https://x.com/dinoskiLoL" target="_blank" rel="noreferrer" aria-label="X profile">
              <AtSign size={16} strokeWidth={2.2} />
              <span>X</span>
            </a>
          </div>

          <div className="controls-row">
            <button type="button" onClick={() => setActiveTab('builder')}>
              Builder
            </button>{' '}
            <button type="button" onClick={() => setActiveTab('full')}>
              Full Tree
            </button>
          </div>

          {activeTab === 'full' ? <p>Full Tree shows every upgrade without any unlock gating.</p> : null}
        </div>

        <div className="tree-scroll-area">
          <UpgradeTree
            nodes={upgrades}
            displayNodes={upgradeDisplayNodes}
            selectedIds={selectedIds}
            interactive={activeTab === 'builder'}
            onSelect={handleSelect}
          />
        </div>
      </section>

      <aside className="model-panel">
        <ModelViewer
          activeUpgrades={activatedUpgrades}
          selectedUpgrades={selectedUpgrades}
          totalGold={totalGold}
          showBuildControls={activeTab === 'builder'}
          buildCode={codeField}
          onBuildCodeChange={handleCodeChange}
          onReset={handleReset}
          onCopyBuildCode={handleCopyBuildCode}
        />
      </aside>
    </main>
  )
}

export default App
