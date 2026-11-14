<script setup lang="ts">
// The caller's passkeys: adding, renaming and removing them. Adding and
// removing are step-up operations, verified by the dialog the request brings
// up. A passkey signs in from the login page without a password or a code.
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SCard, SDateTime, SField, SFormModal, SInput, STable, confirm, toast, type TableColumn } from '@sub2api/ui'
import { errorMessage, fieldErrors, notifyError, verificationCancelled } from '@/utils/errors'
import { createPasskey, passkeyCancelled, passkeySupported } from '@/utils/webauthn'

interface Passkey {
  id: number
  name: string
  rp_id: string
  created_at: string
  last_used_at: string | null
}

const { t } = useI18n()
const supported = passkeySupported()
const rows = ref<Passkey[]>([])
const loading = ref(false)
async function load() {
  loading.value = true
  try {
    rows.value = (await api.get<Passkey[]>('/me/passkeys')) || []
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

// One form names a new passkey (renaming: null) or renames `renaming`.
const open = ref(false)
const renaming = ref<Passkey | null>(null)
const busy = ref(false)
const name = ref('')
const errors = ref<Record<string, string>>({})
function start(row: Passkey | null) {
  renaming.value = row
  name.value = row?.name || ''
  errors.value = {}
  open.value = true
}
async function add() {
  const begin = await api.post<{ flow_token: string; options: { publicKey: any } }>('/me/passkeys/begin')
  const credential = await createPasskey(begin.options)
  await api.post('/me/passkeys/finish', { flow_token: begin.flow_token, name: name.value, credential })
  toast(t('me.passkeys.added'), 'success')
}
async function rename(row: Passkey) {
  await api.patch(`/me/passkeys/${row.id}`, { name: name.value.trim() })
  toast(t('common.updated'), 'success')
}
async function submit() {
  busy.value = true
  errors.value = {}
  try {
    await (renaming.value ? rename(renaming.value) : add())
    open.value = false
    await load()
  } catch (e) {
    if (passkeyCancelled(e) || verificationCancelled(e)) return
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) errors.value = { form: errorMessage(e) }
  } finally {
    busy.value = false
  }
}
async function remove(row: Passkey) {
  if (!(await confirm({ title: t('me.passkeys.remove'), message: t('me.passkeys.removeConfirm', { name: row.name }), danger: true }))) return
  try {
    await api.del(`/me/passkeys/${row.id}`)
    await load()
  } catch (e) {
    notifyError(e)
  }
}

const columns: TableColumn[] = [
  { key: 'name', label: t('me.passkeys.name') },
  { key: 'rp_id', label: t('me.passkeys.site') },
  { key: 'created_at', label: t('me.passkeys.created'), width: '160px' },
  { key: 'last_used_at', label: t('me.passkeys.lastUsed'), width: '160px' },
  { key: 'actions', label: '', align: 'right', width: '150px' }
]
</script>

<template>
  <SCard :title="t('me.passkeys.title')" :subtitle="t('me.passkeys.description')" :padded="false" data-testid="passkeys-card">
    <template #actions>
      <SButton size="sm" variant="primary" icon="key" :disabled="!supported" data-testid="passkey-add" @click="start(null)">{{ t('me.passkeys.add') }}</SButton>
    </template>
    <SAlert v-if="!supported" tone="warning" dense class="m-3">{{ t('me.passkeys.unsupported') }}</SAlert>
    <STable :columns="columns" :rows="rows" :loading="loading" row-key="id" dense :empty-text="t('me.passkeys.empty')">
      <template #cell-created_at="{ row }"><SDateTime muted :value="row.created_at" class="text-xs" /></template>
      <template #cell-last_used_at="{ row }">
        <SDateTime v-if="row.last_used_at" muted :value="row.last_used_at" mode="relative" class="text-xs" />
        <span v-else class="text-xs text-fg-subtle">{{ t('me.passkeys.never') }}</span>
      </template>
      <template #cell-actions="{ row }">
        <SButton size="sm" variant="ghost" data-testid="passkey-rename" @click="start(row)">{{ t('me.passkeys.rename') }}</SButton>
        <SButton size="sm" variant="ghost" data-testid="passkey-remove" @click="remove(row)">{{ t('common.delete') }}</SButton>
      </template>
    </STable>
    <SFormModal
      v-model:open="open"
      :title="renaming ? t('me.passkeys.rename') : t('me.passkeys.add')"
      width="sm"
      :loading="busy"
      :submit-disabled="!!renaming && !name.trim()"
      :submit-text="renaming ? t('common.save') : t('common.next')"
      @submit="submit"
    >
      <SAlert v-if="errors.form" tone="danger" dense>{{ errors.form }}</SAlert>
      <SField :label="t('me.passkeys.name')" :hint="t('me.passkeys.nameHint')" :error="errors.name" :required="!!renaming">
        <SInput v-model="name" :maxlength="100" data-testid="passkey-name" />
      </SField>
    </SFormModal>
  </SCard>
</template>
