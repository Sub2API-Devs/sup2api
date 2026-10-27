<script setup lang="ts">
// The charts of a usage summary under one set of filters: distribution by
// model (and by a second key: API key for a user, group for an operator),
// the token trend and the three small charts in day or hour buckets. Each
// breakdown is one GET <summaryPath>?group_by=…&tz=…; nothing is queried
// while `enabled` is false (the panel is collapsed). A failed query shows as
// an error with a retry, never as an empty chart.
import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SButton, SCard, SSegmented } from '@sub2api/ui'
import { useUsageSummary } from '@/views/usage/useUsageSummary'
import { errorMessage } from '@/utils/errors'
import DistributionCard from './DistributionCard.vue'
import MetricStrip from './MetricStrip.vue'
import TokenTrendChart from './TokenTrendChart.vue'
import { bucketKeys, type Granularity } from './stats'

const props = withDefaults(
  defineProps<{
    summaryPath: string
    filters: Record<string, unknown>
    granularity: Granularity
    /** Second breakdown beside the models; none on the dashboard layout. */
    secondary?: { groupBy: string; title: string; keyLabel: string; labelOf?: (key: string) => string } | null
    layout?: 'records' | 'dashboard'
    enabled?: boolean
    /** Bumped by the page's refresh button. */
    revision?: number
    group: string
    /** Offer the model breakdown by upstream model too (operators only). */
    modelSources?: boolean
  }>(),
  { secondary: null, layout: 'records', enabled: true, revision: 0, modelSources: false }
)
const emit = defineEmits<{ (e: 'select-model', key: string): void; (e: 'select-secondary', key: string): void }>()
const { t } = useI18n()

const enabled = toRef(props, 'enabled')
// The filter narrows the requested model, so only that breakdown selects.
const source = ref<'model' | 'upstream_model'>('model')
const sourceOptions = computed(() => [
  { value: 'model', label: t('stats.sourceRequested') },
  { value: 'upstream_model', label: t('stats.sourceUpstream') }
])
const models = useUsageSummary(props.summaryPath, props.filters, () => (props.modelSources ? source.value : 'model'), enabled)
const second = useUsageSummary(props.summaryPath, props.filters, () => props.secondary?.groupBy || 'none', () => props.enabled && !!props.secondary)
const trend = useUsageSummary(props.summaryPath, props.filters, () => props.granularity, enabled)

const buckets = computed(() => bucketKeys(String(props.filters.from || ''), String(props.filters.to || ''), props.granularity, trend.rows.value))
const error = computed(() => models.error.value || second.error.value || trend.error.value)

function reload() {
  models.reload()
  second.reload()
  trend.reload()
}
defineExpose({ reload })
watch(() => props.revision, reload)
</script>

<template>
  <div class="flex flex-col gap-4">
    <SAlert v-if="error" tone="danger">
      {{ t('stats.loadFailed', { msg: errorMessage(error) }) }}
      <template #actions><SButton size="sm" icon="refresh" @click="reload">{{ t('stats.retry') }}</SButton></template>
    </SAlert>
    <template v-if="layout === 'records'">
      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DistributionCard
          :title="t('stats.modelDist')"
          :key-label="t('stats.model')"
          :rows="models.rows.value"
          :loading="models.loading.value"
          :selectable="!modelSources || source === 'model'"
          @select="emit('select-model', $event)"
        >
          <template v-if="modelSources" #extra>
            <SSegmented v-model="source" size="sm" :aria-label="t('stats.model')" :options="sourceOptions" data-testid="model-source" />
          </template>
        </DistributionCard>
        <DistributionCard
          v-if="secondary"
          :title="secondary.title"
          :key-label="secondary.keyLabel"
          :rows="second.rows.value"
          :loading="second.loading.value"
          :label-of="secondary.labelOf"
          selectable
          @select="emit('select-secondary', $event)"
        />
      </div>
      <SCard :title="t('stats.tokenTrend')" :subtitle="t('stats.tokenTrendHint')">
        <TokenTrendChart :rows="trend.rows.value" :buckets="buckets" :granularity="granularity" :loading="trend.loading.value" :group="group" />
      </SCard>
    </template>
    <div v-else class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SCard :title="t('stats.tokenTrend')" :subtitle="t('stats.tokenTrendHint')">
        <TokenTrendChart :rows="trend.rows.value" :buckets="buckets" :granularity="granularity" :loading="trend.loading.value" :group="group" height="248px" />
      </SCard>
      <DistributionCard :title="t('stats.modelDist')" :key-label="t('stats.model')" :rows="models.rows.value" :loading="models.loading.value">
        <template v-if="modelSources" #extra>
          <SSegmented v-model="source" size="sm" :aria-label="t('stats.model')" :options="sourceOptions" data-testid="model-source" />
        </template>
      </DistributionCard>
    </div>
    <MetricStrip :rows="trend.rows.value" :buckets="buckets" :granularity="granularity" :loading="trend.loading.value" :group="group" />
  </div>
</template>
