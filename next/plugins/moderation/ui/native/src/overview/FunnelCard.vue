<script setup lang="ts">
import { computed, ref } from 'vue'
import { SCard, SEmpty, SLink, SSegmented } from '@sub2api/ui'
import { useModHost } from '../host'
import { useOverviewData } from './useOverview'
import { useFormat } from './format'

// Today's funnel per flow (status.funnels): what each stage received, hit
// and passed on (later stages: overturned), and the flow result.
const emit = defineEmits<{ (e: 'go-tab', tab: string): void }>()
const ov = useOverviewData()
const t = useModHost().t
const { n } = useFormat()

const funnels = computed(() => ov.status.data.value?.funnels || [])
const picked = ref<number | null>(null)
const funnel = computed(() => funnels.value.find((f) => f.flow_id === picked.value) ?? funnels.value[0])
const options = computed(() => funnels.value.map((f) => ({ value: f.flow_id, label: f.name || `#${f.flow_id}` })))

/** Auditor names of a stage of the flow's published version. */
function stageAuditors(stage: number): string {
  const f = funnel.value && ov.flowById.value.get(funnel.value.flow_id)
  const ids = (f?.published || f?.draft)?.stages[stage - 1]?.auditors || []
  return ids.map(ov.auditorName).join(' + ')
}
</script>

<template>
  <SCard :title="t('overviewP3.funnel.title')" :subtitle="t('overviewP3.funnel.hint')">
    <template #actions>
      <SLink as="button" @click="emit('go-tab', 'flows')">{{ t('overviewP3.funnel.edit') }}</SLink>
    </template>
    <SEmpty v-if="!funnel" icon="filter" :title="t('overviewP3.funnel.empty')" :text="t('overviewP3.funnel.emptyHint')" size="sm" />
    <div v-else class="mod-ov-funnel-wrap">
      <SSegmented v-if="funnels.length > 1" :model-value="funnel.flow_id" @update:model-value="picked = Number($event)" size="sm" :options="options" :aria-label="t('overviewP3.funnel.flow')" />
      <div class="mod-ov-funnel">
        <div class="mod-ov-box">
          <div class="mod-sub">{{ t('overviewP3.funnel.entered') }}</div>
          <div class="mod-ov-box-value mod-num">{{ n(funnel.stages[0]?.received) }}</div>
        </div>
        <template v-for="(s, i) in funnel.stages" :key="s.stage">
          <span class="mod-ov-arrow" aria-hidden="true">{{ i === 0 ? '→' : t('overviewP3.funnel.hitArrow') }}</span>
          <div class="mod-ov-box">
            <div class="mod-sub" :title="stageAuditors(s.stage)">{{ t('trace.stageN', { n: s.stage }) }}<template v-if="stageAuditors(s.stage)"> · {{ stageAuditors(s.stage) }}</template></div>
            <div class="mod-ov-box-value mod-num">{{ n(s.received) }}</div>
            <div class="mod-ov-box-row mod-num">
              <span class="mod-danger">{{ t('overviewP3.funnel.hit', { n: n(s.hit) }) }}</span>
              <span class="mod-ov-ok">{{ t(i === 0 ? 'overviewP3.funnel.passed' : 'overviewP3.funnel.overturned', { n: n(s.passed) }) }}</span>
            </div>
          </div>
        </template>
        <span class="mod-ov-arrow" aria-hidden="true">→</span>
        <div class="mod-ov-box mod-ov-box-result">
          <div class="mod-sub">{{ t('overviewP3.funnel.result') }}</div>
          <div class="mod-ov-box-value mod-num">{{ t('overviewP3.funnel.suspicious', { n: n(funnel.suspicious) }) }}</div>
          <div class="mod-sub mod-num">{{ t('overviewP3.funnel.blocked', { n: n(funnel.blocked) }) }}</div>
        </div>
      </div>
    </div>
  </SCard>
</template>

<style scoped>
.mod-ov-funnel-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}
.mod-ov-funnel {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0.5rem;
  font-size: 0.875rem;
}
.mod-ov-box {
  min-width: 7rem;
  max-width: 16rem;
  padding: 0.625rem;
  border: 1px solid rgb(var(--line));
  border-radius: 0.5rem;
}
.mod-ov-box .mod-sub {
  margin-top: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mod-ov-box-value {
  font-size: 1.125rem;
  font-weight: 600;
}
.mod-ov-box-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.75rem;
}
.mod-ov-box-result {
  border-color: rgb(245 158 11 / 0.4);
  background: rgb(245 158 11 / 0.06);
}
.mod-ov-box-result .mod-ov-box-value {
  color: #d97706;
}
.mod-ov-ok {
  color: #16a34a;
}
.mod-ov-arrow {
  align-self: center;
  color: rgb(var(--fg-subtle));
  font-size: 0.75rem;
}
</style>
