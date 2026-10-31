<script setup lang="ts">
import { computed, watch } from 'vue'
import { SAlert, SButton, SGrid } from '@sub2api/ui'
import { canManageSettings, useModHost, type Runtime } from './host'
import CostCard from './CostCard.vue'
import { provideOverview, useOverview } from './overview/useOverview'
import StatusLine from './overview/StatusLine.vue'
import KpiCards from './overview/KpiCards.vue'
import AttentionCard from './overview/AttentionCard.vue'
import AiReviewCard from './overview/AiReviewCard.vue'
import PerformanceCard from './overview/PerformanceCard.vue'
import CategoriesCard from './overview/CategoriesCard.vue'
import FunnelCard from './overview/FunnelCard.vue'
import TrendCard from './overview/TrendCard.vue'
import HealthCard from './overview/HealthCard.vue'

// Overview (CONTRACTS §72.14.7, after new-api components/overview): running
// state, today's KPIs, the users most in need of attention, AI review, cost,
// performance impact, categories, funnel, trend and health. Statistics are
// hourly sums of all nodes (up to a minute late); refreshes every minute
// while shown.
const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true })
const emit = defineEmits<{
  (e: 'runtime', r: Runtime): void
  (e: 'show-user', userId: number): void
  (e: 'go-tab', tab: string): void
  (e: 'go-settings'): void
}>()
const t = useModHost().t

const ov = useOverview(() => props.active)
provideOverview(ov)
defineExpose({ reload: () => ov.refresh(true) })

const status = computed(() => ov.status.data.value)
watch(status, (s) => s?.runtime && emit('runtime', s.runtime))

/** Setup hint above the cards: no flow bound, or moderation off. */
const notice = computed(() => {
  const r = status.value?.runtime
  if (r && !r.configured) return { tone: 'warning' as const, text: t('overview.notConfigured'), action: 'flows' }
  if (status.value?.mode === 'off') return { tone: 'info' as const, text: t('overview.offHint'), action: 'settings' }
  return null
})
const canAct = computed(() => (notice.value?.action === 'settings' ? canManageSettings() : true))

function act(action: string) {
  if (action === 'settings') emit('go-settings')
  else emit('go-tab', action)
}
const goTab = (tab: string) => emit('go-tab', tab)
</script>

<template>
  <div>
    <SAlert v-if="ov.status.error.value" tone="danger" class="mod-block">
      {{ ov.status.error.value }}
      <template #actions>
        <SButton size="sm" :loading="ov.status.loading.value" @click="ov.refresh()">{{ t('retry') }}</SButton>
      </template>
    </SAlert>

    <SAlert v-if="notice" :tone="notice.tone" class="mod-block">
      {{ notice.text }}
      <template v-if="canAct" #actions>
        <SButton :variant="notice.action === 'flows' ? 'primary' : 'secondary'" size="sm" @click="act(notice.action)">
          {{ notice.action === 'flows' ? t('tabs.flows') : t('settings') }}
        </SButton>
      </template>
    </SAlert>

    <StatusLine @go-tab="goTab" />
    <KpiCards />

    <SGrid template="repeat(auto-fit, minmax(min(380px, 100%), 1fr))" class="mod-section">
      <AttentionCard @show-user="emit('show-user', $event)" @go-tab="goTab" />
      <AiReviewCard @go-tab="goTab" />
    </SGrid>

    <CostCard class="mod-section" />
    <PerformanceCard class="mod-section" />

    <SGrid template="repeat(auto-fit, minmax(min(380px, 100%), 1fr))" class="mod-section">
      <CategoriesCard />
      <FunnelCard @go-tab="goTab" />
    </SGrid>

    <TrendCard class="mod-section" />
    <HealthCard class="mod-section" @go-tab="goTab" />
  </div>
</template>
