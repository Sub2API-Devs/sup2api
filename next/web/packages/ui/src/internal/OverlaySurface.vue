<script setup lang="ts">
// The dialog surface behind SModal, SDrawer and the phone sheets of
// SDropdown / SSelect: teleported to <body>, a layer of the modal stack
// (useDialog), with a header (`title` / `description` or #header, and the
// close button), a scrolling body and #footer. `form`:
// - center: the floating dialog (the console's .modal-* classes); on phones
//   it keeps 16px from the screen edges;
// - right / left: a full-height side panel at most `width` wide (sm 24rem,
//   md 32rem, lg 42rem, xl 56rem, 2xl 72rem or any CSS width; also the
//   center dialog's width);
// - sheet: a bottom sheet with a grab handle, swipe down closes it (unless
//   persistent); `fill` gives it its full height (pickers whose list changes
//   length);
// - fullscreen: a full-screen page, sliding in from the right when its
//   close button is `back`, from the bottom otherwise.
// Sheets and pages fit above the soft keyboard (--s-vvh) and keep their
// footer clear of the home indicator. `closeButton` x (default) / back (an
// arrow before the title) / none (dismissed by the backdrop, Escape, Back or
// a swipe only); `closable` false hides it and implies persistent. `flush`
// drops the body padding (full-width lists).
import { computed, ref, useId } from 'vue'
import { useUiT } from '../i18n'
import SIcon from '../SIcon.vue'
import { useDialog, useSheetSwipe, type OverlayForm } from '../overlay'
import { resetTitleContext } from '../titleContext'
resetTitleContext()

const props = withDefaults(
  defineProps<{
    open: boolean
    form: OverlayForm
    title?: string
    description?: string
    describedby?: string
    width?: string
    closable?: boolean
    persistent?: boolean
    top?: boolean
    closeButton?: 'x' | 'back' | 'none'
    fill?: boolean
    flush?: boolean
  }>(),
  { title: undefined, description: undefined, describedby: undefined, width: 'md', closable: true, closeButton: 'x' }
)
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'close'): void }>()
const t = useUiT()
const titleId = useId()
const panel = ref<HTMLElement>()
const body = ref<HTMLElement>()
const { dismissible, close, zIndex } = useDialog(props, emit, panel)
const swipe = useSheetSwipe(panel, body, () => props.form === 'sheet' && dismissible.value, close)

const WIDTHS: Record<string, string> = { sm: '24rem', md: '32rem', lg: '42rem', xl: '56rem', '2xl': '72rem' }
const DRAWER_PANEL = 's-drawer-panel flex w-full flex-col border-line bg-surface shadow-modal outline-none'
const FORMS: Record<OverlayForm, { overlay: string; panel: string }> = {
  center: { overlay: 'modal-overlay', panel: 'modal-content flex flex-col max-md:w-[calc(100vw-32px)]' },
  right: { overlay: 'fixed inset-0 flex justify-end bg-black/40 backdrop-blur-[2px]', panel: 's-drawer-right h-full border-l' },
  left: { overlay: 'fixed inset-0 flex justify-start bg-black/40 backdrop-blur-[2px]', panel: 's-drawer-left h-full border-r' },
  sheet: {
    overlay: 'fixed inset-x-0 top-0 flex h-[var(--s-vvh,100dvh)] items-end bg-black/40 backdrop-blur-[2px]',
    panel: 's-drawer-bottom max-h-[calc(var(--s-vvh,100dvh)*0.92)] rounded-t-panel border-t pb-[env(safe-area-inset-bottom)]'
  },
  fullscreen: {
    overlay: 'fixed inset-x-0 top-0 flex h-[var(--s-vvh,100dvh)] bg-black/40',
    panel: 'h-full pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]'
  }
}
const center = computed(() => props.form === 'center')
const back = computed(() => props.closeButton === 'back')
const showClose = computed(() => props.closable && props.closeButton !== 'none')
const panelClass = computed(() => [
  center.value ? '' : DRAWER_PANEL,
  FORMS[props.form].panel,
  props.form === 'sheet' && props.fill ? 'h-[calc(var(--s-vvh,100dvh)*0.92)]' : '',
  props.form === 'fullscreen' ? (back.value ? 's-drawer-right' : 's-drawer-bottom') : ''
])
const panelStyle = computed(() =>
  props.form === 'sheet' || props.form === 'fullscreen' ? undefined : { maxWidth: WIDTHS[props.width] ?? props.width }
)
</script>

<template>
  <Teleport to="body">
    <Transition :name="center ? 's-modal' : 's-drawer'">
      <div v-if="open" :class="FORMS[form].overlay" :style="{ zIndex }" @mousedown.self="dismissible && close()">
        <div
          ref="panel"
          :class="panelClass"
          :style="panelStyle"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="title || $slots.header ? titleId : undefined"
          :aria-describedby="describedby"
        >
          <div v-if="form === 'sheet'" class="flex shrink-0 touch-none justify-center pb-1 pt-2" @pointerdown="swipe">
            <div class="h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
          </div>
          <div
            v-if="title || $slots.header || showClose"
            :class="
              center
                ? 'modal-header'
                : ['flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-3.5', form === 'sheet' ? 'touch-none' : '']
            "
            @pointerdown="swipe"
          >
            <div :id="titleId" class="min-w-0 flex-1">
              <slot name="header">
                <h3 :class="center ? 'text-base font-semibold text-gray-900 dark:text-white' : 'truncate text-base font-semibold text-fg'">
                  {{ title }}
                </h3>
                <p v-if="description" class="mt-0.5 text-xs leading-5 text-fg-muted">{{ description }}</p>
              </slot>
            </div>
            <button
              v-if="showClose"
              type="button"
              class="btn btn-ghost btn-sm w-8 shrink-0 px-0"
              :class="back ? 'order-first' : ''"
              data-overlay-close
              :aria-label="back ? t('ui.back') : t('ui.close')"
              @click="close"
            >
              <SIcon :name="back ? 'arrow-left' : 'x'" class="h-5 w-5" />
            </button>
          </div>
          <div
            ref="body"
            :class="center ? 'modal-body flex-1 overflow-y-auto' : ['min-h-0 flex-1 overflow-y-auto', flush ? '' : 'px-5 py-4']"
          >
            <slot />
          </div>
          <div
            v-if="$slots.footer"
            :class="center ? 'modal-footer' : 'flex shrink-0 items-center justify-end gap-3 border-t border-line px-5 py-3.5'"
          >
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
