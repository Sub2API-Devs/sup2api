import type { HitCategory, Outcome, Trace } from '../host'

// Scores of a record relative to their thresholds (new-api shared/top-scores.ts).
// Pure functions: no host, testable with node --test.

export interface ScoreItem {
  category: string
  label?: string
  score: number
  threshold: number
}

/** How many categories a record shows (the backend keeps 3 per auditor). */
export const TOP_SCORE_COUNT = 3

/** Ratio at or above which a category counts as "near the threshold". */
export const NEAR_RATIO = 0.8

/** `over` = reached the threshold, `near` = at least 80 % of it, `low` = the rest. */
export type ScoreTone = 'over' | 'near' | 'low'

/** Score ÷ threshold; a zero threshold is always reached. */
export function scoreRatio(s: ScoreItem): number {
  return s.threshold <= 0 ? Number.POSITIVE_INFINITY : s.score / s.threshold
}

export function scoreTone(s: ScoreItem): ScoreTone {
  const r = scoreRatio(s)
  return r >= 1 ? 'over' : r >= NEAR_RATIO ? 'near' : 'low'
}

const outcomes = (trace: Trace | null | undefined): Outcome[] => (trace?.stages || []).flatMap((st) => st.outcomes || [])

const withThreshold = (c: HitCategory): c is HitCategory & { threshold: number } => typeof c.threshold === 'number' && typeof c.score === 'number'

/**
 * Categories of a run closest to their thresholds: every auditor's `top`
 * merged (one entry per category, the highest ratio wins), highest ratio
 * first. Records written before `top` existed fall back to the hits.
 */
export function topScores(trace: Trace | null | undefined, n = TOP_SCORE_COUNT): ScoreItem[] {
  const list = outcomes(trace)
  let candidates = list.flatMap((o) => o.top || []).filter(withThreshold)
  if (!candidates.length) candidates = list.flatMap((o) => o.hits || []).filter(withThreshold)
  const best = new Map<string, ScoreItem>()
  for (const c of candidates) {
    const item: ScoreItem = { category: c.category, label: c.label, score: c.score, threshold: c.threshold }
    const cur = best.get(c.category)
    if (!cur || scoreRatio(item) > scoreRatio(cur)) best.set(c.category, item)
  }
  return [...best.values()].sort((a, b) => scoreRatio(b) - scoreRatio(a)).slice(0, n)
}

/** Thresholds stored on the record per auditor: auditor id → category → threshold. */
export function storedThresholds(trace: Trace | null | undefined): Map<number, Map<string, number>> {
  const out = new Map<number, Map<string, number>>()
  for (const o of outcomes(trace)) {
    for (const h of o.hits || []) {
      if (!withThreshold(h)) continue
      const m = out.get(o.auditor_id) || new Map<string, number>()
      m.set(h.category, h.threshold)
      out.set(o.auditor_id, m)
    }
  }
  return out
}
