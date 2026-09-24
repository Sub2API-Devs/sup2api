<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SEmpty, SField, SIcon, SModal, SPageHeader, SSpinner, confirm, toast } from '@sub2api/ui'
import type { LText, PermissionItem, PermissionModule, User } from '@/api/types'
import { roleMemberCount, type RoleRow } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { lt } from '@/i18n'
import { fieldErrors, notifyError } from '@/utils/errors'

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
  roles.value = (await api.list<RoleRow>('/roles', { page_size: 200 })).items
}

async function loadPermissions() {
  modules.value = (await api.get<PermissionModule[]>('/permissions')) || []
}

async function init() {
  loading.value = true
  try {
    await Promise.all([loadRoles(), loadPermissions()])
    if (roles.value.length) selectRole(roles.value[0], true)
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}
init()

const coreModules = computed(() => modules.value.filter((m) => m.source !== 'plugin'))
const pluginModules = computed(() => modules.value.filter((m) => m.source === 'plugin'))

// ------------------------------------------------------------------ editor state

const form = reactive({ nameEn: '', nameZh: '', description: '' })
const perms = ref(new Set<string>())
const original = ref({ nameEn: '', nameZh: '', description: '', perms: [] as string[] })
const collapsed = ref(new Set<string>())
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
const permsDirty = computed(() => {
  const a = [...perms.value].sort()
  const b = original.value.perms
  return a.length !== b.length || a.some((x, i) => x !== b[i])
})
const dirty = computed(() => metaDirty.value || permsDirty.value)

async function selectRole(r: RoleRow, force = false) {
  if (!force && r.id === selectedId.value) return
  if (!force && dirty.value && !readOnly.value) {
    const ok = await confirm({ message: t('roles.discardChanges') })
    if (!ok) return
  }
  selectedId.value = r.id
  const n = splitName(r.name)
  const desc = lt(r.description)
  form.nameEn = n.en
  form.nameZh = n.zh
  form.description = desc
  const keys = [...(r.permission_keys || [])].sort()
  perms.value = new Set(keys)
  original.value = { nameEn: n.en, nameZh: n.zh, description: desc, perms: keys }
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

// ------------------------------------------------------------------ permission tree

function isChecked(key: string) {
  return !!selected.value?.superuser || perms.value.has(key)
}

function toggle(key: string) {
  if (readOnly.value) return
  const s = new Set(perms.value)
  if (s.has(key)) s.delete(key)
  else s.add(key)
  perms.value = s
}

function moduleState(m: PermissionModule): 'all' | 'some' | 'none' {
  if (selected.value?.superuser) return 'all'
  const n = m.permissions.filter((p) => perms.value.has(p.key)).length
  return n === 0 ? 'none' : n === m.permissions.length ? 'all' : 'some'
}

function toggleModule(m: PermissionModule) {
  if (readOnly.value) return
  const s = new Set(perms.value)
  const all = moduleState(m) === 'all'
  for (const p of m.permissions) {
    if (all) s.delete(p.key)
    else s.add(p.key)
  }
  perms.value = s
}

function toggleCollapse(m: PermissionModule) {
  const s = new Set(collapsed.value)
  if (s.has(m.module)) s.delete(m.module)
  else s.add(m.module)
  collapsed.value = s
}

function moduleInactive(m: PermissionModule) {
  return m.status !== 'active' && m.status !== ''
}

function permInactive(m: PermissionModule, p: PermissionItem) {
  return moduleInactive(m) || (p.status !== 'active' && p.status !== '')
}

function grantedCount(m: PermissionModule) {
  if (selected.value?.superuser) return m.permissions.length
  return m.permissions.filter((p) => perms.value.has(p.key)).length
}

// ------------------------------------------------------------------ save

async function save() {
  const r = selected.value
  if (!r || readOnly.value) return
  if (permsDirty.value && permsMissing.value) {
    const ok = await confirm({ message: t('roles.overwriteUnknown'), danger: true })
    if (!ok) return
  }
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
    const fe = fieldErrors(e)
    createErrors.value = { ...fe, name: fe.name || fe['name.en'] || fe['name.zh'] || '' }
    notifyError(e)
  } finally {
    creating.value = false
  }
}

async function removeRole() {
  const r = selected.value
  if (!r || r.builtin) return
  const ok = await confirm({ title: t('common.delete'), message: t('common.confirmDelete', { name: lt(r.name) || r.key }), danger: true })
  if (!ok) return
  try {
    await api.del(`/roles/${r.id}`)
    toast(t('common.deleted'), 'success')
    await loadRoles()
    selectedId.value = null
    if (roles.value.length) selectRole(roles.value[0], true)
  } catch (e) {
    notifyError(e)
  }
}
</script>

<template>
  <div>
    <SPageHeader :title="t('roles.title')" :description="t('roles.description')">
      <template #actions>
        <SButton v-permission="'role:manage'" variant="primary" @click="openCreate">+ {{ t('roles.create') }}</SButton>
      </template>
    </SPageHeader>

    <div v-if="loading" class="flex justify-center py-16"><SSpinner /></div>

    <div v-else class="grid gap-4 lg:grid-cols-[260px_1fr]">
      <!-- role list -->
      <div class="card self-start p-2">
        <SEmpty v-if="!roles.length" />
        <button
          v-for="r in roles"
          :key="r.id"
          type="button"
          class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
          :class="
            r.id === selectedId
              ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-dark-800'
          "
          @click="selectRole(r)"
        >
          <span class="min-w-0 flex-1">
            <span class="block truncate">{{ lt(r.name) || r.key }}</span>
            <span class="muted block truncate font-mono text-xs">{{ r.key }}</span>
          </span>
          <span v-if="r.superuser" class="shrink-0 text-purple-500" :title="t('roles.superuserHint')"><SIcon name="lock" class="h-4 w-4" /></span>
          <SBadge v-else-if="r.builtin" tone="gray">{{ t('roles.builtin') }}</SBadge>
          <span v-if="roleMemberCount(r) !== undefined" class="muted shrink-0 text-xs">{{ roleMemberCount(r) }}</span>
        </button>
      </div>

      <!-- editor -->
      <div v-if="selected" class="card">
        <div class="card-header flex flex-wrap items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-2">
            <h3 class="truncate text-base font-semibold text-gray-900 dark:text-white">{{ lt(selected.name) || selected.key }}</h3>
            <code class="muted text-xs">{{ selected.key }}</code>
            <SBadge v-if="selected.superuser" tone="purple"><SIcon name="lock" class="h-3 w-3" />{{ t('roles.superuser') }}</SBadge>
            <SBadge v-else-if="selected.builtin" tone="gray">{{ t('roles.builtin') }}</SBadge>
            <span v-if="roleMemberCount(selected) !== undefined" class="muted text-xs">{{ t('roles.members', { n: roleMemberCount(selected) }) }}</span>
          </div>
          <div v-if="canManage" class="flex items-center gap-2">
            <SButton v-if="!selected.builtin" variant="ghost" size="sm" class="!text-red-600" @click="removeRole">
              <SIcon name="trash" class="h-4 w-4" />{{ t('common.delete') }}
            </SButton>
            <template v-if="!selected.superuser">
              <SButton size="sm" :disabled="!dirty || saving" @click="resetEditor">{{ t('common.reset') }}</SButton>
              <SButton variant="primary" size="sm" :disabled="!dirty" :loading="saving" @click="save">{{ t('common.save') }}</SButton>
            </template>
          </div>
        </div>

        <div class="card-body space-y-5">
          <div v-if="selected.superuser" class="flex items-start gap-2 rounded-xl bg-purple-50 px-4 py-3 text-sm text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
            <SIcon name="lock" class="mt-0.5 h-4 w-4 shrink-0" />
            {{ t('roles.superuserHint') }}
          </div>
          <div v-else-if="permsMissing" class="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <SIcon name="warning" class="mt-0.5 h-4 w-4 shrink-0" />
            {{ t('roles.permsNotLoaded') }}
          </div>

          <!-- meta -->
          <div class="grid gap-4 md:grid-cols-3">
            <SField :label="t('roles.nameEn')">
              <input v-model="form.nameEn" class="input" :disabled="readOnly" />
            </SField>
            <SField :label="t('roles.nameZh')">
              <input v-model="form.nameZh" class="input" :disabled="readOnly" />
            </SField>
            <SField :label="t('common.description')">
              <input v-model="form.description" class="input" :disabled="readOnly" />
            </SField>
          </div>

          <!-- permission tree -->
          <div>
            <h4 class="section-title">{{ t('roles.permissions') }}</h4>
            <SEmpty v-if="!modules.length" :text="t('roles.noPermissions')" />
            <div class="space-y-2">
              <template v-for="(group, gi) in [coreModules, pluginModules]" :key="gi">
                <div v-if="gi === 1 && group.length" class="flex items-center gap-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  <span class="h-px flex-1 bg-gray-200 dark:bg-dark-700" />
                  {{ t('roles.pluginPermissions') }}
                  <span class="h-px flex-1 bg-gray-200 dark:bg-dark-700" />
                </div>
                <div
                  v-for="m in group"
                  :key="m.module"
                  class="rounded-xl border border-gray-200 dark:border-dark-700"
                  :class="moduleInactive(m) ? 'opacity-60' : ''"
                >
                  <div class="flex items-center gap-3 px-3 py-2">
                    <button type="button" class="flex min-w-0 flex-1 items-center gap-2 text-left" @click="toggleCollapse(m)">
                      <SIcon :name="collapsed.has(m.module) ? 'chevron-right' : 'chevron-down'" class="h-4 w-4 shrink-0 text-gray-400" />
                      <span class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ lt(m.label) || m.module }}</span>
                      <code class="muted hidden text-xs sm:inline">{{ m.module }}</code>
                      <SBadge v-if="m.source === 'plugin' && m.status === 'disabled'" tone="warning">{{ t('roles.pluginDisabled') }}</SBadge>
                      <SBadge v-else-if="m.status === 'removed'" tone="gray">{{ t('roles.removed') }}</SBadge>
                      <span class="muted ml-auto shrink-0 text-xs">{{ grantedCount(m) }}/{{ m.permissions.length }}</span>
                    </button>
                    <label class="inline-flex shrink-0 items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        class="checkbox"
                        :checked="moduleState(m) === 'all'"
                        :indeterminate="moduleState(m) === 'some'"
                        :disabled="readOnly || !m.permissions.length"
                        @change="toggleModule(m)"
                      />
                      {{ t('roles.selectAll') }}
                    </label>
                  </div>
                  <div
                    v-if="!collapsed.has(m.module)"
                    class="grid gap-x-4 gap-y-2 border-t border-gray-100 px-3 py-3 sm:grid-cols-2 xl:grid-cols-3 dark:border-dark-800"
                  >
                    <label
                      v-for="p in m.permissions"
                      :key="p.key"
                      class="inline-flex min-w-0 items-center gap-2 text-sm"
                      :class="[permInactive(m, p) ? 'text-gray-400 dark:text-dark-500' : 'text-gray-700 dark:text-gray-300', readOnly ? '' : 'cursor-pointer']"
                      :title="p.key"
                    >
                      <input type="checkbox" class="checkbox" :checked="isChecked(p.key)" :disabled="readOnly" @change="toggle(p.key)" />
                      <span class="truncate">{{ lt(p.label) || p.key }}</span>
                      <span v-if="p.sensitive" class="shrink-0 text-amber-500" :title="t('roles.sensitive')"><SIcon name="lock" class="h-3.5 w-3.5" /></span>
                      <SBadge v-if="p.status === 'disabled' && !moduleInactive(m)" tone="warning">{{ t('roles.pluginDisabled') }}</SBadge>
                    </label>
                  </div>
                </div>
              </template>
            </div>
            <p class="muted mt-3 flex items-center gap-1 text-xs">
              <SIcon name="lock" class="h-3.5 w-3.5 text-amber-500" />{{ t('roles.sensitiveLegend') }}
            </p>
          </div>

          <!-- members -->
          <div v-if="auth.has('user:read')" class="border-t border-gray-100 pt-4 dark:border-dark-700">
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <span class="muted shrink-0">{{ t('roles.membersLabel') }}:</span>
              <SSpinner v-if="membersLoading" size="sm" />
              <template v-else-if="members.length">
                <span
                  v-for="u in members"
                  :key="u.id"
                  class="rounded-lg bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-dark-700 dark:text-gray-300"
                  :title="u.email"
                >{{ u.display_name || u.email }}</span>
                <span v-if="membersTotal > members.length" class="muted text-xs">{{ t('roles.moreMembers', { n: membersTotal - members.length }) }}</span>
              </template>
              <span v-else class="muted">{{ t('roles.noMembers') }}</span>
              <RouterLink :to="{ path: '/users', query: { role: selected.key } }" class="link ml-auto text-xs">{{ t('roles.manageMembers') }}</RouterLink>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="card"><SEmpty :text="t('roles.selectRole')" /></div>
    </div>

    <SModal v-model:open="createOpen" :title="t('roles.create')">
      <form class="space-y-4" @submit.prevent="submitCreate">
        <SField :label="t('roles.key')" required :hint="t('roles.keyHint')" :error="createErrors.key">
          <input v-model="createForm.key" class="input font-mono" placeholder="operator" />
        </SField>
        <div class="grid gap-4 sm:grid-cols-2">
          <SField :label="t('roles.nameEn')" :error="createErrors.name">
            <input v-model="createForm.nameEn" class="input" placeholder="Operator" />
          </SField>
          <SField :label="t('roles.nameZh')">
            <input v-model="createForm.nameZh" class="input" placeholder="运营" />
          </SField>
        </div>
        <SField :label="t('common.description')" :error="createErrors.description">
          <textarea v-model="createForm.description" class="input" rows="2" />
        </SField>
      </form>
      <template #footer>
        <SButton @click="createOpen = false">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :loading="creating" @click="submitCreate">{{ t('common.create') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
