import { ref } from 'vue'

export interface BulkFailure<T> {
  item: T
  error: unknown
}
export interface BulkOutcome<T> {
  ok: T[]
  failed: BulkFailure<T>[]
  /** Items not started because the run was stopped. */
  skipped: number
}

/**
 * Runs one request per item with at most `concurrency` in flight, counting
 * progress; `stop()` keeps the remaining items from starting. Workers throw
 * to report a failure; the outcome lists them with their error.
 */
export function useBulkRun(concurrency = 4) {
  const running = ref(false)
  const done = ref(0)
  const total = ref(0)
  let ctrl: AbortController | null = null

  async function run<T>(items: readonly T[], worker: (item: T, signal: AbortSignal) => Promise<unknown>): Promise<BulkOutcome<T>> {
    const out: BulkOutcome<T> = { ok: [], failed: [], skipped: 0 }
    if (running.value || !items.length) return out
    running.value = true
    done.value = 0
    total.value = items.length
    const c = (ctrl = new AbortController())
    let next = 0
    const lane = async () => {
      while (next < items.length && !c.signal.aborted) {
        const item = items[next++]
        try {
          await worker(item, c.signal)
          out.ok.push(item)
        } catch (error) {
          out.failed.push({ item, error })
        } finally {
          done.value++
        }
      }
    }
    try {
      await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, lane))
    } finally {
      out.skipped = items.length - next
      running.value = false
      ctrl = null
    }
    return out
  }
  function stop() {
    ctrl?.abort()
  }
  return { running, done, total, run, stop }
}
