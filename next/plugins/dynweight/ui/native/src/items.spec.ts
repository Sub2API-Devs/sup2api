import { describe, expect, it } from 'vitest'
import type { Rule, Strategy } from './host'
import {
  duplicateEntry,
  entryCanEnable,
  hasDegradeWithoutClimb,
  isForked,
  moveEntry,
  newDraft,
  newEntry,
  readItems,
  removeEntry,
  staleItems,
  toggleEntry,
  validateDraft,
  validateLists,
  writeItems
} from './items'
import { DEFAULT_RULES_JSON, DEFAULT_STRATEGIES_JSON } from './items.fixture'

const defaults = (): { rules: Rule[]; strategies: Strategy[] } => ({
  rules: JSON.parse(DEFAULT_RULES_JSON),
  strategies: JSON.parse(DEFAULT_STRATEGIES_JSON)
})
const copyName = (name: string, n: number) => `${name} 副本 ${n}`

describe('readItems / writeItems', () => {
  it('reads the defaults as 5 editable items and writes them back byte for byte', () => {
    const { rules, strategies } = defaults()
    const entries = readItems(rules, strategies)
    expect(entries).toHaveLength(5)
    expect(entries.every(e => e.draft && !isForked(e.draft) && !e.draft.source?.shared)).toBe(true)
    expect(entries.map(e => e.draft!.source!.rule)).toEqual(['错误率过高', '首字 p95 过慢', '首字挂死', '健康恢复', '复活探测'])
    const out = writeItems(entries, rules)
    expect(JSON.stringify(out.rules)).toBe(DEFAULT_RULES_JSON)
    expect(JSON.stringify(out.strategies)).toBe(DEFAULT_STRATEGIES_JSON)
    expect(out.dropped).toEqual([])
  })

  it("carries a rule's conditions, scope, windows and condition options into the draft", () => {
    const d = readItems(defaults().rules, defaults().strategies)[3].draft!
    expect(d.name).toBe('自动回升')
    expect(d.conditions).toHaveLength(4)
    expect(d.conditions[3]).toMatchObject({ metric: 'latency', scope: 'non_stream', when_empty: 'pass' })
    expect([d.periods, d.hit_periods, d.scope]).toEqual([1, 1, 'all'])
  })

  it('updates an unshared rule in place and leaves the others alone', () => {
    const { rules, strategies } = defaults()
    const entries = readItems(rules, strategies)
    entries[0].draft!.conditions[0].value = 40
    const out = writeItems(entries, rules)
    expect(out.rules[0]).toEqual({
      name: '错误率过高',
      conditions: [{ metric: 'error_rate', op: 'gte', value: 40 }],
      periods: 3,
      hit_periods: 2
    })
    expect(out.rules.slice(1)).toEqual(rules.slice(1))
    expect(out.strategies).toEqual(strategies)
  })

  it('copies a shared rule on write and keeps the original for the other item', () => {
    const { rules, strategies } = defaults()
    strategies.push({ name: '错误率过高清理', when: '错误率过高', actions: [{ type: 'affinity_clear', percent: 50 }] })
    const entries = readItems(rules, strategies)
    expect(entries[0].draft!.source).toEqual({ rule: '错误率过高', shared: true })
    entries[0].draft!.periods = 5
    const out = writeItems(entries, rules)
    expect(out.rules.slice(0, 5)).toEqual(rules)
    expect(out.rules[5]).toEqual({
      name: '错误率过高 (2)',
      conditions: [{ metric: 'error_rate', op: 'gte', value: 30 }],
      periods: 5,
      hit_periods: 2
    })
    expect(out.strategies[0].when).toBe('错误率过高 (2)')
    expect(out.strategies[5].when).toBe('错误率过高')
    // Undoing the change writes the shared rule again, no copy.
    entries[0].draft!.periods = 3
    expect(writeItems(entries, rules).rules).toEqual(rules)
  })

  it('drops the rule of a removed item and names it', () => {
    const { rules, strategies } = defaults()
    const out = writeItems(removeEntry(readItems(rules, strategies), 0), rules)
    expect(out.dropped).toEqual(['错误率过高'])
    expect(out.rules.map(r => r.name)).toEqual(['首字 p95 过慢', '首字挂死', '健康恢复', '复活探测'])
    expect(out.strategies.map(s => s.name)).toEqual(['首字 p95 过慢', '首字挂死', '自动回升', '复活探测'])
  })

  it('keeps a rule another item still references when one item goes', () => {
    const { rules, strategies } = defaults()
    strategies.push({ name: '另一个', when: '错误率过高', actions: [{ type: 'affinity_clear', percent: 50 }] })
    const out = writeItems(removeEntry(readItems(rules, strategies), 0), rules)
    expect(out.dropped).toEqual([])
    expect(out.rules).toEqual(rules)
  })

  it('renames the rule of the same name along with its item', () => {
    const { rules, strategies } = defaults()
    const entries = readItems(rules, strategies)
    entries[0].draft!.name = '错误率高'
    const out = writeItems(entries, rules)
    expect(out.rules[0].name).toBe('错误率高')
    expect(out.rules[0].conditions).toEqual(rules[0].conditions)
    expect(out.strategies[0]).toMatchObject({ name: '错误率高', when: '错误率高' })
    // An item whose rule has another name ("自动回升" → "健康恢复") keeps it.
    entries[3].draft!.name = '回升'
    expect(writeItems(entries, rules).strategies[3].when).toBe('健康恢复')
  })

  it('does not rename a rule another item holds, nor onto a taken name', () => {
    const { rules, strategies } = defaults()
    strategies.push({ name: '另一个', when: '错误率过高', actions: [{ type: 'affinity_clear', percent: 50 }] })
    const entries = readItems(rules, strategies)
    entries[0].draft!.name = '错误率高'
    expect(writeItems(entries, rules).strategies[0].when).toBe('错误率过高')
    const again = readItems(...(Object.values(defaults()) as [Rule[], Strategy[]]))
    again[0].draft!.name = '首字挂死 2'
    again[2].draft!.name = '首字挂死 2'
    const out = writeItems(again, rules)
    expect(out.rules[0].name).toBe('首字挂死 2')
    expect(out.rules[2].name).toBe('首字挂死') // the name was taken by then
  })

  it('reads a combined trigger as a read-only item and writes it back unchanged', () => {
    const { rules, strategies } = defaults()
    strategies[0] = { ...strategies[0], when: { all: ['错误率过高', { any: ['首字挂死', '首字 p95 过慢'] }] } }
    const entries = readItems(rules, strategies)
    expect(entries[0]).toMatchObject({ draft: null, reason: { kind: 'composite' } })
    const out = writeItems(entries, rules)
    expect(JSON.stringify(out.rules)).toBe(JSON.stringify(rules))
    expect(JSON.stringify(out.strategies)).toBe(JSON.stringify(strategies))
    // Its switch still works, on the stored strategy.
    expect(writeItems(toggleEntry(entries, 0, false), rules).strategies[0]).toEqual({ ...strategies[0], enabled: false })
  })

  it('reads a one-rule group as an editable item and a missing or disabled rule as read-only', () => {
    const { rules, strategies } = defaults()
    strategies[0].when = { any: ['错误率过高'] }
    strategies[1].when = '不存在'
    rules[2].enabled = false
    const entries = readItems(rules, strategies)
    expect(entries[0].draft?.source?.rule).toBe('错误率过高')
    expect(entries[1].reason).toEqual({ kind: 'missing', rule: '不存在' })
    expect(entries[2].reason).toEqual({ kind: 'disabled', rule: '首字挂死' })
    entries[0].draft!.name = 'x'
    expect(writeItems(entries, rules).strategies[0].when).toEqual({ any: ['x'] })
    expect(staleItems(rules, strategies)).toEqual(['首字 p95 过慢', '首字挂死'])
  })

  it('writes a new item with a rule named after it', () => {
    const { rules, strategies } = defaults()
    const entries = [...readItems(rules, strategies), newEntry(newDraft('错误率过高'))]
    const out = writeItems(entries, rules)
    expect(out.rules[5]).toEqual({
      name: '错误率过高 (2)',
      conditions: [{ metric: 'error_rate', op: 'gte', value: 30 }],
      periods: 3,
      hit_periods: 2
    })
    expect(out.strategies[5]).toEqual({
      name: '错误率过高',
      when: '错误率过高 (2)',
      actions: [{ type: 'weight_degrade', mode: 'current_percent', value: 30 }]
    })
  })

  it('duplicates an item under a free name with its own rule, and moves items without touching the rules', () => {
    const { rules, strategies } = defaults()
    let entries = duplicateEntry(readItems(rules, strategies), 0, copyName)
    entries = duplicateEntry(entries, 0, copyName)
    expect(entries.map(e => e.draft!.name).slice(0, 3)).toEqual(['错误率过高', '错误率过高 副本 2', '错误率过高 副本 1'])
    const out = writeItems(moveEntry(entries, 0, 1), rules)
    expect(out.strategies.map(s => s.when).slice(0, 3)).toEqual(['错误率过高 副本 2', '错误率过高', '错误率过高 副本 1'])
    expect(out.rules.slice(0, 5)).toEqual(rules)
    expect(out.rules.slice(5).map(r => r.conditions)).toEqual([rules[0].conditions, rules[0].conditions])
  })

  it('canonicalises a changed rule as the plugin does', () => {
    const { rules, strategies } = defaults()
    const entries = readItems(rules, strategies)
    const d = entries[2].draft!
    d.scope = 'non_stream'
    d.conditions[0] = { join: 'and', metric: 'error_rate', op: 'gte', value: 30, scope: 'non_stream', when_empty: 'fail' }
    expect(writeItems(entries, rules).rules[2]).toEqual({
      name: '首字挂死',
      scope: 'non_stream',
      conditions: [
        { metric: 'error_rate', op: 'gte', value: 30 },
        { join: 'or', metric: 'latency', p: 100, op: 'gte', value: 120000 }
      ],
      periods: 1,
      hit_periods: 1
    })
  })
})

describe('validation', () => {
  it('accepts the defaults', () => {
    const { rules, strategies } = defaults()
    expect(validateLists(rules, strategies)).toEqual([])
    const entries = readItems(rules, strategies)
    expect(entries.flatMap(e => validateDraft(e.draft!, entries))).toEqual([])
  })

  it('reports what the plugin refuses in a draft', () => {
    const entries = readItems(defaults().rules, defaults().strategies)
    const d = entries[1].draft!
    d.name = '错误率过高'
    d.conditions.push({ metric: 'ttfb', p: 40, op: 'gt', value: 1.5, join: 'and', scope: 'non_stream' })
    d.periods = 2
    d.hit_periods = 3
    d.actions.push({ type: 'weight_climb', mode: 'fixed', value: 0 })
    d.cooldown_seconds = null
    expect(validateDraft(d, entries).map(p => `${p.path}:${p.key}`)).toEqual([
      'name:nameDup',
      'conditions.1.p:p',
      'conditions.1.op:op',
      'conditions.1.value:value',
      'conditions.1.scope:ttfbNonStream',
      'hit_periods:hitPeriods',
      'actions.2.value:fixedValue',
      'actions.2.type:twoWeights',
      'cooldown_seconds:required'
    ])
  })

  it('reports empty numbers as required', () => {
    const d = newDraft('x')
    d.conditions[0].value = null as unknown as number
    d.periods = null
    d.actions[0].value = null as unknown as number
    expect(validateDraft(d, [newEntry(d)]).map(p => `${p.path}:${p.key}`)).toEqual([
      'conditions.0.value:required',
      'periods:required',
      'actions.0.value:required'
    ])
  })

  it('checks the lists like the plugin: references, nesting, duplicates', () => {
    const { rules, strategies } = defaults()
    rules[1].name = '错误率过高'
    strategies[2].when = { all: [{ any: [{ all: ['首字挂死'] }] }] } as Strategy['when']
    rules[4].enabled = false
    const found = validateLists(rules, strategies).map(p => `${p.part}[${p.index}].${p.path}:${p.key}`)
    expect(found).toEqual([
      'rules[1].name:ruleNameDup',
      'strategies[1].when:unknownRule',
      'strategies[2].when:whenDepth',
      'strategies[4].when:disabledRule'
    ])
  })
})

describe('edge cases the plugin decides', () => {
  it('takes 0 windows in stored lists (read as 1) but asks drafts for 1 and up', () => {
    const { rules, strategies } = defaults()
    rules[0].periods = 0
    rules[0].hit_periods = 0
    expect(validateLists(rules, strategies)).toEqual([])
    const d = newDraft('x')
    d.periods = 0
    d.hit_periods = 0
    expect(validateDraft(d, [newEntry(d)]).map(p => `${p.path}:${p.key}`)).toEqual(['periods:periods', 'hit_periods:hitPeriods'])
  })

  it('accepts when_empty fail on a weight condition, as the plugin normalises it away', () => {
    const d = newDraft('x')
    d.conditions = [{ metric: 'weight', op: 'lte', value: 0, when_empty: 'fail' }]
    expect(validateDraft(d, [newEntry(d)])).toEqual([])
    d.conditions[0].when_empty = 'pass'
    expect(validateDraft(d, [newEntry(d)]).map(p => p.key)).toEqual(['weightScope'])
  })

  it('does not switch on an item whose rule is missing or disabled, but switches it off', () => {
    const { rules, strategies } = defaults()
    rules[0].enabled = false
    strategies[0].enabled = false
    strategies[1] = { ...strategies[1], when: { all: ['首字 p95 过慢', '不存在'] }, enabled: false }
    const entries = readItems(rules, strategies)
    expect(entryCanEnable(entries[0], rules)).toBe(false)
    expect(entryCanEnable(entries[1], rules)).toBe(false)
    expect(entryCanEnable(entries[2], rules)).toBe(true)
    expect(toggleEntry(entries, 0, true)[0]).toBe(entries[0])
    const off = readItems(
      rules,
      strategies.map((s, i) => (i === 0 ? { ...s, enabled: undefined } : s))
    )
    expect(toggleEntry(off, 0, false)[0].strategy.enabled).toBe(false)
  })
})

describe('hasDegradeWithoutClimb', () => {
  it('flags enabled degrades without an enabled climb', () => {
    const { rules, strategies } = defaults()
    expect(hasDegradeWithoutClimb(rules, strategies)).toBe(false)
    expect(hasDegradeWithoutClimb(rules, strategies.slice(0, 3))).toBe(true)
    expect(
      hasDegradeWithoutClimb(
        rules,
        strategies.map((s, i) => (i >= 3 ? { ...s, enabled: false } : s))
      )
    ).toBe(true)
    expect(hasDegradeWithoutClimb(rules, [])).toBe(false)
  })
})
