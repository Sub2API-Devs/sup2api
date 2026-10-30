<script setup lang="ts">
import { ref, watch } from 'vue'
import { SAlert, SButton, SModal, SSpinner } from '@sub2api/ui'
import AnalysisCard from './AnalysisCard.vue'
import { errorMessage, fetchAnalysis, useModHost, type AnalysisDetail } from './host'

// One analysis by id (GET /analyses/:id), opened from a record's AI verdict.
const props = defineProps<{ open: boolean; analysisId: number | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'open-record', id: number): void }>()
const host = useModHost()
const t = host.t

const data = ref<AnalysisDetail | null>(null)
const loading = ref(false)
const error = ref('')

watch(
  () => [props.open, props.analysisId] as const,
  async ([open, id]) => {
    if (!open || !id || data.value?.id === id) return
    data.value = null
    loading.value = true
    error.value = ''
    try {
      data.value = await fetchAnalysis(id)
    } catch (e) {
      error.value = errorMessage(e, t('analysis.loadFailed'))
    } finally {
      loading.value = false
    }
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
