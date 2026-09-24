<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, SIcon, STable, toast, type TableColumn } from '@sub2api/ui'
import { formatDateTime } from '@/utils/format'
import { notifyError } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import { durationMs, formatDuration, type PluginDetail, type PluginJob } from '../pluginUtil'
import StatusBadge from '../parts/StatusBadge.vue'

const props = defineProps<{ detail: PluginDetail }>()
const { t } = useI18n()
const auth = useAuthStore()

const jobs = ref<PluginJob[]>(props.detail.jobs || [])
const loading = ref(false)
const running = ref('')

const columns = computed<TableColumn[]>(() => [
  { key: 'id', label: t('plugins.jobs.job') },
  { key: 'schedule', label: t('plugins.jobs.schedule') },
  { key: 'last', label: t('plugins.jobs.lastRun') },
  { key: 'duration', label: t('plugins.jobs.duration'), align: 'right' },
  { key: 'message', label: t('plugins.jobs.message') },
  { key: 'actions', label: '', align: 'right' }
])

async function load() {
  loading.value = true
  try {
    const r = await api.get<PluginJob[] | { items: PluginJob[] }>(`/plugins/${encodeURIComponent(props.detail.key)}/jobs`)
    jobs.value = Array.isArray(r) ? r : r?.items || []
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}

async function runNow(j: PluginJob) {
  running.value = j.id
  try {
    await api.post(`/plugins/${encodeURIComponent(props.detail.key)}/jobs/${encodeURIComponent(j.id)}/run`)
    toast(t('plugins.jobs.triggered', { id: j.id }), 'success')
    setTimeout(load, 1500)
  } catch (e) {
    notifyError(e)
  } finally {
    running.value = ''
  }
}

onMounted(load)
</script>

<template>
  <SCard :padded="false">
    <template #title>
      <span class="text-sm font-semibold">{{ t('plugins.detail.tabs.jobs') }}</span>
    </template>
    <template #actions>
      <SButton size="sm" variant="ghost" :loading="loading" @click="load"><SIcon name="refresh" class="h-4 w-4" /></SButton>
    </template>
    <STable :columns="columns" :rows="jobs" :loading="loading">
      <template #cell-id="{ row }">
        <span class="font-mono font-medium">{{ row.id }}</span>
      </template>
      <template #cell-schedule="{ row }">
        <code class="font-mono text-xs">{{ row.schedule }}</code>
        <div v-if="row.next_run_at" class="text-xs muted">{{ t('plugins.jobs.next') }} {{ formatDateTime(row.next_run_at) }}</div>
      </template>
      <template #cell-last="{ row }">
        <template v-if="row.last_run">
          <div class="flex items-center gap-2">
            <StatusBadge :status="row.last_run.status" />
            <span class="text-xs muted">{{ row.last_run.node_id }}</span>
          </div>
          <div class="whitespace-nowrap text-xs muted">{{ formatDateTime(row.last_run.started_at) }}</div>
        </template>
        <span v-else class="text-xs muted">{{ t('plugins.jobs.never') }}</span>
      </template>
      <template #cell-duration="{ row }">
        {{ row.last_run ? formatDuration(durationMs(row.last_run.started_at, row.last_run.finished_at)) : '—' }}
      </template>
      <template #cell-message="{ row }">
        <span class="line-clamp-2 max-w-md text-xs" :title="row.last_run?.message">{{ row.last_run?.message || '—' }}</span>
      </template>
      <template #cell-actions="{ row }">
        <SButton v-if="auth.has('plugin:manage')" size="sm" :loading="running === row.id" @click="runNow(row)">
          <SIcon name="play" class="h-4 w-4" />{{ t('plugins.jobs.runNow') }}
        </SButton>
      </template>
    </STable>
  </SCard>
</template>
