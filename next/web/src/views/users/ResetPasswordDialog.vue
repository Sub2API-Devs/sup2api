<script setup lang="ts">
// Sets another user's password (PATCH /users/:id {password}, CONTRACTS
// §80.2 user.password.reset): the request brings up the step-up dialog.
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SField, SFormModal, SInput, toast } from '@sub2api/ui'
import type { User } from '@/api/types'
import { applyFormError } from '@/utils/formErrors'

const props = defineProps<{ open: boolean; user: User | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()
const { t } = useI18n()

const form = reactive({ password: '', confirm: '' })
const errors = ref<Record<string, string>>({})
const busy = ref(false)
watch(
  () => props.open,
  (v) => {
    if (!v) return
    Object.assign(form, { password: '', confirm: '' })
    errors.value = {}
  }
)

async function submit() {
  if (!props.user) return
  errors.value = form.password === form.confirm ? {} : { confirm: t('nav.password.mismatch') }
  if (errors.value.confirm) return
  busy.value = true
  try {
    await api.patch(`/users/${props.user.id}`, { password: form.password })
    toast(t('users.resetPassword.done'), 'success')
    emit('update:open', false)
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
    :title="t('users.resetPassword.title', { name: user?.email || '' })"
    width="sm"
    :loading="busy"
    :submit-disabled="!form.password"
    :submit-attrs="{ 'data-testid': 'reset-password-submit' }"
    @update:open="emit('update:open', $event)"
    @submit="submit"
  >
    <SField :label="t('nav.password.new')" :hint="t('users.resetPassword.hint')" :error="errors.password" required>
      <SInput v-model="form.password" type="password" autocomplete="new-password" revealable data-testid="reset-password-new" />
    </SField>
    <SField :label="t('nav.password.confirm')" :error="errors.confirm" required>
      <SInput v-model="form.confirm" type="password" autocomplete="new-password" revealable data-testid="reset-password-confirm" />
    </SField>
  </SFormModal>
</template>
