// The user groups ("segments") of one group while they are edited: what the
// group has saved for each, the unsaved changes on top, what a row shows
// meanwhile and what saving sends. Pure, so the editor only holds the state.
import type { Group } from '@/api/types'
import type { Segment, SegmentGroupPatch, SegmentGroupSetting, SegmentRef } from '@/api/pricing'
import { inheritedRate, validRate } from '@/components/pricing/pricingFormat'

/** What a group has saved for one segment. */
export interface SegmentRow {
  segment: SegmentRef
  /** The explicit grant; only matters while the group is private. */
  granted: boolean
  /** The rate of the segment in the group; null = inherit. */
  rate_override: string | null
  /** The segment's discount on the group's default rate. */
  discount: string
  price_rule_count: number
  member_count?: number
}

/** The part of a row the editor changes. */
export type SegmentDraft = Pick<SegmentRow, 'granted' | 'rate_override'>
/** The unsaved changes by segment id. */
export type SegmentDrafts = ReadonlyMap<number, SegmentDraft>

/** The group as its form reads right now: rows follow it before it is saved. */
export interface GroupTerms {
  visibility: Group['visibility']
  defaultRate: string
}

/** A row of the editor: the saved row under its draft, with what follows from the group's terms. */
export interface SegmentView extends SegmentRow {
  /** The segment's id: the row key. */
  id: number
  saved: SegmentDraft
  dirty: boolean
  /** Its members may use the group: the group is public, or the segment is granted. */
  accessible: boolean
  /** What its members pay there: the override, else the default rate times the discount; null while the override is not a rate. */
  rate: number | null
}

export function rowOfSetting(s: SegmentGroupSetting): SegmentRow {
  return { segment: s.segment, granted: s.granted, rate_override: s.rate_override, discount: s.rate.discount, price_rule_count: s.price_rule_count, member_count: s.member_count }
}

/** The row of a segment in a group that has nothing saved for it: every row of a group not created yet. */
export function blankRow(s: Segment): SegmentRow {
  const segment: SegmentRef = { id: s.id, kind: s.kind, name: s.name, user_id: s.user_id }
  return { segment, granted: false, rate_override: null, discount: s.discount, price_rule_count: 0, member_count: s.member_count }
}

const sameRate = (a: string | null, b: string | null) => (validRate(a) && validRate(b) ? Number(a) === Number(b) : a === b)
const sameDraft = (a: SegmentDraft, b: SegmentDraft) => a.granted === b.granted && sameRate(a.rate_override, b.rate_override)

function effectiveRate(draft: SegmentDraft, discount: string, group: GroupTerms): number | null {
  if (draft.rate_override === null) return inheritedRate({ group_default: group.defaultRate, discount })
  return validRate(draft.rate_override) ? Number(draft.rate_override) : null
}

export function viewRow(row: SegmentRow, drafts: SegmentDrafts, group: GroupTerms): SegmentView {
  const saved: SegmentDraft = { granted: row.granted, rate_override: row.rate_override }
  const draft = drafts.get(row.segment.id) ?? saved
  return {
    ...row,
    ...draft,
    id: row.segment.id,
    saved,
    dirty: drafts.has(row.segment.id),
    accessible: group.visibility === 'public' || draft.granted,
    rate: effectiveRate(draft, row.discount, group)
  }
}

/** The drafts with `change` on `row`; a row that reads like the saved one again is no draft. */
export function setDraft(drafts: SegmentDrafts, row: Pick<SegmentView, 'id' | 'saved'>, change: Partial<SegmentDraft>): SegmentDrafts {
  const next = new Map(drafts)
  const draft = { ...row.saved, ...drafts.get(row.id), ...change }
  if (sameDraft(draft, row.saved)) next.delete(row.id)
  else next.set(row.id, draft)
  return next
}

/** The segment whose draft cannot be saved yet: its rate is not one. */
export function invalidDraft(drafts: SegmentDrafts): number | undefined {
  return [...drafts].find(([, d]) => d.rate_override !== null && !validRate(d.rate_override))?.[0]
}

/** What saving the drafts sends: per changed segment, only what changed. */
export function segmentPatches(rows: SegmentRow[], drafts: SegmentDrafts): SegmentGroupPatch[] {
  return rows.flatMap((row) => {
    const draft = drafts.get(row.segment.id)
    if (!draft) return []
    const patch: SegmentGroupPatch = { segment_id: row.segment.id }
    if (draft.granted !== row.granted) patch.granted = draft.granted
    if (!sameRate(draft.rate_override, row.rate_override)) patch.rate_override = draft.rate_override
    return [patch]
  })
}
