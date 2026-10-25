<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { formatMoney, formatNumber } from '@/utils/format'
import type { KeyUsage } from './keyUsage'

// Cost and requests of an API key today and in total (no usage: $0.00).
defineProps<{ usage: KeyUsage }>()
const { t } = useI18n()
</script>

<template>
  <div class="space-y-0.5 text-xs tabular-nums" data-testid="key-usage">
    <div v-for="row in (['today', 'total'] as const)" :key="row" class="flex items-baseline gap-1.5">
      <span class="text-fg-muted">{{ t(`apikeys.usage.${row}`) }}</span>
      <span class="font-medium text-fg">{{ formatMoney(usage[row]?.total_cost ?? 0) }}</span>
      <span class="text-fg-muted">{{ t('apikeys.usage.requests', { n: formatNumber(usage[row]?.requests ?? 0) }) }}</span>
    </div>
  </div>
</template>
