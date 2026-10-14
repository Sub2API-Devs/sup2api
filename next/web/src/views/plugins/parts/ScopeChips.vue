<script setup lang="ts">
import { computed } from 'vue'
import { SCode, SHint } from '@sub2api/ui'
import { scopeEntries } from '../pluginUtil'

// Renders a permission scope ({domains:[...], fields:[...], limits:{...}}) as chips.
const props = defineProps<{ scope?: unknown }>()
const entries = computed(() => scopeEntries(props.scope))
</script>

<template>
  <div v-if="entries.length" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
    <span v-for="e in entries" :key="e.key" class="inline-flex flex-wrap items-center gap-1">
      <SHint inline size="xs">{{ e.key }}:</SHint>
      <SCode v-for="(v, i) in e.values" :key="i" inline :text="v" />
    </span>
  </div>
</template>
