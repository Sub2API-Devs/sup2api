<script setup lang="ts">
// Form item frame: label / hint / error / required star. `hint` and `error`
// can also come from the `#hint` / `#error` slots (error wins over hint).
// Remaining attrs (data-testid, ...) fall through to the root div.
defineProps<{ label?: string; hint?: string; error?: string; required?: boolean; inline?: boolean }>()
</script>

<template>
  <div :class="inline ? 'flex items-center gap-3' : ''">
    <label v-if="label" class="input-label" :class="inline ? '!mb-0 shrink-0' : ''">
      {{ label }}<span v-if="required" class="ml-0.5 text-red-500">*</span>
    </label>
    <div :class="inline ? 'flex-1' : ''">
      <slot />
      <p v-if="error || $slots.error" class="input-error-text"><slot name="error">{{ error }}</slot></p>
      <p v-else-if="hint || $slots.hint" class="input-hint"><slot name="hint">{{ hint }}</slot></p>
    </div>
  </div>
</template>
