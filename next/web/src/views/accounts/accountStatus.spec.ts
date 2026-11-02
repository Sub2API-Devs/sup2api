import { describe, expect, it } from 'vitest'
import { accountStatusKey, accountStatusKeys, accountStatusTone } from './accountStatus'

describe('accountStatus', () => {
  it.each([
    [{ status: 'active', schedulable: true }, 'active', 'success'],
    [{ status: 'disabled', schedulable: false }, 'disabled', 'danger'],
    [{ status: 'disabled', schedulable: true }, 'disabled', 'danger'],
    // Auto-disabled: yellow when it comes back by itself, red when it needs a person.
    [{ status: 'auto_disabled', schedulable: true, auto_disabled_until: '2026-11-03T00:00:00Z' }, 'auto_disabled', 'warning'],
    [{ status: 'auto_disabled', schedulable: true, auto_disabled_until: null }, 'auto_disabled', 'danger'],
    [{ status: 'auto_disabled', schedulable: true }, 'auto_disabled', 'danger'],
    [{ status: 'error', schedulable: true }, 'auto_disabled', 'danger'],
    // Taken out of scheduling by hand: filed under auto-disabled, red like a manual disable.
    [{ status: 'active', schedulable: false }, 'auto_disabled', 'danger']
  ])('maps %o to %s', (a, key, tone) => {
    expect(accountStatusKey(a)).toBe(key)
    expect(accountStatusTone(a)).toBe(tone)
  })

  it('greys out an orphaned account and keeps three filter keys', () => {
    expect(accountStatusTone({ status: 'active', schedulable: true, orphaned: true })).toBe('gray')
    expect(accountStatusKeys).toEqual(['active', 'auto_disabled', 'disabled'])
  })
})
