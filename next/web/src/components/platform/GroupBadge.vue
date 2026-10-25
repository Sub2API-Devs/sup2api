<script setup lang="ts">
import { computed } from 'vue'
import PlatformIcon from './PlatformIcon.vue'
import { platformTheme } from './platformTheme'

// A group as a chip in the colours of its platform (several platforms: the
// composite theme): the platforms' marks, the name and the rate multiplier.
const props = defineProps<{ name: string; platforms?: readonly string[] | null; rate?: string | number | null }>()
const theme = computed(() => platformTheme(props.platforms))
const rate = computed(() => (props.rate === undefined || props.rate === null || props.rate === '' ? '' : `${Number(props.rate)}x`))
</script>

<template>
  <span class="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium" :class="theme.badge" data-testid="group-badge">
    <span v-if="platforms?.length" class="inline-flex shrink-0 items-center gap-0.5">
      <PlatformIcon v-for="p in platforms" :key="p" :id="p" />
    </span>
    <span class="truncate" :title="name">{{ name }}</span>
    <span v-if="rate" class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold" :class="theme.label">{{ rate }}</span>
  </span>
</template>
