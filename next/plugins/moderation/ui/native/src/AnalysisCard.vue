<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SAlert, SBadge, SDisclosure, SHint, SLink, SSpinner, STable, type TableColumn } from '@sub2api/ui'
import VerdictGroups from './pages/VerdictGroups.vue'
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
  type AnalysisStep
} from './host'

// One AI analysis of a watched user (§72.13.4): conclusion, problems, verdict
// counts and cost; the steps (trace) and per-record verdicts load on demand
// from GET /analyses/:id.
const props = defineProps<{ analysis: Analysis; detail?: AnalysisDetail | null; defaultOpen?: boolean; /** suspicious records of the user; more than reviewed = "N not reviewed" */ timelineCount?: number }>()
const emit = defineEmits<{ (e: 'open-record', id: number): void }>()
const host = useModHost()
const t = host.t
const n = (v: number | undefined | null) => host.i18n.formatNumber(v ?? 0)

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
const reviewed = computed(() => (counts.value ? counts.value.violation + counts.value.false_positive + counts.value.unsure : 0))
const notReviewed = computed(() => Math.max(0, (props.timelineCount ?? 0) - reviewed.value))

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
const records = computed(() => full.value?.record_verdicts || [])

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
      <SHint inline size="xs" class="mod-ml-auto">#{{ a.id }} · {{ host.i18n.formatDateTime(a.created_at) }}</SHint>
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

    <p v-if="counts" class="mod-pg-ai-summary mod-num">
      {{ t('pagesP3.verdicts.summary', { n: n(reviewed) }) }}
      <b class="mod-pg-ai-v">{{ t('pagesP3.verdicts.violationN', { n: n(counts.violation) }) }}</b>
      <span v-if="counts.high !== undefined" class="mod-sub">({{ t('pagesP3.watch.sev', { high: n(counts.high), medium: n(counts.medium), low: n(counts.low) }) }})</span>
      · <b class="mod-pg-ai-fp">{{ t('pagesP3.verdicts.fpN', { n: n(counts.false_positive) }) }}</b>
      · <b class="mod-pg-ai-u">{{ t('pagesP3.verdicts.unsureN', { n: n(counts.unsure) }) }}</b>
      <span v-if="notReviewed" class="mod-sub"> · {{ t('pagesP3.verdicts.notReviewed', { n: n(notReviewed) }) }}</span>
    </p>

    <div class="mod-analysis-meta mod-num">
      <span v-if="a.model">{{ a.model }}</span>
      <span>{{ t('analysis.steps', { n: n(a.steps) }) }}</span>
      <span>{{ t('analysis.tokens', { in: n(a.tokens_in), out: n(a.tokens_out) }) }}</span>
      <span>
        {{ t('analysis.cost') }}: {{ a.cost === null || a.cost === undefined || a.cost === '' ? t('cost.notPriced') : money(a.cost) }}<template v-if="a.unpriced_calls && a.cost"> ({{ t('channels.unpricedN', { n: n(a.unpriced_calls) }) }})</template>
      </span>
      <span>{{ t('analysis.duration') }}: {{ t('ms', { n: n(a.duration_ms) }) }}</span>
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
        <template v-if="records.length">
          <p class="mod-cost-label">{{ t('analysis.records') }}</p>
          <VerdictGroups :verdicts="records" @open-record="emit('open-record', $event)" />
        </template>
        <STable :columns="stepColumns" :rows="steps" row-key="step" dense :empty-text="t('analysis.traceEmpty')">
          <template #cell-tool="{ row }">
            <code v-if="row.tool" class="mod-code mod-code-plain">{{ row.tool }}</code>
            <SHint v-else inline>{{ t('analysis.step.model') }}</SHint>
            <div v-if="row.error" class="mod-sub mod-danger">{{ enumLabel('analysisErr', row.error) }}</div>
            <div v-if="row.notes?.length" class="mod-sub">{{ notes(row) }}</div>
          </template>
          <template #cell-args="{ row }"><code v-if="row.args" class="mod-code mod-code-plain" :title="row.args">{{ row.args }}</code></template>
          <template #cell-latency_ms="{ row }"><span class="mod-num">{{ t('ms', { n: n(row.latency_ms) }) }}</span></template>
          <template #cell-tokens="{ row }">
            <span v-if="row.tokens_in || row.tokens_out" class="mod-num">{{ n(row.tokens_in) }} / {{ n(row.tokens_out) }}</span>
          </template>
          <template #cell-result_bytes="{ row }">
            <span v-if="row.result_bytes" class="mod-num">{{ t('detail.bytes', { n: n(row.result_bytes) }) }}</span>
            <SBadge v-if="row.truncated" size="xs" tone="warning" class="mod-ml">{{ t('analysis.step.truncated') }}</SBadge>
          </template>
        </STable>

        <p class="mod-cost-label">{{ t('pagesP3.verdicts.detail') }}</p>
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

<style scoped>
.mod-pg-ai-summary {
  margin: 0;
  font-size: 0.8125rem;
}
.mod-pg-ai-v {
  color: rgb(220 38 38);
}
.mod-pg-ai-fp {
  color: rgb(22 163 74);
}
.mod-pg-ai-u {
  color: rgb(202 138 4);
}
</style>
