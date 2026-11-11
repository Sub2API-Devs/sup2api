import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { PricingQuote } from '@/api/pricing'
import PriceQuoteBreakdown from './PriceQuoteBreakdown.vue'

const price = { mode: 'per_token' as const, config: { p: 3, c: 15 }, expression: '' }
const quote: PricingQuote = {
  segment: { id: 2, kind: 'named', name: 'VIP' },
  accessible: true,
  access_source: 'public',
  base: price,
  list_price: price,
  price_source: 'global',
  price_levels: { segment: null, group: null },
  rate: { value: '0.9', source: 'discount', group_default: '1', discount: '0.9' },
  rate_override: null,
  list_cost: '4.50000000',
  cost: '4.05000000'
}
const render = (q: Partial<PricingQuote> = {}) => {
  i18n.global.locale.value = 'zh'
  return mount(PriceQuoteBreakdown, { props: { quote: { ...quote, ...q }, groupName: 'default' }, global: { plugins: [i18n] } })
}

describe('price quote breakdown', () => {
  it('marks the level of each chain that applies and sums up what is paid', () => {
    const w = render()
    const applied = (chain: string) => w.get(`[data-testid="price-quote-${chain}"] [data-state="applies"]`).attributes('data-level')
    expect([applied('price'), applied('rate')]).toEqual(['global', 'discount'])
    expect(w.get('[data-testid="price-quote-cost"]').text()).toBe('$4.05')
  })

  it('says that a model without a global price cannot be billed, in place of a sum of zero', () => {
    const w = render({ base: null, list_price: null, list_cost: '0', cost: '0' })
    expect(w.get('[data-testid="price-quote-unpriced"]').text()).toContain('这个模型还没有全局价格，无法计费')
    expect(w.find('[data-testid="price-quote-paid"]').exists()).toBe(false)
  })
})
