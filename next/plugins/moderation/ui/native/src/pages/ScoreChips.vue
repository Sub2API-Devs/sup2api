<script setup lang="ts">
import { SChip, SHint } from '@sub2api/ui'
import { categoryLabel, score, useModHost } from '../host'
import { scoreTone, type ScoreItem, type ScoreTone } from './scores'

// Categories closest to their thresholds (new-api shared/score-chips.tsx).
// Default: one line of chips (red over, amber near the threshold); `rows`:
// one row per category with a score bar and a tick at the threshold.
defineProps<{ scores: ScoreItem[]; rows?: boolean }>()
const t = useModHost().t

const CHIP_TONE: Record<ScoreTone, 'danger' | 'warning' | 'neutral'> = { over: 'danger', near: 'warning', low: 'neutral' }
const pct = (v: number) => `${Math.round(Math.min(Math.max(v, 0), 1) * 100)}%`
const name = (s: ScoreItem) => categoryLabel(s.category, s.label)
const figures = (s: ScoreItem) => `${score(s.score)} / ${score(s.threshold)}`
</script>

<template>
  <SHint v-if="!scores.length" inline>—</SHint>
  <ul v-else-if="rows" class="mod-pg-score-rows">
    <li v-for="s in scores" :key="s.category">
      <span class="mod-pg-score-name" :class="scoreTone(s) === 'over' ? 'mod-pg-over' : ''">
        {{ name(s) }}<code v-if="name(s) !== s.category" class="mod-pg-score-code">{{ s.category }}</code>
      </span>
      <span class="mod-pg-bar" :data-tone="scoreTone(s)">
        <span class="mod-pg-bar-fill" :style="{ width: pct(s.score) }" />
        <span class="mod-pg-bar-tick" :style="{ left: pct(s.threshold) }" />
        <span class="mod-pg-bar-text">{{ figures(s) }}</span>
      </span>
      <span v-if="scoreTone(s) !== 'low'" class="mod-pg-score-state" :class="scoreTone(s) === 'over' ? 'mod-pg-over' : 'mod-pg-near'">{{ t(`pagesP3.score.${scoreTone(s)}`) }}</span>
    </li>
  </ul>
  <span v-else class="mod-pg-chips">
    <SChip v-for="s in scores" :key="s.category" size="xs" :tone="CHIP_TONE[scoreTone(s)]" :title="`${name(s)} (${s.category}) ${figures(s)}`">{{ name(s) }}</SChip>
  </span>
</template>

<style scoped>
.mod-pg-chips {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 0.25rem;
  max-width: 20rem;
  overflow: hidden;
}
.mod-pg-score-rows {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.75rem;
}
.mod-pg-score-rows li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.mod-pg-score-name {
  min-width: 7rem;
}
.mod-pg-score-code {
  margin-left: 0.25rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.625rem;
  color: rgb(var(--fg-subtle));
}
.mod-pg-over {
  font-weight: 600;
  color: rgb(220 38 38);
}
.mod-pg-near {
  color: rgb(234 88 12);
}
.mod-pg-bar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 8rem;
  height: 18px;
  overflow: hidden;
  border: 1px solid rgb(var(--line));
  border-radius: 9999px;
  background: rgb(var(--surface-2));
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.mod-pg-bar[data-tone='over'] {
  border-color: rgb(220 38 38);
}
.mod-pg-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: rgb(163 163 163 / 0.45);
}
.mod-pg-bar[data-tone='over'] .mod-pg-bar-fill {
  background: rgb(220 38 38 / 0.4);
}
.mod-pg-bar[data-tone='near'] .mod-pg-bar-fill {
  background: rgb(249 115 22 / 0.35);
}
.mod-pg-bar-tick {
  position: absolute;
  inset: 0 auto 0 auto;
  width: 2px;
  margin-left: -1px;
  background: rgb(var(--fg) / 0.45);
}
.mod-pg-bar-text {
  position: relative;
}
</style>
