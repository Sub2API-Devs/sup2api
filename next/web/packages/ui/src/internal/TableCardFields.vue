<script setup lang="ts">
// Label / value grid of an STable phone card (meta and detail fields): two
// columns, the short label above the value, `mobileSpan` 2 across both. The
// default slot renders a value: `{ column }`. Internal to STable.
import type { TableColumn } from '../types'

defineProps<{ columns: TableColumn[] }>()
</script>

<template>
  <dl class="grid grid-cols-2 gap-x-4 gap-y-2.5">
    <div v-for="c in columns" :key="c.key" class="min-w-0" :class="c.mobileSpan === 2 ? 'col-span-2' : ''">
      <dt class="text-[11px] leading-4 text-fg-muted">{{ c.mobileLabel ?? c.label }}</dt>
      <dd class="mt-0.5 min-w-0 break-words text-sm text-fg"><slot :column="c" /></dd>
    </div>
  </dl>
</template>
