<script setup lang="ts">
import { computed } from 'vue'
import { brandVars, platformBrand } from './brands'

// A group as a chip: the name and the rate multiplier. One platform tints the
// chip in that vendor's colour; several leave it neutral; none greys it.
const props = defineProps<{ name: string; platforms?: readonly string[] | null; rate?: string | number | null }>()
const single = computed(() => (props.platforms?.length === 1 ? brandVars(platformBrand(props.platforms[0])) : undefined))
const tone = computed(() => {
  if (single.value) return 'brand-tint'
  return props.platforms?.length ? 'border border-line bg-surface text-fg' : 'bg-surface-2 text-fg-muted'
})
const rate = computed(() => (props.rate === undefined || props.rate === null || props.rate === '' ? '' : `${Number(props.rate)}x`))
</script>

<template>
  <span
    class="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
    :class="tone"
    :style="single"
    data-testid="group-badge"
  >
    <span class="truncate" :title="name">{{ name }}</span>
    <span v-if="rate" class="shrink-0 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-black/20">{{ rate }}</span>
  </span>
</template>
