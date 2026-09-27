<script setup lang="ts">
// <h3 class="section-title">; the `actions` slot sits right-aligned.
defineProps<{ title?: string }>()
</script>

<template>
  <div v-if="$slots.actions" class="mb-3 flex items-center justify-between gap-3">
    <h3 class="section-title !mb-0"><slot>{{ title }}</slot></h3>
    <div class="flex shrink-0 items-center gap-2"><slot name="actions" /></div>
  </div>
  <h3 v-else class="section-title"><slot>{{ title }}</slot></h3>
</template>
