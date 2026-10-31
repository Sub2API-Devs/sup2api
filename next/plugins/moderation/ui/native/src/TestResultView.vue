<script setup lang="ts">
import { SBadge, SHint } from '@sub2api/ui'
import CategoryChips from './CategoryChips.vue'
import CostBadge from './CostBadge.vue'
import ResultBadge from './ResultBadge.vue'
import { enumLabel } from './format'
import { useModHost } from './host'
import { severityTone } from './tones'
import type { TestResult } from './types'

// The summary of one flow run of POST /test or a flow simulation: result,
// timing and refusal (simulation), severity, flow version, cost and the hit
// categories. The trace is shown by the caller.
defineProps<{ result: TestResult }>()
const t = useModHost().t
</script>

<template>
  <div class="mod-verdict">
    <div class="mod-verdict-head">
      <ResultBadge :result="result.result" />
      <SBadge v-if="result.timing" tone="gray">{{ enumLabel('timing', result.timing) }}</SBadge>
      <SBadge v-if="result.refused" tone="danger">{{ t('flows.simRefused') }}</SBadge>
      <SBadge v-if="result.severity" :tone="severityTone(result.severity)">{{ t('detail.f.severity') }}: {{ enumLabel('severity', result.severity) }}</SBadge>
      <SHint inline size="xs">#{{ result.flow_id }} {{ result.flow_version ? `v${result.flow_version}` : t('flows.simSourceDraft') }}</SHint>
      <CostBadge :cost="result.cost" class="mod-ml-auto" />
    </div>
    <CategoryChips v-if="result.categories?.length" :categories="result.categories" wrap />
  </div>
</template>
