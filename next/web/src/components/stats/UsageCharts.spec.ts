import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { i18n } from '@/i18n'
import type { UsageSummaryRow } from '@/api/types'
import UsageCharts from './UsageCharts.vue'

const row = (key: string, tokens: number): UsageSummaryRow => ({ key, requests: 1, input_tokens: tokens, total_cost: '0' })
/** The summary rows of each group_by. */
const data: Record<string, UsageSummaryRow[]> = {
  model: [row('claude-sonnet-4-5', 30), row('gpt-4o', 20), row('zeta-large', 10)],
  upstream_model: [row('gemini-2.5-flash', 30)],
  api_key: [row('7', 30)]
}
vi.mock('@/views/usage/useUsageSummary', () => ({
  useUsageSummary: (_path: string, _filters: unknown, groupBy: MaybeRefOrGetter<string>) => ({
    rows: computed(() => data[toValue(groupBy)] ?? []),
    loading: ref(false),
    error: ref(null),
    reload: vi.fn()
  })
}))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ theme: 'light' }) }))
enableAutoUnmount(afterEach)

function render(props: Record<string, unknown> = {}) {
  return mount(UsageCharts, {
    props: { summaryPath: '/usage/summary', filters: {}, granularity: 'day', group: 'usage', ...props },
    global: { plugins: [i18n], stubs: { SChart: true, TokenTrendChart: true, MetricStrip: true } }
  })
}
const badges = (w: ReturnType<typeof render>) => w.findAll('[data-testid="model-badge"]')
const brands = (w: ReturnType<typeof render>) => badges(w).map(b => b.get('[data-brand]').attributes('data-brand'))

describe('UsageCharts model distribution', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
  })

  it('labels each model with its vendor mark, untinted, and leaves the second breakdown as text', async () => {
    const w = render({ secondary: { groupBy: 'api_key', title: 'Keys', keyLabel: 'Key', labelOf: (key: string) => `key #${key}` } })
    expect(badges(w).map(b => b.get('.truncate').text())).toEqual(['claude-sonnet-4-5', 'gpt-4o', 'zeta-large'])
    expect(brands(w)).toEqual(['anthropic', 'openai', 'zeta-large'])
    expect(badges(w).some(b => b.classes().includes('brand-tint'))).toBe(false)
    expect(w.text()).toContain('key #7')
    await badges(w)[1].trigger('click')
    expect(w.emitted('select-model')).toEqual([['gpt-4o']])
  })

  it('marks the models on the dashboard layout too', () => {
    expect(brands(render({ layout: 'dashboard' }))).toEqual(['anthropic', 'openai', 'zeta-large'])
  })

  it('marks the upstream models when an operator switches the breakdown to them', async () => {
    const w = render({ modelSources: true })
    await w.get('[data-testid="model-source"]').findAll('input')[1].setValue(true)
    expect(brands(w)).toEqual(['gemini'])
  })
})
