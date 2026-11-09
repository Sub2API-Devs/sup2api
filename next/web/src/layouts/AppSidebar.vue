<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { SIcon, SSkeleton } from '@sub2api/ui'
import { useAppStore, type NavItem, type NavSection } from '@/stores/app'
import { lt } from '@/i18n'
import VersionBadge from '@/components/VersionBadge.vue'
import SidebarLink from './SidebarLink.vue'
import SidebarSubmenu from './SidebarSubmenu.vue'
import { groupMenus, showGroupTitle, useOpenSections } from './sidebarGroups'

const app = useAppStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

function sectionLabel(s: NavSection): string {
  if (s.label) return lt(s.label)
  return t(`nav.sections.${s.key}`)
}

/**
 * The menu entry of the current page: the page itself, else the nearest page
 * above it (meta.parent, as the breadcrumbs follow), else a path prefix. So
 * /plugins/x/settings, a child of the settings page, lights up Settings.
 */
const activePath = computed(() => {
  const paths = app.menus.flatMap((s) => s.items.map((i) => i.path))
  let p: string | undefined = route.path
  const seen = new Set<string>()
  while (p && !seen.has(p)) {
    if (paths.includes(p)) return p
    seen.add(p)
    p = p === route.path ? route.meta.parent : router.resolve(p).meta.parent
  }
  return paths.filter((x) => x !== '/' && route.path.startsWith(x + '/')).sort((a, b) => b.length - a.length)[0]
})
function active(i: NavItem): boolean {
  return i.path === activePath.value
}

// The drawer closes on any navigation, not only on a menu click (links in pages, Back).
watch(
  () => route.fullPath,
  () => (app.mobileNavOpen = false)
)

/** The desktop collapse does not apply to the mobile drawer, which has no expand button. */
const collapsed = computed(() => app.sidebarCollapsed && !app.mobileNavOpen)

const groups = computed(() => groupMenus(app.menus))
/** Collapsed, every section is a run of icons, a rule between two runs. */
const sections = computed(() => groups.value.flatMap((g) => g.sections))
const activeSubmenu = computed(() => groups.value.flatMap((g) => g.entries).find((e) => e.section?.items.some(active))?.section?.key)
const { isOpen, toggle } = useOpenSections(activeSubmenu)
</script>

<template>
  <div v-if="app.mobileNavOpen" class="fixed inset-0 z-30 bg-black/40 lg:hidden" @click="app.mobileNavOpen = false" />
  <aside
    class="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-surface pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
    :class="[collapsed ? 'w-[72px]' : 'w-60', app.mobileNavOpen ? 'translate-x-0' : '-translate-x-full']"
  >
    <div class="flex min-h-12 shrink-0 items-center gap-2 border-b border-line px-4 py-2" :class="collapsed ? 'flex-col px-1' : ''">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white">
        S
      </div>
      <div class="min-w-0" :class="collapsed ? 'max-w-full' : ''">
        <span v-if="!collapsed" class="block text-base font-semibold leading-tight tracking-tight text-fg">sub2api</span>
        <VersionBadge :compact="collapsed" />
      </div>
    </div>
    <nav class="flex-1 overflow-y-auto px-3 py-3">
      <div v-if="!app.menusLoaded" class="space-y-2 px-2">
        <SSkeleton v-for="i in 8" :key="i" height="2rem" />
      </div>
      <template v-if="collapsed">
        <div v-for="(s, index) in sections" :key="s.key" class="mb-3">
          <hr v-if="index > 0" class="mx-2 mb-3 border-line" aria-hidden="true" />
          <SidebarLink v-for="i in s.items" :key="i.id" :item="i" :active="active(i)" collapsed />
        </div>
      </template>
      <template v-else>
        <div v-for="g in groups" :key="g.key" class="mb-3" :data-testid="`nav-group-${g.key}`">
          <div v-if="showGroupTitle(g)" class="mb-1 px-3 text-xxs font-semibold uppercase tracking-wider text-fg-subtle">
            {{ t(`nav.sections.${g.key}`) }}
          </div>
          <template v-for="e in g.entries" :key="e.key">
            <SidebarSubmenu
              v-if="e.section"
              :section="e.section"
              :label="sectionLabel(e.section)"
              :open="isOpen(e.section.key)"
              :active-path="activePath"
              @toggle="toggle(e.section.key)"
            />
            <SidebarLink v-else :item="e.item" :active="active(e.item)" />
          </template>
        </div>
      </template>
      <button
        v-if="app.menusError"
        type="button"
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-danger-600 hover:bg-surface-2"
        :title="collapsed ? t('nav.menuRetry') : undefined"
        data-testid="menu-retry"
        @click="app.loadMenus()"
      >
        <SIcon name="refresh" class="h-5 w-5 shrink-0" />
        <span v-if="!collapsed" class="truncate text-left">{{ t('nav.menuRetry') }}</span>
      </button>
    </nav>
    <button
      type="button"
      class="hidden h-10 shrink-0 items-center justify-center border-t border-line text-fg-subtle hover:text-fg lg:flex"
      :title="app.sidebarCollapsed ? t('nav.expand') : t('nav.collapse')"
      :aria-label="app.sidebarCollapsed ? t('nav.expand') : t('nav.collapse')"
      :aria-expanded="!app.sidebarCollapsed"
      @click="app.sidebarCollapsed = !app.sidebarCollapsed"
    >
      <SIcon name="chevron-right" class="h-4 w-4 transition-transform" :class="app.sidebarCollapsed ? '' : 'rotate-180'" />
    </button>
  </aside>
</template>
