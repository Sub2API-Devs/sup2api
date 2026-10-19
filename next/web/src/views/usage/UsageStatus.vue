<script setup lang="ts">
// Outcome of a request: a success / failure / blocked pill with the HTTP status.
import { useI18n } from 'vue-i18n'
import { SBadge } from '@sub2api/ui'
import { isBlocked, type UsageRow } from './usage'

defineProps<{ row: UsageRow }>()
const { t } = useI18n()
</script>

<template>
  <span class="inline-flex items-center gap-1.5">
    <SBadge size="xs" dot :tone="row.success ? 'success' : isBlocked(row) ? 'warning' : 'danger'">
      {{ row.success ? t('usage.success.ok') : isBlocked(row) ? t('usage.blocked') : t('usage.success.failed') }}
    </SBadge>
    <span v-if="row.status_code" class="font-mono text-xxs tabular-nums text-fg-subtle">{{ row.status_code }}</span>
  </span>
</template>
