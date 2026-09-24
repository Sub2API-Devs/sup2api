<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import {
  SBadge,
  SButton,
  SDropdown,
  SField,
  SIcon,
  SModal,
  SPageHeader,
  SPagination,
  SSelect,
  STable,
  confirm,
  toast,
  type MenuAction,
  type TableColumn,
  type Tone
} from '@sub2api/ui'
import type { Publisher } from '@/api/types'
import { fromLocalInput, statusTone } from '@/api/admin'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import { fieldErrors, notifyError } from '@/utils/errors'
import { copyText, formatDateTime } from '@/utils/format'

type PublisherKey = NonNullable<Publisher['keys']>[number]

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('publisher:manage'))
const list = useList<Publisher>('/publishers')

const TRUST_LEVELS = ['official', 'verified', 'community'] as const

function trustTone(level: string): Tone {
  return level === 'official' ? 'purple' : level === 'verified' ? 'primary' : 'gray'
}

function trustLabel(level: string) {
  const k = `publishers.trust_.${level}`
  const v = t(k)
  return v === k ? level : v
}

function statusLabel(s: string) {
  const k = `common.status_.${s}`
  const v = t(k)
  return v === k ? s : v
}

function keyState(k: PublisherKey): string {
  if (k.status && k.status !== 'active') return k.status
  const now = Date.now()
  if (k.not_after && new Date(k.not_after).getTime() < now) return 'expired'
  if (k.not_before && new Date(k.not_before).getTime() > now) return 'pending'
  return k.status || 'active'
}

function keyStateLabel(s: string) {
  if (s === 'expired') return t('publishers.expired')
  if (s === 'pending') return t('publishers.notYetValid')
  return statusLabel(s)
}

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    { key: 'id', label: t('common.id'), width: '64px' },
    { key: 'name', label: t('common.name') },
    { key: 'trust_level', label: t('publishers.trustLevel') },
    { key: 'status', label: t('common.status') },
    { key: 'keys', label: t('publishers.keys'), align: 'right' },
    { key: 'created_at', label: t('common.createdAt') }
  ]
  if (canManage.value) cols.push({ key: 'actions', label: t('common.actions'), align: 'right' })
  return cols
})

function activeKeys(p: Publisher) {
  return (p.keys || []).filter((k) => keyState(k) === 'active').length
}

function rowActions(p: Publisher): MenuAction[] {
  const revoked = p.status === 'revoked'
  return [
    { key: 'add-key', label: t('publishers.addKey'), disabled: revoked },
    { key: 'revoke', label: t('publishers.revoke'), danger: true, hidden: revoked }
  ]
}

async function onAction(p: Publisher, action: string) {
  if (action === 'add-key') openAddKey(p)
  else if (action === 'revoke') revokePublisher(p)
}

// ------------------------------------------------------------------ create publisher

const createOpen = ref(false)
const creating = ref(false)
const createErrors = ref<Record<string, string>>({})
const createForm = reactive({ name: '', trust_level: 'community' as string })
const trustOptions = computed(() => TRUST_LEVELS.map((l) => ({ value: l, label: trustLabel(l) })))

function openCreate() {
  Object.assign(createForm, { name: '', trust_level: 'community' })
  createErrors.value = {}
  createOpen.value = true
}

async function submitCreate() {
  createErrors.value = {}
  if (!createForm.name.trim()) {
    createErrors.value.name = t('common.required')
    return
  }
  creating.value = true
  try {
    await api.post('/publishers', { name: createForm.name.trim(), trust_level: createForm.trust_level })
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

// ------------------------------------------------------------------ add key

const keyOpen = ref(false)
const keyPublisher = ref<Publisher | null>(null)
const keyErrors = ref<Record<string, string>>({})
const keyForm = reactive({ key_id: '', public_key: '', not_before: '', not_after: '' })

function openAddKey(p: Publisher) {
  keyPublisher.value = p
  Object.assign(keyForm, { key_id: '', public_key: '', not_before: '', not_after: '' })
  keyErrors.value = {}
  keyOpen.value = true
}

/** An ed25519 public key is 32 bytes; accept standard or URL-safe base64. */
function validEd25519(b64: string): boolean {
  const s = b64.trim().replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return false
  try {
    const padded = s + '='.repeat((4 - (s.length % 4)) % 4)
    return atob(padded).length === 32
  } catch {
    return false
  }
}

async function submitKey() {
  const p = keyPublisher.value
  if (!p) return
  keyErrors.value = {}
  if (!keyForm.key_id.trim()) keyErrors.value.key_id = t('common.required')
  if (!validEd25519(keyForm.public_key)) keyErrors.value.public_key = t('publishers.publicKeyInvalid')
  const nb = fromLocalInput(keyForm.not_before)
  const na = fromLocalInput(keyForm.not_after)
  if (nb && na && new Date(na) <= new Date(nb)) keyErrors.value.not_after = t('publishers.rangeInvalid')
  if (Object.keys(keyErrors.value).length) return
  creating.value = true
  try {
    const body: Record<string, unknown> = { key_id: keyForm.key_id.trim(), public_key: keyForm.public_key.trim() }
    if (nb) body.not_before = nb
    if (na) body.not_after = na
    await api.post(`/publishers/${p.id}/keys`, body)
    toast(t('publishers.keyAdded'), 'success')
    keyOpen.value = false
    list.reload()
  } catch (e) {
    keyErrors.value = fieldErrors(e)
    notifyError(e)
  } finally {
    creating.value = false
  }
}

// ------------------------------------------------------------------ revoke

async function revokePublisher(p: Publisher) {
  const ok = await confirm({ title: t('publishers.revoke'), message: t('publishers.confirmRevoke', { name: p.name }), danger: true })
  if (!ok) return
  try {
    await api.post(`/publishers/${p.id}/revoke`)
    toast(t('publishers.revoked'), 'success')
    list.reload()
  } catch (e) {
    notifyError(e)
  }
}

async function revokeKey(p: Publisher, k: PublisherKey) {
  const ok = await confirm({
    title: t('publishers.revokeKey'),
    message: t('publishers.confirmRevokeKey', { key: k.key_id, name: p.name }),
    danger: true
  })
  if (!ok) return
  try {
    await api.post(`/publisher-keys/${encodeURIComponent(k.key_id)}/revoke`)
    toast(t('publishers.revoked'), 'success')
    list.reload()
  } catch (e) {
    notifyError(e)
  }
}

async function copyKey(k: PublisherKey) {
  if (await copyText(k.public_key)) toast(t('common.copied'), 'success')
}
</script>

<template>
  <div>
    <SPageHeader :title="t('publishers.title')" :description="t('publishers.description')">
      <template #actions>
        <SButton v-if="canManage" variant="primary" @click="openCreate">+ {{ t('publishers.create') }}</SButton>
      </template>
    </SPageHeader>

    <STable :columns="columns" :rows="list.items.value" :loading="list.loading.value" expandable>
      <template #cell-name="{ row }">
        <span class="font-medium text-gray-900 dark:text-white">{{ row.name }}</span>
      </template>
      <template #cell-trust_level="{ row }">
        <SBadge :tone="trustTone(row.trust_level)">{{ trustLabel(row.trust_level) }}</SBadge>
      </template>
      <template #cell-status="{ row }">
        <SBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</SBadge>
        <div v-if="row.revoked_at" class="muted mt-0.5 text-xs">{{ formatDateTime(row.revoked_at) }}</div>
      </template>
      <template #cell-keys="{ row }">
        <span v-if="row.keys">{{ activeKeys(row) }}/{{ row.keys.length }}</span>
        <span v-else class="muted">—</span>
      </template>
      <template #cell-created_at="{ row }">
        <span class="muted">{{ formatDateTime(row.created_at) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <SDropdown :actions="rowActions(row)" @select="onAction(row, $event)" />
      </template>

      <template #expand="{ row }">
        <div class="py-1">
          <div class="mb-2 flex items-center justify-between">
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('publishers.signingKeys') }}</h4>
            <SButton v-if="canManage && row.status !== 'revoked'" size="sm" @click="openAddKey(row)">
              <SIcon name="plus" class="h-3.5 w-3.5" />{{ t('publishers.addKey') }}
            </SButton>
          </div>
          <p v-if="!row.keys" class="muted text-sm">{{ t('publishers.keysUnavailable') }}</p>
          <p v-else-if="!row.keys.length" class="muted text-sm">{{ t('publishers.noKeys') }}</p>
          <table v-else class="table table-dense">
            <thead>
              <tr>
                <th>{{ t('publishers.keyId') }}</th>
                <th>{{ t('publishers.publicKey') }}</th>
                <th>{{ t('common.status') }}</th>
                <th>{{ t('publishers.notBefore') }}</th>
                <th>{{ t('publishers.notAfter') }}</th>
                <th>{{ t('common.createdAt') }}</th>
                <th v-if="canManage" class="text-right">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="k in row.keys" :key="k.key_id">
                <td><code class="font-mono text-xs">{{ k.key_id }}</code></td>
                <td>
                  <span class="inline-flex items-center gap-1">
                    <code class="max-w-[16rem] truncate font-mono text-xs" :title="k.public_key">{{ k.public_key }}</code>
                    <button type="button" class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" :title="t('common.copy')" @click="copyKey(k)">
                      <SIcon name="copy" class="h-3.5 w-3.5" />
                    </button>
                  </span>
                </td>
                <td>
                  <SBadge :tone="keyState(k) === 'expired' || keyState(k) === 'pending' ? 'warning' : statusTone(keyState(k))" dot>
                    {{ keyStateLabel(keyState(k)) }}
                  </SBadge>
                </td>
                <td class="muted">{{ k.not_before ? formatDateTime(k.not_before) : '—' }}</td>
                <td class="muted">{{ k.not_after ? formatDateTime(k.not_after) : '—' }}</td>
                <td class="muted">{{ formatDateTime(k.created_at) }}</td>
                <td v-if="canManage" class="text-right">
                  <SButton v-if="k.status !== 'revoked'" variant="ghost" size="sm" class="!text-red-600" @click="revokeKey(row, k)">
                    {{ t('publishers.revoke') }}
                  </SButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </STable>
    <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />

    <!-- create publisher -->
    <SModal v-model:open="createOpen" :title="t('publishers.create')">
      <form class="space-y-4" @submit.prevent="submitCreate">
        <SField :label="t('common.name')" required :error="createErrors.name">
          <input v-model="createForm.name" class="input" placeholder="acme" />
        </SField>
        <SField :label="t('publishers.trustLevel')" :hint="t(`publishers.trustHint_.${createForm.trust_level}`)" :error="createErrors.trust_level">
          <SSelect v-model="createForm.trust_level" :options="trustOptions" />
        </SField>
      </form>
      <template #footer>
        <SButton @click="createOpen = false">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :loading="creating" @click="submitCreate">{{ t('common.create') }}</SButton>
      </template>
    </SModal>

    <!-- add key -->
    <SModal v-model:open="keyOpen" :title="t('publishers.addKeyTitle', { name: keyPublisher?.name || '' })" width="lg">
      <form class="space-y-4" @submit.prevent="submitKey">
        <SField :label="t('publishers.keyId')" required :hint="t('publishers.keyIdHint')" :error="keyErrors.key_id">
          <input v-model="keyForm.key_id" class="input font-mono" placeholder="acme-2026" />
        </SField>
        <SField :label="t('publishers.publicKey')" required :hint="t('publishers.publicKeyHint')" :error="keyErrors.public_key">
          <textarea v-model="keyForm.public_key" class="input font-mono text-xs" rows="2" spellcheck="false" />
        </SField>
        <div class="grid gap-4 sm:grid-cols-2">
          <SField :label="t('publishers.notBefore')" :hint="t('common.optional')" :error="keyErrors.not_before">
            <input v-model="keyForm.not_before" type="datetime-local" class="input" />
          </SField>
          <SField :label="t('publishers.notAfter')" :hint="t('common.optional')" :error="keyErrors.not_after">
            <input v-model="keyForm.not_after" type="datetime-local" class="input" />
          </SField>
        </div>
      </form>
      <template #footer>
        <SButton @click="keyOpen = false">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :loading="creating" @click="submitKey">{{ t('common.add') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
