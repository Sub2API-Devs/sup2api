<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, isApiError } from '@sub2api/host'
import { SButton, SCard, SEmpty, SPageHeader, SSpinner } from '@sub2api/ui'
import { lt } from '@/i18n'
import { errorMessage } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import { usePluginStore } from '@/stores/plugins'
import { hasCoreSettings, type PluginSettings } from './pluginUtil'
import SettingsTab from './detail/SettingsTab.vue'

// A plugin's settings on their own page, for holders of the permission the
// plugin names for them (manifest ui.settings.permission) who cannot open the
// plugin detail page (plugin:read). The core checks the permission. It shows
// what the detail page's settings tab shows: the core settings view of
// ccgateway, else the plugin's schema form.
const CCGatewaySettings = defineAsyncComponent(() => import('@/views/ccgateway/CCGatewayView.vue'))
const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const plugins = usePluginStore()
const key = computed(() => String(route.params.key))
const name = computed(() => lt(plugins.plugin(key.value)?.name) || key.value)
const coreSettings = computed(() => hasCoreSettings(key.value, (p) => auth.has(p)))
const settings = ref<PluginSettings | null>(null)
const loading = ref(true)
const error = ref('')
const denied = ref(false)

async function load() {
  error.value = ''
  denied.value = false
  if (coreSettings.value) {
    loading.value = false
    return
  }
  try {
    const s = await api.get<PluginSettings>(`/plugins/${encodeURIComponent(key.value)}/settings`)
    settings.value = s && s.schema ? s : null
  } catch (e) {
    settings.value = null
    if (isApiError(e) && e.status === 403) denied.value = true
    else error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

watch(key, () => {
  loading.value = true
  load()
})
onMounted(load)
</script>

<template>
  <div>
    <SPageHeader :title="name" :description="t('plugins.settings.pageHint')" />
    <div v-if="loading" class="flex justify-center py-20"><SSpinner size="lg" /></div>
    <CCGatewaySettings v-else-if="coreSettings" embedded />
    <SCard v-else-if="!settings">
      <SEmpty
        :icon="denied ? 'lock' : 'plugin'"
        :text="denied ? t('plugins.settings.denied') : error || t('plugins.settings.none')"
      >
        <SButton v-if="error" size="sm" @click="load">{{ t('common.refresh') }}</SButton>
      </SEmpty>
    </SCard>
    <SettingsTab v-else :plugin-key="key" :settings="settings" @saved="load" />
  </div>
</template>
