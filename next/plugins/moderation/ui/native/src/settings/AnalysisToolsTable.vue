<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { SAlert, SBadge, STable, type TableColumn } from '@sub2api/ui'
import { enumLabel, errorMessage, fetchAnalysisTools, useModHost, type AnalysisTool } from '../host'

// Read-only list of the tools the analysis model can call (GET /analysis/tools).
const t = useModHost().t
const tools = ref<AnalysisTool[]>([])
const loading = ref(true)
const error = ref('')
onMounted(async () => {
  try {
    tools.value = await fetchAnalysisTools()
  } catch (e) {
    error.value = errorMessage(e, t('settingsPage.analysis.toolsFailed'))
  } finally {
    loading.value = false
  }
})

const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('prompt.col.name'), nowrap: true },
  { key: 'purpose', label: t('prompt.col.purpose') },
  { key: 'args', label: t('prompt.col.args'), ellipsis: '14rem' },
  { key: 'kind', label: t('prompt.col.kind'), nowrap: true }
])
</script>

<template>
  <SAlert v-if="error" tone="danger" dense>{{ error }}</SAlert>
  <STable v-else :columns="columns" :rows="tools" row-key="name" :loading="loading" dense>
    <template #cell-name="{ row }"><code class="mod-code mod-code-plain">{{ row.name }}</code></template>
    <template #cell-purpose="{ row }">
      {{ row.purpose || '—' }}
      <div v-if="row.returns" class="mod-sub">{{ t('prompt.col.returns') }}: {{ row.returns }}</div>
    </template>
    <template #cell-args="{ row }"><span :title="row.args">{{ row.args || '—' }}</span></template>
    <template #cell-kind="{ row }">
      <SBadge :tone="row.kind === 'end' ? 'info' : 'gray'">{{ enumLabel('prompt.kind', row.kind) }}</SBadge>
    </template>
  </STable>
</template>
