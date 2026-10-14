<script setup lang="ts">
import { computed } from 'vue'
import { useUiT } from './i18n'
import SModal from './SModal.vue'
import SButton from './SButton.vue'
import { confirmState, settleConfirm } from './feedback'

// Mounted once by the console. Focus starts on the confirm button (on
// Cancel for dangerous confirmations), so Enter confirms a safe action and
// a dangerous one needs a deliberate choice; Escape cancels.
const t = useUiT()
const open = computed({
  get: () => !!confirmState.current,
  set: (v: boolean) => {
    if (!v) settleConfirm(false)
  }
})
const danger = computed(() => !!confirmState.current?.danger)
</script>

<template>
  <SModal v-model:open="open" :title="confirmState.current?.title || t('ui.confirmTitle')" width="sm" top>
    <p class="whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{{ confirmState.current?.message }}</p>
    <template #footer>
      <SButton :data-autofocus="danger ? '' : undefined" data-testid="confirm-cancel" @click="settleConfirm(false)">{{ confirmState.current?.cancelText || t('ui.cancel') }}</SButton>
      <SButton :variant="danger ? 'danger' : 'primary'" :data-autofocus="danger ? undefined : ''" data-testid="confirm-ok" @click="settleConfirm(true)">
        {{ confirmState.current?.confirmText || t('ui.confirm') }}
      </SButton>
    </template>
  </SModal>
</template>
