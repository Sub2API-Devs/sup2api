<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, SIcon, SStatCard, STable, type TableColumn } from '@sub2api/ui'
import { formatDateTime, formatNumber } from '@/utils/format'
import { notifyError } from '@/utils/errors'
import { display, pick, type PluginDetail, type PluginEvents } from '../pluginUtil'

const props = defineProps<{ detail: PluginDetail }>()
const { t } = useI18n()

const data = ref<PluginEvents>(props.detail.events || {})
const loading = ref(false)

const deadList = computed<Array<Record<string, any>>>(() => (Array.isArray(data.value.deadletters) ? data.value.deadletters : []))
const deadCount = computed(() => {
  const d = data.value.deadletters
  if (Array.isArray(d)) return d.length
  return Number(d ?? pick(data.value, 'deadletter_count') ?? 0)
})

const columns = computed<TableColumn[]>(() => [
  { key: 'event', label: t('plugins.events.event') },
  { key: 'attempts', label: t('plugins.events.attempts'), align: 'right' },
  { key: 'error', label: t('plugins.events.error') },
  { key: 'at', label: t('common.time') }
])

async function load() {
  loading.value = true
  try {
    data.value = (await api.get<PluginEvents>(`/plugins/${encodeURIComponent(props.detail.key)}/events`)) || {}
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-4 sm:grid-cols-3">
      <SStatCard :label="t('plugins.events.cursor')" :value="data.cursor != null ? '#' + formatNumber(data.cursor) : '—'" icon="bolt" :loading="loading" />
      <SStatCard
        :label="t('plugins.events.backlog')"
        :value="formatNumber(data.backlog ?? 0)"
        icon="clock"
        :tone="(data.backlog ?? 0) > 1000 ? 'warning' : 'primary'"
        :loading="loading"
      />
      <SStatCard :label="t('plugins.events.deadletters')" :value="formatNumber(deadCount)" icon="warning" :tone="deadCount > 0 ? 'danger' : 'success'" :loading="loading" />
    </div>

    <SCard :title="t('plugins.events.subscribed')">
      <template #actions>
        <SButton size="sm" variant="ghost" :loading="loading" @click="load"><SIcon name="refresh" class="h-4 w-4" /></SButton>
      </template>
      <div v-if="data.subscribe?.length" class="flex flex-wrap gap-2">
        <code v-for="s in data.subscribe" :key="s" class="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-dark-700">{{ s }}</code>
      </div>
      <p v-else class="text-sm muted">{{ t('plugins.events.noSubscriptions') }}</p>
    </SCard>

    <SCard v-if="deadList.length" :title="t('plugins.events.deadletters')" :padded="false">
      <STable :columns="columns" :rows="deadList" expandable>
        <template #cell-event="{ row }">
          <span class="font-mono text-xs">{{ display(pick(row, 'event_type', 'type', 'event')) }}</span>
          <span v-if="pick(row, 'event_id', 'id')" class="ml-1 text-xs muted">#{{ pick(row, 'event_id', 'id') }}</span>
        </template>
        <template #cell-attempts="{ row }">{{ display(pick(row, 'attempts', 'retries')) }}</template>
        <template #cell-error="{ row }">
          <span class="line-clamp-2 max-w-lg text-xs text-red-600 dark:text-red-400">{{ display(pick(row, 'error', 'last_error', 'message')) }}</span>
        </template>
        <template #cell-at="{ row }">
          <span class="whitespace-nowrap text-xs">{{ formatDateTime(pick(row, 'failed_at', 'created_at', 'at')) }}</span>
        </template>
        <template #expand="{ row }">
          <pre class="code-block">{{ JSON.stringify(row, null, 2) }}</pre>
        </template>
      </STable>
    </SCard>
  </div>
</template>
