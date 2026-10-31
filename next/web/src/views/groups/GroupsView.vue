<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SStatusBadge, SBadge, SButton, SCode, SDescItem, SDescriptions, SDropdown, SField, SGrid, SHint, SInput, SLink, SFormModal, SModal, SPageHeader, SPagination, SSelect, SSettingsGroup, STable, STextarea, toast, type TableColumn } from '@sub2api/ui'
import type { EnvironmentValues, Group } from '@/api/types'
import { deleteWithConfirm, toggleStatus, useStatusOptions } from '@/composables/crud'
import { useList } from '@/composables/useList'
import { useGroupsLookup } from '@/composables/lookups'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import { applyFormError } from '@/utils/formErrors'
import { formatNumber } from '@/utils/format'
import { ACCOUNT_KEYS } from '@/composables/useOwnership'
import EnvironmentEditor from '@/components/environment/EnvironmentEditor.vue'
import GroupAccountsEditor from './GroupAccountsEditor.vue'
import GroupModelPolicyEditor from './GroupModelPolicyEditor.vue'
import GroupPlatforms from '@/views/platforms/GroupPlatforms.vue'
import PlatformEndpointsPreview from '@/views/platforms/PlatformEndpointsPreview.vue'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('group:manage'))
// Account membership is stored on accounts, so editing it needs account rights
// (all-level or own-level, CONTRACTS §21; the editor disables rows the caller cannot edit).
const canEditAccounts = computed(() => auth.has([...ACCOUNT_KEYS.read]) && auth.has([...ACCOUNT_KEYS.update]))
const accountsEditor = ref<InstanceType<typeof GroupAccountsEditor>>()
const list = useList<Group>('/groups')
const modelPolicyEditor = ref<InstanceType<typeof GroupModelPolicyEditor>>()
interface ModelSource { models: string[]; unrestricted_accounts: number }
const modelSource = ref<ModelSource>({ models: [], unrestricted_accounts: 0 })
const selectedModelSource = ref<ModelSource | null>(null)
const modelsLoading = ref(false)
const modelLoadError = ref('')
let modelRequest = 0
const currentModelSource = computed(() => canEditAccounts.value && auth.has('account:read') && selectedModelSource.value ? selectedModelSource.value : {
  models: [...new Set([...modelSource.value.models, ...(selectedModelSource.value?.models || [])])].sort(),
  unrestricted_accounts: modelSource.value.unrestricted_accounts
})
async function loadModels(gid: number | null) {
  const request = ++modelRequest
  modelSource.value = { models: [], unrestricted_accounts: 0 }
  selectedModelSource.value = null
  modelLoadError.value = ''
  modelsLoading.value = !!gid
  if (!gid) return
  try {
    const result = await api.get<ModelSource>(`/groups/${gid}/models`)
    if (request === modelRequest) modelSource.value = result
  } catch (e) {
    if (request === modelRequest) modelLoadError.value = t('groups.modelsLoadFailed')
    notifyError(e)
  } finally { if (request === modelRequest) modelsLoading.value = false }
}

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    { key: 'name', label: t('common.name') },
    { key: 'platforms', label: t('platforms.served') },
    { key: 'visibility', label: t('groups.visibility') },
    { key: 'rate_multiplier', label: t('groups.rateMultiplier'), align: 'right' },
    { key: 'model_allowlist', label: t('groups.modelRules') },
    { key: 'account_count', label: t('groups.accountCount'), align: 'right' },
    { key: 'key_count', label: t('groups.keyCount'), align: 'right' },
    { key: 'status', label: t('common.status') }
  ]
  if (canManage.value) cols.push({ key: 'actions', label: t('common.actions'), align: 'right' })
  return cols
})

function multiplier(v: string | number) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(2) : String(v)
}

/** API key count; the server calls it api_key_count. */
function keyCount(g: Group): number | undefined {
  return g.key_count ?? g.api_key_count
}

// ------------------------------------------------------------------ detail

const detail = ref<Group | null>(null)
const detailOpen = ref(false)

async function openDetail(g: Group) {
  detail.value = g
  detailOpen.value = true
  try {
    const full = await api.get<Group>(`/groups/${g.id}`)
    if (full && detail.value?.id === g.id) detail.value = { ...g, ...full }
  } catch {
    /* keep the list row */
  }
}

function editFromDetail() {
  const g = detail.value
  detailOpen.value = false
  if (g) openEdit(g)
}

function changed() {
  list.reload()
  useGroupsLookup(true)
}

// ------------------------------------------------------------------ create / edit

const open = ref(false)
const saving = ref(false)
const editing = ref<Group | null>(null)
const errors = ref<Record<string, string>>({})
const form = reactive({
  name: '',
  description: '',
  status: 'active',
  rate_multiplier: '1',
  visibility: 'public' as Group['visibility'],
  model_allowlist: [] as string[],
  model_filter_mode: 'blacklist' as 'whitelist' | 'blacklist',
  environment: {} as EnvironmentValues
})

const visibilityOptions = computed(() => [
  { value: 'public', label: t('groups.public') },
  { value: 'restricted', label: t('groups.restricted') }
])
const statusOptions = useStatusOptions()

function openCreate() {
  loadModels(null)
  editing.value = null
  Object.assign(form, { name: '', description: '', status: 'active', rate_multiplier: '1', visibility: 'public', model_allowlist: [], model_filter_mode: 'blacklist', environment: {} })
  errors.value = {}
  open.value = true
}

function openEdit(g: Group) {
  loadModels(g.id)
  editing.value = g
  Object.assign(form, {
    name: g.name,
    description: g.description || '',
    status: g.status,
    rate_multiplier: String(g.rate_multiplier ?? '1'),
    visibility: g.visibility,
    model_allowlist: [...(g.model_allowlist || [])],
    model_filter_mode: g.model_filter_mode || 'whitelist',
    environment: { ...g.environment }
  })
  errors.value = {}
  open.value = true
}

async function submit() {
  if (modelPolicyEditor.value && !modelPolicyEditor.value.commit()) return
  errors.value = {}
  if (!form.name.trim()) errors.value.name = t('common.required')
  const rm = String(form.rate_multiplier).trim()
  if (!/^\d+(\.\d+)?$/.test(rm) || Number(rm) < 0) errors.value.rate_multiplier = t('groups.multiplierInvalid')
  if (Object.keys(errors.value).length) return
  const body = {
    name: form.name.trim(),
    description: form.description.trim(),
    status: form.status,
    // Decimal as a string, like money (docs/CONTRACTS.md §3.2).
    rate_multiplier: rm,
    visibility: form.visibility,
    model_allowlist: form.model_allowlist,
    model_filter_mode: form.model_filter_mode,
    environment: form.environment
  }
  saving.value = true
  try {
    let gid = editing.value?.id ?? null
    if (editing.value) await api.patch(`/groups/${editing.value.id}`, body)
    else gid = (await api.post<Group>('/groups', body))?.id ?? null
    if (gid && accountsEditor.value?.dirty) {
      const failed = await accountsEditor.value.save(gid)
      if (failed.length) toast(t('groups.accounts.saveFailed', { names: failed.join(', ') }), 'error')
    }
    toast(t(editing.value ? 'common.updated' : 'common.created'), 'success')
    open.value = false
    changed()
  } catch (e) {
    applyFormError(e, errors)
  } finally {
    saving.value = false
  }
}

// ------------------------------------------------------------------ row menu

function onAction(g: Group, key: string) {
  if (key === 'toggle') return toggleStatus(`/groups/${g.id}`, g.status, changed)
  if (key !== 'delete') return
  const extra = g.account_count || keyCount(g) ? ' ' + t('groups.deleteInUse', { a: g.account_count ?? 0, k: keyCount(g) ?? 0 }) : ''
  return deleteWithConfirm(`/groups/${g.id}`, t('common.confirmDelete', { name: g.name }) + extra, changed)
}
</script>

<template>
  <div>
    <SPageHeader :title="t('groups.title')" :description="t('groups.description')">
      <template #actions>
        <SButton v-if="canManage" variant="primary" icon="plus" @click="openCreate">{{ t('groups.create') }}</SButton>
      </template>
    </SPageHeader>

    <STable card :columns="columns" :rows="list.items.value" :loading="list.loading.value" :error="list.error.value" @retry="list.reload">
      <template #cell-name="{ row }">
        <SLink as="button" class="text-left font-medium" data-testid="group-name" @click="openDetail(row)">{{ row.name }}</SLink>
        <SHint v-if="row.description" size="xs" class="max-w-xs truncate">{{ row.description }}</SHint>
      </template>
      <template #cell-platforms="{ row }">
        <GroupPlatforms :group="row" />
      </template>
      <template #cell-visibility="{ row }">
        <SBadge :tone="row.visibility === 'public' ? 'primary' : 'accent'">
          {{ row.visibility === 'public' ? t('groups.public') : t('groups.restricted') }}
        </SBadge>
      </template>
      <template #cell-rate_multiplier="{ row }">
        <span class="font-mono">{{ multiplier(row.rate_multiplier) }}</span>
      </template>
      <template #cell-model_allowlist="{ row }">
        <div v-if="row.model_allowlist && row.model_allowlist.length" class="flex max-w-xs flex-wrap items-center gap-1">
          <SBadge :tone="row.model_filter_mode === 'blacklist' ? 'danger' : 'primary'">{{ t(row.model_filter_mode === 'blacklist' ? 'groups.blacklist' : 'groups.whitelist') }}</SBadge>
          <SCode v-for="m in row.model_allowlist.slice(0, 4)" :key="m" inline :text="m" />
          <SHint v-if="row.model_allowlist.length > 4" inline size="xs" :title="row.model_allowlist.join(', ')">
            +{{ row.model_allowlist.length - 4 }}
          </SHint>
        </div>
        <SHint v-else inline>{{ t('common.unlimited') }}</SHint>
      </template>
      <template #cell-account_count="{ row }">{{ formatNumber(row.account_count) }}</template>
      <template #cell-key_count="{ row }">{{ formatNumber(keyCount(row)) }}</template>
      <template #cell-status="{ row }">
        <SStatusBadge :status="row.status" />
      </template>
      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <SButton variant="ghost" size="sm" @click="openEdit(row)">{{ t('common.edit') }}</SButton>
          <SDropdown
            :actions="[
              { key: 'toggle', label: row.status === 'active' ? t('common.disable') : t('common.enable') },
              { key: 'delete', label: t('common.delete'), danger: true }
            ]"
            @select="onAction(row, $event)"
          />
        </div>
      </template>
      <template #footer>
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </template>
    </STable>

    <SFormModal v-model:open="open" :title="editing ? t('groups.editTitle', { name: editing.name }) : t('groups.create')" width="xl" :loading="saving" :submit-text="editing ? t('common.save') : t('common.create')" @submit="submit">
      <SGrid>
        <SField :label="t('common.name')" required :error="errors.name">
          <SInput v-model="form.name" />
        </SField>
        <SField :label="t('common.status')" :error="errors.status">
          <SSelect v-model="form.status" :options="statusOptions" />
        </SField>
      </SGrid>
      <SField :label="t('common.description')" :error="errors.description">
        <STextarea v-model="form.description" :rows="2" />
      </SField>
      <SGrid>
        <SField :label="t('groups.rateMultiplier')" required :hint="t('groups.multiplierHint')" :error="errors.rate_multiplier">
          <SInput v-model="form.rate_multiplier" mono inputmode="decimal" />
        </SField>
        <SField
          :label="t('groups.visibility')"
          :hint="form.visibility === 'restricted' ? t('groups.restrictedHint') : t('groups.publicHint')"
          :error="errors.visibility"
        >
          <SSelect v-model="form.visibility" :options="visibilityOptions" />
        </SField>
      </SGrid>
      <SField :label="t('groups.modelRules')" :hint="t('groups.allowlistHint')" :error="errors.model_allowlist || errors.model_filter_mode">
        <GroupModelPolicyEditor v-if="open" :key="editing?.id ?? 'new'" ref="modelPolicyEditor" v-model="form.model_allowlist" v-model:mode="form.model_filter_mode" :options="currentModelSource.models" :loading="modelsLoading" :unrestricted-accounts="currentModelSource.unrestricted_accounts" />
        <SHint v-if="modelLoadError" tone="danger" size="xs">{{ modelLoadError }}</SHint>
      </SField>
      <SField v-if="editing" :label="t('platforms.served')">
        <GroupPlatforms :group="editing" hint />
      </SField>
      <SSettingsGroup :title="t('settings.environment.title')" :description="t('settings.environment.groupHint')" data-testid="group-environment">
        <EnvironmentEditor v-model="form.environment" layer="group" field="environment" :errors="errors" :disabled="saving" />
      </SSettingsGroup>
      <SField v-if="canEditAccounts" :label="t('groups.accounts.title')" :hint="t('groups.accounts.hint')">
        <GroupAccountsEditor v-if="open" ref="accountsEditor" :group-id="editing?.id ?? null" @models="selectedModelSource = $event" />
      </SField>
    </SFormModal>

    <!-- detail -->
    <SModal v-model:open="detailOpen" :title="detail?.name || ''" width="lg">
      <template v-if="detail">
        <SDescriptions data-testid="group-detail" dense>
          <SDescItem :label="t('common.id')" :value="detail.id" />
          <SDescItem v-if="detail.description" :label="t('common.description')" :value="detail.description" />
          <SDescItem :label="t('common.status')"><SStatusBadge :status="detail.status" /></SDescItem>
          <SDescItem :label="t('groups.visibility')">{{ detail.visibility === 'public' ? t('groups.public') : t('groups.restricted') }}</SDescItem>
          <SDescItem :label="t('groups.rateMultiplier')"><span class="font-mono">×{{ multiplier(detail.rate_multiplier) }}</span></SDescItem>
          <SDescItem><template #label>{{ t('groups.modelRules') }} · {{ t(detail.model_filter_mode === 'blacklist' ? 'groups.blacklist' : 'groups.whitelist') }}</template>{{ detail.model_allowlist?.length ? detail.model_allowlist.join(', ') : t('common.unlimited') }}</SDescItem>
          <SDescItem :label="t('groups.accountCount')">{{ formatNumber(detail.account_count) }}</SDescItem>
          <SDescItem :label="t('groups.keyCount')">{{ formatNumber(keyCount(detail)) }}</SDescItem>
          <SDescItem :label="t('platforms.served')"><GroupPlatforms :group="detail" hint /></SDescItem>
          <SDescItem v-if="detail.platforms?.length && detail.account_count !== 0" :label="t('platforms.endpoints')"><PlatformEndpointsPreview :ids="detail.platforms" /></SDescItem>
        </SDescriptions>
      </template>
      <template #footer>
        <SButton v-if="canManage && detail" @click="editFromDetail">{{ t('common.edit') }}</SButton>
        <SButton variant="primary" @click="detailOpen = false">{{ t('common.close') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
