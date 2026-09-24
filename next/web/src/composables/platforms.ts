import { ref } from 'vue'
import { api } from '@sub2api/host'
import type { LText, Platform, PlatformEndpoint } from '@/api/types'
import { lt } from '@/i18n'
import { useAuthStore } from '@/stores/auth'

// Gateway platforms (CONTRACTS §13): GET /platforms needs account:read. Users
// without it (e.g. on the API key page) still see the built-in platforms from
// the catalog below; plugin platforms then show their id only.

const ep = (method: string, path: string, protocol: string, billing = 'usage'): PlatformEndpoint => ({ method, path, protocol, billing })

/** Built-in platforms of the core (server/internal/platforms), used as fallback. */
export const BUILTIN_PLATFORMS: Platform[] = [
  {
    id: 'anthropic',
    label: { en: 'Anthropic', zh: 'Anthropic' },
    builtin: true,
    endpoints: [ep('POST', '/v1/messages', 'anthropic.messages'), ep('POST', '/v1/messages/count_tokens', 'anthropic.count_tokens', 'free')],
    account_types: []
  },
  {
    id: 'openai',
    label: { en: 'OpenAI', zh: 'OpenAI' },
    builtin: true,
    endpoints: [
      ep('POST', '/v1/chat/completions', 'openai.chat'),
      ep('POST', '/v1/responses', 'openai.responses'),
      ep('POST', '/v1/embeddings', 'openai.embeddings')
    ],
    account_types: []
  },
  {
    id: 'gemini',
    label: { en: 'Gemini', zh: 'Gemini' },
    builtin: true,
    endpoints: [
      ep('POST', '/v1beta/models/:model:generateContent', 'gemini.generate'),
      ep('POST', '/v1beta/models/:model:streamGenerateContent', 'gemini.stream_generate'),
      ep('POST', '/v1beta/models/:model:countTokens', 'gemini.count_tokens', 'free')
    ],
    account_types: []
  }
]

const platforms = ref<Platform[]>([])
const loaded = ref(false)
/** true when the list came from the server (plugin platforms included). */
const complete = ref(false)
let pending: Promise<void> | null = null

function normalize(p: Platform): Platform {
  return { ...p, endpoints: p.endpoints || [], account_types: p.account_types || [] }
}

export function usePlatforms() {
  const auth = useAuthStore()

  function load(force = false): Promise<void> {
    if (pending && !force) return pending
    if (!auth.has('account:read')) {
      platforms.value = BUILTIN_PLATFORMS
      loaded.value = true
      pending = Promise.resolve()
      return pending
    }
    pending = api
      .get<Platform[]>('/platforms')
      .then((r) => {
        platforms.value = (Array.isArray(r) ? r : []).map(normalize)
        complete.value = true
      })
      .catch(() => {
        platforms.value = BUILTIN_PLATFORMS
        pending = null
      })
      .finally(() => {
        loaded.value = true
      })
    return pending
  }

  function find(id: string): Platform | undefined {
    return platforms.value.find((p) => p.id === id) || BUILTIN_PLATFORMS.find((p) => p.id === id)
  }

  /** Display label of a platform id; `fallback` (e.g. from the payload) wins over the raw id. */
  function label(id: string, fallback?: LText | null): string {
    const p = find(id)
    return (p && lt(p.label)) || (fallback ? lt(fallback) : '') || id
  }

  /** Endpoints of the given platforms, grouped by platform, unknown ids kept with no endpoints. */
  function endpointsOf(ids: string[]): Array<{ id: string; label: string; builtin: boolean; endpoints: PlatformEndpoint[]; known: boolean }> {
    return ids.map((id) => {
      const p = find(id)
      return { id, label: label(id), builtin: p?.builtin ?? false, endpoints: p?.endpoints || [], known: !!p }
    })
  }

  return { platforms, loaded, complete, load, find, label, endpointsOf }
}
