import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { UsagePricing } from '@/api/pricing'
import UsageBillingFacts from './UsageBillingFacts.vue'
import type { UsageRow } from './usage'

vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => false }) }))
vi.mock('@/composables/platforms', () => ({ usePlatforms: () => ({ load: vi.fn(), label: (id: string) => id }) }))
enableAutoUnmount(afterEach)

/** A billed record: 0.00576 at the global price, then what group pricing made of it. */
function record(detail: { rate: string; total: string; pricing?: UsagePricing; list_cost?: string }): UsageRow {
  const { rate, total, pricing, list_cost } = detail
  return {
    id: 1, request_id: 'fixture', model: 'gpt-4o-mini', success: true, status_code: 200, billing_status: 'billed', latency_ms: 0,
    input_tokens: 12000, output_tokens: 1800, cache_read_tokens: 0, cache_creation_tokens: 0, total_cost: total, rate_multiplier: rate,
    billing_detail: {
      breakdown: { items: [], subtotal: '0.00576', base: '0.00576', rules_multiplier: 1 },
      cost: '0.00576', rate_multiplier: rate, total_cost: total, ...(list_cost ? { list_cost } : {}), ...(pricing ? { inputs: { pricing } } : {})
    }
  } as unknown as UsageRow
}

function render(u: UsageRow, locale: 'zh' | 'en' = 'zh') {
  i18n.global.locale.value = locale
  const w = mount(UsageBillingFacts, { props: { u }, global: { plugins: [i18n], stubs: { ExprHistoryModal: true } } })
  const text = (id: string) => w.find(`[data-testid="${id}"]`).text().replace(/\s+/g, ' ')
  return { w, text, has: (id: string) => w.find(`[data-testid="${id}"]`).exists() }
}

describe('group pricing of a usage record', () => {
  it('reads as before at the global price and the default rate of the group', () => {
    const { w, has } = render(record({ rate: '1.5', total: '0.00864' }))
    expect(has('usage-list-price')).toBe(false)
    expect(has('usage-list-cost')).toBe(false)
    expect(has('rate-source')).toBe(false)
    expect(w.text().replace(/\s+/g, ' ')).toContain('基础费用 $0.00576 × 条件总倍率 1 × 分组倍率 1.5 = $0.00864')
  })

  it('shows the multiplier rule that gave the list price, the list cost and where the rate comes from', () => {
    const pricing: UsagePricing = { segment_id: 2, rate_source: 'discount', price_source: 'segment', scale: '0.8' }
    const { w, text } = render(record({ rate: '0.9', total: '0.0041472', list_cost: '0.004608', pricing }))
    expect(text('usage-list-price')).toMatch(/^专属价 ?全局 ×0\.8$/)
    expect(text('usage-list-cost')).toBe('$0.004608')
    expect(text('rate-source')).toBe('(分组默认 × 全场折扣)')
    expect(w.text().replace(/\s+/g, ' ')).toContain('× 条件总倍率 1 × 标价倍数 0.8 × 分组倍率 0.9 (分组默认 × 全场折扣) = $0.004147')
  })

  it('names a custom price, which is no multiplier of the base cost', () => {
    const pricing: UsagePricing = { segment_id: 2, rate_source: 'segment', price_source: 'group', base: { expression: 'tier("base", p*1 + c*5)', expr_hash: 'abc' } }
    const { w, text } = render(record({ rate: '0.7', total: '0.004032', list_cost: '0.00576', pricing }))
    expect(text('usage-list-price')).toMatch(/^分组内定价 ?自定义价格$/)
    expect(text('usage-list-cost')).toBe('$0.00576')
    expect(text('rate-source')).toBe('(专属倍率)')
    expect(w.text()).not.toContain('标价倍数')
  })

  it('says only where the rate comes from when no rule gave the list price', () => {
    for (const price_source of [undefined, 'global'] as const) {
      const { has, text } = render(record({ rate: '0.7', total: '0.004032', pricing: { segment_id: 2, rate_source: 'segment', price_source } }), 'en')
      expect(has('usage-list-price')).toBe(false)
      expect(has('usage-list-cost')).toBe(false)
      expect(text('rate-source')).toBe('(Own rate)')
    }
  })

  it('names no source of the rate when the record has none', () => {
    const { has, text } = render(record({ rate: '1', total: '0.006912', list_cost: '0.006912', pricing: { price_source: 'group', scale: '1.2' } }), 'en')
    expect(has('rate-source')).toBe(false)
    expect(text('usage-list-price')).toMatch(/^Group pricing ?Global ×1\.2$/)
    expect(text('usage-list-cost')).toBe('$0.006912')
  })
})
