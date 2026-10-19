<script setup lang="ts">
// Why a request failed, in one line: the blocking hook, the translated error
// type, or the HTTP status; the full type, message and hook note on hover.
import { useI18n } from 'vue-i18n'
import { blockingHook, isBlocked, type UsageRow } from './usage'

defineProps<{ row: UsageRow }>()
const { t, te } = useI18n()
function errorLabel(row: UsageRow) {
  const key = `usage.errors.${row.error_type}`
  return te(key) ? t(key) : row.error_type || String(row.status_code || t('usage.success.failed'))
}
</script>

<template>
  <p
    class="truncate text-xs text-red-600 dark:text-red-400"
    :title="[row.error_type, row.error_message, blockingHook(row)?.note].filter(Boolean).join(': ')"
  >
    {{ isBlocked(row) ? t('usage.blockedBy', { plugin: blockingHook(row)?.plugin_key || '—' }) : errorLabel(row) }}
  </p>
</template>
