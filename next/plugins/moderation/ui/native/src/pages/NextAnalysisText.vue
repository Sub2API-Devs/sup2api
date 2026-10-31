<script setup lang="ts">
import { computed } from 'vue'
import { SHint, SProgress } from '@sub2api/ui'
import { useModHost, type Watch } from '../host'
import { nextAnalysis } from './watchSummary'

// "Next AI analysis x / N" of a watched user (new-api NextAnalysisCounter):
// amber within 3 violations of N; enforce users are only analyzed manually;
// N = 0 = automatic analysis off. Not compact: a progress bar and the hint.
const props = defineProps<{ watch: Pick<Watch, 'level' | 'violation_count' | 'analysis_running'>; every: number; compact?: boolean }>()
const t = useModHost().t
const s = computed(() => nextAnalysis(props.watch, props.every))
</script>

<template>
  <span v-if="s.kind === 'running'" class="mod-pg-next-run">{{ t('pagesP3.next.running') }}</span>
  <SHint v-else-if="s.kind === 'manual_only'" inline size="xs" :title="t('pagesP3.next.manualOnly')">{{ compact ? '—' : t('pagesP3.next.manualOnly') }}</SHint>
  <span v-else-if="s.kind === 'off'" class="mod-num" :title="t('pagesP3.next.offHint')">{{ s.count }}<SHint v-if="!compact" inline size="xs"> · {{ t('pagesP3.next.offHint') }}</SHint></span>
  <span v-else-if="compact" class="mod-num" :class="s.near ? 'mod-pg-next-near' : ''" :title="t('pagesP3.next.left', { n: s.left })">{{ s.count }} / {{ s.every }}</span>
  <span v-else class="mod-pg-next">
    <SProgress :value="s.count" :max="s.every" :tone="s.near ? 'warning' : 'info'" size="sm" class="mod-pg-next-bar" />
    <span class="mod-num" :class="s.near ? 'mod-pg-next-near' : ''">{{ s.count }} / {{ s.every }}</span>
    <SHint inline size="xs">{{ t('pagesP3.next.left', { n: s.left }) }}</SHint>
  </span>
</template>

<style scoped>
.mod-pg-next {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.mod-pg-next-bar {
  width: 8rem;
}
.mod-pg-next-near {
  font-weight: 600;
  color: rgb(202 138 4);
}
.mod-pg-next-run {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgb(37 99 235);
}
</style>
