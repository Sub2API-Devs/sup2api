import { describe, expect, it } from 'vitest'
import type { SegmentGroupSetting } from '@/api/pricing'
import { draftedSetting, effectiveRate, groupPatches, setDraft, validOverride, type GroupDrafts } from './segmentGroupDrafts'

function setting(id: number, over: Partial<SegmentGroupSetting> = {}, visibility: 'public' | 'restricted' = 'public'): SegmentGroupSetting {
  return {
    segment: { id: 2, kind: 'named', name: 'VIP' },
    group: { id, name: `g${id}`, description: '', status: 'active', visibility, rate_multiplier: '1.2' },
    accessible: visibility === 'public',
    granted: false,
    rate_override: null,
    rate: { value: '1.08', source: 'discount', group_default: '1.2', discount: '0.9' },
    price_rule_count: 0,
    ...over
  }
}
const none: GroupDrafts = new Map()

describe('the rate that applies', () => {
  it('is the override, else the default times the discount, else the default', () => {
    expect(effectiveRate({ group_default: '1.2', discount: '0.9' }, '0.8')).toMatchObject({ value: '0.8', source: 'segment' })
    expect(effectiveRate({ group_default: '1.2', discount: '0.9' }, null)).toMatchObject({ value: '1.08', source: 'discount' })
    expect(effectiveRate({ group_default: '1.2', discount: '1' }, null)).toMatchObject({ value: '1.2', source: 'group' })
  })
  it('has no value while the override is not a rate', () => {
    expect(effectiveRate({ group_default: '1.2', discount: '0.9' }, '0.')).toMatchObject({ value: '', source: 'segment' })
    expect(validOverride('0.')).toBe(false)
    expect(validOverride(null)).toBe(true)
  })
})

describe('a row under its draft', () => {
  it('reads as saved without one', () => {
    const saved = setting(1)
    expect(draftedSetting(saved)).toMatchObject({ granted: false, rate_override: null, accessible: true, dirty: false, saved })
  })
  it('follows the grant and the rate of the draft', () => {
    const row = draftedSetting(setting(2, {}, 'restricted'), { granted: true, rate_override: '0.5' })
    expect(row).toMatchObject({ granted: true, accessible: true, rate_override: '0.5', dirty: true })
    expect(row.rate).toMatchObject({ value: '0.5', source: 'segment' })
  })
  it('goes back to the inherited rate when the draft clears the override', () => {
    const row = draftedSetting(setting(1, { rate_override: '0.5' }), { rate_override: null })
    expect(row.rate).toMatchObject({ value: '1.08', source: 'discount' })
  })
  it('takes the discount of the form once it is a rate', () => {
    expect(draftedSetting(setting(1), undefined, '0.5').rate).toMatchObject({ value: '0.6', discount: '0.5' })
    expect(draftedSetting(setting(1), undefined, '1').rate).toMatchObject({ value: '1.2', source: 'group' })
    expect(draftedSetting(setting(1), undefined, '0.').rate).toMatchObject({ value: '1.08', discount: '0.9' })
  })
})

describe('the drafts of a segment', () => {
  it('keep what differs from the saved setting, field by field', () => {
    const saved = setting(2, { granted: true, rate_override: '0.8' }, 'restricted')
    let drafts = setDraft(none, saved, { granted: false })
    drafts = setDraft(drafts, saved, { rate_override: null })
    expect(drafts.get(2)).toEqual({ granted: false, rate_override: null })
    drafts = setDraft(drafts, saved, { granted: true })
    expect(drafts.get(2)).toEqual({ rate_override: null })
  })
  it('drop a row that reads like the saved one again', () => {
    const saved = setting(1, { rate_override: '0.80' })
    const drafts = setDraft(none, saved, { rate_override: '0.9' })
    expect(setDraft(drafts, saved, { rate_override: '0.8' }).size).toBe(0)
  })
  it('keep an override still being typed, to be refused on saving', () => {
    expect(setDraft(none, setting(1), { rate_override: '0.' }).get(1)).toEqual({ rate_override: '0.' })
  })
  it('are sent as one patch per changed group', () => {
    const drafts = setDraft(setDraft(none, setting(1), { rate_override: '0.5' }), setting(2, {}, 'restricted'), { granted: true })
    expect(groupPatches(drafts)).toEqual([
      { group_id: 1, rate_override: '0.5' },
      { group_id: 2, granted: true }
    ])
  })
})
