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
 * Asks `load` for the answer to `input` each time it changes, `delay` ms after
 * the last change (typing, dragging a number). Only the latest input counts:
 * the answers of earlier ones are dropped. A null input asks nothing.
 */
export function useLatestRequest<I, R>(input: WatchSource<I | null>, load: (input: I) => Promise<R>, delay = 300): LatestRequest<R> {
  const result = shallowRef<R | null>(null)
  const loading = ref(false)
  const error = ref('')
  let seq = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  async function run(value: I, my: number) {
    try {
      const r = await load(value)
      if (my === seq) result.value = r
    } catch (e) {
      if (my !== seq) return
      result.value = null
      error.value = errorMessage(e)
    } finally {
      if (my === seq) loading.value = false
    }
  }

  watch(
    input,
    (value) => {
      clearTimeout(timer)
      const my = ++seq
      error.value = ''
      loading.value = value !== null
      if (value === null) result.value = null
      else timer = setTimeout(() => run(value, my), delay)
    },
    { immediate: true }
  )
  onScopeDispose(() => clearTimeout(timer))
  return { result, loading, error }
}
