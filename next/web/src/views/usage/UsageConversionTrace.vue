<script setup lang="ts">
// The protocol conversion of a request (usage_logs.conversion, CONVERT-MATRIX
// §7): grade, protocol chain, the serving account's effective policy, lost
// paths by category (request and response), account types refused and the
// paths left out over the record's cap. Operators only: renders nothing
// without a trace.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SCard, SCode, SDescItem, SDescriptions, SDisclosure, SHint } from '@sub2api/ui'
import ConversionGradeBadge from '@/components/ConversionGradeBadge.vue'
import { useOptionalT } from '@/composables/optionalText'
import { hopsText, lossEntries, lostCategories } from '@/utils/conversion'
import type { UsageRow } from './usage'

const props = defineProps<{ row: UsageRow }>()
const { t } = useI18n()
const tr = useOptionalT()

const trace = computed(() => props.row.conversion || null)
const sides = computed(() =>
  [
    { key: 'lost', title: t('usage.conversion.requestLost'), entries: lossEntries(trace.value?.lost) },
    { key: 'response-lost', title: t('usage.conversion.responseLost'), entries: lossEntries(trace.value?.response_lost) }
  ].filter(s => s.entries.length)
)
/** A "1:" path belongs to the second hop of a two-hop composition. */
const secondHop = computed(
  () => (trace.value?.hops?.length ?? 0) > 2 && sides.value.some(s => s.entries.some(([, paths]) => paths.some(p => p.startsWith('1:'))))
)
const policy = (p: string) => tr(`accounts.conversion.policies.${p}`, undefined, p)
const category = (c: string) => tr(`accounts.conversion.categories.${c}`, undefined, c)
</script>

<template>
  <SCard v-if="trace" variant="flat" data-testid="usage-conversion">
    <SDisclosure variant="section" :label="t('usage.conversion.title')" :default-open="!trace.grade || lostCategories(trace).length > 0">
      <template #actions>
        <ConversionGradeBadge v-if="trace.grade" :grade="trace.grade" :via="trace.hops" size="xs" />
        <SBadge v-else size="xs" tone="danger" data-testid="conversion-all-rejected">{{ t('usage.conversion.allRejected') }}</SBadge>
      </template>
      <div class="space-y-3">
        <SDescriptions dense :columns="2" label-width="6rem">
          <SDescItem :label="t('usage.conversion.grade')">
            <ConversionGradeBadge v-if="trace.grade" :grade="trace.grade" size="xs" />
            <template v-else>—</template>
          </SDescItem>
          <SDescItem :label="t('usage.conversion.policy')"
            ><span data-testid="conversion-policy">{{ trace.policy ? policy(trace.policy) : '—' }}</span></SDescItem
          >
          <SDescItem v-if="trace.hops?.length" :label="t('usage.conversion.hops')" full>
            <span class="break-all font-mono text-xs" data-testid="conversion-hops">{{ hopsText(trace.hops) }}</span>
          </SDescItem>
          <SDescItem v-if="trace.omitted" :label="t('usage.conversion.omitted')">{{ trace.omitted }}</SDescItem>
        </SDescriptions>

        <div v-for="side in sides" :key="side.key" :data-testid="`conversion-${side.key}`">
          <h4 class="mb-1 text-xs text-fg-muted">{{ side.title }}</h4>
          <ul class="space-y-1">
            <li v-for="[c, paths] in side.entries" :key="c" class="flex flex-wrap items-center gap-1.5">
              <SBadge size="xs" tone="warning">{{ category(c) }}</SBadge>
              <SCode v-for="(p, i) in paths" :key="i" inline :text="p" class="break-all" />
            </li>
          </ul>
        </div>
        <SHint v-if="secondHop" size="xs">{{ t('usage.conversion.secondHop', { hops: hopsText(trace.hops!.slice(1)) }) }}</SHint>

        <div v-if="trace.rejected?.length" data-testid="conversion-rejected">
          <h4 class="mb-1 text-xs text-fg-muted">{{ t('usage.conversion.rejected') }}</h4>
          <ul class="divide-y divide-line text-sm">
            <li v-for="(r, i) in trace.rejected" :key="i" class="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
              <span class="break-all font-mono text-xs">{{ r.type }}</span>
              <span v-if="r.error" class="min-w-0 break-words text-xs">{{ r.error }}</span>
              <template v-else>
                <SBadge v-if="r.policy" size="xs">{{ policy(r.policy) }}</SBadge>
                <SBadge v-if="r.category" size="xs" tone="warning">{{ category(r.category) }}</SBadge>
                <SCode v-if="r.path" inline :text="r.path" class="break-all" />
              </template>
            </li>
          </ul>
        </div>
      </div>
    </SDisclosure>
  </SCard>
</template>
