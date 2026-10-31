import type { HitCategory, Outcome, Trace } from './types'

// Pure helpers over a record's per-stage trace (stage path, score chips, trace table).

export type OutcomeState = 'hit' | 'pass' | 'error' | 'skipped'

export function outcomeState(o: Outcome): OutcomeState {
  if (o.err) return 'error'
  if (o.skipped) return 'skipped'
  return o.hit ? 'hit' : 'pass'
}

/** A category score of a run; threshold is known for hit categories only. */
export interface TraceScore {
  category: string
  label?: string
  score: number
  threshold?: number
}

/** Above the threshold, close to it (≥ 80 %) or low; unknown threshold = low. */
export type ScoreLevel = 'over' | 'near' | 'low'
const NEAR_RATIO = 0.8

export function scoreLevel(s: TraceScore): ScoreLevel {
  if (!s.threshold) return 'low'
  if (s.score >= s.threshold) return 'over'
  return s.score >= s.threshold * NEAR_RATIO ? 'near' : 'low'
}

/**
 * Highest score per category over all auditor calls: the hit categories with
 * their thresholds, else each call's top category. Highest first.
 */
export function traceScores(trace: Trace | null | undefined): TraceScore[] {
  const outcomes = (trace?.stages || []).flatMap((s) => s.outcomes || [])
  const hits: HitCategory[] = outcomes.flatMap((o) => o.hits || [])
  const all: TraceScore[] = hits.length
    ? hits
    : outcomes.filter((o) => o.top_category).map((o) => ({ category: o.top_category as string, score: o.top_score }))
  const best = new Map<string, TraceScore>()
  for (const s of all) if ((best.get(s.category)?.score ?? -1) < s.score) best.set(s.category, s)
  return [...best.values()].sort((a, b) => b.score - a.score)
}
