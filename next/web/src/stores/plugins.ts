import { defineStore } from 'pinia'
import { computed, markRaw, reactive, ref, type Component } from 'vue'
import { api, createPluginHost, HOST_UI_VERSION, satisfiesRange, useHost, type NativePluginModule } from '@sub2api/host'
import type { PluginAccountAction, UIPlugin, UIPluginPage, UIPluginSlot } from '@/api/types'

const TRUSTED = new Set(['official', 'verified'])

export interface SlotEntry extends Pick<UIPluginSlot, 'label' | 'icon' | 'accountTypes'> {
  pluginKey: string
  name: string
  component: Component
}

/** A plugin's account action with the plugin it belongs to. */
export interface PluginAccountActionEntry extends PluginAccountAction {
  pluginKey: string
}

interface Loaded {
  url: string
  mod: NativePluginModule
}

export function assetURL(p: Pick<UIPlugin, 'asset_base'>, path: string): string {
  return p.asset_base.replace(/\/$/, '') + '/' + path.replace(/^\//, '')
}

/**
 * Plugin UI registry: GET /ui/plugins, native module loading
 * (import(asset_base + native_entry) -> register(host)) and lookup of
 * plugin pages / slot components.
 */
export const usePluginStore = defineStore('plugins', () => {
  const uiPlugins = ref<UIPlugin[]>([])
  const components = reactive<Record<string, Record<string, Component>>>({})
  const errors = reactive<Record<string, string>>({})
  /** Plugins whose native module is being imported / registered. */
  const pending = reactive<Record<string, boolean>>({})
  /** GET /ui/plugins answered (menus, pages and slots are known). */
  const listed = ref(false)
  const loaded = new Map<string, Loaded>()
  // Bumped by every refresh() and reset(): a list that arrives after a newer
  // call (or after logout) is stale and dropped.
  let seq = 0

  function nativeURL(p: UIPlugin): string | null {
    if (!p.native_entry) return null
    return assetURL(p, p.native_entry)
  }

  function nativeAllowed(p: UIPlugin): { ok: boolean; reason?: string } {
    if (!p.native_entry) return { ok: false }
    if (!TRUSTED.has(String(p.trust))) return { ok: false, reason: `untrusted publisher (${p.trust})` }
    if (!satisfiesRange(HOST_UI_VERSION, p.host_ui_compat)) {
      return { ok: false, reason: `hostUICompat ${p.host_ui_compat} does not match host UI ${HOST_UI_VERSION}` }
    }
    return { ok: true }
  }

  async function load(p: UIPlugin) {
    const url = nativeURL(p)
    if (!url) return
    const allowed = nativeAllowed(p)
    if (!allowed.ok) {
      errors[p.key] = allowed.reason || 'not allowed'
      return
    }
    let mod: NativePluginModule | undefined
    try {
      mod = (await import(/* @vite-ignore */ url)) as NativePluginModule
      if (typeof mod.register !== 'function') throw new Error('entry does not export register(host)')
      const own: Record<string, Component> = {}
      const host = createPluginHost(
        useHost(),
        { key: p.key, version: p.version, assetBase: p.asset_base, trust: String(p.trust) },
        (name, c) => {
          own[name] = markRaw(c)
          components[p.key] = { ...own }
        }
      )
      await mod.register(host)
      loaded.set(p.key, { url, mod })
      delete errors[p.key]
    } catch (e) {
      console.error(`[plugins] failed to load native UI of ${p.key}`, e)
      errors[p.key] = e instanceof Error ? e.message : String(e)
      // Drop whatever register() got to before it threw, so the next refresh starts clean.
      delete components[p.key]
      try {
        await mod?.unregister?.()
      } catch (err) {
        console.error(`[plugins] unregister of ${p.key} failed`, err)
      }
    }
  }

  async function unload(key: string) {
    const l = loaded.get(key)
    loaded.delete(key)
    delete components[key]
    try {
      await l?.mod.unregister?.()
    } catch (e) {
      console.error(`[plugins] unregister of ${key} failed`, e)
    }
  }

  async function fetchList(): Promise<UIPlugin[]> {
    try {
      return (await api.get<UIPlugin[]>('/ui/plugins')) || []
    } catch (e) {
      console.warn('[plugins] GET /ui/plugins failed', e)
      return []
    }
  }

  /**
   * Reloads /ui/plugins; unregisters removed/changed plugins, loads new ones.
   * Sets `listed` as soon as the list is in and resolves once every native
   * module this call started has loaded or failed.
   */
  async function refresh() {
    const g = ++seq
    const list = await fetchList()
    if (g !== seq) return
    uiPlugins.value = list
    // A plugin still loading from an overlapping refresh is left to that call.
    // New and changed plugins are marked pending before the old modules are
    // unloaded, so their pages wait instead of briefly showing a missing component.
    const todo = list.filter(p => p.native_entry && nativeURL(p) !== loaded.get(p.key)?.url && !pending[p.key])
    for (const p of todo) pending[p.key] = true
    for (const key of [...loaded.keys()]) {
      const p = list.find(x => x.key === key)
      if (!p || nativeURL(p) !== loaded.get(key)?.url) await unload(key)
    }
    if (g === seq) listed.value = true
    // Each plugin finishes on its own: a slow or failing one holds up only its own pages and slots.
    await Promise.all(todo.map(p => loadLatest(p).finally(() => delete pending[p.key])))
  }

  /** Loads p, then follows a refresh that removed or changed it meanwhile (that refresh skipped it). */
  async function loadLatest(p: UIPlugin) {
    await load(p)
    const latest = plugin(p.key)
    const l = loaded.get(p.key)
    if (l && (!latest || nativeURL(latest) !== l.url)) {
      await unload(p.key)
      if (latest) await loadLatest(latest)
    }
  }

  async function reset() {
    seq++
    for (const key of [...loaded.keys()]) await unload(key)
    uiPlugins.value = []
    listed.value = false
  }

  function plugin(key: string): UIPlugin | undefined {
    return uiPlugins.value.find(p => p.key === key)
  }

  function page(key: string, pageId: string): { plugin: UIPlugin; page: UIPluginPage } | null {
    const p = plugin(key)
    const pg = p?.pages?.[pageId]
    return p && pg ? { plugin: p, page: pg } : null
  }

  function component(key: string, name: string | undefined): Component | undefined {
    if (!name) return undefined
    return components[key]?.[name]
  }

  /** The account actions of every listed plugin (manifest `ui.accountActions`, CONTRACTS §23.3 UI 3.6), in list order. */
  const accountActions = computed<PluginAccountActionEntry[]>(() =>
    uiPlugins.value.flatMap(p => (p.account_actions || []).map(a => ({ pluginKey: p.key, ...a })))
  )

  /** Components registered for a slot (dashboard.widgets, account.detail.tabs, account.form.widgets, account.list.weight, account.list.toolbar, account.editor.section, account.list.quota). */
  function slotEntries(slot: string): SlotEntry[] {
    const out: SlotEntry[] = []
    for (const p of uiPlugins.value) {
      for (const s of p.slots || []) {
        if (s.slot !== slot) continue
        const c = component(p.key, s.component)
        if (c) out.push({ pluginKey: p.key, name: s.component, component: c, label: s.label, icon: s.icon, accountTypes: s.accountTypes })
      }
    }
    return out
  }

  return {
    uiPlugins,
    components,
    errors,
    pending,
    listed,
    accountActions,
    refresh,
    reset,
    plugin,
    page,
    component,
    slotEntries,
    nativeAllowed
  }
})
