<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SHint } from '@sub2api/ui'
import { finalVerdict, useModHost, type ModEvent } from './host'

// Final verdict of a record (§72.9): human review first, else the AI verdict;
// the source (人工 / AI) is shown next to it.
const props = defineProps<{ event: Pick<ModEvent, 'review_status' | 'ai_verdict' | 'result'> }>()
const t = useModHost().t
const v = computed(() => finalVerdict(props.event))
</script>

<template>
  <span v-if="v" class="mod-verdict-badge">
    <SBadge :tone="v.tone" dot>{{ t(`verdict.${v.key}`) }}</SBadge>
    <span v-if="v.by" class="mod-sub">{{ t(`verdictBy.${v.by}`) }}</span>
  </span>
  <SHint v-else inline>—</SHint>
</template>
