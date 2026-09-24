<script setup lang="ts">
import SIcon from './SIcon.vue'

withDefaults(
  defineProps<{
    label: string
    value: string | number
    sub?: string
    icon?: string
    tone?: 'primary' | 'success' | 'warning' | 'danger'
    trend?: number | null
    loading?: boolean
  }>(),
  { tone: 'primary' }
)
</script>

<template>
  <div class="stat-card">
    <div v-if="icon" class="stat-icon" :class="`stat-icon-${tone}`">
      <SIcon :name="icon" class="h-6 w-6" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="stat-label">{{ label }}</p>
      <p class="stat-value">
        <span v-if="loading" class="inline-block h-7 w-20 animate-pulse rounded bg-gray-200 dark:bg-dark-700" />
        <template v-else>{{ value }}</template>
      </p>
      <p v-if="trend !== undefined && trend !== null" class="stat-trend" :class="trend >= 0 ? 'stat-trend-up' : 'stat-trend-down'">
        {{ trend >= 0 ? '▲' : '▼' }} {{ Math.abs(trend).toFixed(1) }}%
      </p>
      <p v-if="sub" class="mt-1 truncate text-xs text-gray-500 dark:text-dark-400">{{ sub }}</p>
      <slot />
    </div>
  </div>
</template>
