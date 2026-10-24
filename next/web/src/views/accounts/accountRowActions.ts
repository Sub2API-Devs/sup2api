// Row actions of the accounts list (CONTRACTS §52): the menu entries of a row
// (built from the caller's rights and the account's plugin actions) and their
// dispatch. The handlers come from the view, so the table here stays pure.
import type { Account, AccountAction } from '@/api/types'
import { i18n, lt } from '@/i18n'

const t = (key: string) => i18n.global.t(key)

/** What a row menu entry needs from the view. */
export interface RowActionDeps {
  canReveal: (a: Account) => boolean
  canResetStatus: (a: Account) => boolean
  canRefreshCreds: (a: Account) => boolean
  canUpdate: (a: Account) => boolean
  canDelete: (a: Account) => boolean
  /** Accounts with a plugin action still running hide theirs. */
  running: (a: Account) => boolean
  openDetail: (a: Account) => unknown
  reveal: (a: Account) => unknown
  resetStatus: (a: Account) => unknown
  refreshCreds: (a: Account) => unknown
  remove: (a: Account) => unknown
  runPluginAction: (a: Account, action: AccountAction) => unknown
}

/** Menu entries of one row; `hidden` keeps them out of the menu. */
export function rowActions(a: Account, deps: RowActionDeps) {
  return [
    { key: 'detail', label: t('common.detail') },
    { key: 'reveal', label: t('accounts.revealCredentials'), hidden: !deps.canReveal(a) || a.orphaned },
    { key: 'reset-status', label: t('accounts.resetStatus'), hidden: !deps.canResetStatus(a) },
    { key: 'refresh-credentials', label: t('accounts.credRefresh.action'), hidden: !deps.canRefreshCreds(a) },
    ...(a.actions || []).map((x) => ({ key: `plugin:${x.plugin_key}:${x.id}`, label: lt(x.label) || x.id, hidden: !deps.canUpdate(a) || a.orphaned || deps.running(a) })),
    { key: 'delete', label: t('common.delete'), danger: true, hidden: !deps.canDelete(a) }
  ]
}

/** View handler of each non-plugin entry (built once; handlers still come from the view). */
const HANDLERS: Record<string, (a: Account, deps: RowActionDeps) => unknown> = {
  detail: (a, deps) => deps.openDetail(a),
  reveal: (a, deps) => deps.reveal(a),
  'reset-status': (a, deps) => deps.resetStatus(a),
  'refresh-credentials': (a, deps) => deps.refreshCreds(a),
  delete: (a, deps) => deps.remove(a)
}

/** Runs a menu entry of one row: a plugin action by key, otherwise a view handler. */
export function runRowAction(a: Account, key: string, deps: RowActionDeps) {
  const action = a.actions?.find((x) => `plugin:${x.plugin_key}:${x.id}` === key)
  if (action) return deps.runPluginAction(a, action)
  return HANDLERS[key]?.(a, deps)
}
