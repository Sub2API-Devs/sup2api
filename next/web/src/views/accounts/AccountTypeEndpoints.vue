<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SBadge } from '@sub2api/ui'
import type { AccountTypeEndpoint } from '@/api/types'

// Endpoints an account type can currently serve; converted ones are marked.
defineProps<{ endpoints: AccountTypeEndpoint[]; compact?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <ul v-if="endpoints.length" class="space-y-0.5">
    <li v-for="e in endpoints" :key="`${e.method} ${e.path}`" class="flex flex-wrap items-center gap-1.5 text-xs">
      <code class="font-mono text-gray-700 dark:text-gray-200">{{ e.method }} {{ e.path }}</code>
      <span v-if="!compact" class="muted font-mono text-[11px]">{{ e.protocol }}</span>
      <SBadge v-if="!e.native" tone="warning" :title="t('accounts.convertedHint', { protocol: e.protocol })">{{ t('accounts.converted') }}</SBadge>
    </li>
  </ul>
  <p v-else class="text-xs text-amber-600 dark:text-amber-400">{{ t('accounts.noEndpoints') }}</p>
</template>
