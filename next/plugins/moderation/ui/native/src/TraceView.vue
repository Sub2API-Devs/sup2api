<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { SBadge, SHint, STable, type TableColumn } from '@sub2api/ui'
import CategoryChips from './CategoryChips.vue'
import { categoryLabel, enumLabel, fetchAuditors, score, useModHost, type Outcome, type Trace } from './host'

// Per-stage trace of a run: one row per auditor call.
const props = defineProps<{ trace: Trace }>()
const host = useModHost()
const t = host.t

// Auditor names, loaded once per page.
let namesP: Promise<Map<number, string>> | null = null
const names = ref<Map<number, string>>(new Map())
onMounted(async () => {
  namesP ??= fetchAuditors()
    .then((list) => new Map(list.map((a) => [a.id, a.name])))
    .catch(() => new Map())
  names.value = await namesP
})

interface Row extends Outcome {
  key: string
  stage: number
  stageResult: string
}

const rows = computed<Row[]>(() =>
  (props.trace.stages || []).flatMap((st, i) =>
    (st.outcomes || []).map((o, j) => ({ ...o, key: `${i}-${j}`, stage: i + 1, stageResult: st.skipped ? 'skipped' : st.errored && st.result === 'pass' ? 'error' : st.result }))
  )
)

const columns = computed<TableColumn[]>(() => [
  { key: 'stage', label: t('trace.stage'), nowrap: true },
  { key: 'auditor', label: t('trace.auditor') },
  { key: 'verdict', label: t('trace.verdict'), nowrap: true },
  { key: 'top', label: t('trace.top') },
  { key: 'model', label: t('trace.model'), ellipsis: '10rem' },
  { key: 'latency_ms', label: t('trace.latency'), align: 'right', nowrap: true }
])

function verdict(o: Outcome): { tone: 'danger' | 'success' | 'gray' | 'warning'; key: string } {
  if (o.err) return { tone: 'warning', key: 'error' }
  if (o.skipped) return { tone: 'gray', key: 'skipped' }
  return o.hit ? { tone: 'danger', key: 'hit' } : { tone: 'success', key: 'pass' }
}
</script>

<template>
  <div>
    <div class="mod-trace-head">
      <SBadge v-if="trace.overturned" tone="info">{{ t('trace.overturned') }}</SBadge>
      <SBadge v-if="trace.errored" tone="warning">{{ t('trace.errored') }}</SBadge>
      <SBadge v-if="trace.skipped" tone="gray">{{ t('trace.skipped') }}</SBadge>
      <SBadge v-if="trace.truncated_run" tone="gray">{{ t('trace.truncated') }}</SBadge>
      <SHint inline size="xs">{{ t('ms', { n: host.i18n.formatNumber(trace.latency_ms) }) }}</SHint>
    </div>
    <STable :columns="columns" :rows="rows" row-key="key" dense :empty-text="t('trace.empty')">
      <template #cell-stage="{ row }">
        {{ t('trace.stageN', { n: row.stage }) }}
        <div class="mod-sub">{{ enumLabel('stageResult', row.stageResult) }}</div>
      </template>
      <template #cell-auditor="{ row }">
        {{ names.get(row.auditor_id) || `#${row.auditor_id}` }}
        <div v-if="row.rules_version" class="mod-sub">{{ row.rules_version }}</div>
      </template>
      <template #cell-verdict="{ row }">
        <SBadge :tone="verdict(row).tone">{{ t(`trace.${verdict(row).key}`) }}</SBadge>
        <div v-if="row.err" class="mod-sub">{{ enumLabel('err', row.err) }}<template v-if="row.status"> {{ row.status }}</template></div>
      </template>
      <template #cell-top="{ row }">
        <CategoryChips v-if="row.hits?.length" :categories="row.hits" wrap />
        <span v-else-if="row.top_category" class="mod-num">{{ categoryLabel(row.top_category) }} {{ score(row.top_score) }}</span>
        <SHint v-else inline>—</SHint>
        <div v-if="row.reason" class="mod-sub">{{ row.reason }}</div>
        <div v-if="row.sent_images || row.skipped_images" class="mod-sub">{{ t('trace.images', { sent: row.sent_images || 0, skipped: row.skipped_images || 0 }) }}</div>
      </template>
      <template #cell-model="{ row }">{{ row.model || '—' }}</template>
      <template #cell-latency_ms="{ row }"><span class="mod-num">{{ t('ms', { n: host.i18n.formatNumber(row.latency_ms) }) }}</span></template>
    </STable>
  </div>
</template>
