import { ref } from 'vue'
import { api } from '@sub2api/host'
import type { LText, MyPlatform, Platform, PlatformEndpoint } from '@/api/types'
import { lt } from '@/i18n'
import { useAuthStore } from '@/stores/auth'

// Gateway platforms. Admins with account:read load GET /platforms (CONTRACTS
// §13, with account types); everyone else loads GET /me/platforms (§14.1:
// every available platform and its endpoints, no account types). When both
// fail, the built-in catalog below is used; plugin platforms then show their
// id only.

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
let loadedFor: number | null = null

function normalize(p: Platform | MyPlatform): Platform {
  return { ...p, endpoints: p.endpoints || [], account_types: (p as Platform).account_types || [] }
}

/** GET /me/platforms, normalized to Platform (no account types). */
async function fetchMyPlatforms(): Promise<Platform[]> {
  const r = await api.get<MyPlatform[]>('/me/platforms')
  return (Array.isArray(r) ? r : []).map(normalize)
}

export function usePlatforms() {
  const auth = useAuthStore()

  function load(force = false): Promise<void> {
    // The cache is per user: /platforms and /me/platforms differ by permission.
    const who = auth.me?.id ?? null
    if (who !== loadedFor) force = true
    if (pending && !force) return pending
    loadedFor = who
    const primary: Promise<Platform[]> = auth.has('account:read')
      ? api
          .get<Platform[]>('/platforms')
          .then((r) => (Array.isArray(r) ? r : []).map(normalize))
          // e.g. the permission was just revoked: the user endpoint still works.
          .catch(() => fetchMyPlatforms())
      : fetchMyPlatforms()
    pending = primary
      .then((list) => {
        platforms.value = list
        complete.value = true
      })
      .catch(() => {
        platforms.value = BUILTIN_PLATFORMS
        complete.value = false
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
