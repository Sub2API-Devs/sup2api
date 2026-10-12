import { describe, expect, it } from 'vitest'
import { defaultRequestPolicy, normalizeRequestPolicy, validRequestPolicy, type RequestPolicy } from './requestPolicy'

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
  it('defaults to native without account rollout lists', () => {
    const p = defaultRequestPolicy()
    expect(p.relay_mode).toBe('native')
    expect(p).not.toHaveProperty('relay_native_accounts')
    expect(p).not.toHaveProperty('relay_passthrough_accounts')
    expect(p).not.toHaveProperty('pass_upstream_errors')
    expect(validRequestPolicy(p)).toBe(true)
  })
  it.each(['legacy', 'passthrough', '', undefined])('rejects an unnormalized relay mode %s', relay_mode => {
    const policy = { ...defaultRequestPolicy(), relay_mode } as unknown as RequestPolicy
    expect(validRequestPolicy(policy)).toBe(false)
  })
  it.each(['legacy', 'passthrough', 'native', '', undefined])('normalizes historical mode %s to native and drops obsolete lists without mutating input', relay_mode => {
    const historical = {
      relay_mode, relay_native_accounts: [24], relay_passthrough_accounts: [23],
      custom_tool_prefix: 'mytools', pass_upstream_errors: true
    }
    const policy = normalizeRequestPolicy(historical)
    expect(policy).toEqual({ ...defaultRequestPolicy(), custom_tool_prefix: 'mytools' })
    expect(policy).not.toHaveProperty('pass_upstream_errors')
    expect(policy.relay_mode).toBe('native')
    expect(policy).not.toHaveProperty('relay_native_accounts')
    expect(policy).not.toHaveProperty('relay_passthrough_accounts')
    expect(validRequestPolicy(policy)).toBe(true)
    expect(normalizeRequestPolicy(policy)).toEqual(policy)
    expect(historical).toEqual({
      relay_mode, relay_native_accounts: [24], relay_passthrough_accounts: [23],
      custom_tool_prefix: 'mytools', pass_upstream_errors: true
    })
  })
  it('drops legacy attachment and beta settings from defaults and normalized editor state', () => {
    const obsolete = {
      attachment_source: 'gateway' as const,
      attachment_sources: { environment: 'both' as const, date: 'gateway' as const },
      environment_fields: { platform: 'gateway' as const, workingDirectory: 'client' as const },
      unknown_client_attachment: 'ignore' as const,
      unknown_gateway_attachment: 'pass' as const,
      unknown_beta: 'reject' as const
    }
    const historical = { ...defaultRequestPolicy(), ...obsolete, tool_search: 'auto:0', unknown_field: 'ignore' as const }
    const before = structuredClone(historical)
    const policy = normalizeRequestPolicy(historical)
    for (const key of Object.keys(obsolete)) {
      expect(defaultRequestPolicy()).not.toHaveProperty(key)
      expect(policy).not.toHaveProperty(key)
    }
    expect(policy).toEqual({ ...defaultRequestPolicy(), tool_search: 'auto:0', unknown_field: 'ignore' })
    expect(normalizeRequestPolicy(JSON.parse(JSON.stringify(policy)))).toEqual(policy)
    expect(historical).toEqual(before)
    expect(validRequestPolicy(policy)).toBe(true)
  })
  it('validates the active unknown-field and tool-namespace policies', () => {
    expect(validRequestPolicy({ ...defaultRequestPolicy(), unknown_field: 'reject', custom_tool_prefix: 'my-tools_1' })).toBe(true)
    expect(validRequestPolicy({ ...defaultRequestPolicy(), custom_tool_prefix: 'my__tools' })).toBe(false)
    expect(validRequestPolicy({ ...defaultRequestPolicy(), unknown_field: 'pass' } as unknown as RequestPolicy)).toBe(false)
  })
  it('normalizes missing policy to native defaults', () => {
    expect(normalizeRequestPolicy()).toEqual(defaultRequestPolicy())
    expect(normalizeRequestPolicy({})).toEqual(defaultRequestPolicy())
  })
  it('preserves supported policy overrides when normalizing', () => {
    const saved: RequestPolicy = {
      ...defaultRequestPolicy(), schema_version: 1, allow_fast: false, allow_effort: false,
      tool_search: 'auto:0', thinking_disabled_compat: 'omit', betas: []
    }
    expect(normalizeRequestPolicy(saved)).toEqual(saved)
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
