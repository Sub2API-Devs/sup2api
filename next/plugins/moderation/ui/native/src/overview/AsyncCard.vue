<script setup lang="ts">
import { SAlert, SCard, SEmpty, SSpinner } from '@sub2api/ui'

// Overview card around one async load: error, first-load spinner, empty
// state, else the content. Later reloads keep the content in place.
defineProps<{ title: string; subtitle?: string; error?: string; loading?: boolean; empty?: boolean; emptyText?: string; emptyIcon?: string }>()
</script>

<template>
  <SCard :title="title" :subtitle="subtitle">
    <template v-if="$slots.actions" #actions><slot name="actions" /></template>
    <SAlert v-if="error" tone="danger" dense>{{ error }}</SAlert>
    <SSpinner v-else-if="loading && empty" block />
    <SEmpty v-else-if="empty" :text="emptyText" :icon="emptyIcon || 'chart'" />
    <slot v-else />
  </SCard>
</template>
