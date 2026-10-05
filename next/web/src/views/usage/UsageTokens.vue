<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { formatNumber } from '@/utils/format'
import type { UsageRow } from './usage'

defineProps<{ row: UsageRow }>()
const { t } = useI18n()
</script>

<template>
  <div
    v-if="!row.success && !row.input_tokens && !row.output_tokens && !row.cache_read_tokens && !row.cache_creation_tokens"
    class="text-gray-400"
  >
    —
  </div>
  <div
    v-else
    class="space-y-1 text-xs tabular-nums"
    :title="t('usage.cacheTitle', { r: formatNumber(row.cache_read_tokens), w: formatNumber(row.cache_creation_tokens) })"
  >
    <div class="flex items-center justify-between gap-4">
      <span class="text-gray-500">{{ t('usage.cols.input') }}</span
      ><span>{{ formatNumber(row.input_tokens) }}</span>
    </div>
    <div class="flex items-center justify-between gap-4">
      <span class="text-gray-500">{{ t('usage.cols.output') }}</span
      ><span>{{ formatNumber(row.output_tokens) }}</span>
    </div>
    <div
      v-if="row.cache_read_tokens || row.cache_creation_tokens"
      class="flex items-center justify-between gap-4 text-primary-600 dark:text-primary-400"
    >
      <span>{{ t('usage.cached') }}</span
      ><span>{{ formatNumber((row.cache_read_tokens || 0) + (row.cache_creation_tokens || 0)) }}</span>
    </div>
  </div>
</template>
