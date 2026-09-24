<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SField, SModal } from '@sub2api/ui'
import { cancelStepUp, stepUpState, submitStepUp } from './stepUp'
import { errorMessage } from '@/utils/errors'

const { t } = useI18n()
const password = ref('')
const error = ref('')
const busy = ref(false)
const input = ref<HTMLInputElement>()

const open = computed({
  get: () => stepUpState.open,
  set: (v: boolean) => {
    if (!v) cancelStepUp()
  }
})

watch(
  () => stepUpState.open,
  async (v) => {
    if (v) {
      password.value = ''
      error.value = ''
      await nextTick()
      input.value?.focus()
    }
  }
)

async function submit() {
  if (!password.value) return
  busy.value = true
  error.value = ''
  try {
    await submitStepUp(password.value)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SModal v-model:open="open" :title="t('auth.stepUp.title')" width="sm">
    <form class="space-y-4" @submit.prevent="submit">
      <p class="text-sm text-gray-600 dark:text-gray-300">{{ t('auth.stepUp.desc') }}</p>
      <SField :label="t('auth.stepUp.password')" :error="error">
        <input ref="input" v-model="password" type="password" class="input" autocomplete="current-password" />
      </SField>
      <button type="submit" class="hidden" />
    </form>
    <template #footer>
      <SButton @click="open = false">{{ t('common.cancel') }}</SButton>
      <SButton variant="primary" :loading="busy" :disabled="!password" @click="submit">{{ t('auth.stepUp.submit') }}</SButton>
    </template>
  </SModal>
</template>
