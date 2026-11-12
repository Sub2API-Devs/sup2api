import type { MenuAction } from '@sub2api/ui'
import { lockWatch, toastError, unlockWatch, useModHost } from './host'
import type { UserList } from './types'

// Locked watch list entries (design D5): the allowlist and the blocklist
// are the locked entries of the watch list (0.11.0), whose level the list
// fixes (blocklist = enforce, allowlist = observe) and which never expire.
// Locking puts the user's entry on a list (PUT /watchlist/:id/lock, created
// or converted), unlocking removes it (DELETE /watchlist/:id/lock); both
// take effect at once.

export const USER_LISTS: readonly UserList[] = ['blocklist', 'allowlist']

/** Lock on a list, or unlock. */
export type LockAction = UserList | 'unlock'

/** The list a user is on (a user on both is blocklisted, as the plugin reads them); null = neither. */
export const userListOf = (u: { allowlisted?: boolean; blocklisted?: boolean }): UserList | null => (u.blocklisted ? 'blocklist' : u.allowlisted ? 'allowlist' : null)

/**
 * What can be done to a user on `current`: lock on another list, except a
 * moderator (staff), who cannot be locked; unlock when on one.
 */
export const lockActions = (current: UserList | null, staff = false): LockAction[] => [
  ...(staff ? [] : USER_LISTS.filter((l) => l !== current)),
  ...(current ? (['unlock'] as const) : [])
]

/**
 * The lock actions of a user as menu items (keyed by LockAction), and `run`
 * for a picked one: confirms, locks or unlocks, toasts and calls reload.
 */
export function useUserLock(reload: () => void) {
  const host = useModHost()
  const t = host.t
  const items = (current: UserList | null, staff = false): MenuAction[] =>
    lockActions(current, staff).map((a) => ({ key: a, label: t(`lock.action.${a}`), icon: 'lock' }))
  /** Does nothing for a key that is not one of items(current, staff). */
  async function run(userId: number, key: string, current: UserList | null, staff = false): Promise<void> {
    const action = lockActions(current, staff).find((a) => a === key)
    if (!action) return
    const message = t(`lock.confirm.${action}`, { id: userId, list: current ? t(`lists.name.${current}`) : '' })
    if (!(await host.confirm({ title: t(`lock.action.${action}`), message, confirmText: t('lock.save'), danger: action === 'blocklist' }))) return
    try {
      await (action === 'unlock' ? unlockWatch(userId) : lockWatch(userId, action))
      host.toast(t(action === 'unlock' ? 'lock.unlocked' : 'lock.locked', { id: userId }), 'success')
      reload()
    } catch (e) {
      toastError(e)
    }
  }
  return { items, run }
}
