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
// (default 11rem). On phones (`mobile` sheet, default) the menu opens as a
// bottom action sheet instead: 48px items, #header above them and a Cancel
// row at the end; `mobile` popover keeps the floating menu.
import { Teleport, computed, nextTick, onBeforeUnmount, ref, useId } from 'vue'
import type { MenuAction } from './types'
import SIcon from './SIcon.vue'
import OverlaySurface from './internal/OverlaySurface.vue'
import { useUiT } from './i18n'
import { useFloating } from './floating'
import { navIndex } from './keyboard'
import { useViewport } from './viewport'

const props = withDefaults(
  defineProps<{
    actions: MenuAction[]
    label?: string
    ariaLabel?: string
    align?: 'start' | 'end'
    width?: string
    maxHeight?: string
    disabled?: boolean
    closeOnSelect?: boolean
    mobile?: 'sheet' | 'popover'
  }>(),
  { align: 'end', width: '11rem', closeOnSelect: true, mobile: 'sheet' }
)
const emit = defineEmits<{ (e: 'select', key: string): void; (e: 'open'): void; (e: 'close'): void }>()
const t = useUiT()
const open = ref(false)
const anchor = ref<HTMLElement>()
const menu = ref<HTMLElement>()
const menuId = useId()
const floating = useFloating(anchor, menu, { align: props.align, onLost: () => close(false) })
const visible = computed(() => props.actions.filter((a) => !a.hidden))
const { compact } = useViewport()
const sheet = computed(() => compact.value && props.mobile === 'sheet')
// The menu's container: the action sheet on phones, else <body> next to the trigger.
const host = computed(() =>
  sheet.value
    ? { is: OverlaySurface, props: { open: open.value, form: 'sheet' as const, flush: true, closeButton: false, onClose: () => close() } }
    : { is: Teleport, props: { to: 'body' } }
)

function onDoc(e: MouseEvent) {
  const target = e.target as Node
  if (anchor.value?.contains(target) || menu.value?.contains(target)) return
  close(false)
}
function items(): HTMLButtonElement[] {
  return Array.from(menu.value?.querySelectorAll<HTMLButtonElement>('button[role^="menuitem"]:not([disabled])') ?? [])
}
function show(focus: 'first' | 'last' = 'first') {
  if (props.disabled || open.value) return
  open.value = true
  emit('open')
  if (!sheet.value) document.addEventListener('mousedown', onDoc)
  nextTick(() => {
    if (!sheet.value) floating.start()
    items().at(focus === 'first' ? 0 : -1)?.focus({ preventScroll: true })
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
  if (props.closeOnSelect) close()
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
  const next = navIndex(e.key, list.indexOf(document.activeElement as HTMLButtonElement), list.length, 'vertical')
  if (next >= 0) {
    e.preventDefault()
    list[next].focus({ preventScroll: true })
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
    <component :is="host.is" v-bind="host.props">
      <div
        v-if="open || sheet"
        :id="menuId"
        ref="menu"
        role="menu"
        :class="sheet ? 'py-1' : 'dropdown fixed'"
        :style="sheet ? undefined : { ...floating.style.value, width, maxHeight, overflowY: maxHeight ? 'auto' : undefined }"
        @keydown="onMenuKey"
      >
        <div v-if="$slots.header" class="border-b border-line pb-2 pt-1.5 text-xs text-fg-muted" :class="sheet ? 'px-5' : 'px-4'" role="presentation">
          <slot name="header" />
        </div>
        <template v-for="a in visible" :key="a.key">
          <div v-if="a.divider" class="my-1 border-t border-line" role="separator" />
          <button
            type="button"
            :role="a.checked === undefined ? 'menuitem' : 'menuitemcheckbox'"
            :aria-checked="a.checked"
            tabindex="-1"
            class="dropdown-item"
            :class="[sheet ? 'min-h-12 gap-3 px-5 text-base' : '', a.danger ? '!text-red-600 dark:!text-red-400' : '']"
            :disabled="a.disabled"
            @click="pick(a)"
          >
            <SIcon v-if="a.icon" :name="a.icon" class="shrink-0 opacity-70" :class="sheet ? 'h-5 w-5' : 'h-4 w-4'" />
            <span class="min-w-0 flex-1 truncate">{{ a.label }}</span>
            <SIcon v-if="a.checked" name="check" class="h-4 w-4 shrink-0 text-primary-600" />
          </button>
        </template>
      </div>
      <button
        v-if="sheet"
        type="button"
        class="dropdown-item min-h-12 justify-center border-t border-line px-5 text-base font-medium"
        data-overlay-close
        @click="close()"
      >
        {{ t('ui.cancel') }}
      </button>
    </component>
  </span>
</template>
