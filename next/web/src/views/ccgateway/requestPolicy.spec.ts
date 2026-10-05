import { describe, expect, it } from 'vitest'
import { defaultRequestPolicy, validRequestPolicy } from './requestPolicy'

describe('CCGateway request policy', () => {
  it('validates tool-search modes and its exact beta mapping', () => {
    const p = defaultRequestPolicy()
    expect(p.tool_search).toBe('request')
    expect(validRequestPolicy(p)).toBe(true)
    p.tool_search = 'auto:100'
    expect(validRequestPolicy(p)).toBe(true)
    p.tool_search = 'auto:101'
    expect(validRequestPolicy(p)).toBe(false)
    p.tool_search = 'request'
    p.betas = [{ name: 'custom-beta', mapping: 'tool_search' }]
    expect(validRequestPolicy(p)).toBe(false)
  })
  it('allows an explicitly empty beta whitelist', () => {
    const p = defaultRequestPolicy(); p.betas = []
    expect(validRequestPolicy(p)).toBe(true)
  })
  it('rejects duplicate names and mappings for the wrong beta', () => {
    const p = defaultRequestPolicy()
    p.betas.push({ name: p.betas[0]!.name, mapping: 'forward' })
    expect(validRequestPolicy(p)).toBe(false)
    p.betas = [{ name: 'custom-beta', mapping: 'fast' }]
    expect(validRequestPolicy(p)).toBe(false)
  })
  it('does not share mutable defaults between editors', () => {
    const first = defaultRequestPolicy(); first.betas.splice(0)
    expect(defaultRequestPolicy().betas.length).toBeGreaterThan(0)
  })
})
