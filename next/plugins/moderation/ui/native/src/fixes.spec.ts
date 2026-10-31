import { describe, expect, it } from 'vitest'
import { manualTimeoutMs } from './flowOps'
import { mergeSettings } from './settingsMerge'
import { thresholdOverrides } from './thresholdPresets'

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
