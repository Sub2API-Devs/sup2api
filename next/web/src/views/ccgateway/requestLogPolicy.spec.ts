import { describe, expect, it } from 'vitest'
import { activeSetting, countOverrides, effectiveAt, policyOf } from './requestLogPolicy'

const NOW = Date.parse('2026-10-26T12:00:00Z')
const answer = (over: Record<string, unknown> = {}) => ({ setting: { level: 'follow', full_until: null }, default: 'summary', effective: 'summary', worker: null, ...over })
const full = (until: string) => policyOf(answer({ setting: { level: 'full', full_until: until }, effective: 'full' }))!

describe('request log policy of the core', () => {
  it('reads an older core answer (the Worker state) as no policy', () => {
    expect(policyOf({ enabled: true, level: 'summary', levels: ['off', 'summary', 'full'] })).toBeNull()
    expect(() => policyOf(null)).toThrow()
    expect(() => policyOf([])).toThrow()
  })

  it('reads the setting, default, effective level and Worker state', () => {
    const p = policyOf(answer({ worker: { usage: { requests: 4, summary_bytes: -1 }, limits: { summary: { retention_hours: 1, storage_budget_bytes: 2, per_request_limit_bytes: 3 } }, viewer: true } }))!
    expect(p).toMatchObject({ setting: 'follow', fullUntil: null, default: 'summary', effective: 'summary' })
    expect(p.worker).toMatchObject({ usage: { requests: 4, summary_bytes: null, full_bytes: null }, summary: { retention_hours: 1 }, full: null, viewer: true, viewerSearch: false })
    expect(policyOf(answer({ worker: undefined }))!.worker).toBeNull()
  })

  it('needs an expiry for full and known values elsewhere', () => {
    for (const bad of [
      answer({ setting: { level: 'full', full_until: null } }),
      answer({ setting: { level: 'full' } }),
      answer({ setting: { level: 'debug' } }),
      answer({ setting: 'summary' }),
      answer({ default: 'follow' }),
      answer({ default: 'debug' }),
      answer({ default: undefined }),
      answer({ effective: 'follow' }),
      answer({ worker: 3 }),
    ]) expect(() => policyOf(bad), JSON.stringify(bad)).toThrow()
  })

  it('treats a full setting past its end as following the default', () => {
    const active = full('2026-10-26T13:00:00Z')
    const expired = full('2026-10-26T11:59:00Z')
    expect(activeSetting(active, NOW)).toBe('full')
    expect(effectiveAt(active, NOW)).toBe('full')
    expect(activeSetting(expired, NOW)).toBe('follow')
    expect(effectiveAt(expired, NOW)).toBe('summary')
    expect(effectiveAt(policyOf(answer({ default: 'off', effective: 'off' }))!, NOW)).toBe('off')
  })

  it('reads a full default, which has no end (REQUEST-LOG-ASYNC-DESIGN.md §6)', () => {
    const p = policyOf(answer({ default: 'full', effective: 'full' }))!
    expect(p).toMatchObject({ setting: 'follow', fullUntil: null, default: 'full', effective: 'full' })
    expect(activeSetting(p, NOW)).toBe('follow')
    expect(effectiveAt(p, NOW)).toBe('full')
    // An account's own full level still ends, then follows the full default.
    const expired = policyOf(answer({ setting: { level: 'full', full_until: '2026-10-26T11:59:00Z' }, default: 'full', effective: 'full' }))!
    expect(activeSetting(expired, NOW)).toBe('follow')
    expect(effectiveAt(expired, NOW)).toBe('full')
  })

  it('counts the accounts with their own setting, unknown without a current core', () => {
    const off = policyOf(answer({ setting: { level: 'off', full_until: null }, effective: 'off' }))
    const follow = policyOf(answer())
    expect(countOverrides([], NOW)).toBeNull()
    expect(countOverrides([null, null], NOW)).toBeNull()
    expect(countOverrides([off, follow, null, full('2026-10-26T13:00:00Z'), full('2026-10-26T11:00:00Z')], NOW)).toBe(2)
  })
})
