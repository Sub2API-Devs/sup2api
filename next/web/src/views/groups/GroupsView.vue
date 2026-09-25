<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import {
  SBadge,
  SButton,
  SDropdown,
  SField,
  SModal,
  SPageHeader,
  SPagination,
  SSelect,
  STable,
  STagInput,
  confirm,
  toast,
  type TableColumn
} from '@sub2api/ui'
import type { Group } from '@/api/types'
import { statusTone } from '@/api/admin'
import { useList } from '@/composables/useList'
import { useGroupsLookup } from '@/composables/lookups'
import { useAuthStore } from '@/stores/auth'
import { fieldErrors, notifyError } from '@/utils/errors'
import { formatNumber } from '@/utils/format'
import { ACCOUNT_KEYS } from '@/composables/useOwnership'
import GroupAccountsEditor from './GroupAccountsEditor.vue'
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

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    { key: 'name', label: t('common.name') },
    { key: 'platforms', label: t('platforms.served') },
    { key: 'visibility', label: t('groups.visibility') },
    { key: 'rate_multiplier', label: t('groups.rateMultiplier'), align: 'right' },
    { key: 'model_allowlist', label: t('groups.modelAllowlist') },
    { key: 'account_count', label: t('groups.accountCount'), align: 'right' },
    { key: 'key_count', label: t('groups.keyCount'), align: 'right' },
    { key: 'status', label: t('common.status') }
  ]
  if (canManage.value) cols.push({ key: 'actions', label: t('common.actions'), align: 'right' })
  return cols
})

function statusLabel(s: string) {
  const k = `common.status_.${s}`
  const v = t(k)
  return v === k ? s : v
}

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
  model_allowlist: [] as string[]
})

const visibilityOptions = computed(() => [
  { value: 'public', label: t('groups.public') },
  { value: 'restricted', label: t('groups.restricted') }
])
const statusOptions = computed(() => [
  { value: 'active', label: t('common.status_.active') },
  { value: 'disabled', label: t('common.status_.disabled') }
])

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', description: '', status: 'active', rate_multiplier: '1', visibility: 'public', model_allowlist: [] })
  errors.value = {}
  open.value = true
}

function openEdit(g: Group) {
  editing.value = g
  Object.assign(form, {
    name: g.name,
    description: g.description || '',
    status: g.status,
    rate_multiplier: String(g.rate_multiplier ?? '1'),
    visibility: g.visibility,
    model_allowlist: [...(g.model_allowlist || [])]
  })
  errors.value = {}
  open.value = true
}

async function submit() {
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
    model_allowlist: form.model_allowlist
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
    errors.value = fieldErrors(e)
    notifyError(e)
  } finally {
    saving.value = false
  }
}

// ------------------------------------------------------------------ delete

async function onAction(g: Group, key: string) {
  if (key === 'toggle') {
    try {
      await api.patch(`/groups/${g.id}`, { status: g.status === 'active' ? 'disabled' : 'active' })
      toast(t('common.updated'), 'success')
      changed()
    } catch (e) {
      notifyError(e)
    }
    return
  }
  if (key !== 'delete') return
  const extra = g.account_count || keyCount(g) ? ' ' + t('groups.deleteInUse', { a: g.account_count ?? 0, k: keyCount(g) ?? 0 }) : ''
  const ok = await confirm({ title: t('common.delete'), message: t('common.confirmDelete', { name: g.name }) + extra, danger: true })
  if (!ok) return
  try {
    await api.del(`/groups/${g.id}`)
    toast(t('common.deleted'), 'success')
    changed()
  } catch (e) {
    notifyError(e)
  }
}
</script>

<template>
  <div>
    <SPageHeader :title="t('groups.title')" :description="t('groups.description')">
      <template #actions>
        <SButton v-if="canManage" variant="primary" @click="openCreate">+ {{ t('groups.create') }}</SButton>
      </template>
    </SPageHeader>

    <STable :columns="columns" :rows="list.items.value" :loading="list.loading.value">
      <template #cell-name="{ row }">
        <button type="button" class="text-left font-medium text-gray-900 hover:text-primary-600 hover:underline dark:text-white" data-testid="group-name" @click="openDetail(row)">
          {{ row.name }}
        </button>
        <div v-if="row.description" class="muted max-w-xs truncate text-xs">{{ row.description }}</div>
      </template>
      <template #cell-platforms="{ row }">
        <GroupPlatforms :group="row" />
      </template>
      <template #cell-visibility="{ row }">
        <SBadge :tone="row.visibility === 'public' ? 'primary' : 'purple'">
          {{ row.visibility === 'public' ? t('groups.public') : t('groups.restricted') }}
        </SBadge>
      </template>
      <template #cell-rate_multiplier="{ row }">
        <span class="font-mono">{{ multiplier(row.rate_multiplier) }}</span>
      </template>
      <template #cell-model_allowlist="{ row }">
        <div v-if="row.model_allowlist && row.model_allowlist.length" class="flex max-w-xs flex-wrap gap-1">
          <code
            v-for="m in row.model_allowlist.slice(0, 4)"
            :key="m"
            class="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-dark-700"
          >{{ m }}</code>
          <span v-if="row.model_allowlist.length > 4" class="muted text-xs" :title="row.model_allowlist.join(', ')">
            +{{ row.model_allowlist.length - 4 }}
          </span>
        </div>
        <span v-else class="muted">{{ t('common.unlimited') }}</span>
      </template>
      <template #cell-account_count="{ row }">{{ formatNumber(row.account_count) }}</template>
      <template #cell-key_count="{ row }">{{ formatNumber(keyCount(row)) }}</template>
      <template #cell-status="{ row }">
        <SBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</SBadge>
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
    </STable>
    <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />

    <SModal v-model:open="open" :title="editing ? t('groups.editTitle', { name: editing.name }) : t('groups.create')" width="xl">
      <form class="space-y-4" @submit.prevent="submit">
        <div class="grid gap-4 sm:grid-cols-2">
          <SField :label="t('common.name')" required :error="errors.name">
            <input v-model="form.name" class="input" />
          </SField>
          <SField :label="t('common.status')" :error="errors.status">
            <SSelect v-model="form.status" :options="statusOptions" />
          </SField>
        </div>
        <SField :label="t('common.description')" :error="errors.description">
          <textarea v-model="form.description" class="input" rows="2" />
        </SField>
        <div class="grid gap-4 sm:grid-cols-2">
          <SField :label="t('groups.rateMultiplier')" required :hint="t('groups.multiplierHint')" :error="errors.rate_multiplier">
            <input v-model="form.rate_multiplier" class="input font-mono" inputmode="decimal" />
          </SField>
          <SField
            :label="t('groups.visibility')"
            :hint="form.visibility === 'restricted' ? t('groups.restrictedHint') : t('groups.publicHint')"
            :error="errors.visibility"
          >
            <SSelect v-model="form.visibility" :options="visibilityOptions" />
          </SField>
        </div>
        <SField :label="t('groups.modelAllowlist')" :hint="t('groups.allowlistHint')" :error="errors.model_allowlist">
          <STagInput v-model="form.model_allowlist" :placeholder="t('groups.allowlistPlaceholder')" />
        </SField>
        <SField v-if="editing" :label="t('platforms.served')">
          <GroupPlatforms :group="editing" hint />
        </SField>
        <SField v-if="canEditAccounts" :label="t('groups.accounts.title')" :hint="t('groups.accounts.hint')">
          <GroupAccountsEditor v-if="open" ref="accountsEditor" :group-id="editing?.id ?? null" />
        </SField>
      </form>
      <template #footer>
        <SButton @click="open = false">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :loading="saving" @click="submit">{{ editing ? t('common.save') : t('common.create') }}</SButton>
      </template>
    </SModal>

    <!-- detail -->
    <SModal v-model:open="detailOpen" :title="detail?.name || ''" width="lg">
      <template v-if="detail">
        <dl class="kv" data-testid="group-detail">
          <dt>ID</dt>
          <dd>{{ detail.id }}</dd>
          <template v-if="detail.description">
            <dt>{{ t('common.description') }}</dt>
            <dd>{{ detail.description }}</dd>
          </template>
          <dt>{{ t('common.status') }}</dt>
          <dd><SBadge :tone="statusTone(detail.status)" dot>{{ statusLabel(detail.status) }}</SBadge></dd>
          <dt>{{ t('groups.visibility') }}</dt>
          <dd>{{ detail.visibility === 'public' ? t('groups.public') : t('groups.restricted') }}</dd>
          <dt>{{ t('groups.rateMultiplier') }}</dt>
          <dd class="font-mono">×{{ multiplier(detail.rate_multiplier) }}</dd>
          <dt>{{ t('groups.modelAllowlist') }}</dt>
          <dd>{{ detail.model_allowlist?.length ? detail.model_allowlist.join(', ') : t('common.unlimited') }}</dd>
          <dt>{{ t('groups.accountCount') }}</dt>
          <dd>{{ formatNumber(detail.account_count) }}</dd>
          <dt>{{ t('groups.keyCount') }}</dt>
          <dd>{{ formatNumber(keyCount(detail)) }}</dd>
          <dt>{{ t('platforms.served') }}</dt>
          <dd><GroupPlatforms :group="detail" hint /></dd>
          <template v-if="detail.platforms?.length && detail.account_count !== 0">
            <dt>{{ t('platforms.endpoints') }}</dt>
            <dd><PlatformEndpointsPreview :ids="detail.platforms" /></dd>
          </template>
        </dl>
      </template>
      <template #footer>
        <SButton v-if="canManage && detail" @click="editFromDetail">{{ t('common.edit') }}</SButton>
        <SButton variant="primary" @click="detailOpen = false">{{ t('common.close') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
