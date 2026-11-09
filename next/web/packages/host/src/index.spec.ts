import { describe, expect, it } from 'vitest'
import { createPluginHost, HOST_COMPONENT_NAMES, type HostContext } from './index'

describe('plugin host', () => {
  it('hands every plugin the core editors of the host (UI 3.7)', () => {
    const components = Object.freeze(Object.fromEntries(HOST_COMPONENT_NAMES.map((n) => [n, { name: n }]))) as HostContext['components']
    const base = { components, i18n: { t: (k: string) => k }, permissions: { has: () => true } } as unknown as HostContext
    const host = createPluginHost(base, { key: 'p', version: '1', assetBase: '/a', trust: 'official' }, () => undefined)
    expect(host.components).toBe(components)
    expect(Object.isFrozen(host.components)).toBe(true)
  })
})
