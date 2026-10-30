<script setup lang="ts">
import { SChip, SHint } from '@sub2api/ui'
import { categoryLabel } from './host'

// Hit categories of a record (codes) or of a trace (with Jev labels).
defineProps<{ categories?: Array<string | { category: string; label?: string; score?: number }> | null; wrap?: boolean }>()
const code = (c: string | { category: string }) => (typeof c === 'string' ? c : c.category)
const label = (c: string | { category: string; label?: string }) => (typeof c === 'string' ? categoryLabel(c) : categoryLabel(c.category, c.label))
</script>

<template>
  <span v-if="categories && categories.length" class="mod-chips" :class="wrap ? 'mod-chips-wrap' : ''">
    <SChip v-for="c in categories" :key="code(c)" tone="warning" size="xs" :title="code(c)">
      {{ label(c) }}{{ typeof c !== 'string' && c.score !== undefined ? ' ' + c.score.toFixed(2) : '' }}
    </SChip>
  </span>
  <SHint v-else inline>—</SHint>
</template>
