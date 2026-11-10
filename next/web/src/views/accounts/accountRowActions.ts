// Row actions of the accounts list (CONTRACTS §52): the menu entries of a row
// (built from the caller's rights, the account's plugin actions and the
// declared plugin account actions) and their dispatch. The handlers come from
// the view, so the table here stays pure.
import type { Account, AccountAction } from '@/api/types'
import { forAccountType } from '@/components/plugin/slots'
import { i18n, lt } from '@/i18n'
import type { PluginAccountActionEntry } from '@/stores/plugins'

const t = (key: string) => i18n.global.t(key)

/** What a row menu entry needs from the view. */
export interface RowActionDeps {
  canReveal: (a: Account) => boolean
  canResetStatus: (a: Account) => boolean
  /** An automatically disabled account the caller may disable by hand (its switch is off, so the menu offers it). */
  canDisable: (a: Account) => boolean
  canRefreshCreds: (a: Account) => boolean
  canUpdate: (a: Account) => boolean
  canDelete: (a: Account) => boolean
  /** Accounts with a plugin action still running hide theirs. */
  running: (a: Account) => boolean
  openDetail: (a: Account) => unknown
  reveal: (a: Account) => unknown
  resetStatus: (a: Account) => unknown
  disable: (a: Account) => unknown
  refreshCreds: (a: Account) => unknown
  remove: (a: Account) => unknown
  runPluginAction: (a: Account, action: AccountAction) => unknown
  /** Declarative plugin account actions (manifest `ui.accountActions`, UI 3.6); `actionAppliesTo` says which rows offer one. */
  declaredActions: PluginAccountActionEntry[]
  runPluginAccountAction: (a: Account, entry: PluginAccountActionEntry) => unknown
}

/** Menu key of a declarative plugin account action (row menu and bulk bar alike). */
export const pluginAccountActionKey = (x: PluginAccountActionEntry) => `declared:${x.pluginKey}:${x.id}`

/**
 * Whether a declared plugin account action is offered on a row: never on an orphaned account, only on rows the caller
 * may update unless `visibleFor` is "all", and with `accountTypes` (UI 3.8) only on the plugin's listed types. The row
 * menu and the bulk bar both use it, so the bulk count is exactly the rows whose menu shows the action.
 */
export const actionAppliesTo = (x: PluginAccountActionEntry, a: Account, canUpdate: (a: Account) => boolean) =>
  !a.orphaned && (x.visibleFor === 'all' || canUpdate(a)) && forAccountType(x, a)

/** Menu entries of one row; `hidden` keeps them out of the menu. */
export function rowActions(a: Account, deps: RowActionDeps) {
  return [
    { key: 'detail', label: t('common.detail') },
    { key: 'reveal', label: t('accounts.revealCredentials'), hidden: !deps.canReveal(a) || a.orphaned },
    { key: 'reset-status', label: t('accounts.resetStatus'), hidden: !deps.canResetStatus(a) },
    { key: 'disable', label: t('accounts.listUi.disableByHand'), hidden: !deps.canDisable(a) },
    { key: 'refresh-credentials', label: t('accounts.credRefresh.action'), hidden: !deps.canRefreshCreds(a) },
    ...(a.actions || []).map((x) => ({ key: `plugin:${x.plugin_key}:${x.id}`, label: lt(x.label) || x.id, hidden: !deps.canUpdate(a) || a.orphaned || deps.running(a) })),
    ...deps.declaredActions.map((x) => ({ key: pluginAccountActionKey(x), label: lt(x.label) || x.id, icon: x.icon, danger: x.danger, hidden: !actionAppliesTo(x, a, deps.canUpdate) })),
    { key: 'delete', label: t('common.delete'), danger: true, hidden: !deps.canDelete(a) }
  ]
}

/** View handler of each non-plugin entry (built once; handlers still come from the view). */
const HANDLERS: Record<string, (a: Account, deps: RowActionDeps) => unknown> = {
  detail: (a, deps) => deps.openDetail(a),
  reveal: (a, deps) => deps.reveal(a),
  'reset-status': (a, deps) => deps.resetStatus(a),
  disable: (a, deps) => deps.disable(a),
  'refresh-credentials': (a, deps) => deps.refreshCreds(a),
  delete: (a, deps) => deps.remove(a)
}

/** Runs a menu entry of one row: a plugin action by key (the account's or a declared one), otherwise a view handler. */
export function runRowAction(a: Account, key: string, deps: RowActionDeps) {
  const action = a.actions?.find((x) => `plugin:${x.plugin_key}:${x.id}` === key)
  if (action) return deps.runPluginAction(a, action)
  const declared = deps.declaredActions.find((x) => pluginAccountActionKey(x) === key)
  if (declared) return deps.runPluginAccountAction(a, declared)
  return HANDLERS[key]?.(a, deps)
}
