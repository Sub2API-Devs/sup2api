<script setup lang="ts">
// The detail's "Call chain": every attempt of a request sent upstream more
// than once, in order (CONTRACTS §98), the accounts by ID and name (the caller's
// own records, `mine`, have none). Open by default; nothing for a request sent
// once. A row from before the trail existed has only the count, and says so.
// The accounts passed over without being tried are in the scheduling trace.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SCard, SDisclosure, SHint } from '@sub2api/ui'
import UsageAttemptSteps from './UsageAttemptSteps.vue'
import { attemptTrail, retryCount, type UsageRow } from './usage'

const props = defineProps<{ row: UsageRow; mine?: boolean }>()
const { t } = useI18n()
const trail = computed(() => attemptTrail(props.row))
const retries = computed(() => retryCount(props.row))
</script>

<template>
  <SCard v-if="retries" variant="flat" data-testid="usage-attempts">
    <SDisclosure variant="section" :label="t('usage.attempts.title')" default-open>
      <template #actions>
        <SBadge size="xs" tone="warning">{{ t('usage.attempts.retried', { n: retries }, retries) }}</SBadge>
      </template>
      <UsageAttemptSteps v-if="trail" :trail="trail" layout="flow" :accounts="!mine" />
      <SHint v-else size="xs" data-testid="attempt-legacy">{{ t('usage.attempts.legacy') }}</SHint>
      <SHint size="xs" class="mt-2">{{ mine ? t('usage.attempts.mineHint') : t('usage.attempts.hint') }}</SHint>
    </SDisclosure>
  </SCard>
</template>
