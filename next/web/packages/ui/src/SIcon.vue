<script setup lang="ts">
import { computed } from 'vue'
import { iconPaths } from './icons'

// Outline icons (24x24, stroke 1.8). The name vocabulary lives in ./icons.ts.
// An unknown name renders the missing-icon placeholder and warns once on the
// console instead of drawing a blank square nobody can attribute.
const props = defineProps<{
  name: string
  /** Where the name came from, shown in the warning, e.g. `plugin "anthropic" menu "models"`. */
  context?: string
}>()
const paths = computed(() => iconPaths(props.name, props.context))
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>
