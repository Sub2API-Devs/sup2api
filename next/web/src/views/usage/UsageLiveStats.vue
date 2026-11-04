<script setup lang="ts">
// The figures beside the usage list, as new-api's usage log page shows them.
// Usage, base quota and the cache hit rate follow the search; RPM, TPM and the
// success rate are the last minute's under the same filters, without the time
// range and the status (CONTRACTS §66.7). Loaded on a search or a refresh.
import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { formatTokens, hitRate, num } from '@/components/stats/stats'
import { formatMoney, formatNumber } from '@/utils/format'
import { useUsageSummary } from './useUsageSummary'

interface Realtime {
  rpm: number
  tpm: number
  recent_failures: number
}

const props = withDefaults(defineProps<{ realtimePath: string; summaryPath: string; filters: Record<string, unknown>; revision?: number }>(), { revision: 0 })
const { t } = useI18n()

const totals = useUsageSummary(props.summaryPath, props.filters, 'none')
const row = computed(() => totals.rows.value[0])

// A failed load shows dashes, never zeros (§66.3).
const live = ref<Realtime | null>(null)
const NOT_LIVE = ['from', 'to', 'success']
const liveFilters = computed(() => Object.fromEntries(Object.entries(props.filters).filter(([k]) => !NOT_LIVE.includes(k))) as Record<string, string>)
let seq = 0
async function loadLive() {
  const my = ++seq
  try {
    const r = await api.get<Realtime>(props.realtimePath, liveFilters.value)
    if (my === seq) live.value = r
  } catch {
    if (my === seq) live.value = null
  }
}
watch(() => JSON.stringify(liveFilters.value), loadLive, { immediate: true })
watch(toRef(props, 'revision'), () => {
  totals.reload()
  loadLive()
})

const rate = computed(() => {
  const v = live.value
  const all = v ? v.rpm + v.recent_failures : 0
  return all ? (num(v?.rpm) / all) * 100 : null
})
const rateAccent = computed(() => {
  if (rate.value == null) return 'bg-slate-400/70'
  if (rate.value >= 99) return 'bg-green-600/70'
  return rate.value >= 95 ? 'bg-amber-500/70' : 'bg-red-500/70'
})
const badges = computed(() => {
  const r = row.value
  const hit = hitRate(r)
  const v = live.value
  return [
    { key: 'cost', label: t('usage.live.cost'), value: r ? formatMoney(num(r.total_cost), 2) : '—', accent: 'bg-sky-500/70', title: t('usage.live.rangeHint') },
    { key: 'standard', label: t('usage.live.standard'), value: r ? formatMoney(num(r.standard_cost), 2) : '—', accent: 'bg-violet-500/70', title: t('usage.live.rangeHint') },
    { key: 'rpm', label: 'RPM', value: v ? formatNumber(v.rpm) : '—', accent: 'bg-rose-500/65', title: t('usage.live.rpmHint') },
    { key: 'tpm', label: 'TPM', value: v ? formatTokens(v.tpm) : '—', accent: 'bg-slate-400/70', title: t('usage.live.tpmHint') },
    { key: 'hit', label: t('usage.live.cacheHit'), value: hit == null ? '—' : `${(hit * 100).toFixed(1)}%`, accent: 'bg-emerald-500/70', title: t('usage.live.rangeHint') },
    {
      key: 'success',
      label: t('usage.live.successRate'),
      value: rate.value == null ? '—' : `${Number(rate.value.toFixed(1))}%`,
      accent: rateAccent.value,
      title: v && rate.value != null ? t('usage.live.successHint', { ok: v.rpm, fail: v.recent_failures }) : t('usage.live.noRequests')
    }
  ]
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-2" data-testid="usage-live-stats">
    <span
      v-for="b in badges"
      :key="b.key"
      class="inline-flex h-7 items-center gap-2 rounded-md border border-line bg-surface-2 px-2.5 text-xs shadow-sm"
      :title="b.title"
      :data-testid="`usage-live-${b.key}`"
    >
      <span class="h-3.5 w-0.5 rounded-full" :class="b.accent" />
      <span class="text-fg-muted">{{ b.label }}</span>
      <span class="font-mono font-semibold tabular-nums text-fg">{{ b.value }}</span>
    </span>
  </div>
</template>
