import { fetchStatus, useModHost } from './host'
import { onSessionEnd } from './session'
import type { Status } from './types'
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
