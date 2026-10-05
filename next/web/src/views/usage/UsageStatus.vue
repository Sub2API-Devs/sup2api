<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SBadge } from '@sub2api/ui'
import { blockingHook, isBlocked, type UsageRow } from './usage'

defineProps<{ row: UsageRow }>()
const { t, te } = useI18n()
function errorLabel(row: UsageRow) {
  const key = `usage.errors.${row.error_type}`
  return te(key) ? t(key) : row.error_type || String(row.status_code || t('usage.success.failed'))
}
</script>

<template>
  <div class="space-y-1">
    <div class="flex flex-wrap items-center gap-1.5">
      <SBadge :tone="row.success ? 'success' : isBlocked(row) ? 'warning' : 'danger'">
        {{ row.success ? t('usage.success.ok') : isBlocked(row) ? t('usage.blocked') : t('usage.success.failed') }}
      </SBadge>
      <SBadge v-if="row.stream" tone="info">{{ t('usage.stream') }}</SBadge>
      <span v-if="row.status_code" class="text-xs tabular-nums text-gray-500">{{ row.status_code }}</span>
    </div>
    <p
      v-if="!row.success"
      class="max-w-[12rem] truncate text-xs text-red-600 dark:text-red-400"
      :title="[row.error_type, row.error_message, blockingHook(row)?.note].filter(Boolean).join(': ')"
    >
      {{ isBlocked(row) ? t('usage.blockedBy', { plugin: blockingHook(row)?.plugin_key || '—' }) : errorLabel(row) }}
    </p>
  </div>
</template>
