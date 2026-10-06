import { describe, expect, it } from 'vitest'
import { defaultRequestPolicy, validRequestPolicy } from './requestPolicy'

describe('CCGateway request policy', () => {
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
})
