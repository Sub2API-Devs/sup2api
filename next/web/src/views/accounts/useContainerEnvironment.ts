import { onScopeDispose, reactive, ref } from 'vue'
import { api } from '@sub2api/host'
import { localeForCountry, type ProxyLocation } from './containerEnvironment'

type Environment = { locale: string; timezone: string }

export function useContainerEnvironment() {
  const settings = reactive<Environment>({ locale: '', timezone: '' })
  const locationLoading = ref(false)
  const locationStatus = ref<'idle' | 'filled' | 'failed'>('idle')
  const locationIP = ref('')
  let active: AbortController | undefined

  function resetEnvironment(saved?: Partial<Environment>) {
    active?.abort()
    active = undefined
    locationLoading.value = false
    locationStatus.value = 'idle'
    locationIP.value = ''
    Object.assign(settings, { locale: saved?.locale || '', timezone: saved?.timezone || '' })
  }

  async function prefillEnvironment(proxyID: number | null) {
    resetEnvironment()
    if (proxyID === null) return
    const request = new AbortController()
    active = request
    locationLoading.value = true
    try {
      const location = await api.get<ProxyLocation>(`/proxies/${proxyID}/location`, undefined, { signal: request.signal })
      if (request.signal.aborted) return
      Object.assign(settings, { locale: localeForCountry(location.country_code), timezone: location.timezone })
      locationIP.value = location.ip
      locationStatus.value = settings.locale && settings.timezone ? 'filled' : 'failed'
    } catch {
      if (!request.signal.aborted) locationStatus.value = 'failed'
    } finally {
      if (!request.signal.aborted) locationLoading.value = false
    }
  }

  onScopeDispose(() => active?.abort())
  return { settings, locationLoading, locationStatus, locationIP, resetEnvironment, prefillEnvironment }
}
