// Success rate of an account over the last minute (CONTRACTS §73): successful
// requests against failed attempts; 400s, client cancellations and the
// gateway's own rate limiting are not failures (the server leaves them out).
import type { AccountOutcomes } from '@/api/types'

/** Percent 0–100, or null when there is nothing to rate (no data or no traffic). */
export function successRate(o: AccountOutcomes | null | undefined): number | null {
  if (!o) return null
  const total = o.success + o.failed
  return total > 0 ? (o.success * 100) / total : null
}

/** Tone of a rate: ≥ 99 % success, ≥ 95 % warning, below danger. */
export function successRateTone(rate: number | null): 'success' | 'warning' | 'danger' | 'gray' {
  if (rate === null) return 'gray'
  if (rate >= 99) return 'success'
  if (rate >= 95) return 'warning'
  return 'danger'
}

/** "99.6%" with one decimal, trailing ".0" dropped; "—" without a rate. */
export function formatSuccessRate(rate: number | null): string {
  if (rate === null) return '—'
  const floored = Math.floor(rate * 10) / 10
  return `${Number(floored.toFixed(1))}%`
}
