// Price rules while they are edited: the rule a mode starts from, whether a
// rule may be saved, and the unsaved rules of a model price table: what its
// rows show meanwhile and what saving sends.
import type { ModelPriceRow, PriceDef, PriceRule, PriceRulePatch, PriceSource } from '@/api/pricing'
import { RULE_TOKEN_VARS, applyRule, priceCells, validRate } from './pricingFormat'

/** The rule of a row a table edits: the group's own, or that of the segment asked for. */
export type RuleScope = 'group' | 'segment'

export const ruleOf = (row: ModelPriceRow, scope: RuleScope): PriceRule | null => (scope === 'segment' ? row.segment_rule : row.group_rule) ?? null

/**
 * The prices a custom rule sets, in the order shown: the first `required` of
 * them must be filled. The server checks a saved rule by the same table
 * (CUSTOM_PRICES in mock/pricing.ts stands in for it): keep the two alike.
 */
export function customFields(mode: 'per_request' | 'per_token'): { keys: readonly string[]; required: number } {
  return mode === 'per_request' ? { keys: ['price'], required: 1 } : { keys: RULE_TOKEN_VARS, required: 2 }
}

/** The rule a mode starts from: ×1, or the global price as a price of its own. An expression price takes a multiplier only. */
export function startRule(kind: PriceRule['kind'], base: PriceDef): PriceRule {
  if (kind === 'multiplier' || base.mode === 'expression') return { kind: 'multiplier', multiplier: '1' }
  const cells = priceCells(base)
  const start: Record<string, number | null | undefined> = { ...cells.tokens, price: cells.perRequest }
  return { kind: 'custom', mode: base.mode, config: Object.fromEntries(customFields(base.mode).keys.map((k) => [k, start[k] ?? null])) }
}

const isPrice = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0

/** Whether a rule may be saved: a multiplier is a rate; a custom price has its required prices and none negative. */
export function validRule(rule: PriceRule | null): boolean {
  if (!rule) return true
  if (rule.kind === 'multiplier') return validRate(rule.multiplier)
  const { keys, required } = customFields(rule.mode)
  return keys.every((k, i) => isPrice(rule.config[k]) || (i >= required && (rule.config[k] ?? null) === null))
}

const sameRate = (a: string, b: string) => (validRate(a) && validRate(b) ? Number(a) === Number(b) : a === b)

/** Rules that price alike: nothing to save between them. */
export function sameRule(a: PriceRule | null, b: PriceRule | null): boolean {
  if (!a || !b) return a === b
  if (a.kind === 'multiplier') return b.kind === 'multiplier' && sameRate(a.multiplier, b.multiplier)
  if (b.kind !== 'custom' || a.mode !== b.mode) return false
  return customFields(a.mode).keys.every((k) => (a.config[k] ?? null) === (b.config[k] ?? null))
}

/** A row as it reads with `rule` in `scope`: the list price and its source follow the first rule that applies. */
export function withRule(row: ModelPriceRow, scope: RuleScope, rule: PriceRule | null): ModelPriceRow {
  const next: ModelPriceRow = scope === 'segment' ? { ...row, segment_rule: rule } : { ...row, group_rule: rule }
  const applied = next.segment_rule ?? next.group_rule
  const source: PriceSource = next.segment_rule ? 'segment' : next.group_rule ? 'group' : 'global'
  return { ...next, list_price: applyRule(row.base, applied), source }
}

/** The unsaved rules of a table by model; null removes the saved one. */
export type RuleDrafts = ReadonlyMap<string, PriceRule | null>

/** A row of the table: the saved row under its draft. */
export interface DraftedRow extends ModelPriceRow {
  /** The rule on the server, which a draft is compared with. */
  saved: PriceRule | null
  dirty: boolean
}

export function draftedRow(row: ModelPriceRow, scope: RuleScope, drafts: RuleDrafts): DraftedRow {
  const saved = ruleOf(row, scope)
  if (!drafts.has(row.model)) return { ...row, saved, dirty: false }
  return { ...withRule(row, scope, drafts.get(row.model) ?? null), saved, dirty: true }
}

/** The drafts with `rule` on `row`; a rule that prices like the saved one is no draft. */
export function setDraft(drafts: RuleDrafts, row: Pick<DraftedRow, 'model' | 'saved'>, rule: PriceRule | null): RuleDrafts {
  const next = new Map(drafts)
  if (sameRule(rule, row.saved)) next.delete(row.model)
  else next.set(row.model, rule)
  return next
}

/** What saving the drafts sends; `segmentId` null = the group's own rules. */
export function rulePatches(drafts: RuleDrafts, segmentId: number | null): PriceRulePatch[] {
  return [...drafts].map(([model, rule]) => ({ segment_id: segmentId, model, rule }))
}
