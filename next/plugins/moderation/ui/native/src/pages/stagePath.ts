import type { Outcome, Trace } from '../host'

// Compact per-stage results of a run (new-api shared/stage-path.tsx):
// "初审 ✗ → 复核 ✓". Pure.

export type Mark = 'hit' | 'pass' | 'error' | 'skipped'
export type StageRole = 'first' | 'behavior' | 'review'

export interface StageMark {
  stage: number
  role: StageRole
  skipped: boolean
  auditors: Array<{ outcome: Outcome; mark: Mark }>
}

export function markOf(o: Outcome): Mark {
  if (o.err) return 'error'
  if (o.skipped) return 'skipped'
  return o.hit ? 'hit' : 'pass'
}

/** Role name of a stage: the first one is the first review; later ones with a Jev auditor review behaviour. */
export function stageRole(stage: number, types: Array<string | undefined>): StageRole {
  if (stage === 1) return 'first'
  return types.includes('typesafe') ? 'behavior' : 'review'
}

export function stageMarks(trace: Trace | null | undefined, typeOf: (auditorId: number) => string | undefined = () => undefined): StageMark[] {
  return (trace?.stages || []).map((st, i) => {
    const list = st.outcomes || []
    return {
      stage: i + 1,
      role: stageRole(
        i + 1,
        list.map((o) => typeOf(o.auditor_id))
      ),
      skipped: !!st.skipped || (list.length > 0 && list.every((o) => o.skipped)),
      auditors: list.map((o) => ({ outcome: o, mark: markOf(o) }))
    }
  })
}
