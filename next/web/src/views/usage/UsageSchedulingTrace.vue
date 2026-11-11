<script setup lang="ts">
// Why accounts of the group were not used for a request (anomalies.scheduling,
// CONTRACTS §24.6): outcome, how many accounts the group offered and how many
// could serve the request, accounts per reason, and each skipped account with
// its reason. Renders nothing without a well-formed trace.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SCard, SDescItem, SDescriptions, SDisclosure, SHint } from '@sub2api/ui'
import { useOptionalT } from '@/composables/optionalText'
import { formatDateTime } from '@/utils/format'
import { accountLabel, schedulingOutcomeTone, schedulingReasonLabel, schedulingTrace, type SchedulingSkip, type UsageRow } from './usage'

const props = defineProps<{ row: UsageRow }>()
const { t } = useI18n()
const tr = useOptionalT()

const trace = computed(() => schedulingTrace(props.row))
const counts = computed(() => Object.entries(trace.value?.counts || {}).sort((a, b) => b[1] - a[1]))

function account(s: SchedulingSkip): { text: string; hidden: boolean } {
  if (s.account_id) return { text: accountLabel({ account_id: s.account_id, account_name: s.account_name }), hidden: false }
  return { text: t('usage.scheduling.hiddenAccount'), hidden: true }
}
</script>

<template>
  <SCard v-if="trace" variant="flat" data-testid="usage-scheduling">
    <SDisclosure variant="section" :label="t('usage.scheduling.title')" :default-open="trace.outcome !== 'picked'">
      <template #actions>
        <SBadge size="xs" :tone="schedulingOutcomeTone(trace.outcome)" data-testid="scheduling-outcome">
          {{ tr(`usage.scheduling.outcomes.${trace.outcome}`, undefined, trace.outcome) }}
        </SBadge>
      </template>
      <div class="space-y-3">
        <SDescriptions dense :columns="2" label-width="8rem">
          <SDescItem :label="t('usage.scheduling.candidates')">{{ trace.candidates }}</SDescItem>
          <SDescItem :label="t('usage.scheduling.eligible')">{{ trace.eligible }}</SDescItem>
        </SDescriptions>

        <div v-if="counts.length" data-testid="scheduling-counts">
          <h4 class="mb-1.5 text-xs text-fg-muted">{{ t('usage.scheduling.counts') }}</h4>
          <div class="flex flex-wrap gap-1.5">
            <SBadge v-for="[code, n] in counts" :key="code" :title="code">{{ schedulingReasonLabel(tr, { reason: code }) }} × {{ n }}</SBadge>
          </div>
        </div>

        <div v-if="trace.skipped.length" data-testid="scheduling-skipped">
          <h4 class="mb-1 text-xs text-fg-muted">{{ t('usage.scheduling.skipped') }}</h4>
          <ul class="divide-y divide-line text-sm">
            <li v-for="(s, i) in trace.skipped" :key="i" class="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5" data-testid="scheduling-skip">
              <SHint v-if="account(s).hidden" inline size="xs" data-testid="scheduling-hidden-account">{{ account(s).text }}</SHint>
              <span v-else class="min-w-0 break-all">{{ account(s).text }}</span>
              <span class="min-w-0 break-words text-xs" :title="s.detail ? `${s.reason}:${s.detail}` : s.reason" data-testid="scheduling-reason">{{ schedulingReasonLabel(tr, s) }}</span>
              <SHint v-if="s.until" inline size="xs" class="tabular-nums">{{ t('usage.scheduling.until', { time: formatDateTime(s.until * 1000) }) }}</SHint>
            </li>
          </ul>
          <SHint v-if="trace.omitted" size="xs" class="mt-1">{{ t('usage.scheduling.omitted', { n: trace.omitted }) }}</SHint>
        </div>
      </div>
    </SDisclosure>
  </SCard>
</template>
