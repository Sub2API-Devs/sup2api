<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { SBadge, SHint } from '@sub2api/ui'
import { useModHost } from '../host'
import { flowOf, isLoaded, loadFlows } from './catalog'

// "name@vN" of the flow a record ran; "现为 vM" when the flow has been
// published again since.
const props = defineProps<{ flowId: number; version: number }>()
const t = useModHost().t
const loaded = computed(() => isLoaded('flows'))
onMounted(() => loadFlows())
const flow = computed(() => (props.flowId ? flowOf(props.flowId) : undefined))
const label = computed(() => `${flow.value?.name || `#${props.flowId}`}@v${props.version}`)
</script>

<template>
  <SHint v-if="!flowId" inline>{{ t('events.legacy') }}</SHint>
  <span v-else class="mod-pg-flow">
    <span :title="`#${flowId}`">{{ label }}</span>
    <SBadge v-if="flow && flow.version > version" size="xs" tone="warning">{{ t('pagesP3.flow.now', { v: flow.version }) }}</SBadge>
    <SBadge v-else-if="loaded && !flow" size="xs" tone="gray">{{ t('pagesP3.flow.deleted') }}</SBadge>
  </span>
</template>

<style scoped>
.mod-pg-flow {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  font-variant-numeric: tabular-nums;
}
</style>
