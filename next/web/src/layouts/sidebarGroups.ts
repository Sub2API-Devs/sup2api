import { ref, watch, type Ref } from 'vue'
import type { NavItem, NavSection } from '@/stores/app'

/**
 * The sidebar shows three groups (CONTRACTS §90): the console every role has
 * (section "overview"), personal ("me") and admin, which holds every other
 * section in the server's order: core sections listed flat, a plugin's own
 * section folded into a submenu, and system settings as one last entry.
 */
export type NavGroupKey = 'overview' | 'me' | 'admin'

/** A menu entry, lit up by any of `paths`: system settings stands for all of its pages. */
export interface NavLink {
  key: string
  item: NavItem
  paths: string[]
}

/** A row of a group: a menu entry, or a plugin section folded into a submenu. */
export type NavEntry = (NavLink & { section?: never }) | { key: string; section: NavSection; item?: never }

export interface NavGroup {
  key: NavGroupKey
  entries: NavEntry[]
}

/** The core section whose pages live inside the settings page's navigation. */
export const SETTINGS_SECTION = 'system'

/** Sections that make a caller an operator; only then is the admin group titled. */
const OPERATOR_SECTIONS = ['gateway', 'security', 'finance', 'users', SETTINGS_SECTION]

/** A plugin's own section is keyed "<plugin>:<id>"; core sections are bare ids. */
const isPluginSection = (s: NavSection) => s.key.includes(':')

const linkOf = (item: NavItem): NavLink => ({ key: `item:${item.id}`, item, paths: [item.path] })

/** System settings as one entry, opening its first page the caller may see. */
function settingsLink(s: NavSection): NavLink {
  const item: NavItem = { id: SETTINGS_SECTION, labelKey: 'nav.sections.system', icon: 'settings', path: s.items[0].path }
  return { key: `item:${SETTINGS_SECTION}`, item, paths: s.items.map(i => i.path) }
}

function adminEntries(sections: NavSection[]): NavEntry[] {
  const entries = sections
    .filter(s => s.key !== SETTINGS_SECTION)
    .flatMap((s): NavEntry[] =>
      isPluginSection(s) && s.items.length > 1 ? [{ key: `section:${s.key}`, section: s }] : s.items.map(linkOf)
    )
  return [...entries, ...sections.filter(s => s.key === SETTINGS_SECTION).map(settingsLink)]
}

export function groupMenus(menus: NavSection[]): NavGroup[] {
  const linksIn = (key: string) => menus.filter(s => s.key === key).flatMap(s => s.items.map(linkOf))
  const groups: NavGroup[] = [
    { key: 'overview', entries: linksIn('overview') },
    { key: 'me', entries: linksIn('me') },
    { key: 'admin', entries: adminEntries(menus.filter(s => s.key !== 'overview' && s.key !== 'me')) }
  ]
  return groups.filter(g => g.entries.length > 0)
}

/**
 * The admin title is for operators: a user whose only other section is a
 * public plugin page sees that page without it.
 */
export function showGroupTitle(g: NavGroup, menus: NavSection[]): boolean {
  return g.key !== 'admin' || menus.some(s => OPERATOR_SECTIONS.includes(s.key))
}

/** The links a collapsed sidebar shows as icons: submenus unfolded. */
export function groupLinks(g: NavGroup): NavLink[] {
  return g.entries.flatMap(e => (e.section ? e.section.items.map(linkOf) : [e]))
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
 * Which submenus are expanded, remembered across visits. The submenu of the
 * current page opens by itself; closing it again is the user's call.
 */
export function useOpenSections(activeSection: Ref<string | undefined>) {
  const open = ref(new Set(readOpen()))
  watch(activeSection, k => k && open.value.add(k), { immediate: true })
  watch(
    open,
    v => {
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify([...v]))
      } catch {
        // Storage full or blocked: the submenus stay as they are, just not remembered.
      }
    },
    { deep: true }
  )
  const isOpen = (key: string) => open.value.has(key)
  const toggle = (key: string) => (isOpen(key) ? open.value.delete(key) : open.value.add(key))
  return { isOpen, toggle }
}
