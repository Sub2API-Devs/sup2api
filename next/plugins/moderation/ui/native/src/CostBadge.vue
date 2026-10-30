<script setup lang="ts">
import { computed } from 'vue'
import { SBadge } from '@sub2api/ui'
import { callCostText, useModHost, type CallCost } from './host'

// Cost of one call or run (§72.13.3). undefined = the backend reported no cost
// (0.2 plugin): nothing is shown.
const props = defineProps<{ cost?: CallCost | string | null }>()
const t = useModHost().t
const v = computed(() => callCostText(props.cost))
</script>

<template>
  <SBadge v-if="cost !== undefined" :tone="v.tone" :title="v.hint" class="mod-num">{{ t('cost.thisCall') }}: {{ v.text }}</SBadge>
</template>
