<script setup lang="ts">
// The account's usage from the core's record (CONTRACTS §73): lifetime cost
// in the basis the raw-ratio switch picks, then the usage limit of the current
// period as plain figures, or today's cost and requests without a limit.
// Hovering loads today / 7 days / 30 days / lifetime with both costs, again
// once the row's usage changed; until then an open card keeps the figures.
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SHint, SSpinner, STooltip } from '@sub2api/ui'
import type { AccountUsage, AccountUsageDetail, AccountUsageFigures } from '@/api/types'
import { formatCompact, formatDateTime, formatMoney, formatNumber } from '@/utils/format'
import { fetchAccountUsage, limitLevel, mainCost, usagePeriodLabel } from './accountUsage'
import { LEVEL_TEXT } from './usageLevel'

const props = defineProps<{ accountId: number; usage: AccountUsage | null | undefined }>()
const { t } = useI18n()

const detail = ref<AccountUsageDetail | null>(null)
const loading = ref(false)
const failed = ref(false)
let seq = 0
let stale = false

async function load() {
  if (loading.value || (detail.value && !stale)) return
  const my = ++seq
  stale = false
  loading.value = true
  failed.value = false
  try {
    const d = await fetchAccountUsage(props.accountId)
    if (my === seq) detail.value = d
  } catch {
    if (my === seq) failed.value = true
  } finally {
    if (my === seq) loading.value = false
  }
}
// Another account drops the loaded details. The list reloads every row every
// few seconds: only usage that moved makes them stale, and they stay on show
// until the next hover has loaded them again.
watch(
  () => props.accountId,
  () => {
    seq++
    detail.value = null
    loading.value = false
    failed.value = false
    stale = false
  }
)
watch(
  () => JSON.stringify(props.usage),
  () => (stale = true)
)

const money = (v: number | string) => formatMoney(v, 2)
const level = computed(() => (props.usage?.limit ? limitLevel(props.usage.limit) : 'ok'))
const periodLabel = computed(() => {
  const l = props.usage?.limit
  return l ? usagePeriodLabel(t, l.period, l.period_count) : ''
})
const rows = computed<Array<{ key: string; f: AccountUsageFigures }>>(() =>
  detail.value
    ? [
        { key: 'today', f: detail.value.today },
        { key: 'last7', f: detail.value.last_7_days },
        { key: 'last30', f: detail.value.last_30_days },
        { key: 'total', f: detail.value.total }
      ]
    : []
)
</script>

<template>
  <SHint v-if="!usage" inline size="xs">—</SHint>
  <STooltip v-else variant="card" placement="bottom" :delay="150" max-width="30rem">
    <span
      class="inline-flex min-w-36 flex-col gap-1 whitespace-nowrap rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
      tabindex="0"
      data-testid="account-usage"
      @mouseenter="load"
      @focusin="load"
    >
      <span class="flex items-center gap-1.5">
        <span class="font-mono font-semibold tabular-nums">{{ money(mainCost(usage, usage.total)) }}</span>
        <SBadge v-if="usage.raw_cost_accounting" tone="purple" size="xs" :title="t('accounts.usage.rawHint')">{{ t('accounts.usage.raw') }}</SBadge>
      </span>
      <span v-if="usage.limit" class="flex items-center gap-1.5 text-xxs tabular-nums" data-testid="account-usage-limit">
        <span class="rounded bg-surface-2 px-1.5 text-fg-muted">{{ periodLabel }}</span>
        <span :class="[LEVEL_TEXT[level], { 'font-semibold': level === 'danger' }]">{{ money(usage.limit.used) }} / {{ money(usage.limit.amount) }}</span>
      </span>
      <span v-else class="text-xxs tabular-nums text-fg-muted">{{ t('accounts.usage.today', { cost: money(mainCost(usage, usage.today)), n: usage.today.requests }) }}</span>
    </span>
    <template #content>
      <div class="mb-2 font-semibold">{{ t('accounts.usage.title') }}</div>
      <table v-if="detail" class="w-full text-xs tabular-nums">
        <thead>
          <tr class="text-fg-muted">
            <th class="py-1 pr-3 text-left font-medium">{{ t('accounts.usage.range') }}</th>
            <th class="py-1 pl-3 text-right font-medium">{{ t('accounts.usage.rawCost') }}</th>
            <th class="py-1 pl-3 text-right font-medium">{{ t('accounts.usage.cost') }}</th>
            <th class="py-1 pl-3 text-right font-medium">{{ t('accounts.usage.requests') }}</th>
            <th class="py-1 pl-3 text-right font-medium">{{ t('accounts.usage.tokens') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.key" class="border-t border-line" :class="r.key === 'total' ? 'font-semibold' : ''">
            <td class="py-1 pr-3">{{ t(`accounts.usage.ranges.${r.key}`) }}</td>
            <td class="py-1 pl-3 text-right">{{ money(r.f.raw_cost) }}</td>
            <td class="py-1 pl-3 text-right">{{ money(r.f.cost) }}</td>
            <td class="py-1 pl-3 text-right">{{ formatNumber(r.f.requests) }}</td>
            <td class="py-1 pl-3 text-right">{{ formatCompact(r.f.tokens) }}</td>
          </tr>
        </tbody>
      </table>
      <SSpinner v-else-if="loading" />
      <SHint v-else-if="failed" size="xs" tone="warning">{{ t('accounts.usage.loadFailed') }}</SHint>
      <div v-if="usage.limit" class="mt-2 text-xs tabular-nums">
        {{ t('accounts.usage.limitLine', { period: periodLabel, used: money(usage.limit.used), amount: money(usage.limit.amount) }) }}
        <span v-if="usage.limit.window_end" class="text-fg-muted">· {{ t('accounts.usage.resetsAt', { time: formatDateTime(usage.limit.window_end) }) }}</span>
        <span v-if="usage.limit.waived" class="text-fg-muted">· {{ t('accounts.usageLimit.waived') }}</span>
      </div>
      <p class="mt-2 text-xxs leading-relaxed text-fg-muted">{{ t('accounts.usage.hint') }}</p>
    </template>
  </STooltip>
</template>
