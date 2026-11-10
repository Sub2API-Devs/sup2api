import { describe, expect, it } from 'vitest'
import messages from './messages'
import { imagesRefusedNote, stageNumber, stageState, unjudgedStages } from './trace'
import type { Outcome, StageTrace } from './types'

describe('the stages of a trace', () => {
  const outcome = (o: Partial<Outcome>): Outcome => ({ auditor_id: 1, hit: false, ...o }) as Outcome

  // spec [review, review, fallback]: stage 1 passes, the fallback stage (3) runs
  it('are numbered as in the flow, by index on records written before 0.8.0', () => {
    const ran: StageTrace[] = [
      { stage: 1, outcomes: [outcome({})], result: 'pass' },
      { stage: 3, outcomes: [outcome({ hit: true })], result: 'hit', fallback: true }
    ]
    expect(ran.map(stageNumber)).toEqual([1, 3])
    const old: StageTrace[] = [{ outcomes: [], result: 'hit' }, { outcomes: [], result: 'pass' }]
    expect(old.map(stageNumber)).toEqual([1, 2])
    expect(stageNumber({ stage: 0 }, 4)).toBe(5)
  })

  it('show an old errored stage that no auditor judged as an error, not as a pass', () => {
    // before 0.8.0: no `failed`; the errored stage was stored as a pass
    expect(stageState({ outcomes: [outcome({ err: 'timeout' })], result: 'pass', errored: true })).toBe('error')
    expect(stageState({ outcomes: [outcome({ err: 'timeout' }), outcome({ skipped: true })], result: 'pass', errored: true })).toBe('error')
    // cut off before any auditor answered
    expect(stageState({ outcomes: null, result: 'pass', errored: true })).toBe('error')
    // an auditor judged: the stage's result stands
    expect(stageState({ outcomes: [outcome({ err: 'timeout' }), outcome({})], result: 'pass', errored: true })).toBe('pass')
    expect(stageState({ outcomes: [outcome({ err: 'timeout' }), outcome({ hit: true })], result: 'hit', errored: true })).toBe('hit')
    expect(stageState({ outcomes: [outcome({})], result: 'pass' })).toBe('pass')
  })

  it('keep the 0.8.0 states of a trace that has `failed`', () => {
    expect(stageState({ outcomes: [outcome({ err: 'timeout' })], result: 'skipped', errored: true, failed: true })).toBe('failed')
    expect(stageState({ outcomes: [outcome({ skipped: true })], result: 'skipped', skipped: true })).toBe('skipped')
    expect(stageState({ outcomes: [outcome({ err: 'network' }), outcome({ hit: true })], result: 'hit', errored: true })).toBe('hit')
  })

  // TraceView names the stages that have no row; StagePath marks the same ones
  it('lists the stages without a verdict and without an auditor call, failed or (before 0.8.0) errored', () => {
    const stages: StageTrace[] = [
      { stage: 1, outcomes: [outcome({ hit: true })], result: 'hit' },
      // cut off before any auditor answered (0.8.0)
      { stage: 2, outcomes: [], result: 'skipped', errored: true, failed: true },
      // failed with an auditor call: it has a row
      { stage: 3, outcomes: [outcome({ err: 'timeout' })], result: 'skipped', errored: true, failed: true },
      { stage: 5, outcomes: null, result: 'skipped', skipped: true }
    ]
    expect(unjudgedStages({ stages })).toEqual([{ n: 2, state: 'failed' }])
    // a record written before 0.8.0: errored, stored as a pass, no outcomes, no stage number
    const old: StageTrace[] = [{ outcomes: [outcome({})], result: 'pass' }, { outcomes: null, result: 'pass', errored: true }, { outcomes: [], result: 'pass', errored: true }]
    expect(unjudgedStages({ stages: old })).toEqual([{ n: 2, state: 'error' }, { n: 3, state: 'error' }])
    // every stage it lists is one the stage path marks (stageState), and has no row
    for (const u of unjudgedStages({ stages: old })) expect(stageState(old[u.n - 1])).toBe(u.state)
    expect(unjudgedStages({ stages: null })).toEqual([])
    expect(unjudgedStages(null)).toEqual([])
  })
})

describe('the note of a call whose images the upstream refused', () => {
  const text = (lang: typeof messages.zh, o: Parameters<typeof imagesRefusedNote>[0]): string | null => {
    const note = imagesRefusedNote(o)
    if (!note) return null
    const tpl = (lang.trace as Record<string, string>)[note.key.replace('trace.', '')]
    return tpl.replace(/\{(\w+)\}/g, (_, k: string) => String((note.params as Record<string, number> | undefined)?.[k] ?? `{${k}}`))
  }

  it('is absent unless the images were refused', () => {
    expect(imagesRefusedNote({})).toBeNull()
    expect(imagesRefusedNote({ images_refused: false, status: 400 })).toBeNull()
    // the status of an error says nothing about the images
    expect(imagesRefusedNote({ err: 'upstream_error', status: 400 })).toBeNull()
  })

  it('names the status of the refusal, on a reviewed and on a skipped outcome', () => {
    expect(imagesRefusedNote({ images_refused: true, status: 413 })).toEqual({ key: 'trace.imagesRefused', params: { status: 413 } })
    expect(text(messages.zh, { images_refused: true, status: 413 })).toBe('上游拒收图片（HTTP 413），本次只审了文字')
    expect(text(messages.en, { images_refused: true, status: 422 })).toBe('The upstream refused the images (HTTP 422); only the text was reviewed')
  })

  it('has no parenthesis without a status, or when the status is the one of an error of the text call', () => {
    expect(imagesRefusedNote({ images_refused: true })).toEqual({ key: 'trace.imagesRefusedNoStatus' })
    expect(imagesRefusedNote({ images_refused: true, err: 'upstream_error', status: 500 })).toEqual({ key: 'trace.imagesRefusedNoStatus' })
    for (const lang of [messages.zh, messages.en]) {
      const s = text(lang, { images_refused: true })!
      expect(s).toBeTruthy()
      for (const part of ['HTTP', '{', '(', '（']) expect(s).not.toContain(part)
    }
  })
})

describe('the texts about refused images', () => {
  it('name the overview counter, and the hint says that the switch must be off for a model without images', () => {
    for (const lang of [messages.zh, messages.en]) expect(lang.auditors.modelImagesHint).toContain(lang.runtime.imagesRefused)
    expect(messages.zh.auditors.modelImagesHint).toContain('必须关闭')
    expect(messages.en.auditors.modelImagesHint).toContain('must be turned off')
  })
})
