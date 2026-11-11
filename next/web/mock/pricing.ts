// Mock handlers: group pricing. User groups ("segments"), their grants and
// rates per group, the model prices of a group, personal segments, the price
// quote and the caller's own prices. State and resolution live in
// pricingStore.ts; the handlers here read the request, call it and build the
// API rows.
import { fail, noContent, on, paginate, type MockHandler, type MockRequest, type MockResult } from './router'
import { caller, hasPerm } from './core'
import { groupPlatforms } from './accounts'
import { globalPrice, money, priceCost, pricedModels, type PriceDef } from './billing'
import { groupModels, groups, invalid, match, myGroups, userOut, users, type MockGroup, type MockUser } from './resources'
import {
  accessOf,
  addSegment,
  defaultSegment,
  findSegment,
  grantedGroupIds,
  listPriceOf,
  makePersonal,
  moveUser,
  pairsWhere,
  rateOf,
  rateOverrideOf,
  removeSegment,
  rulesWhere,
  segmentOfUser,
  segmentRef,
  segments,
  setPair,
  setRule,
  type MockSegment,
  type PriceRule
} from './pricingStore'

// ------------------------------------------------------------------ routing helpers

/** Registers a handler that needs the permission `perm`. */
function route(method: string, path: string, perm: string, handler: MockHandler) {
  on(method, path, (req) => (hasPerm(caller(req), perm) ? handler(req) : fail(403, 'permission_denied', `${perm} is required`, { permission: perm })))
}

/** A handler on the row `find` gives for the request; 404 when there is none. */
function onRow<T>(what: string, find: (req: MockRequest) => T | undefined, handler: (row: T, req: MockRequest) => MockResult): MockHandler {
  return (req) => {
    const row = find(req)
    return row ? handler(row, req) : fail(404, 'not_found', `${what} not found`)
  }
}

const idOf = (req: MockRequest) => Number(req.params.id)
const onSegment = (handler: (s: MockSegment, req: MockRequest) => MockResult) => onRow('user group', (req) => findSegment(idOf(req)), handler)
const onGroup = (handler: (g: MockGroup, req: MockRequest) => MockResult) => onRow('group', (req) => groups.find((g) => g.id === idOf(req)), handler)
const onUser = (handler: (u: MockUser, req: MockRequest) => MockResult) => onRow('user', (req) => users.find((u) => u.id === idOf(req)), handler)

/** A rate, a discount or a multiplier: a non-negative decimal. */
const validRate = (v: unknown) => /^\d+(\.\d+)?$/.test(String(v))
const itemsOf = (req: MockRequest): any[] => (Array.isArray(req.body?.items) ? req.body.items : [])

// ------------------------------------------------------------------ rows

const membersOf = (s: MockSegment) => users.filter((u) => segmentOfUser(u.id).id === s.id)
const namedFirst = (a: MockSegment, b: MockSegment) => Number(a.kind === 'personal') - Number(b.kind === 'personal')

function segmentOut(s: MockSegment) {
  const granted = grantedGroupIds(s.id)
  return {
    ...segmentRef(s),
    description: s.description,
    discount: s.discount,
    is_default: s.is_default,
    member_count: membersOf(s).length,
    granted_groups: groups.filter((g) => g.visibility === 'restricted' && granted.includes(g.id)).map((g) => ({ id: g.id, name: g.name })),
    rate_override_count: pairsWhere({ segment_id: s.id }).filter((p) => p.rate_override !== null).length,
    price_rule_count: rulesWhere({ segment_id: s.id }).length,
    ...(s.kind === 'personal' ? personalOut(s) : {}),
    created_at: s.created_at
  }
}

/** What only a personal segment has: its user, and the segment that user came from. */
function personalOut(s: MockSegment) {
  const u = users.find((x) => x.id === s.user_id)
  const origin = findSegment(s.origin_id)
  return { user: u && { id: u.id, email: u.email, display_name: u.display_name }, origin: origin ? segmentRef(origin) : null }
}

/** The settings of one segment in one group. */
function settingOut(s: MockSegment, g: MockGroup) {
  const access = accessOf(s, g)
  return {
    segment: segmentRef(s),
    group: { id: g.id, name: g.name, description: g.description, status: g.status, visibility: g.visibility, rate_multiplier: g.rate_multiplier, platforms: groupPlatforms(g.id) },
    accessible: access.accessible,
    granted: access.granted,
    rate_override: rateOverrideOf(s.id, g.id),
    rate: rateOf(s, g),
    price_rule_count: rulesWhere({ segment_id: s.id, group_id: g.id }).length,
    member_count: membersOf(s).length
  }
}

const segmentSettings = (s: MockSegment) => groups.map((g) => settingOut(s, g))

/** A personal segment is listed in a group only when it has something there. */
const hasSettingsIn = (s: MockSegment, g: MockGroup) => pairsWhere({ segment_id: s.id, group_id: g.id }).length + rulesWhere({ segment_id: s.id, group_id: g.id }).length > 0

/** The rows of a group: `include` (?include=<id>,<id>) keeps personal segments that have nothing there yet. */
function groupSettings(g: MockGroup, include: number[] = []) {
  return segments
    .filter((s) => s.kind === 'named' || hasSettingsIn(s, g) || include.includes(s.id))
    .sort(namedFirst)
    .map((s) => settingOut(s, g))
}

/** One model of a group: its global price, the rules on it and the list price `s` (or anyone, when null) gets. */
function modelRow(g: MockGroup, s: MockSegment | null, model: string) {
  const base = globalPrice(model)
  const { group_rule, segment_rule, list_price, source } = listPriceOf(s, g.id, model, base)
  const ofSegments = s ? { segment_rule } : { segment_rule_count: rulesWhere({ group_id: g.id, model }).filter((r) => r.segment_id !== null).length }
  return { model, base, group_rule, ...ofSegments, list_price, source }
}

function modelPrices(g: MockGroup, s: MockSegment | null) {
  return { group: { id: g.id, name: g.name }, ...(s ? { segment: segmentRef(s) } : {}), rate: rateOf(s, g), models: groupModels(g).map((m) => modelRow(g, s, m)) }
}

// ------------------------------------------------------------------ segments

function segmentMatches(s: MockSegment, q: Record<string, string>) {
  if (s.kind !== (q.kind === 'personal' ? 'personal' : 'named')) return false
  const u = users.find((x) => x.id === s.user_id)
  return match(q.q, s.name, s.description, u?.display_name)
}

/** The first invalid field of a segment body; `self` is the segment being edited. */
function segmentError(b: any, self?: MockSegment) {
  const name = String(b.name ?? '').trim()
  if (self?.kind === 'personal' && (b.name !== undefined || b.description !== undefined)) return invalid('name', 'a personal user group only has a discount')
  if (b.name !== undefined && !name) return invalid('name', 'name is required')
  if (name && segments.some((s) => s !== self && s.kind === 'named' && s.name === name)) return invalid('name', 'name already in use')
  if (b.discount !== undefined && !(validRate(b.discount) && Number(b.discount) > 0)) return invalid('discount', 'must be a positive number')
  return null
}

route('GET', '/segments', 'segment:read', (req) => {
  const rows = segments.filter((s) => segmentMatches(s, req.query)).sort((a, b) => Number(b.is_default) - Number(a.is_default))
  return paginate(rows.map(segmentOut), req.query)
})
route('GET', '/segments/:id', 'segment:read', onSegment(segmentOut))
route('POST', '/segments', 'segment:manage', (req) => {
  const b = req.body || {}
  const err = segmentError({ ...b, name: b.name ?? '' })
  if (err) return err
  return segmentOut(addSegment(String(b.name).trim(), String(b.description ?? ''), String(b.discount ?? '1')))
})
route('PATCH', '/segments/:id', 'segment:manage', onSegment((s, req) => {
  const b = req.body || {}
  const err = segmentError(b, s)
  if (err) return err
  if (b.name !== undefined) s.name = String(b.name).trim()
  if (b.description !== undefined) s.description = String(b.description)
  if (b.discount !== undefined) s.discount = String(b.discount)
  return segmentOut(s)
}))
route('DELETE', '/segments/:id', 'segment:manage', onSegment((s) => {
  if (s.is_default) return fail(409, 'conflict', 'the default user group cannot be deleted')
  if (s.kind === 'personal') return fail(409, 'conflict', 'a personal user group is deleted by moving its user to a user group')
  removeSegment(s)
  return noContent()
}))

route('GET', '/segments/:id/members', 'segment:read', onSegment((s, req) => {
  const rows = membersOf(s).filter((u) => match(req.query.q, u.email, u.display_name))
  return paginate(rows.map(userOut), req.query)
}))
route('POST', '/segments/:id/members', 'segment:manage', onSegment((s, req) => {
  if (s.kind === 'personal') return fail(409, 'conflict', 'a personal user group has one member')
  const ids: number[] = Array.isArray(req.body?.user_ids) ? req.body.user_ids.map(Number) : []
  const unknown = ids.find((id) => !users.some((u) => u.id === id))
  if (unknown !== undefined) return invalid('user_ids', `unknown user ${unknown}`)
  return { moved: ids.filter((id) => moveUser(id, s)).length }
}))

// ------------------------------------------------------------------ grants and rates

/**
 * Checks and applies the changed pairs of a PUT, all or none. `pairOf` gives
 * the segment and the group an item is about; returns the error, if any.
 */
function savePairs(items: any[], pairOf: (item: any) => { s?: MockSegment; g?: MockGroup }) {
  const changes: Array<{ s: MockSegment; g: MockGroup; item: any }> = []
  for (const [i, item] of items.entries()) {
    const { s, g } = pairOf(item)
    if (!s || !g) return invalid(`items.${i}`, 'unknown user group or group')
    if (item.rate_override != null && !validRate(item.rate_override)) return invalid(`items.${i}.rate_override`, 'must be a non-negative number')
    changes.push({ s, g, item })
  }
  for (const { s, g, item } of changes) setPair(s.id, g.id, { granted: item.granted, rate_override: item.rate_override == null ? item.rate_override : String(item.rate_override) })
  return null
}

route('GET', '/segments/:id/groups', 'segment:read', onSegment(segmentSettings))
route('PUT', '/segments/:id/groups', 'segment:manage', onSegment((s, req) => {
  const err = savePairs(itemsOf(req), (item) => ({ s, g: groups.find((g) => g.id === Number(item.group_id)) }))
  return err ?? segmentSettings(s)
}))
const includedIn = (req: MockRequest) => String(req.query.include || '').split(',').filter(Boolean).map(Number)

route('GET', '/groups/:id/segments', 'group:read', onGroup((g, req) => groupSettings(g, includedIn(req))))
route('PUT', '/groups/:id/segments', 'group:manage', onGroup((g, req) => {
  const err = savePairs(itemsOf(req), (item) => ({ s: findSegment(Number(item.segment_id)), g }))
  return err ?? groupSettings(g, includedIn(req))
}))

// ------------------------------------------------------------------ model prices

/**
 * The prices a custom rule may set per mode; the first `required` of them
 * must be set. The console checks a rule by the same table before it saves
 * (customFields in src/components/pricing/ruleDrafts.ts): keep the two alike.
 */
const CUSTOM_PRICES = {
  per_request: { keys: ['price'], required: 1 },
  per_token: { keys: ['p', 'c', 'cr', 'cc', 'cc1h'], required: 2 }
}

/** Why a rule cannot be saved over the global price `base`; null when it can. */
function ruleError(rule: any, base: PriceDef | null): string | null {
  if (!base) return 'the model has no global price'
  if (rule?.kind === 'multiplier') return validRate(rule.multiplier) ? null : 'multiplier must be a non-negative number'
  if (rule?.kind !== 'custom') return 'rule must be a multiplier or a custom price'
  if (base.mode === 'expression') return 'an expression price takes a multiplier only'
  if (rule.mode !== base.mode) return `a custom price is ${base.mode}, as the global price`
  const { keys, required } = CUSTOM_PRICES[base.mode]
  const price = (k: string) => rule.config?.[k] ?? null
  if (keys.some((k) => price(k) !== null && !(Number.isFinite(price(k)) && price(k) >= 0))) return 'prices must be non-negative numbers'
  return keys.slice(0, required).every((k) => price(k) !== null) ? null : `${keys.slice(0, required).join(', ')} required`
}

/** Why an item of PUT /groups/:id/model-prices cannot be saved; removing a rule always can. */
function rulePatchError(g: MockGroup, item: any): string | null {
  if (item.segment_id != null && !findSegment(Number(item.segment_id))) return 'unknown user group'
  if (item.rule == null) return null
  if (!groupModels(g).includes(item.model)) return 'the group does not provide this model'
  return ruleError(item.rule, globalPrice(item.model))
}

/** A rule as it is stored: a decimal string, or the prices of its mode only. */
function storedRule(rule: any): PriceRule | null {
  if (rule == null) return null
  if (rule.kind === 'multiplier') return { kind: 'multiplier', multiplier: String(rule.multiplier) }
  const mode: 'per_request' | 'per_token' = rule.mode
  return { kind: 'custom', mode, config: Object.fromEntries(CUSTOM_PRICES[mode].keys.map((k) => [k, rule.config?.[k] ?? null])) }
}

/** A handler of /groups/:id/model-prices[?segment_id=]: `s` is the segment asked for (null without one); 404 when it does not exist. */
function onGroupPrices(handler: (g: MockGroup, s: MockSegment | null, req: MockRequest) => MockResult) {
  return onGroup((g, req) => {
    const s = req.query.segment_id ? findSegment(Number(req.query.segment_id)) : null
    return s === undefined ? fail(404, 'not_found', 'user group not found') : handler(g, s, req)
  })
}

route('GET', '/groups/:id/model-prices', 'group:read', onGroupPrices(modelPrices))
route('PUT', '/groups/:id/model-prices', 'group:manage', onGroupPrices((g, s, req) => {
  const items = itemsOf(req)
  for (const [i, item] of items.entries()) {
    const err = rulePatchError(g, item)
    if (err) return invalid(`items.${i}`, err)
  }
  for (const item of items) setRule(item.segment_id == null ? null : Number(item.segment_id), g.id, String(item.model), storedRule(item.rule))
  return modelPrices(g, s)
}))

// ------------------------------------------------------------------ personal segments

route('POST', '/users/:id/personal-segment', 'segment:manage', onUser((u, req) => {
  if (segmentOfUser(u.id).kind === 'personal') return fail(409, 'conflict', 'the user has a personal user group already')
  return segmentOut(makePersonal(u, !!req.body?.copy))
}))
route('DELETE', '/users/:id/personal-segment', 'segment:manage', onUser((u, req) => {
  if (segmentOfUser(u.id).kind !== 'personal') return fail(404, 'not_found', 'the user has no personal user group')
  const to = req.query.to ? findSegment(Number(req.query.to)) : defaultSegment()
  if (to?.kind !== 'named') return invalid('to', 'pick a user group')
  moveUser(u.id, to)
  return noContent()
}))

// ------------------------------------------------------------------ quote

/** Who a quote is for: the segment of `user_id`, else `segment_id`. */
function quoteSegment(b: any): MockSegment | undefined {
  if (b.user_id == null) return findSegment(Number(b.segment_id))
  return users.some((u) => u.id === Number(b.user_id)) ? segmentOfUser(Number(b.user_id)) : undefined
}

route('POST', '/pricing/quote', 'price:read', (req) => {
  const b = req.body || {}
  const s = quoteSegment(b)
  const g = groups.find((x) => x.id === Number(b.group_id))
  if (!s) return fail(404, 'not_found', 'user or user group not found')
  if (!g) return fail(404, 'not_found', 'group not found')
  if (!groupModels(g).includes(b.model)) return invalid('model', 'the group does not provide this model')
  const access = accessOf(s, g)
  const base = globalPrice(b.model)
  const price = listPriceOf(s, g.id, b.model, base)
  const rate = rateOf(s, g)
  const listCost = price.list_price ? priceCost(price.list_price, b.usage || {}) : 0
  return {
    segment: segmentRef(s),
    accessible: access.accessible,
    access_source: access.source,
    base,
    list_price: price.list_price,
    price_source: price.source,
    price_levels: { segment: price.segment_rule, group: price.group_rule },
    rate,
    rate_override: rateOverrideOf(s.id, g.id),
    list_cost: money(listCost),
    cost: money(listCost * Number(rate.value))
  }
})

// ------------------------------------------------------------------ the caller's prices

type MyGroup = ReturnType<typeof myGroups>[number]

/** Every model with a global price, at that price, with the caller's groups that provide it. */
function allPrices(mine: MyGroup[]) {
  const provided = mine.map((g) => ({ id: g.id, name: g.name, models: new Set(groupModels(g)) }))
  const groupsOf = (model: string) => provided.filter((g) => g.models.has(model)).map(({ id, name }) => ({ id, name }))
  return { group: null, rate_multiplier: '1', prices: pricedModels().map((model) => ({ model, ...globalPrice(model)!, groups: groupsOf(model) })) }
}

/** The models one of the caller's groups provides and can bill, at the list price and the rate the caller gets there. */
function groupPrices(g: MyGroup, s: MockSegment) {
  const prices = groupModels(g).flatMap((model) => {
    const { list_price, source } = listPriceOf(s, g.id, model, globalPrice(model))
    return list_price ? [{ model, ...list_price, source }] : []
  })
  return { group: { id: g.id, name: g.name }, rate_multiplier: g.effective_rate, rate_source: g.rate_source, prices }
}

// GET /me/prices (CONTRACTS §79.4): a group the caller cannot use is a 404.
on('GET', '/me/prices', (req) => {
  const who = caller(req)
  const mine = myGroups(who.id)
  if (!req.query.group_id) return allPrices(mine)
  const g = mine.find((x) => x.id === Number(req.query.group_id))
  return g ? groupPrices(g, segmentOfUser(who.id)) : fail(404, 'not_found', 'group not found')
})
