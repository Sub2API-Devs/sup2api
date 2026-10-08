<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatNumber } from '@/utils/format'
import type { UsageRow } from './usage'

const props = defineProps<{ row: UsageRow }>()
const { t } = useI18n()
const cacheWrite = computed(() => (props.row.cache_creation_tokens || 0) + (props.row.cache_creation_1h_tokens || 0))
</script>

<template>
  <div
    v-if="!row.success && !row.input_tokens && !row.output_tokens && !row.cache_read_tokens && !cacheWrite"
    class="text-gray-400"
  >
    —
  </div>
  <div
    v-else
    class="space-y-1 text-xs tabular-nums"
    :title="t('usage.cacheTitle', { r: formatNumber(row.cache_read_tokens), w: formatNumber(cacheWrite) })"
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
      v-if="row.cache_read_tokens || cacheWrite"
      class="flex items-center justify-between gap-4 text-primary-600 dark:text-primary-400"
    >
      <span>{{ t('usage.cached') }}</span
      ><span>{{ formatNumber((row.cache_read_tokens || 0) + cacheWrite) }}</span>
    </div>
  </div>
</template>
