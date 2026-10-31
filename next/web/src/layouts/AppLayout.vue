<script setup lang="ts">
import { onMounted, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { provideTitleContext } from '@sub2api/ui'
import { useAppStore } from '@/stores/app'
import { usePluginStore } from '@/stores/plugins'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'

const app = useAppStore()
const plugins = usePluginStore()
const route = useRoute()
const { t } = useI18n()

// The top bar shows the route title and the page description; a page header
// with the same title is only its filters and actions.
provideTitleContext(() => (route.meta.title ? t(route.meta.title as string) : ''), toRef(app, 'pageDescription'))

// The menus do not wait for the plugin modules: GET /me/menus already lists
// plugin menus, and the fallback waits for the plugin list only.
onMounted(() => {
  void plugins.refresh()
  void app.loadMenus()
})
</script>

<template>
  <div class="flex min-h-screen">
    <AppSidebar />
    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopbar />
      <main class="w-full min-w-0 flex-1 px-4 py-4 sm:px-5">
        <RouterView v-slot="{ Component, route: view }">
          <component :is="Component" :key="view.path" />
        </RouterView>
      </main>
    </div>
  </div>
</template>
