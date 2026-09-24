<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SModal from './SModal.vue'
import SButton from './SButton.vue'
import { confirmState, settleConfirm } from './feedback'

const { t } = useI18n()
const open = computed({
  get: () => !!confirmState.current,
  set: (v: boolean) => {
    if (!v) settleConfirm(false)
  }
})
</script>

<template>
  <SModal v-model:open="open" :title="confirmState.current?.title || t('ui.confirmTitle')" width="sm">
    <p class="whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{{ confirmState.current?.message }}</p>
    <template #footer>
      <SButton @click="settleConfirm(false)">{{ confirmState.current?.cancelText || t('ui.cancel') }}</SButton>
      <SButton :variant="confirmState.current?.danger ? 'danger' : 'primary'" @click="settleConfirm(true)">
        {{ confirmState.current?.confirmText || t('ui.confirm') }}
      </SButton>
    </template>
  </SModal>
</template>
