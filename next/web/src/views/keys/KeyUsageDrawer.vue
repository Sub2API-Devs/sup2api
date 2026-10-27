<script setup lang="ts">
// Usage of one API key over the last 7, 30 or 90 days (design §4.3): the
// requests, cost and tokens of the period, the cost of each day and the
// share of each model, all from GET /me/usage/summary?api_key_id=…; nothing
// is queried while the drawer is closed.
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SCard, SChart, SDrawer, SGrid, SSegmented, SStatCard } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'
import DistributionCard from '@/components/stats/DistributionCard.vue'
import { bucketKeys, bucketLabel, formatCostShort, formatTokens, num, rowTokens, seriesColor } from '@/components/stats/stats'
import { useAppStore } from '@/stores/app'
import { useUsageSummary } from '@/views/usage/useUsageSummary'
import { formatMoney, formatNumber } from '@/utils/format'

const props = defineProps<{ apiKey: ApiKey | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { t } = useI18n()
const app = useAppStore()

const days = ref('7')
const filters = reactive({ api_key_id: '', from: '' })
function startOf(n: number) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (n - 1))
  return d.toISOString()
}
watch(
  [() => props.apiKey?.id, days],
  ([id]) => Object.assign(filters, { api_key_id: id ? String(id) : '', from: startOf(Number(days.value)) }),
  { immediate: true }
)
const open = computed(() => !!props.apiKey)
const totals = useUsageSummary('/me/usage/summary', filters, 'none', open)
const daily = useUsageSummary('/me/usage/summary', filters, 'day', open)
const models = useUsageSummary('/me/usage/summary', filters, 'model', open)

const sum = computed(() => totals.rows.value[0])
const dayOptions = computed(() => ['7', '30', '90'].map((n) => ({ value: n, label: t('stats.key.days', { n }) })))

const chart = computed(() => {
  const dark = app.theme === 'dark'
  const keys = bucketKeys(filters.from, '', 'day', daily.rows.value)
  const byKey = new Map(daily.rows.value.map((r) => [r.key, r]))
  return {
    grid: { left: 48, right: 8, top: 12, bottom: 24 },
    xAxis: { type: 'category', data: keys.map((k) => bucketLabel(k, 'day', true)) },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatCostShort(v) } },
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => formatCostShort(num(v)) },
    series: [
      { name: t('stats.cost'), type: 'bar', barMaxWidth: 18, color: seriesColor(6, dark), itemStyle: { borderRadius: [3, 3, 0, 0] }, data: keys.map((k) => num(byKey.get(k)?.total_cost)) }
    ]
  }
})
</script>

<template>
  <SDrawer :open="open" :title="apiKey ? t('stats.key.title', { name: apiKey.name }) : ''" width="lg" @close="emit('close')">
    <div class="flex flex-col gap-4" data-testid="key-usage-drawer">
      <SSegmented v-model="days" size="sm" :aria-label="t('stats.key.usage')" :options="dayOptions" class="self-start" data-testid="key-usage-days" />
      <SGrid :cols="3">
        <SStatCard :label="t('stats.requests')" :value="formatNumber(sum?.requests ?? 0)" icon="usage" :loading="totals.loading.value && !sum" />
        <SStatCard :label="t('stats.cost')" :value="formatMoney(sum?.total_cost ?? 0, 2)" icon="price" tone="accent" :loading="totals.loading.value && !sum" />
        <SStatCard :label="t('stats.totalTokens')" :value="formatTokens(sum ? rowTokens(sum) : 0)" icon="bolt" tone="warning" :loading="totals.loading.value && !sum" />
      </SGrid>
      <SCard :title="t('stats.key.dailyCost')" variant="flat">
        <SChart :option="chart" height="180px" :loading="daily.loading.value" />
      </SCard>
      <DistributionCard :title="t('stats.key.byModel')" :key-label="t('stats.model')" :rows="models.rows.value" :loading="models.loading.value" />
    </div>
  </SDrawer>
</template>
