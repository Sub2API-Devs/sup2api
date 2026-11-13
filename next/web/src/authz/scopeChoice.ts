// The scopes of one scoped action as the permission editors show them
// (CONTRACTS §21): every row, the caller's own, chosen groups, chosen rows,
// rows within a chosen group; scopes the editors do not offer (group/*,
// group/*/account/X) are kept as they are. Pure; PermissionTree / ScopePicker
// render it.
import { ALL_SCOPE, OWN_SCOPE, WILDCARD, parsePermission, patternKey, reduceScopes, scopeImplies, type Scope } from './implies'

export interface ScopeChoice {
  all: boolean
  own: boolean
  /** group/<id> */
  groups: number[]
  /** account/<id> or proxy/<id> */
  ids: number[]
  /** group/<g>/account/<id> as [g, id] */
  pairs: Array<[number, number]>
  /** Anything else held (group/*, group/X/account/*...): shown, removable, not offered. */
  other: Scope[]
}

const scope = (group: number, id: number): Scope => ({ all: false, own: false, group, id })

/** The choice the scopes make. */
export function choiceOf(scopes: readonly Scope[]): ScopeChoice {
  const c: ScopeChoice = { all: false, own: false, groups: [], ids: [], pairs: [], other: [] }
  for (const s of scopes) {
    if (s.all) c.all = true
    else if (s.own) c.own = true
    else if (s.group === WILDCARD) c.other.push(s)
    else if (s.group && s.id) c.pairs.push([s.group, s.id])
    else if (s.group) c.groups.push(s.group)
    else c.ids.push(s.id)
  }
  return c
}

/** The scopes of a choice, without those another implies (every row: only that). */
export function scopesOf(c: ScopeChoice): Scope[] {
  if (c.all) return [ALL_SCOPE]
  return reduceScopes([
    ...(c.own ? [OWN_SCOPE] : []),
    ...c.groups.map((g) => scope(g, 0)),
    ...c.ids.map((id) => scope(0, id)),
    ...c.pairs.map(([g, id]) => scope(g, id)),
    ...c.other
  ])
}

/** keys with the keys of action replaced by its scopes, canonical (none: the action is not granted). */
export function withScopes(keys: ReadonlySet<string>, action: string, scopes: readonly Scope[]): Set<string> {
  const next = new Set([...keys].filter((k) => parsePermission(k)?.action !== action))
  for (const s of scopes) next.add(patternKey({ action, scope: s }))
  return next
}

/** What the editor may offer from a list: every id ('any'), these ids, or none (null). */
export type Offer = 'any' | number[] | null

/**
 * The options a caller holding `limit` (its scopes of the action) may grant:
 * only what its scopes imply (the server refuses the rest, details.missing).
 */
export interface ScopeOffer {
  all: boolean
  own: boolean
  /** group/<id>, and the group of group/<id>/account/<x> (the account: any within it). */
  groups: Offer
  /** account/<id> or proxy/<id>. */
  ids: Offer
}

export function offerOf(limit: readonly Scope[]): ScopeOffer {
  const implied = (s: Scope) => limit.some((l) => scopeImplies(l, s))
  const all = implied(ALL_SCOPE)
  const anyGroup = implied(scope(WILDCARD, 0))
  const groups = limit.filter((l) => l.group > 0 && !l.id).map((l) => l.group)
  const ids = limit.filter((l) => !l.all && !l.own && !l.group).map((l) => l.id)
  const listed = (ok: boolean, list: number[]): Offer => (ok ? 'any' : list.length ? list : null)
  return {
    all,
    own: implied(OWN_SCOPE),
    groups: listed(anyGroup, groups),
    ids: listed(all, ids)
  }
}

/** The scopes ticking the action grants at first: the widest offered (every row, else the own rows), else none to choose from yet. */
export function defaultScopes(offer: ScopeOffer): Scope[] {
  if (offer.all) return [ALL_SCOPE]
  return offer.own ? [OWN_SCOPE] : []
}
