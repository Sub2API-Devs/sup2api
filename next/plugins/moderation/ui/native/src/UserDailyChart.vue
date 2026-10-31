<script setup lang="ts">
import { computed } from 'vue'
import { SChart } from '@sub2api/ui'
import { lineChart } from './charts'
import { num } from './format'
import { useModHost } from './host'
import type { UserDay } from './types'

// A user's last 30 UTC days (user_daily, summed over groups): audited,
// suspicious and high-severity records, and failed checks.
const props = defineProps<{ daily: UserDay[] }>()
const t = useModHost().t

const DAYS = 30
const SERIES = ['audited', 'suspicious', 'high', 'errors'] as const

const chart = computed(() => {
  const days = Array.from({ length: DAYS }, (_, i) => new Date(Date.now() - (DAYS - 1 - i) * 86400_000).toISOString().slice(0, 10))
  const total = (day: string, key: (typeof SERIES)[number]) => props.daily.reduce((s, d) => (d.day === day ? s + d[key] : s), 0)
  return lineChart(
    days.map((d) => d.slice(5)),
    SERIES.map((key) => ({ name: t(`userDaily.${key}`), data: days.map((day) => total(day, key)) })),
    num
  )
})
</script>

<template>
  <SChart :option="chart" height="200px" />
</template>
