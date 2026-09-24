<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
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
function place() {
  const r = btn.value?.getBoundingClientRect()
  if (!r) return close()
  if (r.bottom < 0 || r.top > window.innerHeight) return close()
  const h = menu.value?.offsetHeight || 0
  const below = r.bottom + 4
  const top = below + h > window.innerHeight - 8 && r.top - h - 4 > 8 ? r.top - h - 4 : below
  pos.value = { top, left: Math.max(8, r.right - 176) }
}
function toggle() {
  if (open.value) return close()
  place()
  open.value = true
  nextTick(place)
  document.addEventListener('mousedown', onDoc)
  window.addEventListener('scroll', place, true)
  window.addEventListener('resize', place)
}
function close() {
  open.value = false
  document.removeEventListener('mousedown', onDoc)
  window.removeEventListener('scroll', place, true)
  window.removeEventListener('resize', place)
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
