<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SCheckbox, SField, SHint, SInput, SModal, SSegmented, SSelect, SSwitch, STable, STagInput, type TableColumn } from '@sub2api/ui'
import {
  canManage,
  deleteFlow,
  emptySpec,
  enumLabel,
  errorMessage,
  fetchAuditors,
  fetchFlows,
  fetchGroups,
  publishFlow,
  saveFlow,
  setFlowEnabled,
  setFlowGroups,
  useModHost,
  type Auditor,
  type Flow,
  type Group,
  type Spec
} from './host'

// Flows (CONTRACTS §72.7): stages of auditors bound to groups. Saving keeps a
// draft; publishing makes it the version the hook runs.
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

const rows = ref<Flow[]>([])
const auditors = ref<Auditor[]>([])
const groups = ref<Group[]>([])
const loading = ref(false)
const error = ref('')

async function reload() {
  loading.value = true
  error.value = ''
  try {
    ;[rows.value, auditors.value] = await Promise.all([fetchFlows(), fetchAuditors()])
    if (!groups.value.length) groups.value = await fetchGroups()
  } catch (e) {
    error.value = errorMessage(e, t('flows.loadFailed'))
  } finally {
    loading.value = false
  }
}
onMounted(reload)
defineExpose({ reload })

const auditorName = (id: number) => auditors.value.find((a) => a.id === id)?.name || `#${id}`
const groupName = (id: number) => (id === 0 ? t('flows.defaultGroup') : groups.value.find((g) => g.id === id)?.name || `#${id}`)

function stagesSummary(s: Spec | null): string {
  if (!s?.stages?.length) return '—'
  return s.stages.map((st) => `${st.auditors.map(auditorName).join(' + ')} (${enumLabel('combine', st.combine || 'any')}${st.combine === 'at_least' ? ' ' + st.n : ''})`).join(' → ')
}

const columns = computed<TableColumn[]>(() => {
  const c: TableColumn[] = [
    { key: 'name', label: t('flows.col.name'), nowrap: true },
    { key: 'status', label: t('flows.col.status'), nowrap: true },
    { key: 'groups', label: t('flows.col.groups') },
    { key: 'stages', label: t('flows.col.stages'), ellipsis: '28rem' },
    { key: 'published_at', label: t('flows.col.published'), nowrap: true }
  ]
  if (manage.value) c.push({ key: 'actions', label: '', align: 'right' })
  return c
})

// ---- editor
const editOpen = ref(false)
const editing = ref<Flow | null>(null)
const form = reactive<{ name: string; spec: Spec; groups: number[]; groupText: string[] }>({ name: '', spec: emptySpec(), groups: [], groupText: [] })
const formErr = reactive<Record<string, string>>({})
const saving = ref(false)

function openEdit(f: Flow | null) {
  editing.value = f
  for (const k of Object.keys(formErr)) delete formErr[k]
  form.name = f?.name || ''
  form.spec = JSON.parse(JSON.stringify(f?.draft || emptySpec()))
  form.spec.model_filter.models ??= []
  form.groups = [...(f?.groups || [])]
  form.groupText = form.groups.map(String)
  editOpen.value = true
}

function toggleAuditor(stage: number, id: number, on: boolean) {
  const list = form.spec.stages[stage].auditors
  const i = list.indexOf(id)
  if (on && i < 0) list.push(id)
  if (!on && i >= 0) list.splice(i, 1)
}

function toggleGroup(id: number, on: boolean) {
  const i = form.groups.indexOf(id)
  if (on && i < 0) form.groups.push(id)
  if (!on && i >= 0) form.groups.splice(i, 1)
}

const combineOptions = computed(() => ['any', 'all', 'at_least'].map((v) => ({ value: v, label: t(`combine.${v}`) })))
const filterOptions = computed(() => ['all', 'only', 'exclude'].map((v) => ({ value: v, label: t(`modelFilter.${v}`) })))

/** Binds the groups, asking before moving groups bound to another flow; false = the user declined. */
async function bindGroups(id: number, list: number[]): Promise<boolean> {
  try {
    await setFlowGroups(id, list)
    return true
  } catch (e) {
    if (!isApiError(e) || e.code !== 'group_conflict') throw e
    const conflicts = (e.details?.conflicts || []) as Array<{ group_id: number; flow_id: number }>
    const names = conflicts.map((c) => `${groupName(c.group_id)} → #${c.flow_id}`).join(', ')
    const ok = await host.confirm({ message: t('flows.moveGroups', { list: names }), confirmText: t('flows.move') })
    if (!ok) return false
    await setFlowGroups(id, list, true)
    return true
  }
}

async function save(publish: boolean) {
  for (const k of Object.keys(formErr)) delete formErr[k]
  const spec: Spec = JSON.parse(JSON.stringify(form.spec))
  spec.sample_rate = Number(spec.sample_rate)
  spec.total_timeout_ms = Number(spec.total_timeout_ms) || 0
  for (const st of spec.stages) if (st.combine === 'at_least') st.n = Number(st.n) || 1
  else delete st.n
  const list = groups.value.length ? form.groups : form.groupText.map(Number).filter((n) => Number.isInteger(n) && n >= 0)
  saving.value = true
  try {
    const f = await saveFlow(editing.value?.id ?? null, { name: form.name, draft: spec })
    if (!(await bindGroups(f.id, list))) {
      // The draft is saved; the groups and the publication wait for another try.
      editing.value = f
      host.toast(t('flows.groupsKept'), 'warning')
      return
    }
    if (publish) await publishFlow(f.id, f.version)
    host.toast(publish ? t('flows.published') : t('flows.draftSaved'), 'success')
    editOpen.value = false
    reload()
  } catch (e) {
    const fields = isApiError(e) ? e.fields : {}
    Object.assign(formErr, fields)
    if (!Object.keys(fields).length) host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    saving.value = false
  }
}

async function publish(f: Flow) {
  try {
    await publishFlow(f.id, f.version)
    host.toast(t('flows.published'), 'success')
    reload()
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  }
}

async function toggle(f: Flow, on: boolean) {
  try {
    await setFlowEnabled(f.id, on)
    f.enabled = on
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  }
}

async function remove(f: Flow) {
  const ok = await host.confirm({ message: t('flows.deleteConfirm', { name: f.name }), danger: true, confirmText: t('delete') })
  if (!ok) return
  try {
    await deleteFlow(f.id)
    host.toast(t('deleted'), 'success')
    reload()
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  }
}
</script>

<template>
  <div>
    <SHint class="mod-hint">{{ t('flows.hint') }}</SHint>
    <div v-if="manage" class="mod-toolbar">
      <SButton variant="primary" icon="plus" :disabled="!auditors.length" :title="auditors.length ? '' : t('flows.needAuditor')" @click="openEdit(null)">{{ t('flows.add') }}</SButton>
    </div>
    <SAlert v-if="error" tone="danger" class="mod-block">{{ error }}</SAlert>

    <SCard :padded="false">
      <STable :columns="columns" :rows="rows" :loading="loading" :empty-text="t('flows.empty')" dense>
        <template #cell-name="{ row }">{{ row.name }} <span class="mod-sub mod-num">#{{ row.id }}</span></template>
        <template #cell-status="{ row }">
          <SSwitch v-if="manage" :model-value="row.enabled" size="sm" :aria-label="t('enabled')" @update:model-value="toggle(row, $event)" />
          <SBadge v-if="row.version" tone="info">v{{ row.version }}</SBadge>
          <SBadge v-else tone="gray">{{ t('flows.unpublished') }}</SBadge>
          <SBadge v-if="row.version && row.dirty" tone="warning">{{ t('flows.dirty') }}</SBadge>
        </template>
        <template #cell-groups="{ row }">
          <span v-if="row.groups.length">{{ row.groups.map(groupName).join('、') }}</span>
          <SBadge v-else tone="warning">{{ t('flows.noGroups') }}</SBadge>
        </template>
        <template #cell-stages="{ row }"><span :title="stagesSummary(row.draft)">{{ stagesSummary(row.published || row.draft) }}</span></template>
        <template #cell-published_at="{ row }">{{ row.published_at ? host.i18n.formatDateTime(row.published_at) : '—' }}</template>
        <template #cell-actions="{ row }">
          <SButton v-if="row.dirty" size="sm" variant="primary" @click="publish(row)">{{ t('flows.publish') }}</SButton>
          <SButton size="sm" variant="ghost" @click="openEdit(row)">{{ t('edit') }}</SButton>
          <SButton size="sm" variant="ghost" @click="remove(row)">{{ t('delete') }}</SButton>
        </template>
      </STable>
    </SCard>

    <SModal v-model:open="editOpen" :title="editing ? t('flows.editTitle', { name: editing.name }) : t('flows.add')" width="2xl">
      <form class="mod-form" @submit.prevent="save(false)">
        <SField :label="t('flows.col.name')" required :error="formErr.name">
          <SInput v-model="form.name" :maxlength="64" />
        </SField>
        <SAlert v-if="formErr.draft" tone="danger" dense>{{ formErr.draft }}</SAlert>

        <SField :label="t('flows.col.groups')" :hint="t('flows.groupsHint')">
          <div v-if="groups.length" class="mod-checks">
            <SCheckbox :model-value="form.groups.includes(0)" :label="t('flows.defaultGroup')" @update:model-value="toggleGroup(0, $event)" />
            <SCheckbox v-for="g in groups" :key="g.id" :model-value="form.groups.includes(g.id)" :label="g.name" @update:model-value="toggleGroup(g.id, $event)" />
          </div>
          <STagInput v-else v-model="form.groupText" placeholder="0" />
        </SField>

        <div class="mod-form-row">
          <SField :label="t('flows.modelFilter')">
            <SSelect v-model="form.spec.model_filter.type" :options="filterOptions" />
          </SField>
          <SField v-if="form.spec.model_filter.type !== 'all'" :label="t('flows.models')" :hint="t('flows.modelsHint')" class="mod-grow">
            <STagInput v-model="form.spec.model_filter.models" placeholder="claude-*" />
          </SField>
        </div>
        <div class="mod-form-row">
          <SField :label="t('flows.sampleRate')" :hint="t('flows.sampleRateHint')">
            <SInput v-model="form.spec.sample_rate" type="number" min="0" max="100" step="1" />
          </SField>
          <SField :label="t('flows.totalTimeout')" :hint="t('flows.totalTimeoutHint')">
            <SInput v-model="form.spec.total_timeout_ms" type="number" min="0" max="120000" step="500" />
          </SField>
        </div>

        <div v-for="(st, i) in form.spec.stages" :key="i" class="mod-stage">
          <div class="mod-stage-head">
            <strong>{{ t('trace.stageN', { n: i + 1 }) }}</strong>
            <SHint inline size="xs">{{ i === 0 ? t('flows.firstStageHint') : t('flows.laterStageHint') }}</SHint>
            <SButton v-if="form.spec.stages.length > 1" size="sm" variant="ghost" icon="trash" class="mod-ml-auto" :aria-label="t('delete')" @click="form.spec.stages.splice(i, 1)" />
          </div>
          <div class="mod-checks">
            <SCheckbox
              v-for="a in auditors"
              :key="a.id"
              :model-value="st.auditors.includes(a.id)"
              :label="`${a.name} · ${enumLabel('auditorType', a.type)}`"
              @update:model-value="toggleAuditor(i, a.id, $event)"
            />
          </div>
          <div class="mod-form-row">
            <SField :label="t('flows.combine')" size="sm">
              <SSegmented v-model="st.combine" :options="combineOptions" size="sm" />
            </SField>
            <SField v-if="st.combine === 'at_least'" :label="t('flows.n')" size="sm">
              <SInput v-model="st.n" type="number" min="1" :max="st.auditors.length || 1" size="sm" />
            </SField>
          </div>
        </div>
        <div>
          <SButton size="sm" icon="plus" @click="form.spec.stages.push({ auditors: [], combine: 'any' })">{{ t('flows.addStage') }}</SButton>
        </div>
      </form>
      <template #footer>
        <SButton @click="editOpen = false">{{ host.i18n.t('ui.cancel') }}</SButton>
        <SButton :loading="saving" @click="save(false)">{{ t('flows.saveDraft') }}</SButton>
        <SButton variant="primary" :loading="saving" @click="save(true)">{{ t('flows.saveAndPublish') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
