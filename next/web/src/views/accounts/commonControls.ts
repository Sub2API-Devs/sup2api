// Common account controls (docs/COMMON-CONTROLS.md §1, §2): what an account
// type declares about each core field — shown or hidden, editable or fixed,
// a new account's default, a locked value, a required proxy. The account
// editor, its save pipeline, the list and the bulk edit read the declaration
// only through these helpers; none of them knows a plugin.
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Account, AccountType, CommonControlName } from '@/api/types'

export type { CommonControlName } from '@/api/types'

export const COMMON_CONTROLS: readonly CommonControlName[] = [
  'schedulable', 'auto_disable', 'priority', 'weight', 'max_concurrency', 'rpm_limit', 'tpm_limit', 'spm_limit',
  'model_limits', 'usage_limit', 'model_mapping', 'param_override', 'header_passthrough', 'environment', 'proxy'
]

/** Values of the controls, in the account API's shapes. */
export type ControlValues = Partial<Record<CommonControlName, unknown>>

/** The resolved declaration of one control. */
export interface AccountControl {
  visible: boolean
  /** The value may be changed: configurable and not locked. */
  configurable: boolean
  locked: boolean
  required: boolean
  /** Declared default (undefined: the core's). */
  default: unknown
}

/** What a control looks like in a form: hidden, disabled with a reason, required. */
export interface ControlView {
  visible: boolean
  disabled: boolean
  required: boolean
  /** Why it is disabled ('' when editable): replaces the control's hint. */
  reason: string
}

export function accountControl(type: AccountType | null | undefined, name: CommonControlName): AccountControl {
  const d = type?.common_controls?.[name] ?? {}
  // proxy only supports `required` (§1).
  if (name === 'proxy') return { visible: true, configurable: true, locked: false, required: !!d.required, default: undefined }
  const locked = !!d.locked
  return { visible: d.visible ?? true, configurable: (d.configurable ?? true) && !locked, locked, required: false, default: d.default }
}

/** The view of every control for a form (pure; `t` resolves the reason). */
export function controlViews(type: AccountType | null | undefined, t: (key: string) => string): Record<CommonControlName, ControlView> {
  const view = (name: CommonControlName): ControlView => {
    const c = accountControl(type, name)
    const reason = c.locked ? t('accounts.editorUi.commonControlLocked') : c.configurable ? '' : t('accounts.editorUi.commonControlFixed')
    return { visible: c.visible, disabled: !c.configurable, required: c.required, reason }
  }
  return Object.fromEntries(COMMON_CONTROLS.map(n => [n, view(n)])) as Record<CommonControlName, ControlView>
}

/** controlViews of a reactive account type. */
export function useCommonControls(type: MaybeRefOrGetter<AccountType | null | undefined>) {
  const { t } = useI18n()
  return computed(() => controlViews(toValue(type), t))
}

const pick = (type: AccountType | null | undefined, keep: (c: AccountControl) => boolean): ControlValues =>
  Object.fromEntries(
    COMMON_CONTROLS.map(n => [n, accountControl(type, n)] as const)
      .filter(([, c]) => c.default !== undefined && keep(c))
      .map(([n, c]) => [n, c.default])
  )

/** Declared defaults. */
export const declaredDefaults = (type: AccountType | null | undefined) => pick(type, () => true)

/** Locked values: what a saved account shows whatever it stored. */
export const lockedValues = (type: AccountType | null | undefined) => pick(type, c => c.locked)

/** A new account's values: core defaults, then the plugin's default_limits (§68.5), then the declared defaults. */
export function newAccountValues(type: AccountType | null | undefined, core: ControlValues): ControlValues {
  const limits = Object.fromEntries(Object.entries(type?.default_limits ?? {}).filter(([, v]) => v !== undefined))
  return { ...core, ...limits, ...declaredDefaults(type) }
}

/** A saved account's values: its own (absent ones fall back to `core`), with the locked ones on top. */
export function savedAccountValues(a: Account, type: AccountType | null | undefined, core: ControlValues): ControlValues {
  const own = Object.fromEntries(Object.keys(core).map(n => [n, a[n as keyof Account]]).filter(([, v]) => v != null))
  return { ...core, ...own, ...lockedValues(type) }
}

/** The model mapping a new account starts from: the declared default, else the plugin's default_model_mapping (§41). */
export function defaultMappingOf(type: AccountType | null | undefined): Record<string, string> {
  return (accountControl(type, 'model_mapping').default as Record<string, string> | undefined) ?? type?.default_model_mapping ?? {}
}

/** Drops the request fields the type does not let change: the server fills (create) or keeps (update) them. */
export function withoutFixed(body: Record<string, unknown>, type: AccountType | null | undefined): Record<string, unknown> {
  return Object.fromEntries(Object.entries(body).filter(([k]) => !COMMON_CONTROLS.includes(k as CommonControlName) || accountControl(type, k as CommonControlName).configurable))
}

/** How many of the accounts have a type that fixes the control (bulk edit). */
export function fixedCount(accounts: Account[], typeOf: (a: Account) => AccountType | undefined, name: CommonControlName): number {
  return accounts.filter(a => !accountControl(typeOf(a), name).configurable).length
}
