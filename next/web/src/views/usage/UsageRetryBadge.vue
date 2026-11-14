<script setup lang="ts">
// "2 retries" beside the outcome of a request sent upstream more than once
// (CONTRACTS §98), with its attempts in the hover card. Shown in every view,
// also where the account column is not: the caller's own records (`mine`)
// and operators without account:read.
import { useI18n } from 'vue-i18n'
import { SBadge, SIcon } from '@sub2api/ui'
import UsageAttemptCard from './UsageAttemptCard.vue'
import { retryCount, type UsageRow } from './usage'

defineProps<{ row: UsageRow; mine?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <UsageAttemptCard v-if="retryCount(row)" :row="row" :mine="mine" data-testid="usage-retry-badge">
    <SBadge size="xs" tone="warning">
      <SIcon name="refresh" class="h-3 w-3" />
      {{ t('usage.attempts.retriedShort', { n: retryCount(row) }, retryCount(row)) }}
    </SBadge>
  </UsageAttemptCard>
</template>
