<script setup lang="ts">
import { onMounted } from 'vue'
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

// The top bar already shows the route title; a page header with the same
// title only keeps its description and actions.
provideTitleContext(() => (route.meta.title ? t(route.meta.title as string) : ''))

onMounted(async () => {
  await plugins.refresh()
  await app.loadMenus()
})
</script>

<template>
  <div class="flex min-h-screen">
    <AppSidebar />
    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopbar />
      <main class="w-full min-w-0 flex-1 px-4 py-5 sm:px-6">
        <RouterView v-slot="{ Component, route: view }">
          <component :is="Component" :key="view.path" />
        </RouterView>
      </main>
    </div>
  </div>
</template>
