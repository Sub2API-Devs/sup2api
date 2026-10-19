<script setup lang="ts">
// Plan windows of a subscription account in the accounts list: one bar per
// window (5h / 7d / 7d Sonnet / 7d Fable / unknown keys verbatim) with the
// percentage and the time to reset, coloured by usage; a rejected window is
// flagged. The snapshot comes from the list row — this cell never fetches;
// clicking the cell emits "refresh"; the page coalesces in-flight requests.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SIcon } from '@sub2api/ui'
import type { QuotaSnapshot } from '@/api/types'
import { formatDateTime, formatRelative } from '@/utils/format'
import { lt } from '@/i18n'
import { formatPercent, quotaCountdown, quotaLevel, sortWindows, useQuotaClock, type QuotaLevel } from './accountQuota'

const props = withDefaults(defineProps<{ quota: QuotaSnapshot; refreshing?: boolean; refreshable?: boolean }>(), {
  refreshing: false,
  refreshable: true
})
const emit = defineEmits<{ (e: 'refresh'): void }>()
const { t } = useI18n()
const clock = useQuotaClock()

function refresh(event: Event) {
  if (!props.refreshable) return
  event.stopPropagation()
  if (!props.refreshing) emit('refresh')
}

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
  sortWindows(props.quota.windows).map(w => {
    const utilization = w.utilization_unknown ? Number.NaN : w.utilization
    const known = Number.isFinite(utilization)
    const level = quotaLevel({ utilization, status: w.status })
    const name = lt(w.label) || w.key
    const cd = quotaCountdown(w.resets_at, clock.value, w.expired)
    const reset = cd.kind === 'in' ? cd.text : cd.kind === 'pending' ? t('accounts.quota.resetPending') : ''
    const percent = formatPercent(utilization)
    const title = [
      `${name} ${percent}`,
      w.resets_at ? t('accounts.quota.resetsAt', { time: formatDateTime(w.resets_at) }) : '',
      cd.kind === 'pending' ? reset : '',
      w.status === 'rejected' ? t('accounts.quota.rejectedHint') : w.status === 'allowed_warning' ? t('accounts.quota.warningHint') : ''
    ]
      .filter(Boolean)
      .join(' · ')
    return {
      key: w.key,
      short: lt(w.short_label) || w.key,
      name,
      title,
      percent,
      unknown: !known,
      width: known ? `${Math.min(100, Math.max(0, utilization))}%` : undefined,
      now: known ? Math.round(Math.max(0, utilization)) : undefined,
      rejected: w.status === 'rejected',
      reset,
      level
    }
  })
)

// Refreshable token expiry does not block account use. Keep it silent in
// the list and retain the last observed usage until the next successful query.
const recoverableTokenExpiry = computed(() => props.quota.error?.startsWith('transient: token_expired:') === true)
const queryError = computed(() =>
  recoverableTokenExpiry.value
    ? ''
    : props.quota.error
      ? t('accounts.quota.queryFailedDetail', { error: props.quota.error })
      : props.quota.refresh_status === 'error'
        ? t('accounts.quota.queryFailed')
        : ''
)
const pending = computed(() => {
  if (recoverableTokenExpiry.value) return ''
  if (!rows.value.length && !props.quota.updated_at && props.quota.refresh_status !== 'ready' && !queryError.value) {
    return t('accounts.quota.initialPending')
  }
  return props.quota.refresh_status === 'pending' ? t('accounts.quota.queryPending') : ''
})

const updated = computed(() => {
  void clock.value // re-evaluate the relative time with the shared clock
  return props.quota.updated_at ? formatRelative(props.quota.updated_at, t) : ''
})
</script>

<template>
  <component
    :is="refreshable ? 'button' : 'div'"
    :type="refreshable ? 'button' : undefined"
    :disabled="refreshable && refreshing ? true : undefined"
    :aria-busy="refreshing || undefined"
    :aria-description="refreshable ? t('accounts.quota.refreshHint') : undefined"
    :title="refreshable ? t('accounts.quota.refreshHint') : undefined"
    class="block min-w-44 space-y-1 rounded-md text-left text-xxs"
    :class="refreshable ? 'cursor-pointer transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:cursor-wait disabled:opacity-60' : ''"
    data-testid="quota-cell"
    @click="refresh"
  >
    <p
      v-if="queryError"
      class="max-w-[14rem] truncate text-warning-600 dark:text-warning-400"
      :title="queryError"
      data-testid="quota-error"
    >
      <SIcon name="warning" class="mr-0.5 inline h-3 w-3 align-[-2px]" />{{ queryError }}
    </p>
    <p
      v-if="pending"
      class="text-fg-subtle"
      data-testid="quota-pending"
    >
      {{ pending }}
    </p>
    <div class="space-y-1">
      <div
        v-for="r in rows"
        :key="r.key"
        class="flex items-center gap-1.5"
        :title="r.title"
        :data-testid="`quota-window-${r.key}`"
        :data-level="r.level"
      >
        <span class="w-14 shrink-0 truncate rounded-chip px-1 text-center font-medium" :class="CHIP[r.level]">{{ r.short }}</span>
        <div
          class="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-700"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="r.now"
          :aria-valuetext="r.unknown ? t('common.unknown') : undefined"
          :aria-label="r.name"
        >
          <div
            v-if="!r.unknown"
            class="h-full rounded-full transition-all duration-300"
            :class="BAR[r.level]"
            :style="{ width: r.width }"
          />
        </div>
        <span class="w-9 shrink-0 text-right font-medium tabular-nums" :class="TEXT[r.level]">{{ r.percent }}</span>
        <SBadge v-if="r.rejected" tone="danger" size="xs" data-testid="quota-rejected">{{
          t('accounts.quota.rejected')
        }}</SBadge>
        <span v-if="r.reset" class="shrink-0 whitespace-nowrap tabular-nums text-fg-subtle">{{ r.reset }}</span>
      </div>
    </div>
    <p
      v-if="!rows.length && !queryError && !pending"
      class="text-fg-subtle"
      data-testid="quota-empty"
    >
      {{ t('accounts.quota.noData') }}
    </p>
    <div class="flex items-center gap-1.5 text-fg-subtle">
      <span v-if="quota.source === 'passive'" class="italic" :title="t('accounts.quota.passiveHint')">{{
        t('accounts.quota.passive')
      }}</span>
      <span
        v-if="updated"
        class="whitespace-nowrap"
        :title="formatDateTime(quota.updated_at)"
        data-testid="quota-observed"
      >{{ t('accounts.quota.lastObserved', { time: updated }) }}</span>
      <span v-if="refreshing" class="inline-flex items-center gap-0.5 whitespace-nowrap" role="status">
        <SIcon name="refresh" class="h-3 w-3 animate-spin" />{{ t('accounts.quota.refreshing') }}
      </span>
    </div>
  </component>
</template>
