<script setup lang="ts">
// Dialog teleported to <body>. Open modals and drawers form a stack: only
// the topmost one closes on Escape, Tab stays inside it, the page behind does
// not scroll, focus moves in on open ([data-autofocus] / [autofocus], else
// the first focusable control of the body, else the dialog) and returns to
// the opener on close. `persistent`: Escape and the backdrop do not close it
// (the × still does). `closable` = false hides the × and also implies
// persistent (the parent closes it). `top` stacks it above everything else
// (confirmations asked from inside a modal; later modals stack above earlier
// ones anyway).
import { ref, useId } from 'vue'
import { useUiT } from './i18n'
import SIcon from './SIcon.vue'
import { useDialog } from './overlay'
import { resetTitleContext } from './titleContext'
resetTitleContext()

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
    closable?: boolean
    persistent?: boolean
    /** Stacks above other open modals (confirmations asked from inside a modal). */
    top?: boolean
    /** Accessible description: id of an element inside the body. */
    describedby?: string
  }>(),
  { width: 'md', closable: true }
)
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'close'): void }>()
const t = useUiT()
const titleId = useId()
const panel = ref<HTMLElement>()

const widths: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl'
}

const { dismissible, close, zIndex } = useDialog(props, emit, panel)
</script>

<template>
  <Teleport to="body">
    <Transition name="s-modal">
      <div v-if="open" class="modal-overlay" :style="{ zIndex }" @mousedown.self="dismissible && close()">
        <div
          ref="panel"
          class="modal-content flex flex-col"
          :class="widths[width]"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="title || $slots.header ? titleId : undefined"
          :aria-describedby="describedby"
        >
          <div v-if="title || $slots.header || closable" class="modal-header">
            <div :id="titleId" class="min-w-0 flex-1">
              <slot name="header">
                <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
              </slot>
            </div>
            <button
              v-if="closable"
              type="button"
              class="btn btn-ghost btn-sm w-8 shrink-0 px-0"
              data-overlay-close
              :aria-label="t('ui.close')"
              @click="close"
            >
              <SIcon name="x" class="h-5 w-5" />
            </button>
          </div>
          <div class="modal-body flex-1 overflow-y-auto">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.s-modal-enter-active,
.s-modal-leave-active {
  transition: opacity 0.15s ease;
}
.s-modal-enter-from,
.s-modal-leave-to {
  opacity: 0;
}
</style>
