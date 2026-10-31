<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@sub2api/host'
import { fetchFirstPage } from '@/composables/lookups'
import {
  SStatusBadge,
  SDateTime,
  SBadge,
  SButton,
  SCheckbox,
  SChoiceCards,
  SDropdown,
  SField,
  SHint,
  SInput,
  SFormModal,
  SPageHeader,
  SPagination,
  SSelect,
  STable,
  toast,
  type ChoiceOption,
  type MenuAction,
  type TableColumn
} from '@sub2api/ui'
import type { Role, User } from '@/api/types'
import { deleteWithConfirm, useStatusOptions } from '@/composables/crud'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import { lt } from '@/i18n'
import { notifyError } from '@/utils/errors'
import { applyFormError } from '@/utils/formErrors'
import { formatMoney } from '@/utils/format'
import GroupPicker from '@/components/GroupPicker.vue'
import AdjustBalanceModal from '@/views/ledger/AdjustBalanceModal.vue'

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const list = useList<User>('/users', { q: '', status: '', role: typeof route.query.role === 'string' ? route.query.role : '' })

// ------------------------------------------------------------------ roles lookup

const roles = ref<Role[]>([])
async function loadRoles() {
  if (!auth.has('role:read') || roles.value.length) return
  try {
    roles.value = await fetchFirstPage<Role>('/roles')
  } catch (e) {
    notifyError(e)
  }
}
loadRoles()

function roleName(key: string) {
  const r = roles.value.find((x) => x.key === key)
  return r ? lt(r.name) || key : key
}

// ------------------------------------------------------------------ table

const showBalance = computed(() => list.items.value.some((u) => u.balance !== undefined && u.balance !== null))

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    { key: 'id', label: t('common.id'), width: '64px' },
    { key: 'email', label: t('users.email') },
    { key: 'display_name', label: t('users.displayName') },
    { key: 'roles', label: t('users.roles') }
  ]
  if (showBalance.value) cols.push({ key: 'balance', label: t('users.balance'), align: 'right' })
  cols.push(
    { key: 'status', label: t('common.status') },
    { key: 'last_login_at', label: t('users.lastLogin') },
    { key: 'created_at', label: t('common.createdAt') },
    { key: 'actions', label: t('common.actions'), align: 'right' }
  )
  return cols
})

const statusFilterOptions = useStatusOptions(true)
const statusOptions = useStatusOptions()

const roleChoices = computed<ChoiceOption[]>(() => roles.value.map((r) => ({ value: r.key, label: lt(r.name) || r.key, description: lt(r.description) || undefined })))

const roleOptions = computed(() => [
  { value: '', label: t('users.allRoles') },
  ...roles.value.map((r) => ({ value: r.key, label: lt(r.name) || r.key }))
])

/** Without role:manage only the default "user" role can be given at creation. */
function roleSelectable(key: string) {
  return auth.has('role:manage') || key === 'user'
}

function rowActions(u: User): MenuAction[] {
  return [
    { key: 'edit', label: t('common.edit'), hidden: !auth.has('user:update') },
    { key: 'roles', label: t('users.assignRoles'), hidden: !auth.has('role:manage') },
    { key: 'groups', label: t('users.assignGroups'), hidden: !auth.has('group:manage') },
    { key: 'ledger', label: t('users.ledger'), hidden: !auth.has('balance:all:read') },
    { key: 'balance', label: t('users.adjustBalance'), hidden: !auth.has('balance:adjust') },
    { key: 'delete', label: t('common.delete'), danger: true, hidden: !auth.has('user:delete') || u.id === auth.me?.id }
  ]
}

function hasAnyAction(u: User) {
  return rowActions(u).some((a) => !a.hidden)
}

function onAction(u: User, key: string) {
  if (key === 'edit') openEdit(u)
  else if (key === 'roles') openRoles(u)
  else if (key === 'groups') openGroups(u)
  else if (key === 'ledger') router.push({ path: '/ledger', query: { user_id: String(u.id) } })
  else if (key === 'balance') openBalance(u)
  else if (key === 'delete') remove(u)
}

// ------------------------------------------------------------------ create

const createOpen = ref(false)
const creating = ref(false)
const createErrors = ref<Record<string, string>>({})
const createForm = reactive({ email: '', display_name: '', password: '', role_keys: [] as string[] })

function openCreate() {
  Object.assign(createForm, { email: '', display_name: '', password: '', role_keys: ['user'] })
  createErrors.value = {}
  loadRoles()
  createOpen.value = true
}

async function submitCreate() {
  createErrors.value = {}
  if (!createForm.email.trim()) createErrors.value.email = t('common.required')
  if (createForm.password.length < 8) createErrors.value.password = t('users.passwordTooShort')
  if (Object.keys(createErrors.value).length) return
  creating.value = true
  try {
    await api.post('/users', {
      email: createForm.email.trim(),
      display_name: createForm.display_name.trim(),
      password: createForm.password,
      role_keys: createForm.role_keys
    })
    toast(t('common.created'), 'success')
    createOpen.value = false
    list.reload()
  } catch (e) {
    applyFormError(e, createErrors)
  } finally {
    creating.value = false
  }
}

function toggleKey(listRef: string[], key: string) {
  const i = listRef.indexOf(key)
  if (i >= 0) listRef.splice(i, 1)
  else listRef.push(key)
}

// ------------------------------------------------------------------ edit

const editUser = ref<User | null>(null)
const editOpen = ref(false)
const saving = ref(false)
const editErrors = ref<Record<string, string>>({})
const editForm = reactive({ display_name: '', status: 'active' })

function openEdit(u: User) {
  editUser.value = u
  Object.assign(editForm, { display_name: u.display_name, status: u.status })
  editErrors.value = {}
  editOpen.value = true
}

async function submitEdit() {
  if (!editUser.value) return
  saving.value = true
  editErrors.value = {}
  try {
    await api.patch(`/users/${editUser.value.id}`, {
      display_name: editForm.display_name.trim(),
      status: editForm.status
    })
    toast(t('common.updated'), 'success')
    editOpen.value = false
    list.reload()
  } catch (e) {
    applyFormError(e, editErrors)
  } finally {
    saving.value = false
  }
}

// ------------------------------------------------------------------ roles

const rolesOpen = ref(false)
const rolesUser = ref<User | null>(null)
const rolesSel = ref<ChoiceOption['value'][]>([])

function openRoles(u: User) {
  rolesUser.value = u
  rolesSel.value = [...(u.roles || [])]
  loadRoles()
  rolesOpen.value = true
}

async function submitRoles() {
  if (!rolesUser.value) return
  saving.value = true
  try {
    await api.put(`/users/${rolesUser.value.id}/roles`, { role_keys: rolesSel.value.map(String) })
    toast(t('common.updated'), 'success')
    rolesOpen.value = false
    list.reload()
  } catch (e) {
    notifyError(e)
  } finally {
    saving.value = false
  }
}

// ------------------------------------------------------------------ groups

const groupsOpen = ref(false)
const groupsUser = ref<User | null>(null)
const groupsSel = ref<number[]>([])

function openGroups(u: User) {
  groupsUser.value = u
  groupsSel.value = [...(u.group_ids || [])]
  groupsOpen.value = true
}

function onGroupsPicked(v: number[] | number | null) {
  groupsSel.value = Array.isArray(v) ? v : v === null ? [] : [v]
}

async function submitGroups() {
  if (!groupsUser.value) return
  saving.value = true
  try {
    await api.put(`/users/${groupsUser.value.id}/groups`, { group_ids: groupsSel.value })
    toast(t('common.updated'), 'success')
    groupsOpen.value = false
    list.reload()
  } catch (e) {
    notifyError(e)
  } finally {
    saving.value = false
  }
}

// ------------------------------------------------------------------ balance

const balanceOpen = ref(false)
const balanceUser = ref<User | null>(null)

function openBalance(u: User) {
  balanceUser.value = u
  balanceOpen.value = true
}

// ------------------------------------------------------------------ delete

function remove(u: User) {
  return deleteWithConfirm(`/users/${u.id}`, t('common.confirmDelete', { name: u.email }), list.reload)
}
</script>

<template>
  <div>
    <SPageHeader :title="t('users.title')" :description="t('users.description')">
      <template #actions>
        <SButton v-permission="'user:create'" variant="primary" icon="plus" @click="openCreate">{{ t('users.create') }}</SButton>
      </template>
      <template #filters>
        <SInput v-model="list.filters.q" class="w-64" icon="search" clearable :aria-label="t('common.search')" :placeholder="t('users.searchPlaceholder')" />
        <SSelect v-model="list.filters.status" class="w-40" :options="statusFilterOptions" :aria-label="t('common.status')" />
        <SSelect v-if="roles.length" v-model="list.filters.role" class="w-44" :options="roleOptions" :aria-label="t('users.roles')" />
      </template>
    </SPageHeader>

    <STable card :columns="columns" :rows="list.items.value" :loading="list.loading.value" :error="list.error.value" @retry="list.reload">
      <template #cell-email="{ row }">
        <span class="font-medium text-fg">{{ row.email }}</span>
      </template>
      <template #cell-roles="{ row }">
        <div class="flex flex-wrap gap-1">
          <SBadge v-for="r in row.roles || []" :key="r" :tone="r === 'super_admin' ? 'accent' : 'primary'">{{ roleName(r) }}</SBadge>
          <SHint v-if="!row.roles || !row.roles.length" inline>—</SHint>
        </div>
      </template>
      <template #cell-balance="{ row }">
        <span class="font-mono">{{ formatMoney(row.balance) }}</span>
      </template>
      <template #cell-status="{ row }">
        <SStatusBadge :status="row.status" />
      </template>
      <template #cell-last_login_at="{ row }">
        <SDateTime mode="absolute" muted :value="row.last_login_at" :empty="t('common.never')" />
      </template>
      <template #cell-created_at="{ row }">
        <SDateTime mode="absolute" muted :value="row.created_at" />
      </template>
      <template #cell-actions="{ row }">
        <SDropdown v-if="hasAnyAction(row)" :actions="rowActions(row)" @select="onAction(row, $event)" />
      </template>
      <template #footer>
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </template>
    </STable>

    <!-- create -->
    <SFormModal v-model:open="createOpen" :title="t('users.create')" :loading="creating" :submit-text="t('common.create')" @submit="submitCreate">
        <SField :label="t('users.email')" required :error="createErrors.email">
          <SInput v-model="createForm.email" type="email" autocomplete="off" />
        </SField>
        <SField :label="t('users.displayName')" :error="createErrors.display_name">
          <SInput v-model="createForm.display_name" />
        </SField>
        <SField :label="t('users.password')" required :hint="t('users.passwordHint')" :error="createErrors.password">
          <SInput v-model="createForm.password" type="password" autocomplete="new-password" revealable />
        </SField>
        <SField :label="t('users.roles')" :error="createErrors.role_keys">
          <div v-if="roles.length" class="flex flex-wrap gap-x-4 gap-y-2">
            <SCheckbox
              v-for="r in roles"
              :key="r.key"
              :model-value="createForm.role_keys.includes(r.key)"
              :disabled="!roleSelectable(r.key)"
              :label="lt(r.name) || r.key"
              @update:model-value="toggleKey(createForm.role_keys, r.key)"
            />
          </div>
          <SHint v-else>{{ t('users.rolesUnavailable') }}</SHint>
        </SField>
    </SFormModal>

    <!-- edit -->
    <SFormModal v-model:open="editOpen" :title="t('users.editTitle', { name: editUser?.email || '' })" :loading="saving" @submit="submitEdit">
        <SField :label="t('users.displayName')" :error="editErrors.display_name">
          <SInput v-model="editForm.display_name" />
        </SField>
        <SField :label="t('common.status')" :error="editErrors.status">
          <SSelect v-model="editForm.status" :options="statusOptions" />
        </SField>
    </SFormModal>

    <!-- roles -->
    <SFormModal v-model:open="rolesOpen" :title="t('users.assignRolesTitle', { name: rolesUser?.email || '' })" :loading="saving" @submit="submitRoles">
      <SChoiceCards v-if="roles.length" v-model="rolesSel" multiple :cols="1" :options="roleChoices" :aria-label="t('users.roles')">
        <template v-for="r in roles" :key="r.key" #[`option-${r.key}`]>
          <span class="mt-1 flex items-center gap-2">
            <SHint inline size="xs" class="font-mono">{{ r.key }}</SHint>
            <SBadge v-if="r.superuser" size="xs" tone="accent">{{ t('users.superuser') }}</SBadge>
          </span>
        </template>
      </SChoiceCards>
      <SHint v-else>{{ t('users.rolesUnavailable') }}</SHint>
    </SFormModal>

    <!-- groups -->
    <SFormModal v-model:open="groupsOpen" :title="t('users.assignGroupsTitle', { name: groupsUser?.email || '' })" :loading="saving" @submit="submitGroups">
      <SField :hint="t('users.groupsHint')">
        <GroupPicker :model-value="groupsSel" multiple @update:model-value="onGroupsPicked" />
      </SField>
    </SFormModal>

    <!-- balance -->
    <AdjustBalanceModal v-model:open="balanceOpen" :user-id="balanceUser?.id ?? null" :current-balance="balanceUser?.balance" @done="list.reload()" />
  </div>
</template>
