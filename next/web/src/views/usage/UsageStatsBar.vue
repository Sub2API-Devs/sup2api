<script setup lang="ts">
// Totals of the searched requests as compact chips (requests, success rate,
// tokens, cache hit, cost) over the day rows of /usage/summary or
// /me/usage/summary. The success rate shows "—" when no row reports it.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SSkeleton } from '@sub2api/ui'
import type { UsageSummaryRow } from '@/api/types'
import { formatMoney, formatNumber, formatPercent } from '@/utils/format'

const props = defineProps<{ rows: UsageSummaryRow[]; loading?: boolean }>()
const { t } = useI18n()

const chips = computed(() => {
  const sum = (pick: (r: UsageSummaryRow) => unknown) => props.rows.reduce((n, r) => n + (Number(pick(r)) || 0), 0)
  const requests = sum((r) => r.requests)
  const reported = props.rows.some((r) => r.success !== undefined && r.success !== null)
  const input = sum((r) => r.input_tokens)
  const output = sum((r) => r.output_tokens)
  const cacheRead = sum((r) => r.cache_read_tokens)
  const prompt = props.rows.every((r) => r.prompt_tokens != null) ? sum((r) => r.prompt_tokens) : null
  return [
    { key: 'requests', label: t('usage.summary.requests'), value: formatNumber(requests), accent: 'bg-sky-500/70' },
    { key: 'success', label: t('usage.summary.successRate'), value: formatPercent(reported ? sum((r) => r.success) : null, requests), accent: 'bg-emerald-500/70' },
    {
      key: 'tokens',
      label: t('usage.summary.tokens'),
      value: formatNumber(input + output),
      title: t('usage.summary.tokensSub', { input: formatNumber(input), output: formatNumber(output) }),
      accent: 'bg-amber-500/70'
    },
    // The server normalizes each request before combining inclusive/exclusive usage.
    { key: 'cache', label: t('usage.summary.cacheHit'), value: formatPercent(cacheRead, prompt), accent: 'bg-violet-500/70' },
    { key: 'cost', label: t('usage.summary.cost'), value: formatMoney(sum((r) => r.total_cost)), accent: 'bg-rose-500/65' }
  ]
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-2" data-testid="usage-stats">
    <template v-if="loading && !rows.length">
      <SSkeleton v-for="(w, i) in [110, 100, 120, 100, 110]" :key="i" :width="w + 'px'" height="1.75rem" />
    </template>
    <span
      v-for="c in chips"
      v-else
      :key="c.key"
      class="inline-flex h-7 items-center gap-2 rounded-md border border-line bg-surface-2/60 px-2.5 text-xs shadow-sm"
      :title="c.title"
      :data-testid="`usage-stat-${c.key}`"
    >
      <span class="h-3.5 w-0.5 rounded-full" :class="c.accent" aria-hidden="true" />
      <span class="text-fg-muted">{{ c.label }}</span>
      <span class="font-mono font-semibold tabular-nums text-fg">{{ c.value }}</span>
    </span>
  </div>
</template>
