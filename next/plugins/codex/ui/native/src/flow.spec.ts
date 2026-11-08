import { describe, expect, it } from 'vitest'
import { callbackShape, CODEX_FIELDS, DEFAULT_POLL_MS, flowsFor, formatCountdown, hasAccessToken, mergeCredentials, MIN_POLL_SECONDS, pollDelay, summarize, typeOf } from './flow'

describe('flowsFor / typeOf', () => {
  it('shows only the flow of a known type, both otherwise', () => {
    expect(flowsFor('codex_device')).toEqual(['device'])
    expect(flowsFor('chatgpt_siwc')).toEqual(['siwc'])
    expect(flowsFor('')).toEqual(['device', 'siwc'])
    expect(flowsFor(undefined)).toEqual(['device', 'siwc'])
    expect(flowsFor('other')).toEqual(['device', 'siwc'])
  })

  it('prefers the editor account type over the account', () => {
    expect(typeOf({ type: 'chatgpt_siwc' }, { type: 'codex_device' })).toBe('chatgpt_siwc')
    expect(typeOf(null, { type: 'codex_device' })).toBe('codex_device')
    expect(typeOf(undefined, null)).toBe('')
  })
})

describe('mergeCredentials', () => {
  it('replaces every flow field and keeps the others', () => {
    const current = { access_token: '******', refresh_token: '******', id_token: '******', plan_type: 'plus', chatgpt_account_id: 'acc', proxy_id: 3 }
    const out = mergeCredentials(current, { access_token: 'at', refresh_token: 'rt', expires_at: 100, email: 'a@b.c', client_id: 'cid', ext_agent_host_id: 'urn:uuid:x' })
    expect(out).toEqual({ proxy_id: 3, access_token: 'at', refresh_token: 'rt', expires_at: 100, email: 'a@b.c', client_id: 'cid', ext_agent_host_id: 'urn:uuid:x' })
    // A masked id_token must not survive a login that did not return one.
    expect(out).not.toHaveProperty('id_token')
    expect(current.access_token).toBe('******')
  })

  it('starts from nothing when creating', () => {
    expect(mergeCredentials(undefined, { access_token: 'a', refresh_token: 'r' })).toEqual({ access_token: 'a', refresh_token: 'r' })
  })

  it('covers the documented credential fields', () => {
    expect([...CODEX_FIELDS].sort()).toEqual(['access_token', 'chatgpt_account_id', 'client_id', 'email', 'expires_at', 'ext_agent_host_id', 'id_token', 'plan_type', 'refresh_token', 'scopes'])
  })
})

describe('hasAccessToken', () => {
  it('counts a real or masked token', () => {
    expect(hasAccessToken({ access_token: 'x' })).toBe(true)
    expect(hasAccessToken({ access_token: '******' })).toBe(true)
    expect(hasAccessToken({ access_token: '  ' })).toBe(false)
    expect(hasAccessToken({})).toBe(false)
    expect(hasAccessToken(null)).toBe(false)
  })
})

describe('summarize', () => {
  it('reads email, plan, expiry (seconds → ms) and ids', () => {
    expect(summarize({ email: ' a@b.c ', plan_type: 'pro', expires_at: 1700000000, chatgpt_account_id: 'acc', client_id: 'cid' })).toEqual({
      email: 'a@b.c',
      plan: 'pro',
      expiresAt: 1700000000000,
      accountId: 'acc',
      clientId: 'cid'
    })
    expect(summarize({ expires_at: 'soon' }).expiresAt).toBeNull()
    expect(summarize(undefined)).toEqual({ email: '', plan: '', expiresAt: null, accountId: '', clientId: '' })
  })
})

describe('formatCountdown', () => {
  it('formats m:ss and h:mm:ss', () => {
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(-5)).toBe('0:00')
    expect(formatCountdown(65)).toBe('1:05')
    expect(formatCountdown(900)).toBe('15:00')
    expect(formatCountdown(3725)).toBe('1:02:05')
  })
})

describe('callbackShape', () => {
  it('classifies the pasted callback address', () => {
    expect(callbackShape('')).toBe('empty')
    expect(callbackShape('  ')).toBe('empty')
    expect(callbackShape(' "" ')).toBe('empty')
    expect(callbackShape('http://127.0.0.1:1455/auth/callback?error=access_denied&state=s')).toBe('denied')
    expect(callbackShape('http://127.0.0.1:1455/auth/callback?state=s')).toBe('no_code')
    expect(callbackShape('http://127.0.0.1:1455/auth/callback')).toBe('no_code')
    expect(callbackShape('hello world')).toBe('no_code')
    expect(callbackShape(' http://127.0.0.1:1455/auth/callback?code=abc&state=s ')).toBe('ok')
  })

  it('accepts what the plugin parseCallback accepts', () => {
    expect(callbackShape('code=abc&state=s')).toBe('ok')
    expect(callbackShape('?code=abc&state=s')).toBe('ok')
    expect(callbackShape('127.0.0.1:1455/auth/callback?state=s&code=a%2Fb')).toBe('ok')
    expect(callbackShape('  "http://localhost:1455/auth/callback?code=abc&amp;state=s"\n')).toBe('ok')
    expect(callbackShape('<http://127.0.0.1:1455/auth/callback?error=access_denied&state=s>')).toBe('denied')
    expect(callbackShape('http://127.0.0.1:1455/auth/callback#code=abc&state=s')).toBe('ok')
    expect(callbackShape('http://127.0.0.1:1455/auth/callback?code=abc#frag')).toBe('ok')
    expect(callbackShape('ftp://127.0.0.1/x?code=1')).toBe('ok')
  })

  it('flags what the plugin cannot read', () => {
    expect(callbackShape('%zz=1')).toBe('invalid')
    expect(callbackShape('http://127.0.0.1:1455/auth/callback?code=a%2&state=s')).toBe('invalid')
    expect(callbackShape('code=abc;state=s')).toBe('invalid')
  })
})

describe('pollDelay', () => {
  it('uses the interval with a floor and a default', () => {
    expect(pollDelay(5)).toBe(5000)
    expect(pollDelay('8')).toBe(8000)
    expect(pollDelay(1)).toBe(MIN_POLL_SECONDS * 1000)
    expect(pollDelay(0)).toBe(DEFAULT_POLL_MS)
    expect(pollDelay('x')).toBe(DEFAULT_POLL_MS)
    expect(pollDelay(undefined)).toBe(DEFAULT_POLL_MS)
  })
})
