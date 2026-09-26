<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { SBadge, SButton, SIcon, SPageHeader, STabs } from '@sub2api/ui'
import OverviewTab from './OverviewTab.vue'
import EventsTab from './EventsTab.vue'
import BlocksTab from './BlocksTab.vue'
import TestTab from './TestTab.vue'
import SettingsTab from './SettingsTab.vue'
import { canManage, canManageSettings, fetchOverview, modeTone, useModHost, type Runtime } from './host'

// Prompt moderation page (CONTRACTS §20.8): overview, records, blocked users,
// playground, LLM settings. The mode badge comes from the overview's runtime block.
const host = useModHost()
const t = host.t

type TabKey = 'overview' | 'events' | 'blocks' | 'test' | 'settings'

const manage = computed(() => canManage())
const showSettingsTab = computed(() => canManageSettings())
const tabs = computed(() => {
  const list: Array<{ key: TabKey; label: string }> = [
    { key: 'overview', label: t('tabs.overview') },
    { key: 'events', label: t('tabs.events') },
    { key: 'blocks', label: t('tabs.blocks') }
  ]
  if (manage.value) list.push({ key: 'test', label: t('tabs.test') })
  if (showSettingsTab.value) list.push({ key: 'settings', label: t('tabs.settings') })
  return list
})

function initialTab(): TabKey {
  const q = host.router.currentRoute.value.query.tab
  const v = typeof q === 'string' ? q : ''
  return (tabs.value.some((x) => x.key === v) ? v : 'overview') as TabKey
}

const tab = ref<TabKey>(initialTab())
// Tabs are mounted on first visit and kept alive afterwards (filters survive).
const visited = ref(new Set<TabKey>([tab.value]))

watch(tab, (v) => {
  if (!visited.value.has(v)) visited.value = new Set([...visited.value, v])
  const route = host.router.currentRoute.value
  if (route.query.tab !== v) host.router.replace({ query: { ...route.query, tab: v } })
})

// Runtime (mode badge) — refreshed by the overview tab, or fetched once here
// when the page opens on another tab.
const runtime = ref<Runtime | null>(null)
const showSettings = computed(() => canManageSettings())

onMounted(async () => {
  if (tab.value === 'overview') return
  try {
    runtime.value = (await fetchOverview('24h')).runtime
  } catch {
    /* the badge is optional */
  }
})

// Refresh: each tab exposes reload().
const overviewRef = ref<InstanceType<typeof OverviewTab> | null>(null)
const eventsRef = ref<InstanceType<typeof EventsTab> | null>(null)
const blocksRef = ref<InstanceType<typeof BlocksTab> | null>(null)
const refreshing = ref(false)

async function refresh() {
  refreshing.value = true
  try {
    if (tab.value === 'overview') await overviewRef.value?.reload()
    else if (tab.value === 'events') await eventsRef.value?.reload()
    else if (tab.value === 'blocks') await blocksRef.value?.reload()
    if (tab.value !== 'overview' && tab.value !== 'settings') {
      runtime.value = (await fetchOverview('24h').catch(() => null))?.runtime ?? runtime.value
    }
  } finally {
    refreshing.value = false
  }
}

// Overview "top users" -> records of that user.
const userPreset = ref<{ user_id: number; n: number } | null>(null)
let presetN = 0
function showUser(userId: number) {
  userPreset.value = { user_id: userId, n: ++presetN }
  tab.value = 'events'
}
</script>

<template>
  <div class="mod-page">
    <SPageHeader :title="t('title')" :description="t('subtitle')">
      <template #title-extra>
        <SBadge v-if="runtime" :tone="modeTone(runtime.mode)" dot>{{ t(`mode.${runtime.mode || 'off'}`) }}</SBadge>
        <SBadge v-if="runtime && !runtime.configured" tone="warning">{{ t('notConfiguredBadge') }}</SBadge>
      </template>
      <template #actions>
        <SButton :loading="refreshing" :title="t('refresh')" @click="refresh"><SIcon name="refresh" class="mod-icon" /></SButton>
      </template>
    </SPageHeader>

    <STabs v-model="tab" :tabs="tabs" class="mod-tabs" />

    <OverviewTab
      v-if="visited.has('overview')"
      v-show="tab === 'overview'"
      ref="overviewRef"
      @runtime="runtime = $event"
      @show-user="showUser"
    />
    <EventsTab v-if="visited.has('events')" v-show="tab === 'events'" ref="eventsRef" :preset="userPreset" />
    <BlocksTab v-if="visited.has('blocks')" v-show="tab === 'blocks'" ref="blocksRef" />
    <TestTab v-if="manage && visited.has('test')" v-show="tab === 'test'" />
    <SettingsTab v-if="showSettings && visited.has('settings')" v-show="tab === 'settings'" />
  </div>
</template>
