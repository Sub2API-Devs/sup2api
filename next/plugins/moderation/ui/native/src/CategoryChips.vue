<script setup lang="ts">
import { SHint } from '@sub2api/ui'
import { categoryLabel } from './host'

defineProps<{ categories?: string[] | null; wrap?: boolean }>()
</script>

<template>
  <span v-if="categories && categories.length" class="mod-chips" :class="wrap ? 'mod-chips-wrap' : ''">
    <span v-for="c in categories" :key="c" class="mod-chip" :title="c">{{ categoryLabel(c) }}</span>
  </span>
  <SHint v-else inline>—</SHint>
</template>
