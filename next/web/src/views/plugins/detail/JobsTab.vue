<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCard, SCode, SHint, STable, toast, type TableColumn } from '@sub2api/ui'
import PluginStatusBadge from '../parts/PluginStatusBadge.vue'
import { formatDateTime } from '@/utils/format'
import { notifyError } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import { durationMs, formatDuration, type PluginDetail, type PluginJob } from '../pluginUtil'

const props = defineProps<{ detail: PluginDetail }>()
const { t, locale } = useI18n()
const auth = useAuthStore()

const jobs = ref<PluginJob[]>(props.detail.jobs || [])
const loading = ref(false)
const running = ref('')

const columns = computed<TableColumn[]>(() => [
  { key: 'id', label: t('plugins.jobs.job') },
  { key: 'schedule', label: t('plugins.jobs.schedule') },
  { key: 'timeout', label: t('plugins.jobs.timeout'), align: 'right' },
  { key: 'last', label: t('plugins.jobs.lastRun') },
  { key: 'duration', label: t('plugins.jobs.duration'), align: 'right' },
  { key: 'message', label: t('plugins.jobs.message') },
  { key: 'actions', label: '', align: 'right' }
])

async function load() {
  loading.value = true
  try {
    // GET /plugins/:key/jobs answers {jobs, recent_runs}.
    const r = await api.get<{ jobs?: PluginJob[] }>(`/plugins/${encodeURIComponent(props.detail.key)}/jobs`)
    jobs.value = r?.jobs || []
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}

function jobTitle(j: PluginJob): string {
  const title = j.title
  return title?.[locale.value] || title?.en || ''
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
      <SButton size="sm" variant="ghost" :loading="loading" icon="refresh" @click="load">{{ t('common.refresh') }}</SButton>
    </template>
    <STable :columns="columns" :rows="jobs" :loading="loading">
      <template #cell-id="{ row }">
        <div v-if="jobTitle(row)" class="font-medium text-fg">{{ jobTitle(row) }}</div>
        <div class="flex items-center gap-1.5">
          <span class="font-mono" :class="jobTitle(row) ? 'text-xs text-fg-muted' : 'font-medium'">{{ row.id }}</span>
          <SBadge v-if="row.scope" :tone="row.scope === 'node' ? 'info' : 'gray'">{{
            t(row.scope === 'node' ? 'plugins.jobs.scopeNode' : 'plugins.jobs.scopeCluster')
          }}</SBadge>
        </div>
        <router-link
          v-if="row.task && auth.has('task:read')"
          :to="{ path: '/system/tasks', query: row.scope === 'node' ? { tab: 'nodes' } : {} }"
          class="text-xs text-primary-600 hover:underline dark:text-primary-400"
        >
          {{ t('plugins.jobs.viewInTasks') }}
        </router-link>
      </template>
      <template #cell-schedule="{ row }">
        <SCode inline :text="row.adjusted?.length && row.effective_schedule ? row.effective_schedule : row.schedule" />
        <SHint v-if="row.next_run_at" size="xs">{{ t('plugins.jobs.next') }} {{ formatDateTime(row.next_run_at) }}</SHint>
      </template>
      <template #cell-timeout="{ row }">
        <span class="whitespace-nowrap">{{ row.effective_timeout_sec ? formatDuration(row.effective_timeout_sec * 1000) : '—' }}</span>
        <SBadge v-if="row.adjusted?.length" tone="warning" class="ml-1" :title="row.adjusted.join('; ')" data-testid="job-adjusted">
          {{ t('plugins.jobs.adjusted') }}
        </SBadge>
      </template>
      <template #cell-last="{ row }">
        <template v-if="row.last_run">
          <div class="flex items-center gap-2">
            <PluginStatusBadge :status="row.last_run.status" />
            <SHint inline size="xs">{{ row.last_run.node_id }}</SHint>
          </div>
          <SHint size="xs" class="whitespace-nowrap">{{ formatDateTime(row.last_run.started_at) }}</SHint>
        </template>
        <SHint v-else inline size="xs">{{ t('plugins.jobs.never') }}</SHint>
      </template>
      <template #cell-duration="{ row }">
        {{ row.last_run ? formatDuration(durationMs(row.last_run.started_at, row.last_run.finished_at)) : '—' }}
      </template>
      <template #cell-message="{ row }">
        <span class="line-clamp-2 max-w-md text-xs" :title="row.last_run?.message">{{ row.last_run?.message || '—' }}</span>
      </template>
      <template #cell-actions="{ row }">
        <SButton v-if="auth.has('plugin:manage')" size="sm" :loading="running === row.id" icon="play" @click="runNow(row)">
          {{ t('plugins.jobs.runNow') }}
        </SButton>
      </template>
    </STable>
  </SCard>
</template>
