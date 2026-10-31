<script setup lang="ts">
// The account's usage from the core's record (CONTRACTS §73): lifetime cost
// in the basis the raw-ratio switch picks, then the usage limit of the current
// period as plain figures, or today's cost and requests without a limit.
// Hovering loads today / 7 days / 30 days / lifetime with both costs.
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SHint, SSpinner, STooltip } from '@sub2api/ui'
import type { AccountUsage, AccountUsageDetail, AccountUsageFigures } from '@/api/types'
import { formatCompact, formatDateTime, formatMoney } from '@/utils/format'
import { fetchAccountUsage, limitTone, mainCost } from './accountUsage'

const props = defineProps<{ accountId: number; usage: AccountUsage | null | undefined }>()
const { t } = useI18n()

const detail = ref<AccountUsageDetail | null>(null)
const loading = ref(false)
const failed = ref(false)

async function load() {
  if (loading.value || detail.value) return
  loading.value = true
  failed.value = false
  try {
    detail.value = await fetchAccountUsage(props.accountId)
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

const money = (v: number | string) => formatMoney(v, 2)
const LIMIT_TEXT = { danger: 'font-semibold text-danger-700 dark:text-danger-300', warning: 'text-warning-700 dark:text-warning-300', normal: 'text-fg' } as const
const periodLabel = computed(() => {
  const l = props.usage?.limit
  if (!l) return ''
  const unit = t(`accounts.usage.periodShort.${l.period}`)
  return l.period !== 'none' && l.period_count > 1 ? t('accounts.usage.periodShortN', { n: l.period_count, unit }) : unit
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
        <span :class="LIMIT_TEXT[limitTone(usage.limit)]">{{ money(usage.limit.used) }} / {{ money(usage.limit.amount) }}</span>
      </span>
      <span v-else class="text-xxs tabular-nums text-fg-muted">{{ t('accounts.usage.today', { cost: money(mainCost(usage, usage.today)), n: usage.today.requests }) }}</span>
    </span>
    <template #content>
      <div class="mb-2 font-semibold">{{ t('accounts.usage.title') }}</div>
      <SSpinner v-if="loading" />
      <SHint v-else-if="failed" size="xs" tone="warning">{{ t('accounts.usage.loadFailed') }}</SHint>
      <table v-else-if="detail" class="w-full text-xs tabular-nums">
        <thead>
          <tr class="text-fg-muted">
            <th class="py-1 pr-3 text-left font-medium">{{ t('accounts.usage.range') }}</th>
            <th class="py-1 pl-3 text-right font-medium">{{ t('accounts.usage.rawCost') }}</th>
            <th class="py-1 pl-3 text-right font-medium">{{ t('accounts.usage.cost') }}</th>
            <th class="py-1 pl-3 text-right font-medium">{{ t('accounts.usage.requests') }}</th>
            <th class="py-1 pl-3 text-right font-medium">Token</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.key" class="border-t border-line" :class="r.key === 'total' ? 'font-semibold' : ''">
            <td class="py-1 pr-3">{{ t(`accounts.usage.ranges.${r.key}`) }}</td>
            <td class="py-1 pl-3 text-right">{{ money(r.f.raw_cost) }}</td>
            <td class="py-1 pl-3 text-right">{{ money(r.f.cost) }}</td>
            <td class="py-1 pl-3 text-right">{{ r.f.requests.toLocaleString() }}</td>
            <td class="py-1 pl-3 text-right">{{ formatCompact(r.f.tokens) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="usage.limit" class="mt-2 text-xs tabular-nums">
        {{ t('accounts.usage.limitLine', { period: periodLabel, used: money(usage.limit.used), amount: money(usage.limit.amount) }) }}
        <span v-if="usage.limit.window_end" class="text-fg-muted">· {{ t('accounts.usage.resetsAt', { time: formatDateTime(usage.limit.window_end) }) }}</span>
      </div>
      <p class="mt-2 text-xxs leading-relaxed text-fg-muted">{{ t('accounts.usage.hint') }}</p>
    </template>
  </STooltip>
</template>
