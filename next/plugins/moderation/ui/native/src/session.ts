import { session } from '@sub2api/host'

// Module-level caches (catalog, users, status) belong to one login. The
// entry module stays loaded across logins (the console imports the same URL
// again), so they are reset when the session ends: on unregister (the
// console's logout resets the plugins) and when the host session becomes
// null (expired or logged out, also in another tab). The host exposes no user
// id or login id, so a switch from one user to another without a session
// end in between is not seen.

const resets = new Set<() => void>()

/** Registers a cache reset, run whenever the session ends. */
export function onSessionEnd(reset: () => void) {
  resets.add(reset)
}

/** Runs every registered reset. */
export function resetSessionCaches() {
  for (const r of resets) r()
}

let off: (() => void) | null = null

/** Starts watching the host session (register). */
export function watchSession() {
  off?.()
  off = session?.onChange?.((s) => {
    if (!s) resetSessionCaches()
  }) ?? null
}

/** Stops watching and drops the caches (unregister). */
export function unwatchSession() {
  off?.()
  off = null
  resetSessionCaches()
}
