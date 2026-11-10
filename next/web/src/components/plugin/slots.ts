import type { AccountType } from '@/api/types'
import type { SlotEntry } from '@/stores/plugins'

/** "<plugin>:<component>": identifies a slot entry. */
export const slotKey = (e: Pick<SlotEntry, 'pluginKey' | 'name'>) => `${e.pluginKey}:${e.name}`

/**
 * Whether a plugin extension limited by `accountTypes` is for this account
 * or account type: every one when it lists none, otherwise only the declaring
 * plugin's types listed. Used by account.editor.section entries
 * (docs/COMMON-CONTROLS.md §4), and by account.detail.tabs and
 * account.list.quota entries and declared account actions (CONTRACTS §91b).
 */
export const forAccountType = (e: { pluginKey: string; accountTypes?: string[] }, at: Pick<AccountType, 'plugin_key' | 'type'> | null | undefined) =>
  !e.accountTypes?.length || (!!at && at.plugin_key === e.pluginKey && e.accountTypes.includes(at.type))
