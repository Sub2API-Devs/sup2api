import type { ModEvent, Watch } from '../host'

// Figures of the watch list detail (new-api user-detail-summary.tsx). Pure.

export interface Distribution {
  total: number
  review: { pending: number; false_positive: number; confirmed: number }
  severity: { high: number; medium: number; low: number }
  ai: { violation: number; false_positive: number; unsure: number; none: number }
}

/** Handling, severity and AI verdict counts of the user's suspicious records. */
export function distribution(records: Array<Pick<ModEvent, 'review_status' | 'severity' | 'ai_verdict'>>): Distribution {
  const d: Distribution = {
    total: records.length,
    review: { pending: 0, false_positive: 0, confirmed: 0 },
    severity: { high: 0, medium: 0, low: 0 },
    ai: { violation: 0, false_positive: 0, unsure: 0, none: 0 }
  }
  for (const r of records) {
    if (r.review_status in d.review) d.review[r.review_status]++
    if (r.severity === 'high' || r.severity === 'critical') d.severity.high++
    else if (r.severity === 'medium') d.severity.medium++
    else if (r.severity === 'low') d.severity.low++
    const v = r.ai_verdict
    if (v === 'violation' || v === 'false_positive' || v === 'unsure') d.ai[v]++
    else d.ai.none++
  }
  return d
}

/**
 * Progress to the next automatic analysis: an observed user is analyzed every
 * `every` counted violations; enforce users only manually; every = 0 = off.
 */
export type NextAnalysis = { kind: 'running' } | { kind: 'manual_only' } | { kind: 'off'; count: number } | { kind: 'progress'; count: number; every: number; left: number; near: boolean }

export function nextAnalysis(w: Pick<Watch, 'level' | 'violation_count' | 'analysis_running'>, every: number): NextAnalysis {
  if (w.analysis_running) return { kind: 'running' }
  if (w.level === 'enforce') return { kind: 'manual_only' }
  const count = w.violation_count || 0
  if (!every || every <= 0) return { kind: 'off', count }
  const left = Math.max(0, every - count)
  return { kind: 'progress', count, every, left, near: left <= 3 }
}
