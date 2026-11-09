<script setup lang="ts">
import { computed, onMounted, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { provideTitleContext } from '@sub2api/ui'
import { refreshShell, useAppStore } from '@/stores/app'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import SettingsShell from './SettingsShell.vue'
import { SETTINGS_SECTION } from './sidebarGroups'
import { useActiveMenuSection, useRouteLineage } from './useActiveMenu'
import { SETTINGS_PAGE } from '@/views/settings/settingsNav'

const app = useAppStore()
const route = useRoute()
const { t } = useI18n()

// The top bar shows the route title and the page description; a page header
// with the same title is only its filters and actions, and with no filters its
// actions move into the top bar on a wide screen (AppTopbar's #s-page-actions).
provideTitleContext(() => (route.meta.title ? t(route.meta.title as string) : ''), toRef(app, 'pageDescription'), '#s-page-actions')

// The menus do not wait for the plugin modules: GET /me/menus already lists
// plugin menus, and the fallback is a fixed dashboard entry.
onMounted(() => void refreshShell())

// The pages of system settings open inside its navigation (CONTRACTS §90).
// A core page says so by its route (meta.parent), so it opens there at once,
// even when the menu could not load; a plugin page is placed by the menu and
// waits for it rather than mount twice when it arrives.
const lineage = useRouteLineage()
const activeSection = useActiveMenuSection()
const inSettings = computed(() => lineage.value.includes(SETTINGS_PAGE) || activeSection.value === SETTINGS_SECTION)
const placed = computed(() => app.menusLoaded || !route.path.startsWith('/p/'))
</script>

<template>
  <div class="flex min-h-dvh">
    <AppSidebar />
    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopbar />
      <!-- A floating action button (SButton fab) must not cover the end of the page: pagination, the last card's actions. -->
      <main class="w-full min-w-0 flex-1 px-3 py-3 md:px-5 md:py-4 [&:has([data-fab])]:pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <RouterView v-slot="{ Component, route: view }">
          <template v-if="!placed" />
          <SettingsShell v-else-if="inSettings">
            <component :is="Component" :key="view.path" />
          </SettingsShell>
          <component :is="Component" v-else :key="view.path" />
        </RouterView>
      </main>
    </div>
  </div>
</template>
