import { ref } from 'vue'
import { api } from '@sub2api/host'
import type { AccountType } from '@/api/types'
import { lt } from '@/i18n'

const types = ref<AccountType[]>([])
const loaded = ref(false)
let pending: Promise<void> | null = null

/** Account types declared by enabled platform plugins (GET /account-types), cached. */
export function useAccountTypes() {
  function load(force = false) {
    if (!pending || force) {
      pending = api
        .get<AccountType[]>('/account-types')
        .then((r) => {
          types.value = r || []
          loaded.value = true
        })
        .catch(() => {
          pending = null
          loaded.value = true
        })
    }
    return pending
  }

  function find(platform: string, type: string): AccountType | undefined {
    return types.value.find((x) => x.platform === platform && x.type === type)
  }

  /** "Anthropic · API Key" style label; falls back to raw ids. */
  function label(platform: string, type: string): string {
    const at = find(platform, type)
    if (!at) return `${platform} · ${type}`
    return `${lt(at.plugin_name) || at.plugin_key} · ${lt(at.label) || at.type}`
  }

  const platforms = () => [...new Set(types.value.map((x) => x.platform))]

  return { types, loaded, load, find, label, platforms }
}
