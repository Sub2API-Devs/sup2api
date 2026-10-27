<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { SIcon, SSkeleton } from '@sub2api/ui'
import { useAppStore, type NavItem, type NavSection } from '@/stores/app'
import { lt } from '@/i18n'
import VersionBadge from '@/components/VersionBadge.vue'

const app = useAppStore()
const route = useRoute()
const { t } = useI18n()

function sectionLabel(s: NavSection): string {
  if (s.label) return lt(s.label)
  return t(`nav.sections.${s.key}`)
}

function itemLabel(i: NavItem): string {
  if (i.labelKey) return t(i.labelKey)
  return lt(i.label)
}

function active(i: NavItem): boolean {
  return route.path === i.path || (i.path !== '/' && route.path.startsWith(i.path + '/'))
}

/** Attribution for SIcon's unknown-name warning: which menu entry declared it. */
function iconContext(i: NavItem): string {
  return i.pluginKey ? `plugin "${i.pluginKey}" menu "${i.id}"` : `menu "${i.id}"`
}

// A user without any operator section gets one flat list, as in sub2api:
// Dashboard / API keys / Usage records without the "My account" header.
// Plugin sections keep theirs.
const OPERATOR_SECTIONS = ['gateway', 'finance', 'system']
const flat = computed(() => !app.menus.some((s) => OPERATOR_SECTIONS.includes(s.key)))
function showHeader(s: NavSection): boolean {
  return !app.sidebarCollapsed && s.key !== 'overview' && !(flat.value && s.key === 'me')
}
</script>

<template>
  <div v-if="app.mobileNavOpen" class="fixed inset-0 z-30 bg-black/40 lg:hidden" @click="app.mobileNavOpen = false" />
  <aside
    class="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-surface transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
    :class="[app.sidebarCollapsed ? 'w-[72px]' : 'w-60', app.mobileNavOpen ? 'translate-x-0' : '-translate-x-full']"
  >
    <div class="flex min-h-14 shrink-0 items-center gap-2 border-b border-line px-4 py-2" :class="app.sidebarCollapsed ? 'flex-col px-1' : ''">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white">
        S
      </div>
      <div class="min-w-0" :class="app.sidebarCollapsed ? 'max-w-full' : ''">
        <span v-if="!app.sidebarCollapsed" class="block text-base font-semibold leading-tight tracking-tight text-fg">sub2api</span>
        <VersionBadge :compact="app.sidebarCollapsed" />
      </div>
    </div>
    <nav class="flex-1 overflow-y-auto px-3 py-3">
      <div v-if="!app.menusLoaded" class="space-y-2 px-2">
        <SSkeleton v-for="i in 8" :key="i" height="2rem" />
      </div>
      <div v-for="s in app.menus" :key="s.key" :class="flat && s.key === 'overview' ? 'mb-0.5' : 'mb-3'">
        <div
          v-if="showHeader(s)"
          class="mb-1 px-3 text-xxs font-semibold uppercase tracking-wider text-fg-subtle"
        >
          {{ sectionLabel(s) }}
        </div>
        <RouterLink
          v-for="i in s.items"
          :key="i.id"
          :to="i.path"
          :title="app.sidebarCollapsed ? itemLabel(i) : undefined"
          class="mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors"
          :class="
            active(i)
              ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
              : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
          "
          @click="app.mobileNavOpen = false"
        >
          <SIcon :name="i.icon || 'puzzle'" :context="iconContext(i)" class="h-5 w-5 shrink-0" />
          <span v-if="!app.sidebarCollapsed" class="truncate">{{ itemLabel(i) }}</span>
        </RouterLink>
      </div>
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
