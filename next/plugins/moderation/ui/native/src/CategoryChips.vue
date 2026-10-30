<script setup lang="ts">
import { SChip, SHint } from '@sub2api/ui'
import { categoryLabel, score, useModHost } from './host'

// Hit categories of a record (codes), of a trace (with Jev labels and
// scores) or of a user (with counts; `other` = count outside the shown ones).
type Item = string | { category: string; label?: string; score?: number; count?: number }
defineProps<{ categories?: Item[] | null; wrap?: boolean; other?: number }>()
const t = useModHost().t
const code = (c: Item) => (typeof c === 'string' ? c : c.category)
const label = (c: Item) => (typeof c === 'string' ? categoryLabel(c) : categoryLabel(c.category, c.label))
function suffix(c: Item): string {
  if (typeof c === 'string') return ''
  if (c.score !== undefined) return ' ' + score(c.score)
  return c.count !== undefined ? ' ' + c.count : ''
}
</script>

<template>
  <span v-if="categories && categories.length" class="mod-chips" :class="wrap ? 'mod-chips-wrap' : ''">
    <SChip v-for="c in categories" :key="code(c)" tone="warning" size="xs" :title="code(c)">{{ label(c) }}{{ suffix(c) }}</SChip>
    <SChip v-if="other" size="xs">{{ t('chips.other', { n: other }) }}</SChip>
  </span>
  <SHint v-else inline>—</SHint>
</template>
