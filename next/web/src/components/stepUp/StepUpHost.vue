<script setup lang="ts">
// Mounted once in App.vue: the step-up dialog of the request waiting for one.
// Each request gets a fresh dialog (keyed by its entry); the last one stays
// rendered while it closes.
import { shallowRef, watch } from 'vue'
import StepUpDialog from './StepUpDialog.vue'
import { pendingStepUp, settleStepUp, type PendingStepUp } from './stepUp'

const shown = shallowRef<PendingStepUp | null>(null)
watch(pendingStepUp, (p) => p && (shown.value = p), { immediate: true })
</script>

<template>
  <StepUpDialog
    v-if="shown"
    :key="shown.id"
    :open="shown === pendingStepUp"
    :scope="shown.challenge.scope"
    :context="shown.challenge.context"
    @verified="settleStepUp"
    @update:open="(v) => !v && settleStepUp(null)"
  />
</template>
