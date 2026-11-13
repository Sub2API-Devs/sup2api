<script setup lang="ts">
// Access keys (CONTRACTS §80): they call the console API as the caller, with
// only the permissions chosen here, which can only be permissions the caller
// holds. The secret is shown once.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SCopyButton, SDateTime, SField, SFormModal, SInput, SSelect, STable, confirm, type TableColumn } from '@sub2api/ui'
import type { PermissionModule } from '@/api/types'
import PermissionTree from '@/views/roles/PermissionTree.vue'
import { canonicalPermission, parsePermission } from '@/authz/implies'
import { useAuthStore } from '@/stores/auth'
import { errorMessage, fieldErrors, notifyError } from '@/utils/errors'

interface AccessKey {
  id: number
  name: string
  hint: string
  permissions: string[]
  lost: string[]
  expires_at: string | null
  last_used_at: string | null
  last_used_ip: string
  created_at: string
  key?: string
}

const { t } = useI18n()
const auth = useAuthStore()
const rows = ref<AccessKey[]>([])
const loading = ref(false)
const modules = ref<PermissionModule[]>([])
async function load() {
  loading.value = true
  try {
    rows.value = (await api.get<AccessKey[]>('/me/access-keys')) || []
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const open = ref(false)
const editing = ref<AccessKey | null>(null)
const busy = ref(false)
const errors = ref<Record<string, string>>({})
const name = ref('')
const password = ref('')
const expires = ref('90')
const granted = ref(new Set<string>())
const created = ref('')

const expiryOptions = computed(() => [
  { value: '30', label: t('me.accessKeys.days', { n: 30 }) },
  { value: '90', label: t('me.accessKeys.days', { n: 90 }) },
  { value: '365', label: t('me.accessKeys.days', { n: 365 }) },
  { value: '', label: t('me.accessKeys.noExpiry') }
])

async function start(row: AccessKey | null) {
  errors.value = {}
  editing.value = row
  name.value = row?.name || ''
  password.value = ''
  expires.value = '90'
  // Canonical, so a legacy own key and its scoped form are one choice (CONTRACTS §21).
  granted.value = new Set((row?.permissions.filter((p) => !row.lost.includes(p)) || []).map((p) => canonicalPermission(p) ?? p))
  try {
    modules.value = (await api.get<PermissionModule[]>('/me/access-keys/permissions')) || []
    open.value = true
  } catch (e) {
    notifyError(e)
  }
}

// Chosen permissions whose high-risk endpoints ask the key for a proof on every call (§80.2).
const chosenActions = computed(() => new Set([...granted.value].map((k) => parsePermission(k)?.action ?? k)))
const stepUpChosen = computed(() => modules.value.some((m) => m.permissions.some((p) => p.step_up && chosenActions.value.has(p.key))))

const canSubmit = computed(() => !!name.value.trim() && !!password.value && granted.value.size > 0)

async function submit() {
  busy.value = true
  errors.value = {}
  const permissions = [...granted.value]
  try {
    if (editing.value) {
      await api.patch(`/me/access-keys/${editing.value.id}`, { name: name.value, password: password.value, permissions })
    } else {
      const expires_at = expires.value ? new Date(Date.now() + Number(expires.value) * 86400_000).toISOString() : null
      const r = await api.post<AccessKey>('/me/access-keys', { name: name.value, password: password.value, permissions, expires_at })
      created.value = r.key || ''
    }
    open.value = false
    await load()
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) errors.value = { form: errorMessage(e) }
  } finally {
    busy.value = false
  }
}

async function remove(row: AccessKey) {
  if (!(await confirm({ title: t('me.accessKeys.remove'), message: t('me.accessKeys.removeConfirm', { name: row.name }), danger: true }))) return
  try {
    await api.del(`/me/access-keys/${row.id}`)
    await load()
  } catch (e) {
    notifyError(e)
  }
}

const expired = (row: AccessKey) => !!row.expires_at && new Date(row.expires_at).getTime() <= Date.now()

const columns: TableColumn[] = [
  { key: 'name', label: t('me.accessKeys.name') },
  { key: 'hint', label: t('me.accessKeys.key'), width: '110px' },
  { key: 'permissions', label: t('me.accessKeys.permissions'), width: '160px' },
  { key: 'expires_at', label: t('me.accessKeys.expires'), width: '140px' },
  { key: 'last_used_at', label: t('me.accessKeys.lastUsed'), width: '130px' },
  { key: 'actions', label: '', align: 'right', width: '130px' }
]
</script>

<template>
  <SCard :title="t('me.accessKeys.title')" :subtitle="t('me.accessKeys.description')" :padded="false" data-testid="access-keys-card">
    <template #actions>
      <SButton size="sm" variant="primary" icon="key" data-testid="access-key-add" @click="start(null)">{{ t('me.accessKeys.add') }}</SButton>
    </template>
    <STable :columns="columns" :rows="rows" :loading="loading" row-key="id" dense :empty-text="t('me.accessKeys.empty')">
      <template #cell-hint="{ row }"><span class="font-mono text-xs">sak_…{{ row.hint }}</span></template>
      <template #cell-permissions="{ row }">
        <span class="text-xs">{{ t('me.accessKeys.count', { n: row.permissions.length }) }}</span>
        <SBadge v-if="row.lost.length" tone="warning" class="ms-2" :title="row.lost.join(', ')" data-testid="access-key-lost">{{ t('me.accessKeys.lost', { n: row.lost.length }) }}</SBadge>
      </template>
      <template #cell-expires_at="{ row }">
        <SBadge v-if="expired(row)" tone="danger">{{ t('me.accessKeys.expired') }}</SBadge>
        <SDateTime v-else-if="row.expires_at" muted :value="row.expires_at" class="text-xs" />
        <span v-else class="text-xs text-fg-subtle">{{ t('me.accessKeys.noExpiry') }}</span>
      </template>
      <template #cell-last_used_at="{ row }">
        <SDateTime v-if="row.last_used_at" muted :value="row.last_used_at" mode="relative" class="text-xs" :title="row.last_used_ip" />
        <span v-else class="text-xs text-fg-subtle">{{ t('me.passkeys.never') }}</span>
      </template>
      <template #cell-actions="{ row }">
        <SButton size="sm" variant="ghost" data-testid="access-key-edit" @click="start(row)">{{ t('common.edit') }}</SButton>
        <SButton size="sm" variant="ghost" data-testid="access-key-remove" @click="remove(row)">{{ t('common.delete') }}</SButton>
      </template>
    </STable>

    <SFormModal v-model:open="open" :title="editing ? t('me.accessKeys.edit') : t('me.accessKeys.add')" width="lg" :loading="busy" :submit-disabled="!canSubmit" data-testid="access-key-form" @submit="submit">
      <SAlert v-if="errors.form" tone="danger" dense data-testid="access-key-error">{{ errors.form }}</SAlert>
      <SAlert v-if="editing?.lost.length" tone="warning" dense>{{ t('me.accessKeys.lostHint', { list: editing.lost.join(', ') }) }}</SAlert>
      <div class="grid gap-3 sm:grid-cols-2">
        <SField :label="t('me.accessKeys.name')" :error="errors.name" required>
          <SInput v-model="name" :maxlength="64" data-testid="access-key-name" />
        </SField>
        <SField v-if="!editing" :label="t('me.accessKeys.expires')" :error="errors.expires_at">
          <SSelect v-model="expires" :options="expiryOptions" data-testid="access-key-expiry" />
        </SField>
      </div>
      <p class="text-xs text-fg-muted">{{ t('me.accessKeys.subsetHint') }}</p>
      <SAlert v-if="stepUpChosen" tone="info" dense data-testid="access-key-step-up">{{ t('me.accessKeys.stepUpHint') }}</SAlert>
      <div class="max-h-80 overflow-y-auto" data-testid="access-key-permissions">
        <!-- Scopes are offered within the user's own: a key never reaches beyond its user. -->
        <PermissionTree v-model:granted="granted" :modules="modules" :scope-limit="auth.scopes" />
      </div>
      <SField :label="t('me.confirmPassword')" :error="errors.password" required>
        <SInput v-model="password" type="password" autocomplete="current-password" revealable data-testid="access-key-password" />
      </SField>
    </SFormModal>

    <SFormModal :open="!!created" :title="t('me.accessKeys.createdTitle')" width="md" persistent :submit-text="t('me.twoFactor.saved')" @update:open="created = ''" @submit="created = ''">
      <SAlert tone="warning" dense>{{ t('me.accessKeys.createdHint') }}</SAlert>
      <div class="flex items-center gap-2 rounded-lg bg-surface-2 p-3">
        <code class="min-w-0 flex-1 break-all font-mono text-xs text-fg" data-testid="access-key-secret">{{ created }}</code>
        <SCopyButton :text="created" />
      </div>
      <p class="text-xs text-fg-muted">{{ t('me.accessKeys.usage') }}</p>
    </SFormModal>
  </SCard>
</template>
