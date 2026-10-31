<script setup lang="ts">
import { computed } from 'vue'
import { SGrid, SStatCard } from '@sub2api/ui'
import { useModHost } from '../host'
import { useOverviewData } from './useOverview'
import { useFormat } from './format'

// Today's KPIs: audited, suspicious, watching (with new records), blocking
// and pre-rejections. Watch list counts are live, the rest hourly statistics.
const ov = useOverviewData()
const t = useModHost().t
const { n } = useFormat()

const s = computed(() => ov.status.data.value)
const first = computed(() => ov.status.loading.value && !s.value)
const cards = computed(() => [
  { key: 'audited', icon: 'eyeglass', tone: 'primary' as const, value: s.value?.today.audited, sub: t('overviewP3.kpi.auditedSub') },
  { key: 'suspicious', icon: 'warning', tone: 'warning' as const, value: s.value?.today.suspicious, sub: t('overviewP3.kpi.suspiciousSub') },
  { key: 'watching', icon: 'eye', tone: 'info' as const, value: s.value?.watch.watching, sub: t('overviewP3.kpi.watchingSub', { n: n(s.value?.watch.watching_with_new) }) },
  { key: 'blocking', icon: 'shield', tone: 'danger' as const, value: s.value?.watch.blocking, sub: t('overviewP3.kpi.blockingSub') },
  { key: 'blocked', icon: 'x', tone: 'danger' as const, value: s.value?.today.blocked, sub: t('overviewP3.kpi.blockedSub') }
])
</script>

<template>
  <SGrid template="repeat(auto-fit, minmax(180px, 1fr))">
    <SStatCard v-for="c in cards" :key="c.key" :label="t(`overviewP3.kpi.${c.key}`)" :value="n(c.value)" :sub="c.sub" :icon="c.icon" :tone="c.tone" :loading="first" compact />
  </SGrid>
</template>
