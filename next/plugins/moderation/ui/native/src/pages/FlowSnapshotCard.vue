<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SHint } from '@sub2api/ui'
import { categoryLabel, enumLabel, score, useModHost, type FlowSnapshot, type Trace } from '../host'
import { storedThresholds } from './scores'
import { stageRole } from './stagePath'

// "The flow at the time" (GET /events/:id flow_snapshot): the published
// version the record ran, its stages and auditors. The auditors' thresholds
// and questions are their current configuration; the thresholds stored on
// the record (its hits) are highlighted and shown as stored.
const props = defineProps<{ snapshot: FlowSnapshot; trace?: Trace | null }>()
const host = useModHost()
const t = host.t

type SnapAuditor = FlowSnapshot['auditors'][number]
const old = computed(() => props.snapshot.version < props.snapshot.current_version)
const stored = computed(() => storedThresholds(props.trace))
const auditorOf = (id: number) => props.snapshot.auditors.find((a) => a.id === id)

const stages = computed(() =>
  (props.snapshot.spec?.stages || []).map((st, i) => {
    const list = st.auditors.map((id) => ({ id, a: auditorOf(id) }))
    return { n: i + 1, combine: st.combine, at: st.n, role: stageRole(i + 1, list.map((x) => x.a?.type)), auditors: list }
  })
)

interface Item {
  code: string
  label?: string
  value: number
  stored: boolean
}
function items(a: SnapAuditor): Item[] {
  const used = stored.value.get(a.id) || new Map<string, number>()
  const c = a.config || {}
  const out: Item[] =
    a.type === 'typesafe'
      ? (c.questions?.items || []).map((q) => ({ code: q.category, label: q.label, value: q.threshold, stored: false }))
      : Object.entries(c.thresholds || {}).map(([code, value]) => ({ code, value, stored: false }))
  for (const [code, value] of used) {
    const it = out.find((x) => x.code === code)
    if (it) Object.assign(it, { value, stored: true })
    else out.push({ code, value, stored: true })
  }
  return out
}

function meta(a: SnapAuditor): string {
  const parts = [enumLabel('auditorType', a.type)]
  if (a.channel_name) parts.push(t('pagesP3.snapshot.channel', { name: a.channel_name }))
  if (a.rules_version) parts.push(a.rules_version)
  if (a.type === 'typesafe') parts.push(a.config?.questions ? t('auditors.questions', { n: a.config.questions.items.length }) : t('pagesP3.snapshot.defaultQuestions'))
  if (a.type === 'llm_verdict') parts.push(a.config?.flag_as_hit ? t('auditors.flagAsHit') : t('auditors.blockOnly'))
  return parts.join(' · ')
}
</script>

<template>
  <div class="mod-pg-snap">
    <div class="mod-pg-snap-head">
      <b>{{ snapshot.name || `#${snapshot.flow_id}` }}</b>
      <SBadge v-if="old" tone="warning">{{ t('pagesP3.snapshot.oldVersion', { v: snapshot.version, cur: snapshot.current_version }) }}</SBadge>
      <SBadge v-else tone="success">{{ t('pagesP3.snapshot.currentVersion', { v: snapshot.version }) }}</SBadge>
      <SHint v-if="snapshot.published_at" inline size="xs">{{ t('pagesP3.snapshot.publishedAt', { time: host.i18n.formatDateTime(snapshot.published_at) }) }}</SHint>
    </div>
    <SHint size="xs">{{ old ? t('pagesP3.snapshot.newerHint') : t('pagesP3.snapshot.configNow') }}</SHint>

    <div v-for="(s, i) in stages" :key="s.n" class="mod-pg-snap-stage">
      <div class="mod-pg-snap-stage-head">
        <b>{{ t('trace.stageN', { n: s.n }) }} · {{ t(`pagesP3.role.${s.role}`) }}</b>
        <SBadge v-if="s.auditors.length > 1" size="xs" tone="info">{{ t('pagesP3.snapshot.parallel', { n: s.auditors.length, combine: enumLabel('combine', s.combine) }) }}<template v-if="s.combine === 'at_least'"> {{ s.at }}</template></SBadge>
        <SHint inline size="xs">{{ i === 0 ? t('pagesP3.snapshot.allRequests') : t('pagesP3.snapshot.prevHit') }} · {{ i === stages.length - 1 ? t('pagesP3.snapshot.lastStage') : t('pagesP3.snapshot.nextStage', { n: s.n + 1 }) }}</SHint>
      </div>
      <div v-for="x in s.auditors" :key="x.id" class="mod-pg-snap-auditor">
        <div>
          <b v-if="x.a && !x.a.deleted">{{ x.a.name }}</b>
          <SBadge v-else size="xs" tone="gray">{{ t('pagesP3.snapshot.auditorDeleted') }}</SBadge>
          <span v-if="x.a && !x.a.deleted" class="mod-sub"> {{ meta(x.a) }}</span>
          <span class="mod-sub"> #{{ x.id }}</span>
        </div>
        <div v-if="x.a && !x.a.deleted && (x.a.type !== 'llm_verdict' || items(x.a).length)" class="mod-pg-snap-th">
          <span class="mod-sub">{{ t('pagesP3.threshold') }}</span>
          <span v-for="it in items(x.a)" :key="it.code" class="mod-pg-th" :class="it.stored ? 'mod-pg-th-stored' : ''" :title="it.stored ? t('pagesP3.snapshot.storedThreshold') : it.code">
            {{ categoryLabel(it.code, it.label) }} <b class="mod-num">{{ score(it.value) }}</b>
          </span>
          <span v-if="x.a.type === 'openai_moderation'" class="mod-sub">{{ t('pagesP3.snapshot.defaultsRest') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mod-pg-snap {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid rgb(var(--line));
  border-radius: 0.5rem;
}
.mod-pg-snap-head,
.mod-pg-snap-stage-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}
.mod-pg-snap-stage {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgb(var(--line));
}
.mod-pg-snap-stage-head {
  font-size: 0.75rem;
}
.mod-pg-snap-auditor {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
}
.mod-pg-snap-th {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  padding-left: 1rem;
}
.mod-pg-th {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: rgb(var(--surface-2));
}
.mod-pg-th-stored {
  background: rgb(234 179 8 / 0.15);
  box-shadow: 0 0 0 1px rgb(234 179 8 / 0.5);
}
</style>
