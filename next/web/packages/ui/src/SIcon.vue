<script setup lang="ts">
import { computed, normalizeClass, useAttrs } from 'vue'
import { iconPaths } from './icons'

// Outline icons (24x24, stroke 1.8). The name vocabulary lives in ./icons.ts.
// An unknown name renders the missing-icon placeholder and warns once on the
// console instead of drawing a blank square nobody can attribute.
// Size: h-4 w-4 unless the class sets a height / width / size. Decorative
// (aria-hidden) unless `label` names it (role="img").
const props = defineProps<{
  name: string
  /** Where the name came from, shown in the warning, e.g. `plugin "anthropic" menu "models"`. */
  context?: string
  /** Accessible name; without it the icon is hidden from assistive technology. */
  label?: string
}>()
const attrs = useAttrs()
const paths = computed(() => iconPaths(props.name, props.context))
const sized = computed(() => /(^|\s|:)(h|w|size)-/.test(normalizeClass(attrs.class)))
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    :class="sized ? '' : 'h-4 w-4'"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
  >
    <title v-if="label">{{ label }}</title>
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>
