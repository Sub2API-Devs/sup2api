import { defineStore } from 'pinia'
import { markRaw, reactive, ref, type Component } from 'vue'
import { api, createPluginHost, HOST_UI_VERSION, satisfiesRange, useHost, type NativePluginModule } from '@sub2api/host'
import type { UIPlugin, UIPluginPage } from '@/api/types'

const TRUSTED = new Set(['official', 'verified'])

export interface SlotEntry {
  pluginKey: string
  name: string
  component: Component
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
  const ready = ref(false)
  const loaded = new Map<string, Loaded>()

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
    try {
      const mod = (await import(/* @vite-ignore */ url)) as NativePluginModule
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

  /** Reloads /ui/plugins; unregisters removed/changed plugins, loads new ones. */
  async function refresh() {
    let list: UIPlugin[] = []
    try {
      list = (await api.get<UIPlugin[]>('/ui/plugins')) || []
    } catch (e) {
      console.warn('[plugins] GET /ui/plugins failed', e)
    }
    uiPlugins.value = list
    for (const key of [...loaded.keys()]) {
      const p = list.find((x) => x.key === key)
      if (!p || nativeURL(p) !== loaded.get(key)?.url) await unload(key)
    }
    await Promise.all(list.filter((p) => p.native_entry && !loaded.has(p.key)).map(load))
    ready.value = true
  }

  async function reset() {
    for (const key of [...loaded.keys()]) await unload(key)
    uiPlugins.value = []
    ready.value = false
  }

  function plugin(key: string): UIPlugin | undefined {
    return uiPlugins.value.find((p) => p.key === key)
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

  /** Components registered for a slot (dashboard.widgets, account.detail.tabs, account.form.widgets). */
  function slotEntries(slot: string): SlotEntry[] {
    const out: SlotEntry[] = []
    for (const p of uiPlugins.value) {
      for (const s of p.slots || []) {
        if (s.slot !== slot) continue
        const c = component(p.key, s.component)
        if (c) out.push({ pluginKey: p.key, name: s.component, component: c })
      }
    }
    return out
  }

  return { uiPlugins, components, errors, ready, refresh, reset, plugin, page, component, slotEntries, nativeAllowed }
})
