import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { i18n } from '@/i18n'
import UsageOverview from './UsageOverview.vue'

const summaries: Array<{ path: string; groupBy: string; filters: Record<string, unknown>; reload: ReturnType<typeof vi.fn> }> = []
vi.mock('./useUsageSummary', () => ({
  useUsageSummary: (path: string, filters: Record<string, unknown>, groupBy: string) => {
    const reload = vi.fn()
    summaries.push({ path, groupBy, filters, reload })
    return { rows: ref([]), loading: ref(false), error: ref(null), reload }
  }
}))
let query: Record<string, string> = {}
vi.mock('vue-router', () => ({ useRoute: () => ({ query }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => false }) }))
vi.mock('@/components/stats/UsageCharts.vue', () => ({
  default: { name: 'UsageCharts', props: ['summaryPath', 'revision', 'granularity'], emits: ['select-model', 'select-secondary'], template: '<div data-testid="charts" />' }
}))
enableAutoUnmount(afterEach)

function render(admin = false) {
  return mount(UsageOverview, {
    props: { summaryPath: admin ? '/usage/summary' : '/me/usage/summary', defaultRange: '7d', admin },
    global: { plugins: [i18n], stubs: { SChart: true } }
  })
}

describe('usage overview page', () => {
  beforeEach(() => {
    summaries.length = 0
    query = {}
    i18n.global.locale.value = 'zh'
  })

  it('shows the totals and the charts of its summary, and no request list', async () => {
    const w = render(true)
    await flushPromises()
    expect(summaries[0]).toMatchObject({ path: '/usage/summary', groupBy: 'none' })
    expect(w.find('[data-testid="usage-summary-cards"]').exists()).toBe(true)
    expect(w.findComponent({ name: 'UsageCharts' }).props('summaryPath')).toBe('/usage/summary')
    expect(w.find('[data-testid="usage-granularity"]').exists()).toBe(true)
    expect(w.find('[data-testid="export-usage"]').exists()).toBe(false)
  })

  it('narrows to what a chart selects, and reloads on a refresh', async () => {
    const w = render()
    const charts = w.findComponent({ name: 'UsageCharts' })
    charts.vm.$emit('select-model', 'opus')
    charts.vm.$emit('select-secondary', '7')
    await flushPromises()
    expect(summaries[0].filters).toMatchObject({ model_contains: 'opus', api_key_id: '7' })
    await w.setProps({ revision: 1 })
    expect(summaries[0].reload).toHaveBeenCalled()
    expect(charts.props('revision')).toBe(1)
  })

  it('starts from the filters of a link; a user cannot preset another user', () => {
    query = { user_id: '3', from: '2026-10-01T00:00:00.000Z', to: '2026-10-08T00:00:00.000Z' }
    render(true)
    expect(summaries[0].filters).toMatchObject(query)
    summaries.length = 0
    render()
    expect(summaries[0].filters.user_id).toBeUndefined()
    expect(summaries[0].filters.from).toBe('2026-10-01T00:00:00.000Z')
  })
})
