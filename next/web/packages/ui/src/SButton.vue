<script setup lang="ts">
import { isDev } from './dev'
// Button with the console's .btn classes. `to` renders a <RouterLink>, `href`
// an <a> (both with the same classes); otherwise a native <button> honouring
// `type`, `loading` (spinner + disabled + aria-busy) and `disabled`. A
// disabled / loading link renders an <a aria-disabled="true"> without href.
// `icon` / `iconRight` are SIcon names; `iconOnly` drops the text padding
// (square button) and needs `ariaLabel`; `square` makes any button square.
// `tone="danger"` colours a ghost / secondary button red.
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import SSpinner from './SSpinner.vue'
import SIcon from './SIcon.vue'

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
    icon?: string
    iconRight?: string
    iconOnly?: boolean
    square?: boolean
    ariaLabel?: string
    tone?: 'default' | 'danger'
  }>(),
  { variant: 'secondary', size: 'md', type: 'button', tone: 'default' }
)

if (isDev && props.iconOnly && !props.ariaLabel) {
  console.warn('[@sub2api/ui] <SButton icon-only> needs an aria-label')
}

const SQUARE: Record<string, string> = { sm: 'w-8 px-0', md: 'w-10 px-0', lg: 'w-12 px-0' }
const ICON: Record<string, string> = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' }
const inactive = computed(() => props.disabled || props.loading)
const cls = computed(() => [
  'btn',
  `btn-${props.variant}`,
  `btn-${props.size}`,
  props.block ? 'w-full' : '',
  props.iconOnly || props.square ? SQUARE[props.size] : '',
  props.tone === 'danger' ? '!text-red-600 hover:!bg-red-50 dark:!text-red-400 dark:hover:!bg-red-900/20' : '',
  (props.to || props.href) && inactive.value ? 'pointer-events-none cursor-not-allowed opacity-50' : ''
])
</script>

<template>
  <a v-if="(to || href) && inactive" :class="cls" role="link" aria-disabled="true" :aria-label="ariaLabel" :aria-busy="loading || undefined">
    <SSpinner v-if="loading" size="sm" decorative />
    <SIcon v-else-if="icon" :name="icon" :class="ICON[size]" />
    <slot v-if="!iconOnly || !icon" />
    <SIcon v-if="iconRight && !iconOnly" :name="iconRight" :class="ICON[size]" />
  </a>
  <RouterLink v-else-if="to" :to="to" :class="cls" :aria-label="ariaLabel">
    <SIcon v-if="icon" :name="icon" :class="ICON[size]" />
    <slot v-if="!iconOnly || !icon" />
    <SIcon v-if="iconRight && !iconOnly" :name="iconRight" :class="ICON[size]" />
  </RouterLink>
  <a v-else-if="href" :href="href" :class="cls" :aria-label="ariaLabel">
    <SIcon v-if="icon" :name="icon" :class="ICON[size]" />
    <slot v-if="!iconOnly || !icon" />
    <SIcon v-if="iconRight && !iconOnly" :name="iconRight" :class="ICON[size]" />
  </a>
  <button v-else :type="type" :class="cls" :disabled="disabled || loading" :aria-label="ariaLabel" :aria-busy="loading || undefined">
    <SSpinner v-if="loading" size="sm" decorative />
    <SIcon v-else-if="icon" :name="icon" :class="ICON[size]" />
    <slot v-if="!iconOnly || !icon" />
    <SIcon v-if="iconRight && !iconOnly" :name="iconRight" :class="ICON[size]" />
  </button>
</template>
