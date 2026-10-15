<script setup lang="ts">
import { SChip, SHint } from '@sub2api/ui'
import { categoryLabel } from './host'

defineProps<{ categories?: string[] | null; wrap?: boolean }>()
</script>

<template>
  <span v-if="categories && categories.length" class="mod-chips" :class="wrap ? 'mod-chips-wrap' : ''">
    <SChip v-for="c in categories" :key="c" tone="warning" size="xs" :title="c">{{ categoryLabel(c) }}</SChip>
  </span>
  <SHint v-else inline>—</SHint>
</template>
