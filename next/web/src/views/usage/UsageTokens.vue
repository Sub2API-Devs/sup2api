<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatNumber } from '@/utils/format'
import type { UsageRow } from './usage'

// Input / output tokens on one line, cache reads (↓) and writes (↑) under it.
const props = defineProps<{ row: UsageRow }>()
const { t } = useI18n()
const cacheWrite = computed(() => (props.row.cache_creation_tokens || 0) + (props.row.cache_creation_1h_tokens || 0))
</script>

<template>
  <div
    v-if="!row.success && !row.input_tokens && !row.output_tokens && !row.cache_read_tokens && !cacheWrite"
    class="text-fg-subtle"
  >
    —
  </div>
  <div
    v-else
    class="space-y-0.5"
    :title="`${t('usage.cols.input')} ${formatNumber(row.input_tokens)} · ${t('usage.cols.output')} ${formatNumber(row.output_tokens)} · ${t('usage.cacheTitle', { r: formatNumber(row.cache_read_tokens), w: formatNumber(cacheWrite) })}`"
  >
    <p class="whitespace-nowrap font-mono text-xs font-medium tabular-nums">
      {{ formatNumber(row.input_tokens) }} <span class="text-fg-subtle">/</span> {{ formatNumber(row.output_tokens) }}
    </p>
    <p
      v-if="row.cache_read_tokens || cacheWrite"
      class="flex gap-1.5 whitespace-nowrap text-xxs tabular-nums text-fg-subtle"
    >
      <span v-if="row.cache_read_tokens">{{ t('usage.cached') }}↓ {{ formatNumber(row.cache_read_tokens) }}</span>
      <span v-if="cacheWrite">↑ {{ formatNumber(cacheWrite) }}</span>
    </p>
  </div>
</template>
