import { ref, type Ref } from 'vue'
import { errorMessage } from './host'

/**
 * State of one async load: data, loading, a translated error and reload().
 * Only the latest call may write the state, so a slow stale response never
 * overwrites a newer one. run(next) loads with another function under the
 * same rule, e.g. the next page merged into data (paging). failure is the
 * error as thrown, for callers that tell error codes apart; reset() drops
 * the answers still pending and clears the state.
 */
export function useAsync<T>(fn: () => Promise<T>, failText: () => string) {
  const data = ref(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref('')
  const failure = ref<unknown>(null)
  let seq = 0

  async function run(next: () => Promise<T>) {
    const my = ++seq
    loading.value = true
    error.value = ''
    failure.value = null
    try {
      const v = await next()
      if (my === seq) data.value = v
    } catch (e) {
      if (my !== seq) return
      failure.value = e
      error.value = errorMessage(e, failText())
    } finally {
      if (my === seq) loading.value = false
    }
  }

  function reset() {
    seq++
    data.value = null
    loading.value = false
    error.value = ''
    failure.value = null
  }

  return { data, loading, error, failure, reload: () => run(fn), run, reset }
}

export type AsyncState<T> = ReturnType<typeof useAsync<T>>
