<script setup lang="ts">
import { computed } from 'vue'
import { scopeEntries } from '../pluginUtil'

// Renders a permission scope ({domains:[...], fields:[...], limits:{...}}) as chips.
const props = defineProps<{ scope?: unknown }>()
const entries = computed(() => scopeEntries(props.scope))
</script>

<template>
  <div v-if="entries.length" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
    <span v-for="e in entries" :key="e.key" class="inline-flex flex-wrap items-center gap-1">
      <span class="muted">{{ e.key }}:</span>
      <code
        v-for="(v, i) in e.values"
        :key="i"
        class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700 dark:bg-dark-700 dark:text-gray-200"
        >{{ v }}</code
      >
    </span>
  </div>
</template>
