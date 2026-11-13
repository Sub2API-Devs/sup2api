import { describe, expect, it } from 'vitest'
import { lockActions, userListOf } from './userLock'

describe('lock actions', () => {
  it('reads the list a user is on, a user on both being blocklisted', () => {
    expect(userListOf({})).toBeNull()
    expect(userListOf({ allowlisted: true })).toBe('allowlist')
    expect(userListOf({ allowlisted: true, blocklisted: true })).toBe('blocklist')
  })

  it('offers the other lists, and unlock only to a locked user', () => {
    expect(lockActions(null)).toEqual(['blocklist', 'allowlist'])
    expect(lockActions('blocklist')).toEqual(['allowlist', 'unlock'])
    expect(lockActions('allowlist')).toEqual(['blocklist', 'unlock'])
  })

  it('offers a moderator no list, only the unlock of an entry from before', () => {
    expect(lockActions(null, true)).toEqual([])
    expect(lockActions('blocklist', true)).toEqual(['unlock'])
  })
})
