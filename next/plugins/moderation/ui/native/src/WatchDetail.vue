<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SBulkBar, SButton, SDrawer, SEmpty, SHint, SSpinner, STable, STabs, type TableColumn } from '@sub2api/ui'
import AnalysisCard from './AnalysisCard.vue'
import CategoryChips from './CategoryChips.vue'
import EventDetail from './EventDetail.vue'
import ResultBadge from './ResultBadge.vue'
import FlowLabel from './pages/FlowLabel.vue'
import StagePath from './pages/StagePath.vue'
import UserCell from './pages/UserCell.vue'
import WatchUserCard from './pages/WatchUserCard.vue'
import { loadStatus, status } from './pages/catalog'
import {
  aiVerdictTone,
  analysisState,
  analyzeWatch,
  canManage,
  enumLabel,
  errorMessage,
  fetchUserEvents,
  fetchWatch,
  fetchWatchAnalyses,
  fetchWatchEvents,
  reviewEvents,
  reviewTone,
  severityTone,
  suggestionTone,
  trendTone,
  useModHost,
  watchReason,
  type Analysis,
  type ModEvent,
  type ReviewStatus,
  type Watch,
  type WatchEvent
} from './host'
import { userName } from './directory'
import { fetchWatchList, type WatchItem } from './stats'

// Watch list detail (§72.13.6, §72.14.3): the user card (figures, next
// analysis, watch list actions) and "重新分析", the analysis queue state and
// latest conclusion, the analyses, the suspicious records (bulk review) and
// the watch history with the operators' names.
const props = defineProps<{ open: boolean; userId: number | null }>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'changed', w: Watch | null): void
  (e: 'show-user', userId: number): void
}>()
const host = useModHost()
const t = host.t
const n = (v: number | undefined | null) => host.i18n.formatNumber(v ?? 0)
const dt = (v: string | null | undefined) => (v ? host.i18n.formatDateTime(v) : '—')
const manage = computed(() => canManage())

const entry = ref<Watch | null>(null)
const item = ref<WatchItem | null>(null)
const loading = ref(false)
const error = ref('')
const analyses = ref<Analysis[]>([])
const analysesTotal = ref(0)
const analysesPage = ref(1)
const analysesLoading = ref(false)
const records = ref<ModEvent[]>([])
const recordsTotal = ref(0)
const history = ref<WatchEvent[]>([])
const section = ref('analyses')

const state = computed(() => analysisState(entry.value))
const every = computed(() => status.value?.watch.analysis_every_violations ?? 0)

let timer: ReturnType<typeof setInterval> | null = null
function stopPoll() {
  if (timer) clearInterval(timer)
  timer = null
}

async function loadEntry(id: number) {
  try {
    const w = await fetchWatch(id)
    if (props.userId !== id) return
    const was = state.value
    entry.value = w
    emit('changed', w)
    // An analysis just finished: its card, the AI verdicts and the history changed.
    if (was !== 'idle' && analysisState(w) === 'idle') loadLists(id)
  } catch (e) {
    if (isApiError(e) && e.status === 404) {
      entry.value = null
      emit('changed', null)
      error.value = t('watch.notWatched')
    } else throw e
  }
}

/** 30-day figures of the list row (suspicious total, severities, categories, groups). */
async function loadItem(id: number) {
  const r = await fetchWatchList({ q: String(id), page_size: 1 }).catch(() => null)
  if (props.userId === id) item.value = r?.items.find((x) => x.user_id === id) || null
}

async function loadAnalyses(id: number, page = 1) {
  analysesLoading.value = true
  try {
    const r = await fetchWatchAnalyses(id, page)
    if (props.userId !== id) return
    analyses.value = page === 1 ? r.items : [...analyses.value, ...r.items]
    analysesTotal.value = r.page.total
    analysesPage.value = page
  } finally {
    analysesLoading.value = false
  }
}

async function loadLists(id: number) {
  const [, ev, hist] = await Promise.all([loadAnalyses(id), fetchUserEvents(id), fetchWatchEvents(id), loadItem(id)])
  if (props.userId !== id) return
  records.value = ev.items
  recordsTotal.value = ev.page.total
  history.value = Array.isArray(hist) ? hist : []
  checked.value = []
}

async function load() {
  const id = props.userId
  if (!id) return
  loading.value = true
  error.value = ''
  loadStatus()
  try {
    await Promise.all([loadEntry(id), loadLists(id)])
  } catch (e) {
    error.value = errorMessage(e, t('watch.loadFailed'))
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.userId] as const,
  ([open, id]) => {
    stopPoll()
    if (!open || !id) return
    if (entry.value?.user_id !== id) {
      entry.value = null
      item.value = null
      analyses.value = []
      records.value = []
      history.value = []
      section.value = 'analyses'
    }
    load()
  },
  { immediate: true }
)

// While queued or running, refresh the entry every 5 s.
watch(state, (s) => {
  stopPoll()
  if (s !== 'idle' && props.open && props.userId) {
    const id = props.userId
    timer = setInterval(() => loadEntry(id).catch(() => undefined), 5000)
  }
})
onBeforeUnmount(stopPoll)

const analyzing = ref(false)
async function analyze() {
  const id = props.userId
  if (!id) return
  analyzing.value = true
  try {
    await analyzeWatch(id)
    host.toast(t('watch.analyzeQueued'), 'success')
    await loadEntry(id)
  } catch (e) {
    if (isApiError(e) && e.code === 'no_analysis_channel') host.toast(t('watch.noAnalysisChannel'), 'warning')
    else if (isApiError(e) && e.code === 'analysis_pending') {
      host.toast(t('watch.analysisPending'), 'info')
      loadEntry(id).catch(() => undefined)
    } else if (isApiError(e) && e.status === 404) {
      host.toast(t('watch.notWatched'), 'warning')
      entry.value = null
      emit('changed', null)
    } else host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    analyzing.value = false
  }
}

/** A change from the user card: level → reload the figures and the history; removal → not watched. */
function onWatchChanged(w: Watch | null) {
  const id = props.userId
  if (!id) return
  if (!w) {
    entry.value = null
    error.value = t('watch.notWatched')
    emit('changed', null)
    return
  }
  entry.value = w
  emit('changed', w)
  fetchWatchEvents(id)
    .then((h) => props.userId === id && (history.value = Array.isArray(h) ? h : []))
    .catch(() => undefined)
  loadItem(id)
}

const tabs = computed(() => [
  { key: 'analyses', label: `${t('watch.analyses')} (${n(analysesTotal.value)})` },
  { key: 'records', label: `${t('watch.suspicious')} (${n(recordsTotal.value)})` },
  { key: 'history', label: `${t('watch.history')} (${n(history.value.length)})` }
])

// Suspicious records: one row each, bulk review of the selected ones.
const recordColumns = computed<TableColumn[]>(() => [
  { key: 'record', label: t('pagesP3.timeline.record') },
  { key: 'ai', label: t('pagesP3.timeline.ai'), nowrap: true },
  { key: 'review', label: t('pagesP3.timeline.review'), nowrap: true }
])
const checked = ref<number[]>([])
const reviewing = ref(false)
async function bulkReview(status: ReviewStatus) {
  const ids = records.value.filter((r) => checked.value.includes(r.id)).map((r) => r.id)
  if (!ids.length) return
  reviewing.value = true
  try {
    await reviewEvents(ids, status)
    onReviewed(ids, status)
    checked.value = []
    host.toast(t('review.done', { n: ids.length }), 'success')
    if (props.userId) loadEntry(props.userId).catch(() => undefined)
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    reviewing.value = false
  }
}

// Record detail on top of the drawer.
const recordId = ref<number | null>(null)
const recordOpen = ref(false)
function openRecord(id: number) {
  recordId.value = id
  recordOpen.value = true
}
function onReviewed(ids: number[], status: ModEvent['review_status']) {
  for (const r of records.value) if (ids.includes(r.id)) r.review_status = status
}
function onDeleted(id: number) {
  records.value = records.value.filter((r) => r.id !== id)
  recordsTotal.value = Math.max(0, recordsTotal.value - 1)
}
function onRecordWatchChanged(uid: number, w: Watch | null) {
  if (uid === props.userId) onWatchChanged(w)
}
</script>

<template>
  <SDrawer :open="open" :title="t('pagesP3.wdetail.title', { name: userId ? userName(userId) : '' })" width="xl" @update:open="emit('update:open', $event)">
    <SSpinner v-if="loading && !entry" block />
    <SAlert v-else-if="error" tone="warning">{{ error }}</SAlert>
    <div v-else-if="entry" class="mod-detail">
      <WatchUserCard :watch="entry" :item="item" :records="records" :records-total="recordsTotal" :every="every" @changed="onWatchChanged">
        <SButton size="sm" variant="ghost" @click="emit('show-user', entry.user_id)">{{ t('watch.allRecords') }}</SButton>
        <SButton v-if="manage" size="sm" variant="primary" icon="refresh" :loading="analyzing" :disabled="state !== 'idle'" @click="analyze">{{ t('watch.analyze') }}</SButton>
      </WatchUserCard>

      <div class="mod-analysis-state">
        <span class="mod-cost-label">{{ t('watch.analysisState') }}</span>
        <SBadge v-if="state !== 'idle'" :tone="state === 'running' ? 'info' : 'warning'" dot>{{ enumLabel('analysisState', state) }}</SBadge>
        <SHint v-if="state !== 'idle' && entry.analysis_requested_at" inline size="xs">
          {{ t('watch.queuedAt', { time: dt(entry.analysis_requested_at) }) }}<template v-if="entry.analysis_source"> · {{ enumLabel('source', entry.analysis_source) }}</template>
        </SHint>
        <template v-if="entry.latest_analysis_id">
          <span class="mod-sub">{{ t('watch.latest') }}</span>
          <SBadge v-if="entry.latest_analysis_status && entry.latest_analysis_status !== 'ok'" :tone="entry.latest_analysis_status === 'failed' ? 'danger' : 'warning'">
            {{ enumLabel('analysisStatus', entry.latest_analysis_status) }}
          </SBadge>
          <SBadge v-if="entry.latest_trend" :tone="trendTone(entry.latest_trend)">{{ enumLabel('trend', entry.latest_trend) }}</SBadge>
          <SBadge v-if="entry.latest_suggestion" :tone="suggestionTone(entry.latest_suggestion)">{{ t('analysis.suggestion') }}: {{ enumLabel('suggestion', entry.latest_suggestion) }}</SBadge>
          <SHint inline size="xs">{{ dt(entry.analyzed_at) }}</SHint>
        </template>
        <SHint v-else-if="state === 'idle'" inline size="xs">{{ t('watch.neverAnalyzed') }}</SHint>
      </div>

      <STabs v-model="section" :tabs="tabs" size="sm">
        <div v-show="section === 'analyses'">
          <SEmpty v-if="!analysesLoading && !analyses.length" :text="t('watch.noAnalyses')" icon="eyeglass" />
          <div v-else class="mod-analysis-list">
            <AnalysisCard v-for="a in analyses" :key="a.id" :analysis="a" :timeline-count="recordsTotal" @open-record="openRecord" />
            <div v-if="analyses.length < analysesTotal" class="mod-center">
              <SButton size="sm" :loading="analysesLoading" @click="userId && loadAnalyses(userId, analysesPage + 1)">{{ t('watch.loadMore') }}</SButton>
            </div>
          </div>
        </div>

        <div v-show="section === 'records'">
          <SBulkBar v-if="manage && records.length" :count="checked.length" :total="records.length" :page-selected="checked.length === records.length" class="mod-block" @select-page="checked = records.map((r) => r.id)" @clear="checked = []">
            <template #idle>{{ t('review.hint') }}</template>
            <SButton size="sm" :loading="reviewing" @click="bulkReview('false_positive')">{{ t('review.falsePositive') }}</SButton>
            <SButton size="sm" variant="danger" :loading="reviewing" @click="bulkReview('confirmed')">{{ t('review.confirmed') }}</SButton>
            <SButton size="sm" variant="ghost" :loading="reviewing" @click="bulkReview('pending')">{{ t('review.reset') }}</SButton>
          </SBulkBar>
          <STable
            v-model:selected="checked"
            :columns="recordColumns"
            :rows="records"
            :empty-text="t('watch.noSuspicious')"
            :selectable="manage"
            dense
            clickable
            @row-click="(r: ModEvent) => openRecord(r.id)"
          >
            <template #cell-record="{ row }">
              <div class="mod-pg-tl-head">
                <span class="mod-num">#{{ row.id }}</span>
                <SHint inline size="xs">{{ dt(row.created_at) }}</SHint>
                <FlowLabel :flow-id="row.flow_id" :version="row.flow_version" />
              </div>
              <div class="mod-pg-tl-head">
                <CategoryChips :categories="row.hit_categories" />
                <SBadge v-if="row.severity" size="xs" :tone="severityTone(row.severity)">{{ enumLabel('severity', row.severity) }}</SBadge>
                <ResultBadge :result="row.result" />
                <StagePath v-if="row.trace" :trace="row.trace" :result="row.result" />
              </div>
              <div v-if="row.text_excerpt" class="mod-sub mod-timeline-text">{{ row.text_excerpt }}</div>
            </template>
            <template #cell-ai="{ row }">
              <SBadge v-if="row.ai_verdict" :tone="aiVerdictTone(row.ai_verdict)">{{ enumLabel('aiVerdict', row.ai_verdict) }}</SBadge>
              <SHint v-else inline size="xs">{{ enumLabel('aiVerdict', 'none') }}</SHint>
              <div v-if="row.ai_verdict === 'violation' && row.ai_severity" class="mod-sub">{{ enumLabel('severity', row.ai_severity) }}</div>
            </template>
            <template #cell-review="{ row }">
              <SBadge :tone="reviewTone(row.review_status)">{{ enumLabel('review', row.review_status) }}</SBadge>
            </template>
          </STable>
          <SHint size="xs" class="mod-section">{{ t('pagesP3.timeline.hint') }}</SHint>
          <div v-if="recordsTotal > records.length" class="mod-center">
            <SButton size="sm" variant="ghost" @click="emit('show-user', entry.user_id)">{{ t('watch.allRecords') }}</SButton>
          </div>
        </div>

        <div v-show="section === 'history'">
          <SEmpty v-if="!history.length" :text="t('watch.noHistory')" />
          <ol v-else class="mod-history">
            <li v-for="e in history" :key="e.id">
              <div class="mod-history-head">
                <SBadge>{{ enumLabel('watchAction', e.action) }}</SBadge>
                <span v-if="e.from_level || e.to_level" class="mod-sub">{{ enumLabel('level', e.from_level) }} → {{ enumLabel('level', e.to_level) }}</span>
                <SHint inline size="xs">{{ dt(e.created_at) }}</SHint>
                <SHint v-if="e.operator_id" inline size="xs">· {{ t('pagesP3.wdetail.operator') }} <UserCell :id="e.operator_id" /></SHint>
                <SHint v-else inline size="xs">· {{ t('pagesP3.wdetail.system') }}</SHint>
                <SHint v-if="e.analysis_id" inline size="xs">· {{ t('analysis.title', { id: e.analysis_id }) }}</SHint>
              </div>
              <div v-if="e.reason" class="mod-sub">{{ watchReason(e.action, e.reason) }}</div>
            </li>
          </ol>
        </div>
      </STabs>
    </div>
  </SDrawer>
  <EventDetail v-model:open="recordOpen" :event-id="recordId" @reviewed="onReviewed" @deleted="onDeleted" @watch-changed="onRecordWatchChanged" />
</template>

<style scoped>
.mod-pg-tl-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}
</style>
