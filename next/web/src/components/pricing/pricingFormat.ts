// What the pricing views show of a rate, a price rule and a price: pure
// functions shared by the admin editors and the user's own pages.
import type { EffectiveRate, PriceDef, PriceRule } from '@/api/pricing'
import { TOKEN_VARS, hasVisualConfig, normalizeVisual, num, parseExpression, summarize, tokenPricesFrom, visualConfigForSave, type TokenPrices } from '@/views/prices/priceExpr'

/** "×0.8": a rate as every pricing view writes it. */
export function rateText(v: string | number | null | undefined): string {
  return v === null || v === undefined || v === '' ? '—' : `×${Number(v)}`
}

/** A rate or a multiplier as typed in a form: a non-negative decimal. */
export function validRate(v: string | null | undefined): boolean {
  return !!v && /^\d+(\.\d{1,4})?$/.test(v.trim())
}

const round = (n: number) => Number(n.toFixed(6))

/** The rate a segment gets in a group without an override of its own: the group's default times the segment's discount. */
export function inheritedRate(rate: Pick<EffectiveRate, 'group_default' | 'discount'>): number {
  return round(num(rate.group_default, 1) * num(rate.discount, 1))
}

/** The fields of a price config that are prices: the tokens', a tier's flat fee, a per-request price. */
const PRICE_KEYS: readonly string[] = [...TOKEN_VARS, 'flat', 'price']

/** A price config with every price times `k`, tiers included; lengths, names and markup rules stay. */
function scaled(config: unknown, k: number, key = ''): any {
  if (Array.isArray(config)) return config.map((v) => scaled(v, k))
  if (config && typeof config === 'object') return Object.fromEntries(Object.entries(config).map(([name, v]) => [name, scaled(v, k, name)]))
  return typeof config === 'number' && PRICE_KEYS.includes(key) ? round(config * k) : config
}

/** The global price times `k`. An expression without a visual config is scaled through its parsed form; one the console cannot parse stays as it is. */
function multiplied(base: PriceDef, k: number): PriceDef {
  if (base.mode !== 'expression' || hasVisualConfig(base.config)) return { ...base, config: scaled(base.config, k) }
  const parsed = parseExpression(base.expression)
  return parsed ? { ...base, config: scaled(visualConfigForSave(parsed), k) } : base
}

/**
 * The list price a rule gives over the global price `base`, as the server
 * resolves it: shown while a rule is edited and not yet saved.
 */
export function applyRule(base: PriceDef | null, rule: PriceRule | null): PriceDef | null {
  if (!rule) return base
  if (rule.kind === 'custom') return { mode: rule.mode, config: rule.config, expression: '' }
  return base && multiplied(base, num(rule.multiplier, 1))
}

/** The cells of a price in a table: a per-request price, the tokens' prices (first tier of a tiered price), or neither. */
export interface PriceCells {
  perRequest?: number
  tokens?: TokenPrices
  /** Length tiers; 1 when the price has none. */
  tiers: number
  /** An expression the console cannot break down. */
  opaque?: boolean
}

export function priceCells(def: PriceDef | null | undefined): PriceCells {
  if (!def) return { tiers: 1, opaque: true }
  const s = summarize(def.mode, def.config, def.expression)
  if (s.kind === 'per_request') return { perRequest: s.price, tiers: 1 }
  if (s.kind === 'per_token') return { tokens: s.prices, tiers: 1 }
  if (s.kind === 'visual') {
    const v = hasVisualConfig(def.config) ? normalizeVisual(def.config) : parseExpression(def.expression)
    const first = v?.tiers[0]
    if (first) return { tokens: tokenPricesFrom(first), tiers: s.tiers }
  }
  return { tiers: 1, opaque: true }
}

/** "$3": a price per 1M tokens or per request, times `rate`. */
export function priceText(v: number | null | undefined, rate = 1): string {
  return v === null || v === undefined ? '—' : `$${Number((num(v) * rate).toFixed(4))}`
}

/** "$3 / $15": input and output of a price, or its per-request price; '' when it cannot be broken down. */
export function priceBrief(def: PriceDef | null | undefined, rate = 1): string {
  const c = priceCells(def)
  if (c.perRequest !== undefined) return priceText(c.perRequest, rate)
  return c.tokens ? `${priceText(c.tokens.p, rate)} / ${priceText(c.tokens.c, rate)}` : ''
}

/** The token prices a custom per-token rule may set, in the order shown. */
export const RULE_TOKEN_VARS = TOKEN_VARS
