import { describe, expect, it } from 'vitest'
import { manualTimeoutMs } from './flowOps'
import { mergeSettings } from './settingsMerge'
import { watchNew } from './status'
import { thresholdOverrides } from './thresholdPresets'
import { stageNumber, stageState } from './trace'
import type { Outcome, StageTrace } from './types'

const KEYS = ['block_status', 'block_message', 'notify_webhook_secret', 'jev_default_set']

describe('mergeSettings', () => {
  const loaded = { block_status: 403, block_message: 'no', notify_webhook_secret: '******', jev_default_set: null, mode: 'observe' }
  const initial = { block_status: 403, block_message: 'no', notify_webhook_secret: '******', jev_default_set: null }

  it('writes only the keys this page changed, keeping later changes elsewhere', () => {
    const latest = { ...loaded, block_message: 'changed elsewhere', mode: 'enforce', other: 1 }
    const m = mergeSettings(KEYS, loaded, latest, initial, { ...initial, block_status: 451 })
    expect(m.changed).toEqual(['block_status'])
    expect(m.conflicts).toEqual([])
    expect(m.values).toEqual({ ...latest, block_status: 451 })
  })

  it('reports a key changed both here and elsewhere, and this page wins', () => {
    const latest = { ...loaded, block_status: 429 }
    const m = mergeSettings(KEYS, loaded, latest, initial, { ...initial, block_status: 451 })
    expect(m.conflicts).toEqual(['block_status'])
    expect(m.values.block_status).toBe(451)
  })

  it('removes a key emptied here (its default applies)', () => {
    const m = mergeSettings(KEYS, loaded, loaded, initial, { ...initial, block_message: undefined })
    expect(m.changed).toEqual(['block_message'])
    expect('block_message' in m.values).toBe(false)
  })

  it('keeps a stored secret (mask) and changes nothing when nothing was edited', () => {
    const m = mergeSettings(KEYS, loaded, loaded, initial, { ...initial })
    expect(m.changed).toEqual([])
    expect(m.values).toEqual(loaded)
  })

  it('compares structured values by content', () => {
    const set = { preamble: '', items: [{ category: 'a', threshold: 0.5 }] }
    const m = mergeSettings(KEYS, { ...loaded, jev_default_set: set }, { ...loaded, jev_default_set: set }, { ...initial, jev_default_set: set }, {
      ...initial,
      jev_default_set: { preamble: '', items: [{ category: 'a', threshold: 0.5 }] }
    })
    expect(m.changed).toEqual([])
  })
})

describe('thresholdOverrides', () => {
  it('drops cleared inputs instead of sending 0', () => {
    expect(thresholdOverrides({ hate: null, sexual: '', violence: ' ', harassment: '0.4', illicit: 0.7, x: undefined })).toEqual({ harassment: 0.4, illicit: 0.7 })
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
})

describe('watchNew', () => {
  it('counts the enforce-level entries with new hits, absent before 0.8.0', () => {
    expect(watchNew({ watching: 4, watching_with_new: 0, blocking: 9, blocking_with_new: 3 })).toEqual({ watching: 0, blocking: 3, total: 3 })
    expect(watchNew({ watching: 4, watching_with_new: 2, blocking: 9, blocking_with_new: 0 })).toEqual({ watching: 2, blocking: 0, total: 2 })
    expect(watchNew({ watching: 4, watching_with_new: 2, blocking: 9 })).toEqual({ watching: 2, blocking: null, total: 2 })
  })
})
