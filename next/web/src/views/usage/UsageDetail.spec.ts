import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import UsageDetail from './UsageDetail.vue'
import type { UsageRow } from './usage'

const get = vi.hoisted(() => vi.fn())
vi.mock('@sub2api/host', () => ({ api: { get } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => false }) }))
vi.mock('@/views/accounts/accountTypes', () => ({ useAccountTypes: () => ({ load: vi.fn() }) }))
enableAutoUnmount(afterEach)

const row = {
  id: 1, request_id: 'fixture', model: 'fixture-model', success: false, status_code: 502,
  input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0,
  total_cost: '0', billing_status: 'failed', latency_ms: 0,
  billing_detail: { inputs: { billing_error: 'helper response usage is incomplete', replacement: [
    { Kind: 'helper_round', Tokens: { Input: 24, Output: 91, CacheRead: 0, CacheCreation: 0, CacheCreation1h: 1647 } },
    { Kind: 'helper_round', Tokens: { Input: 17 } }
  ] } }
} as unknown as UsageRow

function render(value = row, path?: string) {
  i18n.global.locale.value = 'zh'
  return mount(UsageDetail, { props: { row: value, path }, global: {
    plugins: [i18n], stubs: { ExprHistoryModal: true, BillingBreakdown: true }
  } })
}

describe('known partial usage in failed request details', () => {
  it('separates reported TTL facts from compatible billing for successful partial usage', () => {
    const value = { ...row, success: true, status_code: 200, cache_creation_tokens: 1219, cache_creation_1h_tokens: 1376,
      metrics: { cache_write_evidence: { version: 1, total: { state: 'value', value: 2595 }, explicit_5m: { state: 'value', value: 0 }, explicit_1h: { state: 'value', value: 1376 }, unclassified_tokens: 1219, completeness: 'partial', source: 'sse', pricing_policy: 'platform_default_cache_write_compat' } }
    } as unknown as UsageRow
    const before = JSON.stringify(value)
    const wrapper = render(value)
    const facts = wrapper.get('[data-testid="cache-write-facts"]')
    expect(facts.text()).toContain('已报告的 5 分钟写入')
    expect(facts.text()).toContain('TTL 未细分')
    expect(facts.text()).toContain('1,219')
    expect(facts.text()).toContain('平台默认缓存写入费率')
    expect(wrapper.text()).not.toContain('u("cache_write_evidence")')
    expect(JSON.stringify(value)).toBe(before)
  })
  it('shows recorded rounds and 1h cache separately without inventing totals or missing counts', () => {
    const before = JSON.stringify(row)
    const wrapper = render()
    const section = wrapper.get('[data-testid="known-usage-rounds"]')
    expect(section.text()).toContain('不能作为本次请求总计')
    const rounds = section.findAll('[data-testid="known-usage-round"]')
    expect(rounds).toHaveLength(2)
    expect(rounds[0]!.findAll('dd').map(node => node.text())).toEqual(['24', '91', '0', '0', '1,647'])
    expect(rounds[1]!.findAll('dd').map(node => node.text())).toEqual(['17', '—', '—', '—', '—'])
    expect(section.text()).not.toContain('41')
    expect(wrapper.text()).toContain('结算失败')
    expect(JSON.stringify(row)).toBe(before)
  })

  it('loads partial evidence from the detailed record when the list lacks it', async () => {
    get.mockResolvedValueOnce(row)
    const wrapper = render({ ...row, billing_detail: {} }, '/me/usage/1')
    expect(wrapper.find('[data-testid="known-usage-rounds"]').exists()).toBe(false)
    await flushPromises()
    expect(get).toHaveBeenCalledWith('/me/usage/1')
    expect(wrapper.findAll('[data-testid="known-usage-round"]')).toHaveLength(2)
  })

  it('keeps main and billed component cache evidence separate and does not expose debug fields', () => {
    const evidence = (n: number) => ({ cache_write_evidence: { version: 1, total: { state: 'value', value: n }, explicit_5m: { state: 'absent' }, explicit_1h: { state: 'absent' }, unclassified_tokens: n, completeness: 'unknown', source: 'iteration', pricing_policy: 'platform_default_cache_write_compat', private_debug: 'secret' } })
    const value = { ...row, success: true, status_code: 200, metrics: evidence(11), billing_detail: { inputs: {
      additional: [{ Metrics: evidence(22) }], replacement: [{ Metrics: evidence(33) }]
    } }, plugin_detail: { private_debug: 'secret' } } as unknown as UsageRow
    const wrapper = render(value)
    const parts = wrapper.findAll('[data-testid="component-cache-write-facts"]')
    expect(parts).toHaveLength(2)
    expect(parts[0]!.findAll('dd').map(node => node.text())).toEqual(['22', '未报告', '未报告', '22'])
    expect(parts[1]!.findAll('dd').map(node => node.text())).toEqual(['33', '未报告', '未报告', '33'])
    expect(wrapper.text()).not.toContain('secret')
    expect(wrapper.findAll('[data-testid="cache-write-facts"]')).toHaveLength(3)
  })

  it('keeps ordinary successful or nonzero top-level usage unchanged', () => {
    for (const value of [{ ...row, success: true }, { ...row, input_tokens: 12 }, { ...row, cache_creation_1h_tokens: 5 }]) {
      expect(render(value).find('[data-testid="known-usage-rounds"]').exists()).toBe(false)
    }
  })

  it('does not turn malformed or absent replacement facts into zero usage', () => {
    for (const replacement of [null, {}, [{ Tokens: null }], [{ Tokens: [] }], [{ Tokens: { Unknown: 24 } }], [{ Tokens: { Input: '24', Output: -1, CacheRead: Number.NaN } }]]) {
      const value = { ...row, billing_detail: { inputs: { replacement } } }
      expect(render(value).find('[data-testid="known-usage-rounds"]').exists()).toBe(false)
    }
  })
})
