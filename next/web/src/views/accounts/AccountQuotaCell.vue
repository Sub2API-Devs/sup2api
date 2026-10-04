<script setup lang="ts">
// Plan windows of a subscription account in the accounts list: one bar per
// window (5h / 7d / 7d Sonnet / 7d Fable / unknown keys verbatim) with the
// percentage and the time to reset, coloured by usage; a rejected window is
// flagged. The snapshot comes from the list row — this cell never fetches;
// "refresh" is emitted and the page applies the 30 s floor.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SIcon, SLink } from '@sub2api/ui'
import type { QuotaSnapshot } from '@/api/types'
import { formatDateTime, formatRelative } from '@/utils/format'
import { formatPercent, isKnownWindow, quotaCountdown, quotaLevel, sortWindows, useQuotaClock, type QuotaLevel } from './accountQuota'

const props = withDefaults(defineProps<{ quota: QuotaSnapshot; refreshing?: boolean; refreshable?: boolean }>(), {
  refreshing: false,
  refreshable: true
})
const emit = defineEmits<{ (e: 'refresh'): void }>()
const { t } = useI18n()
const clock = useQuotaClock()

const BAR: Record<QuotaLevel, string> = { ok: 'bg-success-500', warning: 'bg-warning-500', danger: 'bg-danger-500' }
const TEXT: Record<QuotaLevel, string> = {
  ok: 'text-fg-muted',
  warning: 'text-warning-600 dark:text-warning-400',
  danger: 'text-danger-600 dark:text-danger-400'
}
const CHIP: Record<QuotaLevel, string> = {
  ok: 'bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-dark-300',
  warning: 'bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-dark-300',
  danger: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
}

const rows = computed(() =>
  sortWindows(props.quota.windows).map((w) => {
    const level = quotaLevel(w)
    const known = isKnownWindow(w.key)
    const name = known ? t(`accounts.quota.windows.${w.key}`) : w.key
    const cd = quotaCountdown(w.resets_at, w.utilization, clock.value)
    const reset = cd.kind === 'in' ? cd.text : cd.kind === 'pending' ? t('accounts.quota.resetPending') : cd.kind === 'now' ? t('accounts.quota.resetNow') : ''
    const percent = formatPercent(w.utilization)
    const title = [
      `${name} ${percent}`,
      w.resets_at ? t('accounts.quota.resetsAt', { time: formatDateTime(w.resets_at) }) : '',
      w.status === 'rejected' ? t('accounts.quota.rejectedHint') : w.status === 'allowed_warning' ? t('accounts.quota.warningHint') : ''
    ]
      .filter(Boolean)
      .join(' · ')
    return {
      key: w.key,
      short: known ? t(`accounts.quota.windowsShort.${w.key}`) : w.key,
      name,
      title,
      percent,
      width: `${Math.min(100, Math.max(0, Number.isFinite(w.utilization) ? w.utilization : 0))}%`,
      now: Math.round(Math.max(0, w.utilization || 0)),
      rejected: w.status === 'rejected',
      reset,
      level
    }
  })
)

const updated = computed(() => {
  void clock.value // re-evaluate the relative time with the shared clock
  return props.quota.updated_at ? formatRelative(props.quota.updated_at, t) : ''
})
</script>

<template>
  <div class="min-w-44 space-y-1 text-xxs" data-testid="quota-cell">
    <p v-if="quota.error" class="max-w-[14rem] truncate text-warning-600 dark:text-warning-400" :title="quota.error" data-testid="quota-error">
      <SIcon name="warning" class="mr-0.5 inline h-3 w-3 align-[-2px]" />{{ quota.error }}
    </p>
    <div v-for="r in rows" :key="r.key" class="flex items-center gap-1.5" :title="r.title" :data-testid="`quota-window-${r.key}`" :data-level="r.level">
      <span class="w-9 shrink-0 truncate rounded-chip px-1 text-center font-medium" :class="CHIP[r.level]">{{ r.short }}</span>
      <div
        class="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-700"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="r.now"
        :aria-label="r.name"
      >
        <div class="h-full rounded-full transition-all duration-300" :class="BAR[r.level]" :style="{ width: r.width }" />
      </div>
      <span class="w-9 shrink-0 text-right font-medium tabular-nums" :class="TEXT[r.level]">{{ r.percent }}</span>
      <SBadge v-if="r.rejected" tone="danger" class="!px-1.5 !py-0 !text-xxs" data-testid="quota-rejected">{{ t('accounts.quota.rejected') }}</SBadge>
      <span v-if="r.reset" class="shrink-0 whitespace-nowrap tabular-nums text-fg-subtle">{{ r.reset }}</span>
    </div>
    <p v-if="!rows.length && !quota.error" class="text-fg-subtle" data-testid="quota-empty">{{ t('accounts.quota.noData') }}</p>
    <div class="flex items-center gap-1.5 text-fg-subtle">
      <span v-if="quota.source === 'passive'" class="italic" :title="t('accounts.quota.passiveHint')">{{ t('accounts.quota.passive') }}</span>
      <span v-if="updated" class="whitespace-nowrap" :title="formatDateTime(quota.updated_at)">{{ updated }}</span>
      <SLink
        v-if="refreshable"
        as="button"
        class="inline-flex items-center gap-0.5 whitespace-nowrap"
        :disabled="refreshing"
        :title="t('accounts.quota.refreshHint')"
        data-testid="quota-refresh"
        @click="emit('refresh')"
      >
        <SIcon name="refresh" class="h-3 w-3" :class="refreshing ? 'animate-spin' : ''" />{{ refreshing ? t('accounts.quota.refreshing') : t('accounts.quota.refresh') }}
      </SLink>
    </div>
  </div>
</template>
