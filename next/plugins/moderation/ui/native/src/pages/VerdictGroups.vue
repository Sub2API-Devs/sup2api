<script setup lang="ts">
import { computed } from 'vue'
import { SHint } from '@sub2api/ui'
import { categoryLabel, useModHost, type RecordVerdict } from '../host'

// Per-record verdicts of an analysis grouped like new-api analysis-verdicts:
// violations by severity (high / medium / low), false positives, unsure.
// Each record id opens the record; category, evidence and reason on hover.
const props = defineProps<{ verdicts: RecordVerdict[] }>()
const emit = defineEmits<{ (e: 'open-record', id: number): void }>()
const t = useModHost().t

const GROUPS = ['high', 'medium', 'low', 'violation', 'false_positive', 'unsure'] as const
type Group = (typeof GROUPS)[number]

function groupOf(v: RecordVerdict): Group {
  if (v.verdict !== 'violation') return v.verdict
  if (v.severity === 'high' || v.severity === 'critical') return 'high'
  return v.severity === 'medium' || v.severity === 'low' ? v.severity : 'violation'
}

const rows = computed(() =>
  GROUPS.map((g) => ({ g, items: props.verdicts.filter((v) => groupOf(v) === g) })).filter((r) => r.items.length || r.g === 'high' || r.g === 'false_positive')
)

function tip(v: RecordVerdict): string {
  return [v.category ? categoryLabel(v.category) : '', v.evidence ? `“${v.evidence}”` : '', v.reason || ''].filter(Boolean).join('\n')
}
</script>

<template>
  <dl class="mod-pg-verdicts">
    <template v-for="r in rows" :key="r.g">
      <dt :class="`mod-pg-v-${r.g}`">{{ t(`pagesP3.verdicts.${r.g}`) }}</dt>
      <dd>
        <SHint v-if="!r.items.length" inline size="xs">{{ t('pagesP3.verdicts.none') }}</SHint>
        <button v-for="v in r.items" :key="v.record_id" type="button" class="mod-pg-vrec" :title="tip(v)" @click="emit('open-record', v.record_id)">#{{ v.record_id }}</button>
      </dd>
    </template>
  </dl>
</template>

<style scoped>
.mod-pg-verdicts {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.375rem 0.75rem;
  margin: 0;
  font-size: 0.8125rem;
}
.mod-pg-verdicts dt {
  line-height: 1.5rem;
  font-size: 0.75rem;
  color: rgb(var(--fg-muted));
}
.mod-pg-verdicts dd {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  margin: 0;
}
.mod-pg-verdicts dt.mod-pg-v-high {
  color: rgb(220 38 38);
}
.mod-pg-verdicts dt.mod-pg-v-medium {
  color: rgb(234 88 12);
}
.mod-pg-verdicts dt.mod-pg-v-false_positive {
  color: rgb(22 163 74);
}
.mod-pg-vrec {
  padding: 0.0625rem 0.375rem;
  border: 0;
  border-radius: 0.25rem;
  background: rgb(var(--surface-2));
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.75rem;
  color: rgb(37 99 235);
  cursor: pointer;
}
.mod-pg-vrec:hover {
  text-decoration: underline;
}
</style>
