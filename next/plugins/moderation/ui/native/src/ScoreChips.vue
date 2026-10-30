<script setup lang="ts">
import { computed } from 'vue'
import { SChip, SHint, type StatusTone } from '@sub2api/ui'
import { categoryLabel, score, useModHost, type Trace } from './host'
import { scoreLevel, traceScores, type ScoreLevel } from './trace'

// Top category scores of a record: red above the threshold, amber near it
// (≥ 80 %); the exact score / threshold is in the tooltip.
const props = withDefaults(defineProps<{ trace?: Trace | null; max?: number }>(), { max: 3 })
const t = useModHost().t

const TONE: Record<ScoreLevel, StatusTone> = { over: 'danger', near: 'warning', low: 'neutral' }

const chips = computed(() =>
  traceScores(props.trace)
    .slice(0, props.max)
    .map((s) => {
      const level = scoreLevel(s)
      const threshold = s.threshold ? ` / ${score(s.threshold)}` : ''
      const state = level === 'low' ? '' : ` · ${t(`scoreLevel.${level}`)}`
      return { key: s.category, level, label: categoryLabel(s.category, s.label), title: `${s.category}: ${score(s.score)}${threshold}${state}`, value: score(s.score) }
    })
)
</script>

<template>
  <span v-if="chips.length" class="mod-chips">
    <SChip v-for="c in chips" :key="c.key" :tone="TONE[c.level]" size="xs" :title="c.title">{{ c.label }} {{ c.value }}</SChip>
  </span>
  <SHint v-else inline>—</SHint>
</template>
