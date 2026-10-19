<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SDescItem, SDescriptions, SDisclosure, SHint } from '@sub2api/ui'
import { formatNumber } from '@/utils/format'
import { cacheWriteEvidence, type CacheWriteCounter } from './cacheWriteEvidence'

const props = defineProps<{ metrics?: unknown; hasCacheWrites?: boolean; compact?: boolean }>()
const { t } = useI18n()
const evidence = computed(() => cacheWriteEvidence(props.metrics))
const counters = computed(() => evidence.value ? [
  { label: 'total', value: evidence.value.total },
  { label: 'five', value: evidence.value.explicit_5m },
  { label: 'hour', value: evidence.value.explicit_1h }
] : [])
function display(counter: CacheWriteCounter): string {
  return counter.state === 'value' ? formatNumber(counter.value!) : t(`usage.cacheEvidence.counter.${counter.state}`)
}
</script>

<template>
  <SDisclosure
    v-if="evidence"
    :key="evidence.completeness"
    variant="section"
    :label="t('usage.cacheEvidence.title')"
    :description="evidence.completeness === 'complete' ? t('usage.cacheEvidence.status.complete') : undefined"
    :default-open="!compact || evidence.completeness !== 'complete'"
    class="mt-3 rounded-lg border border-line p-3"
    data-testid="cache-write-facts"
  >
    <SHint v-if="evidence.completeness !== 'complete'" tone="warning" class="mb-2">
      {{ t(`usage.cacheEvidence.status.${evidence.completeness}`) }}
    </SHint>
    <SDescriptions dense>
      <template
        v-for="item in counters"
        :key="item.label"
      >
        <SDescItem :label="t(`usage.cacheEvidence.${item.label}`)">{{ display(item.value) }}</SDescItem>
      </template>
      <SDescItem :label="t('usage.cacheEvidence.unclassified')">{{ evidence.unclassified_tokens === undefined ? '—' : formatNumber(evidence.unclassified_tokens) }}</SDescItem>
    </SDescriptions>
    <SHint size="xs" class="mt-2 leading-relaxed">{{ t('usage.cacheEvidence.pricing') }}</SHint>
  </SDisclosure>
  <SHint
    v-else-if="hasCacheWrites"
    class="mt-2"
    data-testid="cache-write-evidence-missing"
  >
    {{ t('usage.cacheEvidence.missing') }}
  </SHint>
</template>
