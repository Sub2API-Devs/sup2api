import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { api } from '@sub2api/host'
import type { MenuSection } from '@/api/types'
import { useAuthStore } from './auth'
import { usePluginStore } from './plugins'
import { ACCOUNT_PAGE_PERMS, PROXY_PAGE_PERMS } from '@/composables/useOwnership'

export type Theme = 'light' | 'dark'

const THEME_KEY = 's2a.theme'

function initialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Menu entry: `label` is LocalizedText from the server or `labelKey` for i18n. */
export interface NavItem {
  id: string
  label?: string | Record<string, string>
  labelKey?: string
  icon?: string
  path: string
  pluginKey?: string
}

export interface NavSection {
  key: string
  label?: string | Record<string, string>
  items: NavItem[]
}

// Client-side core menu, used when GET /me/menus is unavailable.
const CORE_MENU: Array<{ key: string; items: Array<NavItem & { perm?: string | string[] }> }> = [
  { key: 'overview', items: [{ id: 'dashboard', labelKey: 'nav.items.dashboard', icon: 'dashboard', path: '/dashboard' }] },
  {
    key: 'gateway',
    items: [
      { id: 'groups', labelKey: 'nav.items.groups', icon: 'group', path: '/groups', perm: 'group:read' },
      { id: 'accounts', labelKey: 'nav.items.accounts', icon: 'account', path: '/accounts', perm: ACCOUNT_PAGE_PERMS },
      { id: 'proxies', labelKey: 'nav.items.proxies', icon: 'proxy', path: '/proxies', perm: PROXY_PAGE_PERMS },
      { id: 'prices', labelKey: 'nav.items.prices', icon: 'price', path: '/prices', perm: 'price:read' },
      { id: 'usage', labelKey: 'nav.items.usage', icon: 'usage', path: '/usage', perm: 'usage:all:read' },
      { id: 'sticky', labelKey: 'nav.items.sticky', icon: 'sticky', path: '/sticky', perm: 'sticky:read' }
    ]
  },
  { key: 'finance', items: [{ id: 'ledger', labelKey: 'nav.items.ledger', icon: 'ledger', path: '/ledger', perm: 'balance:all:read' }] },
  {
    key: 'system',
    items: [
      { id: 'users', labelKey: 'nav.items.users', icon: 'user', path: '/users', perm: 'user:read' },
      { id: 'roles', labelKey: 'nav.items.roles', icon: 'role', path: '/roles', perm: 'role:read' },
      { id: 'api-keys', labelKey: 'nav.items.apiKeysAll', icon: 'key', path: '/api-keys', perm: 'apikey:all:read' },
      { id: 'platforms', labelKey: 'nav.items.platforms', icon: 'globe', path: '/platforms', perm: ACCOUNT_PAGE_PERMS },
      { id: 'plugins', labelKey: 'nav.items.plugins', icon: 'plugin', path: '/plugins', perm: 'plugin:read' },
      { id: 'market', labelKey: 'nav.items.market', icon: 'market', path: '/market', perm: 'plugin:market:read' },
      { id: 'publishers', labelKey: 'nav.items.publishers', icon: 'publisher', path: '/publishers', perm: 'publisher:read' },
      { id: 'nodes', labelKey: 'nav.items.nodes', icon: 'node', path: '/nodes', perm: 'node:read' },
      { id: 'settings', labelKey: 'nav.items.settings', icon: 'settings', path: '/settings', perm: 'settings:read' }
    ]
  },
  {
    key: 'me',
    items: [
      { id: 'my-api-keys', labelKey: 'nav.items.myApiKeys', icon: 'key', path: '/me/api-keys', perm: 'apikey:self:manage' },
      { id: 'my-usage', labelKey: 'nav.items.myUsage', icon: 'chart', path: '/me/usage', perm: 'usage:self:read' },
      { id: 'my-balance', labelKey: 'nav.items.myBalance', icon: 'balance', path: '/me/balance', perm: 'balance:self:read' }
    ]
  }
]

const SECTION_KEYS = ['overview', 'gateway', 'finance', 'system', 'me', 'plugins']

export const useAppStore = defineStore('app', () => {
  const theme = ref<Theme>(initialTheme())
  const sidebarCollapsed = ref(localStorage.getItem('s2a.sidebar') === '1')
  const mobileNavOpen = ref(false)
  const menus = ref<NavSection[]>([])
  const menusLoaded = ref(false)

  function applyTheme() {
    document.documentElement.classList.toggle('dark', theme.value === 'dark')
  }
  applyTheme()
  watch(theme, (v) => {
    localStorage.setItem(THEME_KEY, v)
    applyTheme()
  })
  watch(sidebarCollapsed, (v) => localStorage.setItem('s2a.sidebar', v ? '1' : '0'))

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  async function loadMenus() {
    const auth = useAuthStore()
    const plugins = usePluginStore()
    try {
      const data = await api.get<MenuSection[]>('/me/menus')
      menus.value = ensureClientItems((data || []).map(normalizeSection), (p) => auth.has(p)).filter((s) => s.items.length > 0)
    } catch {
      // Fallback: core menu filtered by permissions + plugin menus.
      const sections: NavSection[] = CORE_MENU.map((s) => ({
        key: s.key,
        items: s.items.filter((i) => auth.has(i.perm)).map(({ perm: _p, ...rest }) => rest)
      })).filter((s) => s.items.length > 0)
      const pluginItems: NavItem[] = []
      for (const p of plugins.uiPlugins) {
        for (const m of p.menus || []) {
          pluginItems.push({ id: `${p.key}.${m.id}`, label: m.label, icon: m.icon || 'puzzle', path: `/p/${p.key}/${m.page}`, pluginKey: p.key })
        }
      }
      if (pluginItems.length) sections.push({ key: 'plugins', items: pluginItems })
      menus.value = sections
    } finally {
      menusLoaded.value = true
    }
  }

  return { theme, sidebarCollapsed, mobileNavOpen, menus, menusLoaded, toggleTheme, loadMenus }
})

/**
 * Core pages newer than the server menu: added client-side (per permission)
 * when GET /me/menus does not list them yet.
 */
const CLIENT_ITEMS: Array<{ section: string; before?: string; item: NavItem & { perm: string | string[] } }> = [
  { section: 'system', before: '/plugins', item: { id: 'platforms', labelKey: 'nav.items.platforms', icon: 'globe', path: '/platforms', perm: ACCOUNT_PAGE_PERMS } }
]

function ensureClientItems(sections: NavSection[], has: (perm: string | string[]) => boolean): NavSection[] {
  for (const { section, before, item } of CLIENT_ITEMS) {
    if (!has(item.perm)) continue
    if (sections.some((s) => s.items.some((i) => i.path === item.path))) continue
    const { perm: _p, ...nav } = item
    let s = sections.find((x) => x.key === section)
    if (!s) {
      s = { key: section, items: [] }
      const at = sections.findIndex((x) => x.key === 'me' || x.key === 'plugins')
      sections.splice(at < 0 ? sections.length : at, 0, s)
    }
    const idx = before ? s.items.findIndex((i) => i.path === before) : -1
    s.items.splice(idx < 0 ? s.items.length : idx, 0, nav)
  }
  return sections
}

function normalizeSection(s: MenuSection): NavSection {
  const raw = s.section
  let key = ''
  let label: NavSection['label']
  if (typeof raw === 'string') {
    // Core sections are labelled by the client's i18n; a plugin's own
    // section ("<plugin>:<id>", CONTRACTS §22) carries its label.
    if (SECTION_KEYS.includes(raw)) key = raw
    else label = s.label || raw
  } else if (raw && typeof raw === 'object') {
    label = raw
  }
  return {
    key: key || (typeof raw === 'string' ? raw : JSON.stringify(label)),
    label: key ? undefined : label,
    items: (s.items || []).map((i) => ({
      id: i.id,
      label: i.label,
      icon: i.icon || (i.plugin_key ? 'puzzle' : undefined),
      path: i.path,
      pluginKey: i.plugin_key
    }))
  }
}
