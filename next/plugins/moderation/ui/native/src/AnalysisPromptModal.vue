<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SAlert, SBadge, SButton, SCode, SCopyButton, SDisclosure, SField, SHint, SModal, SSectionTitle, SSegmented, SSelect, SSpinner, STable, type TableColumn } from '@sub2api/ui'
import { categoryLabel, enumLabel } from './format'
import { fetchAnalysisPrompt, fetchAnalysisTools, useModHost } from './host'
import type { AnalysisTool } from './types'
import { useCatalog } from './catalog'
import { useAsync } from './useAsync'

// Preview of the system prompt an AI analysis sends (GET /analysis/prompt,
// by group or by flow) and the tool table (GET /analysis/tools).
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()
const host = useModHost()
const t = host.t

const by = ref<'group' | 'flow'>('group')
const groupId = ref<number>(0)
const flowId = ref<number>(0)
const catalog = useCatalog()
const flows = computed(() => catalog.state.flows.filter((x) => x.version > 0))
const tools = ref<AnalysisTool[]>([])
const prompt = useAsync(
  () => fetchAnalysisPrompt(by.value === 'group' ? { group_id: groupId.value } : { flow_id: flowId.value }),
  () => t('prompt.loadFailed')
)
const { data, loading, error } = prompt
let toolsLoaded = false

/** The tools once (kept on failure: the table is empty) and the flows of the catalog. */
async function init() {
  const [tl] = await Promise.all([toolsLoaded ? null : fetchAnalysisTools().catch(() => null), catalog.ensure()])
  if (tl) {
    tools.value = tl
    toolsLoaded = true
  }
  if (!flowId.value && flows.value.length) flowId.value = flows.value[0].id
}

/** By flow without a published flow: nothing to ask (flow_id=0 is a 400). */
const noFlow = computed(() => by.value === 'flow' && !flowId.value)
function loadPrompt() {
  if (noFlow.value) prompt.reset()
  else void prompt.reload()
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    await init()
    loadPrompt()
  },
  { immediate: true }
)
watch([by, groupId, flowId], () => props.open && loadPrompt())
// flows published (or the catalog loaded) while the modal is open
watch(flows, (list) => {
  if (!list.some((f) => f.id === flowId.value)) flowId.value = list[0]?.id ?? 0
})

const groupOptions = computed(() => [{ value: 0, label: t('flows.defaultGroup') }, ...catalog.state.groups.map((g) => ({ value: g.id, label: g.name }))])
const flowOptions = computed(() => flows.value.map((f) => ({ value: f.id, label: `${f.name} v${f.version}` })))
const byOptions = computed(() => [
  { value: 'group', label: t('prompt.byGroup') },
  { value: 'flow', label: t('prompt.byFlow'), disabled: catalog.state.loaded && !flows.value.length && by.value !== 'flow' }
])

const toolColumns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('prompt.col.name'), nowrap: true },
  { key: 'purpose', label: t('prompt.col.purpose') },
  { key: 'args', label: t('prompt.col.args'), ellipsis: '14rem' },
  { key: 'kind', label: t('prompt.col.kind'), nowrap: true }
])
const dictColumns = computed<TableColumn[]>(() => [
  { key: 'category', label: t('prompt.col.category'), nowrap: true },
  { key: 'from', label: t('prompt.col.from'), ellipsis: '14rem' },
  { key: 'definition', label: t('prompt.col.definition'), ellipsis: '24rem' }
])
const dict = computed(() => (data.value?.dict || []).map((d, i) => ({ ...d, key: `${d.category}-${i}` })))
const promptBytes = computed(() => data.value?.bytes ?? new TextEncoder().encode(data.value?.prompt || '').length)
</script>

<template>
  <SModal :open="open" :title="t('prompt.title')" width="2xl" @update:open="emit('update:open', $event)">
    <div class="mod-form">
      <SHint size="xs">{{ t('prompt.hint') }}</SHint>
      <div class="mod-form-row">
        <SField :label="t('prompt.by')" size="sm">
          <SSegmented v-model="by" size="sm" :options="byOptions" />
        </SField>
        <SField v-if="by === 'group'" :label="t('prompt.group')" size="sm" class="mod-grow">
          <SSelect v-model="groupId" :options="groupOptions" size="sm" />
        </SField>
        <SField v-else :label="t('prompt.flow')" size="sm" class="mod-grow">
          <SSelect v-model="flowId" :options="flowOptions" size="sm" :disabled="!flowOptions.length" />
        </SField>
      </div>

      <SAlert v-if="noFlow" tone="info" dense>{{ t('prompt.noPublishedFlow') }}</SAlert>
      <SSpinner v-else-if="loading && !data" block />
      <SAlert v-else-if="error" tone="danger" dense>{{ error }}</SAlert>
      <template v-else-if="data">
        <div class="mod-history-head">
          <SBadge v-if="data.flow" tone="info">{{ data.flow.name || `#${data.flow.flow_id}` }} v{{ data.flow.version }}</SBadge>
          <SHint v-else inline size="xs">{{ t('prompt.noFlow') }}</SHint>
          <template v-if="data.flow?.stages?.length">
            <span v-for="s in data.flow.stages" :key="s.stage" class="mod-sub">
              {{ t('trace.stageN', { n: s.stage }) }}: {{ s.auditors.map((a) => a.name || `#${a.auditor_id}`).join(' + ') }} ({{ enumLabel('combine', s.combine) }})
            </span>
          </template>
        </div>
        <div>
          <SSectionTitle tag="p">
            {{ t('prompt.text') }}
            <SHint inline size="xs" class="mod-chars">{{ t('prompt.bytes', { n: host.i18n.formatNumber(promptBytes) }) }}</SHint>
            <template #actions><SCopyButton :text="data.prompt" /></template>
          </SSectionTitle>
          <SCode :text="data.prompt" class="mod-text-block" />
        </div>
        <SDisclosure variant="section" :label="`${t('prompt.dict')} (${dict.length})`">
          <STable :columns="dictColumns" :rows="dict" row-key="key" dense>
            <template #cell-category="{ row }">
              {{ row.name || categoryLabel(row.category) }}<code class="mod-code">{{ row.category }}</code>
            </template>
            <template #cell-from="{ row }"><span :title="row.from">{{ row.from || row.source || '—' }}</span></template>
            <template #cell-definition="{ row }"><span :title="row.definition">{{ row.definition || '—' }}</span></template>
          </STable>
        </SDisclosure>
      </template>

      <SDisclosure variant="section" :label="`${t('prompt.tools')} (${tools.length})`">
        <STable :columns="toolColumns" :rows="tools" row-key="name" dense>
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
      </SDisclosure>
    </div>
    <template #footer>
      <SButton @click="emit('update:open', false)">{{ host.i18n.t('ui.close') }}</SButton>
    </template>
  </SModal>
</template>
