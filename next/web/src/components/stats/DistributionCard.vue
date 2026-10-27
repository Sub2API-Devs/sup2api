<script setup lang="ts">
// Share of a summary breakdown (by model, API key, group): a donut of the
// top seven and "other", beside a table of the same rows, switchable between
// tokens and cost. The table carries the labels, so the colors never stand
// alone. Colors follow the entity (stats.entityColors). A row click emits
// `select` with its key ('' for "other" is not emitted).
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SCard, SChart, SEmpty, SSegmented } from '@sub2api/ui'
import type { UsageSummaryRow } from '@/api/types'
import { useAppStore } from '@/stores/app'
import { formatMoney, formatNumber } from '@/utils/format'
import { entityColors, escapeHtml, formatCostShort, formatTokens, num, otherColor, rowTokens, surfaceColor, topWithOther } from './stats'

const props = withDefaults(
  defineProps<{ title: string; keyLabel: string; rows: UsageSummaryRow[]; loading?: boolean; labelOf?: (key: string) => string; selectable?: boolean }>(),
  { labelOf: undefined, selectable: false }
)
const emit = defineEmits<{ (e: 'select', key: string): void }>()
const { t } = useI18n()
const app = useAppStore()

const metric = ref<'tokens' | 'cost'>('tokens')
const value = (r: UsageSummaryRow) => (metric.value === 'cost' ? num(r.total_cost) : rowTokens(r))
const name = (key: string) => (props.labelOf ? props.labelOf(key) : key) || '—'

const view = computed(() => {
  const dark = app.theme === 'dark'
  const { top, other, otherCount } = topWithOther(props.rows, value)
  const colors = entityColors(top.map((r) => r.key), dark)
  const items = top.map((r) => ({ key: r.key, label: name(r.key), color: colors.get(r.key)!, row: r, other: false }))
  if (other) items.push({ key: '', label: t('stats.other', { n: otherCount }), color: otherColor(dark), row: other, other: true })
  const total = items.reduce((a, i) => a + value(i.row), 0)
  return { items, total, dark }
})

const option = computed(() => {
  const { items, total, dark } = view.value
  const fmt = (v: number) => (metric.value === 'cost' ? formatCostShort(v) : formatTokens(v))
  return {
    tooltip: { trigger: 'item', formatter: (p: any) => `${p.marker}${escapeHtml(String(p.name))}<br/>${fmt(p.value)}（${p.percent}%）` },
    title: {
      text: fmt(total),
      subtext: metric.value === 'cost' ? t('stats.byCost') : t('stats.byTokens'),
      left: 'center',
      top: '38%',
      itemGap: 2,
      textStyle: { fontSize: 15, fontWeight: 700, color: dark ? '#e2e8f0' : '#0f172a' },
      subtextStyle: { fontSize: 11, color: dark ? '#94a3b8' : '#64748b' }
    },
    series: [
      {
        type: 'pie',
        radius: ['58%', '84%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: { borderColor: surfaceColor(dark), borderWidth: 2 },
        data: items.map((i) => ({ name: i.label, value: Number(value(i.row).toFixed(6)), itemStyle: { color: i.color } }))
      }
    ]
  }
})

function pct(r: UsageSummaryRow) {
  const total = view.value.total
  return total ? ((value(r) / total) * 100).toFixed(1) + '%' : '—'
}
</script>

<template>
  <SCard :title="title" :padded="false">
    <template #actions>
      <slot name="extra" />
      <SSegmented
        v-model="metric"
        size="sm"
        :aria-label="title"
        :options="[
          { value: 'tokens', label: t('stats.byTokens') },
          { value: 'cost', label: t('stats.byCost') }
        ]"
      />
    </template>
    <SEmpty v-if="!loading && !rows.length" :text="t('stats.noData')" class="py-10" />
    <div v-else class="grid grid-cols-1 items-center gap-3 p-4 sm:grid-cols-[168px_1fr]">
      <SChart :option="option" height="168px" :loading="loading" />
      <div class="max-h-56 overflow-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-left text-fg-subtle">
              <th class="py-1.5 pr-2 font-medium">{{ keyLabel }}</th>
              <th class="py-1.5 pr-2 text-right font-medium">{{ t('stats.requests') }}</th>
              <th class="py-1.5 pr-2 text-right font-medium">{{ metric === 'cost' ? t('stats.byCost') : t('stats.byTokens') }}</th>
              <th class="py-1.5 text-right font-medium">{{ t('stats.share') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="i in view.items"
              :key="i.other ? '__other__' : i.key"
              class="border-t border-line/60"
              :class="selectable && !i.other ? 'cursor-pointer hover:bg-surface-2' : ''"
              @click="selectable && !i.other && emit('select', i.key)"
            >
              <td class="max-w-[14rem] py-1.5 pr-2">
                <span class="flex items-center gap-1.5">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-sm" :style="{ background: i.color }" />
                  <span class="truncate" :class="i.other ? 'text-fg-muted' : 'font-mono'" :title="i.label">{{ i.label }}</span>
                </span>
              </td>
              <td class="py-1.5 pr-2 text-right tabular-nums">{{ formatNumber(i.row.requests) }}</td>
              <td class="py-1.5 pr-2 text-right tabular-nums">{{ metric === 'cost' ? formatMoney(i.row.total_cost, 2) : formatTokens(rowTokens(i.row)) }}</td>
              <td class="py-1.5 text-right tabular-nums text-fg-subtle">{{ pct(i.row) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </SCard>
</template>
