import { describe, expect, it } from 'vitest'
import { accountTypesOf, platformsOf } from './pluginUtil'

describe('plugin endpoint declarations', () => {
  it('preserves the same subset in manifests and installation reviews', () => {
    const declarations = [{ platform: 'anthropic', endpoints: ['messages'] }]
    const manifest = accountTypesOf({ accountTypes: [{ id: 'managed', platforms: declarations }] })
    const review = accountTypesOf({ account_types: [{ id: 'managed', platforms: ['anthropic'], platform_declarations: declarations }] })
    expect(manifest).toEqual(review)
    expect(manifest[0].platformDeclarations).toEqual(declarations)
  })
  it('distinguishes omitted endpoint selection from an explicit empty list', () => {
    const result = accountTypesOf({
      accountTypes: [{ id: 'key', platforms: [{ platform: 'anthropic' }, { platform: 'openai', endpoints: [] }] }]
    })
    expect(result[0].platformDeclarations).toEqual([
      { platform: 'anthropic', endpoints: undefined },
      { platform: 'openai', endpoints: [] }
    ])
  })
  it('retains platform-local endpoint IDs for resolving references', () => {
    expect(
      platformsOf({
        platforms: [{ id: 'video', endpoints: [{ id: 'generate', method: 'POST', path: '/video', protocol: 'video.generate' }] }]
      })[0].endpoints[0].id
    ).toBe('generate')
  })
})
