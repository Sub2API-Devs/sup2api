import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import type { PluginHost } from '@sub2api/host'
import CodexResetBadge from './CodexResetBadge.vue'
import { setHost } from './host'

// Three rows rendered in one tick share one POST /reset-credits/summary; a
// row without a cached count shows nothing; a click opens the details.
let calls: Array<{ path: string; body: any }>

function fakeHost(summary: Record<string, unknown>): PluginHost {
  const post = vi.fn(async (path: string, body?: any) => {
    calls.push({ path, body })
    if (path === '/reset-credits/summary') return { accounts: summary }
    return { available_count: 0, credits: [] }
  })
  return {
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
    i18n: { locale: ref('en'), formatDateTime: (v: unknown) => String(v), t: (k: string) => k, text: (v: unknown) => String(v ?? '') },
    can: () => true,
    api: { get: vi.fn() },
    pluginApi: { post }
  } as unknown as PluginHost
}

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  setHost(null)
})

const Rows = defineComponent({
  props: { ids: { type: Array as () => number[], required: true } },
  setup: (p) => () => h('div', p.ids.map((id) => h(CodexResetBadge, { key: id, account: { id, name: `a${id}` } })))
})

describe('CodexResetBadge', () => {
  it('asks once for every row of the page and shows the known counts', async () => {
    calls = []
    setHost(fakeHost({ '1': { available_count: 2, updated_at: 1 }, '2': { available_count: 0, updated_at: 1 } }))
    wrapper = mount(Rows, { props: { ids: [1, 2, 3] }, attachTo: document.body })
    await flushPromises()
    expect(calls).toEqual([{ path: '/reset-credits/summary', body: { account_ids: [1, 2, 3] } }])
    const badges = wrapper.findAll('[data-testid="codex-reset-badge"]')
    expect(badges.map((b) => b.text())).toEqual(['reset.badge:{"n":2}', 'reset.badge:{"n":0}'])
  })

  it('opens the reset details in a dialog', async () => {
    calls = []
    setHost(fakeHost({ '7': { available_count: 1, updated_at: 1 } }))
    wrapper = mount(Rows, { props: { ids: [7] }, attachTo: document.body })
    await flushPromises()
    await wrapper.get('[data-testid="codex-reset-badge"]').trigger('click')
    await flushPromises()
    expect(document.body.querySelector('[data-testid="codex-reset-tab"]')).not.toBeNull()
    expect(calls.at(-1)).toEqual({ path: '/reset-credits/list', body: { account_id: 7 } })
  })
})
