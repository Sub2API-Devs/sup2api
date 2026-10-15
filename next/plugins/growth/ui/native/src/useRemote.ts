import { onMounted, ref, type Ref } from 'vue'
import { errorMessage, useGrowthHost } from './host'

/**
 * One GET resource loaded on mount. A failed first load sets `error` (the page
 * shows it with a retry); a failed reload keeps the data and toasts instead.
 */
export function useRemote<T>(path: string) {
  const host = useGrowthHost()
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      data.value = await host.pluginApi.get<T>(path)
    } catch (e) {
      error.value = errorMessage(e, host.t('loadFailed'))
      if (data.value) host.toast(error.value, 'error')
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
  return { data, loading, error, load }
}
