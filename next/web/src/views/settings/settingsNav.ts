import { computed, inject, onMounted, provide, ref, watch, type InjectionKey } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { api } from '@sub2api/host'
import type { PluginSummary } from '@/api/types'
import { lt } from '@/i18n'
import { useAppStore, type NavItem } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { hasConsoleSettings } from '@/views/plugins/pluginUtil'
import { SETTINGS_SECTION } from '@/layouts/sidebarGroups'
import { useNavItemLabel } from '@/layouts/navItem'

/**
 * The navigation of system settings (CONTRACTS §90): the settings page's own
 * pages (?tab=<key> of /settings; plugin settings as ?tab=plugin:<key>) and
 * the pages of the "system" menu section (platforms, plugins, nodes, ...),
 * which keep their own addresses. One list feeds the navigation beside every
 * one of those pages and the settings page's choice of what to show.
 */
export interface SettingsEntry {
  key: string
  label: string
  /** A page of the settings page (?tab=key) or of its own address. */
  tab?: string
  path?: string
}
export interface SettingsGroup {
  key: string
  label: string
  entries: SettingsEntry[]
}

type Slot =
  | { kind: 'tab'; tab: string; perm: string; label: string }
  | { kind: 'page'; page: string }
  /** Enabled plugins' settings, then the plugin pages of the system section. */
  | { kind: 'pluginSettings' }
  /** System-section core pages not placed elsewhere. */
  | { kind: 'otherPages' }

const tab = (key: string, perm: string, label: string): Slot => ({ kind: 'tab', tab: key, perm, label })
const page = (id: string): Slot => ({ kind: 'page', page: id })

/** Where each page goes. */
const LAYOUT: Array<{ key: string; slots: Slot[] }> = [
  {
    key: 'gateway',
    slots: [
      tab('gateway', 'settings:read', 'settings.tabs.gateway'),
      tab('failure', 'settings:read', 'failurePolicy.title'),
      tab('sticky', 'sticky:read', 'settings.tabs.sticky'),
      tab('offload', 'settings:read', 'settings.tabs.offload'),
      page('platforms'),
      page('proxies')
    ]
  },
  {
    key: 'billing',
    slots: [tab('billing', 'settings:read', 'settings.tabs.billing'), tab('notifications', 'settings:read', 'settings.tabs.notifications')]
  },
  { key: 'access', slots: [page('roles')] },
  { key: 'plugins', slots: [page('plugins'), page('market'), page('publishers')] },
  { key: 'pluginSettings', slots: [{ kind: 'pluginSettings' }] },
  {
    key: 'system',
    slots: [
      page('nodes'),
      page('tasks'),
      page('upgrades'),
      tab('updates', 'settings:read', 'coreUpdates.sourceTitle'),
      page('audit'),
      tab('environment', 'settings:read', 'settings.tabs.environment'),
      { kind: 'otherPages' }
    ]
  }
]

const PLACED = new Set(LAYOUT.flatMap(g => g.slots.flatMap(s => (s.kind === 'page' ? [s.page] : []))))

/** The settings page itself: the system-section page every tab belongs to. */
export const SETTINGS_PAGE = '/settings'

function createSettingsNav() {
  const { t } = useI18n()
  const auth = useAuthStore()
  const app = useAppStore()
  const route = useRoute()
  const labelOf = useNavItemLabel()

  /** Enabled plugins with console settings: a schema form, or the core's ccgateway view. */
  const plugins = ref<PluginSummary[]>([])
  const pluginsLoaded = ref(false)
  async function loadPlugins() {
    try {
      if (!auth.has('plugin:read')) return
      const list = await api.get<PluginSummary[]>('/plugins')
      plugins.value = (list || []).filter(p => p.status === 'enabled' && hasConsoleSettings(p, perm => auth.has(perm)))
    } catch {
      // The plugin group is an index; the plugin list page still reaches them.
      plugins.value = []
    } finally {
      pluginsLoaded.value = true
    }
  }
  onMounted(loadPlugins)
  // Installing, enabling or removing a plugin refreshes the menu (refreshShell): follow it. The first menu load is not such a change.
  watch(
    () => app.menus,
    (_, before) => {
      if (before.length > 0) void loadPlugins()
    }
  )

  /** The system-section pages the caller may open, from the menu the server filtered. */
  const pages = computed<NavItem[]>(() =>
    (app.menus.find(s => s.key === SETTINGS_SECTION)?.items ?? []).filter(i => i.path !== SETTINGS_PAGE)
  )
  const pageEntry = (i: NavItem): SettingsEntry => ({ key: `page:${i.id}`, label: labelOf(i), path: i.path })

  function slotEntries(s: Slot): SettingsEntry[] {
    switch (s.kind) {
      case 'tab':
        return auth.has(s.perm) ? [{ key: s.tab, tab: s.tab, label: t(s.label) }] : []
      case 'page':
        return pages.value.filter(i => i.id === s.page && !i.pluginKey).map(pageEntry)
      case 'pluginSettings':
        return [
          ...plugins.value.map(p => ({ key: `plugin:${p.key}`, tab: `plugin:${p.key}`, label: lt(p.name) || p.key })),
          ...pages.value.filter(i => i.pluginKey).map(pageEntry)
        ]
      case 'otherPages':
        return pages.value.filter(i => !i.pluginKey && !PLACED.has(i.id)).map(pageEntry)
    }
  }

  const groups = computed<SettingsGroup[]>(() =>
    LAYOUT.map(g => ({ key: g.key, label: t(`settings.groups.${g.key}`), entries: g.slots.flatMap(slotEntries) })).filter(
      g => g.entries.length > 0
    )
  )
  const entries = computed(() => groups.value.flatMap(g => g.entries))
  const tabs = computed(() => entries.value.filter(e => e.tab))

  const askedTab = computed(() => (typeof route.query.tab === 'string' ? route.query.tab : ''))
  const known = computed(() => tabs.value.some(e => e.tab === askedTab.value))
  /** A plugin page asked for by a link waits for the plugin list instead of opening the first page meanwhile. */
  const waiting = computed(() => askedTab.value.startsWith('plugin:') && !pluginsLoaded.value && !known.value)
  /** A linked page the user cannot see (plugin disabled, no permission): say so instead of silently showing another one. */
  const missing = computed(() => !!askedTab.value && !waiting.value && !known.value)
  /** The settings page's tab: the one asked for when the user may see it, else the first visible one. */
  const activeTab = computed(() => (waiting.value ? undefined : known.value ? askedTab.value : tabs.value[0]?.tab))

  return { groups, entries, activeTab, waiting, missing }
}

export type SettingsNav = ReturnType<typeof createSettingsNav>
const KEY: InjectionKey<SettingsNav> = Symbol('settingsNav')

/** Creates the navigation for the system settings shell and its pages. */
export function provideSettingsNav(): SettingsNav {
  const nav = createSettingsNav()
  provide(KEY, nav)
  return nav
}

/** The navigation of the enclosing shell; the settings page mounted alone makes its own. */
export function useSettingsNav(): SettingsNav {
  return inject(KEY, createSettingsNav, true)
}
