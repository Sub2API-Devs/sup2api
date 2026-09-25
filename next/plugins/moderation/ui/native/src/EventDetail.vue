<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SBadge, SButton, SIcon, SModal, SSpinner } from '@sub2api/ui'
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
    host.toast(errorMessage(err, t('loadFailed')), 'error')
  } finally {
    deleting.value = false
  }
}

async function copy() {
  const text = ev.value?.text
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    host.toast(t('detail.copied'), 'success')
  } catch {
    /* clipboard unavailable */
  }
}

const idOrDash = (v: number | null | undefined) => (v ? `#${v}` : '—')
</script>

<template>
  <SModal :open="open" :title="t('detail.title')" width="xl" @update:open="emit('update:open', $event)">
    <div v-if="loading" class="mod-center"><SSpinner /></div>
    <p v-else-if="error" class="mod-alert mod-alert-danger">{{ error }}</p>
    <div v-else-if="ev" class="mod-detail">
      <div class="mod-detail-head">
        <VerdictBadge :verdict="ev.verdict" />
        <SBadge v-if="ev.action" :tone="ev.action === 'deny' ? 'danger' : 'gray'">{{ enumLabel('action', ev.action) }}</SBadge>
        <SBadge v-if="ev.mode" :tone="modeTone(ev.mode)">{{ enumLabel('mode', ev.mode) }}</SBadge>
        <SBadge v-if="ev.severity" :tone="severityTone(ev.severity)">{{ t('detail.f.severity') }}: {{ enumLabel('severity', ev.severity) }}</SBadge>
        <SBadge v-if="ev.cached" tone="info">{{ t('events.cached') }}</SBadge>
        <span class="mod-detail-time muted">{{ host.i18n.formatDateTime(ev.created_at) }}</span>
      </div>

      <div v-if="ev.reason || ev.error" class="mod-detail-reason">
        <p v-if="ev.reason"><span class="muted">{{ t('detail.f.reason') }}：</span>{{ ev.reason }}</p>
        <p v-if="ev.error" class="mod-text-danger"><span class="muted">{{ t('detail.f.error') }}：</span>{{ ev.error }}</p>
      </div>

      <div class="mod-detail-section">
        <div class="mod-detail-label">
          <span class="section-title mod-mb-0">{{ t('detail.text') }}</span>
          <span v-if="ev.text_chars" class="muted mod-small">{{ t('detail.chars', { n: host.i18n.formatNumber(ev.text_chars) }) }}</span>
          <button v-if="ev.text" type="button" class="btn btn-ghost btn-sm mod-ml-auto" @click="copy"><SIcon name="copy" class="mod-icon" />{{ t('detail.copy') }}</button>
        </div>
        <pre v-if="ev.text" class="code-block mod-text-block">{{ ev.text }}</pre>
        <p v-else class="muted mod-small">{{ t('detail.textNotStored') }}</p>
      </div>

      <dl class="kv mod-detail-kv">
        <dt>{{ t('detail.f.id') }}</dt>
        <dd class="mod-num">{{ ev.id }}</dd>
        <dt>{{ t('detail.f.request') }}</dt>
        <dd><code class="mod-code mod-code-plain">{{ ev.request_id || '—' }}</code></dd>
        <dt>{{ t('detail.f.categories') }}</dt>
        <dd><CategoryChips :categories="ev.categories" wrap /></dd>
        <dt>{{ t('detail.f.user') }}</dt>
        <dd class="mod-num">{{ idOrDash(ev.user_id) }}</dd>
        <dt>{{ t('detail.f.key') }}</dt>
        <dd class="mod-num">{{ idOrDash(ev.api_key_id) }}</dd>
        <dt>{{ t('detail.f.group') }}</dt>
        <dd class="mod-num">{{ idOrDash(ev.group_id) }}</dd>
        <dt>{{ t('detail.f.model') }}</dt>
        <dd>{{ ev.model || '—' }}</dd>
        <dt>{{ t('detail.f.protocol') }}</dt>
        <dd>{{ ev.protocol || '—' }}</dd>
        <dt>{{ t('detail.f.llmModel') }}</dt>
        <dd>{{ ev.llm_model || '—' }}</dd>
        <dt>{{ t('detail.f.turns') }}</dt>
        <dd class="mod-num">{{ n(ev.turns) }}</dd>
        <dt>{{ t('detail.f.latency') }}</dt>
        <dd class="mod-num">{{ ev.latency_ms === undefined || ev.latency_ms === null ? '—' : t('ms', { n: n(ev.latency_ms) }) }}</dd>
        <dt>{{ t('detail.f.tokens') }}</dt>
        <dd class="mod-num">{{ n(ev.prompt_tokens) }} / {{ n(ev.completion_tokens) }}</dd>
        <dt>{{ t('detail.f.cached') }}</dt>
        <dd>{{ ev.cached ? t('runtime.yes') : t('runtime.no') }}</dd>
        <dt>{{ t('detail.f.hash') }}</dt>
        <dd><code class="mod-code mod-code-plain">{{ ev.text_hash || '—' }}</code></dd>
      </dl>
    </div>
    <template #footer>
      <SButton v-if="manage && ev" variant="danger" class="mod-mr-auto" :loading="deleting" @click="remove">
        <SIcon name="trash" class="mod-icon" />{{ t('detail.delete') }}
      </SButton>
      <SButton @click="close">{{ host.i18n.t('common.close') }}</SButton>
    </template>
  </SModal>
</template>
