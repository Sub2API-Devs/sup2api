import { computed, onBeforeUnmount, watch, type Ref } from 'vue'
import { fetchUserDetail, markWatchSeen, useModHost, type UserDetail, type Watch } from './host'
import { useAsync } from './useAsync'

const POLL_MS = 5000

/**
 * GET /users/:user_id for an open drawer: loads on open and user change,
 * polls every 5 s while an analysis is queued or running, and reports
 * `finished` when one ends (its card, verdicts and history changed).
 * Opening also marks the user's new records as seen (manage only).
 */
export function useUserDetail(
  open: Ref<boolean>,
  userId: Ref<number | null>,
  opts: { manage: Ref<boolean>; changed: (w: Partial<Watch> | null) => void; finished: () => void }
) {
  const t = useModHost().t
  const detail = useAsync<UserDetail>(() => fetchUserDetail(userId.value!), () => t('watch.loadFailed'))
  const data = detail.data
  const entry = computed(() => data.value?.watch ?? null)
  const state = computed(() => {
    const a = data.value?.analysis
    return a?.running ? 'running' : a?.queued ? 'pending' : 'idle'
  })

  /** Loads the user; the first load of an opening also marks new records as seen. */
  async function load(markSeen = false) {
    await detail.reload()
    const d = data.value
    if (!d || d.user_id !== userId.value) return
    opts.changed(d.watch)
    if (!markSeen || !opts.manage.value || !d.watch?.hits_since_seen) return
    await markWatchSeen(d.user_id).catch(() => undefined)
    d.watch.hits_since_seen = 0
    opts.changed({ hits_since_seen: 0 })
  }

  watch(
    () => [open.value, userId.value] as const,
    ([isOpen, id]) => {
      if (!isOpen || !id) return
      if (data.value?.user_id !== id) data.value = null
      void load(true)
    },
    { immediate: true }
  )

  // One timer, driven by whether polling is needed now.
  let timer: ReturnType<typeof setInterval> | null = null
  const stop = () => {
    if (timer) clearInterval(timer)
    timer = null
  }
  watch(
    () => [open.value, userId.value, state.value] as const,
    ([isOpen, id, s], prev) => {
      stop()
      if (prev && prev[1] === id && prev[2] !== 'idle' && s === 'idle') opts.finished()
      if (isOpen && id && s !== 'idle') timer = setInterval(() => void load(), POLL_MS)
    },
    { immediate: true }
  )
  onBeforeUnmount(stop)

  return { detail: data, loading: detail.loading, error: detail.error, entry, state, reload: () => load() }
}
