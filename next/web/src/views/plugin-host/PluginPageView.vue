<script setup lang="ts">
import { computed, onErrorCaptured, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { SPageHeader, SSpinner, SEmpty } from '@sub2api/ui'
import { usePluginStore, assetURL } from '@/stores/plugins'
import { lt } from '@/i18n'
import DeclarativeTable from '@/components/plugin/DeclarativeTable.vue'
import DeclarativeForm from '@/components/plugin/DeclarativeForm.vue'
import PluginIframe from '@/components/plugin/PluginIframe.vue'

const route = useRoute()
const plugins = usePluginStore()
const { t } = useI18n()

const pluginKey = computed(() => String(route.params.plugin))
const pageId = computed(() => String(route.params.page))
const found = computed(() => plugins.page(pluginKey.value, pageId.value))
const crashed = ref('')

const title = computed(() => {
  const f = found.value
  if (!f) return pluginKey.value
  if (f.page.title) return lt(f.page.title)
  const menu = f.plugin.menus?.find((m) => m.page === pageId.value)
  return menu ? lt(menu.label) : lt(f.plugin.name) || f.plugin.key
})

const nativeComponent = computed(() => (found.value?.page.type === 'native' ? plugins.component(pluginKey.value, found.value.page.component) : undefined))

watch([pluginKey, pageId], () => (crashed.value = ''))

onErrorCaptured((err) => {
  console.error(`[plugins] page ${pluginKey.value}/${pageId.value} failed`, err)
  crashed.value = err instanceof Error ? err.message : String(err)
  return false
})
</script>

<template>
  <div>
    <SPageHeader :title="title" :description="found ? `${found.plugin.key} v${found.plugin.version}` : undefined" />
    <div v-if="!plugins.ready" class="flex justify-center py-16"><SSpinner /></div>
    <SEmpty v-else-if="!found" :text="t('pluginHost.notFound', { plugin: pluginKey, page: pageId })" icon="puzzle" />
    <div v-else-if="crashed" class="card p-6 text-sm text-red-600 dark:text-red-400">{{ t('pluginHost.crashed') }}: {{ crashed }}</div>
    <template v-else>
      <DeclarativeTable v-if="found.page.type === 'table'" :plugin="found.plugin" :page="found.page" />
      <DeclarativeForm v-else-if="found.page.type === 'form'" :plugin="found.plugin" :page="found.page" />
      <PluginIframe
        v-else-if="found.page.type === 'iframe' && found.page.src"
        :plugin-key="found.plugin.key"
        :page="pageId"
        :src="assetURL(found.plugin, found.page.src)"
        :min-height="480"
      />
      <template v-else-if="found.page.type === 'native'">
        <component :is="nativeComponent" v-if="nativeComponent" />
        <div v-else class="card p-6 text-sm text-gray-500 dark:text-dark-400">
          {{ plugins.errors[pluginKey] ? t('pluginHost.nativeFailed', { reason: plugins.errors[pluginKey] }) : t('pluginHost.nativeMissing', { component: found.page.component || '?' }) }}
        </div>
      </template>
      <SEmpty v-else :text="t('pluginHost.unsupported', { type: found.page.type })" />
    </template>
  </div>
</template>
