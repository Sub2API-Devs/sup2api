<script setup lang="ts">
import { SConfirmHost, SToastHost } from '@sub2api/ui'
import StepUpHost from '@/components/stepUp/StepUpHost.vue'
</script>

<template>
  <RouterView />
  <SToastHost />
  <SConfirmHost />
  <StepUpHost />
</template>
