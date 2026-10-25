<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SProgress } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'
import { formatMoney } from '@/utils/format'
import { quotaOf, usageTone } from './keyLimits'

// A key's quota as used / limit with a bar, or "unlimited" with what it used.
const props = defineProps<{ apiKey: ApiKey }>()
const { t } = useI18n()
const quota = computed(() => quotaOf(props.apiKey))
</script>

<template>
  <div class="min-w-28 text-xs tabular-nums" data-testid="key-quota">
    <template v-if="quota.limit > 0">
      <div class="flex items-baseline justify-between gap-2">
        <span :class="quota.exhausted ? 'font-medium text-red-600 dark:text-red-400' : 'text-fg'">{{ formatMoney(quota.used, 2) }}</span>
        <span class="text-fg-muted">/ {{ formatMoney(quota.limit, 2) }}</span>
      </div>
      <SProgress :value="quota.used" :max="quota.limit" :tone="usageTone(quota.used, quota.limit)" class="mt-0.5" />
    </template>
    <span v-else class="text-fg-muted">{{ t('apikeys.limits.none') }} · {{ t('apikeys.quota.used', { n: formatMoney(quota.used, 2) }) }}</span>
  </div>
</template>
