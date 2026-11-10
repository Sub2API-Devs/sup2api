import { describe, expect, it } from 'vitest'
import {
  addStage,
  applyDrop,
  canonicalSpec,
  groupCoverage,
  isAuditorType,
  moveStage,
  newSpec,
  sameSpec,
  setCombine,
  setFallback,
  stageRole,
  validateSpec,
  DEFAULT_CHANNEL_TIMEOUT_MS
} from './flowOps'
import type { Spec, Stage } from './types'

// Auditors 1–3 are OpenAI, 4 is Jev, 5 a question-table LLM auditor; 9 is of an unknown type.
const TYPES: Record<number, string> = { 1: 'openai_moderation', 2: 'openai_moderation', 3: 'openai_moderation', 4: 'typesafe', 5: 'llm_questions', 9: 'embedding' }
const typeOf = (id: number) => TYPES[id]

const review = (...auditors: number[]): Stage => ({ auditors, combine: 'any' })
const fallback = (...auditors: number[]): Stage => ({ auditors, combine: 'any', fallback: true })
const spec = (...stages: Stage[]): Spec => ({ ...newSpec(), stages })
/** "1 2 | 3": the first auditor of every stage, fallback stages after the bar. */
const order = (s: Spec) => {
  const ids = (list: Stage[]) => list.map((st) => st.auditors[0]).join(' ')
  const fb = s.stages.filter((st) => st.fallback)
  return ids(s.stages.filter((st) => !st.fallback)) + (fb.length ? ` | ${ids(fb)}` : '')
}
const codes = (s: Spec) => validateSpec(s, typeOf).map((i) => `${i.code}@${i.stage ?? ''}`)

describe('setFallback', () => {
  it('moves a new fallback stage behind every review stage, in front of the fallback stages', () => {
    const s = spec(review(1), review(2), review(3), fallback(4))
    const next = setFallback(s, 1, true)
    expect(order(next)).toBe('1 3 | 2 4')
    expect(next.stages.map((st) => st.fallback)).toEqual([undefined, undefined, true, true])
    expect(codes(next)).toEqual([])
    // the input is never mutated
    expect(order(s)).toBe('1 2 3 | 4')
  })

  it('moves a stage made a review stage again in front of every fallback stage', () => {
    const s = spec(review(1), fallback(2), fallback(3))
    const next = setFallback(s, 2, false)
    expect(order(next)).toBe('1 3 | 2')
    expect('fallback' in next.stages[1]).toBe(false)
    expect(codes(next)).toEqual([])
  })

  it('keeps the auditors, combine and n of the stage', () => {
    const s = spec(review(1), { auditors: [2, 3], combine: 'at_least', n: 2 })
    expect(setFallback(s, 1, true).stages[1]).toEqual({ auditors: [2, 3], combine: 'at_least', n: 2, fallback: true })
  })

  it('never leaves a flow without a first review stage, and ignores a no-op', () => {
    const one = spec(review(1))
    expect(setFallback(one, 0, true)).toBe(one)
    const s = spec(review(1), fallback(2))
    expect(setFallback(s, 0, true)).toBe(s)
    expect(setFallback(s, 1, true)).toBe(s)
    expect(setFallback(s, 0, false)).toBe(s)
    expect(setFallback(s, 5, true)).toBe(s)
  })
})

describe('validateSpec', () => {
  it('accepts review stages followed by fallback stages', () => {
    expect(codes(spec(review(1), review(4), fallback(2), fallback(5)))).toEqual([])
  })

  it('reports a fallback first stage', () => {
    expect(codes(spec(fallback(1), review(2)))).toEqual(['fallback_first@0', 'fallback_order@1'])
    expect(codes(spec(fallback(1)))).toEqual(['fallback_first@0'])
  })

  it('reports a review stage behind a fallback stage', () => {
    expect(codes(spec(review(1), fallback(2), review(3), fallback(4)))).toEqual(['fallback_order@2'])
  })

  it('takes fallback as a stage key and reports a value that is not a boolean', () => {
    expect(codes(spec(review(1), { ...review(2), fallback: false }))).toEqual([])
    const bad = spec(review(1), { ...review(2), fallback: 'yes' as unknown as boolean })
    expect(validateSpec(bad, typeOf)).toEqual([{ code: 'invalid_field', stage: 1, field: 'fallback' }])
  })
})

describe('addStage', () => {
  it('never inserts behind a fallback stage', () => {
    const s = spec(review(1), fallback(2))
    expect(order(addStage(s, 3, typeOf))).toBe('1 3 | 2')
    expect(order(addStage(s, 3, typeOf, 2))).toBe('1 3 | 2')
    expect(order(addStage(s, 3, typeOf, 0))).toBe('3 1 | 2')
    expect(codes(addStage(s, 3, typeOf))).toEqual([])
  })

  it('appends when there is no fallback stage, and takes the question-table auditor', () => {
    expect(order(addStage(spec(review(1)), 5, typeOf))).toBe('1 5')
    expect(isAuditorType('llm_questions')).toBe(true)
    expect(DEFAULT_CHANNEL_TIMEOUT_MS.llm_questions).toBe(15000)
    const s = spec(review(1))
    expect(addStage(s, 9, typeOf)).toBe(s)
  })

  it('puts a stage dropped on "new stage" in front of the fallback stages', () => {
    const s = spec(review(1), fallback(2))
    expect(order(applyDrop(s, { kind: 'library', auditor: 3 }, { kind: 'new' }, typeOf) as Spec)).toBe('1 3 | 2')
    const two = spec({ auditors: [1, 3], combine: 'any' }, fallback(2))
    const moved = applyDrop(two, { kind: 'node', stage: 0, index: 1 }, { kind: 'new' }, typeOf) as Spec
    expect(order(moved)).toBe('1 3 | 2')
    expect(codes(moved)).toEqual([])
  })
})

describe('moveStage', () => {
  const s = spec(review(1), review(2), fallback(3), fallback(4))

  it('reorders review stages and fallback stages among themselves', () => {
    expect(order(moveStage(s, 0, 1))).toBe('2 1 | 3 4')
    expect(order(moveStage(s, 3, 2))).toBe('1 2 | 4 3')
  })

  it('does not move a stage across the border between review and fallback stages', () => {
    expect(moveStage(s, 1, 2)).toBe(s)
    expect(moveStage(s, 2, 1)).toBe(s)
    expect(moveStage(s, 0, 3)).toBe(s)
    expect(applyDrop(s, { kind: 'stage', stage: 2 }, { kind: 'stage', stage: 0 }, typeOf)).toBe('noop')
  })
})

describe('setCombine', () => {
  it('keeps a fallback stage a fallback stage', () => {
    const s = spec(review(1), { auditors: [2, 3], combine: 'any', fallback: true })
    expect(setCombine(s, 1, 'all').stages[1]).toEqual({ auditors: [2, 3], combine: 'all', fallback: true })
    expect(setCombine(s, 1, 'at_least', 2).stages[1]).toEqual({ auditors: [2, 3], combine: 'at_least', n: 2, fallback: true })
    expect('fallback' in setCombine(s, 0, 'all').stages[0]).toBe(false)
  })
})

describe('canonicalSpec', () => {
  it('keeps fallback only when true', () => {
    const s = spec(review(1), { ...review(2), fallback: false }, fallback(3))
    const out = canonicalSpec(s)
    expect(out.stages).toEqual([{ auditors: [1], combine: 'any' }, { auditors: [2], combine: 'any' }, { auditors: [3], combine: 'any', fallback: true }])
    expect(JSON.stringify(out)).not.toContain('"fallback":false')
    expect(sameSpec(spec(review(1), { ...review(2), fallback: false }), spec(review(1), review(2)))).toBe(true)
    expect(sameSpec(spec(review(1), fallback(2)), spec(review(1), review(2)))).toBe(false)
  })
})

describe('stageRole', () => {
  it('names a fallback stage before any other rule', () => {
    expect(stageRole(0, review(1), typeOf)).toBe('first')
    expect(stageRole(1, review(4), typeOf)).toBe('behavior')
    expect(stageRole(1, review(5), typeOf)).toBe('review')
    expect(stageRole(2, fallback(4), typeOf)).toBe('fallback')
  })
})

// snapshot.flowFor since 0.8.0: a group bound to a disabled or unpublished
// flow falls back to the flow of the default group 0.
describe('groupCoverage', () => {
  const live = { enabled: true, version: 2 }
  const off = { enabled: false, version: 2 }
  const draft = { enabled: true, version: 0 }

  it('lets groups of an inactive flow fall back to the default flow', () => {
    const c = groupCoverage([1, 2, 3, 4], [{ groups: [0], ...live }, { groups: [1], ...off }, { groups: [2], ...draft }, { groups: [3], ...live }])
    expect(c.moderated).toEqual([1, 2, 3, 4])
    expect(c.inactive).toEqual([1, 2])
    expect(c.unbound).toEqual([])
    expect(c.defaultLive).toBe(true)
  })

  it('moderates nothing but live bindings without a live default flow', () => {
    const c = groupCoverage([1, 2, 3], [{ groups: [0], ...off }, { groups: [1], ...off }, { groups: [2], ...live }])
    expect(c.moderated).toEqual([2])
    expect(c.inactive).toEqual([0, 1])
    expect(c.unbound).toEqual([3])
    expect(c.defaultLive).toBe(false)
  })

  it('never moderates an exempt group, whatever the default flow', () => {
    const c = groupCoverage([1, 2], [{ groups: [0], ...live }], [2])
    expect(c.moderated).toEqual([1])
    expect(c.exempt).toEqual([2])
    expect(c.inactive).toEqual([])
  })
})
