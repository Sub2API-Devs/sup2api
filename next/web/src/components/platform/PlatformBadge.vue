<script setup lang="ts">
import { computed } from 'vue'
import type { LText } from '@/api/types'
import { usePlatforms } from '@/composables/platforms'
import ProblemIcon from '@/components/ProblemIcon.vue'
import BrandMark from './BrandMark.vue'
import { brandVars, platformBrand } from './brands'

// A platform as a chip in its vendor's colour: the mark and the label
// (`label` is the payload's, for a platform the list does not have).
// `unavailable` says why the platform cannot be used now: the chip is then
// grey and struck through, with the reason behind a warning icon.
const props = defineProps<{ id: string; label?: LText | null; unavailable?: string }>()
const platforms = usePlatforms()
platforms.load()
const brand = computed(() => platformBrand(props.id))
const name = computed(() => platforms.label(props.id, props.label))
</script>

<template>
  <span
    class="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium"
    :class="unavailable ? 'bg-surface-2 text-fg-muted' : 'brand-tint'"
    :style="unavailable ? undefined : brandVars(brand)"
    data-testid="platform-badge"
    :data-platform="id"
  >
    <BrandMark v-if="!unavailable" :brand="brand" :label="name" decorative />
    <span :class="unavailable ? 'line-through' : ''">{{ name }}</span>
    <ProblemIcon v-if="unavailable" :text="unavailable" />
  </span>
</template>
