<script setup lang="ts">
// STable's "failed to load" message: centred in place of the rows, or
// `inline` as the red notice bar above stale rows (the caller sets its
// padding); `retry` adds a Retry button. Internal to STable.
import SButton from '../SButton.vue'
import { useUiT } from '../i18n'

defineProps<{ text?: string; retry?: () => void; inline?: boolean }>()
const t = useUiT()
</script>

<template>
  <div v-if="inline" role="alert" class="flex items-center gap-3 bg-red-50 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
    {{ text || t('ui.loadFailed') }}
    <SButton v-if="retry" size="xs" variant="ghost" icon="refresh" @click="retry()">{{ t('ui.retry') }}</SButton>
  </div>
  <div v-else role="alert" class="flex flex-col items-center gap-3 text-sm text-red-600 dark:text-red-400">
    {{ text || t('ui.loadFailed') }}
    <SButton v-if="retry" size="sm" icon="refresh" @click="retry()">{{ t('ui.retry') }}</SButton>
  </div>
</template>
