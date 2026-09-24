<script setup lang="ts">
import type { Tone } from './types'
withDefaults(defineProps<{ tone?: Tone; dot?: boolean }>(), { tone: 'gray' })
</script>

<template>
  <span class="badge" :class="`badge-${tone}`">
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full bg-current" />
    <slot />
  </span>
</template>
