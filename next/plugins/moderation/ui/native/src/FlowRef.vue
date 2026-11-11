<script setup lang="ts">
import { computed } from 'vue'
import { SHint } from '@sub2api/ui'
import { useCatalog } from './catalog'
import { useModHost } from './host'

// "flow name@vN" of a record or watch row; an older version gets a
// "现为 vM" hint with the flow's current published version. `compact` (a
// table cell): "flow name vN" on one line, cut with an ellipsis, the hint
// in the tooltip.
const props = defineProps<{ flowId: number; version: number; name?: string; current?: number; compact?: boolean }>()
const t = useModHost().t
const catalog = useCatalog()

const flow = computed(() => catalog.flow(props.flowId))
const label = computed(() => props.name || flow.value?.name || `#${props.flowId}`)
const current = computed(() => props.current || flow.value?.version || 0)
const now = computed(() => (current.value && props.version && current.value !== props.version ? t('flowRef.now', { v: current.value }) : ''))
const title = computed(() => (props.compact ? `${label.value} v${props.version}${now.value ? ` · ${now.value}` : ''}` : undefined))
</script>

<template>
  <span v-if="flowId" class="mod-flow-ref" :class="{ 'mod-flow-ref-compact': compact }" :title="title">
    <template v-if="compact">{{ label }} <span class="mod-num mod-sub" :class="{ 'mod-text-warning': now }">v{{ version }}</span></template>
    <template v-else>
      <span>{{ label }}</span><span class="mod-num mod-sub">@v{{ version }}</span>
      <span v-if="now" class="mod-sub mod-text-warning">{{ now }}</span>
    </template>
  </span>
  <SHint v-else inline>{{ t('events.legacy') }}</SHint>
</template>
