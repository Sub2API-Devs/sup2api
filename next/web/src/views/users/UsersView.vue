<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
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
  confirm,
  toast,
  type MenuAction,
  type TableColumn
} from '@sub2api/ui'
import type { Role, User } from '@/api/types'
import { isPositiveDecimal, statusTone } from '@/api/admin'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import { lt } from '@/i18n'
import { fieldErrors, notifyError } from '@/utils/errors'
import { formatDateTime, formatMoney } from '@/utils/format'
import GroupPicker from '@/components/GroupPicker.vue'

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
    roles.value = (await api.list<Role>('/roles', { page_size: 200 })).items
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
    { key: 'max_concurrency', label: t('users.maxConcurrency'), align: 'right' },
    { key: 'status', label: t('common.status') },
    { key: 'last_login_at', label: t('users.lastLogin') },
    { key: 'created_at', label: t('common.createdAt') },
    { key: 'actions', label: t('common.actions'), align: 'right' }
  )
  return cols
})

const statusOptions = computed(() => [
  { value: '', label: t('common.all') },
  { value: 'active', label: t('common.status_.active') },
  { value: 'disabled', label: t('common.status_.disabled') }
])

const roleOptions = computed(() => [
  { value: '', label: t('users.allRoles') },
  ...roles.value.map((r) => ({ value: r.key, label: lt(r.name) || r.key }))
])

/** Without role:manage only the default "user" role can be given at creation. */
function roleSelectable(key: string) {
  return auth.has('role:manage') || key === 'user'
}

function statusLabel(s: string) {
  const k = `common.status_.${s}`
  const v = t(k)
  return v === k ? s : v
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
const createForm = reactive({ email: '', display_name: '', password: '', role_keys: [] as string[], max_concurrency: 5 })

function openCreate() {
  Object.assign(createForm, { email: '', display_name: '', password: '', role_keys: ['user'], max_concurrency: 5 })
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
      role_keys: createForm.role_keys,
      max_concurrency: Number(createForm.max_concurrency) || 0
    })
    toast(t('common.created'), 'success')
    createOpen.value = false
    list.reload()
  } catch (e) {
    createErrors.value = fieldErrors(e)
    notifyError(e)
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
const editForm = reactive({ display_name: '', status: 'active', max_concurrency: 0 })

function openEdit(u: User) {
  editUser.value = u
  Object.assign(editForm, { display_name: u.display_name, status: u.status, max_concurrency: u.max_concurrency })
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
      status: editForm.status,
      max_concurrency: Number(editForm.max_concurrency) || 0
    })
    toast(t('common.updated'), 'success')
    editOpen.value = false
    list.reload()
  } catch (e) {
    editErrors.value = fieldErrors(e)
    notifyError(e)
  } finally {
    saving.value = false
  }
}

// ------------------------------------------------------------------ roles

const rolesOpen = ref(false)
const rolesUser = ref<User | null>(null)
const rolesSel = ref<string[]>([])

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
    await api.put(`/users/${rolesUser.value.id}/roles`, { role_keys: rolesSel.value })
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
const balanceErrors = ref<Record<string, string>>({})
const balanceForm = reactive({ credit: true, amount: '', note: '' })

function openBalance(u: User) {
  balanceUser.value = u
  Object.assign(balanceForm, { credit: true, amount: '', note: '' })
  balanceErrors.value = {}
  balanceOpen.value = true
}

async function submitBalance() {
  if (!balanceUser.value) return
  balanceErrors.value = {}
  const amount = balanceForm.amount.trim()
  if (!isPositiveDecimal(amount)) {
    balanceErrors.value.amount = t('users.amountInvalid')
    return
  }
  saving.value = true
  try {
    await api.post(`/users/${balanceUser.value.id}/balance/adjust`, {
      amount,
      credit: balanceForm.credit,
      note: balanceForm.note.trim()
    })
    toast(t('users.balanceAdjusted'), 'success')
    balanceOpen.value = false
    list.reload()
    if (balanceUser.value.id === auth.me?.id) auth.refreshBalance()
  } catch (e) {
    balanceErrors.value = fieldErrors(e)
    notifyError(e)
  } finally {
    saving.value = false
  }
}

// ------------------------------------------------------------------ delete

async function remove(u: User) {
  const ok = await confirm({ title: t('common.delete'), message: t('common.confirmDelete', { name: u.email }), danger: true })
  if (!ok) return
  try {
    await api.del(`/users/${u.id}`)
    toast(t('common.deleted'), 'success')
    list.reload()
  } catch (e) {
    notifyError(e)
  }
}
</script>

<template>
  <div>
    <SPageHeader :title="t('users.title')" :description="t('users.description')">
      <template #actions>
        <SButton v-permission="'user:create'" variant="primary" @click="openCreate">+ {{ t('users.create') }}</SButton>
      </template>
      <template #filters>
        <input v-model="list.filters.q" class="input !w-64" :placeholder="t('users.searchPlaceholder')" />
        <div class="w-40">
          <SSelect v-model="list.filters.status" :options="statusOptions" />
        </div>
        <div v-if="roles.length" class="w-44">
          <SSelect v-model="list.filters.role" :options="roleOptions" />
        </div>
      </template>
    </SPageHeader>

    <STable :columns="columns" :rows="list.items.value" :loading="list.loading.value">
      <template #cell-email="{ row }">
        <span class="font-medium text-gray-900 dark:text-white">{{ row.email }}</span>
      </template>
      <template #cell-roles="{ row }">
        <div class="flex flex-wrap gap-1">
          <SBadge v-for="r in row.roles || []" :key="r" :tone="r === 'super_admin' ? 'purple' : 'primary'">{{ roleName(r) }}</SBadge>
          <span v-if="!row.roles || !row.roles.length" class="muted">—</span>
        </div>
      </template>
      <template #cell-balance="{ row }">
        <span class="font-mono">{{ formatMoney(row.balance) }}</span>
      </template>
      <template #cell-status="{ row }">
        <SBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</SBadge>
      </template>
      <template #cell-last_login_at="{ row }">
        <span class="muted">{{ row.last_login_at ? formatDateTime(row.last_login_at) : t('common.never') }}</span>
      </template>
      <template #cell-created_at="{ row }">
        <span class="muted">{{ formatDateTime(row.created_at) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <SDropdown v-if="hasAnyAction(row)" :actions="rowActions(row)" @select="onAction(row, $event)" />
      </template>
    </STable>
    <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />

    <!-- create -->
    <SModal v-model:open="createOpen" :title="t('users.create')">
      <form class="space-y-4" @submit.prevent="submitCreate">
        <SField :label="t('users.email')" required :error="createErrors.email">
          <input v-model="createForm.email" type="email" class="input" autocomplete="off" />
        </SField>
        <SField :label="t('users.displayName')" :error="createErrors.display_name">
          <input v-model="createForm.display_name" class="input" />
        </SField>
        <SField :label="t('users.password')" required :hint="t('users.passwordHint')" :error="createErrors.password">
          <input v-model="createForm.password" type="password" class="input" autocomplete="new-password" />
        </SField>
        <SField :label="t('users.roles')" :error="createErrors.role_keys">
          <div v-if="roles.length" class="flex flex-wrap gap-x-4 gap-y-2">
            <label
              v-for="r in roles"
              :key="r.key"
              class="inline-flex items-center gap-2 text-sm"
              :class="roleSelectable(r.key) ? '' : 'opacity-50'"
            >
              <input
                type="checkbox"
                class="checkbox"
                :checked="createForm.role_keys.includes(r.key)"
                :disabled="!roleSelectable(r.key)"
                @change="toggleKey(createForm.role_keys, r.key)"
              />
              {{ lt(r.name) || r.key }}
            </label>
          </div>
          <p v-else class="muted text-sm">{{ t('users.rolesUnavailable') }}</p>
        </SField>
        <SField :label="t('users.maxConcurrency')" :hint="t('users.maxConcurrencyHint')" :error="createErrors.max_concurrency">
          <input v-model.number="createForm.max_concurrency" type="number" min="0" class="input" />
        </SField>
      </form>
      <template #footer>
        <SButton @click="createOpen = false">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :loading="creating" @click="submitCreate">{{ t('common.create') }}</SButton>
      </template>
    </SModal>

    <!-- edit -->
    <SModal v-model:open="editOpen" :title="t('users.editTitle', { name: editUser?.email || '' })">
      <form class="space-y-4" @submit.prevent="submitEdit">
        <SField :label="t('users.displayName')" :error="editErrors.display_name">
          <input v-model="editForm.display_name" class="input" />
        </SField>
        <SField :label="t('common.status')" :error="editErrors.status">
          <SSelect
            v-model="editForm.status"
            :options="[
              { value: 'active', label: t('common.status_.active') },
              { value: 'disabled', label: t('common.status_.disabled') }
            ]"
          />
        </SField>
        <SField :label="t('users.maxConcurrency')" :hint="t('users.maxConcurrencyHint')" :error="editErrors.max_concurrency">
          <input v-model.number="editForm.max_concurrency" type="number" min="0" class="input" />
        </SField>
      </form>
      <template #footer>
        <SButton @click="editOpen = false">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :loading="saving" @click="submitEdit">{{ t('common.save') }}</SButton>
      </template>
    </SModal>

    <!-- roles -->
    <SModal v-model:open="rolesOpen" :title="t('users.assignRolesTitle', { name: rolesUser?.email || '' })">
      <div v-if="roles.length" class="space-y-2">
        <label
          v-for="r in roles"
          :key="r.key"
          class="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50 dark:border-dark-700 dark:hover:bg-dark-800"
        >
          <input type="checkbox" class="checkbox mt-0.5" :checked="rolesSel.includes(r.key)" @change="toggleKey(rolesSel, r.key)" />
          <div class="min-w-0">
            <div class="flex items-center gap-2 text-sm font-medium">
              {{ lt(r.name) || r.key }}
              <code class="muted text-xs">{{ r.key }}</code>
              <SBadge v-if="r.superuser" tone="purple">{{ t('users.superuser') }}</SBadge>
            </div>
            <p v-if="lt(r.description)" class="muted mt-0.5 text-xs">{{ lt(r.description) }}</p>
          </div>
        </label>
      </div>
      <p v-else class="muted text-sm">{{ t('users.rolesUnavailable') }}</p>
      <template #footer>
        <SButton @click="rolesOpen = false">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :loading="saving" @click="submitRoles">{{ t('common.save') }}</SButton>
      </template>
    </SModal>

    <!-- groups -->
    <SModal v-model:open="groupsOpen" :title="t('users.assignGroupsTitle', { name: groupsUser?.email || '' })">
      <SField :hint="t('users.groupsHint')">
        <GroupPicker :model-value="groupsSel" multiple @update:model-value="onGroupsPicked" />
      </SField>
      <template #footer>
        <SButton @click="groupsOpen = false">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :loading="saving" @click="submitGroups">{{ t('common.save') }}</SButton>
      </template>
    </SModal>

    <!-- balance -->
    <SModal v-model:open="balanceOpen" :title="t('users.adjustBalanceTitle', { name: balanceUser?.email || '' })">
      <form class="space-y-4" @submit.prevent="submitBalance">
        <div v-if="balanceUser?.balance !== undefined && balanceUser?.balance !== null" class="text-sm">
          <span class="muted">{{ t('users.currentBalance') }}:</span>
          <span class="ml-2 font-mono font-semibold">{{ formatMoney(balanceUser?.balance) }}</span>
        </div>
        <SField :label="t('users.direction')">
          <div class="flex gap-6">
            <label class="inline-flex items-center gap-2 text-sm">
              <input v-model="balanceForm.credit" type="radio" class="checkbox !rounded-full" :value="true" />
              {{ t('users.credit') }}
            </label>
            <label class="inline-flex items-center gap-2 text-sm">
              <input v-model="balanceForm.credit" type="radio" class="checkbox !rounded-full" :value="false" />
              {{ t('users.debit') }}
            </label>
          </div>
        </SField>
        <SField :label="t('users.amount')" required :hint="t('users.amountHint')" :error="balanceErrors.amount">
          <div class="relative">
            <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
            <input v-model="balanceForm.amount" class="input !pl-7 font-mono" inputmode="decimal" placeholder="10.00" />
          </div>
        </SField>
        <SField :label="t('common.note')" :error="balanceErrors.note">
          <textarea v-model="balanceForm.note" class="input" rows="2" />
        </SField>
      </form>
      <template #footer>
        <SButton @click="balanceOpen = false">{{ t('common.cancel') }}</SButton>
        <SButton :variant="balanceForm.credit ? 'primary' : 'danger'" :loading="saving" @click="submitBalance">
          {{ balanceForm.credit ? t('users.credit') : t('users.debit') }}
        </SButton>
      </template>
    </SModal>
  </div>
</template>
