<script setup lang="ts">
defineProps<{ label?: string; hint?: string; error?: string; required?: boolean; inline?: boolean }>()
</script>

<template>
  <div :class="inline ? 'flex items-center gap-3' : ''">
    <label v-if="label" class="input-label" :class="inline ? '!mb-0 shrink-0' : ''">
      {{ label }}<span v-if="required" class="ml-0.5 text-red-500">*</span>
    </label>
    <div :class="inline ? 'flex-1' : ''">
      <slot />
      <p v-if="error" class="input-error-text">{{ error }}</p>
      <p v-else-if="hint" class="input-hint">{{ hint }}</p>
    </div>
  </div>
</template>
