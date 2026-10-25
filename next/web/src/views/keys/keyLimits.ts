import type { ApiKey, KeyLimits } from '@/api/types'

/** The caps in display order, with their live counter (ApiKey.live). */
export const LIMITS = [
  { field: 'rpm_limit', live: 'rpm', short: 'apikeys.limits.short.rpm', label: 'apikeys.limits.rpm' },
  { field: 'tpm_limit', live: 'tpm', short: 'apikeys.limits.short.tpm', label: 'apikeys.limits.tpm' },
  { field: 'max_concurrency', live: 'concurrency', short: 'apikeys.limits.short.concurrency', label: 'apikeys.limits.concurrency' }
] as const

/** Form values: a key's caps, unlimited ones empty. */
export function limitsForm(k?: Partial<KeyLimits>): Record<keyof KeyLimits, number | null> {
  return { rpm_limit: k?.rpm_limit || null, tpm_limit: k?.tpm_limit || null, max_concurrency: k?.max_concurrency || null }
}

/** Request body of form values: empty = 0 (unlimited). */
export function limitsBody(form: Record<keyof KeyLimits, number | null>): KeyLimits {
  return { rpm_limit: form.rpm_limit || 0, tpm_limit: form.tpm_limit || 0, max_concurrency: form.max_concurrency || 0 }
}

/** The capped limits of a key with their current use. */
export function cappedLimits(k: ApiKey) {
  return LIMITS.filter((l) => (k[l.field] ?? 0) > 0).map((l) => ({ ...l, max: k[l.field] as number, used: k.live?.[l.live] }))
}
