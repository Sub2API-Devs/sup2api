import { onScopeDispose, ref, shallowRef, watch, type Ref, type ShallowRef, type WatchSource } from 'vue'
import { errorMessage } from '@/utils/errors'

export interface LatestRequest<R> {
  /** The answer to the latest input; kept while the next one loads, null once the input is null. */
  result: ShallowRef<R | null>
  loading: Ref<boolean>
  /** Why the latest request failed, '' otherwise. */
  error: Ref<string>
}

/**
 * Tells the latest of a row of requests from the earlier ones. Each call of
 * the function it gives starts a request and returns the check to make once
 * its answer is there: true until the next request starts.
 */
export function latestOnly(): () => () => boolean {
  let seq = 0
  return () => {
    const my = ++seq
    return () => my === seq
  }
}

/**
 * Asks `load` for the answer to `input` each time it changes, `delay` ms after
 * the last change (typing, dragging a number). Only the latest input counts:
 * the answers of earlier ones are dropped. A null input asks nothing.
 */
export function useLatestRequest<I, R>(input: WatchSource<I | null>, load: (input: I) => Promise<R>, delay = 300): LatestRequest<R> {
  const result = shallowRef<R | null>(null)
  const loading = ref(false)
  const error = ref('')
  const begin = latestOnly()
  let timer: ReturnType<typeof setTimeout> | undefined

  async function run(value: I, latest: () => boolean) {
    try {
      const r = await load(value)
      if (latest()) result.value = r
    } catch (e) {
      if (!latest()) return
      result.value = null
      error.value = errorMessage(e)
    } finally {
      if (latest()) loading.value = false
    }
  }

  watch(
    input,
    (value) => {
      clearTimeout(timer)
      const latest = begin()
      error.value = ''
      loading.value = value !== null
      if (value === null) result.value = null
      else timer = setTimeout(() => run(value, latest), delay)
    },
    { immediate: true }
  )
  onScopeDispose(() => clearTimeout(timer))
  return { result, loading, error }
}
