<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SDescriptions, SDrawer, SEmpty, SHint, SSectionTitle, SSpinner, STabs, type DescItem } from '@sub2api/ui'
import AnalysisCard from './AnalysisCard.vue'
import CategoryChips from './CategoryChips.vue'
import EventDetail from './EventDetail.vue'
import ResultBadge from './ResultBadge.vue'
import VerdictBadge from './VerdictBadge.vue'
import {
  analysisState,
  analyzeWatch,
  canManage,
  enumLabel,
  errorMessage,
  fetchUserEvents,
  fetchWatch,
  fetchWatchAnalyses,
  fetchWatchEvents,
  levelTone,
  suggestionTone,
  trendTone,
  useModHost,
  watchReason,
  type Analysis,
  type ModEvent,
  type Watch,
  type WatchEvent
} from './host'

// Watch list detail (§72.13.6): the entry and "重新分析", the analysis queue
// state and latest conclusion, the analyses (expandable steps), the suspicious
// records of the user and the watch history.
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
  const [, ev, hist] = await Promise.all([loadAnalyses(id), fetchUserEvents(id), fetchWatchEvents(id)])
  if (props.userId !== id) return
  records.value = ev.items
  recordsTotal.value = ev.page.total
  history.value = Array.isArray(hist) ? hist : []
}

async function load() {
  const id = props.userId
  if (!id) return
  loading.value = true
  error.value = ''
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

const fields = computed<DescItem[]>(() => {
  const w = entry.value
  if (!w) return []
  const items: DescItem[] = [
    { key: 'level', label: t('watch.col.level') },
    { key: 'source', label: t('watch.col.source'), value: enumLabel('watchSource', w.source) },
    { key: 'violations', label: t('watch.col.violations'), value: n(w.violation_count) },
    { key: 'hits', label: t('watch.col.hits'), value: n(w.hit_count) },
    { key: 'since', label: t('watch.since'), value: dt(w.since_at) },
    { key: 'expires', label: t('watch.col.expires'), value: w.expires_at ? dt(w.expires_at) : t('watch.noExpiry') },
    { key: 'last', label: t('watch.col.lastHit'), value: dt(w.last_hit_at) }
  ]
  if (w.note) items.push({ key: 'note', label: t('watch.col.note'), value: w.note, full: true })
  return items
})

const tabs = computed(() => [
  { key: 'analyses', label: `${t('watch.analyses')} (${n(analysesTotal.value)})` },
  { key: 'records', label: `${t('watch.suspicious')} (${n(recordsTotal.value)})` },
  { key: 'history', label: `${t('watch.history')} (${n(history.value.length)})` }
])

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
</script>

<template>
  <SDrawer :open="open" :title="t('watch.detailTitle', { id: userId ?? '' })" width="xl" @update:open="emit('update:open', $event)">
    <SSpinner v-if="loading && !entry" block />
    <SAlert v-else-if="error" tone="warning">{{ error }}</SAlert>
    <div v-else-if="entry" class="mod-detail">
      <div>
        <SSectionTitle tag="p">
          {{ t('watch.info') }}
          <template #actions>
            <SButton size="sm" variant="ghost" @click="emit('show-user', entry.user_id)">{{ t('watch.allRecords') }}</SButton>
            <SButton v-if="manage" size="sm" variant="primary" icon="refresh" :loading="analyzing" :disabled="state !== 'idle'" @click="analyze">{{ t('watch.analyze') }}</SButton>
          </template>
        </SSectionTitle>
        <SDescriptions :items="fields" :columns="2" dense>
          <template #item-level><SBadge :tone="levelTone(entry.level)">{{ enumLabel('level', entry.level) }}</SBadge></template>
        </SDescriptions>
      </div>

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
            <AnalysisCard v-for="a in analyses" :key="a.id" :analysis="a" @open-record="openRecord" />
            <div v-if="analyses.length < analysesTotal" class="mod-center">
              <SButton size="sm" :loading="analysesLoading" @click="userId && loadAnalyses(userId, analysesPage + 1)">{{ t('watch.loadMore') }}</SButton>
            </div>
          </div>
        </div>

        <div v-show="section === 'records'">
          <SEmpty v-if="!records.length" :text="t('watch.noSuspicious')" icon="eyeglass" />
          <ol v-else class="mod-timeline">
            <li v-for="r in records" :key="r.id">
              <button type="button" class="mod-timeline-item" @click="openRecord(r.id)">
                <span class="mod-history-head">
                  <ResultBadge :result="r.result" />
                  <VerdictBadge :event="r" />
                  <CategoryChips :categories="r.hit_categories" />
                  <SHint inline size="xs" class="mod-ml-auto">{{ dt(r.created_at) }} · #{{ r.id }}</SHint>
                </span>
                <span class="mod-sub mod-timeline-text">{{ r.text_excerpt || '—' }}</span>
                <span v-if="r.ai_reason" class="mod-sub mod-timeline-text">AI: {{ r.ai_reason }}</span>
              </button>
            </li>
          </ol>
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
                <SHint inline size="xs">{{ dt(e.created_at) }}<template v-if="e.operator_id"> · #{{ e.operator_id }}</template></SHint>
                <SHint v-if="e.analysis_id" inline size="xs">· {{ t('analysis.title', { id: e.analysis_id }) }}</SHint>
              </div>
              <div v-if="e.reason" class="mod-sub">{{ watchReason(e.action, e.reason) }}</div>
            </li>
          </ol>
        </div>
      </STabs>
    </div>
  </SDrawer>
  <EventDetail v-model:open="recordOpen" :event-id="recordId" @reviewed="onReviewed" @deleted="onDeleted" />
</template>
