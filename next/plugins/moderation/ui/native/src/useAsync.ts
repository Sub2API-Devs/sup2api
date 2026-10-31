import { ref, type Ref } from 'vue'
import { errorMessage } from './host'

/**
 * State of one async load: data, loading, a translated error and reload().
 * Only the latest call may write the state, so a slow stale response never
 * overwrites a newer one. run(next) loads with another function under the
 * same rule, e.g. the next page merged into data (paging).
 */
export function useAsync<T>(fn: () => Promise<T>, failText: () => string) {
  const data = ref(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref('')
  let seq = 0

  async function run(next: () => Promise<T>) {
    const my = ++seq
    loading.value = true
    error.value = ''
    try {
      const v = await next()
      if (my === seq) data.value = v
    } catch (e) {
      if (my === seq) error.value = errorMessage(e, failText())
    } finally {
      if (my === seq) loading.value = false
    }
  }

  return { data, loading, error, reload: () => run(fn), run }
}

export type AsyncState<T> = ReturnType<typeof useAsync<T>>
