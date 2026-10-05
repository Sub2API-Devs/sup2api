import { describe, expect, it } from 'vitest'
import zh from '@/i18n/locales/zh/ccgateway'
import en from '@/i18n/locales/en/ccgateway'
import {
  CCG_REASONS,
  CCG_STATUSES,
  blockReason,
  containerPhase,
  currentStep,
  isDraftKey,
  knownReason,
  knownStatus,
  looksLikeAuthCode,
  readyToSave,
  reasonDisplay,
  reasonOf,
  secondsLeft,
  sessionEnded,
  setupProblems,
  stepStates,
  stepsOf,
  type CcgFlow
} from './ccgAuthFlow'

const flow = (over: Partial<CcgFlow> = {}): CcgFlow => ({ mode: 'account', proxy: true, created: true, container: 'ready', loggedIn: false, hasSession: false, opened: false, ...over })
const draft = (over: Partial<CcgFlow> = {}): CcgFlow => flow({ mode: 'draft', ...over })

describe('CCGateway authorization flow', () => {
  it('maps container statuses to phases', () => {
    expect(containerPhase(undefined)).toBe('unknown')
    expect(containerPhase('ready')).toBe('ready')
    expect(containerPhase('creating')).toBe('preparing')
    expect(containerPhase('pending')).toBe('preparing')
    expect(containerPhase('error')).toBe('error')
    expect(containerPhase('blocked')).toBe('blocked')
  })

  it('names the block reasons it knows', () => {
    expect(blockReason('no_proxy')).toBe('no_proxy')
    expect(blockReason('proxy_disabled')).toBe('proxy_disabled')
    expect(blockReason('account_disabled')).toBe('account_disabled')
    expect(blockReason('sync_failed')).toBe('unknown')
    expect(blockReason(undefined)).toBe('unknown')
  })

  it('has a step list per target', () => {
    expect(stepsOf('draft')).toEqual(['proxy', 'container', 'login', 'code', 'done'])
    expect(stepsOf('account')).toEqual(['container', 'login', 'code', 'done'])
  })

  it('walks a new account: proxy → container → login → code → done', () => {
    expect(currentStep(draft({ proxy: false, created: false, container: 'unknown', loggedIn: null }))).toBe('proxy')
    // a proxy is picked, no draft yet: start the container
    expect(currentStep(draft({ created: false, container: 'unknown', loggedIn: null }))).toBe('container')
    expect(currentStep(draft({ container: 'preparing', loggedIn: null }))).toBe('container')
    expect(currentStep(draft())).toBe('login')
    expect(currentStep(draft({ hasSession: true, opened: true }))).toBe('code')
    expect(currentStep(draft({ loggedIn: true }))).toBe('done')
    // the proxy was cleared after the draft existed: back to ①
    expect(currentStep(draft({ proxy: false, loggedIn: true }))).toBe('proxy')
  })

  it('walks a saved account: container → login → code → done', () => {
    expect(currentStep(flow({ container: 'preparing', loggedIn: null }))).toBe('container')
    expect(currentStep(flow({ container: 'unknown', loggedIn: null }))).toBe('container')
    expect(currentStep(flow())).toBe('login')
    expect(currentStep(flow({ hasSession: true }))).toBe('login')
    expect(currentStep(flow({ hasSession: true, opened: true }))).toBe('code')
    expect(currentStep(flow({ loggedIn: true }))).toBe('done')
    // re-authorizing an authorized account goes through the link again
    expect(currentStep(flow({ loggedIn: true, hasSession: true }))).toBe('login')
  })

  it('a blocked container is an error of the container step', () => {
    expect(currentStep(flow({ container: 'blocked', loggedIn: null }))).toBe('container')
    expect(stepStates(flow({ container: 'blocked', loggedIn: null })).container).toBe('error')
  })

  it('marks earlier steps done, the current one current or error, later ones todo', () => {
    expect(stepStates(draft({ hasSession: true, opened: true }))).toEqual({ proxy: 'done', container: 'done', login: 'done', code: 'current', done: 'todo' })
    expect(stepStates(draft({ proxy: false, created: false, container: 'unknown', loggedIn: null }))).toEqual({ proxy: 'current', container: 'todo', login: 'todo', code: 'todo', done: 'todo' })
    expect(stepStates(draft({ created: false, container: 'unknown', loggedIn: null })).container).toBe('current')
    // a failed draft creation (no runtime yet) is an error of the container step
    expect(stepStates(draft({ created: false, container: 'error', loggedIn: null, errorStep: 'container' })).container).toBe('error')
    expect(stepStates(flow({ container: 'error', loggedIn: null }))).toEqual({ proxy: 'done', container: 'error', login: 'todo', code: 'todo', done: 'todo' })
    expect(stepStates(flow({ errorStep: 'login' })).login).toBe('error')
    expect(stepStates(flow({ loggedIn: true }))).toEqual({ proxy: 'done', container: 'done', login: 'done', code: 'done', done: 'done' })
  })

  it('lets a new account be saved only once its draft is signed in', () => {
    expect(readyToSave(draft({ loggedIn: true }))).toBe(true)
    expect(readyToSave(draft())).toBe(false)
    expect(readyToSave(draft({ loggedIn: null, container: 'preparing' }))).toBe(false)
    expect(readyToSave(draft({ loggedIn: true, created: false }))).toBe(false)
    expect(readyToSave(draft({ loggedIn: true, proxy: false }))).toBe(false)
    // a re-authorization in progress
    expect(readyToSave(draft({ loggedIn: true, hasSession: true }))).toBe(false)
    // saved accounts are not saved through this
    expect(readyToSave(flow({ loggedIn: true }))).toBe(false)
  })

  it('accepts only draft keys', () => {
    expect(isDraftKey('d0123456789abcdef')).toBe(true)
    expect(isDraftKey('d0123456789ABCDEF')).toBe(false)
    expect(isDraftKey('d0123')).toBe(false)
    expect(isDraftKey('42')).toBe(false)
    expect(isDraftKey('d0123456789abcdef/../x')).toBe(false)
    expect(isDraftKey(undefined)).toBe(false)
  })

  it('reads reason codes and picks what to show', () => {
    const err = (reason?: unknown, message = 'English sentence') => ({ message, details: reason === undefined ? {} : { reason } })
    expect(reasonOf(err('invalid_code'))).toBe('invalid_code')
    expect(reasonOf(err(42))).toBe('')
    expect(reasonOf(null)).toBe('')
    expect(reasonOf(new Error('x'))).toBe('')
    expect(reasonDisplay(err('auth_rejected'))).toEqual({ key: 'ccgateway.reason.auth_rejected' })
    // an unknown code shows the API's English message
    expect(reasonDisplay(err('brand_new_code', 'Something new happened'))).toEqual({ message: 'Something new happened' })
    expect(reasonDisplay(err('brand_new_code', ''))).toEqual({ message: 'brand_new_code' })
    expect(reasonDisplay(err())).toBeNull()
    expect(knownReason('draft_not_found')).toBe('draft_not_found')
    expect(knownReason('nope')).toBeNull()
    expect(knownStatus('pending')).toBe('pending')
    expect(knownStatus('weird')).toBeNull()
  })

  it('knows which errors end the login session', () => {
    for (const r of ['session_not_found', 'auth_rejected', 'auth_process_failed', 'invalid_auth_url']) expect(sessionEnded(r), r).toBe(true)
    for (const r of ['invalid_code', 'invalid_request', 'status_unavailable', '']) expect(sessionEnded(r), r).toBe(false)
  })

  it('translates every reason and status code in zh and en', () => {
    for (const loc of [zh, en] as Array<{ reason: Record<string, string>; status: Record<string, string> }>) {
      for (const c of CCG_REASONS) expect(loc.reason[c], c).toBeTruthy()
      for (const s of CCG_STATUSES) expect(loc.status[s], s).toBeTruthy()
      expect(loc.status.unknown).toBeTruthy()
    }
  })

  it('lists the setup problems of the remote config', () => {
    expect(setupProblems(null)).toEqual([])
    expect(setupProblems({ account_runtimes: true, mode: 'ssh', has_admin_key: true })).toEqual([])
    expect(setupProblems({ account_runtimes: true, mode: 'local', has_admin_key: true })).toEqual([])
    expect(setupProblems({ account_runtimes: false, mode: 'disabled', has_admin_key: false })).toEqual(['runtimes', 'docker', 'adminKey'])
  })

  it('counts down the session and checks the code shape', () => {
    expect(secondsLeft('2026-01-01T00:01:00Z', Date.parse('2026-01-01T00:00:00Z'))).toBe(60)
    expect(secondsLeft('2026-01-01T00:00:00Z', Date.parse('2026-01-01T00:01:00Z'))).toBe(0)
    expect(secondsLeft('garbage')).toBe(0)
    expect(looksLikeAuthCode('abc#def')).toBe(true)
    expect(looksLikeAuthCode('  abc#def  ')).toBe(true)
    expect(looksLikeAuthCode('abcdef')).toBe(false)
    expect(looksLikeAuthCode('#def')).toBe(false)
    expect(looksLikeAuthCode('abc#')).toBe(false)
    expect(looksLikeAuthCode('ab c#def')).toBe(false)
  })
})
