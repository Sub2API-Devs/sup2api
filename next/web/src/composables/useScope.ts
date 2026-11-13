import { useAuthStore } from '@/stores/auth'
import { scopeAllowsRow, type ScopedRow } from '@/authz/implies'
import { P, type ScopableKey, type ScopedPermKey } from '@/generated/permissions'

// Resource scopes of accounts and proxies (CONTRACTS §21): an action key
// reaches every row (account:update), or the rows of its scope: own (those
// the caller created), group/<g> (accounts bound to the group), account/<id>,
// group/<g>/account/<id>, proxy/<id>. The server filters in SQL; the console
// uses the same rule (scopeAllowsRow, core.DataScope.AllowsRow) to show or
// hide row actions and columns.

/**
 * 'all' reaches every row; 'own' is the restricted tier, any narrower scope
 * (own, groups, ids), where the own-level limits apply (capped fields, the
 * administrator's lock); null reaches nothing.
 */
export type ScopeLevel = 'all' | 'own' | null

/** The scoped account actions. */
export const ACCOUNT_ACTIONS = {
  read: P.AccountRead,
  create: P.AccountCreate,
  update: P.AccountUpdate,
  delete: P.AccountDelete,
  test: P.AccountTest,
  reveal: P.AccountCredentialView
} as const

/** The scoped proxy actions. */
export const PROXY_ACTIONS = {
  read: P.ProxyRead,
  manage: P.ProxyManage
} as const

/**
 * Creating a proxy (also pasting a proxy URL, which may create one): the own
 * scope of proxy:manage or more; proxy/<id> reaches only existing proxies.
 */
export const PROXY_CREATE_KEY: ScopedPermKey = `${PROXY_ACTIONS.manage}:own`

/** Single keys that widen what a restricted caller may set on an account (CONTRACTS §21). */
export const ACCOUNT_FIELD_KEYS = {
  relay: P.AccountRelay,
  groupBind: P.AccountGroupBind,
  groupManage: P.GroupManage,
  settingsCustom: P.AccountSettingsCustom
} as const

export function useScope() {
  const auth = useAuthStore()

  /** How far action reaches for the caller. */
  function level(action: ScopableKey): ScopeLevel {
    if (auth.has(action)) return 'all'
    return auth.hasAction(action) ? 'own' : null
  }

  /** Whether one of the caller's scopes of action reaches row. */
  function can(row: ScopedRow | null | undefined, action: ScopableKey): boolean {
    return auth.scopes(action).some((s) => scopeAllowsRow(s, row, auth.me?.id))
  }

  return { level, can }
}
