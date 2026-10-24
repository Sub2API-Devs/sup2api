<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SChip, SDropdown, SEmpty, SField, SGrid, SHint, SIcon, SInput, SLink, SModal, SPageHeader, SSpinner, STextarea, confirm, toast } from '@sub2api/ui'
import type { LText, PermissionModule, User } from '@/api/types'
import { roleMemberCount, type RoleRow } from '@/api/admin'
import { deleteWithConfirm } from '@/composables/crud'
import { fetchFirstPage } from '@/composables/lookups'
import { useAuthStore } from '@/stores/auth'
import { lt } from '@/i18n'
import { notifyError } from '@/utils/errors'
import { applyFormError } from '@/utils/formErrors'
import PermissionTree from './PermissionTree.vue'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('role:manage'))

const roles = ref<RoleRow[]>([])
const modules = ref<PermissionModule[]>([])
const loading = ref(true)
const selectedId = ref<number | null>(null)
const selected = computed(() => roles.value.find((r) => r.id === selectedId.value) || null)

// ------------------------------------------------------------------ loading

async function loadRoles() {
  roles.value = await fetchFirstPage<RoleRow>('/roles')
}

async function init() {
  loading.value = true
  try {
    const [, perms] = await Promise.all([loadRoles(), api.get<PermissionModule[]>('/permissions')])
    modules.value = perms || []
    if (roles.value.length) selectRole(roles.value[0], true)
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}
init()

// ------------------------------------------------------------------ editor state

const form = reactive({ nameEn: '', nameZh: '', description: '' })
const perms = ref(new Set<string>())
const original = ref({ nameEn: '', nameZh: '', description: '', perms: [] as string[] })
const saving = ref(false)

const readOnly = computed(() => !canManage.value || !!selected.value?.superuser)
const permsMissing = computed(() => !!selected.value && !selected.value.superuser && !Array.isArray(selected.value.permission_keys))

function splitName(v: LText | undefined): { en: string; zh: string } {
  if (!v) return { en: '', zh: '' }
  if (typeof v === 'string') return { en: v, zh: v }
  return { en: v.en || '', zh: v.zh || '' }
}

const metaDirty = computed(
  () => form.nameEn !== original.value.nameEn || form.nameZh !== original.value.nameZh || form.description !== original.value.description
)
const permsDirty = computed(() => [...perms.value].sort().join() !== original.value.perms.join())
const dirty = computed(() => metaDirty.value || permsDirty.value)

async function selectRole(r: RoleRow, force = false) {
  if (!force && r.id === selectedId.value) return
  if (!force && dirty.value && !readOnly.value && !(await confirm({ message: t('roles.discardChanges') }))) return
  selectedId.value = r.id
  const n = splitName(r.name)
  const keys = [...(r.permission_keys || [])].sort()
  Object.assign(form, { nameEn: n.en, nameZh: n.zh, description: lt(r.description) })
  perms.value = new Set(keys)
  original.value = { ...form, perms: keys }
  loadMembers(r)
}

// ------------------------------------------------------------------ members (GET /users?role=<key>)

const MEMBER_PREVIEW = 20
const members = ref<User[]>([])
const membersTotal = ref(0)
const membersLoading = ref(false)
let membersSeq = 0

async function loadMembers(r: RoleRow) {
  members.value = []
  membersTotal.value = 0
  if (!auth.has('user:read')) return
  const my = ++membersSeq
  membersLoading.value = true
  try {
    const res = await api.list<User>('/users', { role: r.key, page_size: MEMBER_PREVIEW })
    if (my !== membersSeq) return
    members.value = res.items
    membersTotal.value = res.page.total ?? res.items.length
  } catch {
    /* members are informational only */
  } finally {
    if (my === membersSeq) membersLoading.value = false
  }
}

// ------------------------------------------------------------------ save

async function save() {
  const r = selected.value
  if (!r || readOnly.value) return
  if (permsDirty.value && permsMissing.value && !(await confirm({ message: t('roles.overwriteUnknown'), danger: true }))) return
  saving.value = true
  try {
    if (metaDirty.value) {
      await api.patch(`/roles/${r.id}`, {
        name: { en: form.nameEn.trim(), zh: form.nameZh.trim() },
        description: form.description.trim()
      })
    }
    if (permsDirty.value) {
      await api.put(`/roles/${r.id}/permissions`, { permission_keys: [...perms.value].sort() })
    }
    toast(t('common.saved'), 'success')
    await loadRoles()
    const fresh = roles.value.find((x) => x.id === r.id)
    if (fresh) {
      // Keep the edited permissions if the list endpoint omits permission_keys.
      if (!Array.isArray(fresh.permission_keys)) fresh.permission_keys = [...perms.value]
      selectRole(fresh, true)
    }
    if (auth.me?.roles.includes(r.key)) auth.loadMe().catch(() => undefined)
  } catch (e) {
    notifyError(e)
  } finally {
    saving.value = false
  }
}

function resetEditor() {
  if (selected.value) selectRole(selected.value, true)
}

// ------------------------------------------------------------------ create / delete

const createOpen = ref(false)
const creating = ref(false)
const createErrors = ref<Record<string, string>>({})
const createForm = reactive({ key: '', nameEn: '', nameZh: '', description: '' })

function openCreate() {
  Object.assign(createForm, { key: '', nameEn: '', nameZh: '', description: '' })
  createErrors.value = {}
  createOpen.value = true
}

async function submitCreate() {
  createErrors.value = {}
  const key = createForm.key.trim()
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(key)) createErrors.value.key = t('roles.keyInvalid')
  if (!createForm.nameEn.trim() && !createForm.nameZh.trim()) createErrors.value.name = t('common.required')
  if (Object.keys(createErrors.value).length) return
  creating.value = true
  try {
    const en = createForm.nameEn.trim() || createForm.nameZh.trim()
    const zh = createForm.nameZh.trim() || en
    const created = await api.post<RoleRow>('/roles', { key, name: { en, zh }, description: createForm.description.trim() })
    toast(t('common.created'), 'success')
    createOpen.value = false
    await loadRoles()
    const r = roles.value.find((x) => (created?.id ? x.id === created.id : x.key === key))
    if (r) {
      if (!Array.isArray(r.permission_keys)) r.permission_keys = []
      selectRole(r, true)
    }
  } catch (e) {
    // The name is one field in the form but two (name.en / name.zh) on the server.
    if (applyFormError(e, createErrors)) {
      const fe = createErrors.value
      fe.name ||= fe['name.en'] || fe['name.zh'] || ''
    }
  } finally {
    creating.value = false
  }
}

function removeRole() {
  const r = selected.value
  if (!r || r.builtin) return
  return deleteWithConfirm(`/roles/${r.id}`, t('common.confirmDelete', { name: lt(r.name) || r.key }), async () => {
    await loadRoles()
    selectedId.value = null
    if (roles.value.length) selectRole(roles.value[0], true)
  })
}

const roleActions = computed(() =>
  selected.value?.builtin ? [{ key: 'restore', label: t('roles.restoreDefaults') }] : [{ key: 'delete', label: t('common.delete'), danger: true }]
)

function onRoleAction(key: string) {
  if (key === 'restore') return restoreDefaults()
  return removeRole()
}

// POST /roles/:id/reset: name, description and core permissions back to the
// built-in defaults; plugin permissions stay.
async function restoreDefaults() {
  const r = selected.value
  if (!r?.builtin || r.superuser) return
  if (!(await confirm({ message: t('roles.restoreConfirm', { name: lt(r.name) || r.key }) }))) return
  saving.value = true
  try {
    await api.post(`/roles/${r.id}/reset`)
    toast(t('roles.restored'), 'success')
    await loadRoles()
    const fresh = roles.value.find((x) => x.id === r.id)
    if (fresh) selectRole(fresh, true)
    if (auth.me?.roles.includes(r.key)) auth.loadMe().catch(() => undefined)
  } catch (e) {
    notifyError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <SPageHeader :title="t('roles.title')" :description="t('roles.description')">
      <template #actions>
        <SButton v-permission="'role:manage'" variant="primary" icon="plus" @click="openCreate">{{ t('roles.create') }}</SButton>
      </template>
    </SPageHeader>

    <SSpinner v-if="loading" block />

    <SGrid v-else :cols="1" lg-template="260px 1fr">
      <!-- role list -->
      <SCard :padded="false" class="self-start">
        <div class="p-2">
          <SEmpty v-if="!roles.length" />
          <button
            v-for="r in roles"
            :key="r.id"
            type="button"
            class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
            :class="r.id === selectedId ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-fg hover:bg-surface-2'"
            @click="selectRole(r)"
          >
            <span class="min-w-0 flex-1">
              <span class="block truncate">{{ lt(r.name) || r.key }}</span>
              <SHint inline size="xs" class="block truncate font-mono">{{ r.key }}</SHint>
            </span>
            <span v-if="r.superuser" class="shrink-0 text-accent-500 dark:text-accent-400" :title="t('roles.superuserHint')" :aria-label="t('roles.superuser')" role="img"><SIcon name="lock" class="h-4 w-4" /></span>
            <SBadge v-else-if="r.builtin" tone="gray">{{ t('roles.builtin') }}</SBadge>
            <SHint v-if="roleMemberCount(r) !== undefined" inline size="xs" class="shrink-0">{{ roleMemberCount(r) }}</SHint>
          </button>
        </div>
      </SCard>

      <!-- editor -->
      <SCard v-if="selected">
        <template #title>
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <h3 class="truncate text-base font-semibold text-fg">{{ lt(selected.name) || selected.key }}</h3>
            <SHint inline size="xs" class="font-mono">{{ selected.key }}</SHint>
            <SBadge v-if="selected.superuser" tone="accent"><SIcon name="lock" class="h-3 w-3" />{{ t('roles.superuser') }}</SBadge>
            <SBadge v-else-if="selected.builtin" tone="gray">{{ t('roles.builtin') }}</SBadge>
            <SHint v-if="roleMemberCount(selected) !== undefined" inline size="xs">{{ t('roles.members', { n: roleMemberCount(selected) }) }}</SHint>
          </div>
        </template>
        <template v-if="canManage" #actions>
          <template v-if="!selected.superuser">
            <SButton size="sm" :disabled="!dirty || saving" @click="resetEditor">{{ t('common.reset') }}</SButton>
            <SButton variant="primary" size="sm" :disabled="!dirty" :loading="saving" @click="save">{{ t('common.save') }}</SButton>
          </template>
          <SDropdown v-if="!selected.superuser" :actions="roleActions" data-testid="role-menu" @select="onRoleAction" />
        </template>

        <div class="space-y-5">
          <SAlert v-if="selected.superuser" tone="accent" icon="lock">{{ t('roles.superuserHint') }}</SAlert>
          <SAlert v-else-if="permsMissing" tone="warning">{{ t('roles.permsNotLoaded') }}</SAlert>

          <SGrid :cols="1" :md-cols="3">
            <SField :label="t('roles.nameEn')">
              <SInput v-model="form.nameEn" :disabled="readOnly" />
            </SField>
            <SField :label="t('roles.nameZh')">
              <SInput v-model="form.nameZh" :disabled="readOnly" />
            </SField>
            <SField :label="t('common.description')">
              <SInput v-model="form.description" :disabled="readOnly" />
            </SField>
          </SGrid>

          <PermissionTree v-model:granted="perms" :modules="modules" :all-granted="selected.superuser" :read-only="readOnly" />

          <div v-if="auth.has('user:read')" class="flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm">
            <SHint inline class="shrink-0">{{ t('roles.membersLabel') }}:</SHint>
            <SSpinner v-if="membersLoading" size="sm" />
            <template v-else-if="members.length">
              <SChip v-for="u in members" :key="u.id" size="xs" :title="u.email">{{ u.display_name || u.email }}</SChip>
              <SHint v-if="membersTotal > members.length" inline size="xs">{{ t('roles.moreMembers', { n: membersTotal - members.length }) }}</SHint>
            </template>
            <SHint v-else inline>{{ t('roles.noMembers') }}</SHint>
            <SLink :to="{ path: '/users', query: { role: selected.key } }" class="ml-auto text-xs">{{ t('roles.manageMembers') }}</SLink>
          </div>
        </div>
      </SCard>
      <SCard v-else :padded="false"><SEmpty :text="t('roles.selectRole')" /></SCard>
    </SGrid>

    <SModal v-model:open="createOpen" :title="t('roles.create')">
      <form class="space-y-4" @submit.prevent="submitCreate">
        <SField :label="t('roles.key')" required :hint="t('roles.keyHint')" :error="createErrors.key">
          <SInput v-model="createForm.key" mono placeholder="auditor" />
        </SField>
        <SGrid>
          <SField :label="t('roles.nameEn')" :error="createErrors.name">
            <SInput v-model="createForm.nameEn" placeholder="Auditor" />
          </SField>
          <SField :label="t('roles.nameZh')">
            <SInput v-model="createForm.nameZh" placeholder="审计" />
          </SField>
        </SGrid>
        <SField :label="t('common.description')" :error="createErrors.description">
          <STextarea v-model="createForm.description" :rows="2" />
        </SField>
      </form>
      <template #footer>
        <SButton @click="createOpen = false">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :loading="creating" @click="submitCreate">{{ t('common.create') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
