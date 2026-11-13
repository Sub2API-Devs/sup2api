<script setup lang="ts">
// Hands the caller's super admin role to another user (POST
// /system/super-admin/transfer). The request brings up the step-up dialog
// (password and a passkey or code); the transfer ends every session of both,
// so the caller signs in again.
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { api } from '@sub2api/host'
import { SAlert, SField, SFormModal, toast } from '@sub2api/ui'
import EntityPicker from '@/components/EntityPicker.vue'
import { useAuthStore } from '@/stores/auth'
import { usePluginStore } from '@/stores/plugins'
import { applyFormError } from '@/utils/formErrors'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()
const { t } = useI18n()
const auth = useAuthStore()
const plugins = usePluginStore()
const router = useRouter()

const target = ref('')
const errors = ref<Record<string, string>>({})
const busy = ref(false)
watch(
  () => props.open,
  (v) => {
    if (!v) return
    target.value = ''
    errors.value = {}
  }
)

async function submit() {
  busy.value = true
  errors.value = {}
  try {
    await api.post('/system/super-admin/transfer', { target_user_id: Number(target.value) })
    toast(t('users.transfer.done'), 'success')
    emit('update:open', false)
    await auth.logout()
    await plugins.reset()
    await router.replace('/login')
  } catch (e) {
    applyFormError(e, errors)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SFormModal
    :open="open"
    :title="t('users.transfer.title')"
    width="sm"
    :loading="busy"
    submit-variant="danger"
    :submit-text="t('users.transfer.submit')"
    :submit-disabled="!target"
    :submit-attrs="{ 'data-testid': 'transfer-submit' }"
    @update:open="emit('update:open', $event)"
    @submit="submit"
  >
    <SAlert tone="warning" dense>{{ t('users.transfer.warning') }}</SAlert>
    <SField :label="t('users.transfer.target')" :hint="t('users.transfer.targetHint')" :error="errors.target_user_id" required>
      <EntityPicker v-model:id="target" kind="user" :exclude="auth.me ? [auth.me.id] : []" data-testid="transfer-target" />
    </SField>
  </SFormModal>
</template>
