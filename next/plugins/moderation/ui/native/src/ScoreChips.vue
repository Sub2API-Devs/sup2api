<script setup lang="ts">
import { computed } from 'vue'
import { SChipList, SHint, type StatusTone } from '@sub2api/ui'
import { categoryLabel, score } from './format'
import { useModHost } from './host'
import type { Trace } from './types'
import { scoreLevel, traceScores, type ScoreLevel } from './trace'

// Category scores of a record on one line, highest first: red above the
// threshold, amber near it (≥ 80 %); the first `max` (1) as chips, the rest
// behind "+N". The exact score / threshold is in each chip's tooltip.
const props = withDefaults(defineProps<{ trace?: Trace | null; max?: number }>(), { max: 1 })
const t = useModHost().t

const TONE: Record<ScoreLevel, StatusTone> = { over: 'danger', near: 'warning', low: 'neutral' }

const chips = computed(() =>
  traceScores(props.trace).map((s) => {
    const level = scoreLevel(s)
    const threshold = s.threshold ? ` / ${score(s.threshold)}` : ''
    const state = level === 'low' ? '' : ` · ${t(`scoreLevel.${level}`)}`
    return { key: s.category, tone: TONE[level], label: `${categoryLabel(s.category, s.label)} ${score(s.score)}`, title: `${s.category}: ${score(s.score)}${threshold}${state}` }
  })
)
</script>

<template>
  <SChipList v-if="chips.length" :items="chips" :max="max" />
  <SHint v-else inline>—</SHint>
</template>
