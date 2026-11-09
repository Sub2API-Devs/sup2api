// Protocol conversion (CONVERT-MATRIX §2.3, §2.4, §7): loss policies, route
// grades and recorded losses, shared by the account, group, account type and
// usage views. Labels live under accounts.conversion.
import type { Tone } from '@sub2api/ui'
import type { ConversionGrade, ConversionLossCategory, ConversionLosses, ConversionLossPolicy, ConversionTrace, Group } from '@/api/types'

export const CONVERSION_POLICIES: ConversionLossPolicy[] = ['allow', 'safe', 'strict']
export const LOSS_CATEGORIES: ConversionLossCategory[] = ['tool', 'reasoning', 'image', 'other']

/** The policy used when neither the account nor its group sets one. */
export const DEFAULT_POLICY: ConversionLossPolicy = 'allow'

type T = (key: string, params?: Record<string, unknown>) => string

/** Select options of a policy field: `unset` (null) first, then the three policies. */
export function policyOptions(t: T, unset: string): Array<{ value: ConversionLossPolicy | null; label: string }> {
  return [{ value: null, label: unset }, ...CONVERSION_POLICIES.map(p => ({ value: p, label: policyLabel(t, p) }))]
}

export const policyLabel = (t: T, p: ConversionLossPolicy) => t(`accounts.conversion.policies.${p}`)

/** The account's groups with their effective policy (the group's or the default), by name. */
export function groupPolicies(groupIds: number[], groups: Pick<Group, 'id' | 'name' | 'conversion_loss_policy'>[]) {
  return groups
    .filter(g => groupIds.includes(g.id))
    .map(g => ({ name: g.name, policy: g.conversion_loss_policy || DEFAULT_POLICY, set: !!g.conversion_loss_policy }))
}

/** The account editor's hint: the effective policy and where it comes from. */
export function policySourceHint(t: T, own: ConversionLossPolicy | null, groups: ReturnType<typeof groupPolicies>): string {
  if (own) return t('accounts.conversion.hintOwn', { policy: policyLabel(t, own) })
  if (!groups.some(g => g.set)) return t('accounts.conversion.hintDefault', { policy: policyLabel(t, DEFAULT_POLICY) })
  return t('accounts.conversion.hintGroups', { groups: groups.map(g => `${g.name}=${policyLabel(t, g.policy)}`).join(', ') })
}

const GRADE_TONES: Record<ConversionGrade, Tone> = {
  native: 'success',
  good: 'info',
  fair: 'warning',
  discouraged: 'danger',
  local: 'gray'
}

/** Badge tone of a grade; unknown grades are gray. */
export const gradeTone = (g: string): Tone => GRADE_TONES[g as ConversionGrade] ?? 'gray'

/** A grade other than native: converted, or estimated locally. */
export const isConvertedGrade = (g: string | undefined): g is ConversionGrade => !!g && g !== 'native'

/** Protocol chain as text: "a → b → c". */
export const hopsText = (hops: string[] | undefined) => (hops || []).join(' → ')

/** Categories with lost paths, in the fixed order. */
export function lossEntries(losses: ConversionLosses | undefined): Array<[ConversionLossCategory, string[]]> {
  return LOSS_CATEGORIES.flatMap(c => (losses?.[c]?.length ? [[c, losses[c]!] as [ConversionLossCategory, string[]]] : []))
}

/** Categories lost by the request or the response, in the fixed order (empty without losses). */
export function lostCategories(trace: ConversionTrace | null | undefined): ConversionLossCategory[] {
  return LOSS_CATEGORIES.filter(c => !!trace?.lost?.[c]?.length || !!trace?.response_lost?.[c]?.length)
}
