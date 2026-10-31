<script setup lang="ts">
import { watch } from 'vue'
import { SAlert, SButton, SModal, SSpinner } from '@sub2api/ui'
import AnalysisCard from './AnalysisCard.vue'
import { fetchAnalysis, useModHost } from './host'
import { useAsync } from './useAsync'

// One analysis by id (GET /analyses/:id), opened from a record's AI verdict.
const props = defineProps<{ open: boolean; analysisId: number | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'open-record', id: number): void }>()
const host = useModHost()
const t = host.t

const { data, loading, error, reload } = useAsync(() => fetchAnalysis(props.analysisId!), () => t('analysis.loadFailed'))

watch(
  () => [props.open, props.analysisId] as const,
  ([open, id]) => {
    if (!open || !id || data.value?.id === id) return
    data.value = null
    void reload()
  },
  { immediate: true }
)
</script>

<template>
  <SModal :open="open" :title="t('analysis.title', { id: analysisId ?? '' })" width="xl" @update:open="emit('update:open', $event)">
    <SSpinner v-if="loading" block />
    <SAlert v-else-if="error" tone="danger">{{ error }}</SAlert>
    <AnalysisCard v-else-if="data" :analysis="data" :detail="data" default-open @open-record="emit('open-record', $event)" />
    <template #footer>
      <SButton @click="emit('update:open', false)">{{ host.i18n.t('ui.close') }}</SButton>
    </template>
  </SModal>
</template>
