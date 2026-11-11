<script setup lang="ts">
import { computed } from 'vue'
import { SChip, SChipList, SHint, type ChipListItem } from '@sub2api/ui'
import { categoryLabel, score } from './format'
import { useModHost } from './host'

// Hit categories of a record (codes), of a trace (with Jev labels and
// scores) or of a user (records by highest category; `other` = the records
// outside the shown ones). In a table cell or list line: one line, the first
// `max` chips and a "+N" that lists them all (SChipList); `wrap` (a detail
// view) shows every chip, wrapping.
type Item = string | { category: string; label?: string; score?: number; count?: number }
const props = withDefaults(defineProps<{ categories?: Item[] | null; wrap?: boolean; other?: number; max?: number }>(), { categories: null, other: 0, max: 2 })
const t = useModHost().t

function suffix(c: Item): string {
  if (typeof c === 'string') return ''
  if (c.score !== undefined) return ' ' + score(c.score)
  return c.count !== undefined ? ' ' + c.count : ''
}
const chips = computed<ChipListItem[]>(() => {
  const items: ChipListItem[] = (props.categories ?? []).map((c) => {
    const code = typeof c === 'string' ? c : c.category
    const label = typeof c === 'string' ? categoryLabel(c) : categoryLabel(c.category, c.label)
    return { key: code, label: label + suffix(c), tone: 'warning', title: code }
  })
  if (items.length && props.other) items.push({ key: '__other', label: t('chips.other', { n: props.other }) })
  return items
})
</script>

<template>
  <SHint v-if="!chips.length" inline>—</SHint>
  <span v-else-if="wrap" class="mod-chips">
    <SChip v-for="c in chips" :key="c.key" :tone="c.tone" size="xs" :title="c.title">{{ c.label }}</SChip>
  </span>
  <SChipList v-else :items="chips" :max="max" />
</template>
