<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SAlert, SBadge, SButton, SCode, SCopyButton, SDescriptions, SHint, SModal, SSectionTitle, SSpinner, type DescItem } from '@sub2api/ui'
import ResultBadge from './ResultBadge.vue'
import CategoryChips from './CategoryChips.vue'
import TraceView from './TraceView.vue'
import VerdictBadge from './VerdictBadge.vue'
import AnalysisModal from './AnalysisModal.vue'
import FlowLabel from './pages/FlowLabel.vue'
import FlowSnapshotCard from './pages/FlowSnapshotCard.vue'
import InputMessage from './pages/InputMessage.vue'
import RecordUserCard from './pages/RecordUserCard.vue'
import UserCell from './pages/UserCell.vue'
import {
  aiVerdictTone,
  canManage,
  categoryLabel,
  deleteEvent,
  enumLabel,
  errorMessage,
  fetchEvent,
  modeTone,
  reviewEvents,
  severityTone,
  useModHost,
  type ModEventDetail,
  type ReviewStatus,
  type Watch
} from './host'

// Record detail (GET /events/:id): result, the user and their watch list
// state (changeable here), per-stage trace, the flow at the time, other
// records of the same request, text and the saved user messages; manage
// users review or delete it.
const props = defineProps<{ open: boolean; eventId: number | null }>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'deleted', id: number): void
  (e: 'reviewed', ids: number[], status: ReviewStatus): void
  (e: 'watch-changed', userId: number, w: Watch | null): void
}>()
const host = useModHost()
const t = host.t
const n = (v: number | undefined | null) => (v === undefined || v === null ? '—' : host.i18n.formatNumber(v))

const ev = ref<ModEventDetail | null>(null)
const loading = ref(false)
const error = ref('')
const busy = ref(false)
const manage = computed(() => canManage())

// The shown record: the prop, or a record opened from the AI analysis or the related list.
const currentId = ref<number | null>(props.eventId)
watch(
  () => [props.eventId, props.open] as const,
  ([id]) => (currentId.value = id)
)

watch(
  () => [props.open, currentId.value] as const,
  async ([open, id]) => {
    if (!open || id === null) return
    if (ev.value?.id === id) return
    ev.value = null
    loading.value = true
    error.value = ''
    try {
      const r = await fetchEvent(id)
      if (currentId.value === id) ev.value = r
    } catch (e) {
      error.value = errorMessage(e, t('detail.loadFailed'))
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

function close() {
  emit('update:open', false)
}

async function review(status: ReviewStatus) {
  const e = ev.value
  if (!e) return
  busy.value = true
  try {
    await reviewEvents([e.id], status)
    e.review_status = status
    emit('reviewed', [e.id], status)
    host.toast(t('review.done', { n: 1 }), 'success')
  } catch (err) {
    host.toast(errorMessage(err, t('actionFailed')), 'error')
  } finally {
    busy.value = false
  }
}

async function remove() {
  const e = ev.value
  if (!e) return
  const ok = await host.confirm({ message: t('detail.deleteConfirm'), danger: true, confirmText: t('detail.delete') })
  if (!ok) return
  busy.value = true
  try {
    await deleteEvent(e.id)
    host.toast(t('detail.deleted'), 'success')
    emit('deleted', e.id)
    ev.value = null
    close()
  } catch (err) {
    host.toast(errorMessage(err, t('actionFailed')), 'error')
  } finally {
    busy.value = false
  }
}

function onWatchChanged(w: Watch | null) {
  const e = ev.value
  if (!e) return
  e.user = { ...(e.user || { exempt: false, staff: false, blocked: false }), watch: w }
  emit('watch-changed', e.user_id, w)
}

// AI verdict of the record (§72.13.4) and the analysis that wrote it.
const hasAI = computed(() => !!ev.value?.ai_verdict)
const aiFields = computed<DescItem[]>(() => {
  const e = ev.value
  if (!e?.ai_verdict) return []
  const items: DescItem[] = [{ key: 'verdict', label: t('detail.f.aiVerdict') }]
  if (e.ai_severity) items.push({ key: 'severity', label: t('detail.f.aiSeverity') })
  if (e.ai_category) items.push({ key: 'category', label: t('detail.f.aiCategory'), value: categoryLabel(e.ai_category) })
  if (e.ai_evidence) items.push({ key: 'evidence', label: t('detail.f.aiEvidence'), full: true })
  if (e.ai_reason) items.push({ key: 'reason', label: t('detail.f.aiReason'), value: e.ai_reason, full: true })
  return items
})
const analysisOpen = ref(false)
function openRecord(id: number) {
  analysisOpen.value = false
  currentId.value = id
}

const related = computed(() => ev.value?.related || [])

const fields = computed<DescItem[]>(() => {
  const e = ev.value
  if (!e) return []
  const items: DescItem[] = [
    { key: 'id', label: t('detail.f.id'), value: String(e.id) },
    { key: 'request', label: t('detail.f.request'), value: e.request_id || '', mono: true, copyable: true },
    { key: 'categories', label: t('detail.f.categories'), full: true },
    { key: 'flow', label: t('detail.f.flow') },
    { key: 'model', label: t('detail.f.model'), value: e.model || '' },
    { key: 'protocol', label: t('detail.f.protocol'), value: e.protocol || '' },
    { key: 'latency', label: t('detail.f.latency'), value: t('ms', { n: n(e.latency_ms) }) + (e.queue_ms ? ` (${t('detail.queued', { n: n(e.queue_ms) })})` : '') },
    { key: 'counted', label: t('detail.f.counted'), value: e.counted ? t('yes') : t('no') },
    { key: 'keep', label: t('detail.f.keepUntil'), value: e.keep_until ? host.i18n.formatDateTime(e.keep_until) : '' }
  ]
  if (e.reviewed_at) items.push({ key: 'reviewed', label: t('detail.f.reviewed') })
  if (e.llm_model) items.push({ key: 'llm', label: t('detail.f.llmModel'), value: e.llm_model })
  return items
})
</script>

<template>
  <SModal :open="open" :title="t('detail.title')" width="xl" @update:open="emit('update:open', $event)">
    <SSpinner v-if="loading" block />
    <SAlert v-else-if="error" tone="danger">{{ error }}</SAlert>
    <div v-else-if="ev" class="mod-detail">
      <div class="mod-detail-head">
        <ResultBadge :result="ev.result" />
        <VerdictBadge :event="ev" />
        <SBadge v-if="ev.timing">{{ enumLabel('timing', ev.timing) }}</SBadge>
        <SBadge v-if="ev.mode" :tone="modeTone(ev.mode)">{{ enumLabel('mode', ev.mode) }}</SBadge>
        <SBadge v-if="ev.severity" :tone="severityTone(ev.severity)">{{ t('detail.f.severity') }}: {{ enumLabel('severity', ev.severity) }}</SBadge>
        <SHint inline size="xs" class="mod-detail-time">{{ host.i18n.formatDateTime(ev.created_at) }}</SHint>
      </div>

      <SAlert v-if="ev.reason" tone="neutral" :icon="false" :title="t('detail.f.reason')">{{ ev.reason }}</SAlert>
      <SAlert v-if="ev.error" tone="danger" :title="t('detail.f.error')"><span class="mod-prewrap">{{ ev.error }}</span></SAlert>

      <div>
        <SSectionTitle tag="p">{{ t('pagesP3.user.title') }}</SSectionTitle>
        <RecordUserCard :event="ev" @watch-changed="onWatchChanged" />
      </div>

      <div v-if="hasAI">
        <SSectionTitle tag="p">
          {{ t('detail.ai') }}
          <template v-if="ev.ai_analysis_id" #actions>
            <SButton size="sm" variant="ghost" icon="eyeglass" @click="analysisOpen = true">{{ t('detail.viewAnalysis') }}</SButton>
          </template>
        </SSectionTitle>
        <SDescriptions :items="aiFields" :columns="2" dense>
          <template #item-verdict><SBadge :tone="aiVerdictTone(ev.ai_verdict)">{{ enumLabel('aiVerdict', ev.ai_verdict) }}</SBadge></template>
          <template #item-severity><SBadge :tone="severityTone(ev.ai_severity || '')">{{ enumLabel('severity', ev.ai_severity) }}</SBadge></template>
          <template #item-evidence><q class="mod-evidence mod-prewrap">{{ ev.ai_evidence }}</q></template>
        </SDescriptions>
      </div>

      <div v-if="ev.trace">
        <SSectionTitle tag="p">{{ t('detail.trace') }}</SSectionTitle>
        <TraceView :trace="ev.trace" />
      </div>

      <div v-if="ev.flow_snapshot">
        <SSectionTitle tag="p">{{ t('pagesP3.snapshot.title') }}</SSectionTitle>
        <FlowSnapshotCard :snapshot="ev.flow_snapshot" :trace="ev.trace" />
      </div>

      <div v-if="related.length">
        <SSectionTitle tag="p">
          {{ t('pagesP3.related.title') }}
          <SHint inline size="xs" class="mod-chars">{{ t('pagesP3.related.hint') }}</SHint>
        </SSectionTitle>
        <ul class="mod-pg-related">
          <li v-for="r in related" :key="r.id">
            <button type="button" class="mod-pg-related-item" @click="currentId = r.id">
              <span class="mod-num">#{{ r.id }}</span>
              <ResultBadge :result="r.result" />
              <span class="mod-sub">{{ enumLabel('timing', r.timing) }}</span>
              <FlowLabel :flow-id="r.flow_id" :version="r.flow_version" />
              <CategoryChips :categories="r.hit_categories" />
              <SHint inline size="xs" class="mod-ml-auto">{{ host.i18n.formatDateTime(r.created_at) }}</SHint>
            </button>
          </li>
        </ul>
      </div>

      <div>
        <SSectionTitle tag="p">
          {{ t('detail.text') }}
          <SHint v-if="ev.text_chars" inline size="xs" class="mod-chars">{{ t('detail.chars', { n: host.i18n.formatNumber(ev.text_chars) }) }}</SHint>
          <SHint v-if="ev.image_count" inline size="xs" class="mod-chars">{{ t('events.images', { n: ev.image_count }) }}</SHint>
          <template #actions>
            <SCopyButton v-if="ev.text" :text="ev.text" />
          </template>
        </SSectionTitle>
        <SCode v-if="ev.text" :text="ev.text" class="mod-text-block" />
        <SHint v-else size="xs">{{ t('detail.textNotStored') }}</SHint>
      </div>

      <InputMessage v-if="ev.input_message_size" :event-id="ev.id" :size="ev.input_message_size" />

      <SDescriptions :items="fields" :columns="2" dense>
        <template #item-categories><CategoryChips :categories="ev.hit_categories" wrap /></template>
        <template #item-flow><FlowLabel :flow-id="ev.flow_id" :version="ev.flow_version" /></template>
        <template #item-reviewed>{{ ev.reviewed_at ? host.i18n.formatDateTime(ev.reviewed_at) : '' }} <UserCell v-if="ev.reviewed_by" :id="ev.reviewed_by" /></template>
      </SDescriptions>
    </div>
    <template #footer>
      <template v-if="manage && ev">
        <SButton variant="danger" icon="trash" class="mod-mr-auto" :loading="busy" @click="remove">{{ t('detail.delete') }}</SButton>
        <SButton v-if="ev.review_status !== 'false_positive'" :loading="busy" @click="review('false_positive')">{{ t('review.falsePositive') }}</SButton>
        <SButton v-if="ev.review_status !== 'confirmed'" variant="danger" :loading="busy" @click="review('confirmed')">{{ t('review.confirmed') }}</SButton>
        <SButton v-if="ev.review_status !== 'pending'" variant="ghost" :loading="busy" @click="review('pending')">{{ t('review.reset') }}</SButton>
      </template>
      <SButton @click="close">{{ host.i18n.t('ui.close') }}</SButton>
    </template>
  </SModal>
  <AnalysisModal v-model:open="analysisOpen" :analysis-id="ev?.ai_analysis_id ?? null" @open-record="openRecord" />
</template>

<style scoped>
.mod-pg-related {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.mod-pg-related-item {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border: 1px solid rgb(var(--line));
  border-radius: 0.375rem;
  background: none;
  text-align: start;
  font-size: 0.8125rem;
  cursor: pointer;
}
.mod-pg-related-item:hover {
  background: rgb(var(--surface-2));
}
</style>
