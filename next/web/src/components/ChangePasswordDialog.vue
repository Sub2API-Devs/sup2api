<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SField, SModal, toast } from '@sub2api/ui'
import { errorMessage, fieldErrors } from '@/utils/errors'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()
const { t } = useI18n()

const form = reactive({ old_password: '', new_password: '', confirm: '' })
const errors = ref<Record<string, string>>({})
const busy = ref(false)

watch(
  () => props.open,
  (v) => {
    if (v) {
      form.old_password = ''
      form.new_password = ''
      form.confirm = ''
      errors.value = {}
    }
  }
)

async function submit() {
  errors.value = {}
  if (form.new_password !== form.confirm) {
    errors.value = { confirm: t('nav.password.mismatch') }
    return
  }
  busy.value = true
  try {
    await api.put('/me/password', { old_password: form.old_password, new_password: form.new_password })
    toast(t('nav.password.changed'), 'success')
    emit('update:open', false)
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) errors.value = { old_password: errorMessage(e) }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SModal :open="open" :title="t('nav.changePassword')" width="sm" @update:open="emit('update:open', $event)">
    <form class="space-y-4" @submit.prevent="submit">
      <SField :label="t('nav.password.old')" :error="errors.old_password" required>
        <input v-model="form.old_password" type="password" class="input" autocomplete="current-password" />
      </SField>
      <SField :label="t('nav.password.new')" :error="errors.new_password" required>
        <input v-model="form.new_password" type="password" class="input" autocomplete="new-password" />
      </SField>
      <SField :label="t('nav.password.confirm')" :error="errors.confirm" required>
        <input v-model="form.confirm" type="password" class="input" autocomplete="new-password" />
      </SField>
      <button type="submit" class="hidden" />
    </form>
    <template #footer>
      <SButton @click="emit('update:open', false)">{{ t('common.cancel') }}</SButton>
      <SButton variant="primary" :loading="busy" :disabled="!form.old_password || !form.new_password" @click="submit">
        {{ t('common.save') }}
      </SButton>
    </template>
  </SModal>
</template>
