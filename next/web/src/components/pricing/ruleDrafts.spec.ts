import { describe, expect, it } from 'vitest'
import type { ModelPriceRow, PriceDef, PriceRule } from '@/api/pricing'
import { draftedRow, rulePatches, sameRule, setDraft, startRule, validRule, withRule, type RuleDrafts } from './ruleDrafts'

const perToken: PriceDef = { mode: 'per_token', config: { p: 3, c: 15, cr: 0.3, cc: 3.75, cc1h: 6 }, expression: '' }
const perRequest: PriceDef = { mode: 'per_request', config: { price: 0.02 }, expression: '' }
const expression: PriceDef = { mode: 'expression', config: null, expression: 'tier("base", p*3 + c*15)' }
const times = (multiplier: string): PriceRule => ({ kind: 'multiplier', multiplier })
const custom = (config: Record<string, number | null>): PriceRule => ({ kind: 'custom', mode: 'per_token', config })

function row(over: Partial<ModelPriceRow> = {}): ModelPriceRow {
  return { model: 'gpt-4o', base: perToken, group_rule: null, list_price: perToken, source: 'global', ...over }
}

describe('the rule a mode starts from', () => {
  it('is ×1, or the global price in its own mode', () => {
    expect(startRule('multiplier', perToken)).toEqual(times('1'))
    expect(startRule('custom', perToken)).toMatchObject(custom({ p: 3, c: 15, cr: 0.3, cc: 3.75 }))
    expect(startRule('custom', perRequest)).toEqual({ kind: 'custom', mode: 'per_request', config: { price: 0.02 } })
  })
  it('is a multiplier for an expression price, whatever was asked', () => {
    expect(startRule('custom', expression)).toEqual(times('1'))
  })
})

describe('a rule that may be saved', () => {
  it('has a rate as its multiplier', () => {
    expect(validRule(null)).toBe(true)
    expect(validRule(times('1.5'))).toBe(true)
    expect(validRule(times(''))).toBe(false)
    expect(validRule(times('-1'))).toBe(false)
  })
  it('has its input and output prices, cache prices only when given, none negative', () => {
    expect(validRule(custom({ p: 1, c: 8, cr: null, cc: null }))).toBe(true)
    expect(validRule(custom({ p: 1, c: null, cr: null, cc: null }))).toBe(false)
    expect(validRule(custom({ p: 1, c: 8, cr: -0.1, cc: null }))).toBe(false)
    expect(validRule({ kind: 'custom', mode: 'per_request', config: { price: null } })).toBe(false)
  })
})

describe('rules that price alike', () => {
  it('compares multipliers as numbers and custom prices field by field', () => {
    expect(sameRule(null, null)).toBe(true)
    expect(sameRule(times('1.50'), times('1.5'))).toBe(true)
    expect(sameRule(times('1.5'), null)).toBe(false)
    expect(sameRule(times('1'), custom({ p: 3, c: 15 }))).toBe(false)
    expect(sameRule(custom({ p: 3, c: 15 }), custom({ p: 3, c: 15, cr: null, cc: null }))).toBe(true)
    expect(sameRule(custom({ p: 3, c: 15 }), custom({ p: 3, c: 16 }))).toBe(false)
  })
  it('does not take a multiplier still being typed for zero', () => {
    expect(sameRule(times(''), times('0'))).toBe(false)
  })
})

describe('a row under a rule', () => {
  it('takes its list price from the first rule that applies', () => {
    const group = withRule(row(), 'group', times('2'))
    expect(group).toMatchObject({ source: 'group', list_price: { config: { p: 6, c: 30 } } })
    const own = withRule({ ...group, segment_rule: null }, 'segment', custom({ p: 1, c: 8 }))
    expect(own).toMatchObject({ source: 'segment', list_price: { mode: 'per_token', config: { p: 1, c: 8 } } })
    expect(withRule(own, 'segment', null)).toMatchObject({ source: 'group', list_price: { config: { p: 6 } } })
    expect(withRule(group, 'group', null)).toMatchObject({ source: 'global', list_price: perToken })
  })
  it('shows its draft and remembers the saved rule', () => {
    const saved = row({ group_rule: times('2'), source: 'group' })
    expect(draftedRow(saved, 'group', new Map())).toMatchObject({ dirty: false, saved: times('2'), group_rule: times('2') })
    expect(draftedRow(saved, 'group', new Map([['gpt-4o', null]]))).toMatchObject({ dirty: true, saved: times('2'), group_rule: null, source: 'global' })
  })
})

describe('the drafts of a table', () => {
  const saved = { model: 'gpt-4o', saved: times('2') }
  const fresh = { model: 'o3', saved: null }

  it('keep only the rules that differ from the saved ones', () => {
    let drafts: RuleDrafts = new Map()
    drafts = setDraft(drafts, saved, times('3'))
    drafts = setDraft(drafts, fresh, custom({ p: 1, c: 8 }))
    expect([...drafts.keys()]).toEqual(['gpt-4o', 'o3'])
    drafts = setDraft(drafts, saved, times('2.0'))
    drafts = setDraft(drafts, fresh, null)
    expect(drafts.size).toBe(0)
  })
  it('become one patch per model, null removing the rule', () => {
    const drafts = setDraft(setDraft(new Map(), saved, null), fresh, times('1.2'))
    expect(rulePatches(drafts, null)).toEqual([
      { segment_id: null, model: 'gpt-4o', rule: null },
      { segment_id: null, model: 'o3', rule: times('1.2') }
    ])
    expect(rulePatches(drafts, 7).map((p) => p.segment_id)).toEqual([7, 7])
    expect(rulePatches(new Map(), 7)).toEqual([])
  })
})
