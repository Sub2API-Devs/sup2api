import type { WatchLevel } from './types'

// The watch levels and actions shared by the inline watch actions, the watch
// list rows and the watch entry editor. A user on a user list (a locked
// entry, 0.10.0) cannot be added, set to a level or removed (the watch API
// answers 409 locked): the list decides, and the user is unlocked first
// (userLock.ts).

export const WATCH_LEVELS: readonly WatchLevel[] = ['observe', 'enforce']

/** A watch list action to confirm: add or set a level, or release (level null). */
export interface WatchAction {
  kind: 'add' | 'level' | 'release'
  level: WatchLevel | null
}

/** The watch actions are refused for the user: on a user list, or the entry is locked. */
export const watchLocked = (u: { allowlisted?: boolean; blocklisted?: boolean; locked?: boolean }) => !!(u.locked || u.allowlisted || u.blocklisted)
