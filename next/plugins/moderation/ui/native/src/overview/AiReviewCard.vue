<script setup lang="ts">
import { computed } from 'vue'
import { SAlert, SButton, SCard, SEmpty, SHint, SLink } from '@sub2api/ui'
import { useModHost } from '../host'
import { reviewShares, thresholdsTooStrict } from './figures'
import { useOverviewData } from './useOverview'
import { useFormat } from './format'

// Today's AI review: records the AI analysis reviewed and how the verdicts
// split; a high false-positive share points at strict flow thresholds.
const emit = defineEmits<{ (e: 'go-tab', tab: string): void }>()
const ov = useOverviewData()
const t = useModHost().t
const { n, pct } = useFormat()

const review = computed(() => ov.status.data.value?.ai_review)
const today = computed(() => ov.status.data.value?.today)
const shares = computed(() => reviewShares(review.value))
const strict = computed(() => thresholdsTooStrict(review.value))
const tokens = computed(() => (today.value?.analysis_tokens_in || 0) + (today.value?.analysis_tokens_out || 0))
const fp = computed(() => shares.value.find((s) => s.key === 'false_positive')?.ratio || 0)
</script>

<template>
  <SCard :title="t('overviewP3.ai.title')" :subtitle="t('overviewP3.ai.hint')">
    <template #actions>
      <SLink as="button" @click="emit('go-tab', 'watch')">{{ t('tabs.watch') }}</SLink>
    </template>
    <SEmpty v-if="!review?.reviewed" icon="eyeglass" :title="t('overviewP3.ai.empty')" :text="t('overviewP3.ai.emptyHint')" size="sm" />
    <div v-else class="mod-ov-ai">
      <div class="mod-ov-ai-head">
        <div>
          <div class="mod-sub">{{ t('overviewP3.ai.reviewed') }}</div>
          <div class="mod-cost-amount mod-num">{{ n(review.reviewed) }}</div>
        </div>
        <div>
          <div class="mod-sub">{{ t('overviewP3.ai.fpRate') }}</div>
          <div class="mod-ov-ai-rate mod-num">{{ pct(fp) }}</div>
        </div>
        <SHint inline size="xs" class="mod-num">
          {{ t('overviewP3.ai.runs', { runs: n(today?.analyses), tokens: n(tokens) }) }}<template v-if="today?.analyses_failed"> · {{ t('overviewP3.ai.failed', { n: n(today.analyses_failed) }) }}</template>
        </SHint>
      </div>
      <div class="mod-ov-split" role="img" :aria-label="shares.map((s) => `${t(`aiVerdict.${s.key}`)} ${s.count}`).join(', ')">
        <span v-for="s in shares" :key="s.key" :class="`mod-ov-split-${s.key}`" :style="{ width: `${s.ratio * 100}%` }" />
      </div>
      <ul class="mod-ov-legend">
        <li v-for="s in shares" :key="s.key">
          <span class="mod-ov-swatch" :class="`mod-ov-split-${s.key}`" aria-hidden="true" />
          {{ t(`aiVerdict.${s.key}`) }} <b class="mod-num">{{ n(s.count) }}</b>
          <span class="mod-sub mod-num">({{ pct(s.ratio) }})</span>
        </li>
      </ul>
      <SAlert v-if="strict" tone="warning" dense>
        {{ t('overviewP3.ai.tooStrict') }}
        <template #actions>
          <SButton size="sm" @click="emit('go-tab', 'flows')">{{ t('tabs.flows') }}</SButton>
        </template>
      </SAlert>
      <SHint size="xs">{{ t('overviewP3.ai.note') }}</SHint>
    </div>
  </SCard>
</template>

<style scoped>
.mod-ov-ai {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.mod-ov-ai-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.5rem 1.5rem;
}
.mod-ov-ai-rate {
  font-size: 1.125rem;
  font-weight: 600;
}
.mod-ov-split {
  display: flex;
  height: 0.75rem;
  overflow: hidden;
  border-radius: 9999px;
  background: rgb(var(--surface-2));
}
.mod-ov-split-violation {
  background: #ef4444;
}
.mod-ov-split-false_positive {
  background: #22c55e;
}
.mod-ov-split-unsure {
  background: #f59e0b;
}
.mod-ov-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.875rem;
}
.mod-ov-legend li {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
}
.mod-ov-legend .mod-sub {
  margin-top: 0;
}
.mod-ov-swatch {
  display: inline-block;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 0.125rem;
}
</style>
