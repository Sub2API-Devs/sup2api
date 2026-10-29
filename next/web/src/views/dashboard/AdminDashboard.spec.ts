import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { i18n } from '@/i18n'
import AdminDashboard from './AdminDashboard.vue'

const { get, push } = vi.hoisted(() => ({ get: vi.fn(), push: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: { get } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }), RouterLink: { props: ['to'], template: '<a><slot /></a>' } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ theme: 'light' }) }))
const summaries: Array<{ groupBy: string; extra: unknown }> = []
vi.mock('@/views/usage/useUsageSummary', () => ({
  useUsageSummary: (_p: string, _f: unknown, groupBy: string, _e: unknown, extra?: () => unknown) => {
    summaries.push({ groupBy, extra: extra?.() })
    return { rows: ref([]), loading: ref(false), error: ref(null), reload: vi.fn() }
  }
}))
vi.mock('@/components/stats/UsageCharts.vue', () => ({ default: { name: 'UsageCharts', props: { summaryPath: String, modelSources: Boolean }, template: '<div />' } }))
vi.mock('@/components/stats/RankingBars.vue', () => ({ default: { name: 'RankingBars', emits: ['select'], template: '<div />' } }))
vi.mock('@/components/stats/DistributionCard.vue', () => ({ default: { name: 'DistributionCard', emits: ['select'], template: '<div />' } }))
vi.mock('@/components/plugin/PluginSlot.vue', () => ({ default: { template: '<div />' } }))
enableAutoUnmount(afterEach)

const totals = (requests: number, cost: string) => ({ requests, success: requests, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0, prompt_tokens: null, total_cost: cost, standard_cost: cost, latency_ms_avg: 0, first_token_ms_avg: 0 })
const overview = { tz: 'UTC', today: totals(12, '3.5'), yesterday: totals(6, '1'), last_30d: totals(300, '80'), last_5m: { requests: 10, tokens: 500 } }
const render = () => mount(AdminDashboard, { global: { plugins: [i18n] } })

describe('operator dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    summaries.length = 0
    i18n.global.locale.value = 'zh'
  })

  it('shows the users and accounts cards only when the overview carries them', async () => {
    get.mockResolvedValue(overview)
    const w = render()
    await flushPromises()
    expect(get).toHaveBeenCalledWith('/usage/overview', expect.objectContaining({ tz: expect.any(String) }))
    expect(w.text()).toContain('$3.50')
    expect(w.find('[data-testid="card-users"]').exists()).toBe(false)
    expect(w.find('[data-testid="card-accounts"]').exists()).toBe(false)

    get.mockResolvedValue({ ...overview, users: { total: 40, new_today: 2, active_today: 9 }, accounts: { total: 6, available: 4, auto_disabled: 1, disabled: 1 } })
    const full = render()
    await flushPromises()
    expect(full.get('[data-testid="card-users"]').text()).toContain('9')
    expect(full.get('[data-testid="card-accounts"]').text()).toContain('4/6')
  })

  it('ranks the top 10 users and opens their records with the range', async () => {
    get.mockResolvedValue(overview)
    const w = render()
    await flushPromises()
    expect(summaries).toContainEqual({ groupBy: 'user', extra: { order: 'cost', limit: 10 } })
    expect(summaries.map((s) => s.groupBy)).toContain('group')
    expect(w.findComponent({ name: 'UsageCharts' }).props('modelSources')).toBe(true)
    w.findComponent({ name: 'RankingBars' }).vm.$emit('select', '3')
    expect(push).toHaveBeenCalledWith({ path: '/usage', query: expect.objectContaining({ user_id: '3', from: expect.any(String) }) })
    w.findComponent({ name: 'DistributionCard' }).vm.$emit('select', 'vip')
    expect(push).toHaveBeenLastCalledWith({ path: '/usage', query: expect.objectContaining({ group_name: 'vip' }) })
  })
})
