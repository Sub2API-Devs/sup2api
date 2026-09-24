<script setup lang="ts">
import { SConfirmHost, SToastHost } from '@sub2api/ui'
import StepUpDialog from '@/components/StepUpDialog.vue'
</script>

<template>
  <RouterView />
  <SToastHost />
  <SConfirmHost />
  <StepUpDialog />
</template>
