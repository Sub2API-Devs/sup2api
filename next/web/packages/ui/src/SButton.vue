<script setup lang="ts">
import { computed } from 'vue'
import SSpinner from './SSpinner.vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    block?: boolean
  }>(),
  { variant: 'secondary', size: 'md', type: 'button' }
)

const cls = computed(() => [
  'btn',
  `btn-${props.variant}`,
  `btn-${props.size}`,
  props.block ? 'w-full' : ''
])
</script>

<template>
  <button :type="type" :class="cls" :disabled="disabled || loading">
    <SSpinner v-if="loading" size="sm" />
    <slot />
  </button>
</template>
