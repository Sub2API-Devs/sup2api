<script setup lang="ts">
// Details of one scheduled task: its registration, run history (with the
// errors of every attempt), duration trend and a manual run.
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SChart, SDateTime, SDescItem, SDescriptions, SDrawer, SEmpty, SHint, SSectionTitle, SSegmented, SSelect, SStatusBadge, STable, type TableColumn } from '@sub2api/ui'
import { STATUSES, describeSchedule, formatDuration, runTone, taskTitle, type RunsPage, type TaskDetail, type TaskRun } from './tasks'

const props = defineProps<{ open: boolean; name: string; nodeID?: string; canRun: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'run', name: string, nodeID: string): void }>()

const { t, locale } = useI18n()
const detail = ref<TaskDetail | null>(null)
const runs = ref<TaskRun[]>([])
const nextBefore = ref<number | null>(null)
const loading = ref(false)
const filter = ref<string | number | boolean>('')
const node = ref<string | number | boolean | null>('')
const submitted = ref(false)
let seq = 0

const isNode = computed(() => detail.value?.scope === 'node')
const nodeOptions = computed(() => (detail.value?.nodes || []).map((n) => ({ value: n.node_id, label: n.node_id })))
const filters = computed(() => [
  { value: '', label: t('tasks.drawer.filterAll') },
  { value: 'failed', label: t('tasks.drawer.filterFailed') },
  { value: 'skipped', label: t('tasks.drawer.filterSkipped') },
  { value: 'continued', label: t('tasks.drawer.filterContinued') },
  ...(isNode.value ? [] : [{ value: 'queued', label: t('tasks.drawer.filterQueued') }])
])
const statusLabels = computed(() => Object.fromEntries(STATUSES.map((s) => [s, t(`tasks.status.${s}`)])))
const statusTones = computed(() => Object.fromEntries(Object.keys(statusLabels.value).map((s) => [s, runTone(s)])))

const columns = computed<TableColumn[]>(() => [
  { key: 'time', label: t('tasks.drawer.time'), nowrap: true },
  { key: 'node', label: t('tasks.drawer.node'), nowrap: true },
  ...(isNode.value ? [] : [{ key: 'attempt', label: t('tasks.drawer.attempt'), align: 'right' as const }]),
  { key: 'duration_ms', label: t('tasks.drawer.duration'), align: 'right', nowrap: true },
  { key: 'status', label: t('tasks.drawer.result') },
  { key: 'count', label: t('tasks.drawer.count'), align: 'right' },
  { key: 'message', label: t('tasks.drawer.message'), ellipsis: '16rem' }
])

async function loadDetail() {
  const my = ++seq
  loading.value = true
  try {
    const d = await api.get<TaskDetail>(`/system/tasks/${encodeURIComponent(props.name)}`)
    if (my !== seq) return
    detail.value = d
    if (d.scope === 'node' && !node.value) node.value = props.nodeID || d.nodes?.[0]?.node_id || ''
    await loadRuns(true)
  } catch {
    if (my === seq) detail.value = null
  } finally {
    if (my === seq) loading.value = false
  }
}

async function loadRuns(reset: boolean) {
  if (!detail.value) return
  const q = new URLSearchParams()
  if (filter.value) q.set('status', String(filter.value))
  if (isNode.value) {
    if (!node.value) { runs.value = []; nextBefore.value = null; return }
    q.set('node_id', String(node.value))
  } else {
    q.set('limit', '50')
    if (!reset && nextBefore.value) q.set('before_id', String(nextBefore.value))
  }
  const page = await api.get<RunsPage>(`/system/tasks/${encodeURIComponent(props.name)}/runs?${q}`)
  runs.value = reset ? page.runs || [] : [...runs.value, ...(page.runs || [])]
  nextBefore.value = page.next_before_id ?? null
}

watch(() => [props.open, props.name] as const, ([open]) => {
  if (!open) return
  detail.value = null
  runs.value = []
  filter.value = ''
  node.value = props.nodeID || ''
  submitted.value = false
  void loadDetail()
}, { immediate: true })
watch([filter, node], () => { if (props.open && detail.value) void loadRuns(true).catch(() => undefined) })

const trend = computed(() => {
  const points = runs.value.filter((r) => r.finished_at && r.status !== 'skipped' && r.status !== 'queued').slice(0, 100).reverse()
  if (!points.length || !detail.value) return null
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'category', data: points.map((r) => new Date(r.finished_at!).toLocaleTimeString()) },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatDuration(v) } },
    series: [{
      type: 'line', name: t('tasks.drawer.duration'), data: points.map((r) => r.duration_ms), showSymbol: false,
      markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: '#ef4444' }, data: [{ yAxis: detail.value.timeout_ms, name: t('tasks.drawer.timeoutLine') }] }
    }]
  }
})

function run() {
  submitted.value = true
  emit('run', props.name, isNode.value ? String(node.value || '') : '')
}
</script>

<template>
  <SDrawer :open="open" :title="detail ? taskTitle(detail, locale) : name" :description="detail ? (detail.description?.[locale] || detail.description?.en) : undefined" width="xl" @update:open="emit('update:open', $event)">
    <div v-if="detail" class="space-y-6" data-testid="task-drawer">
      <SDescriptions :columns="2" dense>
        <SDescItem :label="t('tasks.drawer.name')" :value="detail.name" mono copyable />
        <SDescItem :label="t('tasks.drawer.scope')" :value="isNode ? t('tasks.drawer.scopeNode') : t('tasks.drawer.scopeCluster')" />
        <SDescItem :label="t('tasks.col.schedule')" :value="describeSchedule(detail.schedule, t)" />
        <SDescItem :label="t('tasks.drawer.timeout')" :value="formatDuration(detail.timeout_ms)" />
        <SDescItem v-if="!isNode" :label="t('tasks.drawer.attempts')" :value="detail.max_attempts ?? detail.cluster?.max_attempts" />
        <SDescItem v-if="!isNode" :label="t('tasks.drawer.source')" :value="detail.cluster?.plugin_key ? `${t('tasks.plugin')} ${detail.cluster.plugin_key}` : t('tasks.filter.sourceCore')" />
        <SDescItem v-if="isNode" :label="t('tasks.drawer.requireWork')" :value="detail.require_work ? t('tasks.drawer.yes') : t('tasks.drawer.no')" />
        <SDescItem v-if="!isNode" :label="t('tasks.drawer.lastSuccess')">
          <SDateTime :value="detail.cluster?.last_success_at" mode="relative" />
        </SDescItem>
        <SDescItem v-if="!isNode" :label="t('tasks.drawer.queued')" :value="detail.cluster?.queued ?? 0" />
      </SDescriptions>

      <div class="flex flex-wrap items-center gap-2">
        <SSelect v-if="isNode" v-model="node" :options="nodeOptions" :placeholder="t('tasks.drawer.pickNode')" size="sm" class="w-48" data-testid="task-drawer-node" />
        <SSegmented v-model="filter" :options="filters" size="sm" :aria-label="t('tasks.drawer.history')" />
        <SButton v-if="canRun" class="ms-auto" size="sm" icon="play" :disabled="submitted" data-testid="task-drawer-run" @click="run">
          {{ submitted ? t('tasks.submitted') : t('tasks.runNow') }}
        </SButton>
      </div>

      <div v-if="trend">
        <SSectionTitle :title="t('tasks.drawer.trend')" />
        <SChart :option="trend" height="180px" />
      </div>

      <div>
        <SSectionTitle :title="t('tasks.drawer.history')" />
        <STable :columns="columns" :rows="runs" :loading="loading" row-key="id" expandable dense :empty-text="t('tasks.drawer.noRuns')">
          <template #cell-time="{ row }">
            <SDateTime :value="row.started_at || row.scheduled_at" mode="auto" />
            <SHint v-if="row.manual" inline size="xs" class="ml-1">{{ t('tasks.drawer.manual') }}</SHint>
          </template>
          <template #cell-attempt="{ row }">{{ row.attempt }}/{{ row.max_attempts }}</template>
          <template #cell-duration_ms="{ row }">{{ formatDuration(row.duration_ms) }}</template>
          <template #cell-status="{ row }">
            <SStatusBadge :status="row.status" :labels="statusLabels" :tones="statusTones" dot size="xs" />
          </template>
          <template #expand="{ row }">
            <div class="space-y-2 text-xs">
              <pre v-if="row.error" class="whitespace-pre-wrap break-words font-mono text-danger-600 dark:text-danger-400">{{ row.error }}</pre>
              <p v-if="row.message" class="whitespace-pre-wrap break-words">{{ row.message }}</p>
              <div v-if="row.errors?.length">
                <SHint size="xs">{{ t('tasks.drawer.errors') }}</SHint>
                <ul class="mt-1 space-y-1 font-mono">
                  <li v-for="e in row.errors" :key="e.attempt + e.at">#{{ e.attempt }} · <SDateTime :value="e.at" mode="time" /> · {{ e.error }}</li>
                </ul>
              </div>
              <SHint v-if="!row.error && !row.message && !row.errors?.length" size="xs">{{ t('tasks.empty') }}</SHint>
            </div>
          </template>
        </STable>
        <div v-if="nextBefore && !isNode" class="mt-2 flex justify-center">
          <SButton size="sm" variant="ghost" data-testid="task-drawer-more" @click="loadRuns(false)">{{ t('tasks.drawer.loadMore') }}</SButton>
        </div>
      </div>
    </div>
    <SEmpty v-else-if="!loading" :title="t('tasks.errors.task_not_found')" />
  </SDrawer>
</template>
