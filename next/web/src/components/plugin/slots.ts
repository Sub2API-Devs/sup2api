import type { AccountType } from '@/api/types'
import type { SlotEntry } from '@/stores/plugins'

/** "<plugin>:<component>": identifies a slot entry. */
export const slotKey = (e: Pick<SlotEntry, 'pluginKey' | 'name'>) => `${e.pluginKey}:${e.name}`

/**
 * Whether an account.editor.section entry is for this account type
 * (docs/COMMON-CONTROLS.md §4): every type, or only the declaring plugin's
 * types listed in `accountTypes`.
 */
export const sectionFor = (e: SlotEntry, at: AccountType | null | undefined) =>
  !e.accountTypes?.length || (!!at && at.plugin_key === e.pluginKey && e.accountTypes.includes(at.type))
