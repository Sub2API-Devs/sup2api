<script setup lang="ts">
import { computed } from 'vue'
import { usePlatforms } from '@/composables/platforms'
import { PLATFORM_MARKS } from './platformTheme'

// A platform's brand mark, or the first letter of its label for platforms
// without one; the label is the tooltip.
const props = defineProps<{ id: string }>()
const platforms = usePlatforms()
platforms.load()
const label = computed(() => platforms.label(props.id))
const mark = computed(() => PLATFORM_MARKS[props.id])
</script>

<template>
  <svg v-if="mark" :viewBox="mark.viewBox" fill="currentColor" class="h-3.5 w-3.5 shrink-0" role="img" :aria-label="label" :data-platform="id">
    <title>{{ label }}</title>
    <path :d="mark.d" />
  </svg>
  <span
    v-else
    class="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm bg-black/10 text-[9px] dark:bg-white/15 font-bold leading-none"
    role="img"
    :aria-label="label"
    :title="label"
    :data-platform="id"
  >{{ label.slice(0, 1).toUpperCase() }}</span>
</template>
