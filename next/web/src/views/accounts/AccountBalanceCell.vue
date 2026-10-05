<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SHint, SLink } from '@sub2api/ui'
import type { AccountBalance } from '@/api/types'
import { formatBalance, formatRelative } from '@/utils/format'

const { t } = useI18n()

const props = defineProps<{
  balance: AccountBalance | null | undefined
  refreshing?: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const hasError = computed(() => !!props.balance?.error)
const tone = computed(() => (hasError.value ? 'danger' : 'gray'))
</script>

<template>
  <div v-if="balance" class="min-w-28 space-y-1 text-xs">
    <div class="flex items-center justify-between gap-2">
      <span class="text-gray-400">{{ t('accounts.balance.label') }}</span>
      <SBadge v-if="hasError" :tone="tone" size="xs">{{ t('accounts.balance.error', { error: balance.error }) }}</SBadge>
      <span v-else class="font-mono font-semibold tabular-nums">{{ formatBalance(balance.amount, balance.currency) }}</span>
    </div>
    <div class="flex items-center justify-between gap-2 text-[11px] text-gray-500">
      <span>{{ t('accounts.balance.updatedAt', { time: formatRelative(balance.updated_at, t) }) }}</span>
      <SLink
        as="button"
        :disabled="refreshing"
        :title="t('accounts.balance.refreshHint')"
        @click="emit('refresh')"
      >
        {{ refreshing ? t('accounts.balance.refreshing') : t('accounts.balance.refresh') }}
      </SLink>
    </div>
  </div>
  <SHint v-else inline>—</SHint>
</template>
