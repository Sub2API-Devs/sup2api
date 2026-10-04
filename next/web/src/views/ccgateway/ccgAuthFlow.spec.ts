import { describe, expect, it } from 'vitest'
import { blockReason, containerPhase, currentStep, looksLikeAuthCode, secondsLeft, setupProblems, stepStates, type CcgFlow } from './ccgAuthFlow'

const flow = (over: Partial<CcgFlow> = {}): CcgFlow => ({ saved: true, container: 'ready', loggedIn: false, hasSession: false, opened: false, ...over })

describe('CCGateway account authorization flow', () => {
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
    expect(blockReason('')).toBe('unknown')
    expect(blockReason(undefined)).toBe('unknown')
  })

  it('a blocked container is an error of the container step', () => {
    expect(currentStep(flow({ container: 'blocked', loggedIn: null }))).toBe('container')
    expect(stepStates(flow({ container: 'blocked', loggedIn: null })).container).toBe('error')
  })

  it('walks save → container → login → code → done', () => {
    expect(currentStep(flow({ saved: false }))).toBe('save')
    expect(currentStep(flow({ container: 'preparing', loggedIn: null }))).toBe('container')
    expect(currentStep(flow({ container: 'unknown', loggedIn: null }))).toBe('container')
    expect(currentStep(flow())).toBe('login')
    expect(currentStep(flow({ hasSession: true }))).toBe('login')
    expect(currentStep(flow({ hasSession: true, opened: true }))).toBe('code')
    expect(currentStep(flow({ loggedIn: true }))).toBe('done')
    // re-authorizing an authorized account goes through the link again
    expect(currentStep(flow({ loggedIn: true, hasSession: true }))).toBe('login')
  })

  it('marks earlier steps done, the current one current or error, later ones todo', () => {
    expect(stepStates(flow({ hasSession: true, opened: true }))).toEqual({ save: 'done', container: 'done', login: 'done', code: 'current', done: 'todo' })
    expect(stepStates(flow({ container: 'error', loggedIn: null }))).toEqual({ save: 'done', container: 'error', login: 'todo', code: 'todo', done: 'todo' })
    expect(stepStates(flow({ errorStep: 'login' })).login).toBe('error')
    expect(stepStates(flow({ loggedIn: true }))).toEqual({ save: 'done', container: 'done', login: 'done', code: 'done', done: 'done' })
    expect(stepStates(flow({ saved: false })).save).toBe('current')
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
