<script setup lang="ts">
// Success rate of the last minute (CONTRACTS §73): a badge coloured by the
// 99 % / 95 % thresholds and the request count under it; hovering shows the
// counts and what is left out.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SHint, STooltip } from '@sub2api/ui'
import type { AccountOutcomes } from '@/api/types'
import { formatSuccessRate, successRate, successRateTone } from './accountOutcomes'

const props = defineProps<{ outcomes: AccountOutcomes | null | undefined }>()
const { t } = useI18n()
const rate = computed(() => successRate(props.outcomes))
const total = computed(() => (props.outcomes ? props.outcomes.success + props.outcomes.failed : 0))
</script>

<template>
  <SHint v-if="!outcomes" inline size="xs">—</SHint>
  <STooltip v-else variant="card" placement="bottom" :delay="150" max-width="22rem">
    <span class="inline-flex flex-col gap-0.5 whitespace-nowrap rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40" tabindex="0" data-testid="account-success-rate">
      <SBadge :tone="successRateTone(rate)" size="xs" class="self-start tabular-nums">{{ formatSuccessRate(rate) }}</SBadge>
      <span class="text-xxs tabular-nums text-fg-muted">{{ total ? t('accounts.successRate.requests', { success: outcomes.success, total }) : t('accounts.successRate.idle') }}</span>
    </span>
    <template #content>
      <div class="mb-2 font-semibold">{{ t('accounts.successRate.title') }}</div>
      <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-xs tabular-nums">
        <span class="text-fg-muted">{{ t('accounts.successRate.success') }}</span><span class="text-right">{{ outcomes.success }}</span>
        <span class="text-fg-muted">{{ t('accounts.successRate.failed') }}</span><span class="text-right" :class="outcomes.failed ? 'text-danger-600 dark:text-danger-400' : ''">{{ outcomes.failed }}</span>
      </div>
      <p class="mt-2 text-xxs leading-relaxed text-fg-muted">{{ t('accounts.successRate.hint') }}</p>
    </template>
  </STooltip>
</template>
