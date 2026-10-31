import type { CostSummary } from '../host'
import type { Status, TrendResult } from '../stats'

// Pure figures of the overview cards (no Vue, no host). Tested in
// __tests__/figures.test.mts.

/** a / b, 0 when b is 0. */
export const ratio = (a: number, b: number) => (b > 0 ? a / b : 0)

/** "12.5%" of a ratio; whole numbers drop the decimal. */
export function percent(r: number, digits = 1): string {
  const v = (Number.isFinite(r) ? r : 0) * 100
  const s = v.toFixed(digits)
  return `${s.includes('.') ? s.replace(/\.?0+$/, '') : s}%`
}

/** Above the alert threshold (percent); 0 = never alert. */
export const overAlert = (r: number, alertPercent: number) => alertPercent > 0 && r * 100 > alertPercent

/** The last latency bucket is open-ended (more than 10 000 ms). */
export const LATENCY_OVERFLOW_MS = 10000
export const latencyOverflow = (ms: number) => ms > LATENCY_OVERFLOW_MS

export interface NodeRow {
  key: string
  flow_id: number
  stage: number
  auditor_id: number
  audited: number
  hit: number
  errors: number
  hitRate: number
  errorRate: number
}

/** One row per auditor node: the range totals and their rates. */
export function nodeRows(auditors: TrendResult['auditors'] | null | undefined): NodeRow[] {
  return (auditors || []).map((n) => {
    let audited = 0
    let hit = 0
    let errors = 0
    for (const p of n.points || []) {
      audited += p.audited
      hit += p.hit
      errors += p.errors
    }
    return {
      key: `${n.flow_id}-${n.stage}-${n.auditor_id}`,
      flow_id: n.flow_id,
      stage: n.stage,
      auditor_id: n.auditor_id,
      audited,
      hit,
      errors,
      hitRate: ratio(hit, audited),
      errorRate: ratio(errors, audited)
    }
  })
}

/** Ids of `all` that no flow is bound to (the default group is not in /groups). */
export function unboundGroups(all: number[], bound: number[] | null | undefined): number[] {
  const b = new Set(bound || [])
  return all.filter((id) => !b.has(id))
}

export type ReviewKey = 'violation' | 'false_positive' | 'unsure'

/** Verdict split of today's AI review. */
export function reviewShares(r: Status['ai_review'] | null | undefined): Array<{ key: ReviewKey; count: number; ratio: number }> {
  const total = r?.reviewed || 0
  return (['violation', 'false_positive', 'unsure'] as const).map((key) => ({ key, count: r?.[key] || 0, ratio: ratio(r?.[key] || 0, total) }))
}

/** A false-positive share at or above this, with enough reviews, hints at strict thresholds. */
export const HIGH_FALSE_POSITIVE = 0.4
export const HINT_MIN_REVIEWED = 5
export function thresholdsTooStrict(r: Status['ai_review'] | null | undefined): boolean {
  return !!r && r.reviewed >= HINT_MIN_REVIEWED && ratio(r.false_positive, r.reviewed) >= HIGH_FALSE_POSITIVE
}

/** Rows with calls, highest amount first, then the most unpriced calls; at most `n`. */
export function topCosts<T extends { cost: CostSummary }>(rows: T[] | null | undefined, n = 5): T[] {
  return (rows || [])
    .filter((r) => r.cost && r.cost.calls > 0)
    .sort((a, b) => (Number(b.cost.cost) || 0) - (Number(a.cost.cost) || 0) || b.cost.unpriced_calls - a.cost.unpriced_calls)
    .slice(0, n)
}

/** A row of the cost card lists. */
export interface CostRow {
  key: string | number
  name: string
  sub?: string
  cost: CostSummary
}
