<script setup lang="ts">
// Button with the console's .btn classes. `to` renders a <RouterLink>, `href`
// an <a> (both with the same classes); otherwise a native <button> honouring
// `type`, `loading` (spinner + disabled) and `disabled`.
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import SSpinner from './SSpinner.vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    block?: boolean
    to?: string | RouteLocationRaw
    href?: string
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
  <RouterLink v-if="to" :to="to" :class="cls"><slot /></RouterLink>
  <a v-else-if="href" :href="href" :class="cls"><slot /></a>
  <button v-else :type="type" :class="cls" :disabled="disabled || loading">
    <SSpinner v-if="loading" size="sm" />
    <slot />
  </button>
</template>
