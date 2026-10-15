<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SAlert, SBadge, SButton, SCode, SCopyButton, SDescriptions, SHint, SModal, SSectionTitle, SSpinner, type DescItem } from '@sub2api/ui'
import VerdictBadge from './VerdictBadge.vue'
import CategoryChips from './CategoryChips.vue'
import {
  canManage,
  deleteEvent,
  enumLabel,
  errorMessage,
  fetchEvent,
  modeTone,
  severityTone,
  useModHost,
  type ModEventDetail
} from './host'

// Record detail (GET /events/:id): full text and every field; manage users can delete it.
const props = defineProps<{ open: boolean; eventId: number | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'deleted', id: number): void }>()
const host = useModHost()
const t = host.t
const n = (v: number | undefined | null) => (v === undefined || v === null ? '—' : host.i18n.formatNumber(v))

const ev = ref<ModEventDetail | null>(null)
const loading = ref(false)
const error = ref('')
const deleting = ref(false)
const manage = computed(() => canManage())

watch(
  () => [props.open, props.eventId] as const,
  async ([open, id]) => {
    if (!open || id === null) return
    if (ev.value?.id === id) return
    ev.value = null
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

async function remove() {
  const e = ev.value
  if (!e) return
  const ok = await host.confirm({ message: t('detail.deleteConfirm'), danger: true, confirmText: t('detail.delete') })
  if (!ok) return
  deleting.value = true
  try {
    await deleteEvent(e.id)
    host.toast(t('detail.deleted'), 'success')
    emit('deleted', e.id)
    ev.value = null
    close()
  } catch (err) {
    host.toast(errorMessage(err, t('actionFailed')), 'error')
  } finally {
    deleting.value = false
  }
}

const idOrDash = (v: number | null | undefined) => (v ? `#${v}` : '—')

const fields = computed<DescItem[]>(() => {
  const e = ev.value
  if (!e) return []
  return [
    { key: 'id', label: t('detail.f.id'), value: String(e.id) },
    { key: 'request', label: t('detail.f.request'), value: e.request_id || '', mono: true, copyable: true },
    { key: 'categories', label: t('detail.f.categories'), full: true },
    { key: 'user', label: t('detail.f.user'), value: idOrDash(e.user_id) },
    { key: 'key', label: t('detail.f.key'), value: idOrDash(e.api_key_id) },
    { key: 'group', label: t('detail.f.group'), value: idOrDash(e.group_id) },
    { key: 'model', label: t('detail.f.model'), value: e.model || '' },
    { key: 'protocol', label: t('detail.f.protocol'), value: e.protocol || '' },
    { key: 'llmModel', label: t('detail.f.llmModel'), value: e.llm_model || '' },
    { key: 'turns', label: t('detail.f.turns'), value: n(e.turns) },
    { key: 'latency', label: t('detail.f.latency'), value: e.latency_ms === undefined || e.latency_ms === null ? '' : t('ms', { n: n(e.latency_ms) }) },
    { key: 'tokens', label: t('detail.f.tokens'), value: `${n(e.prompt_tokens)} / ${n(e.completion_tokens)}` },
    { key: 'cached', label: t('detail.f.cached'), value: e.cached ? t('runtime.yes') : t('runtime.no') },
    { key: 'hash', label: t('detail.f.hash'), value: e.text_hash || '', mono: true, copyable: true, full: true }
  ]
})
</script>

<template>
  <SModal :open="open" :title="t('detail.title')" width="xl" @update:open="emit('update:open', $event)">
    <SSpinner v-if="loading" block />
    <SAlert v-else-if="error" tone="danger">{{ error }}</SAlert>
    <div v-else-if="ev" class="mod-detail">
      <div class="mod-detail-head">
        <VerdictBadge :verdict="ev.verdict" />
        <SBadge v-if="ev.action" :tone="ev.action === 'deny' ? 'danger' : 'gray'">{{ enumLabel('action', ev.action) }}</SBadge>
        <SBadge v-if="ev.mode" :tone="modeTone(ev.mode)">{{ enumLabel('mode', ev.mode) }}</SBadge>
        <SBadge v-if="ev.severity" :tone="severityTone(ev.severity)">{{ t('detail.f.severity') }}: {{ enumLabel('severity', ev.severity) }}</SBadge>
        <SBadge v-if="ev.cached" tone="info">{{ t('events.cached') }}</SBadge>
        <SHint inline size="xs" class="mod-detail-time">{{ host.i18n.formatDateTime(ev.created_at) }}</SHint>
      </div>

      <SAlert v-if="ev.reason" tone="neutral" :icon="false" :title="t('detail.f.reason')">{{ ev.reason }}</SAlert>
      <SAlert v-if="ev.error" tone="danger" :title="t('detail.f.error')"><span class="mod-prewrap">{{ ev.error }}</span></SAlert>

      <div>
        <SSectionTitle tag="p">
          {{ t('detail.text') }}
          <SHint v-if="ev.text_chars" inline size="xs" class="mod-chars">{{ t('detail.chars', { n: host.i18n.formatNumber(ev.text_chars) }) }}</SHint>
          <template #actions>
            <SCopyButton v-if="ev.text" :text="ev.text" />
          </template>
        </SSectionTitle>
        <SCode v-if="ev.text" :text="ev.text" class="mod-text-block" />
        <SHint v-else size="xs">{{ t('detail.textNotStored') }}</SHint>
      </div>

      <SDescriptions :items="fields" :columns="2" dense>
        <template #item-categories><CategoryChips :categories="ev.categories" wrap /></template>
      </SDescriptions>
    </div>
    <template #footer>
      <SButton v-if="manage && ev" variant="danger" icon="trash" class="mod-mr-auto" :loading="deleting" @click="remove">{{ t('detail.delete') }}</SButton>
      <SButton @click="close">{{ host.i18n.t('ui.close') }}</SButton>
    </template>
  </SModal>
</template>
