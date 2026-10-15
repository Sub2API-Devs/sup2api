<script setup lang="ts">
// The four usage totals (requests, success rate, tokens, cost) over summary
// rows of GET /usage/summary or /me/usage/summary. The success rate shows "—"
// when no row reports `success`.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SGrid, SStatCard } from '@sub2api/ui'
import type { UsageSummaryRow } from '@/api/types'
import { formatMoney, formatNumber, formatPercent } from '@/utils/format'

const props = defineProps<{ rows: UsageSummaryRow[]; loading?: boolean }>()
const { t } = useI18n()

const totals = computed(() => {
  const sum = (pick: (r: UsageSummaryRow) => unknown) => props.rows.reduce((n, r) => n + (Number(pick(r)) || 0), 0)
  const reported = props.rows.some((r) => r.success !== undefined && r.success !== null)
  return {
    requests: sum((r) => r.requests),
    success: reported ? sum((r) => r.success) : null,
    input: sum((r) => r.input_tokens),
    output: sum((r) => r.output_tokens),
    cost: sum((r) => r.total_cost)
  }
})
</script>

<template>
  <SGrid class="mb-4" :xl-cols="4" data-testid="usage-summary-cards">
    <SStatCard :label="t('usage.summary.requests')" :value="formatNumber(totals.requests)" icon="chart" :loading="loading" />
    <SStatCard :label="t('usage.summary.successRate')" :value="formatPercent(totals.success, totals.requests)" icon="check" tone="success" :loading="loading" />
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
