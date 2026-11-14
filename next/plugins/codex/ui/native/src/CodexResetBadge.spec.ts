import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { MAX_ACCOUNT_BATCH, type PluginHost } from '@sub2api/host'
import CodexResetBadge from './CodexResetBadge.vue'
import { setHost } from './host'
import { requestResetCount, resetCount } from './resetCount'

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
    permissions: { hasAction: () => true },
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
    await wrapper.get('[data-testid="codex-reset-badge"] button').trigger('click')
    await flushPromises()
    expect(document.body.querySelector('[data-testid="codex-reset-tab"]')).not.toBeNull()
    expect(calls.at(-1)).toEqual({ path: '/reset-credits/list', body: { account_id: 7 } })
  })

  it('splits a tick of more than MAX_ACCOUNT_BATCH ids into several requests, and keeps the counts when one fails', async () => {
    calls = []
    const ids = Array.from({ length: MAX_ACCOUNT_BATCH + 1 }, (_, i) => 1000 + i)
    setHost(fakeHost({ '1000': { available_count: 3, updated_at: 1 } }))
    ids.forEach(requestResetCount)
    await flushPromises()
    expect(calls.map((c) => c.body.account_ids.length)).toEqual([MAX_ACCOUNT_BATCH, 1])
    expect(resetCount(1000)).toBe(3)
    const failing = fakeHost({})
    vi.mocked(failing.pluginApi.post).mockRejectedValue(new Error('down'))
    setHost(failing)
    requestResetCount(1000)
    await flushPromises()
    expect(resetCount(1000)).toBe(3)
  })
})
