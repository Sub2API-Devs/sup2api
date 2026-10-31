import { getCurrentInstance, onMounted, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

export interface AutoRefreshOptions {
  /** False pauses the timer (an open editor, a switch). Default true. */
  enabled?: MaybeRefOrGetter<boolean>
}

export interface AutoRefresh {
  /** A refresh started by the timer or refresh() is running. */
  running: Ref<boolean>
  /** Runs `load` now (skipped while one is running) and restarts the interval. */
  refresh: () => Promise<void>
}

/**
 * Calls `load` every `intervalMs` (≤ 0 = off) while the component lives:
 * - the next tick is scheduled after the previous load settles, so loads
 *   never overlap and a slow server is not piled up;
 * - nothing runs while the page is hidden; a tick missed then runs as soon
 *   as the page is visible again;
 * - `enabled` false pauses it; a changed interval takes effect at once.
 * The first load is the caller's (useList loads by itself); inside a
 * component the timer starts when it is mounted.
 *   useAutoRefresh(list.reload, () => seconds.value * 1000, { enabled: () => !editorOpen.value })
 */
export function useAutoRefresh(load: () => unknown, intervalMs: MaybeRefOrGetter<number>, opts: AutoRefreshOptions = {}): AutoRefresh {
  const running = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let missed = false
  let disposed = false

  const active = () => !disposed && toValue(intervalMs) > 0 && toValue(opts.enabled ?? true) !== false
  const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden'

  function schedule() {
    clearTimeout(timer)
    timer = undefined
    if (!active()) return
    timer = setTimeout(tick, toValue(intervalMs))
  }

  function tick() {
    timer = undefined
    if (!active()) return
    if (hidden()) {
      missed = true
      return
    }
    void refresh()
  }

  async function refresh() {
    if (running.value || disposed) return
    running.value = true
    missed = false
    try {
      await load()
    } catch {
      // the caller shows its own errors; the timer keeps going
    } finally {
      running.value = false
      schedule()
    }
  }

  function onVisible() {
    if (!hidden() && missed && active()) void refresh()
  }

  function start() {
    if (disposed) return
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible)
    watch(() => [toValue(intervalMs), toValue(opts.enabled ?? true)], () => {
      if (!running.value) schedule()
    })
    schedule()
  }
  // Inside a component the timer starts once it is mounted (setup is done, so
  // the getters may read state declared after the call).
  if (getCurrentInstance()) onMounted(start)
  else start()

  onScopeDispose(() => {
    disposed = true
    clearTimeout(timer)
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
  })

  return { running, refresh }
}
