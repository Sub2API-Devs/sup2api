<script setup lang="ts">
// Statistic card: label, value (skeleton while `loading`), trend (▲/▼ %),
// `sub` line, default slot. `compact` is a smaller variant (dense KPI rows).
// With a `click` listener or `selectable` it renders as a <button>
// (filter tiles); `selected` highlights it and sets aria-pressed. `to`
// renders a <RouterLink>, `href` an <a> (a tile that opens a page).
import { computed, getCurrentInstance } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import SIcon from './SIcon.vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    sub?: string
    icon?: string
    tone?: 'primary' | 'success' | 'warning' | 'danger'
    trend?: number | null
    loading?: boolean
    selected?: boolean
    selectable?: boolean
    compact?: boolean
    to?: string | RouteLocationRaw
    href?: string
  }>(),
  { tone: 'primary', selected: undefined }
)
const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()
const inst = getCurrentInstance()
const button = computed(() => props.selectable || props.selected !== undefined || !!inst?.vnode.props?.onClick)
const interactive = computed(() => button.value || !!props.to || !!props.href)
const target = computed(() => {
  if (props.to) return { is: RouterLink, attrs: { to: props.to } }
  if (props.href) return { is: 'a', attrs: { href: props.href } }
  if (button.value) return { is: 'button', attrs: { type: 'button' } }
  return { is: 'div', attrs: {} }
})
</script>

<template>
  <component
    :is="target.is"
    v-bind="target.attrs"
    class="stat-card w-full text-left"
    :class="[
      compact ? '!gap-3 !p-3.5' : '',
      interactive ? 'transition-shadow hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50' : '',
      selected ? '!border-primary-400 ring-1 ring-primary-400 dark:!border-primary-500 dark:ring-primary-500' : ''
    ]"
    :aria-pressed="button && selected !== undefined ? selected : undefined"
    @click="emit('click', $event)"
  >
    <div v-if="icon" class="stat-icon" :class="[`stat-icon-${tone}`, compact ? '!h-9 !w-9' : '']">
      <SIcon :name="icon" :class="compact ? 'h-5 w-5' : 'h-6 w-6'" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="stat-label" :class="compact ? '!text-xs' : ''">{{ label }}</p>
      <p class="stat-value" :class="compact ? '!text-xl' : ''">
        <span v-if="loading" class="inline-block h-7 w-20 animate-pulse rounded bg-gray-200 dark:bg-dark-700" />
        <template v-else>{{ value }}</template>
      </p>
      <p v-if="trend !== undefined && trend !== null" class="stat-trend" :class="trend >= 0 ? 'stat-trend-up' : 'stat-trend-down'">
        {{ trend >= 0 ? '▲' : '▼' }} {{ Math.abs(trend).toFixed(1) }}%
      </p>
      <p v-if="sub" class="mt-1 truncate text-xs text-gray-500 dark:text-dark-400">{{ sub }}</p>
      <slot />
    </div>
  </component>
</template>
