<script setup lang="ts">
import { SConfirmHost, SToastHost } from '@sub2api/ui'
</script>

<template>
  <RouterView />
  <SToastHost />
  <SConfirmHost />
</template>
