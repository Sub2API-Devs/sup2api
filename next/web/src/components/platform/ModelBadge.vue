<script setup lang="ts">
import { computed } from 'vue'
import BrandMark from './BrandMark.vue'
import { brandVars, modelBrand } from './brands'

// A model name with its vendor's mark, tinted in the vendor's colour; `plain`
// keeps the mark and leaves the name as its surroundings colour it (dense
// lists, links). A name too long for its place is cut, the tooltip has it
// whole; a `title` of the caller's replaces that tooltip.
const props = defineProps<{ model: string; plain?: boolean }>()
const brand = computed(() => modelBrand(props.model))
const tint = computed(() => (props.plain ? undefined : brandVars(brand.value)))
</script>

<template>
  <span
    class="inline-flex min-w-0 max-w-full items-center gap-1 whitespace-nowrap font-mono text-xs"
    :class="plain ? '' : 'brand-tint rounded-md px-1.5 py-0.5'"
    :style="tint"
    :title="model"
    data-testid="model-badge"
  >
    <BrandMark :brand="brand" :label="model" decorative />
    <span class="truncate">{{ model }}</span>
  </span>
</template>
