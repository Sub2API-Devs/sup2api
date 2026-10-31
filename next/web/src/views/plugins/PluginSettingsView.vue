<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, isApiError } from '@sub2api/host'
import { SButton, SCard, SEmpty, SPageHeader, SSpinner } from '@sub2api/ui'
import { lt } from '@/i18n'
import { errorMessage } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import { usePluginStore } from '@/stores/plugins'
import { consoleSettings, hasCoreSettings, nativeSettingsPath, type PluginSettings } from './pluginUtil'
import SettingsTab from './detail/SettingsTab.vue'

// A plugin's settings on their own page, for holders of the permission the
// plugin names for them (manifest ui.settings.permission) who cannot open the
// plugin detail page (plugin:read). The core checks the permission. It shows
// what the detail page's settings tab shows: the core settings view of
// ccgateway, else the plugin's schema form; native settings (§75.5) send the
// user to the plugin page that edits them.
const CCGatewaySettings = defineAsyncComponent(() => import('@/views/ccgateway/CCGatewayView.vue'))
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const plugins = usePluginStore()
const key = computed(() => String(route.params.key))
const name = computed(() => lt(plugins.plugin(key.value)?.name) || key.value)
const coreSettings = computed(() => hasCoreSettings(key.value, (p) => auth.has(p)))
const settings = ref<PluginSettings | null>(null)
const loading = ref(true)
const error = ref('')
const denied = ref(false)
/** Only the latest load applies: a late answer for the plugin left behind must not show here. */
let seq = 0

async function load() {
  const my = ++seq
  error.value = ''
  denied.value = false
  if (coreSettings.value) {
    settings.value = null
    loading.value = false
    return
  }
  try {
    const s = await api.get<PluginSettings>(`/plugins/${encodeURIComponent(key.value)}/settings`)
    if (my !== seq) return
    // Native settings live on the plugin's own page (§75.5): go there.
    const native = nativeSettingsPath(key.value, s)
    if (native) {
      router.replace(native)
      return
    }
    settings.value = consoleSettings(s)
  } catch (e) {
    if (my !== seq) return
    settings.value = null
    if (isApiError(e) && e.status === 403) denied.value = true
    else error.value = errorMessage(e)
  } finally {
    if (my === seq) loading.value = false
  }
}

watch(key, () => {
  loading.value = true
  settings.value = null
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
