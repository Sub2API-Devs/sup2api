<script setup lang="ts">
// The model availability precheck of a request (anomalies.availability,
// MODEL-AVAILABILITY-PRECHECK-DESIGN.md §6.1/§6.4): outcome, candidate and
// admitted counts, accounts per reason, sample accounts and the per-attempt
// recheck. Renders nothing without a well-formed trace. Retry times are shown
// absolute and relative to the request, since the record is read later.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SCard, SDescItem, SDescriptions, SDisclosure, SHint } from '@sub2api/ui'
import { useOptionalT } from '@/composables/optionalText'
import { formatDateTime } from '@/utils/format'
import { quotaCountdown } from '@/views/accounts/accountQuota'
import { accountLabel, availabilityOutcomeTone, availabilityReasonLabel, availabilityTrace, type AvailabilitySample, type UsageRow } from './usage'

const props = defineProps<{ row: UsageRow }>()
const { t } = useI18n()
const tr = useOptionalT()

const trace = computed(() => availabilityTrace(props.row))
const counts = computed(() => Object.entries(trace.value?.counts || {}).sort((a, b) => b[1] - a[1]))
const sections = computed(() => [
  { key: 'samples', title: t('usage.availability.samples'), items: trace.value?.samples || [] },
  { key: 'guard', title: t('usage.availability.guard'), items: trace.value?.guard || [] }
].filter(s => s.items.length))

const reason = (code: string) => availabilityReasonLabel(tr, code)

function account(s: AvailabilitySample): { text: string; hidden: boolean } {
  if (s.account_id) return { text: accountLabel({ account_id: s.account_id, account_name: s.account_name }), hidden: false }
  if (s.batch) return { text: t('usage.availability.batch', { plugin: s.plugin || '—' }), hidden: false }
  return { text: t('usage.availability.hiddenAccount'), hidden: true }
}

function retryText(unix: number): string {
  const at = formatDateTime(unix * 1000)
  const created = Date.parse(props.row.created_at)
  const cd = quotaCountdown(new Date(unix * 1000).toISOString(), Number.isNaN(created) ? Date.now() : created)
  return cd.kind === 'in' ? `${at} (${t('usage.availability.afterRequest', { time: cd.text })})` : at
}

const decisionTone = (d: string) => (d === 'block' ? 'danger' : d === 'fail_open' ? 'info' : 'gray')
</script>

<template>
  <SCard v-if="trace" variant="flat" data-testid="usage-availability">
    <SDisclosure variant="section" :label="t('usage.availability.title')" :default-open="trace.outcome === 'blocked_all' || trace.outcome === 'fail_open'">
      <template #actions>
        <SBadge size="xs" :tone="availabilityOutcomeTone(trace.outcome)" data-testid="availability-outcome">
          {{ tr(`usage.availability.outcomes.${trace.outcome}`, undefined, trace.outcome) }}
        </SBadge>
      </template>
      <div class="space-y-3">
        <SDescriptions dense :columns="2" label-width="6rem">
          <SDescItem :label="t('usage.availability.candidates')">{{ trace.candidates }}</SDescItem>
          <SDescItem :label="t('usage.availability.admitted')">{{ trace.admitted }}</SDescItem>
          <SDescItem v-if="trace.retry_at" :label="t('usage.availability.retryAt')" full>
            <span class="tabular-nums" data-testid="availability-retry">{{ retryText(trace.retry_at) }}</span>
          </SDescItem>
        </SDescriptions>

        <div v-if="counts.length" data-testid="availability-counts">
          <h4 class="mb-1.5 text-xs text-fg-muted">{{ t('usage.availability.counts') }}</h4>
          <div class="flex flex-wrap gap-1.5">
            <SBadge v-for="[code, n] in counts" :key="code" :title="code">{{ reason(code) }} × {{ n }}</SBadge>
          </div>
        </div>

        <div v-for="section in sections" :key="section.key" :data-testid="`availability-${section.key}`">
          <h4 class="mb-1 text-xs text-fg-muted">{{ section.title }}</h4>
          <ul class="divide-y divide-line text-sm">
            <li v-for="(s, i) in section.items" :key="i" class="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5" data-testid="availability-sample">
              <SHint v-if="s.attempt" inline size="xs">{{ t('usage.availability.attempt', { n: s.attempt }) }}</SHint>
              <SHint v-if="account(s).hidden" inline size="xs" data-testid="availability-hidden-account">{{ account(s).text }}</SHint>
              <span v-else class="min-w-0 break-all">{{ account(s).text }}</span>
              <span v-if="s.model" class="min-w-0 break-all font-mono text-xs">{{ s.model }}</span>
              <SBadge size="xs" :tone="decisionTone(s.decision)">{{ tr(`usage.availability.decisions.${s.decision}`, undefined, s.decision || '—') }}</SBadge>
              <span class="min-w-0 break-words text-xs" :title="s.reason" data-testid="availability-reason">{{ reason(s.reason) }}</span>
              <SHint v-if="s.retry_at" inline size="xs" class="tabular-nums">{{ t('usage.availability.sampleRetry') }} {{ retryText(s.retry_at) }}</SHint>
            </li>
          </ul>
          <SHint v-if="section.key === 'samples' && trace.omitted" size="xs" class="mt-1">{{ t('usage.availability.omitted', { n: trace.omitted }) }}</SHint>
        </div>
      </div>
    </SDisclosure>
  </SCard>
</template>
