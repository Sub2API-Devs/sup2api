<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SButton, SPageHeader, STabs } from '@sub2api/ui'
import StatusTab from './StatusTab.vue'
import EventsTab from './EventsTab.vue'
import ConfigTab from './ConfigTab.vue'
import { useDwHost, type Filter } from './host'

// Dynamic weight page (CONTRACTS §73.5): effective weights, weight events and
// the configuration. Tabs are mounted on first visit and synced to ?tab.
const host = useDwHost()
const t = host.t

type TabKey = 'status' | 'events' | 'config'

const tabs = computed(() => (['status', 'events', 'config'] as const).map((key) => ({ key, label: t(`tabs.${key}`) })))

function initialTab(): TabKey {
  const q = host.router.currentRoute.value.query.tab
  return tabs.value.some((x) => x.key === q) ? (q as TabKey) : 'status'
}

const tab = ref<TabKey>(initialTab())
const visited = ref(new Set<TabKey>([tab.value]))

watch(tab, (v) => {
  if (!visited.value.has(v)) visited.value = new Set([...visited.value, v])
  const route = host.router.currentRoute.value
  if (route.query.tab !== v) host.router.replace({ query: { ...route.query, tab: v } })
})

// Tabs with reload(), refreshed by the header button.
const refs: Partial<Record<TabKey, { reload?: () => unknown } | null>> = {}
const setRef = (k: TabKey) => (el: unknown) => (refs[k] = el as { reload?: () => unknown } | null)
const refreshing = ref(false)
async function refresh() {
  refreshing.value = true
  try {
    await refs[tab.value]?.reload?.()
  } finally {
    refreshing.value = false
  }
}

// "Events of this key" from the status tab.
const eventsPreset = ref<(Filter & { n: number }) | null>(null)
let presetN = 0
function showEvents(f: Filter) {
  eventsPreset.value = { ...f, n: ++presetN }
  tab.value = 'events'
}
</script>

<template>
  <div>
    <SPageHeader :title="t('title')" :description="t('subtitle')">
      <template #actions>
        <SButton icon="refresh" icon-only :aria-label="t('refresh')" :title="t('refresh')" :loading="refreshing" @click="refresh" />
      </template>
    </SPageHeader>

    <STabs v-model="tab" :tabs="tabs">
      <StatusTab v-if="visited.has('status')" v-show="tab === 'status'" :ref="setRef('status')" @show-events="showEvents" />
      <EventsTab v-if="visited.has('events')" v-show="tab === 'events'" :ref="setRef('events')" :preset="eventsPreset" />
      <ConfigTab v-if="visited.has('config')" v-show="tab === 'config'" :ref="setRef('config')" />
    </STabs>
  </div>
</template>
