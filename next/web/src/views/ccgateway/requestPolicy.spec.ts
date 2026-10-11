import { describe, expect, it } from 'vitest'
import { defaultRequestPolicy, validRequestPolicy } from './requestPolicy'

describe('CCGateway request policy', () => {
  it('accepts every canonical tool search threshold including zero and rejects malformed ranges', () => {
    for (let threshold = 0; threshold <= 100; threshold++) {
      expect(validRequestPolicy({ ...defaultRequestPolicy(), tool_search: `auto:${threshold}` })).toBe(true)
    }
    for (const mode of ['auto:-1', 'auto:101', 'auto:1.5', 'auto:+1', 'auto:01', 'auto: 1', 'auto:', 'auto:999999999999999999999']) {
      expect(validRequestPolicy({ ...defaultRequestPolicy(), tool_search: mode })).toBe(false)
    }
  })
  it('validates tool-search modes and ignores legacy beta rules', () => {
    const p = defaultRequestPolicy()
    expect(p.tool_search).toBe('request')
    expect(validRequestPolicy(p)).toBe(true)
    p.tool_search = 'auto:100'
    expect(validRequestPolicy(p)).toBe(true)
    p.tool_search = 'auto:101'
    expect(validRequestPolicy(p)).toBe(false)
    p.tool_search = 'request'
    p.betas = [{ name: 'custom-beta', mapping: 'tool_search' }]
    expect(validRequestPolicy(p)).toBe(true)
  })
  it('validates native rollout IDs, limits and conflicts without changing the legacy default', () => {
    const p = defaultRequestPolicy()
    expect(p.relay_mode).toBe('legacy')
    expect(p.relay_native_accounts).toEqual([])
    expect(validRequestPolicy({ ...p, relay_mode: 'native' })).toBe(true)
    expect(validRequestPolicy({ ...p, relay_native_accounts: [24], relay_passthrough_accounts: [23] })).toBe(true)
    expect(validRequestPolicy({ ...p, relay_native_accounts: [24], relay_passthrough_accounts: [24] })).toBe(false)
    for (const field of ['relay_native_accounts', 'relay_passthrough_accounts'] as const) {
      for (const ids of [[0], [-1], [1.5], [24, 24], [NaN], [Number.MAX_SAFE_INTEGER + 1], Array.from({ length: 1001 }, (_, i) => i + 1)]) {
        expect(validRequestPolicy({ ...p, [field]: ids })).toBe(false)
      }
      expect(validRequestPolicy({ ...p, [field]: Array.from({ length: 1000 }, (_, i) => i + 1) })).toBe(true)
    }
  })
  it('allows an explicitly empty beta whitelist', () => {
    const p = defaultRequestPolicy()
    p.betas = []
    expect(validRequestPolicy(p)).toBe(true)
  })
  it('does not use legacy editable beta rules', () => {
    const p = defaultRequestPolicy()
    p.betas.push({ name: p.betas[0]!.name, mapping: 'forward' })
    expect(validRequestPolicy(p)).toBe(true)
    p.betas = [{ name: 'custom-beta', mapping: 'fast' }]
    expect(validRequestPolicy(p)).toBe(true)
  })
  it('does not share mutable defaults between editors', () => {
    const first = defaultRequestPolicy()
    first.betas.splice(0)
    expect(defaultRequestPolicy().betas.length).toBeGreaterThan(0)
  })
  it('allows fast mode and effort by default: the official API supports them', () => {
    const p = defaultRequestPolicy()
    expect(p.allow_fast).toBe(true)
    expect(p.allow_effort).toBe(true)
  })
})
