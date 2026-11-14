<script setup lang="ts">
// "Retry N" beside the outcome of a request sent upstream more than once
// (CONTRACTS §98); its attempts in a card on hover / focus / tap, without the
// accounts in the caller's own records (`mine`). A row from before the trail
// existed has only the count, and says so.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SIcon, STooltip } from '@sub2api/ui'
import UsageAttemptSteps from './UsageAttemptSteps.vue'
import { attemptTrail, retryCount, type UsageRow } from './usage'

const props = defineProps<{ row: UsageRow; mine?: boolean }>()
const { t } = useI18n()
const retries = computed(() => retryCount(props.row))
const trail = computed(() => attemptTrail(props.row))
</script>

<template>
  <STooltip v-if="retries" variant="card" placement="bottom" :delay="150" max-width="26rem">
    <span tabindex="0" class="inline-flex" :aria-label="t('usage.attempts.retried', { n: retries })" data-testid="usage-retry-badge">
      <SBadge size="xs" tone="warning">
        <SIcon name="refresh" class="h-3 w-3" />
        {{ t('usage.attempts.retriedShort', { n: retries }) }}
      </SBadge>
    </span>
    <template #content>
      <p class="mb-1.5 text-xs font-medium">{{ t('usage.attempts.title') }}</p>
      <UsageAttemptSteps v-if="trail" :trail="trail" :accounts="!mine" />
      <p v-else class="text-xs text-fg-muted" data-testid="attempt-legacy">{{ t('usage.attempts.legacy') }}</p>
    </template>
  </STooltip>
</template>
