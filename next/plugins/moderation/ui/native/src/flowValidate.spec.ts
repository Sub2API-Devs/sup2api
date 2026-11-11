import { describe, expect, it } from 'vitest'
import { newSpec } from './flowOps'
import { validateSpec } from './flowValidate'
import type { Spec, Stage } from './types'

// Auditors 1–3 are OpenAI, 4 is Jev, 5 a question-table LLM auditor.
const TYPES: Record<number, string> = { 1: 'openai_moderation', 2: 'openai_moderation', 3: 'openai_moderation', 4: 'typesafe', 5: 'llm_questions' }
const typeOf = (id: number) => TYPES[id]

const review = (...auditors: number[]): Stage => ({ auditors, combine: 'any' })
const fallback = (...auditors: number[]): Stage => ({ auditors, combine: 'any', fallback: true })
const spec = (...stages: Stage[]): Spec => ({ ...newSpec(), stages })
const codes = (s: Spec) => validateSpec(s, typeOf).map((i) => `${i.code}@${i.stage ?? ''}`)

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
