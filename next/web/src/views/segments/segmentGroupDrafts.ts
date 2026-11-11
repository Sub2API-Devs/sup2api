// The settings of a segment in each group while they are edited: what a row
// shows under its unsaved grant and rate, and what saving sends.
import type { EffectiveRate, SegmentGroupPatch, SegmentGroupSetting } from '@/api/pricing'
import { inheritedRate, validRate } from '@/components/pricing/pricingFormat'
import { num } from '@/views/prices/priceExpr'

/** What a row changes; a field left out is as saved. */
export type GroupDraft = Pick<SegmentGroupPatch, 'granted' | 'rate_override'>

/** The unsaved changes of a segment by group id. */
export type GroupDrafts = ReadonlyMap<number, GroupDraft>

/** A row of the editor: the saved setting under its draft. */
export interface DraftedSetting extends SegmentGroupSetting {
  /** The setting on the server, which a draft is compared with. */
  saved: SegmentGroupSetting
  dirty: boolean
}

/** An override that may be saved: none, or a rate. */
export const validOverride = (v: string | null): boolean => v === null || validRate(v)

/**
 * The rate that applies, first hit wins: the override, the group's default
 * times the discount, the group's default. An override still being typed
 * gives no value.
 */
export function effectiveRate(base: Pick<EffectiveRate, 'group_default' | 'discount'>, override: string | null): EffectiveRate {
  if (override !== null) return { ...base, value: validRate(override) ? override : '', source: 'segment' }
  return { ...base, value: String(inheritedRate(base)), source: num(base.discount, 1) === 1 ? 'group' : 'discount' }
}

/**
 * A row as it reads under `draft`: access and the rate follow it. `discount`
 * is the segment's discount as its form has it now, taken once it is a rate.
 */
export function draftedSetting(saved: SegmentGroupSetting, draft?: GroupDraft, discount?: string): DraftedSetting {
  const granted = draft?.granted ?? saved.granted
  const rate_override = draft?.rate_override === undefined ? saved.rate_override : draft.rate_override
  const base = { group_default: saved.rate.group_default, discount: discount !== undefined && validRate(discount) ? discount : saved.rate.discount }
  return {
    ...saved,
    granted,
    rate_override,
    accessible: saved.group.visibility === 'public' || granted,
    rate: effectiveRate(base, rate_override),
    saved,
    dirty: !!draft
  }
}

const sameOverride = (a: string | null, b: string | null) => (validRate(a) && validRate(b) ? Number(a) === Number(b) : a === b)

/** The drafts with `change` on a row; what reads like the saved setting is no draft. */
export function setDraft(drafts: GroupDrafts, saved: SegmentGroupSetting, change: GroupDraft): GroupDrafts {
  const merged = { ...drafts.get(saved.group.id), ...change }
  const draft: GroupDraft = {}
  if (merged.granted !== undefined && merged.granted !== saved.granted) draft.granted = merged.granted
  if (merged.rate_override !== undefined && !sameOverride(merged.rate_override, saved.rate_override)) draft.rate_override = merged.rate_override
  const next = new Map(drafts)
  if (Object.keys(draft).length) next.set(saved.group.id, draft)
  else next.delete(saved.group.id)
  return next
}

/** What saving the drafts sends (PUT /segments/:id/groups). */
export function groupPatches(drafts: GroupDrafts): SegmentGroupPatch[] {
  return [...drafts].map(([group_id, draft]) => ({ group_id, ...draft }))
}
