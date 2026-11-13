import { useAuthStore } from '@/stores/auth'
import { LEGACY_OWN, P, type PermRef, type ScopableKey } from '@/generated/permissions'

// Ownership of accounts and proxies (CONTRACTS §21.1): an "all" key
// (account:read, proxy:manage, ...) acts on every row, the matching "own" key
// (account:own:read, proxy:own:manage, ...) only on rows whose created_by is
// the caller. Rows with created_by = null (legacy data) are only reachable
// with the all-level key. The server enforces this in SQL; the console uses
// the same rule to show or hide row actions and columns.

export type OwnerScope = 'all' | 'own' | null

/** A row that carries an owner (Account, Proxy). */
export interface Owned {
  created_by?: number | null
}

/** An action's (all-level, own-level) key pair; the own-level key is the alias /me still lists. */
const pair = <K extends ScopableKey>(action: K) => [action, LEGACY_OWN[action]] as const

/** Permission key pairs (all-level, own-level) of the owned resources. */
export const ACCOUNT_KEYS = {
  read: pair(P.AccountRead),
  create: pair(P.AccountCreate),
  update: pair(P.AccountUpdate),
  delete: pair(P.AccountDelete),
  test: pair(P.AccountTest),
  reveal: pair(P.AccountCredentialView)
} as const

/** Single keys that widen what an own-level caller may set on an account (CONTRACTS §21). */
export const ACCOUNT_FIELD_KEYS = {
  relay: P.AccountRelay,
  groupBind: P.AccountGroupBind,
  groupManage: P.GroupManage,
  settingsCustom: P.AccountSettingsCustom
} as const

export const PROXY_KEYS = {
  read: pair(P.ProxyRead),
  manage: pair(P.ProxyManage)
} as const

/** Any of these opens the accounts page (menus, routes): the keys of its list, GET /accounts. */
export const ACCOUNT_PAGE_PERMS: PermRef[] = [...ACCOUNT_KEYS.read]
/** Any of these opens the proxies page: the keys of GET /proxies. */
export const PROXY_PAGE_PERMS: PermRef[] = [...PROXY_KEYS.read]

export function useOwnership() {
  const auth = useAuthStore()

  /** 'all' with the all-level key (or superuser), 'own' with only the own-level key, null with neither. */
  function scope(allKey: PermRef, ownKey: PermRef): OwnerScope {
    if (auth.has(allKey)) return 'all'
    if (auth.has(ownKey)) return 'own'
    return null
  }

  /** Whether the caller may act on `row` with either key. */
  function canOn(row: Owned | null | undefined, allKey: PermRef, ownKey: PermRef): boolean {
    const s = scope(allKey, ownKey)
    if (s === 'all') return true
    if (s === 'own') return isMine(row)
    return false
  }

  /** created_by is the caller (null / unknown owners are not "mine"). */
  function isMine(row: Owned | null | undefined): boolean {
    const me = auth.me?.id
    return me !== undefined && row?.created_by != null && row.created_by === me
  }

  /** Same as canOn for a [allKey, ownKey] pair. */
  function can(row: Owned | null | undefined, pair: readonly [PermRef, PermRef]): boolean {
    return canOn(row, pair[0], pair[1])
  }

  /** Same as scope for a [allKey, ownKey] pair. */
  function scopeOf(pair: readonly [PermRef, PermRef]): OwnerScope {
    return scope(pair[0], pair[1])
  }

  return { scope, scopeOf, canOn, can, isMine }
}
