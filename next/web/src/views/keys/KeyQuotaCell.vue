<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChip, SProgress, STooltip } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'
import { formatMoney } from '@/utils/format'
import { quotaOf, remainTone } from './keyLimits'

// A key's quota as remaining / limit over a bar of what is left, or an
// "unlimited" chip; the tooltip (hover or keyboard focus) says what the key
// used either way.
const props = defineProps<{ apiKey: ApiKey }>()
const { t } = useI18n()
const quota = computed(() => quotaOf(props.apiKey))
const used = computed(() => t('apikeys.quota.used', { n: formatMoney(quota.value.used, 2) }))
</script>

<template>
  <STooltip :content="used" class="text-xs tabular-nums" data-testid="key-quota">
    <span class="inline-flex rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40" tabindex="0">
      <div v-if="quota.limit > 0" class="inline-flex min-w-28 flex-col gap-0.5">
        <span class="whitespace-nowrap font-medium">
          <span :class="quota.exhausted ? 'text-red-600 dark:text-red-400' : 'text-fg'">{{ formatMoney(quota.remaining, 2) }}</span>
          <span class="font-normal text-fg-muted"> / {{ formatMoney(quota.limit, 2) }}</span>
        </span>
        <SProgress :value="quota.remaining" :max="quota.limit" :tone="remainTone(quota.remaining, quota.limit)" />
      </div>
      <SChip v-else size="xs">{{ t('apikeys.quota.unlimited') }}</SChip>
    </span>
  </STooltip>
</template>
