<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  SAlert,
  SBadge,
  SButton,
  SCard,
  SDropdown,
  SHint,
  SRowAction,
  STable,
  STableColumnSettings,
  useTableColumns,
  type MenuAction,
  type TableColumn
} from '@sub2api/ui'
import AuditorEditModal from './AuditorEditModal.vue'
import AuditorTryModal from './AuditorTryModal.vue'
import EnabledBadge from './EnabledBadge.vue'
import { llmTextOnly } from './auditorForm'
import { useCatalog } from './catalog'
import { hasQuestions } from './flowOps'
import { enumLabel, money, num } from './format'
import { canManage, confirmDelete, deleteAuditor, errorMessage, fetchDefaults, useModHost } from './host'
import type { Auditor, AuditorTryTarget } from './types'
import { thresholdPresetOf } from './thresholdPresets'
import { useAsync } from './useAsync'

// Auditors (CONTRACTS §72.6, new-api auditors): OpenAI moderation thresholds
// (with presets), Jev question tables, LLM verdict prompts, LLM question
// tables; each bound to one channel of its type, with today's calls and cost. Auditors and channels come
// from the shared catalog; a change refreshes both (an auditor shows its
// channel, a channel lists its auditors). Read users open an auditor read-only.
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

const catalog = useCatalog()
const rows = computed(() => catalog.state.auditors)
const channels = computed(() => catalog.state.channels)
const defaults = useAsync(fetchDefaults, () => t('auditors.loadFailed'))
const loading = computed(() => catalog.state.loading || defaults.loading.value)
const error = computed(() => (catalog.state.errors.auditors ? errorMessage(catalog.state.errors.auditors, t('auditors.loadFailed')) : defaults.error.value))
const refreshLists = () => catalog.refresh(['auditors', 'channels'])
const reload = () => Promise.all([refreshLists(), defaults.reload()])
onMounted(() => !defaults.data.value && defaults.reload())
defineExpose({ reload })

const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('auditors.col.name'), nowrap: true, hideable: false, mobile: 'title' },
  { key: 'type', label: t('auditors.col.type'), nowrap: true, mobile: 'meta' },
  { key: 'channel', label: t('auditors.col.channel'), nowrap: true, mobile: 'meta' },
  { key: 'summary', label: t('auditors.col.summary'), grow: true, mobile: 'subtitle' },
  { key: 'today', label: t('auditors.col.today'), align: 'right', nowrap: true, mobile: 'meta' },
  { key: 'usable', label: t('auditors.col.usable'), nowrap: true, hideable: false, mobile: 'status' },
  { key: 'actions', label: '', align: 'right', nowrap: true, hideable: false }
])
const columnState = useTableColumns(columns, 'moderation-auditors')

/** Today's calls not priced, the tooltip of today's cost. */
const todayTitle = (a: Auditor) => (a.today?.cost.unpriced_calls ? t('channels.unpricedN', { n: num(a.today.cost.unpriced_calls) }) : undefined)

function summary(a: Auditor): string {
  const c = a.config || {}
  const d = defaults.data.value
  if (a.type === 'openai_moderation') {
    const preset = d && thresholdPresetOf(d, c.thresholds || {})
    return preset ? t(`auditors.preset.${preset}`) : t('auditors.overrides', { n: Object.keys(c.thresholds || {}).length })
  }
  // an LLM auditor reviews images unless its switch is off
  const textOnly = llmTextOnly(a.type, c) && t('auditors.textOnly')
  if (hasQuestions(a.type)) {
    return [a.rules_version, t('auditors.questions', { n: c.questions?.items?.length || d?.default.items.length || 0 }), textOnly].filter(Boolean).join(' · ')
  }
  return [c.flag_as_hit ? t('auditors.flagAsHit') : t('auditors.blockOnly'), textOnly].filter(Boolean).join(' · ')
}

const editOpen = ref(false)
const editing = ref<Auditor | null>(null)
function openEdit(a: Auditor | null) {
  editing.value = a
  editOpen.value = true
}

const tryOpen = ref(false)
const tryTarget = ref<AuditorTryTarget | null>(null)
function openTry(target: AuditorTryTarget) {
  tryTarget.value = target
  tryOpen.value = true
}

/** The row's "more" menu: the danger action. */
const moreActions = computed<MenuAction[]>(() => [{ key: 'delete', label: t('delete'), danger: true }])
const remove = (a: Auditor) => confirmDelete(t('auditors.deleteConfirm', { name: a.name }), () => deleteAuditor(a.id), () => void refreshLists())
</script>

<template>
  <div>
    <SHint class="mod-hint">{{ t('auditors.hint') }}</SHint>
    <div class="mod-toolbar">
      <STableColumnSettings :state="columnState" />
      <SButton v-if="manage" variant="primary" size="sm" icon="plus" :disabled="!channels.length" :title="channels.length ? '' : t('auditors.needChannel')" @click="openEdit(null)">
        {{ t('auditors.add') }}
      </SButton>
    </div>
    <SAlert v-if="error" tone="danger" class="mod-block">{{ error }}</SAlert>

    <SCard :padded="false">
      <STable :columns="columnState.visibleColumns.value" :rows="rows" :loading="loading" :empty-text="t('auditors.empty')" dense>
        <template #cell-name="{ row }">
          <span class="mod-cell-line">
            <span class="mod-ellipsis" :title="row.name">{{ row.name }}</span>
            <SHint inline size="xs" class="mod-num">#{{ row.id }}</SHint>
          </span>
        </template>
        <template #cell-type="{ row }">{{ enumLabel('auditorType', row.type) }}</template>
        <template #cell-channel="{ row }">
          <span class="mod-cell-line">
            <span class="mod-ellipsis">{{ row.channel_name || catalog.channelName(row.channel_id) }}</span>
            <EnabledBadge v-if="!(row.channel_enabled ?? catalog.channel(row.channel_id)?.enabled)" :enabled="false" :missing="!row.channel_name && !catalog.channel(row.channel_id)" size="xs" />
          </span>
        </template>
        <template #cell-summary="{ row }"><span :title="summary(row)">{{ summary(row) }}</span></template>
        <template #cell-today="{ row }">
          <span v-if="row.today?.calls" class="mod-num" :title="todayTitle(row)">{{ money(row.today.cost.cost) }} · {{ t('cost.calls', { n: num(row.today.calls) }) }}</span>
          <SHint v-else inline>—</SHint>
        </template>
        <template #cell-usable="{ row }">
          <SBadge :tone="row.usable ? 'success' : 'warning'" dot>{{ row.usable ? t('auditors.ready') : t('auditors.notReady') }}</SBadge>
        </template>
        <template #cell-actions="{ row }">
          <span v-if="manage" class="mod-cell-line">
            <SRowAction :label="t('auditors.try')" @click="openTry({ id: row.id, name: row.name, type: row.type, config: row.config })" />
            <SRowAction :label="t('edit')" @click="openEdit(row)" />
            <SDropdown :actions="moreActions" @select="remove(row)" />
          </span>
          <SRowAction v-else :label="t('view')" @click="openEdit(row)" />
        </template>
      </STable>
    </SCard>

    <AuditorEditModal v-model:open="editOpen" :auditor="editing" :defaults="defaults.data.value" :readonly="!manage" @saved="refreshLists" @try="openTry" />
    <AuditorTryModal v-model:open="tryOpen" :target="tryTarget" />
  </div>
</template>
