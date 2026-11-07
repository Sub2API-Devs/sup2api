<script setup lang="ts">
// Side panel teleported to <body> (details next to a list, long forms), or
// with `side` bottom a bottom sheet (phone menus, pickers, short forms): full
// width, at most 92% of the screen high, clear of the home indicator.
// Shares the modal layer stack with SModal: Escape closes only the topmost
// layer, Tab stays inside, page scroll is locked, focus moves in and back.
// `side` right (default) / left / bottom; `width` sm 24rem, md 32rem
// (default), lg 42rem, xl 56rem or any CSS width (ignored by a bottom sheet). `persistent`: Escape and the backdrop
// do not close it; `closable` = false hides the × (and implies persistent).
import { computed, ref, useId } from 'vue'
import { useUiT } from './i18n'
import SIcon from './SIcon.vue'
import { useDialog } from './overlay'
import { resetTitleContext } from './titleContext'
resetTitleContext()

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    description?: string
    side?: 'right' | 'left' | 'bottom'
    width?: 'sm' | 'md' | 'lg' | 'xl' | string
    closable?: boolean
    persistent?: boolean
  }>(),
  { side: 'right', width: 'md', closable: true }
)
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'close'): void }>()
const t = useUiT()
const titleId = useId()
const panel = ref<HTMLElement>()
const WIDTHS: Record<string, string> = { sm: '24rem', md: '32rem', lg: '42rem', xl: '56rem' }
const { dismissible, close, zIndex } = useDialog(props, emit, panel)
const SIDES = {
  right: { overlay: 'justify-end', panel: 's-drawer-right h-full border-l' },
  left: { overlay: 'justify-start', panel: 's-drawer-left h-full border-r' },
  bottom: { overlay: 'items-end', panel: 's-drawer-bottom max-h-[92dvh] rounded-t-panel border-t pb-[env(safe-area-inset-bottom)]' }
}
const sheet = computed(() => props.side === 'bottom')
</script>

<template>
  <Teleport to="body">
    <Transition name="s-drawer">
      <div v-if="open" class="fixed inset-0 flex bg-black/40 backdrop-blur-[2px]" :class="SIDES[side].overlay" :style="{ zIndex }" @mousedown.self="dismissible && close()">
        <div
          ref="panel"
          class="s-drawer-panel flex w-full flex-col border-line bg-surface shadow-modal outline-none"
          :class="SIDES[side].panel"
          :style="sheet ? undefined : { maxWidth: WIDTHS[width] || width }"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="title || $slots.header ? titleId : undefined"
        >
          <div v-if="sheet" class="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
          <div v-if="title || $slots.header || closable" class="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-3.5">
            <div :id="titleId" class="min-w-0 flex-1">
              <slot name="header">
                <h3 class="truncate text-base font-semibold text-fg">{{ title }}</h3>
                <p v-if="description" class="mt-0.5 text-xs leading-5 text-fg-muted">{{ description }}</p>
              </slot>
            </div>
            <button v-if="closable" type="button" class="btn btn-ghost btn-sm w-8 shrink-0 px-0" data-overlay-close :aria-label="t('ui.close')" @click="close">
              <SIcon name="x" class="h-5 w-5" />
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <slot />
          </div>
          <div v-if="$slots.footer" class="flex shrink-0 items-center justify-end gap-3 border-t border-line px-5 py-3.5">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.s-drawer-enter-active,
.s-drawer-leave-active {
  transition: opacity 0.2s ease;
}
.s-drawer-enter-active .s-drawer-panel,
.s-drawer-leave-active .s-drawer-panel {
  transition: transform 0.2s ease;
}
.s-drawer-enter-from,
.s-drawer-leave-to {
  opacity: 0;
}
.s-drawer-enter-from .s-drawer-right,
.s-drawer-leave-to .s-drawer-right {
  transform: translateX(100%);
}
.s-drawer-enter-from .s-drawer-left,
.s-drawer-leave-to .s-drawer-left {
  transform: translateX(-100%);
}
.s-drawer-enter-from .s-drawer-bottom,
.s-drawer-leave-to .s-drawer-bottom {
  transform: translateY(100%);
}
</style>
