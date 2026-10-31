<script setup lang="ts">
// Concurrency, RPM, TPM and sessions of an account in one list cell (like the
// RPM / TPM / SPM column of new-api's channel table): each figure is
// "used/cap", or only the usage when there is no cap, with the used share as
// the pill's fill. The totals are the account's own; hovering (or focusing)
// the cell shows the breakdown by model list (CONTRACTS §68, §71).
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { STooltip } from '@sub2api/ui'
import type { Account } from '@/api/types'
import { formatCompact } from '@/utils/format'
import { figureTone, limitRows, usedShare, type LimitFigure } from './accountLimits'
import { LEVEL_TEXT } from './usageLevel'
import AccountLimitsTable from './AccountLimitsTable.vue'

const props = defineProps<{ account: Account }>()
const { t } = useI18n()
const rows = computed(() => limitRows(props.account))
const total = computed(() => rows.value[0].figures)
const lists = computed(() => rows.value.length - 1)

const text = (f: LimitFigure) => (f.limit > 0 ? `${formatCompact(f.used)}/${formatCompact(f.limit)}` : formatCompact(f.used))
const FILL = { danger: 'bg-danger-500/25', warning: 'bg-warning-500/25', ok: 'bg-primary-500/20', none: '' } as const
const pillText = (f: LimitFigure) => {
  const tone = figureTone(f)
  return tone === 'none' ? (f.used ? 'text-fg' : 'text-fg-subtle') : LEVEL_TEXT[tone]
}
</script>

<template>
  <STooltip variant="card" placement="bottom" :delay="150" max-width="30rem">
    <span class="inline-flex items-center gap-1 whitespace-nowrap rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40" tabindex="0" data-testid="account-limits">
      <span
        v-for="f in total"
        :key="f.key"
        class="relative inline-flex h-5 min-w-7 items-center justify-center overflow-hidden rounded-full bg-surface-2 px-2 text-xxs tabular-nums"
        :class="pillText(f)"
        :data-limit="f.key"
      >
        <span v-if="f.limit > 0" class="absolute inset-y-0 left-0" :class="FILL[figureTone(f)]" :style="{ width: `${usedShare(f) * 100}%` }" aria-hidden="true" />
        <span class="relative">{{ text(f) }}</span>
      </span>
      <span v-if="lists" class="text-xxs text-fg-subtle" data-testid="account-limit-lists">{{ t('accounts.limitsUi.lists', { n: lists }) }}</span>
    </span>
    <template #content>
      <div class="mb-2 font-semibold">{{ t('accounts.limitsUi.title') }}</div>
      <AccountLimitsTable :account="account" />
    </template>
  </STooltip>
</template>
