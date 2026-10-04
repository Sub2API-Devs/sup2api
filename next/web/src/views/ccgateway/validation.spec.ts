import { describe, expect, it } from 'vitest'
import { isTrustedAuthorizationURL, sessionExpired } from './validation'

// Migrated from scripts/ccgateway-test.mjs.
describe('ccgateway validation', () => {
  it('accepts only https authorization URLs on Anthropic hosts', () => {
    for (const v of ['https://claude.ai/oauth/authorize', 'https://console.anthropic.com/oauth']) {
      expect(isTrustedAuthorizationURL(v)).toBe(true)
    }
    for (const v of [
      'http://claude.ai/oauth',
      'https://claude.ai.evil.test',
      'https://user:secret@claude.ai',
      'javascript:alert(1)',
      'https://claude.ai:444/',
      ''
    ]) {
      expect(isTrustedAuthorizationURL(v), v).toBe(false)
    }
  })

  it('treats invalid or past expiry as expired', () => {
    expect(sessionExpired('invalid')).toBe(true)
    expect(sessionExpired('2020-01-01T00:00:00Z')).toBe(true)
    expect(sessionExpired('2100-01-01T00:00:00Z')).toBe(false)
  })
})
