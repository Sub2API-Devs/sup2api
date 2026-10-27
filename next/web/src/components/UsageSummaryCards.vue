<script setup lang="ts">
// The four totals of a usage summary (one group_by=none row): requests with
// the success rate, tokens split into input / output / cache, cost with the
// list price when a group multiplier changed it (and the estimated part), and
// the average duration with the first token.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SGrid, SStatCard } from '@sub2api/ui'
import type { UsageSummaryRow } from '@/api/types'
import { formatMoney, formatNumber, formatPercent } from '@/utils/format'
import { formatMs, formatTokens, num, rowTokens } from './stats/stats'

const props = defineProps<{ totals: UsageSummaryRow | null; loading?: boolean }>()
const { t } = useI18n()

const v = computed(() => {
  const r = props.totals
  const cost = num(r?.total_cost)
  const standard = num(r?.standard_cost)
  return {
    requests: num(r?.requests),
    success: r?.success,
    tokens: r ? rowTokens(r) : 0,
    input: num(r?.input_tokens),
    output: num(r?.output_tokens),
    read: num(r?.cache_read_tokens),
    write: num(r?.cache_creation_tokens),
    cost,
    standard: Math.abs(standard - cost) > 1e-9 ? standard : null,
    estimated: num(r?.estimated_cost) || null,
    latency: num(r?.latency_ms_avg),
    firstToken: num(r?.first_token_ms_avg)
  }
})
</script>

<template>
  <SGrid :cols="2" :xl-cols="4" data-testid="usage-summary-cards">
    <SStatCard
      :label="t('stats.cards.requests')"
      :value="formatNumber(v.requests)"
      :sub="t('stats.cards.successRate', { p: formatPercent(v.success, v.requests) })"
      icon="chart"
      tone="info"
      :loading="loading"
    />
    <SStatCard
      :label="t('stats.cards.tokens')"
      :value="formatTokens(v.tokens)"
      :sub="t('stats.cards.tokensSub', { input: formatTokens(v.input), output: formatTokens(v.output) })"
      :sub2="t('stats.cards.cacheSub', { read: formatTokens(v.read), write: formatTokens(v.write) })"
      icon="bolt"
      tone="warning"
      :loading="loading"
    />
    <SStatCard
      :label="t('stats.cards.cost')"
      :value="formatMoney(v.cost, 2)"
      :sub="v.standard !== null ? t('stats.cards.standard', { cost: formatMoney(v.standard, 2) }) : undefined"
      :sub2="v.estimated ? t('stats.cards.estimated', { cost: formatMoney(v.estimated, 2) }) : undefined"
      icon="balance"
      tone="success"
      :loading="loading"
    />
    <SStatCard
      :label="t('stats.cards.latency')"
      :value="formatMs(v.latency)"
      :sub="t('stats.cards.firstToken', { t: formatMs(v.firstToken) })"
      icon="clock"
      tone="accent"
      :loading="loading"
    />
  </SGrid>
</template>
