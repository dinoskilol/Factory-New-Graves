import { startTransition, useEffect, useMemo, useState } from 'react'
import './index.css'
import { ModelViewer } from './components/ModelViewer'
import { UpgradeTree } from './components/UpgradeTree'
import { upgradeDisplayNodes, upgrades } from './data/upgrades'
import { exportBuildCode } from './lib/buildCode'
import { getTotalGold, importBuild, normalizeSelectedSet } from './lib/tree'

type TabId = 'builder' | 'full'

function getInitialState() {
  const emptySelectedIds = new Set<string>()
  const emptyCode = exportBuildCode(emptySelectedIds)

  if (typeof window === 'undefined') {
    return {
      selectedIds: emptySelectedIds,
      codeField: emptyCode,
      message: 'Hover an upgrade to read its description.',
    }
  }

  const url = new URL(window.location.href)
  const buildFromUrl = url.searchParams.get('build')

  if (!buildFromUrl) {
    return {
      selectedIds: emptySelectedIds,
      codeField: emptyCode,
      message: 'Hover an upgrade to read its description.',
    }
  }

  try {
    const imported = importBuild(upgrades, buildFromUrl)
    return {
      selectedIds: new Set(imported),
      codeField: exportBuildCode(imported),
      message: 'Build loaded from URL.',
    }
  } catch (error) {
    return {
      selectedIds: emptySelectedIds,
      codeField: emptyCode,
      message: error instanceof Error ? error.message : 'Unable to load build from URL.',
    }
  }
}

function App() {
  const initialState = useMemo(() => getInitialState(), [])
  const [activeTab, setActiveTab] = useState<TabId>('builder')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(initialState.selectedIds)
  const [codeField, setCodeField] = useState(initialState.codeField)
  const [message, setMessage] = useState(initialState.message)

  const totalGold = useMemo(() => getTotalGold(upgrades, selectedIds), [selectedIds])
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
    setMessage('Build code updated.')
  }

  function handleReset() {
    const nextSelectedIds = new Set<string>()
    setSelectedIds(nextSelectedIds)
    setCodeField('')
    setMessage('Build reset.')
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
      setMessage('Build reset.')
      return
    }

    try {
      const imported = importBuild(upgrades, trimmed)

      startTransition(() => {
        setSelectedIds(new Set(imported))
      })

      setCodeField(exportBuildCode(imported))
      setMessage('Build code applied.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to apply build code.')
    }
  }

  return (
    <main className="page">
      <section className="builder-panel">
        <div className="builder-header">
          <div className="title-row">
            <span className="set-label">TFT Set 17</span>
            <h1>Factory New Graves Builder</h1>
          </div>

          <div className="meta-row">
            <p className="meta-item">Total Gold: {totalGold}</p>
            <p className="meta-item">Selected Upgrades: {selectedIds.size}</p>
          </div>

          <div className="controls-row">
            <button type="button" onClick={() => setActiveTab('builder')}>
              Builder
            </button>{' '}
            <button type="button" onClick={() => setActiveTab('full')}>
              Full Tree
            </button>
          </div>

          {activeTab === 'builder' ? (
            <div className="controls-block">
              <button type="button" onClick={handleReset}>
                Reset
              </button>
              <div style={{ marginTop: '8px' }}>
                <label htmlFor="build-code">Build code</label>
              </div>
              <input
                id="build-code"
                type="text"
                value={codeField}
                onChange={(event) => handleCodeChange(event.target.value)}
                placeholder="Paste build code"
                spellCheck={false}
                className="build-code-input"
              />
              <p>{message}</p>
            </div>
          ) : (
            <p>Full Tree shows every upgrade without any unlock gating.</p>
          )}
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
        <ModelViewer />
      </aside>
    </main>
  )
}

export default App
