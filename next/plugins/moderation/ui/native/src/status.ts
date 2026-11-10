import { fetchStatus, useModHost } from './host'
import { onSessionEnd } from './session'
import type { Status, WatchCounts } from './types'
import { useAsync, type AsyncState } from './useAsync'

// GET /status, shared by the page header (mode badge, alert threshold) and
// the overview: one load serves both, and the latest load wins. The status
// is of one login: a session end drops it and its pending answers.

let store: AsyncState<Status> | null = null

onSessionEnd(() => {
  store?.reset()
  store = null
})

export function useStatus(): AsyncState<Status> {
  store ??= useAsync(fetchStatus, () => useModHost().t('overview.loadFailed'))
  return store
}

/**
 * Watch entries with new hits since last seen: of the observe level, of the
 * enforce level (null on a backend before 0.8.0, which has no
 * blocking_with_new) and of both.
 */
export function watchNew(c: WatchCounts): { watching: number; blocking: number | null; total: number } {
  const blocking = typeof c.blocking_with_new === 'number' ? c.blocking_with_new : null
  return { watching: c.watching_with_new, blocking, total: c.watching_with_new + (blocking ?? 0) }
}
