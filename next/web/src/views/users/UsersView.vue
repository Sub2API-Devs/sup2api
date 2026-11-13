<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@sub2api/host'
import { fetchAllPages, fetchFirstPage } from '@/composables/lookups'
import {
  SStatusBadge,
  SDateTime,
  SBadge,
  SBulkBar,
  SButton,
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
  confirm,
  toast,
  type ChoiceOption,
  type MenuAction,
  type TableColumn
} from '@sub2api/ui'
import type { Role, User } from '@/api/types'
import { deleteWithConfirm, useStatusOptions } from '@/composables/crud'
import { activeFilterCount, useList } from '@/composables/useList'
import { useSelection } from '@/composables/useSelection'
import { useAssignableRoles, withSupplierUser } from '@/composables/useAssignableRoles'
import { useAuthStore } from '@/stores/auth'
import { lt } from '@/i18n'
import { notifyError } from '@/utils/errors'
import { applyFormError } from '@/utils/formErrors'
import { formatMoney } from '@/utils/format'
import SegmentBadge from '@/components/pricing/SegmentBadge.vue'
import AdjustBalanceModal from '@/views/ledger/AdjustBalanceModal.vue'
import UserCreateDialog from './UserCreateDialog.vue'
import UserPricingDrawer from './UserPricingDrawer.vue'
import UserSegmentMoveDialog from './UserSegmentMoveDialog.vue'
import { segmentFilterOptions, useNamedSegments } from './userSegments'

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
/** A filter the address bar may set: other pages link here with ?role= or ?segment=. */
const fromQuery = (key: string) => (typeof route.query[key] === 'string' ? route.query[key] : '')
const list = useList<User>('/users', { q: '', status: '', role: fromQuery('role'), segment: fromQuery('segment') })

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

// ------------------------------------------------------------------ user groups (segments)

// Moving users takes the user groups to choose from (segment:read) and the right to change who is in them.
const canManageSegments = computed(() => auth.has('segment:read') && auth.has('segment:manage'))
const segments = useNamedSegments()
const segmentOptions = computed(() => segmentFilterOptions(segments.value, { all: t('users.allSegments'), personal: t('pricing.segment.personal') }))

// ------------------------------------------------------------------ table

const showBalance = computed(() => list.items.value.some((u) => u.balance !== undefined && u.balance !== null))

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    { key: 'id', label: t('common.id'), width: '64px' },
    { key: 'email', label: t('users.email'), mobile: 'title' },
    { key: 'display_name', label: t('users.displayName'), mobile: 'subtitle' },
    { key: 'roles', label: t('users.roles'), mobile: 'meta' },
    { key: 'segment', label: t('users.segment'), mobile: 'meta' }
  ]
  if (showBalance.value) cols.push({ key: 'balance', label: t('users.balance'), align: 'right', mobile: 'meta' })
  cols.push(
    { key: 'status', label: t('common.status'), mobile: 'status' },
    { key: 'last_login_at', label: t('users.lastLogin'), mobile: 'meta' },
    { key: 'created_at', label: t('common.createdAt') },
    { key: 'actions', label: t('common.actions'), align: 'right' }
  )
  return cols
})

const statusFilterOptions = useStatusOptions(true)
const statusOptions = useStatusOptions()


const roleOptions = computed(() => [
  { value: '', label: t('users.allRoles') },
  ...roles.value.map((r) => ({ value: r.key, label: lt(r.name) || r.key }))
])

// The users the caller may act on (CONTRACTS §43.6): actions that change a
// user are only offered on them; the server decides either way.
const managed = useAssignableRoles()

function rowActions(u: User): MenuAction[] {
  const may = (perm: string) => auth.has(perm) && managed.manageable(u.roles)
  const self = u.id === auth.me?.id
  return [
    { key: 'edit', label: t('common.edit'), hidden: !may('user:update') },
    { key: 'roles', label: t('users.assignRoles'), hidden: !may('role:assign') },
    { key: 'pricing', label: t('users.pricing.action'), hidden: !auth.has('segment:read') },
    { key: 'ledger', label: t('users.ledger'), hidden: !auth.has('balance:all:read') },
    // One's own second factor is reset under /me with the current password and a code.
    { key: 'security', label: t('users.resetSecurity'), hidden: !may('user:password:reset') || self },
    { key: 'balance', label: t('users.adjustBalance'), hidden: !may('balance:adjust') },
    // Nobody disables or deletes themselves (a lock-out guard, not a permission).
    { key: 'delete', label: t('common.delete'), danger: true, hidden: !may('user:delete') || self }
  ]
}

function hasAnyAction(u: User) {
  return rowActions(u).some((a) => !a.hidden)
}

async function resetSecurity(u: User) {
  const ok = await confirm({ title: t('users.resetSecurity'), message: t('users.resetSecurityConfirm', { name: u.email }), danger: true })
  if (!ok) return
  try {
    await api.del(`/users/${u.id}/security`)
    toast(t('users.resetSecurityDone'), 'success')
  } catch (e) {
    notifyError(e)
  }
}

function onAction(u: User, key: string) {
  if (key === 'edit') openEdit(u)
  else if (key === 'roles') openRoles(u)
  else if (key === 'pricing') openPricing(u)
  else if (key === 'ledger') router.push({ path: '/ledger', query: { user_id: String(u.id) } })
  else if (key === 'balance') openBalance(u)
  else if (key === 'security') resetSecurity(u)
  else if (key === 'delete') remove(u)
}

// ------------------------------------------------------------------ selection + move to a user group

const selection = useSelection<User>({ items: list.items, key: (u) => u.id, selectable: () => canManageSegments.value, loadAll: () => fetchAllPages<User>('/users', { ...list.filters }) })
const selectionKeys = computed({ get: () => selection.keys.value as unknown[], set: (v: unknown[]) => selection.update(v) })
// A changed filter starts a new selection: rows outside it would be acted on unseen.
watch(() => ({ ...list.filters }), () => selection.clear(), { deep: true })
const moveOpen = ref(false)

function onMoved() {
  selection.clear()
  list.reload()
}

// ------------------------------------------------------------------ create

const createOpen = ref(false)

function openCreate() {
  loadRoles()
  createOpen.value = true
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

// The managed roles, plus the roles the user holds that are not: those stay
// checked and locked and go back unchanged (the server checks the difference).
// A managed role the caller may not grant can be kept but not added.
const roleChoices = computed<ChoiceOption[]>(() => {
  const held = rolesUser.value?.roles || []
  const locked = held.filter((k) => !managed.get(k))
  return [
    ...managed.roles.value.map((r) => ({
      value: r.key,
      label: lt(r.name) || r.key,
      description: r.grantable ? undefined : t('users.roleNotGrantable', { keys: [...(r.missing || []), ...(r.missing_assignable || [])].join(', ') || r.key }),
      disabled: !r.grantable && !held.includes(r.key)
    })),
    ...locked.map((k) => ({ value: k, label: roleName(k), description: t('users.roleLocked'), disabled: true }))
  ]
})

function openRoles(u: User) {
  rolesUser.value = u
  rolesSel.value = [...(u.roles || [])]
  loadRoles()
  void managed.load()
  rolesOpen.value = true
}

/** Checking supplier checks the default role with it, as when creating a user. */
function setRolesSel(v: ChoiceOption['value'][]) {
  const added = v.includes('supplier') && !rolesSel.value.includes('supplier')
  rolesSel.value = added ? withSupplierUser(v.map(String)) : v
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

// ------------------------------------------------------------------ groups and pricing

const pricingOpen = ref(false)
const pricingUser = ref<User | null>(null)

function openPricing(u: User) {
  pricingUser.value = u
  pricingOpen.value = true
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
    <SPageHeader :title="t('users.title')" :description="t('users.description')" :filters-active-count="activeFilterCount(list.filters)">
      <template #actions>
        <SButton v-permission="'user:create'" variant="primary" icon="plus" fab @click="openCreate">{{ t('users.create') }}</SButton>
      </template>
      <template #filters-primary>
        <SInput v-model="list.filters.q" class="w-64" icon="search" clearable :aria-label="t('common.search')" :placeholder="t('users.searchPlaceholder')" />
      </template>
      <template #filters>
        <SSelect v-model="list.filters.status" class="w-40" :options="statusFilterOptions" :aria-label="t('common.status')" />
        <SSelect v-if="roles.length" v-model="list.filters.role" class="w-44" :options="roleOptions" :aria-label="t('users.roles')" />
        <SSelect v-model="list.filters.segment" class="w-44" :options="segmentOptions" :aria-label="t('users.segment')" data-testid="user-segment-filter" />
      </template>
    </SPageHeader>

    <SBulkBar
      class="mb-3"
      :count="selection.keys.value.length"
      :total="list.total.value"
      :page-selected="selection.pageSelected.value"
      :all-selected="selection.allSelected.value"
      :selecting-all="selection.selectingAll.value"
      data-testid="user-bulk-bar"
      @select-page="selection.selectPage()"
      @select-all="selection.selectAll().catch(notifyError)"
      @clear="selection.clear()"
    >
      <SButton size="sm" variant="primary" data-testid="user-bulk-move" @click="moveOpen = true">{{ t('users.move.action') }}</SButton>
    </SBulkBar>

    <STable v-model:selected="selectionKeys" card :selectable="canManageSegments" :columns="columns" :rows="list.items.value" :loading="list.loading.value" :error="list.error.value" @retry="list.reload">
      <template #cell-email="{ row }">
        <span class="font-medium text-fg">{{ row.email }}</span>
      </template>
      <template #cell-roles="{ row }">
        <div class="flex flex-wrap gap-1">
          <SBadge v-for="r in row.roles || []" :key="r" :tone="r === 'super_admin' ? 'accent' : 'primary'">{{ roleName(r) }}</SBadge>
          <SHint v-if="!row.roles || !row.roles.length" inline>—</SHint>
        </div>
      </template>
      <template #cell-segment="{ row }">
        <SegmentBadge :segment="row.segment" />
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
    <UserCreateDialog v-model:open="createOpen" :roles="roles" @created="list.reload()" />

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
    <SFormModal v-model:open="rolesOpen" :title="t('users.assignRolesTitle', { name: rolesUser?.email || '' })" :loading="saving" :enter-submit="false" @submit="submitRoles">
      <SChoiceCards v-if="roleChoices.length" :model-value="rolesSel" multiple :cols="1" :options="roleChoices" :aria-label="t('users.roles')" data-testid="user-roles-choices" @update:model-value="setRolesSel($event as ChoiceOption['value'][])">
        <template v-for="o in roleChoices" :key="o.value" #[`option-${o.value}`]>
          <span class="mt-1 flex items-center gap-2">
            <SHint inline size="xs" class="font-mono">{{ o.value }}</SHint>
            <SBadge v-if="roles.find((r) => r.key === o.value)?.superuser" size="xs" tone="accent">{{ t('users.superuser') }}</SBadge>
          </span>
        </template>
      </SChoiceCards>
      <SHint v-else>{{ t('users.noManagedRoles') }}</SHint>
    </SFormModal>

    <!-- move to a user group -->
    <UserSegmentMoveDialog v-if="canManageSegments" v-model:open="moveOpen" :users="selection.rows.value" @done="onMoved" />

    <!-- groups and pricing -->
    <UserPricingDrawer v-model:open="pricingOpen" :user="pricingUser" @changed="list.reload()" />

    <!-- balance -->
    <AdjustBalanceModal v-model:open="balanceOpen" :user-id="balanceUser?.id ?? null" :current-balance="balanceUser?.balance" @done="list.reload()" />
  </div>
</template>
