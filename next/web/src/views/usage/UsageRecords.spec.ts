import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { i18n } from '@/i18n'
import EntityPicker from '@/components/EntityPicker.vue'
import UsageRecords from './UsageRecords.vue'

// Data sources are stubbed: what this spec checks is the page around them -
// the log type in the URL and the search bar, and the failed requests being the
// list with success=false.
const lists: Array<{ path: string; filters: Record<string, unknown>; reload: ReturnType<typeof vi.fn>; immediate: boolean }> = []
vi.mock('@/composables/useList', async importOriginal => ({
  ...(await importOriginal<object>()),
  useList: (path: string, init: Record<string, unknown>, opts: { immediate?: boolean } = {}) => {
    const l = { items: ref([]), loading: ref(false), page: ref(1), pageSize: ref(20), total: ref(0), filters: reactive({ ...init }), reload: vi.fn() }
    lists.push({ path, filters: l.filters, reload: l.reload, immediate: opts.immediate !== false })
    return l
  }
}))
const summaries: string[] = []
const extras: Record<string, Record<string, unknown>> = {}
const protocolRows = ref<Array<{ key: string }>>([])
const modelRows = ref<Array<{ key: string }>>([])
const summaryRows: Record<string, typeof protocolRows> = { protocol: protocolRows, model: modelRows }
vi.mock('./useUsageSummary', () => ({
  useUsageSummary: (_p: string, _f: unknown, groupBy: unknown, _enabled?: unknown, extra?: unknown) => {
    const by = typeof groupBy === 'function' ? groupBy() : String(groupBy)
    summaries.push(by)
    extras[by] = typeof extra === 'function' ? extra() : ((extra as Record<string, unknown>) ?? {})
    return { rows: summaryRows[by] ?? ref([]), loading: ref(false), error: ref(null), reload: vi.fn() }
  }
}))
const replace = vi.fn()
let query: Record<string, string> = {}
vi.mock('vue-router', () => ({ useRoute: () => ({ query }), useRouter: () => ({ replace }) }))
// The pickers look names up; no entity is known here.
vi.mock('@sub2api/host', async original => ({ ...(await original<typeof import('@sub2api/host')>()), api: { get: async () => ({ items: [], more: false }) } }))
const perms = vi.hoisted(() => ({ accountRead: true }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (key: string | string[]) => perms.accountRead || ![key].flat().includes('account:read') }) }))
vi.mock('./UsageTable.vue', () => ({ default: { name: 'UsageTable', props: ['rows', 'showAccount'], emits: ['filter-account-id'], template: '<div data-testid="usage-table" />' } }))
vi.mock('./UsageIPPanel.vue', () => ({ default: { name: 'UsageIPPanel', template: '<div data-testid="ip-panel" />' } }))
vi.mock('./UsageLiveStats.vue', () => ({ default: { name: 'UsageLiveStats', props: ['realtimePath', 'summaryPath', 'revision'], template: '<div data-testid="live-stats" />' } }))
vi.mock('./UserRanking.vue', () => ({ default: { name: 'UserRanking', emits: ['select'], template: '<div data-testid="ranking" />' } }))
const { exportUsage, notifyError } = vi.hoisted(() => ({ exportUsage: vi.fn(), notifyError: vi.fn() }))
vi.mock('./exportUsage', () => ({ exportUsage }))
vi.mock('@/utils/errors', async (orig) => ({ ...(await orig<object>()), notifyError }))
enableAutoUnmount(afterEach)

function render(admin = false, extraTabs: Array<{ key: string; label: string }> = []) {
  return mount(UsageRecords, {
    props: { listPath: admin ? '/usage' : '/me/usage', summaryPath: admin ? '/usage/summary' : '/me/usage/summary', admin, extraTabs },
    slots: { 'tab-ledger': '<div data-testid="ledger" />', 'tab-ledger-range': '<div data-testid="ledger-range" />', 'tab-ledger-filters': '<div data-testid="ledger-filters" />' },
    global: { plugins: [i18n], stubs: { SChart: true } }
  })
}
type Wrapper = ReturnType<typeof render>
const LOG_TYPES = (w: Wrapper) => w.get('[data-testid="filter-log-type"]').findAll('option')
// The select's value is the option's index; `pick` takes the log type's key.
const KEYS: Record<string, string> = { records: '用量明细', errors: '错误请求', ips: '调用 IP', ranking: '用户排行', ledger: '余额变动' }
async function pick(w: Wrapper, key: string) {
  await w.get('[data-testid="filter-log-type"]').setValue(String(LOG_TYPES(w).findIndex((o) => o.text() === KEYS[key])))
  await flushPromises()
}
const selected = (w: Wrapper) => LOG_TYPES(w)[(w.get('[data-testid="filter-log-type"]').element as HTMLSelectElement).selectedIndex].text()

describe('usage records page', () => {
  beforeEach(() => {
    localStorage.clear()
    lists.length = 0
    summaries.length = 0
    protocolRows.value = []
    modelRows.value = []
    replace.mockClear()
    query = {}
    i18n.global.locale.value = 'zh'
  })

  it('shows the live statistics of its own list, and neither the totals nor the charts', async () => {
    const w = render(true)
    await flushPromises()
    expect(w.findComponent({ name: 'UsageLiveStats' }).props()).toMatchObject({ realtimePath: '/usage/realtime', summaryPath: '/usage/summary' })
    expect(w.find('[data-testid="usage-summary-cards"]').exists()).toBe(false)
    expect(w.find('[data-testid="usage-granularity"]').exists()).toBe(false)
    expect(summaries).not.toContain('none')
  })

  it('opens the log type named in the URL and writes the chosen one back', async () => {
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
    expect(selected(fallback)).toBe('用量明细')
    await pick(fallback, 'ips')
    expect(replace).toHaveBeenLastCalledWith({ query: { tab: 'ips' } })
  })

  it('lists failed requests as the same list with success=false, and drops it on leaving that type', async () => {
    const w = render()
    await flushPromises()
    expect(lists).toHaveLength(1)
    await pick(w, 'errors')
    expect(lists[0].filters.success).toBe('false')
    expect((w.get('[data-testid="usage-table"]').element as HTMLElement).style.display).toBe('')
    expect(replace).toHaveBeenLastCalledWith({ query: { tab: 'errors' } })
    await pick(w, 'ips')
    expect(lists[0].filters.success).toBe('')
    expect(w.find('[data-testid="ip-panel"]').exists()).toBe(true)
    expect((w.get('[data-testid="usage-table"]').element as HTMLElement).style.display).toBe('none')
  })

  it('starts from the failed requests when the URL names them, without the status select', async () => {
    query = { tab: 'errors' }
    const w = render()
    await flushPromises()
    expect(lists[0].filters.success).toBe('false')
    expect(w.find('[data-testid="filter-success"]').exists()).toBe(false)
  })

  it('applies the filters typed so far along with the log type', async () => {
    const w = render()
    await flushPromises()
    await w.get('[data-testid="filter-request_id"]').setValue('req-1')
    expect(lists[0].filters.request_id).toBeUndefined()
    await pick(w, 'errors')
    expect(lists[0].filters).toMatchObject({ request_id: 'req-1', success: 'false' })
    expect((w.get('[data-testid="filter-request_id"]').element as HTMLInputElement).value).toBe('req-1')
  })

  it('searches at once when an entity is picked, among the caller\'s own on their page', async () => {
    const w = render()
    await flushPromises()
    const model = w.findAllComponents(EntityPicker).find((p) => p.props('kind') === 'model')!
    expect(model.props('mine')).toBe(true)
    model.vm.$emit('change', { id: 'claude-opus-5', text: '' })
    await flushPromises()
    expect(lists[0].filters).toMatchObject({ model: 'claude-opus-5', model_contains: '' })
    expect(w.findAllComponents(EntityPicker).map((p) => p.props('kind'))).toEqual(['model', 'group', 'api_key'])
    expect(render(true).findAllComponents(EntityPicker).map((p) => [p.props('kind'), p.props('mine')])).toEqual([['model', false], ['user', false], ['api_key', false], ['group', false], ['account', false]])
  })

  it('returns to the request list on reset', async () => {
    query = { tab: 'errors' }
    const w = render()
    await flushPromises()
    await w.get('[data-testid="reset-usage-filters"]').trigger('click')
    await flushPromises()
    expect(lists[0].filters.success).toBe('')
    expect(selected(w)).toBe('用量明细')
    expect(replace).toHaveBeenLastCalledWith({ query: { tab: undefined } })
  })

  it('offers only what the log type can list: an added type brings its own filters instead of the search', async () => {
    query = { tab: 'ledger' }
    const w = render(false, [{ key: 'ledger', label: '余额变动' }])
    await flushPromises()
    const bar = w.get('form')
    expect(selected(w)).toBe('余额变动')
    expect(bar.find('[data-testid="ledger-range"]').exists()).toBe(true)
    expect(bar.find('[data-testid="ledger-filters"]').exists()).toBe(true)
    expect(w.find('[data-testid="ledger"]').exists()).toBe(true)
    for (const gone of ['filter-model', 'filter-protocol', 'filter-success', 'filter-advanced-toggle', 'live-stats', 'export-usage', 'search-usage', 'reset-usage-filters']) {
      expect(bar.find(`[data-testid="${gone}"]`).exists()).toBe(false)
    }
    await pick(w, 'records')
    expect(bar.find('[data-testid="ledger-filters"]').exists()).toBe(false)
    expect(bar.find('[data-testid="filter-model"]').exists()).toBe(true)
    expect(bar.find('[data-testid="filter-advanced-toggle"]').exists()).toBe(true)
    expect(bar.find('[data-testid="live-stats"]').exists()).toBe(true)
    expect(w.find('[data-testid="ledger"]').exists()).toBe(false)
  })

  it('exports only what is a list of requests', async () => {
    const w = render(true)
    await flushPromises()
    await pick(w, 'errors')
    exportUsage.mockResolvedValueOnce(undefined)
    await w.get('[data-testid="export-usage"]').trigger('click')
    await flushPromises()
    expect(exportUsage).toHaveBeenLastCalledWith('/usage/export', expect.objectContaining({ success: 'false' }))
    await pick(w, 'ips')
    expect(w.find('[data-testid="export-usage"]').exists()).toBe(false)
    await pick(w, 'ranking')
    expect(w.find('[data-testid="export-usage"]').exists()).toBe(false)
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
    lists[0].filters.user_email = 'ann'
    ranking.vm.$emit('select', '3')
    await flushPromises()
    // the picked user replaces a searched email
    expect(lists[0].filters).toMatchObject({ user_id: '3', user_email: '' })
    expect(w.find('[data-testid="ranking"]').exists()).toBe(false)
    expect(replace).toHaveBeenLastCalledWith({ query: { tab: undefined } })
  })

  it('shows the upstream account to operators only; clicking one filters by it', async () => {
    expect(render().findComponent({ name: 'UsageTable' }).props('showAccount')).toBe(false)
    lists.length = 0
    const w = render(true)
    const table = w.findComponent({ name: 'UsageTable' })
    expect(table.props('showAccount')).toBe(true)
    lists[0].filters.account_name = 'main'
    table.vm.$emit('filter-account-id', 9)
    await flushPromises()
    expect(lists[0].filters).toMatchObject({ account_id: '9', account_name: '' })
  })

  it('hides the account from an operator who may not read accounts', () => {
    perms.accountRead = false
    try {
      const w = render(true)
      expect(w.findComponent({ name: 'UsageTable' }).props('showAccount')).toBe(false)
      expect(w.findComponent({ name: 'UsageFilters' }).props('accounts')).toBe(false)
    } finally {
      perms.accountRead = true
    }
  })

  it('opens on today from 00:00:00 to an hour from now, shown to the second', () => {
    const midnight = new Date()
    midnight.setHours(0, 0, 0, 0)
    const w = render(true)
    const f = lists[0].filters as { from: string; to: string }
    expect(f.from).toBe(midnight.toISOString())
    const end = new Date(f.to).getTime() - 1000
    expect(Math.abs(end - (Date.now() + 3600_000))).toBeLessThan(5000)
    const range = w.findComponent({ name: 'SDateRange' })
    expect(range.props()).toMatchObject({ range: 'today', time: true, from: f.from, to: f.to })
  })

  it('starts from the filters of a link; a user cannot preset another user', async () => {
    query = { user_id: '3', group_name: 'vip', model: 'gpt-4o', from: '2026-10-01T00:00:00.000Z', to: '2026-10-08T00:00:00.000Z' }
    render(true)
    expect(lists[0].filters).toMatchObject(query)
    lists.length = 0
    render()
    expect(lists[0].filters.user_id).toBeUndefined()
    expect(lists[0].filters.group_name).toBeUndefined()
    expect(lists[0].filters).toMatchObject({ model: 'gpt-4o', from: '2026-10-01T00:00:00.000Z' })
  })

  it('offers the request types under the search as filter options, leaving the type filter itself out of that query', async () => {
    protocolRows.value = [{ key: 'anthropic.messages' }, { key: '' }, { key: 'openai.chat' }]
    const w = render()
    await flushPromises()
    expect(summaries).toContain('protocol')
    expect(extras.protocol).toEqual({ protocol: '' })
    expect(w.findComponent({ name: 'UsageFilters' }).props('protocolOptions')).toEqual(['anthropic.messages', 'openai.chat'])
  })

  it('offers the models under the search to the model picker, leaving the model filters themselves out of that query', async () => {
    modelRows.value = [{ key: 'claude-opus-5' }, { key: '' }, { key: 'gpt-4o' }]
    const w = render()
    await flushPromises()
    expect(extras.model).toEqual({ model: '', model_contains: '' })
    expect(w.findAllComponents(EntityPicker).find((p) => p.props('kind') === 'model')!.props('extra')).toEqual([
      { id: 'claude-opus-5', name: 'claude-opus-5' },
      { id: 'gpt-4o', name: 'gpt-4o' }
    ])
  })

  it('renders the page actions in the search bar beside Export', async () => {
    const w = mount(UsageRecords, {
      props: { listPath: '/me/usage', summaryPath: '/me/usage/summary' },
      slots: { actions: '<button data-testid="page-refresh" />' },
      global: { plugins: [i18n], stubs: { SChart: true } }
    })
    await flushPromises()
    const bar = w.get('form')
    expect(bar.find('[data-testid="page-refresh"]').exists()).toBe(true)
    expect(bar.find('[data-testid="export-usage"]').exists()).toBe(true)
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
