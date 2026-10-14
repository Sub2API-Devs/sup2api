<script setup lang="ts">
// The four usage totals (requests, success rate, tokens, cost) over summary
// rows of GET /usage/summary or /me/usage/summary. The success rate shows "—"
// when no row reports `success`.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SGrid, SStatCard } from '@sub2api/ui'
import { formatMoney, formatNumber } from '@/utils/format'

export interface UsageSummaryRow {
  requests?: number | string | null
  success?: number | string | null
  input_tokens?: number | string | null
  output_tokens?: number | string | null
  total_cost?: number | string | null
}

const props = defineProps<{ rows: UsageSummaryRow[]; loading?: boolean }>()
const { t } = useI18n()

const totals = computed(() => {
  let requests = 0, success = 0, input = 0, output = 0, cost = 0, hasSuccess = false
  for (const r of props.rows) {
    requests += Number(r.requests) || 0
    if (r.success !== undefined && r.success !== null) {
      hasSuccess = true
      success += Number(r.success) || 0
    }
    input += Number(r.input_tokens) || 0
    output += Number(r.output_tokens) || 0
    cost += Number(r.total_cost) || 0
  }
  return { requests, success: hasSuccess ? success : null, input, output, cost }
})
const successRate = computed(() => {
  const x = totals.value
  if (x.success === null || !x.requests) return '—'
  return ((x.success / x.requests) * 100).toFixed(1) + '%'
})
</script>

<template>
  <SGrid class="mb-4" :xl-cols="4" data-testid="usage-summary-cards">
    <SStatCard :label="t('usage.summary.requests')" :value="formatNumber(totals.requests)" icon="chart" :loading="loading" />
    <SStatCard :label="t('usage.summary.successRate')" :value="successRate" icon="check" tone="success" :loading="loading" />
    <SStatCard
      :label="t('usage.summary.tokens')"
      :value="formatNumber(totals.input + totals.output)"
      :sub="t('usage.summary.tokensSub', { input: formatNumber(totals.input), output: formatNumber(totals.output) })"
      icon="bolt"
      tone="warning"
      :loading="loading"
    />
    <SStatCard :label="t('usage.summary.cost')" :value="formatMoney(totals.cost)" icon="balance" :loading="loading" />
  </SGrid>
</template>
