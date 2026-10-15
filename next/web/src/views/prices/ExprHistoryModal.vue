<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCode, SCopyButton, SDescItem, SDescriptions, SEmpty, SModal, SSpinner } from '@sub2api/ui'
import { formatDateTime } from '@/utils/format'
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
</script>

<template>
  <SModal :open="open" :title="t('prices.history.title')" width="lg" @update:open="emit('update:open', $event)">
    <SSpinner v-if="loading" block />
    <div v-else-if="entry" class="space-y-3">
      <SDescriptions dense>
        <SDescItem :label="t('prices.exprHash')" :value="entry.expr_hash" mono />
        <SDescItem :label="t('common.version')">v{{ entry.expr_version ?? 1 }}</SDescItem>
        <SDescItem v-if="entry.created_at" :label="t('common.createdAt')">{{ formatDateTime(entry.created_at) }}</SDescItem>
      </SDescriptions>
      <SCode :text="entry.expression" />
    </div>
    <SEmpty v-else :text="t('prices.history.notFound')" />
    <template #footer>
      <SCopyButton v-if="entry" :text="entry.expression" variant="secondary" :label="t('common.copy')" />
      <SButton size="sm" variant="primary" @click="emit('update:open', false)">{{ t('common.close') }}</SButton>
    </template>
  </SModal>
</template>
