<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { SBadge, SButton, SPageHeader, STabs } from '@sub2api/ui'
import OverviewTab from './OverviewTab.vue'
import EventsTab from './EventsTab.vue'
import WatchTab from './WatchTab.vue'
import BlocksTab from './BlocksTab.vue'
import FlowsTab from './FlowsTab.vue'
import AuditorsTab from './AuditorsTab.vue'
import ChannelsTab from './ChannelsTab.vue'
import TestTab from './TestTab.vue'
import SettingsTab from './SettingsTab.vue'
import { useCatalog } from './catalog'
import { canManage, canManageSettings, settingsPath, useModHost } from './host'
import { useStatus } from './status'
import { modeTone } from './tones'
import type { TabKey } from './types'

// Prompt moderation page (CONTRACTS §72.15): overview, records, watch list,
// bans, flows, auditors, channels, playground and, for those who may edit
// the settings (plugin:manage or moderation:manage, §75.1), the
// moderation settings (the full schema form stays on the plugin page).
const host = useModHost()
const t = host.t

const manage = computed(() => canManage())
const manageSettings = computed(() => canManageSettings())
const tabs = computed(() => {
  const list: Array<{ key: TabKey; label: string }> = [
    { key: 'overview', label: t('tabs.overview') },
    { key: 'events', label: t('tabs.events') },
    { key: 'watch', label: t('tabs.watch') },
    { key: 'blocks', label: t('tabs.blocks') },
    { key: 'flows', label: t('tabs.flows') },
    { key: 'auditors', label: t('tabs.auditors') },
    { key: 'channels', label: t('tabs.channels') }
  ]
  if (manage.value) list.push({ key: 'test', label: t('tabs.test') })
  if (manageSettings.value) list.push({ key: 'settings', label: t('tabs.settings') })
  return list
})
const isTab = (v: unknown): v is TabKey => tabs.value.some((x) => x.key === v)

/** ?tab=, else the records tab for a ?record= link, else the overview. */
function initialTab(): TabKey {
  const { tab: q, record } = host.router.currentRoute.value.query
  if (isTab(q)) return q
  return record ? 'events' : 'overview'
}

const tab = ref<TabKey>(initialTab())
const visited = ref(new Set<TabKey>([tab.value]))

watch(tab, (v) => {
  if (!visited.value.has(v)) visited.value = new Set([...visited.value, v])
  const route = host.router.currentRoute.value
  if (route.query.tab !== v) host.router.replace({ query: { ...route.query, tab: v } })
})

// Mode badge and the error-rate alert threshold, from the status the
// overview shows too (the overview loads it itself).
const status = useStatus()
const runtime = computed(() => status.data.value?.runtime ?? null)
onMounted(() => tab.value !== 'overview' && status.reload())

// Tabs with reload(), refreshed by the header button (the overview reloads the status itself).
const refs: Partial<Record<TabKey, { reload(): unknown }>> = {}
const setRef = (k: TabKey) => (el: unknown) => {
  if (el) refs[k] = el as { reload(): unknown }
  else delete refs[k]
}
const catalog = useCatalog()
const refreshing = ref(false)
async function refresh() {
  refreshing.value = true
  try {
    await Promise.all([refs[tab.value]?.reload(), tab.value !== 'overview' && Promise.all([catalog.refresh(), status.reload()])])
  } finally {
    refreshing.value = false
  }
}

/** A tab link; tabs the user cannot see (playground, settings) are ignored. */
function goTab(k: TabKey) {
  if (isTab(k)) tab.value = k
}

function goSettings() {
  if (manageSettings.value) tab.value = 'settings'
  else host.router.push(settingsPath())
}

// "Show records of this user" from the overview and the watch list.
const userPreset = ref<{ user_id: number; n: number } | null>(null)
let presetN = 0
function showUser(userId: number) {
  userPreset.value = { user_id: userId, n: ++presetN }
  tab.value = 'events'
}

// "Open this user's watch detail" from the overview.
const watchPreset = ref<{ user_id: number; n: number } | null>(null)
function openWatch(userId: number) {
  watchPreset.value = { user_id: userId, n: ++presetN }
  tab.value = 'watch'
}
</script>

<template>
  <div>
    <SPageHeader :title="t('title')" :description="t('subtitle')">
      <template #title-extra>
        <SBadge v-if="runtime" :tone="modeTone(runtime.mode)" dot>{{ t(`mode.${runtime.mode || 'off'}`) }}</SBadge>
        <SBadge v-if="runtime && !runtime.configured" tone="warning">{{ t('notConfiguredBadge') }}</SBadge>
      </template>
      <template #actions>
        <SButton v-if="manageSettings" icon="settings" @click="host.router.push(settingsPath())">{{ t('settingsAll') }}</SButton>
        <SButton icon="refresh" icon-only :aria-label="t('refresh')" :title="t('refresh')" :loading="refreshing" @click="refresh" />
      </template>
    </SPageHeader>

    <STabs v-model="tab" :tabs="tabs">
      <OverviewTab
        v-if="visited.has('overview')"
        v-show="tab === 'overview'"
        :ref="setRef('overview')"
        :active="tab === 'overview'"
        @open-watch="openWatch"
        @go-tab="goTab"
        @go-settings="goSettings"
      />
      <EventsTab v-if="visited.has('events')" v-show="tab === 'events'" :ref="setRef('events')" :preset="userPreset" />
      <WatchTab v-if="visited.has('watch')" v-show="tab === 'watch'" :ref="setRef('watch')" :preset="watchPreset" @show-user="showUser" />
      <BlocksTab v-if="visited.has('blocks')" v-show="tab === 'blocks'" :ref="setRef('blocks')" />
      <FlowsTab v-if="visited.has('flows')" v-show="tab === 'flows'" :ref="setRef('flows')" @go-tab="goTab" />
      <AuditorsTab v-if="visited.has('auditors')" v-show="tab === 'auditors'" :ref="setRef('auditors')" />
      <ChannelsTab v-if="visited.has('channels')" v-show="tab === 'channels'" :ref="setRef('channels')" :alert-percent="status.data.value?.error_rate_alert_percent ?? 0" />
      <TestTab v-if="manage && visited.has('test')" v-show="tab === 'test'" @go-tab="goTab" />
      <SettingsTab v-if="manageSettings && visited.has('settings')" v-show="tab === 'settings'" :ref="setRef('settings')" />
    </STabs>
  </div>
</template>
