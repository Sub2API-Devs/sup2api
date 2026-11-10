import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiKey } from '@/api/types'
import { isExpired, keyState, matchesKeyFilter } from './keyState'

const NOW = new Date('2026-11-10T12:00:00.000Z')
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString()
const key = (k: Partial<ApiKey> = {}) =>
  ({ id: 1, name: 'k', group_id: 1, key_prefix: 'sk', status: 'active', created_at: '', ...k }) as ApiKey
const PAST = at(-60_000)
const SPENT = { quota_limit: '5', quota_used: '5' }

describe('API key state', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('is active for an enabled key that neither expired nor used up its quota', () => {
    expect(keyState(key())).toBe('active')
    expect(keyState(key({ expires_at: at(60_000), quota_limit: '5', quota_used: '4.99' }))).toBe('active')
  })

  it('ranks the key being switched off over its expiry, and expiry over a used-up quota', () => {
    expect(keyState(key({ status: 'disabled', expires_at: PAST, ...SPENT }))).toBe('disabled')
    expect(keyState(key({ status: 'disabled' }))).toBe('disabled')
    expect(keyState(key({ expires_at: PAST, ...SPENT }))).toBe('expired')
    expect(keyState(key({ expires_at: PAST }))).toBe('expired')
    expect(keyState(key({ expires_at: at(60_000), ...SPENT }))).toBe('exhausted')
    expect(keyState(key(SPENT))).toBe('exhausted')
  })

  it('shows a status this console does not know as disabled: the key is not usable', () => {
    expect(keyState(key({ status: 'suspended' }))).toBe('disabled')
  })

  it('expires a key at the instant of its expiry, never one without an expiry', () => {
    expect(isExpired(key({ expires_at: at(1) }))).toBe(false)
    expect(isExpired(key({ expires_at: at(0) }))).toBe(true)
    expect(isExpired(key({ expires_at: at(-1) }))).toBe(true)
    expect(isExpired(key({ expires_at: null }))).toBe(false)
    expect(isExpired(key())).toBe(false)
  })

  it('uses a quota up when the charges reach or pass the limit; no limit is never used up', () => {
    expect(keyState(key({ quota_limit: '5', quota_used: '5.000001' }))).toBe('exhausted')
    expect(keyState(key({ quota_limit: '5', quota_used: '4.999999' }))).toBe('active')
    expect(keyState(key({ quota_limit: '0', quota_used: '120' }))).toBe('active')
    expect(keyState(key({ quota_used: '120' }))).toBe('active')
  })
})

describe('API key list filters, as the server reads them', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  const laptop = key({ name: 'Laptop', key_prefix: 'sk-s2a-A1b2c', group_id: 2 })

  it('passes every key when no filter is set', () => {
    expect(matchesKeyFilter(laptop, {})).toBe(true)
    expect(matchesKeyFilter(laptop, { q: '', status: '', group_id: '' })).toBe(true)
    expect(matchesKeyFilter(laptop, { q: '  ', group_id: null })).toBe(true)
  })

  it('searches the name anywhere, ignoring case', () => {
    expect(matchesKeyFilter(laptop, { q: 'APT' })).toBe(true)
    expect(matchesKeyFilter(laptop, { q: 'desktop' })).toBe(false)
  })

  it('searches the key prefix only by text that starts as a key and says more than the scheme', () => {
    expect(matchesKeyFilter(laptop, { q: 'sk-s2a-a1' })).toBe(true)
    expect(matchesKeyFilter(laptop, { q: 'SK-S2A-A1B2C' })).toBe(true)
    expect(matchesKeyFilter(laptop, { q: 'sk-s2a-zz' })).toBe(false)
    // Every key starts like this: it would filter nothing, so only names are searched.
    expect(matchesKeyFilter(laptop, { q: 'sk-s2a-' })).toBe(false)
    expect(matchesKeyFilter(laptop, { q: 's' })).toBe(false)
    expect(matchesKeyFilter(laptop, { q: 'a1b2c' })).toBe(false)
    expect(matchesKeyFilter(key({ name: 'sk-s2a- relay' }), { q: 'sk-s2a-' })).toBe(true)
  })

  it('reads the status as the list does: off before expired, a used-up quota still active', () => {
    const off = key({ status: 'disabled', expires_at: PAST })
    const late = key({ expires_at: PAST, ...SPENT })
    const spent = key(SPENT)
    expect([key(), off, late, spent].map(k => matchesKeyFilter(k, { status: 'active' }))).toEqual([true, false, false, true])
    expect([key(), off, late, spent].map(k => matchesKeyFilter(k, { status: 'disabled' }))).toEqual([false, true, false, false])
    expect([key(), off, late, spent].map(k => matchesKeyFilter(k, { status: 'expired' }))).toEqual([false, false, true, false])
  })

  it('matches the group exactly, however the filter holds its id', () => {
    expect(matchesKeyFilter(laptop, { group_id: 2 })).toBe(true)
    expect(matchesKeyFilter(laptop, { group_id: '2' })).toBe(true)
    expect(matchesKeyFilter(laptop, { group_id: 1 })).toBe(false)
    expect(matchesKeyFilter(key({ group_id: null }), { group_id: 1 })).toBe(false)
  })

  it('needs every set filter to pass', () => {
    expect(matchesKeyFilter(laptop, { q: 'lap', status: 'active', group_id: 2 })).toBe(true)
    expect(matchesKeyFilter(laptop, { q: 'lap', status: 'disabled', group_id: 2 })).toBe(false)
    expect(matchesKeyFilter(laptop, { q: 'lap', status: 'active', group_id: 3 })).toBe(false)
  })
})
