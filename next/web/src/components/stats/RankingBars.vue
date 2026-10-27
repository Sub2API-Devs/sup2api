<script setup lang="ts">
// A ranking as horizontal bars (design §4.4): one color for the ranked rows,
// gray for the folded "other" row (key __other__), the value at the end of
// each bar and medals on the first three. Rows come ranked from the summary
// (order=…&limit=…). A row click emits `select` with its key.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SEmpty, SSkeleton } from '@sub2api/ui'
import type { UsageSummaryRow } from '@/api/types'
import { useAppStore } from '@/stores/app'
import { formatMoney, formatNumber } from '@/utils/format'
import { formatTokens, num, otherColor, rowTokens, seriesColor, type RankMetric } from './stats'

const props = withDefaults(defineProps<{ rows: UsageSummaryRow[]; metric: RankMetric; loading?: boolean; labelOf?: (r: UsageSummaryRow) => string }>(), {
  labelOf: undefined
})
const emit = defineEmits<{ (e: 'select', key: string): void }>()
const { t } = useI18n()
const app = useAppStore()

const value = (r: UsageSummaryRow) => (props.metric === 'cost' ? num(r.total_cost) : props.metric === 'requests' ? num(r.requests) : rowTokens(r))
const view = computed(() => {
  const dark = app.theme === 'dark'
  const max = Math.max(1e-12, ...props.rows.filter((r) => r.key !== '__other__').map(value), ...props.rows.map(value))
  return props.rows.map((r, i) => {
    const other = r.key === '__other__'
    return {
      key: r.key,
      other,
      rank: other ? '' : String(i + 1),
      label: other ? t('stats.otherPlain') : props.labelOf ? props.labelOf(r) : r.key,
      width: (value(r) / max) * 100,
      color: other ? otherColor(dark) : seriesColor(0, dark),
      text: props.metric === 'cost' ? formatMoney(r.total_cost, 2) : props.metric === 'requests' ? formatNumber(r.requests) : formatTokens(rowTokens(r))
    }
  })
})
// Literal class names so Tailwind keeps them.
const MEDAL = ['bg-amber-200 text-amber-900', 'bg-slate-200 text-slate-700', 'bg-orange-200 text-orange-900']
</script>

<template>
  <div data-testid="ranking-bars">
    <div v-if="loading && !rows.length" class="space-y-2"><SSkeleton v-for="i in 5" :key="i" height="1.25rem" /></div>
    <SEmpty v-else-if="!rows.length" :text="t('stats.noData')" size="sm" />
    <button
      v-for="r in view"
      v-else
      :key="r.key || r.label"
      type="button"
      class="grid w-full grid-cols-[1.5rem_minmax(0,10rem)_1fr_5.5rem] items-center gap-2 rounded-lg px-1 py-1 text-left text-xs hover:bg-surface-2 disabled:cursor-default disabled:hover:bg-transparent"
      :disabled="r.other"
      @click="emit('select', r.key)"
    >
      <span class="flex h-5 w-5 items-center justify-center rounded-full text-xxs font-bold" :class="Number(r.rank) <= 3 && r.rank ? MEDAL[Number(r.rank) - 1] : 'text-fg-subtle'">{{ r.rank }}</span>
      <span class="truncate" :class="r.other ? 'text-fg-muted' : 'text-fg'" :title="r.label">{{ r.label }}</span>
      <span class="h-3 overflow-hidden rounded-e"><span class="block h-full rounded-e" :style="{ width: `${Math.max(r.width, 1)}%`, background: r.color }" /></span>
      <span class="text-right tabular-nums text-fg">{{ r.text }}</span>
    </button>
  </div>
</template>
