import type { ApiKey, KeyLimits } from '@/api/types'

/** The caps in display order, with their live counter (ApiKey.live). */
export const LIMITS = [
  { field: 'rpm_limit', live: 'rpm', short: 'apikeys.limits.short.rpm', label: 'apikeys.limits.rpm' },
  { field: 'tpm_limit', live: 'tpm', short: 'apikeys.limits.short.tpm', label: 'apikeys.limits.tpm' },
  { field: 'max_concurrency', live: 'concurrency', short: 'apikeys.limits.short.concurrency', label: 'apikeys.limits.concurrency' }
] as const

/** Everything the owner caps: the per-minute limits and the quota in USD. */
export type KeyCaps = KeyLimits & { quota_limit: number }
/** Form values of the caps: unlimited ones empty. */
export type KeyCapsForm = Record<keyof KeyCaps, number | null>

export function capsForm(k?: Partial<ApiKey>): KeyCapsForm {
  return {
    rpm_limit: k?.rpm_limit || null,
    tpm_limit: k?.tpm_limit || null,
    max_concurrency: k?.max_concurrency || null,
    quota_limit: Number(k?.quota_limit) || null
  }
}

/** Request body of form values: empty = 0 (unlimited). */
export function capsBody(form: KeyCapsForm): KeyCaps {
  return { rpm_limit: form.rpm_limit || 0, tpm_limit: form.tpm_limit || 0, max_concurrency: form.max_concurrency || 0, quota_limit: form.quota_limit || 0 }
}

/** The capped limits of a key with their current use. */
export function cappedLimits(k: ApiKey) {
  return LIMITS.filter((l) => (k[l.field] ?? 0) > 0).map((l) => ({ ...l, max: k[l.field] as number, used: k.live?.[l.live] }))
}

/** A key's quota: limit 0 = unlimited; used is what its requests were charged. */
export function quotaOf(k: ApiKey) {
  const limit = Number(k.quota_limit) || 0
  const used = Number(k.quota_used) || 0
  return { limit, used, exhausted: limit > 0 && used >= limit }
}

/** Bar tone of used against max: warning from 80 %, danger when reached. */
export const usageTone = (used: number, max: number) => (used >= max ? 'danger' : used >= max * 0.8 ? 'warning' : 'primary')
