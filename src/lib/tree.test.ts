import { describe, expect, it } from 'vitest'
import { upgrades } from '../data/upgrades'
import { exportBuildCode, parseBuildCode } from './buildCode'
import {
  assertGraphIntegrity,
  getActivatedUpgrades,
  getNodeState,
  getTotalGold,
  importBuild,
  normalizeSelectedSet,
} from './tree'

describe('upgrade graph', () => {
  it('has valid references and no cycles', () => {
    expect(() => assertGraphIntegrity(upgrades)).not.toThrow()
  })

  it('exposes frame roots and tune-up at start', () => {
    const selected = new Set<string>()
    const states = Object.fromEntries(
      upgrades.map((node) => [node.id, getNodeState(node, selected, true)]),
    )

    expect(states.assault_frame).toBe('available')
    expect(states.power_frame).toBe('available')
    expect(states.marksman_frame).toBe('available')
    expect(states.tune_up).toBe('available')
    expect(states.fragmentation_rounds).toBe('locked')
    expect(states.choke).toBe('locked')
    expect(states.buckshot_plus).toBe('locked')
    expect(states.fission).toBe('locked')
  })

  it('unlocks shared upgrades when a valid parent is selected', () => {
    const selected = new Set(['leeching_implants_plus'])
    expect(getNodeState(upgrades.find((node) => node.id === 'choke')!, selected, true)).toBe(
      'available',
    )
  })

  it('totals gold correctly', () => {
    const selected = new Set(['power_frame', 'blast_radius', 'blast_radius_plus'])
    expect(getTotalGold(upgrades, selected)).toBe(8)
  })

  it('lists only the highest selected plus tier while keeping distinct upgrades', () => {
    const selected = new Set([
      'marksman_frame',
      'precision_scope',
      'precision_scope_plus',
      'precision_scope_plus_plus',
      'double_tap',
      'triple_tap',
    ])

    expect(getActivatedUpgrades(upgrades, selected).map((node) => node.id)).toEqual([
      'marksman_frame',
      'precision_scope_plus_plus',
      'double_tap',
      'triple_tap',
    ])
  })

  it('prunes invalid descendants when a selected prerequisite is removed', () => {
    const selected = normalizeSelectedSet(upgrades, [
      'assault_frame',
      'leeching_implants',
      'leeching_implants_plus',
      'choke',
    ])

    selected.delete('leeching_implants_plus')

    expect([...normalizeSelectedSet(upgrades, selected)]).toEqual(['assault_frame', 'leeching_implants'])
  })

  it('keeps shared upgrades selected if another valid parent remains', () => {
    const selected = normalizeSelectedSet(upgrades, [
      'power_frame',
      'tankbuster',
      'ap_rounds',
      'ap_rounds_plus',
      'choke',
    ])

    expect([...selected]).toEqual(['power_frame', 'tankbuster', 'ap_rounds', 'ap_rounds_plus', 'choke'])
  })

  it('unlocks fragmentation rounds directly from marksman frame', () => {
    const selected = new Set(['marksman_frame'])
    expect(
      getNodeState(upgrades.find((node) => node.id === 'fragmentation_rounds')!, selected, true),
    ).toBe('available')
  })
})

describe('build code import and export', () => {
  it('returns an empty code for an empty build', () => {
    expect(exportBuildCode([])).toBe('')
  })

  it('round-trips a valid build deterministically', () => {
    const firstCode = exportBuildCode(['triple_tap', 'marksman_frame', 'double_tap'])
    const secondCode = exportBuildCode(['double_tap', 'triple_tap', 'marksman_frame'])

    expect(firstCode).toBe(secondCode)

    const imported = importBuild(upgrades, firstCode)
    expect([...imported]).toEqual(['marksman_frame', 'double_tap', 'triple_tap'])
  })

  it('still accepts legacy prefixed codes', () => {
    const bareCode = exportBuildCode(['marksman_frame'])
    expect(parseBuildCode(`BuildCodeV1:${bareCode}`)).toEqual(['marksman_frame'])
  })

  it('rejects invalid payloads and broken prerequisite chains', () => {
    expect(() => importBuild(upgrades, 'bm90LWpzb24')).toThrow()

    const invalidChain = exportBuildCode(['laser_ballistics'])
    expect(() => importBuild(upgrades, invalidChain)).toThrow(/prerequisite/i)
  })
})
