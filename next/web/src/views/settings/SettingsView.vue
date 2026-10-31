<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SPageHeader, SSelect, STitleScope } from '@sub2api/ui'
import type { PluginSummary } from '@/api/types'
import { lt } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import StickyView from '@/views/sticky/StickyView.vue'
import BillingSettingsCard from './BillingSettingsCard.vue'
import EnvironmentSettingsCard from './EnvironmentSettingsCard.vue'
import GatewaySettingsCard from './GatewaySettingsCard.vue'
import NotificationsSettingsCard from './NotificationsSettingsCard.vue'
import FailurePolicySettings from './FailurePolicySettings.vue'
import OffloadSettingsCard from './OffloadSettingsCard.vue'
import UpdateSourceCard from './UpdateSourceCard.vue'

const PluginSettings = defineAsyncComponent(() => import('@/views/plugins/PluginSettingsView.vue'))

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

// Settings are grouped in a side navigation instead of one row of tabs; the
// selected page is ?tab=<key> (links such as /settings?tab=sticky keep
// working). Plugin settings join as ?tab=plugin:<key>, so an operator finds
// e.g. the mail server here instead of under the plugin list.
interface NavEntry {
  key: string
  label: string
}
interface NavGroup {
  key: string
  label: string
  items: NavEntry[]
}

const GROUPS: Array<{ key: string; items: Array<{ key: string; perm: string; label: string }> }> = [
  {
    key: 'gateway',
    items: [
      { key: 'gateway', perm: 'settings:read', label: 'settings.tabs.gateway' },
      { key: 'failure', perm: 'settings:read', label: 'failurePolicy.title' },
      { key: 'sticky', perm: 'sticky:read', label: 'settings.tabs.sticky' },
      { key: 'offload', perm: 'settings:read', label: 'settings.tabs.offload' }
    ]
  },
  { key: 'billing', items: [{ key: 'billing', perm: 'settings:read', label: 'settings.tabs.billing' }] },
  { key: 'notifications', items: [{ key: 'notifications', perm: 'settings:read', label: 'settings.tabs.notifications' }] },
  {
    key: 'system',
    items: [
      { key: 'environment', perm: 'settings:read', label: 'settings.tabs.environment' },
      { key: 'updates', perm: 'settings:read', label: 'coreUpdates.sourceTitle' }
    ]
  }
]

/** Enabled plugins with console settings: a schema form, or the core's ccgateway view. */
const pluginList = ref<PluginSummary[]>([])
onMounted(async () => {
  if (!auth.has('plugin:read')) return
  try {
    const list = await api.get<PluginSummary[]>('/plugins')
    pluginList.value = (list || []).filter(
      (p) => p.status === 'enabled' && (p.key === 'ccgateway' ? auth.has('settings:read') : !!p.has_settings)
    )
  } catch {
    // The plugin group is an index; the plugin list page still reaches them.
    pluginList.value = []
  }
})

const groups = computed<NavGroup[]>(() => {
  const out: NavGroup[] = GROUPS.map((g) => ({
    key: g.key,
    label: t(`settings.groups.${g.key}`),
    items: g.items.filter((x) => auth.has(x.perm)).map((x) => ({ key: x.key, label: t(x.label) }))
  }))
  if (pluginList.value.length) {
    out.push({
      key: 'plugins',
      label: t('settings.groups.plugins'),
      items: pluginList.value.map((p) => ({ key: `plugin:${p.key}`, label: lt(p.name) || p.key }))
    })
  }
  return out.filter((g) => g.items.length > 0)
})
const entries = computed(() => groups.value.flatMap((g) => g.items))

const tab = ref('')
watch(() => route.query.tab, (value) => { tab.value = typeof value === 'string' ? value : '' }, { immediate: true })
/** The selected page when the user may see it, else the first visible one. */
const active = computed(() => (entries.value.some((x) => x.key === tab.value) ? tab.value : entries.value[0]?.key))
const activePlugin = computed(() => (active.value?.startsWith('plugin:') ? active.value.slice('plugin:'.length) : ''))
const activeLabel = computed(() => entries.value.find((x) => x.key === active.value)?.label ?? '')
const options = computed(() => groups.value.flatMap((g) => g.items.map((x) => ({ value: x.key, label: `${g.label} · ${x.label}` }))))

function select(key: string) {
  if (key === active.value) return
  router.replace({ query: { ...route.query, tab: key } })
}
</script>

<template>
  <div class="max-w-screen-2xl space-y-5">
    <SPageHeader :title="t('nav.items.settings')" :description="t('settings.description')" />
    <div class="grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <SSelect
        class="lg:hidden"
        :model-value="active ?? ''"
        :options="options"
        :aria-label="t('settings.navLabel')"
        @update:model-value="select(String($event))"
      />
      <nav class="hidden lg:block" :aria-label="t('settings.navLabel')" data-testid="settings-nav">
        <div v-for="g in groups" :key="g.key" class="mb-4">
          <div class="mb-1 px-3 text-xxs font-semibold uppercase tracking-wider text-fg-subtle">{{ g.label }}</div>
          <button
            v-for="x in g.items"
            :key="x.key"
            type="button"
            class="mb-0.5 block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm transition-colors"
            :class="
              x.key === active
                ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
            "
            :aria-current="x.key === active ? 'page' : undefined"
            :data-testid="`settings-nav-${x.key}`"
            @click="select(x.key)"
          >
            {{ x.label }}
          </button>
        </div>
      </nav>
      <STitleScope :title="activeLabel" class="min-w-0" role="region" :aria-label="activeLabel" data-testid="settings-panel">
        <BillingSettingsCard v-if="active === 'billing'" />
        <GatewaySettingsCard v-else-if="active === 'gateway'" />
        <EnvironmentSettingsCard v-else-if="active === 'environment'" />
        <NotificationsSettingsCard v-else-if="active === 'notifications'" />
        <FailurePolicySettings v-else-if="active === 'failure'" />
        <StickyView v-else-if="active === 'sticky'" />
        <OffloadSettingsCard v-else-if="active === 'offload'" />
        <UpdateSourceCard v-else-if="active === 'updates'" />
        <PluginSettings v-else-if="activePlugin" :key="activePlugin" :plugin-key="activePlugin" />
      </STitleScope>
    </div>
  </div>
</template>
