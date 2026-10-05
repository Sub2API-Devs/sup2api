import { describe, expect, it } from 'vitest'
import zh from '@/i18n/locales/zh/ccgateway'
import en from '@/i18n/locales/en/ccgateway'
import { accountSummary, commitRecovery, readPendingReauth, reauthStoreKey, rememberReauth, shouldCommit, type CcgReauthState } from './ccgReauth'

const KEY = 'd0123456789abcdef'
const OTHER = 'dfedcba9876543210'
const state = (over: Partial<CcgReauthState> = {}): CcgReauthState => ({ key: KEY, flow: { key: KEY, authorized: true }, committing: false, failedKey: null, ...over })

function memoryStore() {
  const m = new Map<string, string>()
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k)
  }
}

describe('CCGateway re-authorization', () => {
  it('commits a signed-in re-authorization draft by itself', () => {
    expect(shouldCommit(state())).toBe(true)
  })

  it('does not commit before the draft is signed in, or for another draft', () => {
    expect(shouldCommit(state({ flow: { key: KEY, authorized: false } }))).toBe(false)
    expect(shouldCommit(state({ key: null }))).toBe(false)
    // the step flow still reports the previous (or no) draft
    expect(shouldCommit(state({ flow: { key: OTHER, authorized: true } }))).toBe(false)
    expect(shouldCommit(state({ flow: { key: null, authorized: false } }))).toBe(false)
  })

  it('commits once: not while a commit runs, not again after a refusal until a retry or a fresh login', () => {
    expect(shouldCommit(state({ committing: true }))).toBe(false)
    expect(shouldCommit(state({ failedKey: KEY }))).toBe(false)
    // a refusal of an earlier draft does not hold back the new one
    expect(shouldCommit(state({ failedKey: OTHER }))).toBe(true)
  })

  it('recovers from a refused commit by its reason', () => {
    expect(commitRecovery('draft_not_found')).toBe('restart')
    expect(commitRecovery('draft_not_authorized')).toBe('recheck')
    for (const r of ['no_proxy', 'not_configured', 'sync_failed', '']) expect(commitRecovery(r), r).toBe('retry')
  })

  it('summarizes the current runtime', () => {
    expect(accountSummary('ready', true)).toEqual({ container: 'ready', login: 'authorized' })
    expect(accountSummary('ready', false)).toEqual({ container: 'ready', login: 'notAuthorized' })
    expect(accountSummary('ready', null)).toEqual({ container: 'ready', login: 'unknown' })
    expect(accountSummary('creating', true)).toEqual({ container: 'preparing', login: 'unknown' })
    expect(accountSummary('blocked', undefined)).toEqual({ container: 'blocked', login: 'unknown' })
    expect(accountSummary(undefined, undefined)).toEqual({ container: 'unknown', login: 'unknown' })
  })

  it('remembers the open draft per account and only valid keys', () => {
    const s = memoryStore()
    expect(readPendingReauth(s, 25)).toBeNull()
    rememberReauth(s, 25, KEY)
    expect(readPendingReauth(s, 25)).toBe(KEY)
    expect(readPendingReauth(s, 26)).toBeNull()
    rememberReauth(s, 25, null)
    expect(s.m.has(reauthStoreKey(25))).toBe(false)
    // tampered values are never put into a URL
    s.setItem(reauthStoreKey(25), '../accounts/25')
    expect(readPendingReauth(s, 25)).toBeNull()
    rememberReauth(s, 25, 'not-a-key')
    expect(s.m.has(reauthStoreKey(25))).toBe(false)
    // no storage, or a throwing one
    expect(readPendingReauth(null, 25)).toBeNull()
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') }, removeItem: () => { throw new Error('denied') } }
    expect(readPendingReauth(broken, 25)).toBeNull()
    expect(() => rememberReauth(broken, 25, KEY)).not.toThrow()
  })

  it('translates the re-authorization texts and the reauth block fixes in zh and en', () => {
    for (const loc of [zh, en] as unknown as Array<{ reauth: Record<string, unknown>; accountAuth: { blocked: { fixReauth: Record<string, string> } } }>) {
      for (const k of ['hint', 'hintLoggedOut', 'confirmTitle', 'confirmMessage', 'confirmButton', 'startFailed', 'flowTitle', 'inProgress', 'cancel', 'signedIn', 'committing', 'commitFailed', 'commitRetry', 'done']) expect(loc.reauth[k], k).toBeTruthy()
      for (const r of ['no_proxy', 'proxy_disabled', 'account_disabled', 'unknown']) expect(loc.accountAuth.blocked.fixReauth[r], r).toBeTruthy()
    }
    expect(Object.keys(zh.reauth).sort()).toEqual(Object.keys(en.reauth).sort())
  })
})
