// Scoped permission keys (CONTRACTS §21, wildcard permissions), the console's
// copy of server/internal/perm/pattern.go: an action key may end in a scope,
// "<action>:<scope>", that limits the rows it reaches:
//
//   scope = "*" | "own" | path
//   path  = account actions: "group/" seg [ "/account/" seg ] | "account/" id
//           proxy actions:   "proxy/" id
//   seg   = id | "*"
//
// A missing scope is "*": every row. The last segment of a key is a scope
// only when it is "*", "own" or holds a "/". Both copies run the shared
// vectors of next/sdk/permvectors/vectors.json (implies.spec.ts), so they
// cannot drift. Pure: no Vue, no store (the mock server imports it too).

/** The row kind the scope of an action ranges over (the catalog's scope_type). */
export type ScopeResource = 'account' | 'proxy'

/** The actions that take a scope, with their resource (perm.scopable). */
export const SCOPABLE: Readonly<Record<string, ScopeResource>> = {
  'account:read': 'account',
  'account:create': 'account',
  'account:update': 'account',
  'account:delete': 'account',
  'account:test': 'account',
  'account:credential:view': 'account',
  'proxy:read': 'proxy',
  'proxy:manage': 'proxy'
}

/** The former own-level keys and their scoped form: accepted as aliases (R2a); the only place they are spelled. */
const LEGACY_OWN: Readonly<Record<string, string>> = Object.fromEntries(
  Object.keys(SCOPABLE).map((action) => {
    const [resource, ...rest] = action.split(':')
    return [`${resource}:own:${rest.join(':')}`, `${action}:own`]
  })
)

/** A group segment of "*": any group. */
export const WILDCARD = -1

/**
 * A parsed, canonical scope. At most one of all and own is set, and then
 * group and id are 0. Otherwise group > 0 is group/<group>, WILDCARD is
 * group/*, 0 no group part; id > 0 is the row (account/<id>, proxy/<id>, or
 * after a group part group/<g>/account/<id>).
 */
export interface Scope {
  all: boolean
  own: boolean
  group: number
  id: number
}

/** A canonical key split into action and scope; unscoped keys have scope.all. */
export interface Pattern {
  action: string
  scope: Scope
}

export const ALL_SCOPE: Scope = Object.freeze({ all: true, own: false, group: 0, id: 0 })
export const OWN_SCOPE: Scope = Object.freeze({ all: false, own: true, group: 0, id: 0 })
const MAX_ID = 9223372036854775807n

/** Reads a key, aliases and trailing wildcards included, into its canonical pattern; null when it does not parse. */
export function parsePermission(key: string): Pattern | null {
  const k = LEGACY_OWN[key] ?? key
  const i = k.lastIndexOf(':')
  const last = k.slice(i + 1)
  if (i < 0 || (last !== '*' && last !== 'own' && !last.includes('/'))) return { action: k, scope: ALL_SCOPE }
  const action = k.slice(0, i)
  const resource = SCOPABLE[action]
  const scope = resource && parseScope(resource, action === 'account:create', last)
  return scope ? { action, scope } : null
}

/** The canonical spelling of key (aliases rewritten, trailing "/*" dropped, a scope of everything left out); null when invalid. */
export function canonicalPermission(key: string): string | null {
  const p = parsePermission(key)
  return p && patternKey(p)
}

function parseScope(resource: ScopeResource, create: boolean, raw: string): Scope | null {
  if (raw === '*') return ALL_SCOPE
  if (raw === 'own') return OWN_SCOPE
  const parts = trimWildcards(resource, raw.split('/'))
  if (parts.length === 0) return ALL_SCOPE
  let group = 0
  let id: number | null = 0
  if (resource === 'proxy') {
    if (parts.length !== 2 || parts[0] !== 'proxy') return null
    id = parseId(parts[1], false)
  } else if (parts.length === 2 && parts[0] === 'account') {
    id = parseId(parts[1], false)
  } else if (parts[0] === 'group' && (parts.length === 2 || (parts.length === 4 && parts[2] === 'account'))) {
    const g = parseId(parts[1], true)
    if (g === null) return null
    group = g
    if (parts.length === 4) id = parseId(parts[3], false)
  } else {
    return null
  }
  // An id range means nothing for creating a row.
  if (id === null || (create && id !== 0)) return null
  return { all: false, own: false, group, id }
}

/**
 * Drops the trailing "/*" of a scope path: a lone "*" ("group/12/*") and the
 * row type of the resource with "*" ("group/12/account/*", "account/*"), but
 * not a group's "*" (group/* is any group) and nothing else.
 */
function trimWildcards(resource: ScopeResource, parts: string[]): string[] {
  let n = parts.length
  while (n > 0 && parts[n - 1] === '*') {
    if (n % 2 === 1) n -= 1
    else if (parts[n - 2] === resource) n -= 2
    else break
  }
  return parts.slice(0, n)
}

/** A positive decimal int64 without leading zeros, or "*" (WILDCARD) when allowed; null otherwise. */
function parseId(raw: string, wildcard: boolean): number | null {
  if (wildcard && raw === '*') return WILDCARD
  if (!/^[1-9]\d{0,18}$/.test(raw) || BigInt(raw) > MAX_ID) return null
  return Number(raw)
}

/** The canonical scope text of a pattern of action: '' for everything (perm.Pattern.Suffix). */
export function scopeSuffix(action: string, s: Scope): string {
  if (s.all) return ''
  if (s.own) return 'own'
  const seg = (n: number) => (n === WILDCARD ? '*' : String(n))
  const row = s.id ? `${SCOPABLE[action]}/${seg(s.id)}` : ''
  if (!s.group) return row
  return row ? `group/${seg(s.group)}/${row}` : `group/${seg(s.group)}`
}

/** The canonical key of p. */
export function patternKey(p: Pattern): string {
  const suffix = scopeSuffix(p.action, p.scope)
  return suffix ? `${p.action}:${suffix}` : p.action
}

/**
 * Whether holding a scope grants want's (same action assumed): judged by the
 * text alone, never by where rows are now (group/12 does not imply
 * account/125 even while account 125 is in group 12). perm.Implies.
 */
export function scopeImplies(h: Scope, w: Scope): boolean {
  if (h.all) return true
  if (w.all) return false
  if (h.own || w.own) return h.own && w.own
  if (!h.group) return h.id === w.id // account/X or proxy/X: that row, with or without a group
  if (!w.group) return false // a group range never covers an ungrouped id
  if (h.group !== WILDCARD && h.group !== w.group) return false
  return !h.id || h.id === w.id
}

/** Whether holding have grants want. */
export function implies(have: Pattern, want: Pattern): boolean {
  return have.action === want.action && scopeImplies(have.scope, want.scope)
}

/** A row a scope is judged against: its id, creator and (accounts) groups. */
export interface ScopedRow {
  id?: number | null
  created_by?: number | null
  group_ids?: readonly number[] | null
}

/** Whether a scope reaches row for the caller me (core.DataScope.AllowsRow). */
export function scopeAllowsRow(s: Scope, row: ScopedRow | null | undefined, me: number | undefined): boolean {
  if (s.all) return true
  if (!row) return false
  if (s.own) return me !== undefined && row.created_by != null && row.created_by === me
  if (s.id && row.id !== s.id) return false
  if (!s.group) return !!s.id
  const groups = row.group_ids ?? []
  return s.group === WILDCARD ? groups.length > 0 : groups.includes(s.group)
}

/** What a list of held keys grants (the console's PermissionSet). */
export interface PermissionIndex {
  /** One of the held keys implies key (a key that does not parse is not held). */
  has(key: string): boolean
  /** The action is held at any scope. */
  hasAction(action: string): boolean
  /** The scopes held for action, without those another one implies; [] when not held. */
  scopes(action: string): Scope[]
}

/** Indexes held keys (canonical or not; invalid ones are ignored). */
export function permissionIndex(keys: readonly string[]): PermissionIndex {
  const byAction = new Map<string, Scope[]>()
  for (const k of keys) {
    const p = parsePermission(k)
    if (!p) continue
    byAction.set(p.action, [...(byAction.get(p.action) ?? []), p.scope])
  }
  for (const [action, list] of byAction) byAction.set(action, reduceScopes(list))
  return {
    has(key) {
      const want = parsePermission(key)
      return !!want && (byAction.get(want.action) ?? []).some((h) => scopeImplies(h, want.scope))
    },
    hasAction: (action) => byAction.has(action),
    scopes: (action) => byAction.get(action) ?? []
  }
}

/** list without duplicates and without a scope another one implies. */
export function reduceScopes(list: readonly Scope[]): Scope[] {
  const out: Scope[] = []
  list.forEach((s, i) => {
    const covered = list.some((o, j) => j !== i && scopeImplies(o, s) && (!scopeImplies(s, o) || j < i))
    if (!covered) out.push(s)
  })
  return out
}
