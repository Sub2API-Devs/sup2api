<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { SAlert, SBadge, SButton, SCard, SHint, STable, type TableColumn } from '@sub2api/ui'
import AuditorEditModal from './AuditorEditModal.vue'
import AuditorTryModal from './AuditorTryModal.vue'
import EnabledBadge from './EnabledBadge.vue'
import { useCatalog } from './catalog'
import { num } from './format'
import { thresholdPresetOf } from './thresholdPresets'
import { useAsync } from './useAsync'
import { canManage, deleteAuditor, enumLabel, errorMessage, fetchDefaults, money, useModHost, type Auditor, type AuditorTryTarget } from './host'

// Auditors (CONTRACTS §72.6, new-api auditors): OpenAI moderation thresholds
// (with presets), Jev question tables, LLM verdict prompts; each bound to one
// channel of its type, with today's calls and cost. Auditors and channels come
// from the shared catalog, refreshed after changes.
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

const catalog = useCatalog()
const rows = computed(() => catalog.state.auditors)
const channels = computed(() => catalog.state.channels)
const defaults = useAsync(fetchDefaults, () => t('auditors.loadFailed'))
const loading = computed(() => catalog.state.loading || defaults.loading.value)
const error = computed(() => (catalog.state.errors.auditors ? errorMessage(catalog.state.errors.auditors, t('auditors.loadFailed')) : defaults.error.value))
const reload = () => Promise.all([catalog.refresh(), !defaults.data.value && defaults.reload()])
onMounted(reload)
defineExpose({ reload })

const columns = computed<TableColumn[]>(() => {
  const c: TableColumn[] = [
    { key: 'name', label: t('auditors.col.name'), nowrap: true },
    { key: 'type', label: t('auditors.col.type'), nowrap: true },
    { key: 'channel', label: t('auditors.col.channel') },
    { key: 'summary', label: t('auditors.col.summary') },
    { key: 'today', label: t('auditors.col.today'), align: 'right', nowrap: true },
    { key: 'usable', label: t('auditors.col.usable'), nowrap: true }
  ]
  if (manage.value) c.push({ key: 'actions', label: '', align: 'right' })
  return c
})

function summary(a: Auditor): string {
  const c = a.config || {}
  const d = defaults.data.value
  if (a.type === 'openai_moderation') {
    const preset = d && thresholdPresetOf(d, c.thresholds || {})
    return preset ? t(`auditors.preset.${preset}`) : t('auditors.overrides', { n: Object.keys(c.thresholds || {}).length })
  }
  if (a.type === 'typesafe') return `${a.rules_version || ''} · ${t('auditors.questions', { n: c.questions?.items?.length || d?.default.items.length || 0 })}`
  return c.flag_as_hit ? t('auditors.flagAsHit') : t('auditors.blockOnly')
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

async function remove(a: Auditor) {
  const ok = await host.confirm({ message: t('auditors.deleteConfirm', { name: a.name }), danger: true, confirmText: t('delete') })
  if (!ok) return
  try {
    await deleteAuditor(a.id)
    host.toast(t('deleted'), 'success')
    void catalog.refresh()
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  }
}
</script>

<template>
  <div>
    <SHint class="mod-hint">{{ t('auditors.hint') }}</SHint>
    <div v-if="manage" class="mod-toolbar">
      <SButton variant="primary" icon="plus" :disabled="!channels.length" :title="channels.length ? '' : t('auditors.needChannel')" @click="openEdit(null)">{{ t('auditors.add') }}</SButton>
    </div>
    <SAlert v-if="error" tone="danger" class="mod-block">{{ error }}</SAlert>

    <SCard :padded="false">
      <STable :columns="columns" :rows="rows" :loading="loading" :empty-text="t('auditors.empty')" dense>
        <template #cell-name="{ row }">{{ row.name }} <span class="mod-sub mod-num">#{{ row.id }}</span></template>
        <template #cell-type="{ row }">{{ enumLabel('auditorType', row.type) }}</template>
        <template #cell-channel="{ row }">
          {{ row.channel_name || catalog.channelName(row.channel_id) }}
          <EnabledBadge v-if="!(row.channel_enabled ?? catalog.channel(row.channel_id)?.enabled)" :enabled="false" :missing="!row.channel_name && !catalog.channel(row.channel_id)" size="xs" />
        </template>
        <template #cell-summary="{ row }">{{ summary(row) }}</template>
        <template #cell-today="{ row }">
          <template v-if="row.today?.calls">
            <span class="mod-num">{{ money(row.today.cost.cost) }}</span>
            <div class="mod-sub mod-num">
              {{ t('cost.calls', { n: num(row.today.calls) }) }}<template v-if="row.today.cost.unpriced_calls"> · {{ t('channels.unpricedN', { n: num(row.today.cost.unpriced_calls) }) }}</template>
            </div>
          </template>
          <SHint v-else inline>—</SHint>
        </template>
        <template #cell-usable="{ row }">
          <SBadge :tone="row.usable ? 'success' : 'warning'" dot>{{ row.usable ? t('auditors.ready') : t('auditors.notReady') }}</SBadge>
        </template>
        <template #cell-actions="{ row }">
          <SButton size="sm" variant="ghost" @click="openTry({ id: row.id, name: row.name })">{{ t('auditors.try') }}</SButton>
          <SButton size="sm" variant="ghost" @click="openEdit(row)">{{ t('edit') }}</SButton>
          <SButton size="sm" variant="ghost" @click="remove(row)">{{ t('delete') }}</SButton>
        </template>
      </STable>
    </SCard>

    <AuditorEditModal v-model:open="editOpen" :auditor="editing" :defaults="defaults.data.value" @saved="catalog.refresh()" @try="openTry" />
    <AuditorTryModal v-model:open="tryOpen" :target="tryTarget" />
  </div>
</template>
