<script setup lang="ts">
// "Last test" cell of the account list: latency (coloured) + relative time +
// success / failure; the title shows the model, the message and the time.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SSpinner } from '@sub2api/ui'
import type { AccountLastTest } from '@/api/types'
import { formatDateTime, formatRelative } from '@/utils/format'
import { LATENCY_CLASS, formatLatency, latencyLevel } from './accountTest'

const props = defineProps<{ last?: AccountLastTest | null; testing?: boolean }>()
const { t } = useI18n()

const title = computed(() => {
  const l = props.last
  if (!l) return ''
  return [`${t('accounts.lastTest.model')}: ${l.model || '—'}`, l.message ? `${t('accounts.message')}: ${l.message}` : '', formatDateTime(l.at)].filter(Boolean).join('\n')
})
</script>

<template>
  <div class="min-w-[6.5rem] text-xs" data-testid="account-last-test">
    <span v-if="testing" class="inline-flex items-center gap-1.5 text-gray-500"><SSpinner size="sm" />{{ t('accounts.lastTest.testing') }}</span>
    <div v-else-if="last" :title="title">
      <div class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="last.ok ? 'bg-emerald-500' : 'bg-red-500'" />
        <span v-if="last.ok" class="font-mono tabular-nums" :class="LATENCY_CLASS[latencyLevel(last.latency_ms)]">{{ formatLatency(last.latency_ms) }}</span>
        <span v-else class="font-medium text-red-600 dark:text-red-400">{{ t('accounts.lastTest.failed') }}</span>
      </div>
      <div class="mt-0.5 text-[11px] text-gray-400">{{ formatRelative(last.at, t) }}</div>
    </div>
    <span v-else class="text-gray-400">{{ t('accounts.lastTest.never') }}</span>
  </div>
</template>
