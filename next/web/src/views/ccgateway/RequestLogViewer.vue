<script setup lang="ts">
// Request logs of one account (REQUEST-LOG-VIEWER-DESIGN.md §8): the list,
// then one request's overview, events, headers and — at the full level, for
// settings:manage — its content. Opened from the account runtimes and from a
// usage record (requestId: straight to that request).
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SBadge, SButton, SCode, SCopyButton, SDateTime, SDescItem, SDescriptions, SDisclosure, SDrawer, SEmpty, SHint, SInput, SSegmented, SSelect, SSpinner, STable, STabs, type SelectOption, type TabItem, type TableColumn } from '@sub2api/ui'
import { errorMessage } from '@/utils/errors'
import RequestLogContent from './RequestLogContent.vue'
import {
  durationText, listRequestLogs, requestLogDetail, shortId, sizeText,
  type RequestLogActive, type RequestLogDetail, type RequestLogItem, type RequestLogQuery
} from './requestLogViewer'

const props = defineProps<{ open: boolean; accountId: number; accountName?: string; requestId?: string; summary?: string }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()
const { t } = useI18n()

const PAGE = 50
type Range = '24h' | '7d' | 'all'
const range = ref<Range>('24h')
const status = ref<'' | 'ok' | 'error'>('')
const level = ref<'' | 'summary' | 'full'>('')
const model = ref('')
const requestFilter = ref('')

const items = ref<RequestLogItem[]>([])
const active = ref<RequestLogActive[]>([])
const next = ref<string | null>(null)
const loading = ref(false)
const error = ref('')

const current = ref<RequestLogItem | null>(null)
const detail = ref<RequestLogDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref('')
const tab = ref('overview')
const eventFilter = ref('')
const contentNoticeSeen = ref(false)
let listAbort: AbortController | null = null
let detailAbort: AbortController | null = null

const title = computed(() => t('ccgateway.logViewer.title', { account: props.accountName ? `${props.accountName} #${props.accountId}` : `#${props.accountId}` }))

function query(before?: string): RequestLogQuery {
  const since = range.value === 'all' ? undefined : new Date(Date.now() - (range.value === '24h' ? 1 : 7) * 86400000).toISOString().replace(/\.\d{3}Z$/, 'Z')
  return {
    limit: PAGE, before, since,
    status: status.value || undefined, level: level.value || undefined,
    model: model.value.trim() || undefined, request_id: requestFilter.value.trim() || undefined
  }
}

async function load(more = false) {
  listAbort?.abort()
  const controller = (listAbort = new AbortController())
  loading.value = true
  error.value = ''
  try {
    const page = await listRequestLogs(props.accountId, query(more ? next.value ?? undefined : undefined), controller.signal)
    if (controller !== listAbort) return
    items.value = more ? [...items.value, ...page.items] : page.items
    if (!more) active.value = page.active
    next.value = page.next
  } catch (e) {
    if (controller === listAbort && !controller.signal.aborted) error.value = errorMessage(e)
  } finally {
    if (controller === listAbort) loading.value = false
  }
}

async function openDetail(item: RequestLogItem) {
  current.value = item
  detail.value = null
  tab.value = 'overview'
  eventFilter.value = ''
  detailAbort?.abort()
  const controller = (detailAbort = new AbortController())
  detailLoading.value = true
  detailError.value = ''
  try {
    const d = await requestLogDetail(props.accountId, item.id, controller.signal)
    if (controller === detailAbort) detail.value = d
  } catch (e) {
    if (controller === detailAbort && !controller.signal.aborted) detailError.value = errorMessage(e)
  } finally {
    if (controller === detailAbort) detailLoading.value = false
  }
}

function back() {
  detailAbort?.abort()
  current.value = null
  detail.value = null
}

// Opening: from a usage record, the request itself when it has one log.
watch(() => [props.open, props.accountId, props.requestId] as const, async ([open]) => {
  if (!open) {
    listAbort?.abort()
    back()
    items.value = []
    return
  }
  requestFilter.value = props.requestId || ''
  if (props.requestId) range.value = 'all'
  current.value = null
  await load()
  if (props.requestId && items.value.length === 1) await openDetail(items.value[0])
}, { immediate: true })

let filterTimer: ReturnType<typeof setTimeout> | undefined
watch([range, status, level], () => { if (props.open) void load() })
watch([model, requestFilter], () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => { if (props.open) void load() }, 400)
})

const rangeOptions = computed<SelectOption[]>(() => (['24h', '7d', 'all'] as const).map(v => ({ value: v, label: t(`ccgateway.logViewer.range.${v}`) })))
const statusOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('ccgateway.logViewer.all') }, { value: 'ok', label: t('ccgateway.logViewer.status.ok') }, { value: 'error', label: t('ccgateway.logViewer.status.error') }
])
const levelOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('ccgateway.logViewer.allLevels') }, { value: 'summary', label: t('ccgateway.requestLogs.level.summary') }, { value: 'full', label: t('ccgateway.requestLogs.level.full') }
])

const columns = computed<TableColumn[]>(() => [
  { key: 'time', label: t('ccgateway.logViewer.cols.time') },
  { key: 'request_id', label: t('ccgateway.logViewer.cols.requestId') },
  { key: 'model', label: t('ccgateway.logViewer.cols.model') },
  { key: 'status', label: t('ccgateway.logViewer.cols.status') },
  { key: 'stage', label: t('ccgateway.logViewer.cols.stage') },
  { key: 'duration', label: t('ccgateway.logViewer.cols.duration'), align: 'right' },
  { key: 'level', label: t('ccgateway.logViewer.cols.level') },
  { key: 'bytes', label: t('ccgateway.logViewer.cols.size'), align: 'right' }
])

const statusTone = (s: number) => (s >= 500 ? 'danger' : s >= 400 ? 'warning' : 'success')

// ---- detail
const tabs = computed<TabItem[]>(() => {
  const d = detail.value
  const list: TabItem[] = [
    { key: 'overview', label: t('ccgateway.logViewer.tabs.overview') },
    { key: 'events', label: t('ccgateway.logViewer.tabs.events'), badge: d?.events.length },
    { key: 'request_headers', label: t('ccgateway.logViewer.tabs.requestHeaders') },
    { key: 'response_headers', label: t('ccgateway.logViewer.tabs.responseHeaders') }
  ]
  if (d?.content && d.files.length) list.push({ key: 'content', label: t('ccgateway.logViewer.tabs.content'), badge: d.files.length })
  return list
})

const meta = computed(() => detail.value?.metadata ?? {})
const metaText = (k: string) => {
  const v = meta.value[k]
  return v === undefined || v === null || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)
}
const metaJSON = computed(() => JSON.stringify(meta.value, null, 2))

const started = computed(() => (current.value ? Date.parse(current.value.time) : NaN))
const events = computed(() => {
  const filter = eventFilter.value.trim().toLowerCase()
  return (detail.value?.events ?? []).map((e, i) => {
    const at = typeof e.time === 'string' ? Date.parse(e.time) : NaN
    const offset = Number.isFinite(at) && Number.isFinite(started.value) ? Math.max(0, at - started.value) : null
    const name = typeof e.event === 'string' ? e.event : '?'
    const body = JSON.stringify(e.detail ?? null, null, 2)
    const preview = JSON.stringify(e.detail ?? null)
    return { i, name, offset, body, preview: preview.length > 160 ? preview.slice(0, 160) + '…' : preview }
  }).filter(e => !filter || e.name.toLowerCase().includes(filter))
})
const isErrorEvent = (name: string) => /error|fail|refus|cancel/.test(name)

const headerRows = (h: Record<string, string[]> | null | undefined) =>
  Object.entries(h ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ k, v: v.join(', '), redacted: v.every(x => x === '[REDACTED]') }))

const hasFullContent = computed(() => !!current.value?.has_content && current.value.log_level === 'full')
</script>

<template>
  <SDrawer :open="open" width="60rem" :title="title" :description="summary" @update:open="emit('update:open', $event)">
    <div v-if="!current" class="space-y-3" data-testid="request-log-list">
      <div class="flex flex-wrap items-center gap-2">
        <SSelect v-model="range" :options="rangeOptions" size="sm" class="w-32" :aria-label="t('ccgateway.logViewer.rangeLabel')" />
        <SSegmented v-model="status" :options="statusOptions" size="sm" :aria-label="t('ccgateway.logViewer.cols.status')" />
        <SSegmented v-model="level" :options="levelOptions" size="sm" :aria-label="t('ccgateway.logViewer.cols.level')" />
        <SInput v-model="model" size="sm" class="w-36" :placeholder="t('ccgateway.logViewer.cols.model')" :aria-label="t('ccgateway.logViewer.cols.model')" clearable />
        <SInput v-model="requestFilter" size="sm" mono class="w-52" :placeholder="t('ccgateway.logViewer.cols.requestId')" :aria-label="t('ccgateway.logViewer.cols.requestId')" clearable data-testid="request-log-filter-id" />
        <SButton size="sm" icon="refresh" icon-only :loading="loading" :title="t('common.refresh')" :aria-label="t('common.refresh')" @click="load()" />
      </div>
      <SHint v-if="active.length" tone="warning" size="xs" data-testid="request-log-active">
        {{ t('ccgateway.logViewer.active', { count: active.length }) }}
        <span v-for="a in active.slice(0, 5)" :key="a.request_id + a.started" class="ml-2 font-mono">{{ shortId(a.request_id) }} · {{ a.stage }} · <SDateTime :value="a.started" mode="relative" /></span>
      </SHint>
      <SAlert v-if="error" tone="danger">{{ error }}</SAlert>
      <STable :columns="columns" :rows="items" :loading="loading && !items.length" dense clickable :empty-text="requestFilter ? t('ccgateway.logViewer.notFound') : t('ccgateway.logViewer.empty')" data-testid="request-log-table" @row-click="openDetail">
        <template #cell-time="{ row }"><span class="whitespace-nowrap text-xs"><SDateTime :value="row.time" mode="absolute" /></span></template>
        <template #cell-request_id="{ row }">
          <span class="whitespace-nowrap font-mono text-xs" :title="row.request_id">{{ shortId(row.request_id) }}</span>
          <SBadge v-if="row.attempt" size="sm" class="ml-1">{{ t('ccgateway.logViewer.attempt', { n: row.attempt }) }}</SBadge>
          <SBadge v-if="row.test" size="sm" class="ml-1">{{ t('ccgateway.logViewer.test') }}</SBadge>
        </template>
        <template #cell-model="{ row }"><span class="whitespace-nowrap text-xs">{{ row.model || '—' }}</span></template>
        <template #cell-status="{ row }">
          <SBadge :tone="statusTone(row.status)" :title="row.error || undefined">{{ row.error_type ? `${row.status} ${row.error_type}` : row.status }}</SBadge>
        </template>
        <template #cell-stage="{ row }"><span class="font-mono text-xs">{{ row.stage }}</span></template>
        <template #cell-duration="{ row }"><span class="whitespace-nowrap text-xs">{{ durationText(row.duration_ms) }}</span></template>
        <template #cell-level="{ row }"><SBadge :tone="row.log_level === 'full' ? 'warning' : 'gray'">{{ t(`ccgateway.requestLogs.level.${row.log_level}`) }}</SBadge></template>
        <template #cell-bytes="{ row }">
          <span class="whitespace-nowrap text-xs">{{ sizeText(row.bytes) }}</span>
          <SBadge v-if="row.log_status === 'truncated'" tone="warning" size="sm" class="ml-1">{{ t('ccgateway.logViewer.truncated') }}</SBadge>
        </template>
      </STable>
      <div v-if="next" class="flex justify-center">
        <SButton size="sm" :loading="loading" data-testid="request-log-more-items" @click="load(true)">{{ t('ccgateway.logViewer.more') }}</SButton>
      </div>
    </div>

    <div v-else class="space-y-3" data-testid="request-log-detail">
      <div class="flex flex-wrap items-center gap-2">
        <SButton size="sm" icon="arrow-left" data-testid="request-log-back" @click="back">{{ t('ccgateway.logViewer.back') }}</SButton>
        <SCode inline :text="current.request_id" />
        <SCopyButton :text="current.request_id" icon-only />
        <SBadge :tone="statusTone(current.status)">{{ current.status }}</SBadge>
        <SHint inline size="xs">
          {{ durationText(current.duration_ms) }}<template v-if="current.model"> · {{ current.model }}</template>
          <template v-if="current.stream !== undefined"> · {{ current.stream ? t('ccgateway.logViewer.stream') : t('ccgateway.logViewer.nonStream') }}</template>
          · {{ t(`ccgateway.requestLogs.level.${current.log_level}`) }}
        </SHint>
      </div>
      <SAlert v-if="detailError" tone="danger">{{ detailError }}</SAlert>
      <div v-else-if="detailLoading || !detail" class="flex justify-center py-10"><SSpinner /></div>
      <STabs v-else v-model="tab" :tabs="tabs" size="sm" :aria-label="t('ccgateway.logViewer.tabsLabel')">
        <template v-if="tab === 'overview'">
          <SDescriptions dense :columns="2" label-width="7rem">
            <SDescItem :label="t('ccgateway.logViewer.cols.time')"><SDateTime :value="current.time" mode="absolute" /></SDescItem>
            <SDescItem :label="t('ccgateway.logViewer.cols.stage')" mono :value="metaText('stage')" />
            <SDescItem :label="t('ccgateway.logViewer.cols.status')" :value="metaText('status')" />
            <SDescItem :label="t('ccgateway.logViewer.fields.error')" :value="current.error_type ? `${current.error_type}: ${current.error || ''}` : '—'" />
            <SDescItem :label="t('ccgateway.logViewer.cols.model')" :value="metaText('model')" />
            <SDescItem :label="t('ccgateway.logViewer.fields.messages')" :value="metaText('message_count')" />
            <SDescItem :label="t('ccgateway.logViewer.fields.execution')" mono :value="metaText('execution_mode')" />
            <SDescItem :label="t('ccgateway.logViewer.fields.history')" mono :value="metaText('history_mode')" />
            <SDescItem :label="t('ccgateway.logViewer.fields.beta')" mono full :value="metaText('anthropic_beta')" />
            <SDescItem :label="t('ccgateway.logViewer.fields.log')" full>
              {{ t(`ccgateway.requestLogs.level.${current.log_level}`) }} · {{ sizeText(current.bytes) }}
              <SBadge v-if="current.log_status === 'truncated'" tone="warning" size="sm" class="ml-1">{{ t('ccgateway.logViewer.truncated') }}</SBadge>
            </SDescItem>
          </SDescriptions>
          <SDisclosure :label="t('ccgateway.logViewer.allFields')">
            <SCode class="max-h-96 overflow-auto text-xs" :text="metaJSON" />
          </SDisclosure>
          <SHint v-if="current.log_level === 'summary'" size="xs">{{ t('ccgateway.logViewer.summaryOnly') }}</SHint>
          <SHint v-else-if="hasFullContent && !detail.content" size="xs">{{ t('ccgateway.logViewer.contentNeedsManage') }}</SHint>
          <SHint v-else-if="current.log_level === 'full' && !detail.files.length" size="xs">{{ t('ccgateway.logViewer.contentGone') }}</SHint>
        </template>
        <template v-else-if="tab === 'events'">
          <SInput v-model="eventFilter" size="sm" class="w-56" :placeholder="t('ccgateway.logViewer.eventFilter')" :aria-label="t('ccgateway.logViewer.eventFilter')" clearable />
          <SHint v-if="detail.events_truncated" tone="warning" size="xs">{{ t('ccgateway.logViewer.eventsTruncated') }}</SHint>
          <SHint v-if="!detail.content" size="xs">{{ t('ccgateway.logViewer.eventsBounded') }}</SHint>
          <SEmpty v-if="!events.length" size="sm" />
          <ol v-else class="space-y-1 border-l-2 border-line pl-3" data-testid="request-log-events">
            <li v-for="e in events" :key="e.i">
              <details class="group">
                <summary class="flex cursor-pointer select-none items-baseline gap-2 text-xs">
                  <span class="w-16 shrink-0 text-right font-mono text-fg-subtle">{{ e.offset === null ? '' : `+${e.offset} ms` }}</span>
                  <span class="font-mono font-medium" :class="isErrorEvent(e.name) ? 'text-danger-600 dark:text-danger-400' : ''">{{ e.name }}</span>
                  <span class="min-w-0 truncate font-mono text-fg-subtle">{{ e.preview }}</span>
                </summary>
                <SCode class="ml-[4.5rem] mt-1 max-h-80 overflow-auto text-xs" :text="e.body" />
              </details>
            </li>
          </ol>
        </template>
        <template v-else-if="tab === 'request_headers' || tab === 'response_headers'">
          <SEmpty v-if="!headerRows(tab === 'request_headers' ? detail.request_headers : detail.response_headers).length" size="sm" />
          <dl v-else class="grid grid-cols-[minmax(10rem,16rem)_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs" :data-testid="`request-log-${tab}`">
            <template v-for="h in headerRows(tab === 'request_headers' ? detail.request_headers : detail.response_headers)" :key="h.k">
              <dt class="break-all font-mono text-fg-muted">{{ h.k }}</dt>
              <dd class="break-all font-mono" :class="h.redacted ? 'italic text-fg-subtle' : ''">{{ h.v }}</dd>
            </template>
          </dl>
        </template>
        <template v-else-if="tab === 'content'">
          <SAlert v-if="!contentNoticeSeen" tone="warning" dense dismissible data-testid="request-log-content-notice" @dismiss="contentNoticeSeen = true">{{ t('ccgateway.logViewer.contentNotice') }}</SAlert>
          <RequestLogContent :key="current.id" :account-id="accountId" :log="current.id" :request-id="current.request_id" :files="detail.files" />
        </template>
      </STabs>
    </div>
  </SDrawer>
</template>
