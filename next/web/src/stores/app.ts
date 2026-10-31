import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { api } from '@sub2api/host'
import type { MenuSection } from '@/api/types'

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

// Core section keys, labelled by the client's i18n (nav.sections.*); a
// plugin's own section ("<plugin>:<id>") carries its own label.
const SECTION_KEYS = ['overview', 'gateway', 'security', 'finance', 'users', 'plugins', 'system', 'me']

// Shown when GET /me/menus fails: the sidebar has only one definition (the
// server's), so the client does not guess the rest; it offers a retry.
const FALLBACK_MENU: NavSection[] = [{ key: 'overview', items: [{ id: 'dashboard', labelKey: 'nav.items.dashboard', icon: 'dashboard', path: '/dashboard' }] }]

export const useAppStore = defineStore('app', () => {
  const theme = ref<Theme>(initialTheme())
  const sidebarCollapsed = ref(localStorage.getItem('s2a.sidebar') === '1')
  const mobileNavOpen = ref(false)
  /** Description of the current page, shown beside the top bar title. */
  const pageDescription = ref('')
  const menus = ref<NavSection[]>([])
  const menusLoaded = ref(false)
  /** GET /me/menus failed; the sidebar shows the dashboard and a retry. */
  const menusError = ref(false)

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
    menusError.value = false
    try {
      const data = await api.get<MenuSection[]>('/me/menus')
      menus.value = (data || []).map(normalizeSection).filter((s) => s.items.length > 0)
    } catch {
      menus.value = FALLBACK_MENU
      menusError.value = true
    } finally {
      menusLoaded.value = true
    }
  }

  return { theme, sidebarCollapsed, mobileNavOpen, pageDescription, menus, menusLoaded, menusError, toggleTheme, loadMenus }
})

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
