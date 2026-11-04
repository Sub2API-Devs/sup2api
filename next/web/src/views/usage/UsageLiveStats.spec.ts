import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { i18n } from '@/i18n'
import UsageLiveStats from './UsageLiveStats.vue'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: { get } }))
enableAutoUnmount(afterEach)

const summary = { total_cost: '12.5', standard_cost: '25', cache_read_tokens: 75, prompt_tokens: 100 }
let realtime: unknown

function render(filters: Record<string, unknown>) {
  return mount(UsageLiveStats, {
    props: { realtimePath: '/usage/realtime', summaryPath: '/usage/summary', filters },
    global: { plugins: [i18n] }
  })
}
type Wrapper = ReturnType<typeof render>
const badge = (w: Wrapper, key: string) => w.get(`[data-testid="usage-live-${key}"]`)
const calls = (path: string) => get.mock.calls.filter((c) => c[0] === path)

describe('usage live statistics', () => {
  beforeEach(() => {
    get.mockReset()
    realtime = { rpm: 95, tpm: 12300, recent_failures: 5 }
    get.mockImplementation((path: string) => (path === '/usage/realtime' ? (realtime instanceof Error ? Promise.reject(realtime) : Promise.resolve(realtime)) : Promise.resolve([summary])))
    i18n.global.locale.value = 'zh'
  })

  it('shows the six figures', async () => {
    const w = render({ from: 'a', to: 'b' })
    await flushPromises()
    expect(w.findAll('[data-testid^="usage-live-"]').filter((x) => x.attributes('data-testid') !== 'usage-live-stats')).toHaveLength(6)
    expect(badge(w, 'cost').text()).toContain('12.50')
    expect(badge(w, 'standard').text()).toContain('25.00')
    expect(badge(w, 'rpm').text()).toContain('95')
    expect(badge(w, 'tpm').text()).toContain('12.3K')
    expect(badge(w, 'hit').text()).toContain('75.0%')
    expect(badge(w, 'success').text()).toContain('95%')
    expect(badge(w, 'success').attributes('title')).toContain('成功 95 / 失败 5')
    expect(badge(w, 'success').find('.bg-amber-500\\/70').exists()).toBe(true)
  })

  it('asks for the last minute without the time range and the status, and only reloads it when another filter changes', async () => {
    const filters = reactive<Record<string, unknown>>({ from: 'a', to: 'b', success: 'false', model_contains: '' })
    render(filters)
    await flushPromises()
    expect(calls('/usage/realtime')).toEqual([['/usage/realtime', { model_contains: '' }]])
    expect(calls('/usage/summary')[0][1]).toMatchObject({ from: 'a', to: 'b', success: 'false', group_by: 'none' })

    filters.from = 'c'
    await flushPromises()
    expect(calls('/usage/realtime')).toHaveLength(1)
    expect(calls('/usage/summary')).toHaveLength(2)

    filters.model_contains = 'opus'
    await flushPromises()
    expect(calls('/usage/realtime')).toHaveLength(2)
    expect(calls('/usage/realtime')[1][1]).toEqual({ model_contains: 'opus' })
  })

  it('reloads both on a refresh', async () => {
    const w = render({})
    await flushPromises()
    get.mockClear()
    await w.setProps({ revision: 1 })
    await nextTick()
    expect(calls('/usage/realtime')).toHaveLength(1)
    expect(calls('/usage/summary')).toHaveLength(1)
  })

  it('shows a dash, not zero, without requests or when the load fails', async () => {
    realtime = { rpm: 0, tpm: 0, recent_failures: 0 }
    const idle = render({})
    await flushPromises()
    expect(badge(idle, 'rpm').text()).toContain('0')
    expect(badge(idle, 'success').text()).toContain('—')
    expect(badge(idle, 'success').attributes('title')).toBe('近 1 分钟无请求')

    realtime = new Error('boom')
    const failed = render({})
    await flushPromises()
    expect(badge(failed, 'rpm').text()).toContain('—')
    expect(badge(failed, 'tpm').text()).toContain('—')
    expect(badge(failed, 'success').text()).toContain('—')
  })
})
