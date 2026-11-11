<script setup lang="ts">
// Concurrency, RPM, TPM and sessions of an account in one list cell (like the
// RPM / TPM / SPM column of new-api's channel table, one colour per figure):
// each figure is "used/cap", or only the usage when there is no cap, with the
// used share as the pill's fill; sessions counted over a window other than
// 1 minute add it in small type ("3/20·5m"). The totals are the account's own; hovering
// (or focusing) the cell shows them by client model, live (CONTRACTS §68.7),
// then the caps by model list when there are any (§68, §71).
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { STooltip } from '@sub2api/ui'
import type { Account } from '@/api/types'
import { formatCompact } from '@/utils/format'
import { FIGURE_COLOR, figureTone, hasLimits, limitRows, usedShare, type LimitFigure } from './accountLimits'
import { LEVEL_TEXT } from './usageLevel'
import { formatWindow, SPM_WINDOW_DEFAULT } from './spmWindow'
import AccountLimitsTable from './AccountLimitsTable.vue'
import AccountModelRates from './AccountModelRates.vue'

const props = defineProps<{ account: Account }>()
const { t } = useI18n()
const rows = computed(() => limitRows(props.account))
const total = computed(() => rows.value[0].figures)
const lists = computed(() => rows.value.length - 1)

const text = (f: LimitFigure) => (f.limit > 0 ? `${formatCompact(f.used)}/${formatCompact(f.limit)}` : formatCompact(f.used))
const windowText = (f: LimitFigure) => (f.window && f.window !== SPM_WINDOW_DEFAULT ? `·${formatWindow(t, f.window)}` : '')
// Each figure keeps its own hue (FIGURE_COLOR); from 80 % of its cap the
// text and fill take the level's colour and a ring marks the pill.
const NEAR_CAP = {
  warning: { fill: 'bg-warning-500/30', ring: 'ring-1 ring-inset ring-warning-500/60' },
  danger: { fill: 'bg-danger-500/30', ring: 'ring-1 ring-inset ring-danger-500/60' }
} as const
const nearCap = (f: LimitFigure) => {
  const tone = figureTone(f)
  return tone === 'warning' || tone === 'danger' ? tone : null
}
const pillClass = (f: LimitFigure) => {
  const color = FIGURE_COLOR[f.key]
  const level = nearCap(f)
  if (level) return [color.bg, LEVEL_TEXT[level], NEAR_CAP[level].ring]
  return [color.bg, color.fg, f.used || f.limit ? '' : 'opacity-60']
}
const fillClass = (f: LimitFigure) => {
  const level = nearCap(f)
  return level ? NEAR_CAP[level].fill : FIGURE_COLOR[f.key].fill
}
</script>

<template>
  <STooltip variant="card" placement="bottom" :delay="150" max-width="36rem">
    <span class="inline-flex items-center gap-1 whitespace-nowrap rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40" tabindex="0" data-testid="account-limits">
      <span
        v-for="f in total"
        :key="f.key"
        class="relative inline-flex h-5 min-w-7 items-center justify-center overflow-hidden rounded-full px-2 text-xxs tabular-nums"
        :class="pillClass(f)"
        :data-limit="f.key"
      >
        <span v-if="f.limit > 0" class="absolute inset-y-0 left-0" :class="fillClass(f)" :style="{ width: `${usedShare(f) * 100}%` }" aria-hidden="true" />
        <span class="relative">{{ text(f) }}<span v-if="windowText(f)" class="text-[9px] opacity-75" data-testid="account-limit-window">{{ windowText(f) }}</span></span>
      </span>
      <span v-if="account.waiting" class="text-xxs text-warning-600" data-testid="account-limit-waiting">{{ t('accounts.limitsUi.waiting', { n: account.waiting }) }}</span>
      <span v-if="lists" class="text-xxs text-fg-subtle" data-testid="account-limit-lists">{{ t('accounts.limitsUi.lists', { n: lists }) }}</span>
    </span>
    <template #content>
      <div class="mb-2 font-semibold">{{ t('accounts.limitsUi.title') }}</div>
      <AccountModelRates :account-id="account.id" />
      <template v-if="hasLimits(account)">
        <div class="mb-1 mt-3 font-semibold">{{ t('accounts.limitsUi.capsTitle') }}</div>
        <AccountLimitsTable :account="account" />
      </template>
      <p v-else class="mt-2 text-xxs leading-4 text-fg-muted">{{ t('accounts.limitsUi.windowHint') }}</p>
    </template>
  </STooltip>
</template>
