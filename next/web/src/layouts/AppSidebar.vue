<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { SIcon } from '@sub2api/ui'
import { useAppStore, type NavItem, type NavSection } from '@/stores/app'
import { lt } from '@/i18n'

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
</script>

<template>
  <div v-if="app.mobileNavOpen" class="fixed inset-0 z-30 bg-black/40 lg:hidden" @click="app.mobileNavOpen = false" />
  <aside
    class="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-dark-800 dark:bg-dark-900 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
    :class="[app.sidebarCollapsed ? 'w-[72px]' : 'w-60', app.mobileNavOpen ? 'translate-x-0' : '-translate-x-full']"
  >
    <div class="flex h-14 shrink-0 items-center gap-2 border-b border-gray-100 px-4 dark:border-dark-800">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white">
        S
      </div>
      <span v-if="!app.sidebarCollapsed" class="text-base font-semibold tracking-tight text-gray-900 dark:text-white">sub2api</span>
    </div>
    <nav class="flex-1 overflow-y-auto px-3 py-3">
      <div v-if="!app.menusLoaded" class="space-y-2 px-2">
        <div v-for="i in 8" :key="i" class="h-8 animate-pulse rounded-lg bg-gray-100 dark:bg-dark-800" />
      </div>
      <div v-for="s in app.menus" :key="s.key" class="mb-3">
        <div
          v-if="!app.sidebarCollapsed && !(s.key === 'overview')"
          class="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-500"
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
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-300 dark:hover:bg-dark-800 dark:hover:text-white'
          "
          @click="app.mobileNavOpen = false"
        >
          <SIcon :name="i.icon || 'puzzle'" class="h-5 w-5 shrink-0" />
          <span v-if="!app.sidebarCollapsed" class="truncate">{{ itemLabel(i) }}</span>
        </RouterLink>
      </div>
    </nav>
    <button
      class="hidden h-10 shrink-0 items-center justify-center border-t border-gray-100 text-gray-400 hover:text-gray-700 dark:border-dark-800 dark:hover:text-gray-200 lg:flex"
      :title="t('nav.collapse')"
      @click="app.sidebarCollapsed = !app.sidebarCollapsed"
    >
      <SIcon name="chevron-right" class="h-4 w-4 transition-transform" :class="app.sidebarCollapsed ? '' : 'rotate-180'" />
    </button>
  </aside>
</template>
