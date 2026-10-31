<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { STooltip } from '@sub2api/ui'
import { categoryLabel, enumLabel, score, useModHost, type Outcome, type Trace } from '../host'
import { auditorOf, loadAuditors } from './catalog'
import { stageMarks, type Mark } from './stagePath'

// Per-stage results of a run on one line: "初审 ✗ 0.93 → 复核 ✓ 0.12";
// `compact` (lists) shows only the marks. Hovering a stage lists each
// auditor's top category, score and threshold.
const props = defineProps<{ trace: Trace | null | undefined; result?: string; compact?: boolean }>()
const host = useModHost()
const t = host.t
onMounted(() => loadAuditors())

const stages = computed(() => stageMarks(props.trace, (id) => auditorOf(id)?.type))
const laterSkipped = computed(() => stages.value.length > 1 && stages.value[0].auditors.some((a) => a.mark === 'hit') && stages.value.slice(1).every((s) => s.skipped))

const SYMBOL: Record<Mark, string> = { hit: '✗', pass: '✓', error: '!', skipped: '–' }

/** Best category of an outcome: first hit, else the closest to its threshold, else the top score. */
function best(o: Outcome): { category: string; label?: string; score: number; threshold?: number } | null {
  const h = o.hits?.[0] || o.top?.[0]
  if (h) return h
  return o.top_category ? { category: o.top_category, score: o.top_score } : null
}

function line(o: Outcome): string {
  const name = auditorOf(o.auditor_id)?.name || `#${o.auditor_id}`
  if (o.err) return `${name} · ${enumLabel('err', o.err)}${o.status ? ` ${o.status}` : ''}`
  if (o.skipped) return `${name} · ${t('pagesP3.mark.skipped')}`
  const b = best(o)
  if (!b) return `${name} · ${t(`pagesP3.mark.${o.hit ? 'hit' : 'pass'}`)}`
  const th = b.threshold !== undefined ? ` / ${t('pagesP3.threshold')} ${score(b.threshold)}` : ''
  return `${name} · ${categoryLabel(b.category, b.label)} ${score(b.score)}${th}`
}

const tip = (i: number) => stages.value[i].auditors.map((a) => line(a.outcome)).join('\n')
const markClass = (m: Mark) => (m === 'hit' ? (props.result === 'hit' || props.result === 'overturned' ? 'mod-pg-hit-soft' : 'mod-pg-hit') : m === 'error' ? 'mod-pg-err' : 'mod-pg-muted')
</script>

<template>
  <span v-if="stages.length" class="mod-pg-path" :class="compact ? 'mod-pg-path-compact' : ''">
    <template v-for="(s, i) in stages" :key="s.stage">
      <span v-if="i > 0" class="mod-pg-muted" aria-hidden="true">→</span>
      <STooltip :content="tip(i)">
        <span class="mod-pg-stage" tabindex="0">
          <span class="mod-pg-muted">{{ t(`pagesP3.role.${s.role}`) }}</span>
          <span v-if="s.skipped" class="mod-pg-muted">{{ t('pagesP3.mark.skipped') }}</span>
          <template v-else>
            <template v-for="(a, j) in s.auditors" :key="j">
              <span v-if="j > 0" class="mod-pg-muted" aria-hidden="true">∥</span>
              <span :class="markClass(a.mark)" :aria-label="t(`pagesP3.mark.${a.mark}`)">{{ SYMBOL[a.mark] }}</span>
              <span v-if="!compact && (a.mark === 'hit' || a.mark === 'pass') && best(a.outcome)" class="mod-pg-score">{{ score(best(a.outcome)!.score) }}</span>
            </template>
          </template>
        </span>
      </STooltip>
    </template>
    <span v-if="laterSkipped" class="mod-pg-muted">{{ t('pagesP3.laterSkipped') }}</span>
  </span>
</template>

<style scoped>
.mod-pg-path {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
}
.mod-pg-path-compact {
  flex-wrap: nowrap;
  white-space: nowrap;
}
.mod-pg-stage {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 0.25rem;
}
.mod-pg-muted {
  color: rgb(var(--fg-subtle));
}
.mod-pg-hit {
  font-weight: 600;
  color: rgb(220 38 38);
}
.mod-pg-hit-soft {
  font-weight: 600;
  color: rgb(234 88 12);
}
.mod-pg-err {
  font-weight: 600;
  color: rgb(202 138 4);
}
.mod-pg-score {
  font-variant-numeric: tabular-nums;
}
</style>
