import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { i18n } from '@/i18n'
import UsageRecords from './UsageRecords.vue'

// Data sources are stubbed: what this spec checks is the page around them -
// the charts panel remembered per page, the tabs in the URL, and the failed
// requests list following the search with success=false.
const lists: Array<{ path: string; filters: Record<string, unknown>; reload: ReturnType<typeof vi.fn>; immediate: boolean }> = []
vi.mock('@/composables/useList', () => ({
  useList: (path: string, init: Record<string, unknown>, opts: { immediate?: boolean } = {}) => {
    const l = { items: ref([]), loading: ref(false), page: ref(1), pageSize: ref(20), total: ref(0), filters: reactive({ ...init }), reload: vi.fn() }
    lists.push({ path, filters: l.filters, reload: l.reload, immediate: opts.immediate !== false })
    return l
  }
}))
const summaries: string[] = []
vi.mock('./useUsageSummary', () => ({
  useUsageSummary: (_p: string, _f: unknown, groupBy: unknown) => {
    summaries.push(typeof groupBy === 'function' ? groupBy() : String(groupBy))
    return { rows: ref([]), loading: ref(false), error: ref(null), reload: vi.fn() }
  }
}))
const replace = vi.fn()
let query: Record<string, string> = {}
vi.mock('vue-router', () => ({ useRoute: () => ({ query }), useRouter: () => ({ replace }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => false }) }))
vi.mock('./UsageTable.vue', () => ({ default: { name: 'UsageTable', props: ['rows'], template: '<div data-testid="usage-table" />' } }))
vi.mock('./UsageIPPanel.vue', () => ({ default: { name: 'UsageIPPanel', template: '<div data-testid="ip-panel" />' } }))
vi.mock('@/components/stats/UsageCharts.vue', () => ({ default: { name: 'UsageCharts', template: '<div data-testid="charts" />' } }))
vi.mock('./UserRanking.vue', () => ({ default: { name: 'UserRanking', emits: ['select'], template: '<div data-testid="ranking" />' } }))
const { exportUsage, notifyError } = vi.hoisted(() => ({ exportUsage: vi.fn(), notifyError: vi.fn() }))
vi.mock('./exportUsage', () => ({ exportUsage }))
vi.mock('@/utils/errors', async (orig) => ({ ...(await orig<object>()), notifyError }))
enableAutoUnmount(afterEach)

function render(admin = false, extraTabs: Array<{ key: string; label: string }> = []) {
  return mount(UsageRecords, {
    props: { listPath: admin ? '/usage' : '/me/usage', summaryPath: admin ? '/usage/summary' : '/me/usage/summary', defaultRange: '7d', admin, extraTabs },
    slots: { 'tab-ledger': '<div data-testid="ledger" />' },
    global: { plugins: [i18n], stubs: { SChart: true } }
  })
}
type Wrapper = ReturnType<typeof render>
const charts = (w: Wrapper) => w.find('[data-testid="charts"]').exists()

describe('usage records page', () => {
  beforeEach(() => {
    localStorage.clear()
    lists.length = 0
    summaries.length = 0
    replace.mockClear()
    query = {}
    i18n.global.locale.value = 'zh'
  })

  it('shows the totals and the charts by default, and remembers collapsing them per page', async () => {
    const w = render()
    await flushPromises()
    expect(summaries).toContain('none')
    expect(charts(w)).toBe(true)
    await w.get('[data-testid="toggle-usage-charts"]').trigger('click')
    expect(charts(w)).toBe(false)
    w.unmount()
    expect(charts(render())).toBe(false)
    expect(charts(render(true))).toBe(true)
  })

  it('opens the tab named in the URL and writes the chosen one back', async () => {
    query = { tab: 'ips' }
    const w = render()
    await flushPromises()
    expect(w.find('[data-testid="ip-panel"]').exists()).toBe(true)
    query = { tab: 'ledger' }
    const withLedger = render(false, [{ key: 'ledger', label: '余额变动' }])
    await flushPromises()
    expect(withLedger.find('[data-testid="ledger"]').exists()).toBe(true)
    query = { tab: 'nonsense' }
    const fallback = render()
    await flushPromises()
    expect(fallback.find('[data-testid="ip-panel"]').exists()).toBe(false)
  })

  it('lists failed requests under the same search, only once their tab is opened', async () => {
    const w = render()
    await flushPromises()
    const [main, errors] = lists
    expect(errors.immediate).toBe(false)
    expect(errors.reload).not.toHaveBeenCalled()
    main.filters.model_contains = 'sonnet'
    query = { tab: 'errors' }
    w.unmount()
    lists.length = 0
    render()
    await flushPromises()
    const [main2, errors2] = lists
    expect(errors2.reload).toHaveBeenCalled()
    expect(errors2.filters.success).toBe('false')
    main2.filters.model_contains = 'opus'
    await flushPromises()
    expect(errors2.filters).toMatchObject({ model_contains: 'opus', success: 'false' })
  })

  it('gives an operator the user ranking; a ranked user filters the requests', async () => {
    expect(render().text()).not.toContain('用户排行')
    lists.length = 0
    query = { tab: 'ranking' }
    const w = render(true)
    await flushPromises()
    expect(w.text()).toContain('用户排行')
    const ranking = w.findComponent({ name: 'UserRanking' })
    expect(ranking.exists()).toBe(true)
    ranking.vm.$emit('select', '3')
    await flushPromises()
    expect(lists[0].filters.user_id).toBe('3')
    expect(w.find('[data-testid="ranking"]').exists()).toBe(false)
    expect(replace).toHaveBeenLastCalledWith({ query: { tab: undefined } })
  })

  it('starts from the filters of a link; a user cannot preset another user', async () => {
    query = { user_id: '3', group_name: 'vip', from: '2026-10-01T00:00:00.000Z', to: '2026-10-08T00:00:00.000Z' }
    render(true)
    expect(lists[0].filters).toMatchObject(query)
    lists.length = 0
    render()
    expect(lists[0].filters.user_id).toBeUndefined()
    expect(lists[0].filters.group_name).toBeUndefined()
    expect(lists[0].filters.from).toBe('2026-10-01T00:00:00.000Z')
  })

  it('exports the searched requests, and reports a failed export', async () => {
    const w = render()
    await flushPromises()
    lists[0].filters.model_contains = 'opus'
    exportUsage.mockResolvedValueOnce(undefined)
    await w.get('[data-testid="export-usage"]').trigger('click')
    await flushPromises()
    expect(exportUsage).toHaveBeenCalledWith('/me/usage/export', expect.objectContaining({ model_contains: 'opus' }))
    const boom = new Error('boom')
    exportUsage.mockRejectedValueOnce(boom)
    await w.get('[data-testid="export-usage"]').trigger('click')
    await flushPromises()
    expect(notifyError).toHaveBeenCalledWith(boom)
  })
})
