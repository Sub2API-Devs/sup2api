<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SModal, SSpinner, toast } from '@sub2api/ui'
import { copyText, formatDateTime } from '@/utils/format'
import { notifyError } from '@/utils/errors'

// Shows the expression stored under an expr_hash (GET /prices/history/:hash).
const props = defineProps<{ open: boolean; hash: string | null | undefined }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()
const { t } = useI18n()

interface HistoryEntry {
  expr_hash: string
  expression: string
  expr_version?: number
  created_at?: string
}

const loading = ref(false)
const entry = ref<HistoryEntry | null>(null)

watch(
  () => [props.open, props.hash] as const,
  async ([open, hash]) => {
    if (!open || !hash) return
    if (entry.value?.expr_hash === hash) return
    loading.value = true
    entry.value = null
    try {
      const r = await api.get<HistoryEntry | HistoryEntry[]>(`/prices/history/${encodeURIComponent(hash)}`)
      entry.value = Array.isArray(r) ? r[0] || null : r
    } catch (e) {
      notifyError(e)
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

async function copy() {
  if (entry.value && (await copyText(entry.value.expression))) toast(t('common.copied'), 'success')
}
</script>

<template>
  <SModal :open="open" :title="t('prices.history.title')" width="lg" @update:open="emit('update:open', $event)">
    <div v-if="loading" class="py-8 text-center"><SSpinner /></div>
    <div v-else-if="entry" class="space-y-3">
      <dl class="kv">
        <dt>{{ t('prices.exprHash') }}</dt>
        <dd class="font-mono text-xs">{{ entry.expr_hash }}</dd>
        <dt>{{ t('common.version') }}</dt>
        <dd>v{{ entry.expr_version ?? 1 }}</dd>
        <template v-if="entry.created_at">
          <dt>{{ t('common.createdAt') }}</dt>
          <dd>{{ formatDateTime(entry.created_at) }}</dd>
        </template>
      </dl>
      <pre class="code-block">{{ entry.expression }}</pre>
    </div>
    <p v-else class="muted py-6 text-center text-sm">{{ t('prices.history.notFound') }}</p>
    <template #footer>
      <SButton v-if="entry" size="sm" @click="copy">{{ t('common.copy') }}</SButton>
      <SButton size="sm" variant="primary" @click="emit('update:open', false)">{{ t('common.close') }}</SButton>
    </template>
  </SModal>
</template>
