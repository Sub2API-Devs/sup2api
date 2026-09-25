<script setup lang="ts">
import { categoryLabel } from './host'

defineProps<{ categories?: string[] | null; wrap?: boolean }>()
</script>

<template>
  <span v-if="categories && categories.length" class="mod-chips" :class="wrap ? 'mod-chips-wrap' : ''">
    <span v-for="c in categories" :key="c" class="mod-chip" :title="c">{{ categoryLabel(c) }}</span>
  </span>
  <span v-else class="muted">—</span>
</template>
