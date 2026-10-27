<script setup lang="ts">
// The operator's user ranking under the usage filters (design §4.5): the top
// n users of GET /usage/summary?group_by=user&order=…&limit=n, the rest in
// one "other" row at the bottom. Cost, requests and tokens are ranked by the
// server; input, output and cache re-sort the rows it returned. A row click
// emits `select` with the user id.
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SCard, SSegmented, SSelect, STable, type TableColumn } from '@sub2api/ui'
import type { UsageSummaryRow } from '@/api/types'
import { formatTokens, num, rowTokens, type RankMetric } from '@/components/stats/stats'
import { formatMoney, formatNumber } from '@/utils/format'
import { useUsageSummary } from './useUsageSummary'

const props = defineProps<{ summaryPath: string; filters: Record<string, unknown>; revision?: number }>()
const emit = defineEmits<{ (e: 'select', userId: string): void }>()
const { t } = useI18n()

type SortKey = RankMetric | 'input' | 'output' | 'cache'
const sort = ref<SortKey>('cost')
const limit = ref('20')
const serverOrder = computed<RankMetric>(() => (sort.value === 'cost' || sort.value === 'requests' ? sort.value : 'tokens'))
const summary = useUsageSummary(props.summaryPath, props.filters, 'user', true, () => ({ order: serverOrder.value, limit: limit.value }))
watch(() => props.revision, summary.reload)

const cache = (r: UsageSummaryRow) => num(r.cache_read_tokens) + num(r.cache_creation_tokens)
const LOCAL: Partial<Record<SortKey, (r: UsageSummaryRow) => number>> = {
  input: (r) => num(r.input_tokens),
  output: (r) => num(r.output_tokens),
  cache
}
const rows = computed(() => {
  const all = summary.rows.value
  const other = all.filter((r) => r.key === '__other__')
  let ranked = all.filter((r) => r.key !== '__other__')
  const by = LOCAL[sort.value]
  if (by) ranked = [...ranked].sort((a, b) => by(b) - by(a))
  return [...ranked.map((r, i) => ({ ...r, rank: i + 1 })), ...other.map((r) => ({ ...r, rank: 0 }))]
})

const sortOptions = computed(() => [
  { value: 'cost', label: t('stats.byCost') },
  { value: 'requests', label: t('stats.byRequests') },
  { value: 'tokens', label: t('stats.byTokens') },
  { value: 'input', label: t('stats.input') },
  { value: 'output', label: t('stats.output') },
  { value: 'cache', label: t('stats.cacheTokens') }
])
const limitOptions = ['20', '50', '100', '200'].map((n) => ({ value: n, label: `${t('stats.rankTop')} ${n}` }))
const sortLabel = computed(() => sortOptions.value.find((o) => o.value === sort.value)?.label || '')

const columns = computed<TableColumn[]>(() => [
  { key: 'rank', label: '#', width: '56px' },
  { key: 'key', label: t('stats.rankUser') },
  { key: 'requests', label: t('stats.requests'), align: 'right', width: '100px' },
  { key: 'input', label: t('stats.input'), align: 'right', width: '100px' },
  { key: 'output', label: t('stats.output'), align: 'right', width: '100px' },
  { key: 'cache', label: t('stats.cacheTokens'), align: 'right', width: '100px' },
  { key: 'tokens', label: t('stats.totalTokens'), align: 'right', width: '110px' },
  { key: 'total_cost', label: t('stats.cost'), align: 'right', width: '110px' }
])
// Literal class names so Tailwind keeps them.
const MEDAL = ['bg-amber-200 text-amber-900', 'bg-slate-200 text-slate-700', 'bg-orange-200 text-orange-900']
</script>

<template>
  <SCard :title="t('stats.userRanking')" :subtitle="t('stats.rankingHint', { n: limit, metric: sortLabel })" :padded="false" class="mb-4 overflow-hidden" data-testid="user-ranking">
    <template #actions>
      <SSegmented v-model="sort" size="sm" :aria-label="t('stats.userRanking')" :options="sortOptions" data-testid="ranking-sort" />
      <SSelect v-model="limit" size="sm" :aria-label="t('stats.rankTop')" :options="limitOptions" data-testid="ranking-limit" />
    </template>
    <STable
      :columns="columns"
      :rows="rows"
      :loading="summary.loading.value"
      row-key="key"
      dense
      clickable
      :empty-text="t('stats.noData')"
      @row-click="(r: any) => r.key !== '__other__' && emit('select', r.key)"
    >
      <template #cell-rank="{ row }">
        <span v-if="row.rank" class="flex h-5 w-5 items-center justify-center rounded-full text-xxs font-bold" :class="row.rank <= 3 ? MEDAL[row.rank - 1] : 'text-fg-subtle'">{{ row.rank }}</span>
      </template>
      <template #cell-key="{ row }">
        <span v-if="row.key === '__other__'" class="text-fg-muted">{{ t('stats.otherPlain') }}</span>
        <span v-else class="flex min-w-0 items-baseline gap-1.5">
          <span class="truncate text-fg">{{ row.user_email || '—' }}</span>
          <span class="shrink-0 font-mono text-xxs text-fg-subtle">#{{ row.key }}</span>
        </span>
      </template>
      <template #cell-requests="{ row }"><span class="font-mono text-xs tabular-nums">{{ formatNumber(row.requests) }}</span></template>
      <template #cell-input="{ row }"><span class="font-mono text-xs tabular-nums">{{ formatTokens(num(row.input_tokens)) }}</span></template>
      <template #cell-output="{ row }"><span class="font-mono text-xs tabular-nums">{{ formatTokens(num(row.output_tokens)) }}</span></template>
      <template #cell-cache="{ row }"><span class="font-mono text-xs tabular-nums">{{ formatTokens(cache(row)) }}</span></template>
      <template #cell-tokens="{ row }"><span class="font-mono text-xs tabular-nums">{{ formatTokens(rowTokens(row)) }}</span></template>
      <template #cell-total_cost="{ row }"><span class="font-mono text-xs font-semibold tabular-nums">{{ formatMoney(row.total_cost, 2) }}</span></template>
    </STable>
  </SCard>
</template>
