import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'

const perms = vi.hoisted(() => ({ held: new Set<string>() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (k: string) => perms.held.has(k) }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
enableAutoUnmount(afterEach)

import PluginIframe from './PluginIframe.vue'

/** Sends a bridge request from the frame and returns the console's response. */
async function ask(method: string, params: unknown) {
  const w = mount(PluginIframe, { props: { pluginKey: 'guard', src: 'about:blank' }, attachTo: document.body, global: { plugins: [i18n, createPinia()] } })
  const win = (w.get('iframe').element as HTMLIFrameElement).contentWindow!
  const sent = vi.spyOn(win, 'postMessage').mockImplementation(() => undefined)
  window.dispatchEvent(new MessageEvent('message', { data: { s2a: 1, kind: 'request', id: 'r1', method, params }, origin: 'null', source: win }))
  await flushPromises()
  return sent.mock.calls.map((c) => c[0] as { kind: string; id: string; result?: any; error?: any }).find((m) => m.kind === 'response' && m.id === 'r1')!
}

describe('PluginIframe permissions.check (T83)', () => {
  it('answers for this plugin’s local keys only', async () => {
    perms.held = new Set(['plugin.guard:stats:read', 'user:read', 'plugin.other:stats:read'])
    const r = await ask('permissions.check', { keys: ['stats:read', 'rules:write', 'user:read', 'plugin.guard:stats:read', 'plugin.other:stats:read', ''] })
    expect(r.result).toEqual({
      'stats:read': true,
      'rules:write': false,
      // A core key is read as a local key of this plugin, never as the core one.
      'user:read': false,
      'plugin.guard:stats:read': false,
      'plugin.other:stats:read': false,
      '': false
    })
  })

  it('refuses more than 50 keys or no array', async () => {
    expect((await ask('permissions.check', { keys: Array.from({ length: 51 }, (_, i) => `k${i}:read`) })).error.code).toBe('invalid_argument')
    expect((await ask('permissions.check', { keys: 'stats:read' })).error.code).toBe('invalid_argument')
    expect((await ask('permissions.check', { keys: Array.from({ length: 50 }, (_, i) => `k${i}:read`) })).result).toBeDefined()
  })
})
