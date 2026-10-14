<script setup lang="ts">
// Loading placeholder. `lines` > 1 renders that many text bars (the last
// one shorter); otherwise one block of `width` × `height` (CSS sizes, default
// 100% × 1rem); `circle` makes it round (avatars). Hidden from assistive
// technology — announce loading elsewhere (aria-busy, SSpinner).
withDefaults(defineProps<{ lines?: number; width?: string; height?: string; circle?: boolean }>(), { lines: 1, width: '100%', height: '1rem' })
</script>

<template>
  <div v-if="lines > 1" class="space-y-2" aria-hidden="true">
    <div v-for="i in lines" :key="i" class="animate-pulse rounded bg-gray-200 dark:bg-dark-700" :style="{ height, width: i === lines ? '60%' : width }" />
  </div>
  <div v-else class="animate-pulse bg-gray-200 dark:bg-dark-700" :class="circle ? 'rounded-full' : 'rounded'" :style="{ width: circle ? height : width, height }" aria-hidden="true" />
</template>
