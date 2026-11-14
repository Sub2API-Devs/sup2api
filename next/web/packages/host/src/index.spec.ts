import { describe, expect, it } from 'vitest'
import { createPluginHost, HOST_COMPONENT_NAMES, pluginPermissionKey, type HostContext } from './index'

describe('plugin host', () => {
  it('hands every plugin the core components of the host (UI 3.7 editors, UI 3.11 / 3.12 entity pickers)', () => {
    const components = Object.freeze(Object.fromEntries(HOST_COMPONENT_NAMES.map(n => [n, { name: n }]))) as HostContext['components']
    const base = { components, i18n: { t: (k: string) => k }, permissions: { has: () => true } } as unknown as HostContext
    const host = createPluginHost(base, { key: 'p', version: '1', assetBase: '/a', trust: 'official' }, () => undefined)
    expect(host.components).toBe(components)
  })
})

describe('pluginPermissionKey', () => {
  it.each([
    ['orders:read', 'plugin.shop:orders:read'],
    ['plugin.shop:orders:read', 'plugin.shop:orders:read'],
    ['plugin.blog:posts:read', 'plugin.shop:plugin.blog:posts:read'],
    ['', ''],
    ['plugin.shop:', '']
  ])('qualifies %j', (local, want) => {
    expect(pluginPermissionKey('shop', local)).toBe(want)
  })

  it('backs host.can and denies an empty key', () => {
    const held = new Set(['plugin.shop:orders:read'])
    const base = { permissions: { has: (k: string) => k === '' || held.has(k) } } as unknown as HostContext
    const host = createPluginHost(base, { key: 'shop', version: '1', assetBase: '/a', trust: 'official' }, () => undefined)
    expect(host.can('orders:read')).toBe(true)
    expect(host.can('orders:write')).toBe(false)
    expect(host.can('')).toBe(false)
  })
})
