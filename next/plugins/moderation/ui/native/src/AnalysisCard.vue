<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SAlert, SBadge, SDisclosure, SHint, SLink, SSpinner, STable, type TableColumn } from '@sub2api/ui'
import { dt, ms, num as n } from './format'
import {
  aiVerdictTone,
  categoryLabel,
  enumLabel,
  errorMessage,
  fetchAnalysis,
  money,
  severityTone,
  suggestionTone,
  trendTone,
  useModHost,
  type Analysis,
  type AnalysisDetail,
  type AnalysisStep,
  type RecordVerdict
} from './host'

// One AI analysis of a watched user (§72.13.4): conclusion, problems, verdict
// counts and cost; the steps (trace) and per-record verdicts load on demand
// from GET /analyses/:id, violations first by severity (high, medium, low).
const props = defineProps<{ analysis: Analysis; detail?: AnalysisDetail | null; defaultOpen?: boolean }>()
const emit = defineEmits<{ (e: 'open-record', id: number): void }>()
const t = useModHost().t

const a = computed(() => props.analysis)
const full = ref<AnalysisDetail | null>(props.detail || null)
const open = ref(!!props.defaultOpen)
const loading = ref(false)
const error = ref('')

watch(
  () => props.detail,
  (d) => {
    if (d) full.value = d
  }
)

watch(
  open,
  async (v) => {
    if (!v || full.value || loading.value) return
    loading.value = true
    error.value = ''
    try {
      full.value = await fetchAnalysis(a.value.id)
    } catch (e) {
      error.value = errorMessage(e, t('analysis.loadFailed'))
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

/** stale = finished but not applied; contract §72.13.4 leaves open whether it is a status or an error code. */
const stale = computed(() => a.value.status === 'stale' || a.value.error === 'stale')
const failed = computed(() => a.value.status === 'failed' && !stale.value)
const counts = computed(() => a.value.verdict_counts)
/** " (高 1 · 中 2 · 低 2)" after the violation count, when the backend splits it. */
const severityText = computed(() => {
  const c = counts.value
  return c?.violation && (c.high || c.medium || c.low) ? ` (${t('analysis.severityCounts', { high: n(c.high), medium: n(c.medium), low: n(c.low) })})` : ''
})

const stepColumns = computed<TableColumn[]>(() => [
  { key: 'step', label: t('analysis.step.step'), nowrap: true, align: 'right' },
  { key: 'tool', label: t('analysis.step.tool') },
  { key: 'args', label: t('analysis.step.args'), ellipsis: '12rem' },
  { key: 'latency_ms', label: t('analysis.step.latency'), align: 'right', nowrap: true },
  { key: 'tokens', label: t('analysis.step.tokens'), align: 'right', nowrap: true },
  { key: 'result_bytes', label: t('analysis.step.bytes'), align: 'right', nowrap: true }
])

const recColumns = computed<TableColumn[]>(() => [
  { key: 'record_id', label: t('analysis.rec.record'), nowrap: true },
  { key: 'verdict', label: t('analysis.rec.verdict'), nowrap: true },
  { key: 'category', label: t('analysis.rec.category'), nowrap: true },
  { key: 'evidence', label: t('analysis.rec.evidence'), ellipsis: '14rem' },
  { key: 'reason', label: t('analysis.rec.reason'), ellipsis: '18rem' }
])

const steps = computed(() => full.value?.trace || [])
/** Sort rank of a record verdict: violations high → medium → low → other, then unsure, then false positives. */
const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 0, medium: 1, low: 2 }
const rank = (v: RecordVerdict) => (v.verdict === 'violation' ? (SEVERITY_RANK[v.severity || ''] ?? 3) : v.verdict === 'unsure' ? 4 : 5)
const records = computed(() => [...(full.value?.record_verdicts || [])].sort((x, y) => rank(x) - rank(y)))

function notes(s: AnalysisStep): string {
  return (s.notes || []).map((x) => enumLabel('noteKind', x.kind) + (x.record_id ? ` #${x.record_id}` : '')).join('；')
}
</script>

<template>
  <div class="mod-analysis">
    <div class="mod-analysis-head">
      <template v-if="!failed">
        <SBadge v-if="a.trend" :tone="trendTone(a.trend)">{{ t('analysis.trend') }}: {{ enumLabel('trend', a.trend) }}</SBadge>
        <SBadge v-if="a.suggestion" :tone="suggestionTone(a.suggestion)">{{ t('analysis.suggestion') }}: {{ enumLabel('suggestion', a.suggestion) }}</SBadge>
      </template>
      <SBadge v-if="failed" tone="danger" dot>{{ enumLabel('analysisStatus', 'failed') }}</SBadge>
      <SBadge v-if="stale" tone="warning">{{ enumLabel('analysisStatus', 'stale') }}</SBadge>
      <SBadge tone="gray">{{ enumLabel('source', a.source) }}</SBadge>
      <SHint inline size="xs" class="mod-ml-auto">#{{ a.id }} · {{ dt(a.created_at) }}</SHint>
    </div>

    <SAlert v-if="failed" tone="danger" dense>{{ enumLabel('analysisErr', a.error) }}</SAlert>
    <SAlert v-else-if="stale" tone="warning" dense>{{ enumLabel('analysisErr', 'stale') }}</SAlert>

    <p v-if="a.summary" class="mod-analysis-summary mod-prewrap">{{ a.summary }}</p>
    <div v-if="a.main_problems?.length">
      <p class="mod-cost-label">{{ t('analysis.mainProblems') }}</p>
      <ul class="mod-problems">
        <li v-for="(p, i) in a.main_problems" :key="i">{{ p }}</li>
      </ul>
    </div>

    <div class="mod-analysis-meta mod-num">
      <span v-if="counts">{{ t('analysis.verdictCounts') }}: {{ t('analysis.counts', { v: n(counts.violation), fp: n(counts.false_positive), u: n(counts.unsure) }) }}{{ severityText }}</span>
      <span v-if="a.model">{{ a.model }}</span>
      <span>{{ t('analysis.steps', { n: n(a.steps) }) }}</span>
      <span>{{ t('analysis.tokens', { in: n(a.tokens_in), out: n(a.tokens_out) }) }}</span>
      <span>
        {{ t('analysis.cost') }}: {{ a.cost === null || a.cost === undefined || a.cost === '' ? t('cost.notPriced') : money(a.cost) }}<template v-if="a.unpriced_calls && a.cost"> ({{ t('channels.unpricedN', { n: n(a.unpriced_calls) }) }})</template>
      </span>
      <span>{{ t('analysis.duration') }}: {{ ms(a.duration_ms) }}</span>
    </div>
    <div v-if="a.flows_seen?.length" class="mod-analysis-meta">
      <span>{{ t('analysis.flowsSeen') }}:</span>
      <span v-for="f in a.flows_seen" :key="`${f.flow_id}-${f.version}`">
        {{ f.name || `#${f.flow_id}` }} v{{ f.version }}<template v-if="f.historical || f.deleted"> ({{ f.deleted ? t('cost.deleted') : t('analysis.historical') }})</template>
      </span>
    </div>

    <SDisclosure v-model:open="open" :label="t('analysis.showTrace')" :open-label="t('analysis.showTrace')">
      <SSpinner v-if="loading" block />
      <SAlert v-else-if="error" tone="danger" dense>{{ error }}</SAlert>
      <div v-else class="mod-analysis-trace">
        <STable :columns="stepColumns" :rows="steps" row-key="step" dense :empty-text="t('analysis.traceEmpty')">
          <template #cell-tool="{ row }">
            <code v-if="row.tool" class="mod-code mod-code-plain">{{ row.tool }}</code>
            <SHint v-else inline>{{ t('analysis.step.model') }}</SHint>
            <div v-if="row.error" class="mod-sub mod-danger">{{ enumLabel('analysisErr', row.error) }}</div>
            <div v-if="row.notes?.length" class="mod-sub">{{ notes(row) }}</div>
          </template>
          <template #cell-args="{ row }"><code v-if="row.args" class="mod-code mod-code-plain" :title="row.args">{{ row.args }}</code></template>
          <template #cell-latency_ms="{ row }"><span class="mod-num">{{ ms(row.latency_ms) }}</span></template>
          <template #cell-tokens="{ row }">
            <span v-if="row.tokens_in || row.tokens_out" class="mod-num">{{ n(row.tokens_in) }} / {{ n(row.tokens_out) }}</span>
          </template>
          <template #cell-result_bytes="{ row }">
            <span v-if="row.result_bytes" class="mod-num">{{ t('detail.bytes', { n: n(row.result_bytes) }) }}</span>
            <SBadge v-if="row.truncated" size="xs" tone="warning" class="mod-ml">{{ t('analysis.step.truncated') }}</SBadge>
          </template>
        </STable>

        <p class="mod-cost-label">{{ t('analysis.records') }}</p>
        <STable :columns="recColumns" :rows="records" row-key="record_id" dense :empty-text="t('analysis.noRecords')">
          <template #cell-record_id="{ row }">
            <SLink as="button" class="mod-num" @click="emit('open-record', row.record_id)">#{{ row.record_id }}</SLink>
          </template>
          <template #cell-verdict="{ row }">
            <SBadge :tone="aiVerdictTone(row.verdict)">{{ enumLabel('aiVerdict', row.verdict) }}</SBadge>
            <SBadge v-if="row.severity && row.verdict === 'violation'" :tone="severityTone(row.severity)" size="xs" class="mod-ml">{{ enumLabel('severity', row.severity) }}</SBadge>
          </template>
          <template #cell-category="{ row }">{{ row.category ? categoryLabel(row.category) : '—' }}</template>
          <template #cell-evidence="{ row }"><span :title="row.evidence">{{ row.evidence || '—' }}</span></template>
          <template #cell-reason="{ row }"><span :title="row.reason">{{ row.reason || '—' }}</span></template>
        </STable>
      </div>
    </SDisclosure>
  </div>
</template>
