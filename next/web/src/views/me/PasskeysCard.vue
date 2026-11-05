<script setup lang="ts">
// The caller's passkeys: adding one (after the password) and removing one. A
// passkey signs in from the login page without a password or a code.
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SCard, SDateTime, SField, SFormModal, SInput, STable, confirm, toast, type TableColumn } from '@sub2api/ui'
import { errorMessage, fieldErrors, notifyError } from '@/utils/errors'
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

const open = ref(false)
const busy = ref(false)
const name = ref('')
const password = ref('')
const errors = ref<Record<string, string>>({})
function start() {
  name.value = ''
  password.value = ''
  errors.value = {}
  open.value = true
}
async function add() {
  busy.value = true
  errors.value = {}
  try {
    const begin = await api.post<{ flow_token: string; options: { publicKey: any } }>('/me/passkeys/begin', { password: password.value })
    const credential = await createPasskey(begin.options)
    await api.post('/me/passkeys/finish', { flow_token: begin.flow_token, name: name.value, credential })
    open.value = false
    toast(t('me.passkeys.added'), 'success')
    await load()
  } catch (e) {
    if (passkeyCancelled(e)) return
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
  { key: 'actions', label: '', align: 'right', width: '90px' }
]
</script>

<template>
  <SCard :title="t('me.passkeys.title')" :subtitle="t('me.passkeys.description')" :padded="false" data-testid="passkeys-card">
    <template #actions>
      <SButton size="sm" variant="primary" icon="key" :disabled="!supported" data-testid="passkey-add" @click="start">{{ t('me.passkeys.add') }}</SButton>
    </template>
    <SAlert v-if="!supported" tone="warning" dense class="m-3">{{ t('me.passkeys.unsupported') }}</SAlert>
    <STable :columns="columns" :rows="rows" :loading="loading" row-key="id" dense :empty-text="t('me.passkeys.empty')">
      <template #cell-created_at="{ row }"><SDateTime muted :value="row.created_at" class="text-xs" /></template>
      <template #cell-last_used_at="{ row }">
        <SDateTime v-if="row.last_used_at" muted :value="row.last_used_at" mode="relative" class="text-xs" />
        <span v-else class="text-xs text-fg-subtle">{{ t('me.passkeys.never') }}</span>
      </template>
      <template #cell-actions="{ row }">
        <SButton size="sm" variant="ghost" data-testid="passkey-remove" @click="remove(row)">{{ t('common.delete') }}</SButton>
      </template>
    </STable>
    <SFormModal v-model:open="open" :title="t('me.passkeys.add')" width="sm" :loading="busy" :submit-disabled="!password" :submit-text="t('common.next')" @submit="add">
      <SAlert v-if="errors.form" tone="danger" dense>{{ errors.form }}</SAlert>
      <SField :label="t('me.passkeys.name')" :hint="t('me.passkeys.nameHint')" :error="errors.name">
        <SInput v-model="name" :maxlength="100" data-testid="passkey-name" />
      </SField>
      <SField :label="t('me.confirmPassword')" :error="errors.password" required>
        <SInput v-model="password" type="password" autocomplete="current-password" revealable data-testid="passkey-password" />
      </SField>
    </SFormModal>
  </SCard>
</template>
