import type { UpgradeNode } from '../types'
import { parseBuildCode } from './buildCode'

export function createUpgradeMap(nodes: UpgradeNode[]) {
  return new Map(nodes.map((node) => [node.id, node]))
}

export function getNodeState(
  node: UpgradeNode,
  selectedIds: ReadonlySet<string>,
  interactive: boolean,
) {
  if (!interactive) {
    return 'full'
  }

  if (selectedIds.has(node.id)) {
    return 'selected'
  }

  if (node.parents.length === 0) {
    return 'available'
  }

  return node.parents.some((parentId) => selectedIds.has(parentId)) ? 'available' : 'locked'
}

export function getTotalGold(nodes: UpgradeNode[], selectedIds: ReadonlySet<string>) {
  return nodes.reduce((total, node) => total + (selectedIds.has(node.id) ? node.cost : 0), 0)
}

function getVariantBaseId(nodeId: string) {
  if (nodeId.endsWith('_plus_plus')) {
    return nodeId.slice(0, -'_plus_plus'.length)
  }

  if (nodeId.endsWith('_plus')) {
    return nodeId.slice(0, -'_plus'.length)
  }

  return nodeId
}

function getVariantTier(nodeId: string) {
  if (nodeId.endsWith('_plus_plus')) {
    return 2
  }

  if (nodeId.endsWith('_plus')) {
    return 1
  }

  return 0
}

export function getActivatedUpgrades(nodes: UpgradeNode[], selectedIds: ReadonlySet<string>) {
  const highestSelectedTierByBaseId = new Map<string, number>()

  for (const node of nodes) {
    if (!selectedIds.has(node.id)) {
      continue
    }

    const baseId = getVariantBaseId(node.id)
    const tier = getVariantTier(node.id)
    const currentTier = highestSelectedTierByBaseId.get(baseId) ?? -1

    if (tier > currentTier) {
      highestSelectedTierByBaseId.set(baseId, tier)
    }
  }

  return nodes.filter((node) => {
    if (!selectedIds.has(node.id)) {
      return false
    }

    const baseId = getVariantBaseId(node.id)
    return highestSelectedTierByBaseId.get(baseId) === getVariantTier(node.id)
  })
}

export function assertGraphIntegrity(nodes: UpgradeNode[]) {
  const map = createUpgradeMap(nodes)

  if (map.size !== nodes.length) {
    throw new Error('Upgrade ids must be unique.')
  }

  for (const node of nodes) {
    for (const parentId of node.parents) {
      if (!map.has(parentId)) {
        throw new Error(`Upgrade "${node.id}" references missing parent "${parentId}".`)
      }
    }
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(nodeId: string) {
    if (visited.has(nodeId)) {
      return
    }

    if (visiting.has(nodeId)) {
      throw new Error(`Cycle detected at upgrade "${nodeId}".`)
    }

    visiting.add(nodeId)

    for (const parentId of map.get(nodeId)?.parents ?? []) {
      visit(parentId)
    }

    visiting.delete(nodeId)
    visited.add(nodeId)
  }

  for (const node of nodes) {
    visit(node.id)
  }
}

export function validateSelection(nodes: UpgradeNode[], selectedIds: string[]) {
  const map = createUpgradeMap(nodes)
  const remaining = new Set(selectedIds)
  const selected = new Set<string>()

  for (const id of selectedIds) {
    if (!map.has(id)) {
      throw new Error(`Unknown upgrade id: ${id}.`)
    }
  }

  while (remaining.size > 0) {
    let progressed = false

    for (const id of [...remaining]) {
      const node = map.get(id)!

      if (node.parents.length === 0 || node.parents.some((parentId) => selected.has(parentId))) {
        selected.add(id)
        remaining.delete(id)
        progressed = true
      }
    }

    if (!progressed) {
      const firstInvalidId = [...remaining][0]
      const node = map.get(firstInvalidId)!
      throw new Error(`Upgrade "${node.name}" does not have a selected prerequisite.`)
    }
  }

  return selected
}

export function normalizeSelectedSet(nodes: UpgradeNode[], selectedIds: Iterable<string>) {
  const map = createUpgradeMap(nodes)
  const selected = new Set<string>()

  for (const id of selectedIds) {
    if (map.has(id)) {
      selected.add(id)
    }
  }

  let changed = true

  while (changed) {
    changed = false

    for (const id of [...selected]) {
      const node = map.get(id)

      if (!node) {
        selected.delete(id)
        changed = true
        continue
      }

      if (node.parents.length > 0 && !node.parents.some((parentId) => selected.has(parentId))) {
        selected.delete(id)
        changed = true
      }
    }
  }

  return selected
}

export function importBuild(nodes: UpgradeNode[], code: string) {
  const ids = parseBuildCode(code)
  return validateSelection(nodes, ids)
}
