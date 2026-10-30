<script setup lang="ts">
import { computed } from 'vue'
import { overAlert, pct } from './format'

// A 0–1 rate as a percentage; error rates above the alert threshold (or
// flagged by the backend) are red.
const props = defineProps<{ rate: number; alertPercent?: number; flagged?: boolean }>()
const alarm = computed(() => props.alertPercent !== undefined && overAlert(props.rate, props.alertPercent, props.flagged))
</script>

<template>
  <span class="mod-num" :class="alarm ? 'mod-text-danger mod-strong' : ''">{{ pct(rate) }}</span>
</template>
