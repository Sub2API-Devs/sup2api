import type { JevQuestion, JevQuestions } from './types'

// Question tables (Jev, the question-table LLM): copying and comparing them.
// Shared by the auditor editor (auditorForm.ts, AuditorDefaultsDrawer,
// JevQuestionsView) and the default set in the settings tab.
// `ignoreThreshold`: the question-table LLM saves every threshold as 1 and
// uses none, so its tables compare without them.

/** A deep copy of a question table (an empty one for none). */
export const copyQuestions = (q: JevQuestions | null | undefined): JevQuestions => ({ preamble: q?.preamble || '', items: (q?.items || []).map((x) => ({ ...x })) })

/** What a row says: a cleared label or answer equals an absent one, a threshold typed as text its number. */
const rowKey = (q: JevQuestion, ignoreThreshold = false) =>
  JSON.stringify([q.category, q.label || '', q.question, q.answer_yes || '', q.answer_no || '', ignoreThreshold ? 0 : Number(q.threshold)])

/** Whether two question tables say the same. */
export function sameQuestions(a: JevQuestions, b: JevQuestions | null | undefined, ignoreThreshold = false): boolean {
  const bi = b?.items || []
  return (a.preamble || '') === (b?.preamble || '') && a.items.length === bi.length && a.items.every((q, i) => rowKey(q, ignoreThreshold) === rowKey(bi[i], ignoreThreshold))
}

export type RowState = 'same' | 'changed' | 'missing'

/**
 * How a question table differs from the default: per default row (by
 * category) the same, changed or missing; extra counts the rows the default
 * does not have; orderSame whether the rows both have come in the same order.
 */
export function questionDiff(current: JevQuestions, def: JevQuestions, ignoreThreshold = false) {
  const mine = new Map(current.items.map((q) => [q.category, q]))
  const rows = def.items.map((q) => {
    const m = mine.get(q.category)
    const state: RowState = !m ? 'missing' : rowKey(m, ignoreThreshold) === rowKey(q, ignoreThreshold) ? 'same' : 'changed'
    return { question: q, state }
  })
  const known = new Set(def.items.map((q) => q.category))
  const shared = (items: JevQuestion[], has: (c: string) => boolean) => items.map((q) => q.category).filter(has)
  const orderSame = shared(current.items, (c) => known.has(c)).join('\n') === shared(def.items, (c) => mine.has(c)).join('\n')
  return { preambleSame: (current.preamble || '') === (def.preamble || ''), rows, extra: current.items.filter((q) => !known.has(q.category)).length, orderSame }
}
