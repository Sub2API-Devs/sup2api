<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCard, SHint } from '@sub2api/ui'
import type { PluginHistory, PluginRelease } from '@/api/observability'
import { formatDateTime } from '@/utils/format'
import { errorMessage } from '@/utils/errors'
import { statusTone } from '@/api/admin'
const props = defineProps<{ pluginKey?: string; since?: string }>()
const { t } = useI18n()
const items = ref<PluginRelease[]>([]), events = ref<PluginHistory[]>([])
const selected = ref<PluginRelease | null>(null), page = ref(1), total = ref(0), eventPage = ref(1), eventTotal = ref(0), error = ref('')
const allEvents = ref(false)
const size = 10
let timer: ReturnType<typeof setInterval> | undefined, serial = 0, disposed = false, eventSerial = 0
const groups = computed(() => [...new Set(events.value.map(e => e.node_id || ''))].map(node => ({ node, events: events.value.filter(e => e.node_id === node).slice().reverse() })))
async function load() {
  const token = ++serial
  try {
    const path = props.pluginKey ? `/plugins/${encodeURIComponent(props.pluginKey)}/rollouts` : '/plugins/rollouts'
    const result = await api.list<PluginRelease>(path, { page: page.value, page_size: size, since: props.since })
    if (disposed || token !== serial) return
    items.value = result.items; total.value = result.page.total; error.value = ''
    if (selected.value) selected.value = items.value.find(r => r.id === selected.value?.id) || selected.value
    if (selected.value || allEvents.value) await loadEvents()
  } catch (e) { if (!disposed && token === serial) error.value = errorMessage(e) }
}
async function loadEvents() {
  const key = selected.value?.plugin_key || props.pluginKey
  if (!key) return
  const token = ++eventSerial, id = selected.value?.id
  try {
    const result = await api.list<PluginHistory>(`/plugins/${encodeURIComponent(key)}/history`, { rollout_id: id, page: eventPage.value, page_size: 50 })
    if (disposed || token !== eventSerial || selected.value?.id !== id) return
    events.value = result.items; eventTotal.value = result.page.total
  } catch (e) { if (!disposed && token === eventSerial) error.value = errorMessage(e) }
}
function select(item: PluginRelease) { allEvents.value = false; selected.value = item; eventPage.value = 1; events.value = []; void loadEvents() }
function showAllEvents() { allEvents.value = true; selected.value = null; eventPage.value = 1; events.value = []; void loadEvents() }
watch([() => props.pluginKey, () => props.since], () => { ++eventSerial; allEvents.value = false; selected.value = null; events.value = []; page.value = 1; void load() })
watch(page, () => { selected.value = null; events.value = []; void load() })
watch(eventPage, () => { void loadEvents() })
onMounted(() => { void load(); timer = setInterval(() => { if (document.visibilityState !== 'hidden') void load() }, 5000) })
onBeforeUnmount(() => { disposed = true; clearInterval(timer) })
</script>
<template>
  <SCard :title="t(pluginKey ? 'observe.history' : 'observe.related')" class="mt-5">
    <SHint v-if="!pluginKey">{{ t('observe.relatedHint') }}</SHint>
    <SButton v-else size="sm" class="mb-3" @click="showAllEvents">{{ t('observe.allEvents') }}</SButton>
    <SHint v-if="error" tone="warning">{{ error }}</SHint>
    <SHint v-if="!items.length && !error">{{ t('observe.noHistory') }}</SHint>
    <div class="space-y-3">
      <div v-for="item in items" :key="item.id" class="rounded-xl border border-gray-200 p-3 dark:border-dark-700">
        <button type="button" class="flex w-full flex-wrap items-center gap-2 text-left text-sm" @click="select(item)">
          <strong>{{ item.plugin_key }}</strong><code>#{{ item.id }} · {{ item.from_version || '—' }} → {{ item.target_version || '—' }}</code>
          <SBadge :tone="statusTone(item.phase)">{{ item.phase }}</SBadge><time class="text-xs text-gray-500">{{ formatDateTime(item.created_at) }}</time>
        </button>
        <div class="mt-2 flex flex-wrap gap-2"><SBadge v-for="node in item.nodes" :key="node.boot_id" :tone="statusTone(node.state)" :title="node.error">{{ node.node_id }} · {{ node.state }}</SBadge></div>
        <SHint v-if="item.error" tone="warning">{{ item.error }}</SHint>
      </div>
    </div>
    <div class="my-3 flex items-center gap-3 text-xs"><SButton size="sm" :disabled="page <= 1" @click="page--">{{ t('observe.previous') }}</SButton><span>{{ t('observe.page', { page, total }) }}</span><SButton size="sm" :disabled="page * size >= total" @click="page++">{{ t('observe.next') }}</SButton></div>
    <div v-if="selected || allEvents" class="space-y-3 border-t pt-4 dark:border-dark-700">
      <h3 class="font-semibold">{{ t('observe.timeline') }} · {{ selected?.plugin_key || pluginKey }} <template v-if="selected">#{{ selected.id }}</template></h3>
      <SHint v-if="!events.length">{{ t('observe.noHistory') }}</SHint>
      <div v-for="group in groups" :key="group.node" class="rounded-lg bg-gray-50 p-3 dark:bg-dark-800">
        <strong class="text-sm">{{ group.node || t('observe.cluster') }}</strong>
        <ol class="mt-2 space-y-3 border-l border-primary-300 pl-4 text-xs"><li v-for="event in group.events" :key="event.id">
          <time class="text-gray-500">{{ formatDateTime(event.created_at) }} · {{ event.boot_id.slice(0,8) }}</time>
          <div class="my-1"><SBadge :tone="statusTone(event.state)">{{ event.state }}</SBadge> <code>{{ event.version }}</code></div>
          <details v-if="event.message"><summary class="cursor-pointer text-gray-500">{{ t('observe.detail') }}</summary><pre class="mt-1 whitespace-pre-wrap break-all">{{ event.message }}</pre></details>
        </li></ol>
      </div>
      <div class="flex items-center gap-3 text-xs"><SButton size="sm" :disabled="eventPage <= 1" @click="eventPage--">{{ t('observe.previous') }}</SButton><span>{{ t('observe.page', { page: eventPage, total: eventTotal }) }}</span><SButton size="sm" :disabled="eventPage * 50 >= eventTotal" @click="eventPage++">{{ t('observe.next') }}</SButton></div>
    </div>
  </SCard>
</template>
