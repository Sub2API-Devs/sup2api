<script setup lang="ts">
// Latency of a request: first token (streams) and total, coloured by speed
// (usage.ts firstTokenTone / latencyTone), with a matching bar on the left,
// then the response mode and the output speed.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatNumber } from '@/utils/format'
import { firstTokenTone, latencyTone, tokensPerSecond, type SpeedTone, type UsageRow } from './usage'

const props = defineProps<{ row: UsageRow }>()
const { t } = useI18n()
const FILL: Record<SpeedTone, string> = { success: 'bg-emerald-500/80', warning: 'bg-amber-500/80', danger: 'bg-red-500/75' }
const TEXT: Record<SpeedTone, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400'
}
const first = computed(() => (props.row.stream && props.row.first_token_ms ? props.row.first_token_ms : 0))
const lines = computed(() => [
  ...(first.value ? [{ key: 'first', label: t('usage.request.firstToken'), ms: first.value, tone: firstTokenTone(first.value) }] : []),
  { key: 'total', label: t('usage.request.latency'), ms: props.row.latency_ms, tone: latencyTone(props.row) }
])
const seconds = (ms: number) => formatNumber(ms / 1000, 2) + ' s'
const speed = computed(() => {
  const v = tokensPerSecond(props.row)
  return v === null ? '' : `${Math.round(v)} t/s`
})
</script>

<template>
  <div class="space-y-1">
    <span v-if="!row.latency_ms" class="text-fg-subtle">—</span>
    <div v-else class="flex items-stretch gap-2">
      <span class="flex w-1 shrink-0 flex-col overflow-hidden rounded-full" aria-hidden="true">
        <span v-for="l in lines" :key="l.key" class="flex-1" :class="FILL[l.tone]" />
      </span>
      <div class="flex flex-col justify-center gap-0.5 text-xs leading-tight">
        <p v-for="l in lines" :key="l.key" class="flex items-baseline gap-1.5 whitespace-nowrap">
          <span class="text-fg-muted">{{ l.label }}</span>
          <span class="tabular-nums" :class="TEXT[l.tone]">{{ seconds(l.ms) }}</span>
        </p>
      </div>
    </div>
    <p class="whitespace-nowrap pl-3 text-xxs leading-tight text-fg-subtle">
      <span :class="row.stream ? 'font-medium text-sky-600 dark:text-sky-400' : ''">{{ row.stream ? t('usage.stream') : t('usage.nonStream') }}</span>
      <span v-if="speed" class="tabular-nums"> · {{ speed }}</span>
    </p>
  </div>
</template>
