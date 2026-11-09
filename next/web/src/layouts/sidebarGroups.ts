import { ref, watch, type Ref } from 'vue'
import type { NavItem, NavSection } from '@/stores/app'

/**
 * The sidebar shows three groups (CONTRACTS §90): the console every role has
 * (section "overview"), personal ("me") and admin, which holds every other
 * section, core or plugin, in the server's order.
 */
export type NavGroupKey = 'overview' | 'me' | 'admin'

/** A row of an expanded group: a menu entry, or a whole section as one submenu. */
export type NavEntry = { key: string; item: NavItem; section?: never } | { key: string; section: NavSection; item?: never }

export interface NavGroup {
  key: NavGroupKey
  sections: NavSection[]
  entries: NavEntry[]
}

/** Sections that make a caller an operator; only then is the admin group titled. */
const OPERATOR_SECTIONS = ['gateway', 'security', 'finance', 'users', 'system']

/** Submenu icons of the core sections; a plugin section uses its first item's. */
const SECTION_ICONS: Record<string, string> = {
  gateway: 'bolt',
  security: 'shield',
  finance: 'ledger',
  users: 'user',
  plugins: 'plugin',
  system: 'settings'
}

/** In the admin group a section of two or more entries is one submenu; elsewhere entries are listed. */
function entriesOf(key: NavGroupKey, sections: NavSection[]): NavEntry[] {
  return sections.flatMap((s): NavEntry[] =>
    key === 'admin' && s.items.length > 1 ? [{ key: `section:${s.key}`, section: s }] : s.items.map((item) => ({ key: `item:${item.id}`, item }))
  )
}

export function groupMenus(menus: NavSection[]): NavGroup[] {
  const of = (key: NavGroupKey, pick: (s: NavSection) => boolean): NavGroup => {
    const sections = menus.filter(pick)
    return { key, sections, entries: entriesOf(key, sections) }
  }
  return [
    of('overview', (s) => s.key === 'overview'),
    of('me', (s) => s.key === 'me'),
    of('admin', (s) => s.key !== 'overview' && s.key !== 'me')
  ].filter((g) => g.sections.length > 0)
}

/**
 * The admin title is for operators: a user whose only other section is a
 * public plugin page sees that page's submenu without it.
 */
export function showGroupTitle(g: NavGroup): boolean {
  return g.key !== 'admin' || g.sections.some((s) => OPERATOR_SECTIONS.includes(s.key))
}

export function sectionIcon(s: NavSection): string {
  return SECTION_ICONS[s.key] || s.items[0]?.icon || 'puzzle'
}

const OPEN_KEY = 's2a.navOpen'

function readOpen(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(OPEN_KEY) || '[]')
    return Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string') : []
  } catch {
    return []
  }
}

/**
 * Which admin submenus are expanded, remembered across visits. The submenu of
 * the current page opens by itself; closing it again is the user's call.
 */
export function useOpenSections(activeSection: Ref<string | undefined>) {
  const open = ref(new Set(readOpen()))
  watch(activeSection, (k) => k && open.value.add(k), { immediate: true })
  watch(open, (v) => localStorage.setItem(OPEN_KEY, JSON.stringify([...v])), { deep: true })
  const isOpen = (key: string) => open.value.has(key)
  const toggle = (key: string) => (isOpen(key) ? open.value.delete(key) : open.value.add(key))
  return { isOpen, toggle }
}
