import { describe, expect, it } from 'vitest'
import schema from '../../../forms/settings.schema.json'
import { lockActions, lockedSettings, userListOf } from './userLock'

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
})

describe('lockedSettings', () => {
  const stored = { mode: 'observe', notify_webhook_secret: '******', blocklist_user_ids: ['8'], allowlist_user_ids: ['7'] }

  it('puts the user on one list and off the other, the rest as stored', () => {
    expect(lockedSettings(schema, stored, 9, 'blocklist')).toEqual({ ...stored, blocklist_user_ids: ['8', '9'], exempt_user_ids: ['7'] })
    // moved from the blocklist: the retired key (older nodes) gets the allowlist without the blocklisted users
    expect(lockedSettings(schema, stored, 8, 'allowlist')).toEqual({ ...stored, blocklist_user_ids: [], allowlist_user_ids: ['7', '8'], exempt_user_ids: ['7', '8'] })
    expect(lockedSettings(schema, stored, 7, 'blocklist')).toEqual({ ...stored, blocklist_user_ids: ['8', '7'], allowlist_user_ids: [], exempt_user_ids: [] })
  })

  it('stores an emptied list as [] and changes nothing for a user already there', () => {
    expect(lockedSettings(schema, stored, 7, null)).toEqual({ ...stored, allowlist_user_ids: [], exempt_user_ids: [] })
    expect(lockedSettings(schema, stored, 8, null)).toEqual({ ...stored, blocklist_user_ids: [], exempt_user_ids: ['7'] })
    expect(lockedSettings(schema, stored, 7, 'allowlist')).toBeNull()
    expect(lockedSettings(schema, stored, 5, null)).toBeNull()
    // ids compare as text (a list stored as numbers)
    expect(lockedSettings(schema, { blocklist_user_ids: [8] }, 8, 'blocklist')).toBeNull()
  })

  // settings.go DecodeSettings: the retired exempt_user_ids is the allowlist until allowlist_user_ids is stored.
  it('starts from the retired allowlist of settings saved before 0.8.0', () => {
    const old = { mode: 'observe', exempt_user_ids: ['5', '9'] }
    expect(lockedSettings(schema, old, 12, 'allowlist')).toEqual({ ...old, allowlist_user_ids: ['5', '9', '12'], exempt_user_ids: ['5', '9', '12'] })
    // blocklisted: the allowlist is stored without the user, so the retired list is not read again
    expect(lockedSettings(schema, old, 9, 'blocklist')).toEqual({ ...old, blocklist_user_ids: ['9'], allowlist_user_ids: ['5'], exempt_user_ids: ['5'] })
    expect(lockedSettings(schema, old, 5, null)).toEqual({ ...old, allowlist_user_ids: ['9'], exempt_user_ids: ['9'] })
    // a blocklist alone leaves the retired list alone
    expect(lockedSettings(schema, old, 3, 'blocklist')).toEqual({ ...old, blocklist_user_ids: ['3'] })
  })
})
