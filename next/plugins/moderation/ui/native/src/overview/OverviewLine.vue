<script setup lang="ts">
import { computed } from 'vue'
import { SChart } from '@sub2api/ui'
import { lineOption, type LineSeries } from './chart'

// Line chart of the overview (latency, suspicious rate) on SChart.
const props = withDefaults(defineProps<{ labels: string[]; series: LineSeries[]; format: (v: number) => string; loading?: boolean; height?: string; floor?: number }>(), {
  height: '224px',
  floor: 1
})
const option = computed(() => lineOption(props.labels, props.series, props.format, props.floor))
</script>

<template>
  <SChart :option="option" :loading="loading" :height="height" />
</template>
