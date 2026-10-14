<script setup lang="ts">
// Action menu teleported to <body> next to its trigger. Items are buttons
// (role="menuitem"): Arrow keys / Home / End move, Enter / Space pick,
// Escape closes and returns focus to the trigger, Tab closes. The default
// trigger is a small ghost button showing the default slot, `label`, or the
// `more` icon (aria-label `ariaLabel` or "More actions"). #trigger replaces
// the whole trigger: slot props {open, toggle, attrs} — bind `attrs`
// (aria-haspopup / aria-expanded / aria-controls) and call `toggle` from
// your own button. #header renders above the items. `align` end (default:
// the menu's right edge at the trigger's) or start; `width` any CSS width
// (default 11rem).
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue'
import type { MenuAction } from './types'
import SIcon from './SIcon.vue'
import { useUiT } from './i18n'
import { useFloating } from './floating'

const props = withDefaults(
  defineProps<{ actions: MenuAction[]; label?: string; ariaLabel?: string; align?: 'start' | 'end'; width?: string; disabled?: boolean }>(),
  { align: 'end', width: '11rem' }
)
const emit = defineEmits<{ (e: 'select', key: string): void; (e: 'open'): void; (e: 'close'): void }>()
const t = useUiT()
const open = ref(false)
const anchor = ref<HTMLElement>()
const menu = ref<HTMLElement>()
const menuId = useId()
const floating = useFloating(anchor, menu, { align: props.align, onLost: () => close(false) })
const visible = computed(() => props.actions.filter((a) => !a.hidden))

function onDoc(e: MouseEvent) {
  const target = e.target as Node
  if (anchor.value?.contains(target) || menu.value?.contains(target)) return
  close(false)
}
function items(): HTMLButtonElement[] {
  return Array.from(menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? [])
}
function focusItem(i: number) {
  const list = items()
  if (!list.length) return
  list[(i + list.length) % list.length].focus({ preventScroll: true })
}
function show(focus: 'first' | 'last' = 'first') {
  if (props.disabled || open.value) return
  open.value = true
  emit('open')
  document.addEventListener('mousedown', onDoc)
  nextTick(() => {
    floating.start()
    focusItem(focus === 'first' ? 0 : -1)
  })
}
function close(restore = true) {
  if (!open.value) return
  open.value = false
  floating.stop()
  document.removeEventListener('mousedown', onDoc)
  emit('close')
  if (restore) nextTick(() => anchor.value?.querySelector<HTMLElement>('button, [tabindex]:not([tabindex="-1"]), a[href]')?.focus({ preventScroll: true }))
}
function toggle() {
  if (open.value) close(false)
  else show()
}
function pick(a: MenuAction) {
  if (a.disabled) return
  close()
  emit('select', a.key)
}
function onTriggerKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    show(e.key === 'ArrowDown' ? 'first' : 'last')
  }
}
function onMenuKey(e: KeyboardEvent) {
  const list = items()
  const i = list.indexOf(document.activeElement as HTMLButtonElement)
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusItem(i + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focusItem(i < 0 ? -1 : i - 1)
  } else if (e.key === 'Home') {
    e.preventDefault()
    focusItem(0)
  } else if (e.key === 'End') {
    e.preventDefault()
    focusItem(-1)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    close()
  } else if (e.key === 'Tab') {
    close(false)
  }
}
const triggerAttrs = computed(() => ({
  'aria-haspopup': 'menu' as const,
  'aria-expanded': open.value,
  'aria-controls': open.value ? menuId : undefined
}))
onBeforeUnmount(() => close(false))
defineExpose({ open: () => show(), close: () => close(false) })
</script>

<template>
  <span ref="anchor" class="inline-block" @keydown="onTriggerKey">
    <slot name="trigger" :open="open" :toggle="toggle" :attrs="triggerAttrs">
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        :class="!label && !$slots.default ? 'w-8 px-0' : ''"
        :disabled="disabled"
        :aria-label="ariaLabel || (label || $slots.default ? undefined : t('ui.moreActions'))"
        v-bind="triggerAttrs"
        @click.stop="toggle"
      >
        <slot>
          <span v-if="label">{{ label }}</span>
          <SIcon v-else name="more" class="h-4 w-4" />
        </slot>
      </button>
    </slot>
    <Teleport to="body">
      <div
        v-if="open"
        :id="menuId"
        ref="menu"
        role="menu"
        class="dropdown fixed"
        :style="{ ...floating.style.value, width }"
        @keydown="onMenuKey"
      >
        <div v-if="$slots.header" class="border-b border-line px-4 pb-2 pt-1.5 text-xs text-fg-muted" role="presentation"><slot name="header" /></div>
        <template v-for="a in visible" :key="a.key">
          <div v-if="a.divider" class="my-1 border-t border-line" role="separator" />
          <button
            type="button"
            role="menuitem"
            tabindex="-1"
            class="dropdown-item"
            :class="a.danger ? '!text-red-600 dark:!text-red-400' : ''"
            :disabled="a.disabled"
            @click="pick(a)"
          >
            <SIcon v-if="a.icon" :name="a.icon" class="h-4 w-4 shrink-0 opacity-70" />
            <span class="min-w-0 flex-1 truncate">{{ a.label }}</span>
          </button>
        </template>
      </div>
    </Teleport>
  </span>
</template>
