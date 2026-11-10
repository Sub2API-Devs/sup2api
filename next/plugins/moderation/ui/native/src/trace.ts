import type { HitCategory, Outcome, StageTrace, Trace } from './types'

// Pure helpers over a record's per-stage trace (stage path, score chips, trace table).

export type OutcomeState = 'hit' | 'pass' | 'error' | 'skipped'

export function outcomeState(o: Outcome): OutcomeState {
  if (o.err) return 'error'
  if (o.skipped) return 'skipped'
  return o.hit ? 'hit' : 'pass'
}

/**
 * The note of an auditor call whose images the upstream refused (null when
 * it did not): the message key and its parameters. The status is the one of
 * the refusal only on an outcome without an error — an error of the call
 * that followed replaces it — so the note names it only then.
 */
export function imagesRefusedNote(o: Pick<Outcome, 'images_refused' | 'err' | 'status'>): { key: string; params?: { status: number } } | null {
  if (!o.images_refused) return null
  return !o.err && o.status ? { key: 'trace.imagesRefused', params: { status: o.status } } : { key: 'trace.imagesRefusedNoStatus' }
}

/**
 * What a stage came to: failed = no verdict, passed over (earlier hits
 * stand); skipped = every auditor skipped; error = a stage of a record
 * written before 0.8.0 in which no auditor judged and an error made it pass.
 */
export type StageState = 'failed' | 'error' | 'skipped' | 'hit' | 'pass'

/**
 * Records written before 0.8.0 have no `failed`: there a stage that errored
 * without any auditor judging (every outcome has an error or was skipped,
 * or it was cut off before any answered) was stored as a pass. Since 0.8.0
 * such a stage is `failed`, so this shape only occurs on old records.
 */
export function stageState(st: Pick<StageTrace, 'failed' | 'skipped' | 'result' | 'errored' | 'outcomes'>): StageState {
  if (st.failed) return 'failed'
  if (st.skipped) return 'skipped'
  if (st.errored && st.result === 'pass' && !(st.outcomes || []).some((o) => !o.err && !o.skipped)) return 'error'
  return st.result
}

/**
 * The number of a trace stage in the flow's spec (1-based). A trace holds
 * only the stages that ran, so its index is not the spec's: `stage` says it
 * (0.8.0); records written before have none, and their stages ran in order
 * from the first.
 */
export const stageNumber = (st: Pick<StageTrace, 'stage'>, index: number): number => (typeof st.stage === 'number' && st.stage > 0 ? st.stage : index + 1)

/**
 * The stages of a trace that reached no verdict and have no auditor call
 * (cut off before any answered): the trace table has no row for them, so
 * its head names them — failed, or error on a record written before 0.8.0,
 * as the stage path shows them.
 */
export function unjudgedStages(trace: Pick<Trace, 'stages'> | null | undefined): { n: number; state: 'failed' | 'error' }[] {
  return (trace?.stages || []).flatMap((st, i) => {
    const state = stageState(st)
    return (state === 'failed' || state === 'error') && !st.outcomes?.length ? [{ n: stageNumber(st, i), state }] : []
  })
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
