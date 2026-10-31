<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { SAlert, SEmpty, SField, SSelect, STable, type TableColumn } from '@sub2api/ui'
import { categoryLabel, errorMessage, fetchAnalysisPrompt, fetchFlows, useModHost, type CategoryDef, type Flow } from '../host'

// Category dictionary the analysis prompt carries for a flow (GET
// /analysis/prompt?flow_id=): generated from the flow's current version.
const t = useModHost().t
const flows = ref<Flow[]>([])
const flowId = ref<number | null>(null)
const dict = ref<CategoryDef[]>([])
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    flows.value = (await fetchFlows()).filter((f) => f.version > 0)
    flowId.value = flows.value[0]?.id ?? null
  } catch (e) {
    error.value = errorMessage(e, t('settingsPage.analysis.dictFailed'))
  }
})

watch(flowId, async (id) => {
  if (!id) return
  loading.value = true
  error.value = ''
  try {
    dict.value = (await fetchAnalysisPrompt({ flow_id: id })).dict || []
  } catch (e) {
    dict.value = []
    error.value = errorMessage(e, t('settingsPage.analysis.dictFailed'))
  } finally {
    loading.value = false
  }
})

const options = computed(() => flows.value.map((f) => ({ value: f.id, label: `${f.name} v${f.version}` })))
const rows = computed(() => dict.value.map((d, i) => ({ ...d, key: `${d.category}-${i}` })))
const columns = computed<TableColumn[]>(() => [
  { key: 'category', label: t('prompt.col.category'), nowrap: true },
  { key: 'from', label: t('prompt.col.from'), ellipsis: '16rem' },
  { key: 'definition', label: t('prompt.col.definition'), ellipsis: '28rem' }
])
</script>

<template>
  <div class="mod-form">
    <SEmpty v-if="!flows.length && !error" icon="filter" :text="t('settingsPage.analysis.noFlows')" size="sm" />
    <template v-else>
      <SField v-if="flows.length" :label="t('prompt.flow')" size="sm" class="mod-set-flow">
        <SSelect v-model="flowId" :options="options" size="sm" />
      </SField>
      <SAlert v-if="error" tone="danger" dense>{{ error }}</SAlert>
      <STable v-else :columns="columns" :rows="rows" row-key="key" :loading="loading" dense>
        <template #cell-category="{ row }">
          {{ row.name || categoryLabel(row.category) }}<code class="mod-code">{{ row.category }}</code>
        </template>
        <template #cell-from="{ row }"><span :title="row.from">{{ row.from || row.source || '—' }}</span></template>
        <template #cell-definition="{ row }"><span :title="row.definition">{{ row.definition || '—' }}</span></template>
      </STable>
    </template>
  </div>
</template>

<style scoped>
.mod-set-flow {
  max-width: 20rem;
}
</style>
