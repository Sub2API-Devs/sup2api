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
import { canManage, canManageSettings, fetchOverview, modeTone, settingsPath, useModHost, type Runtime } from './host'

// Prompt moderation page (CONTRACTS §72.15): overview, records, watch list,
// bans, flows, auditors, channels, playground. Settings stay on the plugin's
// settings page.
const host = useModHost()
const t = host.t

type TabKey = 'overview' | 'events' | 'watch' | 'blocks' | 'flows' | 'auditors' | 'channels' | 'test'

const manage = computed(() => canManage())
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
  return list
})

function initialTab(): TabKey {
  const q = host.router.currentRoute.value.query.tab
  const v = typeof q === 'string' ? q : ''
  return (tabs.value.some((x) => x.key === v) ? v : 'overview') as TabKey
}

const tab = ref<TabKey>(initialTab())
const visited = ref(new Set<TabKey>([tab.value]))

watch(tab, (v) => {
  if (!visited.value.has(v)) visited.value = new Set([...visited.value, v])
  const route = host.router.currentRoute.value
  if (route.query.tab !== v) host.router.replace({ query: { ...route.query, tab: v } })
})

const runtime = ref<Runtime | null>(null)
onMounted(async () => {
  if (tab.value === 'overview') return
  try {
    runtime.value = (await fetchOverview('24h')).runtime
  } catch {
    /* the badge is optional */
  }
})

// Tabs with reload(), refreshed by the header button.
const refs: Record<string, { reload?: () => unknown } | null> = {}
const setRef = (k: TabKey) => (el: unknown) => (refs[k] = el as { reload?: () => unknown } | null)
const refreshing = ref(false)
async function refresh() {
  refreshing.value = true
  try {
    await refs[tab.value]?.reload?.()
    if (tab.value !== 'overview') runtime.value = (await fetchOverview('24h').catch(() => null))?.runtime ?? runtime.value
  } finally {
    refreshing.value = false
  }
}

function goTab(k: string) {
  if (tabs.value.some((x) => x.key === k)) tab.value = k as TabKey
}

function goSettings() {
  host.router.push(settingsPath())
}

// "Show records of this user" from the overview and the watch list.
const userPreset = ref<{ user_id: number; n: number } | null>(null)
let presetN = 0
function showUser(userId: number) {
  userPreset.value = { user_id: userId, n: ++presetN }
  tab.value = 'events'
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
        <SButton v-if="canManageSettings()" icon="settings" @click="goSettings">{{ t('settings') }}</SButton>
        <SButton icon="refresh" icon-only :aria-label="t('refresh')" :title="t('refresh')" :loading="refreshing" @click="refresh" />
      </template>
    </SPageHeader>

    <STabs v-model="tab" :tabs="tabs">
      <OverviewTab
        v-if="visited.has('overview')"
        v-show="tab === 'overview'"
        :ref="setRef('overview')"
        @runtime="runtime = $event"
        @show-user="showUser"
        @go-tab="goTab"
        @go-settings="goSettings"
      />
      <EventsTab v-if="visited.has('events')" v-show="tab === 'events'" :ref="setRef('events')" :preset="userPreset" />
      <WatchTab v-if="visited.has('watch')" v-show="tab === 'watch'" :ref="setRef('watch')" @show-user="showUser" />
      <BlocksTab v-if="visited.has('blocks')" v-show="tab === 'blocks'" :ref="setRef('blocks')" />
      <FlowsTab v-if="visited.has('flows')" v-show="tab === 'flows'" :ref="setRef('flows')" @go-tab="goTab" />
      <AuditorsTab v-if="visited.has('auditors')" v-show="tab === 'auditors'" :ref="setRef('auditors')" />
      <ChannelsTab v-if="visited.has('channels')" v-show="tab === 'channels'" :ref="setRef('channels')" />
      <TestTab v-if="manage && visited.has('test')" v-show="tab === 'test'" @go-tab="goTab" />
    </STabs>
  </div>
</template>
