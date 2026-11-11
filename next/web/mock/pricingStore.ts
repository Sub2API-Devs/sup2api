// Group pricing, the state and how it resolves: user groups ("segments"),
// the private groups they are granted, and the rate and the list price a
// segment gets in a group.
//
//   paid = list price × rate
//
// Users and groups are known here by id only; resources.ts and pricing.ts put
// the API rows together.
import { nextId, now } from './router'
import { configPrice, scalePrice, type PriceDef } from './billing'

export type RateSource = 'segment' | 'discount' | 'group'
export type PriceSource = 'segment' | 'group' | 'global'

export type PriceRule =
  | { kind: 'multiplier'; multiplier: string }
  | { kind: 'custom'; mode: 'per_request' | 'per_token'; config: Record<string, number | null> }

export interface MockSegment {
  id: number
  kind: 'named' | 'personal'
  /** A personal segment carries the email of its user. */
  name: string
  description: string
  discount: string
  is_default: boolean
  /** Personal only: its one member, and the segment that user came from. */
  user_id?: number
  origin_id?: number | null
  created_at: string
}

/** What resolving needs of a group. */
export interface PricedGroup {
  id: number
  visibility: 'public' | 'restricted'
  rate_multiplier: string
}

/** One segment in one group: the grant (it matters for a private group) and the rate override. */
interface Pair {
  segment_id: number
  group_id: number
  granted: boolean
  rate_override: string | null
}

/** A model price of a group (`segment_id` null) or of a segment in a group. */
interface RuleRow {
  segment_id: number | null
  group_id: number
  model: string
  rule: PriceRule
}

// ------------------------------------------------------------------ state

const DEFAULT = 1
const VIP = 2
const ENTERPRISE = 3
const INTERNAL = 4
const PERSONAL_104 = 11
const PERSONAL_107 = 12

export const segments: MockSegment[] = [
  { id: DEFAULT, kind: 'named', name: '默认', description: '注册后自动加入', discount: '1', is_default: true, created_at: now(-86400 * 90) },
  { id: VIP, kind: 'named', name: 'VIP', description: '充值满 $200 的老客户', discount: '0.9', is_default: false, created_at: now(-86400 * 45) },
  { id: ENTERPRISE, kind: 'named', name: '企业客户', description: '签了合同的公司', discount: '1', is_default: false, created_at: now(-86400 * 30) },
  { id: INTERNAL, kind: 'named', name: '内部', description: '自己人和测试号', discount: '1', is_default: false, created_at: now(-86400 * 20) },
  { id: PERSONAL_104, kind: 'personal', name: 'user5@example.org', description: '', discount: '0.9', is_default: false, user_id: 104, origin_id: VIP, created_at: now(-86400 * 6) },
  { id: PERSONAL_107, kind: 'personal', name: 'user8@example.org', description: '', discount: '1', is_default: false, user_id: 107, origin_id: DEFAULT, created_at: now(-86400 * 2) }
]

/** User id -> segment id. A user without an entry is in the default segment, as a new user is. */
const membership = new Map<number, number>([
  [1, VIP],
  [2, INTERNAL],
  [3, INTERNAL],
  [4, ENTERPRISE],
  [102, VIP],
  [103, VIP],
  [104, PERSONAL_104],
  [107, PERSONAL_107]
])

// Groups 1 default (public), 2 vip (private), 3 haiku-only (private).
const pairs: Pair[] = [
  { segment_id: VIP, group_id: 2, granted: true, rate_override: '0.7' },
  { segment_id: ENTERPRISE, group_id: 2, granted: true, rate_override: null },
  { segment_id: PERSONAL_104, group_id: 2, granted: true, rate_override: '0.65' },
  { segment_id: PERSONAL_107, group_id: 2, granted: true, rate_override: null },
  { segment_id: INTERNAL, group_id: 3, granted: true, rate_override: null },
  { segment_id: INTERNAL, group_id: 1, granted: false, rate_override: '0.5' }
]

const rules: RuleRow[] = [
  { segment_id: null, group_id: 1, model: 'gpt-4o', rule: { kind: 'multiplier', multiplier: '1.2' } },
  { segment_id: null, group_id: 1, model: 'web-search', rule: { kind: 'custom', mode: 'per_request', config: { price: 0.008 } } },
  { segment_id: null, group_id: 2, model: 'claude-haiku-4-5', rule: { kind: 'custom', mode: 'per_token', config: { p: 0.8, c: 4, cr: 0.08, cc: 1 } } },
  { segment_id: VIP, group_id: 1, model: 'gpt-4o-mini', rule: { kind: 'multiplier', multiplier: '0.8' } },
  { segment_id: ENTERPRISE, group_id: 2, model: 'claude-haiku-4-5', rule: { kind: 'custom', mode: 'per_token', config: { p: 0.7, c: 3.5, cr: 0.07, cc: 0.9 } } },
  // An expression price takes a multiplier only.
  { segment_id: PERSONAL_104, group_id: 2, model: 'claude-sonnet-4-5', rule: { kind: 'multiplier', multiplier: '0.9' } }
]

// ------------------------------------------------------------------ reads

/** Rows whose fields equal those of `by`. */
function where<T extends object>(rows: T[], by: Partial<T>): T[] {
  const want = Object.entries(by) as Array<[keyof T, unknown]>
  return rows.filter((row) => want.every(([k, v]) => row[k] === v))
}

export const pairsWhere = (by: Partial<Pair>) => where(pairs, by)
export const rulesWhere = (by: Partial<RuleRow>) => where(rules, by)

export function findSegment(id: number | null | undefined): MockSegment | undefined {
  return segments.find((s) => s.id === id)
}

export function defaultSegment(): MockSegment {
  return segments.find((s) => s.is_default)!
}

/** The one segment a user belongs to. */
export function segmentOfUser(userId: number): MockSegment {
  return findSegment(membership.get(userId)) ?? defaultSegment()
}

/** A segment as other rows refer to it. */
export function segmentRef(s: MockSegment) {
  return { id: s.id, kind: s.kind, name: s.name, ...(s.kind === 'personal' ? { user_id: s.user_id } : {}) }
}

/** The groups a segment is granted, public ones included. */
export function grantedGroupIds(segmentId: number): number[] {
  return pairsWhere({ segment_id: segmentId, granted: true }).map((p) => p.group_id)
}

export function rateOverrideOf(segmentId: number, groupId: number): string | null {
  return pairsWhere({ segment_id: segmentId, group_id: groupId })[0]?.rate_override ?? null
}

/** Who a group is granted to: the named segments, and how many personal ones. */
export function groupAccess(groupId: number) {
  const ids = new Set(pairsWhere({ group_id: groupId, granted: true }).map((p) => p.segment_id))
  const granted = segments.filter((s) => ids.has(s.id))
  return { segments: granted.filter((s) => s.kind === 'named').map(segmentRef), personal_count: granted.filter((s) => s.kind === 'personal').length }
}

/** How many model prices a group has: its own, and those of segments in it. */
export function groupRuleCounts(groupId: number) {
  const own = rulesWhere({ group_id: groupId, segment_id: null }).length
  return { price_rule_count: own, segment_rule_count: rulesWhere({ group_id: groupId }).length - own }
}

// ------------------------------------------------------------------ resolving

/** A decimal as the API writes a rate. */
const decimal = (n: number) => String(Number(n.toFixed(6)))

/** Whether a segment may use a group: public, or granted. */
export function accessOf(s: MockSegment, g: PricedGroup): { accessible: boolean; granted: boolean; source: 'public' | 'grant' | 'none' } {
  const granted = pairsWhere({ segment_id: s.id, group_id: g.id, granted: true }).length > 0
  if (g.visibility === 'public') return { accessible: true, granted, source: 'public' }
  return { accessible: granted, granted, source: granted ? 'grant' : 'none' }
}

/**
 * The rate of a segment in a group, first hit: its override there, the
 * group's default times its discount, the group's default. Without a segment
 * it is the group's default.
 */
export function rateOf(s: MockSegment | null, g: PricedGroup): { value: string; source: RateSource; group_default: string; discount: string } {
  const levels = { group_default: g.rate_multiplier, discount: s?.discount ?? '1' }
  const override = s ? rateOverrideOf(s.id, g.id) : null
  if (override !== null) return { ...levels, value: override, source: 'segment' }
  if (Number(levels.discount) !== 1) return { ...levels, value: decimal(Number(g.rate_multiplier) * Number(levels.discount)), source: 'discount' }
  return { ...levels, value: g.rate_multiplier, source: 'group' }
}

/** The list price a rule gives over the global price `base`. */
export function applyRule(base: PriceDef | null, rule: PriceRule | null): PriceDef | null {
  if (!rule) return base
  if (rule.kind === 'custom') return configPrice(rule.mode, rule.config)
  return base && scalePrice(base, Number(rule.multiplier))
}

/**
 * The list price of a model in a group for a segment, first hit: the rule of
 * the segment there, the rule of the group, the global price. Both rules are
 * returned as configured.
 */
export function listPriceOf(s: MockSegment | null, groupId: number, model: string, base: PriceDef | null) {
  const group_rule = rulesWhere({ segment_id: null, group_id: groupId, model })[0]?.rule ?? null
  const segment_rule = (s && rulesWhere({ segment_id: s.id, group_id: groupId, model })[0]?.rule) || null
  const source: PriceSource = segment_rule ? 'segment' : group_rule ? 'group' : 'global'
  return { group_rule, segment_rule, source, list_price: applyRule(base, segment_rule ?? group_rule) }
}

const GLOB_SPECIALS = /[.+^${}()|[\]\\]/g

function globMatch(pattern: string, s: string): boolean {
  return new RegExp('^' + pattern.replace(GLOB_SPECIALS, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$').test(s)
}

/** The model policy of a group (core.GroupInfo.AllowsModel): an empty list allows every model. */
export function allowsModel(g: { model_allowlist: string[]; model_filter_mode?: 'whitelist' | 'blacklist' }, model: string): boolean {
  if (!g.model_allowlist.length) return true
  const listed = g.model_allowlist.some((p) => globMatch(p, model))
  return g.model_filter_mode === 'blacklist' ? !listed : listed
}

// ------------------------------------------------------------------ changes

/** Removes the rows `gone` picks, in place. */
function drop<T>(rows: T[], gone: (row: T) => boolean) {
  for (let i = rows.length - 1; i >= 0; i--) if (gone(rows[i])) rows.splice(i, 1)
}

/** Sets the grant and/or the rate override of a segment in a group; a field left undefined stays. */
export function setPair(segmentId: number, groupId: number, patch: { granted?: boolean; rate_override?: string | null }) {
  const cur = pairsWhere({ segment_id: segmentId, group_id: groupId })[0]
  const pair = cur ?? { segment_id: segmentId, group_id: groupId, granted: false, rate_override: null }
  if (patch.granted !== undefined) pair.granted = patch.granted
  if (patch.rate_override !== undefined) pair.rate_override = patch.rate_override
  if (!cur) pairs.push(pair)
  // A pair that says nothing is not kept.
  drop(pairs, (p) => !p.granted && p.rate_override === null)
}

/** Sets or (`rule` null) removes a model price; `segmentId` null = the group's own. */
export function setRule(segmentId: number | null, groupId: number, model: string, rule: PriceRule | null) {
  drop(rules, (r) => r.segment_id === segmentId && r.group_id === groupId && r.model === model)
  if (rule) rules.push({ segment_id: segmentId, group_id: groupId, model, rule })
}

export function addSegment(name: string, description: string, discount: string): MockSegment {
  const s: MockSegment = { id: nextId(), kind: 'named', name, description, discount, is_default: false, created_at: now() }
  segments.push(s)
  return s
}

/** Deletes a segment with its grants, rates and prices. Its members fall back to the default segment. */
export function removeSegment(s: MockSegment) {
  drop(pairs, (p) => p.segment_id === s.id)
  drop(rules, (r) => r.segment_id === s.id)
  drop(segments, (x) => x === s)
  for (const [userId, id] of membership) if (id === s.id) membership.delete(userId)
  for (const x of segments) if (x.origin_id === s.id) x.origin_id = null
}

/**
 * Gives a user a segment of their own. With `copy` it starts from what the
 * segment they leave has now (discount, grants, rates, prices); the two are
 * unrelated afterwards.
 */
export function makePersonal(user: { id: number; email: string }, copy: boolean): MockSegment {
  const from = segmentOfUser(user.id)
  const s: MockSegment = { id: nextId(), kind: 'personal', name: user.email, description: '', discount: copy ? from.discount : '1', is_default: false, user_id: user.id, origin_id: from.id, created_at: now() }
  segments.push(s)
  membership.set(user.id, s.id)
  if (!copy) return s
  pairs.push(...pairsWhere({ segment_id: from.id }).map((p) => ({ ...p, segment_id: s.id })))
  rules.push(...rulesWhere({ segment_id: from.id }).map((r) => ({ ...structuredClone(r), segment_id: s.id })))
  return s
}

/** Moves a user to a named segment; a personal segment they had is deleted. False when they are in it already. */
export function moveUser(userId: number, to: MockSegment): boolean {
  const from = segmentOfUser(userId)
  if (from.id === to.id) return false
  if (from.kind === 'personal') removeSegment(from)
  membership.set(userId, to.id)
  return true
}

/** A deleted user: out of their segment, and a personal one goes with them. */
export function forgetUser(userId: number) {
  const s = segmentOfUser(userId)
  if (s.kind === 'personal') removeSegment(s)
  membership.delete(userId)
}

/** A deleted group: its grants, rates and prices go with it. */
export function forgetGroup(groupId: number) {
  drop(pairs, (p) => p.group_id === groupId)
  drop(rules, (r) => r.group_id === groupId)
}
