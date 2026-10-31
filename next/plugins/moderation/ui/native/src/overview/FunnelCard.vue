<script setup lang="ts">
import { computed, ref } from 'vue'
import { SCard, SEmpty, SLink, SSegmented } from '@sub2api/ui'
import { num } from '../format'
import { useModHost } from '../host'
import type { Funnel, TabKey } from '../types'

// Today's funnel per flow (new-api funnel-card): what each stage received,
// hit and passed on (a later stage's pass overturns), and the flow result.
const props = defineProps<{ funnels: Funnel[] }>()
const emit = defineEmits<{ (e: 'go-tab', tab: TabKey): void }>()
const t = useModHost().t

const picked = ref<number | null>(null)
const funnel = computed(() => props.funnels.find((f) => f.flow_id === picked.value) ?? props.funnels[0])
const options = computed(() => props.funnels.map((f) => ({ value: f.flow_id, label: f.name || `#${f.flow_id}` })))
</script>

<template>
  <SCard :title="t('funnel.title')" :subtitle="t('funnel.hint')">
    <template #actions><SLink as="button" @click="emit('go-tab', 'flows')">{{ t('funnel.edit') }}</SLink></template>
    <SEmpty v-if="!funnel" :text="t('funnel.empty')" icon="filter" />
    <div v-else class="mod-stack">
      <SSegmented v-if="funnels.length > 1" :model-value="funnel.flow_id" :options="options" size="sm" @update:model-value="picked = Number($event)" />
      <div class="mod-funnel">
        <div class="mod-tile">
          <div class="mod-sub">{{ t('funnel.entered') }}</div>
          <div class="mod-tile-value mod-num">{{ num(funnel.stages[0]?.received) }}</div>
        </div>
        <template v-for="(s, i) in funnel.stages" :key="s.stage">
          <span class="mod-sub mod-funnel-arrow">{{ i === 0 ? '→' : t('funnel.hitArrow') }}</span>
          <div class="mod-tile">
            <div class="mod-sub">{{ t('trace.stageN', { n: s.stage }) }}</div>
            <div class="mod-tile-value mod-num">{{ num(s.received) }}</div>
            <div class="mod-sub">
              <span class="mod-text-danger">{{ t('funnel.hit', { n: num(s.hit) }) }}</span>
              <span class="mod-text-success"> {{ i === 0 ? t('funnel.passed', { n: num(s.passed) }) : t('funnel.overturned', { n: num(s.passed) }) }}</span>
            </div>
          </div>
        </template>
        <span class="mod-sub mod-funnel-arrow">→</span>
        <div class="mod-tile mod-tile-warning">
          <div class="mod-sub">{{ t('funnel.result') }}</div>
          <div class="mod-tile-value mod-num mod-text-warning">{{ t('funnel.suspicious', { n: num(funnel.suspicious) }) }}</div>
          <div class="mod-sub">{{ t('funnel.blocked', { n: num(funnel.blocked) }) }}</div>
        </div>
      </div>
    </div>
  </SCard>
</template>
