<script setup lang="ts">
import { computed } from 'vue'
import { SHint } from '@sub2api/ui'
import { useCatalog } from './catalog'
import { useModHost } from './host'

// "flow name@vN" of a record or watch row; an older version gets a
// "现为 vM" hint with the flow's current published version.
const props = defineProps<{ flowId: number; version: number; name?: string; current?: number }>()
const t = useModHost().t
const catalog = useCatalog()

const flow = computed(() => catalog.flow(props.flowId))
const label = computed(() => props.name || flow.value?.name || `#${props.flowId}`)
const current = computed(() => props.current || flow.value?.version || 0)
</script>

<template>
  <span v-if="flowId" class="mod-flow-ref">
    <span>{{ label }}</span><span class="mod-num mod-sub">@v{{ version }}</span>
    <span v-if="current && version && current !== version" class="mod-sub mod-text-warning">{{ t('flowRef.now', { v: current }) }}</span>
  </span>
  <SHint v-else inline>{{ t('events.legacy') }}</SHint>
</template>
