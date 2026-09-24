import { computed, ref } from 'vue'
import { api } from '@sub2api/host'
import type { AccountType, LText } from '@/api/types'
import { lt } from '@/i18n'

const types = ref<AccountType[]>([])
const loaded = ref(false)
let pending: Promise<void> | null = null

/** "plugin_key/type": the identity of an account type (CONTRACTS §12). */
export function typeKey(pluginKey: string, type: string): string {
  return `${pluginKey}/${type}`
}

export interface AccountTypeGroup {
  plugin_key: string
  plugin_name: LText
  plugin_version?: string
  trust?: string
  types: AccountType[]
}

/** Account types declared by enabled plugins (GET /account-types), cached. */
export function useAccountTypes() {
  function load(force = false) {
    if (!pending || force) {
      pending = api
        .get<AccountType[]>('/account-types')
        .then((r) => {
          types.value = (Array.isArray(r) ? r : []).map((x) => ({ ...x, platforms: x.platforms || [], endpoints: x.endpoints || [] }))
          loaded.value = true
        })
        .catch(() => {
          pending = null
          loaded.value = true
        })
    }
    return pending
  }

  function find(pluginKey: string, type: string): AccountType | undefined {
    return types.value.find((x) => x.plugin_key === pluginKey && x.type === type)
  }

  /** Display name of a plugin; falls back to its key. */
  function pluginName(pluginKey: string): string {
    const at = types.value.find((x) => x.plugin_key === pluginKey)
    return (at && lt(at.plugin_name)) || pluginKey
  }

  /** Label of an account type; `fallback` (e.g. an account's type_label) wins over the raw id. */
  function typeLabel(pluginKey: string, type: string, fallback?: LText | null): string {
    const at = find(pluginKey, type)
    return (at && lt(at.label)) || (fallback ? lt(fallback) : '') || type
  }

  /** "Anthropic · API Key" style label; falls back to raw ids. */
  function label(pluginKey: string, type: string, fallback?: LText | null): string {
    return `${pluginName(pluginKey)} · ${typeLabel(pluginKey, type, fallback)}`
  }

  /** Account types grouped by their plugin, in the server order. */
  const grouped = computed<AccountTypeGroup[]>(() => {
    const out: AccountTypeGroup[] = []
    for (const at of types.value) {
      let g = out.find((x) => x.plugin_key === at.plugin_key)
      if (!g) {
        g = { plugin_key: at.plugin_key, plugin_name: at.plugin_name, plugin_version: at.plugin_version, trust: at.trust, types: [] }
        out.push(g)
      }
      g.types.push(at)
    }
    return out
  })

  return { types, loaded, load, find, label, typeLabel, pluginName, grouped }
}
