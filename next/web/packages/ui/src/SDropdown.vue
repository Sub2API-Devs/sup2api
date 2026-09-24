<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import type { MenuAction } from './types'
import SIcon from './SIcon.vue'

defineProps<{ actions: MenuAction[]; label?: string }>()
const emit = defineEmits<{ (e: 'select', key: string): void }>()
const open = ref(false)
const btn = ref<HTMLElement>()
const menu = ref<HTMLElement>()
const pos = ref({ top: 0, left: 0 })

function onDoc(e: MouseEvent) {
  const t = e.target as Node
  if (btn.value?.contains(t) || menu.value?.contains(t)) return
  close()
}
function toggle() {
  if (open.value) return close()
  const r = btn.value!.getBoundingClientRect()
  pos.value = { top: r.bottom + 4, left: Math.max(8, r.right - 176) }
  open.value = true
  document.addEventListener('mousedown', onDoc)
  window.addEventListener('scroll', close, true)
  window.addEventListener('resize', close)
}
function close() {
  open.value = false
  document.removeEventListener('mousedown', onDoc)
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('resize', close)
}
function pick(a: MenuAction) {
  if (a.disabled) return
  close()
  emit('select', a.key)
}
onBeforeUnmount(close)
</script>

<template>
  <span class="inline-block">
    <button ref="btn" type="button" class="btn btn-ghost btn-sm" @click.stop="toggle">
      <slot>
        <span v-if="label">{{ label }}</span>
        <SIcon v-else name="more" class="h-4 w-4" />
      </slot>
    </button>
    <Teleport to="body">
      <div
        v-if="open"
        ref="menu"
        class="dropdown fixed w-44"
        :style="{ top: pos.top + 'px', left: pos.left + 'px' }"
      >
        <template v-for="a in actions" :key="a.key">
          <div
            v-if="!a.hidden"
            class="dropdown-item"
            :class="[a.danger ? '!text-red-600 dark:!text-red-400' : '', a.disabled ? 'cursor-not-allowed opacity-40' : '']"
            @click="pick(a)"
          >
            {{ a.label }}
          </div>
        </template>
      </div>
    </Teleport>
  </span>
</template>
