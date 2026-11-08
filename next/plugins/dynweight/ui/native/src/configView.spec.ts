import { describe, expect, it } from 'vitest'
import { changes, fieldDiffs, globalLayer, inheritText, itemDiff, sourceLayers, type Draft } from './configView'
import type { Layer } from './host'

// Messages echoed with their parameters, enough to tell the outputs apart.
const t = (key: string, p?: Record<string, unknown>) => (p ? `${key}${JSON.stringify(p)}` : key)

const layer = (over: Partial<Layer> = {}): Layer => ({
  enabled: true,
  window_seconds: 60,
  min_samples: 10,
  min_samples_strict: true,
  clear_sticky_on_zero: true,
  exempt_status_codes: '400',
  min_weight_mode: 'base_percent',
  min_weight: 0,
  rules: [
    { name: 'slow', conditions: [{ metric: 'ttfb', p: 95, op: 'gte', value: 10000 }], periods: 3, hit_periods: 2 },
    { name: 'ok', conditions: [{ metric: 'error_rate', op: 'lt', value: 15 }], periods: 1, hit_periods: 1 }
  ],
  strategies: [
    { name: 'down', when: 'slow', actions: [{ type: 'weight_degrade', mode: 'current_percent', value: 30 }] },
    { name: 'up', when: 'ok', actions: [{ type: 'weight_climb', mode: 'base_percent', value: 10 }] }
  ],
  ...over
})

const draft = (over: Partial<Draft> = {}): Draft => ({
  ...layer(),
  groups: {},
  accounts: {},
  notify: { enabled: false, channel: '', recipients: [], language: 'zh' },
  log_events: true,
  ...over
})

describe('fieldDiffs', () => {
  it('lists the scalar fields a group sets apart, the floor as one', () => {
    expect(fieldDiffs(layer({ window_seconds: 120, min_weight: 5 }), layer())).toEqual(['window_seconds', 'floor'])
    expect(fieldDiffs(layer({ rules: [] }), layer())).toEqual([])
  })
})

describe('itemDiff', () => {
  const global = layer()

  it('names removed and added items', () => {
    const g = layer({ strategies: [global.strategies[0], { name: 'new', when: 'ok', actions: [] }] })
    expect(itemDiff(g, global)).toEqual({ removed: ['up'], added: ['new'], changed: [], reordered: false })
  })

  it('sees a change in a rule an item reads, not only in the item', () => {
    const rules = global.rules.map((r) => (r.name === 'slow' ? { ...r, periods: 5 } : r))
    expect(itemDiff(layer({ rules }), global).changed).toEqual(['down'])
  })

  it('ignores the key order an editor wrote', () => {
    const strategies = global.strategies.map(({ actions, when, name }) => ({ actions, when, name }))
    expect(itemDiff(layer({ strategies }), global)).toEqual({ removed: [], added: [], changed: [], reordered: false })
  })

  it('tells the same items in another order', () => {
    expect(itemDiff(layer({ strategies: [...global.strategies].reverse() }), global).reordered).toBe(true)
  })
})

describe('sourceLayers / inheritText', () => {
  const c = draft({ groups: { '2': layer({ exempt_status_codes: '400,500' }) } })
  const name = (id: number) => `g${id}`

  it('reads the global layer without the groups, and for groups without a layer', () => {
    expect(sourceLayers(c, undefined).map(([s]) => s)).toEqual([''])
    expect(sourceLayers(c, [1, 3]).map(([s]) => s)).toEqual([''])
    expect(sourceLayers(c, [1, 2]).map(([s]) => s)).toEqual(['', '2'])
  })

  it('names the one layer inherited from, or says the groups differ', () => {
    expect(inheritText(t, sourceLayers(c, [2]), 'exempt', name).text).toContain('"value":"400,500"')
    expect(inheritText(t, sourceLayers(c, [2]), 'exempt', name).text).toContain('cfg.accounts.group')
    const mixed = inheritText(t, sourceLayers(c, [1, 2]), 'exempt', name)
    expect(mixed.text).toBe('cfg.accounts.varies')
    expect(mixed.title.split('\n')).toHaveLength(2)
    // Same value through both layers: one value, no single source named.
    expect(inheritText(t, sourceLayers(c, [1, 2]), 'floor', name).text).toContain('"source":""')
  })

  it('reads the adjustment through the master switch', () => {
    const off = draft({ enabled: false, groups: { '2': layer() } })
    expect(sourceLayers(off, [2]).every(([, l]) => !l.enabled)).toBe(true)
    expect(off.groups['2'].enabled).toBe(true)
  })
})

describe('changes', () => {
  it('names each part with edits, the order of keys aside', () => {
    const saved = draft({ groups: { '1': layer() }, accounts: { '7': { enabled: false, min_weight_mode: 'fixed', min_weight: 1 } } })
    const edited: Draft = JSON.parse(JSON.stringify(saved))
    edited.accounts['7'] = { min_weight: 1, min_weight_mode: 'fixed', enabled: false }
    expect(changes(edited, saved)).toEqual({ global: false, groups: [], accounts: [], notify: false })

    edited.window_seconds = 30
    edited.groups['3'] = globalLayer(edited)
    delete edited.accounts['7']
    edited.log_events = false
    expect(changes(edited, saved)).toEqual({ global: true, groups: ['3'], accounts: ['7'], notify: true })
  })
})
