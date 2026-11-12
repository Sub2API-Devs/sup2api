import type { JSONSchema, MenuAction } from '@sub2api/ui'
import { fetchPluginSettings, savePluginSettings, toastError, useModHost } from './host'
import { displayValues, USER_LIST_KEYS, withRetiredMirrored } from './settingsForm'
import { mergeSettings } from './settingsMerge'
import type { UserList } from './types'

// Locked watch list entries (design D5, 0.10.0): a user on a user list of
// the settings has a locked entry, whose level the list fixes (blocklist =
// enforce, allowlist = observe) and which never expires. The settings stay
// the source of truth: locking or unlocking saves allowlist_user_ids /
// blocklist_user_ids, and the plugin mirrors them into the entries. The
// save re-reads the stored settings and writes back only the list that
// changed, the retired exempt_user_ids mirrored for older nodes, as the
// settings page does (settingsMerge.ts, withRetiredMirrored).

export const USER_LISTS: readonly UserList[] = ['blocklist', 'allowlist']

/** Lock on a list, or unlock. */
export type LockAction = UserList | 'unlock'

/** The list a user is on (a user on both is blocklisted, as the plugin reads them); null = neither. */
export const userListOf = (u: { allowlisted?: boolean; blocklisted?: boolean }): UserList | null => (u.blocklisted ? 'blocklist' : u.allowlisted ? 'allowlist' : null)

/** What can be done to a user on `current`: lock on another list; unlock when on one. */
export const lockActions = (current: UserList | null): LockAction[] => [...USER_LISTS.filter((l) => l !== current), ...(current ? (['unlock'] as const) : [])]

/**
 * The settings to PUT that put `userId` on `lock` alone (null = on neither
 * list), from the stored settings: the lists as the plugin reads them (the
 * allowlist from the retired key until saved); null when nothing changes.
 */
export function lockedSettings(schema: JSONSchema | null | undefined, stored: Record<string, unknown>, userId: number, lock: UserList | null): Record<string, unknown> | null {
  const keys = USER_LISTS.map((l) => USER_LIST_KEYS[l])
  const before = displayValues(schema, stored, keys)
  const id = String(userId)
  const after: Record<string, unknown> = {}
  for (const l of USER_LISTS) {
    const k = USER_LIST_KEYS[l]
    const list = Array.isArray(before[k]) ? (before[k] as unknown[]) : []
    const others = list.filter((x) => String(x) !== id)
    // a list the user is on already stays as it is
    after[k] = l !== lock ? others : others.length < list.length ? list : [...list, id]
  }
  const m = mergeSettings(keys, stored, stored, before, after)
  return m.changed.length ? withRetiredMirrored(m.values, m.changed) : null
}

/**
 * The lock actions of a user as menu items (keyed by LockAction), and `run`
 * for a picked one: confirms, saves the settings and toasts; resolves true
 * once saved (the caller reloads: the entry follows the settings).
 */
export function useUserLock() {
  const host = useModHost()
  const t = host.t
  const items = (current: UserList | null): MenuAction[] => lockActions(current).map((a) => ({ key: a, label: t(`lock.action.${a}`), icon: 'lock' }))
  /** false for a key that is not one of items(current), or when not confirmed or failed. */
  async function run(userId: number, key: string, current: UserList | null): Promise<boolean> {
    const action = lockActions(current).find((a) => a === key)
    if (!action) return false
    const message = t(`lock.confirm.${action}`, { id: userId, list: current ? t(`lists.name.${current}`) : '' })
    if (!(await host.confirm({ title: t(`lock.action.${action}`), message, confirmText: t('lock.save'), danger: action === 'blocklist' }))) return false
    try {
      const s = await fetchPluginSettings()
      const values = lockedSettings(s.schema, s.values || {}, userId, action === 'unlock' ? null : action)
      if (values) await savePluginSettings(values)
      host.toast(t(action === 'unlock' ? 'lock.unlocked' : 'lock.locked', { id: userId }), 'success')
      return true
    } catch (e) {
      toastError(e)
      return false
    }
  }
  return { items, run }
}
