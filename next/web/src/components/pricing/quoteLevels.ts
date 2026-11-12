// The two chains of a quote (POST /pricing/quote) level by level, top first,
// for the price simulator: what each level is set to and which one applies.
import type { ListedPriceRule, PriceDef, PriceSource, PricingQuote, RateSource } from '@/api/pricing'
import { num } from '@/views/prices/priceExpr'
import { hasDiscount, inheritedRate } from './pricingFormat'

/** applies: the level the quote took; shadowed: set, but another level applies (one above it, or it is not in effect); unset: nothing is set there. */
export type LevelState = 'applies' | 'shadowed' | 'unset'

export interface QuoteLevel<K extends string, V> {
  key: K
  /** As configured; null = not set. */
  value: V | null
  state: LevelState
  /** A rule the server skips: a custom price in another mode than the global price has now. */
  inactive?: boolean
}

function resolve<K extends string, V>(levels: Array<[K, V | null]>, source: K): QuoteLevel<K, V>[] {
  return levels.map(([key, value]) => ({ key, value, state: value === null ? 'unset' : key === source ? 'applies' : 'shadowed' }))
}

/** List price: the segment's rule, the group's rule, the global price. */
export function priceLevels(q: Pick<PricingQuote, 'price_levels' | 'base' | 'price_source'>): QuoteLevel<PriceSource, ListedPriceRule | PriceDef>[] {
  const levels = resolve<PriceSource, ListedPriceRule | PriceDef>(
    [
      ['segment', q.price_levels.segment],
      ['group', q.price_levels.group],
      ['global', q.base]
    ],
    q.price_source
  )
  return levels.map((l) => (l.value && 'kind' in l.value && l.value.inactive ? { ...l, inactive: true } : l))
}

/** Rate: the segment's override, the group's default times the segment's discount (set when there is a discount), the group's default. */
export function rateLevels(q: Pick<PricingQuote, 'rate' | 'rate_override'>): QuoteLevel<RateSource, number>[] {
  return resolve<RateSource, number>(
    [
      ['segment', q.rate_override === null ? null : num(q.rate_override)],
      ['discount', hasDiscount(q.rate) ? inheritedRate(q.rate) : null],
      ['group', num(q.rate.group_default, 1)]
    ],
    q.rate.source
  )
}
