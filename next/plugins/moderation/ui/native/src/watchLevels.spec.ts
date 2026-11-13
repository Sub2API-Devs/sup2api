import { describe, expect, it } from 'vitest'
import { watchLocked } from './watchLevels'

describe('watchLocked', () => {
  it('refuses the watch actions for a user on a list or with a locked entry (409 locked)', () => {
    expect(watchLocked({})).toBe(false)
    expect(watchLocked({ allowlisted: false, blocklisted: false, locked: false })).toBe(false)
    expect(watchLocked({ allowlisted: true })).toBe(true)
    expect(watchLocked({ blocklisted: true })).toBe(true)
    // still locked while the user already left the lists (the plugin unlocks it shortly)
    expect(watchLocked({ locked: true })).toBe(true)
  })
})
