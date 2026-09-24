<script setup lang="ts">
import { computed } from 'vue'
import { initialOf } from '../pluginUtil'

// icon follows manifest.icon: "text:<label>", or a path inside the package
// (resolved against assetBase when given), or an absolute URL.
const props = withDefaults(
  defineProps<{ name: string; pluginKey: string; icon?: string | null; assetBase?: string | null; size?: 'sm' | 'md' | 'lg' }>(),
  { size: 'md' }
)

const palette = ['bg-teal-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-500', 'bg-indigo-500']
const color = computed(() => {
  let h = 0
  for (const c of props.pluginKey || props.name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return palette[h % palette.length]
})
const sizeCls = computed(() => (props.size === 'sm' ? 'h-7 w-7 text-xs' : props.size === 'lg' ? 'h-12 w-12 text-lg' : 'h-9 w-9 text-sm'))

const label = computed(() => {
  const icon = props.icon?.trim() ?? ''
  if (icon.startsWith('text:') && icon.length > 5) return icon.slice(5, 7)
  return initialOf(props.name, props.pluginKey)
})
const src = computed(() => {
  const icon = props.icon?.trim() ?? ''
  if (!icon || icon.startsWith('text:')) return ''
  if (/^(https?:)?\//.test(icon) || icon.startsWith('data:')) return icon
  return props.assetBase ? props.assetBase.replace(/\/$/, '') + '/' + icon.replace(/^\.?\//, '') : ''
})
</script>

<template>
  <img v-if="src" :src="src" alt="" class="shrink-0 rounded-lg object-cover" :class="sizeCls" />
  <span v-else class="inline-flex shrink-0 items-center justify-center rounded-lg font-semibold text-white" :class="[sizeCls, color]">
    {{ label }}
  </span>
</template>
