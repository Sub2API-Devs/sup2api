<script setup lang="ts">
import { computed } from 'vue'
import { brandVars, type Brand } from './brands'

// A vendor's mark in its brand colour, or the first letter of `label` on a
// square of the stand-in colour for a vendor without one. `label` names the
// mark (accessible name and tooltip); `decorative` hides it from assistive
// technology where the same text already stands beside it.
const props = defineProps<{ brand: Brand; label: string; decorative?: boolean }>()
const vars = computed(() => brandVars(props.brand))
// By code point, so a label that starts with an emoji is not cut in half.
const initial = computed(() => (Array.from(props.label)[0] ?? '').toUpperCase())
const naming = computed(() => (props.decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': props.label }))
</script>

<template>
  <svg
    v-if="brand.mark"
    viewBox="0 0 24 24"
    fill-rule="evenodd"
    class="brand-fg h-3.5 w-3.5 shrink-0"
    :style="vars"
    v-bind="naming"
    :data-brand="brand.id"
  >
    <title v-if="!decorative">{{ label }}</title>
    <path v-for="(d, i) in brand.mark" :key="i" :d="d" fill="currentColor" />
  </svg>
  <span
    v-else
    class="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm text-[9px] font-bold leading-none text-white"
    :style="{ backgroundColor: brand.color }"
    v-bind="naming"
    :title="decorative ? undefined : label"
    :data-brand="brand.id"
    >{{ initial }}</span
  >
</template>
