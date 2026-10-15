<script setup lang="ts" generic="T extends { count: number }">
import { computed } from 'vue'
import { SEmpty, SProgress, type StatusTone } from '@sub2api/ui'

// Ranked list with a bar proportional to each row's count (overview top
// categories / users). Slots: #name and #count of an item.
const props = defineProps<{ items?: T[] | null; itemKey: (item: T) => string | number; tone: StatusTone; emptyText: string; emptyIcon: string }>()
const max = computed(() => Math.max(1, ...(props.items || []).map((x) => x.count)))
</script>

<template>
  <SEmpty v-if="!items?.length" :text="emptyText" :icon="emptyIcon" />
  <ol v-else class="mod-rank">
    <li v-for="(item, i) in items" :key="itemKey(item)">
      <div class="mod-rank-row">
        <span class="mod-rank-no">{{ i + 1 }}</span>
        <slot name="name" :item="item" />
        <span class="mod-rank-count"><slot name="count" :item="item" /></span>
      </div>
      <SProgress :value="item.count" :max="max" :tone="tone" class="mod-rank-bar" aria-hidden="true" />
    </li>
  </ol>
</template>
