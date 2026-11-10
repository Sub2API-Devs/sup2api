import { describe, expect, it } from 'vitest'
import { auditorConfig, auditorFormOf, isLLMAuditor, llmTextOnly, tryImages, tryTextOnly, type AuditorForm } from './auditorForm'
import { AUDITOR_TYPES } from './flowOps'
import messages from './messages'
import type { Auditor, AuditorConfig, AuditorType } from './types'

const LLM_TYPES: AuditorType[] = ['llm_verdict', 'llm_questions']
const stored = (type: AuditorType, config: AuditorConfig): Auditor => ({ id: 7, name: 'a', type, channel_id: 3, config }) as Auditor
const formOf = (type: AuditorType, config: AuditorConfig, over: Partial<AuditorForm> = {}): AuditorForm => ({ ...auditorFormOf(stored(type, config)), ...over })

describe('auditorFormOf', () => {
  it('starts a new auditor with images on', () => {
    const f = auditorFormOf(null)
    expect(f.review_images).toBe(true)
    expect(f).toMatchObject({ name: '', type: 'openai_moderation', channel_id: 0, thresholds: {}, ownQuestions: false, tool_choice: 'required', max_turns: 3, temperature: 0, max_tokens: 512, flag_as_hit: false })
  })

  it('shows images on for a stored auditor without the field, off only for a stored false', () => {
    for (const type of ['typesafe', ...LLM_TYPES] as AuditorType[]) {
      expect(auditorFormOf(stored(type, {})).review_images).toBe(true)
      expect(auditorFormOf(stored(type, { review_images: null })).review_images).toBe(true)
      expect(auditorFormOf(stored(type, { review_images: true })).review_images).toBe(true)
      expect(auditorFormOf(stored(type, { review_images: false })).review_images).toBe(false)
    }
  })
})

describe('auditorConfig', () => {
  it('sends review_images of an llm_verdict auditor, true or false', () => {
    const base = { system_prompt: 'p', categories: [{ id: 'x', description: 'd' }], tool_choice: 'auto', max_turns: 2, temperature: 0.5, max_tokens: 256, flag_as_hit: true }
    expect(auditorConfig(formOf('llm_verdict', base, { review_images: true }))).toEqual({ review_images: true, ...base })
    expect(auditorConfig(formOf('llm_verdict', base, { review_images: false }))).toEqual({ review_images: false, ...base })
  })

  it('sends review_images of an llm_questions auditor, true or false, with its table at the yes/no threshold', () => {
    const questions = { preamble: 'pre', items: [{ category: 'c', question: 'q?', threshold: 0.85 }] }
    const sent = { preamble: 'pre', items: [{ category: 'c', question: 'q?', threshold: 1 }] }
    expect(auditorConfig(formOf('llm_questions', { questions }, { review_images: true }))).toEqual({ review_images: true, questions: sent })
    expect(auditorConfig(formOf('llm_questions', { questions }, { review_images: false }))).toEqual({ review_images: false, questions: sent })
    // the default table
    expect(auditorConfig(formOf('llm_questions', {}, { review_images: false }))).toEqual({ review_images: false, questions: null })
  })

  it('saves a stored LLM auditor without the field as on, and a stored off as off', () => {
    for (const type of LLM_TYPES) {
      expect(auditorConfig(formOf(type, {})).review_images).toBe(true)
      expect(auditorConfig(formOf(type, { review_images: false })).review_images).toBe(false)
    }
  })

  it('keeps the Jev and OpenAI configs as they were', () => {
    const questions = { preamble: '', items: [{ category: 'c', question: 'q?', threshold: '0.5' as unknown as number }] }
    expect(auditorConfig(formOf('typesafe', { questions }, { review_images: false }))).toEqual({ review_images: false, questions: { preamble: '', items: [{ category: 'c', question: 'q?', threshold: 0.5 }] } })
    expect(auditorConfig(formOf('typesafe', {}))).toEqual({ review_images: true, questions: null })
    // no image switch: OpenAI moderation takes images as they are; a cleared threshold is not sent
    expect(auditorConfig(formOf('openai_moderation', { thresholds: { hate: 0.4 } }, { review_images: false, thresholds: { hate: '0.4', violence: null } }))).toEqual({ thresholds: { hate: 0.4 } })
  })
})

describe('the try panel', () => {
  it('knows the LLM auditor types', () => {
    expect(AUDITOR_TYPES.filter(isLLMAuditor)).toEqual(LLM_TYPES)
    expect(isLLMAuditor(undefined)).toBe(false)
  })

  it('offers images to a stored LLM auditor unless its switch is off', () => {
    for (const type of LLM_TYPES) {
      expect(tryTextOnly({ type, config: {} })).toBe(false)
      expect(tryTextOnly({ type })).toBe(false)
      expect(tryTextOnly({ type, config: { review_images: true } })).toBe(false)
      expect(tryTextOnly({ type, config: { review_images: false } })).toBe(true)
    }
  })

  it('goes by the unsaved edits when there is a draft', () => {
    for (const type of LLM_TYPES) {
      const on = { type, config: auditorConfig(formOf(type, { review_images: false }, { review_images: true })) }
      const off = { type, config: auditorConfig(formOf(type, {}, { review_images: false })) }
      // stored off, switched on in the form; stored on, switched off in the form
      expect(tryTextOnly({ type, config: { review_images: false }, draft: on })).toBe(false)
      expect(tryTextOnly({ type, config: {}, draft: off })).toBe(true)
      // an unsaved auditor: the draft alone
      expect(tryTextOnly({ draft: on })).toBe(false)
      expect(tryTextOnly({ draft: off })).toBe(true)
    }
  })

  it('always offers images to the other auditors and without a target', () => {
    expect(tryTextOnly({ type: 'typesafe', config: { review_images: false } })).toBe(false)
    expect(tryTextOnly({ type: 'openai_moderation', config: {} })).toBe(false)
    expect(llmTextOnly('typesafe', { review_images: false })).toBe(false)
    expect(tryTextOnly(null)).toBe(false)
  })

  it('sends the attached images iff they are offered', () => {
    const images = ['data:image/png;base64,AAAA']
    for (const type of LLM_TYPES) {
      expect(tryImages({ type, config: {} }, images)).toBe(images)
      expect(tryImages({ type, config: { review_images: false } }, images)).toEqual([])
    }
    expect(tryImages({ type: 'typesafe', config: { review_images: false } }, images)).toBe(images)
  })
})

describe('the texts of the image switch', () => {
  it('no longer say that an LLM auditor reviews text only, except where the switch is off', () => {
    for (const lang of [messages.zh, messages.en]) {
      for (const k of ['modelImages', 'modelImagesHint', 'textOnly', 'tryTextOnly'] as const) expect(lang.auditors[k]).toBeTruthy()
    }
    expect(messages.zh.auditors.llmQuestionsHint).not.toContain('只审文')
    expect(messages.en.auditors.llmQuestionsHint.toLowerCase()).not.toContain('text only')
    expect(messages.zh.auditors.hint).toContain('模型支持图片')
    expect(messages.en.auditors.hint).toContain('Model supports images')
    expect(messages.zh.auditors.tryTextOnly).toContain('模型支持图片')
    expect(messages.en.auditors.tryTextOnly).toContain('Model supports images')
    // the limits of the backend contract
    for (const lang of [messages.zh, messages.en]) for (const limit of ['5 MiB', '8000', '400', 'URL']) expect(lang.auditors.modelImagesHint).toContain(limit)
  })
})
