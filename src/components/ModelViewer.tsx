import { useEffect, useMemo, useRef, useState } from 'react'
import tippy from 'tippy.js'
import type { UpgradeNode } from '../types'

const assetBaseUrl = import.meta.env.BASE_URL

type ModelViewerProps = {
  activeUpgrades: UpgradeNode[]
  selectedUpgrades: UpgradeNode[]
  totalGold: number
  showBuildControls: boolean
  buildCode: string
  onBuildCodeChange: (value: string) => void
  onReset: () => void
  onCopyBuildCode: () => void
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function UpgradeSummaryIcon({ upgrade }: { upgrade: UpgradeNode }) {
  const [showFallback, setShowFallback] = useState(false)

  if (showFallback) {
    return <div className="activated-upgrade-icon-fallback">{upgrade.name.slice(0, 2)}</div>
  }

  return (
    <img
      src={`${assetBaseUrl}assets/icons/${upgrade.iconFile}`}
      alt=""
      width={28}
      height={28}
      className="activated-upgrade-icon"
      onError={() => setShowFallback(true)}
    />
  )
}

export function ModelViewer({
  activeUpgrades,
  selectedUpgrades,
  totalGold,
  showBuildControls,
  buildCode,
  onBuildCodeChange,
  onReset,
  onCopyBuildCode,
}: ModelViewerProps) {
  const timesUpgradedRef = useRef<HTMLSpanElement | null>(null)

  const selectedUpgradeTooltipHtml = useMemo(() => {
    if (selectedUpgrades.length === 0) {
      return '<div class="selected-upgrades-tooltip">No upgrades selected yet.</div>'
    }

    return `
      <div class="selected-upgrades-tooltip">
        ${selectedUpgrades.map((upgrade) => escapeHtml(upgrade.name)).join(', ')}
      </div>
    `
  }, [selectedUpgrades])

  useEffect(() => {
    const target = timesUpgradedRef.current

    if (!target) {
      return
    }

    const instance = tippy(target, {
      allowHTML: true,
      appendTo: () => document.body,
      content: selectedUpgradeTooltipHtml,
      maxWidth: 320,
      placement: 'top',
    })

    return () => {
      instance.destroy()
    }
  }, [selectedUpgradeTooltipHtml])

  return (
    <div className="model-shell">
      <img
        src={`${assetBaseUrl}assets/arena.png`}
        alt=""
        className="arena-underlay"
        aria-hidden="true"
      />

      {showBuildControls ? (
        <section className="model-build-controls" aria-label="Build controls">
          <div className="model-build-actions">
            <button type="button" onClick={onReset}>
              Reset
            </button>
            <button type="button" onClick={onCopyBuildCode}>
              Copy
            </button>
          </div>
          <label htmlFor="model-build-code">Build code</label>
          <input
            id="model-build-code"
            type="text"
            value={buildCode}
            onChange={(event) => onBuildCodeChange(event.target.value)}
            placeholder="Paste build code"
            spellCheck={false}
            className="build-code-input"
          />
        </section>
      ) : null}

      <div className="model-display">
        <model-viewer
          src={`${assetBaseUrl}models/praetorian_graves.glb`}
          alt="Praetorian Graves"
          autoplay
          auto-rotate
          animation-name="Idle1"
          interaction-prompt="none"
          scale="0.0108 0.0108 0.0108"
          camera-target="0m 0.9m 0m"
          camera-orbit="0deg 75deg 4.7m"
          field-of-view="27deg"
          shadow-intensity="1"
          disable-pan
          disable-tap
          touch-action="none"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <section className="activated-upgrades-panel" aria-label="Activated upgrades">
        <div className="activated-upgrades-header">
          <h2>Activated Upgrades</h2>
          <div className="activated-upgrades-stats">
            <p className="activated-upgrades-stat">
              <span className="activated-upgrades-stat-label">Total Gold:</span> {totalGold}
            </p>
            <p className="activated-upgrades-stat">
              <span className="activated-upgrades-stat-label">Times upgraded:</span>{' '}
              <span ref={timesUpgradedRef} className="activated-upgrades-stat-value">
                {selectedUpgrades.length}
              </span>
            </p>
          </div>
        </div>

        {activeUpgrades.length > 0 ? (
          <ul className="activated-upgrades-list">
            {activeUpgrades.map((upgrade) => (
              <li key={upgrade.id} className="activated-upgrade-item">
                <UpgradeSummaryIcon upgrade={upgrade} />
                <span className="activated-upgrade-copy">
                  <span className="activated-upgrade-name">{upgrade.name}</span>{' '}
                  <span className="activated-upgrade-description">({upgrade.description})</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="activated-upgrades-empty">No upgrades activated yet.</p>
        )}
      </section>
    </div>
  )
}
