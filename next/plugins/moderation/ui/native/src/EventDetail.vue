<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SAlert, SBadge, SButton, SCode, SCopyButton, SDescriptions, SHint, SModal, SSectionTitle, SSpinner, type DescItem } from '@sub2api/ui'
import ResultBadge from './ResultBadge.vue'
import CategoryChips from './CategoryChips.vue'
import TraceView from './TraceView.vue'
import {
  canManage,
  deleteEvent,
  enumLabel,
  errorMessage,
  fetchEvent,
  fetchEventInput,
  modeTone,
  reviewEvents,
  reviewTone,
  severityTone,
  useModHost,
  type ModEventDetail,
  type ReviewStatus
} from './host'

// Record detail (GET /events/:id): result, per-stage trace, text, the raw
// user messages on demand; manage users review or delete it.
const props = defineProps<{ open: boolean; eventId: number | null }>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'deleted', id: number): void
  (e: 'reviewed', ids: number[], status: ReviewStatus): void
}>()
const host = useModHost()
const t = host.t
const n = (v: number | undefined | null) => (v === undefined || v === null ? '—' : host.i18n.formatNumber(v))

const ev = ref<ModEventDetail | null>(null)
const loading = ref(false)
const error = ref('')
const busy = ref(false)
const manage = computed(() => canManage())
const input = ref<string | null>(null)
const inputLoading = ref(false)

watch(
  () => [props.open, props.eventId] as const,
  async ([open, id]) => {
    if (!open || id === null) return
    if (ev.value?.id === id) return
    ev.value = null
    input.value = null
    loading.value = true
    error.value = ''
    try {
      const r = await fetchEvent(id)
      if (props.eventId === id) ev.value = r
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

async function loadInput() {
  const e = ev.value
  if (!e) return
  inputLoading.value = true
  try {
    const r = await fetchEventInput(e.id)
    input.value = r.messages ? JSON.stringify(r.messages, null, 2) : ''
  } catch (err) {
    host.toast(errorMessage(err, t('actionFailed')), 'error')
  } finally {
    inputLoading.value = false
  }
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

const idOrDash = (v: number | null | undefined) => (v ? `#${v}` : '—')

const fields = computed<DescItem[]>(() => {
  const e = ev.value
  if (!e) return []
  const items: DescItem[] = [
    { key: 'id', label: t('detail.f.id'), value: String(e.id) },
    { key: 'request', label: t('detail.f.request'), value: e.request_id || '', mono: true, copyable: true },
    { key: 'categories', label: t('detail.f.categories'), full: true },
    { key: 'user', label: t('detail.f.user'), value: idOrDash(e.user_id) },
    { key: 'key', label: t('detail.f.key'), value: idOrDash(e.api_key_id) },
    { key: 'group', label: t('detail.f.group'), value: idOrDash(e.group_id) },
    { key: 'flow', label: t('detail.f.flow'), value: e.flow_id ? `#${e.flow_id} v${e.flow_version}` : t('events.legacy') },
    { key: 'model', label: t('detail.f.model'), value: e.model || '' },
    { key: 'protocol', label: t('detail.f.protocol'), value: e.protocol || '' },
    { key: 'latency', label: t('detail.f.latency'), value: t('ms', { n: n(e.latency_ms) }) + (e.queue_ms ? ` (${t('detail.queued', { n: n(e.queue_ms) })})` : '') },
    { key: 'counted', label: t('detail.f.counted'), value: e.counted ? t('yes') : t('no') },
    { key: 'keep', label: t('detail.f.keepUntil'), value: e.keep_until ? host.i18n.formatDateTime(e.keep_until) : '' }
  ]
  if (e.reviewed_at) items.push({ key: 'reviewed', label: t('detail.f.reviewed'), value: `${host.i18n.formatDateTime(e.reviewed_at)} ${idOrDash(e.reviewed_by)}` })
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
        <SBadge v-if="ev.timing">{{ enumLabel('timing', ev.timing) }}</SBadge>
        <SBadge v-if="ev.mode" :tone="modeTone(ev.mode)">{{ enumLabel('mode', ev.mode) }}</SBadge>
        <SBadge v-if="ev.severity" :tone="severityTone(ev.severity)">{{ t('detail.f.severity') }}: {{ enumLabel('severity', ev.severity) }}</SBadge>
        <SBadge :tone="reviewTone(ev.review_status)">{{ enumLabel('review', ev.review_status) }}</SBadge>
        <SHint inline size="xs" class="mod-detail-time">{{ host.i18n.formatDateTime(ev.created_at) }}</SHint>
      </div>

      <SAlert v-if="ev.reason" tone="neutral" :icon="false" :title="t('detail.f.reason')">{{ ev.reason }}</SAlert>
      <SAlert v-if="ev.error" tone="danger" :title="t('detail.f.error')"><span class="mod-prewrap">{{ ev.error }}</span></SAlert>

      <div v-if="ev.trace">
        <SSectionTitle tag="p">{{ t('detail.trace') }}</SSectionTitle>
        <TraceView :trace="ev.trace" />
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

      <div v-if="ev.input_message_size">
        <SSectionTitle tag="p">
          {{ t('detail.input') }}
          <SHint inline size="xs" class="mod-chars">{{ t('detail.bytes', { n: host.i18n.formatNumber(ev.input_message_size) }) }}</SHint>
          <template #actions>
            <SButton v-if="input === null" size="sm" :loading="inputLoading" @click="loadInput">{{ t('detail.loadInput') }}</SButton>
            <SCopyButton v-else-if="input" :text="input" />
          </template>
        </SSectionTitle>
        <SCode v-if="input" :text="input" class="mod-text-block" />
      </div>

      <SDescriptions :items="fields" :columns="2" dense>
        <template #item-categories><CategoryChips :categories="ev.hit_categories" wrap /></template>
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
</template>
