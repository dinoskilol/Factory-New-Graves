import { useEffect, useMemo, useRef, useState } from 'react'
import tippy, { followCursor } from 'tippy.js'
import type { Instance } from 'tippy.js'
import { upgradeDescriptionHtmlById } from '../data/upgrades'
import { getNodeState } from '../lib/tree'
import type { UpgradeDisplayNode, UpgradeNode } from '../types'

const assetBaseUrl = import.meta.env.BASE_URL

type UpgradeTreeProps = {
  nodes: UpgradeNode[]
  displayNodes: UpgradeDisplayNode[]
  selectedIds: ReadonlySet<string>
  interactive: boolean
  onSelect?: (nodeId: string) => void
}

const FRAME_ORDER: UpgradeNode['frame'][] = ['assault', 'power', 'marksman']
const FRAME_LABELS: Record<UpgradeNode['frame'], string> = {
  assault: 'Assault Frame',
  power: 'Power Frame',
  marksman: 'Marksman Frame',
  other: 'Other',
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getStatIconHtml(file: string, label: string) {
  return `<img class="description-stat-icon" src="${assetBaseUrl}assets/icons/${file}" alt="${escapeHtml(label)}" title="${escapeHtml(label)}" />`
}

function getTooltipHtml(node: UpgradeNode) {
  const descriptionHtml = upgradeDescriptionHtmlById[node.id] ?? escapeHtml(node.description)

  return `
    <div class="upgrade-tooltip">
      <div class="upgrade-tooltip-name">${escapeHtml(node.name)}</div>
      <div class="upgrade-tooltip-description">${descriptionHtml}</div>
      <div class="upgrade-tooltip-cost">${node.cost} ${getStatIconHtml('gold2.png', 'gold')}</div>
    </div>
  `
}

function UpgradeIcon({ node }: { node: UpgradeNode }) {
  const [showFallback, setShowFallback] = useState(false)

  if (showFallback) {
    return <div className="upgrade-icon-fallback">{node.iconFile}</div>
  }

  return (
    <img
      src={`${assetBaseUrl}assets/icons/${node.iconFile}`}
      alt=""
      width={40}
      height={40}
      className="upgrade-icon"
      onError={() => setShowFallback(true)}
    />
  )
}

function GoldIcon() {
  return <img src={`${assetBaseUrl}assets/icons/gold2.png`} alt="gold" className="gold-icon" />
}

function UpgradeCard({
  node,
  state,
  interactive,
  onSelect,
}: {
  node: UpgradeNode
  state: ReturnType<typeof getNodeState>
  interactive: boolean
  onSelect?: () => void
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const tooltipRef = useRef<Instance | null>(null)
  const tooltipHtml = useMemo(() => getTooltipHtml(node), [node])
  const canToggle = interactive && (state === 'available' || state === 'selected')
  const ariaLabel = `${node.name}. ${node.description} Cost: ${node.cost} gold.`

  useEffect(() => {
    const button = buttonRef.current

    if (!button) {
      return
    }

    const instance = tippy(button, {
      allowHTML: true,
      appendTo: () => document.body,
      content: tooltipHtml,
      followCursor: true,
      ignoreAttributes: true,
      maxWidth: 320,
      placement: 'right',
      plugins: [followCursor],
    })

    tooltipRef.current = instance

    return () => {
      instance.destroy()
      tooltipRef.current = null
    }
  }, [tooltipHtml])

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`upgrade-card ${state}`}
      aria-label={ariaLabel}
      onClick={() => {
        if (canToggle) {
          onSelect?.()
        }
      }}
    >
      <UpgradeIcon node={node} />
      <span className="upgrade-text">
        <span className="upgrade-name">{node.name}</span>
        <span className="upgrade-cost">
          {node.cost} <GoldIcon />
        </span>
      </span>
    </button>
  )
}

function UpgradeBranch({
  displayNode,
  childMap,
  nodeMap,
  selectedIds,
  interactive,
  onSelect,
}: {
  displayNode: UpgradeDisplayNode
  childMap: Map<string, UpgradeDisplayNode[]>
  nodeMap: Map<string, UpgradeNode>
  selectedIds: ReadonlySet<string>
  interactive: boolean
  onSelect?: (nodeId: string) => void
}) {
  const node = nodeMap.get(displayNode.upgradeId)

  if (!node) {
    return null
  }

  const state = getNodeState(node, selectedIds, interactive)
  const visible = !interactive || state !== 'locked' || displayNode.frame === 'other'
  const children = childMap.get(displayNode.id) ?? []

  return (
    <div className={`tree-branch ${visible ? 'visible' : 'hidden'}`}>
      <UpgradeCard
        node={node}
        state={state}
        interactive={interactive}
        onSelect={() => onSelect?.(displayNode.upgradeId)}
      />

      {children.length > 0 ? (
        <div className="branch-children">
          {children.map((child) => (
            <UpgradeBranch
              key={child.id}
              displayNode={child}
              childMap={childMap}
              nodeMap={nodeMap}
              selectedIds={selectedIds}
              interactive={interactive}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function UpgradeTree({
  nodes,
  displayNodes,
  selectedIds,
  interactive,
  onSelect,
}: UpgradeTreeProps) {
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])

  const childMap = useMemo(() => {
    const nextMap = new Map<string, UpgradeDisplayNode[]>()

    for (const displayNode of displayNodes) {
      const parentId = displayNode.parents[0] ?? '__root__'
      const existing = nextMap.get(parentId)

      if (existing) {
        existing.push(displayNode)
      } else {
        nextMap.set(parentId, [displayNode])
      }
    }

    for (const [, childNodes] of nextMap) {
      childNodes.sort((left, right) => left.position.y - right.position.y)
    }

    return nextMap
  }, [displayNodes])

  const rootNodes = useMemo(
    () =>
      (childMap.get('__root__') ?? []).sort(
        (left, right) => FRAME_ORDER.indexOf(left.frame) - FRAME_ORDER.indexOf(right.frame),
      ),
    [childMap],
  )
  const frameRootNodes = rootNodes.filter((node) => FRAME_ORDER.includes(node.frame))
  const otherRootNodes = rootNodes.filter((node) => node.frame === 'other')

  return (
    <div className={interactive ? 'builder-tree' : 'full-tree'}>
      <div className="tree-columns">
        {frameRootNodes.map((rootNode) => {
          const rootUpgrade = nodeMap.get(rootNode.upgradeId)

          if (!rootUpgrade) {
            return null
          }

          return (
            <section key={rootNode.id} className="frame-column">
              <h2>{FRAME_LABELS[rootNode.frame]}</h2>
              <UpgradeBranch
                displayNode={rootNode}
                childMap={childMap}
                nodeMap={nodeMap}
                selectedIds={selectedIds}
                interactive={interactive}
                onSelect={onSelect}
              />
            </section>
          )
        })}
      </div>

      {otherRootNodes.length > 0 ? (
        <section className="other-upgrades-section">
          <hr className="other-upgrades-divider" />
          <div className="other-upgrades-grid">
            {otherRootNodes.map((rootNode) => (
              <UpgradeBranch
                key={rootNode.id}
                displayNode={rootNode}
                childMap={childMap}
                nodeMap={nodeMap}
                selectedIds={selectedIds}
                interactive={interactive}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
