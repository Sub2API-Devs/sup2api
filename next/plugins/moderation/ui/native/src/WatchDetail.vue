<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SDescriptions, SDrawer, SEmpty, SHint, SSectionTitle, SSpinner, STabs, type DescItem } from '@sub2api/ui'
import AnalysisCard from './AnalysisCard.vue'
import CategoryChips from './CategoryChips.vue'
import EventDetail from './EventDetail.vue'
import ResultBadge from './ResultBadge.vue'
import VerdictBadge from './VerdictBadge.vue'
import UserDailyChart from './UserDailyChart.vue'
import UserRef from './UserRef.vue'
import UserStateSection from './UserStateSection.vue'
import WatchSummary from './WatchSummary.vue'
import { dt, num as n } from './format'
import {
  analyzeWatch,
  canManage,
  createWatch,
  deleteWatch,
  markWatchSeen,
  updateWatch,
  enumLabel,
  errorMessage,
  fetchUserDetail,
  fetchUserEvents,
  fetchWatchAnalyses,
  fetchWatchEvents,
  suggestionTone,
  trendTone,
  useModHost,
  watchReason,
  type Analysis,
  type ModEvent,
  type Suggestion,
  type UserDetail,
  type Watch,
  type WatchEvent,
  type WatchItem,
  type WatchLevel
} from './host'

// User detail drawer (§72.13.6, new-api user-detail-drawer), for any user:
// state and inline watch level, the entry, a summary with the last 30 days,
// the analysis queue state and latest conclusion with "按 AI 建议执行", the
// analyses (expandable steps), the suspicious records and the watch history.
// Opening it marks the user's new records as seen.
const props = defineProps<{ open: boolean; userId: number | null; item?: WatchItem | null }>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'changed', w: Partial<Watch> | null): void
  (e: 'show-user', userId: number): void
}>()
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

const detail = ref<UserDetail | null>(null)
const entry = computed(() => detail.value?.watch ?? null)
const latest = computed(() => detail.value?.latest_analysis ?? null)
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

const state = computed(() => {
  const a = detail.value?.analysis
  return a?.running ? 'running' : a?.queued ? 'pending' : 'idle'
})

let timer: ReturnType<typeof setInterval> | null = null
function stopPoll() {
  if (timer) clearInterval(timer)
  timer = null
}

async function loadDetail(id: number) {
  const d = await fetchUserDetail(id)
  if (props.userId !== id) return
  const was = state.value
  detail.value = d
  emit('changed', d.watch)
  // An analysis just finished: its card, the AI verdicts and the history changed.
  if (was !== 'idle' && state.value === 'idle') loadLists(id)
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

async function loadHistory(id: number) {
  const hist = await fetchWatchEvents(id)
  if (props.userId === id) history.value = Array.isArray(hist) ? hist : []
}

async function loadLists(id: number) {
  const [, ev] = await Promise.all([loadAnalyses(id), fetchUserEvents(id), loadHistory(id)])
  if (props.userId !== id) return
  records.value = ev.items
  recordsTotal.value = ev.page.total
}

/** Resets the "new records" counter of the opened user (manage only). */
async function markSeen(id: number) {
  const w = entry.value
  if (!manage.value || !w?.hits_since_seen) return
  await markWatchSeen(id).catch(() => undefined)
  w.hits_since_seen = 0
  emit('changed', { hits_since_seen: 0 })
}

async function load() {
  const id = props.userId
  if (!id) return
  loading.value = true
  error.value = ''
  try {
    await Promise.all([loadDetail(id), loadLists(id)])
    await markSeen(id)
  } catch (e) {
    error.value = errorMessage(e, t('watch.loadFailed'))
  } finally {
    loading.value = false
  }
}

/** After a watch change here: the entry, the analysis state and the history. */
function refreshWatch() {
  const id = props.userId
  if (id) Promise.all([loadDetail(id), loadHistory(id)]).catch((e) => host.toast(errorMessage(e, t('watch.loadFailed')), 'error'))
}

watch(
  () => [props.open, props.userId] as const,
  ([open, id]) => {
    stopPoll()
    if (!open || !id) return
    if (detail.value?.user_id !== id) {
      detail.value = null
      analyses.value = []
      records.value = []
      history.value = []
      section.value = 'analyses'
    }
    load()
  },
  { immediate: true }
)

// While queued or running, refresh the detail every 5 s.
watch(state, (s) => {
  stopPoll()
  if (s !== 'idle' && props.open && props.userId) {
    const id = props.userId
    timer = setInterval(() => loadDetail(id).catch(() => undefined), 5000)
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
  } catch (e) {
    if (isApiError(e) && e.code === 'no_analysis_channel') host.toast(t('watch.noAnalysisChannel'), 'warning')
    else if (isApiError(e) && e.code === 'analysis_pending') host.toast(t('watch.analysisPending'), 'info')
    else if (isApiError(e) && e.status === 404) host.toast(t('watch.notWatched'), 'warning')
    else host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    analyzing.value = false
  }
  refreshWatch()
}

// "按 AI 建议执行" (new-api analysis-card): the latest successful analysis'
// suggestion applied by hand, linked to it by analysis_id.
const SUGGESTED_LEVEL: Record<Suggestion, WatchLevel | null> = { block: 'enforce', observe: 'observe', release: null }
const suggestion = computed(() => {
  const d = detail.value
  const a = latest.value
  if (!manage.value || !d || d.staff || d.exempt || a?.status !== 'ok' || !a.suggestion) return null
  const level = SUGGESTED_LEVEL[a.suggestion]
  return level === (d.watch?.level ?? null) ? null : { key: a.suggestion, level, analysisId: a.id }
})
const applying = ref(false)
async function applySuggestion() {
  const s = suggestion.value
  const id = props.userId
  if (!s || !id) return
  const ok = await host.confirm({ message: t('watch.applyConfirm', { suggestion: enumLabel('suggestion', s.key) }), confirmText: t('watch.apply') })
  if (!ok) return
  applying.value = true
  const link = { analysis_id: s.analysisId, reason: t('watch.applyReason', { id: s.analysisId }) }
  try {
    if (!s.level) await deleteWatch(id)
    else if (entry.value) await updateWatch(id, { level: s.level, ...link })
    else await createWatch({ user_id: id, level: s.level, ...link })
    host.toast(t('watch.saved'), 'success')
    refreshWatch()
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    applying.value = false
  }
}

const fields = computed<DescItem[]>(() => {
  const w = entry.value
  if (!w) return []
  const items: DescItem[] = [
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
    <SSpinner v-if="loading && !detail" block />
    <SAlert v-else-if="error" tone="warning">{{ error }}</SAlert>
    <div v-else-if="detail" class="mod-detail">
      <UserStateSection :user-id="detail.user_id" :state="detail" @watch-changed="refreshWatch" @show-user="emit('show-user', $event)" />

      <div v-if="entry">
        <SSectionTitle tag="p">{{ t('watch.info') }}</SSectionTitle>
        <SDescriptions :items="fields" :columns="2" dense />
      </div>

      <div>
        <SSectionTitle tag="p">{{ t('watchSummary.title') }}</SSectionTitle>
        <WatchSummary :detail="detail" :item="item" />
        <UserDailyChart v-if="detail.daily.length" :daily="detail.daily" />
      </div>

      <div class="mod-analysis-state">
        <span class="mod-cost-label">{{ t('watch.analysisState') }}</span>
        <SBadge v-if="state !== 'idle'" :tone="state === 'running' ? 'info' : 'warning'" dot>{{ enumLabel('analysisState', state) }}</SBadge>
        <SHint v-if="state !== 'idle' && entry?.analysis_requested_at" inline size="xs">
          {{ t('watch.queuedAt', { time: dt(entry.analysis_requested_at) }) }}<template v-if="entry.analysis_source"> · {{ enumLabel('source', entry.analysis_source) }}</template>
        </SHint>
        <SHint v-else-if="entry && detail.analysis.every" inline size="xs">
          {{ t('watch.untilNext', { n: n(detail.analysis.violations_since_analysis), every: n(detail.analysis.every) }) }}
        </SHint>
        <template v-if="latest">
          <span class="mod-sub">{{ t('watch.latest') }}</span>
          <SBadge v-if="latest.status !== 'ok'" :tone="latest.status === 'failed' ? 'danger' : 'warning'">
            {{ enumLabel('analysisStatus', latest.status) }}
          </SBadge>
          <SBadge v-if="latest.trend" :tone="trendTone(latest.trend)">{{ enumLabel('trend', latest.trend) }}</SBadge>
          <SBadge v-if="latest.suggestion" :tone="suggestionTone(latest.suggestion)">
            {{ t('analysis.suggestion') }}: {{ enumLabel('suggestion', latest.suggestion) }}
          </SBadge>
          <SHint inline size="xs">{{ dt(latest.created_at) }}</SHint>
        </template>
        <SHint v-else-if="state === 'idle'" inline size="xs">{{ t('watch.neverAnalyzed') }}</SHint>
        <span class="mod-ml-auto mod-inline mod-gap">
          <SButton v-if="suggestion" size="sm" :variant="suggestion.key === 'block' ? 'danger' : 'secondary'" :loading="applying" @click="applySuggestion">
            {{ t('watch.applySuggestion', { suggestion: enumLabel('suggestion', suggestion.key) }) }}
          </SButton>
          <SButton v-if="manage && entry" size="sm" variant="primary" icon="refresh" :loading="analyzing" :disabled="state !== 'idle'" @click="analyze">{{ t('watch.analyze') }}</SButton>
        </span>
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
            <SButton size="sm" variant="ghost" @click="emit('show-user', detail.user_id)">{{ t('watch.allRecords') }}</SButton>
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
                <UserRef v-if="e.operator_id" :user-id="e.operator_id" class="mod-sub" />
                <SHint v-if="e.analysis_id" inline size="xs">· {{ t('analysis.title', { id: e.analysis_id }) }}</SHint>
              </div>
              <div v-if="e.reason" class="mod-sub">{{ watchReason(e.action, e.reason) }}</div>
            </li>
          </ol>
        </div>
      </STabs>
    </div>
  </SDrawer>
  <EventDetail v-model:open="recordOpen" :event-id="recordId" @reviewed="onReviewed" @deleted="onDeleted" @show-user="emit('show-user', $event)" />
</template>
