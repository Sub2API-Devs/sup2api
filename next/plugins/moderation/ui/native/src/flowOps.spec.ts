import { describe, expect, it } from 'vitest'
import { applyDrop } from './canvasDrag'
import {
  addStage,
  canonicalSpec,
  hasQuestions,
  hitOutcome,
  isAuditorType,
  manualTimeoutMs,
  moveStage,
  newSpec,
  passOutcome,
  removeAuditor,
  removeStage,
  sameSpec,
  setCombine,
  setFallback,
  stageRole,
  AUDITOR_TYPES,
  DEFAULT_CHANNEL_TIMEOUT_MS
} from './flowOps'
import { validateSpec } from './flowValidate'
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

// A removal can leave only fallback stages: the first stage cannot be one
// (fallback_first blocks publishing and saving, and its card has no switch).
describe('the first stage stays a review stage when the review stages are removed', () => {
  const both = () => spec(review(1), { auditors: [2, 3], combine: 'at_least', n: 2, fallback: true }, fallback(4))

  it('removeStage', () => {
    const s = both()
    const next = removeStage(s, 0)
    expect(next.stages).toEqual([{ auditors: [2, 3], combine: 'at_least', n: 2 }, { auditors: [4], combine: 'any', fallback: true }])
    expect('fallback' in next.stages[0]).toBe(false)
    expect(codes(next)).toEqual([])
    // the input is never mutated
    expect(s.stages[1].fallback).toBe(true)
    // a review stage is left: nothing else changes
    expect(order(removeStage(spec(review(1), review(2), fallback(3)), 0))).toBe('2 | 3')
    expect(removeStage(spec(review(1)), 0).stages).toEqual([])
  })

  it('removeAuditor', () => {
    const next = removeAuditor(spec(review(1), fallback(2)), 0, 0)
    expect(next.stages).toEqual([{ auditors: [2], combine: 'any' }])
    expect(codes(next)).toEqual([])
    // the stage keeps an auditor: it stays, and so do the fallback stages
    expect(order(removeAuditor(spec(review(1, 3), fallback(2)), 0, 0))).toBe('3 | 2')
    // dropping the auditor on the library removes it the same way
    expect(applyDrop(spec(review(1), fallback(2)), { kind: 'node', stage: 0, index: 0 }, { kind: 'trash' }, typeOf)).toEqual(next)
  })

  it('moveAuditor (keyboard → or a drag into the fallback stage)', () => {
    const next = applyDrop(spec(review(1), fallback(2), fallback(3)), { kind: 'node', stage: 0, index: 0 }, { kind: 'stage', stage: 1 }, typeOf) as Spec
    expect(next.stages).toEqual([{ auditors: [2, 1], combine: 'any' }, { auditors: [3], combine: 'any', fallback: true }])
    expect(codes(next)).toEqual([])
    // the source stage stays: the target stays a fallback stage
    const kept = applyDrop(spec(review(1, 4), fallback(2)), { kind: 'node', stage: 0, index: 0 }, { kind: 'stage', stage: 1 }, typeOf) as Spec
    expect(kept.stages).toEqual([{ auditors: [4], combine: 'any' }, { auditors: [2, 1], combine: 'any', fallback: true }])
    // the only review auditor moved to a new stage is a review stage again
    const moved = applyDrop(spec(review(1), fallback(2)), { kind: 'node', stage: 0, index: 0 }, { kind: 'new' }, typeOf) as Spec
    expect(order(moved)).toBe('1 | 2')
    expect(codes(moved)).toEqual([])
  })
})

// flow.go runFlow: a pass ends the chain; the fallback stages run only when no stage hit before it.
describe('passOutcome', () => {
  it('names where a pass of a review stage leads', () => {
    // no fallback stages: a pass allows
    expect([0, 1, 2].map((i) => passOutcome(i, 3, 3))).toEqual(['passAllow', 'passAllow', 'passAllow'])
    // the first stage has no earlier hit: its pass goes to the fallback stages
    expect(passOutcome(0, 1, 2)).toBe('passFallback')
    // a later stage overturns an earlier hit (no fallback), or had none in front (failed stages)
    expect([0, 1].map((i) => passOutcome(i, 2, 3))).toEqual(['passFallback', 'passOverturn'])
  })
})

describe('hitOutcome', () => {
  it('names where a hit of a review stage leads', () => {
    // the last review stage's hit is the verdict, with or without fallback stages behind it
    expect(hitOutcome(0, 1)).toEqual({ key: 'hitSuspicious', n: 2 })
    expect(hitOutcome(2, 3).key).toBe('hitSuspicious')
    // an earlier one hands over to the next stage, named by its number
    expect(hitOutcome(0, 3)).toEqual({ key: 'hitNextN', n: 2 })
    expect(hitOutcome(1, 3)).toEqual({ key: 'hitNextN', n: 3 })
  })
})

describe('auditor types', () => {
  it('are all placeable, and two of them judge by a question table', () => {
    expect(AUDITOR_TYPES.every(isAuditorType)).toBe(true)
    expect(AUDITOR_TYPES.filter(hasQuestions)).toEqual(['typesafe', 'llm_questions'])
    expect(hasQuestions(undefined)).toBe(false)
  })
})

describe('manualTimeoutMs', () => {
  it('accepts positive seconds only', () => {
    expect(manualTimeoutMs('1.5')).toBe(1500)
    expect(manualTimeoutMs(30)).toBe(30_000)
    expect(manualTimeoutMs('0')).toBeNull()
    expect(manualTimeoutMs(-2)).toBeNull()
    expect(manualTimeoutMs('')).toBeNull()
    expect(manualTimeoutMs(null)).toBeNull()
    expect(manualTimeoutMs('abc')).toBeNull()
  })
})
