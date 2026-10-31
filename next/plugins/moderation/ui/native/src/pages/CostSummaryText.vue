<script setup lang="ts">
import { computed } from 'vue'
import { SHint } from '@sub2api/ui'
import { enumLabel, money, useModHost, type CostSummary } from '../host'

// A CostSummary as "$0.0123", with "N 次未定价" when some calls had no price.
// `sources` (cost_today_sources) adds the amount per source: one sub line
// each with `breakdown`, else on hover.
const props = defineProps<{ summary?: CostSummary | null; sources?: Record<string, CostSummary> | null; breakdown?: boolean }>()
const host = useModHost()
const t = host.t
const n = (v: number) => host.i18n.formatNumber(v)
const amount = (s: CostSummary) => (s.calls && !s.priced_calls && !s.free_calls ? t('cost.notPriced') : money(s.cost))
const lines = computed(() =>
  Object.entries(props.sources || {})
    .filter(([, s]) => s.calls > 0)
    .map(([k, s]) => `${enumLabel('costSource', k)} ${amount(s)} · ${t('channels.callsN', { n: n(s.calls) })}`)
)
</script>

<template>
  <SHint v-if="!summary" inline>—</SHint>
  <span v-else class="mod-num" :title="!breakdown && lines.length ? lines.join('\n') : undefined">
    {{ amount(summary) }}
    <span v-if="summary.unpriced_calls && (summary.priced_calls || summary.free_calls)" class="mod-sub"> ({{ t('channels.unpricedN', { n: n(summary.unpriced_calls) }) }})</span>
    <template v-if="breakdown && lines.length > 1">
      <span v-for="l in lines" :key="l" class="mod-sub mod-pg-cost-line">{{ l }}</span>
    </template>
  </span>
</template>

<style scoped>
.mod-pg-cost-line {
  display: block;
}
</style>
