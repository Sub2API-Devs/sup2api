import { describe, expect, it } from 'vitest'
import type { Segment, SegmentGroupSetting } from '@/api/pricing'
import { blankRow, invalidDraft, rowOfSetting, segmentPatches, setDraft, viewRow, type GroupTerms, type SegmentDrafts, type SegmentRow } from './segmentDrafts'

const row = (id: number, over: Partial<SegmentRow> = {}): SegmentRow => ({
  segment: { id, kind: 'named', name: `s${id}` },
  granted: false,
  rate_override: null,
  discount: '1',
  price_rule_count: 0,
  ...over
})
const priv: GroupTerms = { visibility: 'restricted', defaultRate: '0.8' }
const none: SegmentDrafts = new Map()
/** The drafts after `change` on the saved `r`. */
const drafted = (r: SegmentRow, change: Parameters<typeof setDraft>[2], drafts = none) => setDraft(drafts, viewRow(r, drafts, priv), change)

describe('rows of the user groups editor', () => {
  it('reads a saved setting, and starts a segment a new group has nothing for', () => {
    const setting = {
      segment: { id: 2, kind: 'named', name: 'VIP' },
      granted: true,
      rate_override: '0.7',
      rate: { value: '0.7', source: 'segment', group_default: '0.8', discount: '0.9' },
      price_rule_count: 3,
      member_count: 5
    } as SegmentGroupSetting
    expect(rowOfSetting(setting)).toEqual({ segment: setting.segment, granted: true, rate_override: '0.7', discount: '0.9', price_rule_count: 3, member_count: 5 })

    const personal = { id: 104, kind: 'personal', name: 'a@b.c', user_id: 9, discount: '0.9', member_count: 1, price_rule_count: 4 } as Segment
    expect(blankRow(personal)).toEqual({ segment: { id: 104, kind: 'personal', name: 'a@b.c', user_id: 9 }, granted: false, rate_override: null, discount: '0.9', price_rule_count: 0, member_count: 1 })
  })

  it('follows the default rate of the form times the discount until a rate of its own replaces both', () => {
    const vip = row(2, { discount: '0.9' })
    expect(viewRow(vip, none, priv).rate).toBe(0.72)
    expect(viewRow(vip, none, { ...priv, defaultRate: '2' }).rate).toBe(1.8)
    expect(viewRow(row(2, { discount: '0.9', rate_override: '0.5' }), none, priv).rate).toBe(0.5)
    // A rate still being typed has no value to show.
    expect(viewRow(vip, drafted(vip, { rate_override: '0.' }), priv).rate).toBeNull()
  })

  it('lets everyone use a public group, and only the granted ones a private group', () => {
    const r = row(1)
    expect(viewRow(r, none, { ...priv, visibility: 'public' }).accessible).toBe(true)
    expect(viewRow(r, none, priv).accessible).toBe(false)
    expect(viewRow(r, drafted(r, { granted: true }), priv)).toMatchObject({ accessible: true, granted: true, dirty: true, saved: { granted: false, rate_override: null } })
  })
})

describe('drafts of the user groups editor', () => {
  it('keeps the other field of a row when one changes', () => {
    const r = row(3)
    const drafts = drafted(r, { rate_override: '0.9' }, drafted(r, { granted: true }))
    expect(drafts.get(3)).toEqual({ granted: true, rate_override: '0.9' })
  })

  it('drops a draft that reads like the saved row again', () => {
    const r = row(3, { granted: true, rate_override: '0.80' })
    expect(drafted(r, { granted: true }, drafted(r, { granted: false })).size).toBe(0)
    // The same rate written differently is no change.
    expect(drafted(r, { rate_override: '0.8' }).size).toBe(0)
  })

  it('names the segment whose rate cannot be saved', () => {
    expect(invalidDraft(drafted(row(1), { rate_override: '0.75' }))).toBeUndefined()
    expect(invalidDraft(drafted(row(1), { granted: true }))).toBeUndefined()
    expect(invalidDraft(drafted(row(4), { rate_override: '-1' }))).toBe(4)
  })

  it('sends only the changed rows, and of each only what changed', () => {
    const rows = [row(1), row(2, { granted: true, rate_override: '0.7' }), row(3)]
    let drafts = drafted(rows[0], { granted: true })
    drafts = drafted(rows[1], { rate_override: null }, drafts)
    expect(segmentPatches(rows, drafts)).toEqual([
      { segment_id: 1, granted: true },
      { segment_id: 2, rate_override: null }
    ])
    expect(segmentPatches(rows, none)).toEqual([])
  })
})
