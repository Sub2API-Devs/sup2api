<script setup lang="ts">
// Mounted once in App.vue: the step-up dialog of the request waiting for one.
import StepUpDialog from './StepUpDialog.vue'
import { pendingStepUp, settleStepUp } from './stepUp'
</script>

<template>
  <StepUpDialog
    :open="!!pendingStepUp"
    :scope="pendingStepUp?.challenge.scope ?? ''"
    :context="pendingStepUp?.challenge.context ?? ''"
    @verified="settleStepUp"
    @update:open="(v) => !v && settleStepUp(null)"
  />
</template>
