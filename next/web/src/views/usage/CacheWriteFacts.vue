<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SHint } from '@sub2api/ui'
import { formatNumber } from '@/utils/format'
import { cacheWriteEvidence, type CacheWriteCounter } from './cacheWriteEvidence'

const props = defineProps<{ metrics?: unknown; hasCacheWrites?: boolean }>()
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
  <div
    v-if="evidence"
    class="mt-3 space-y-2 rounded-lg border border-gray-200 p-3 dark:border-dark-600"
    data-testid="cache-write-facts"
  >
    <h4 class="text-sm font-medium">
      {{ t('usage.cacheEvidence.title') }}
    </h4>
    <SHint :tone="evidence.completeness === 'complete' ? 'muted' : 'warning'">
      {{ t(`usage.cacheEvidence.status.${evidence.completeness}`) }}
    </SHint>
    <dl class="kv">
      <template
        v-for="item in counters"
        :key="item.label"
      >
        <dt>{{ t(`usage.cacheEvidence.${item.label}`) }}</dt>
        <dd>{{ display(item.value) }}</dd>
      </template>
      <dt>{{ t('usage.cacheEvidence.unclassified') }}</dt>
      <dd>{{ evidence.unclassified_tokens === undefined ? '—' : formatNumber(evidence.unclassified_tokens) }}</dd>
    </dl>
    <SHint>{{ t('usage.cacheEvidence.pricing') }}</SHint>
  </div>
  <SHint
    v-else-if="hasCacheWrites"
    class="mt-2"
    data-testid="cache-write-evidence-missing"
  >
    {{ t('usage.cacheEvidence.missing') }}
  </SHint>
</template>
