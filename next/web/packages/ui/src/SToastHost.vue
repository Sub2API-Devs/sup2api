<script setup lang="ts">
// Mounted once by the console. Errors are announced assertively
// (role="alert"), other kinds politely (role="status"); hovering or focusing
// a toast pauses its countdown.
import { dismissToast, pauseToast, resumeToast, toastState } from './feedback'
import { useUiT } from './i18n'
import SIcon from './SIcon.vue'

const t = useUiT()
const tone: Record<string, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-900/40 dark:text-emerald-200',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800/50 dark:bg-red-900/40 dark:text-red-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/40 dark:text-amber-200',
  info: 'border-gray-200 bg-white text-gray-800 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-100'
}
const icon: Record<string, string> = { success: 'check', error: 'warning', warning: 'warning', info: 'info' }
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed right-4 top-4 z-toast flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      <TransitionGroup name="s-toast">
        <div
          v-for="item in toastState.items"
          :key="item.id"
          class="pointer-events-auto flex items-start gap-2 rounded-control border px-4 py-3 text-sm shadow-popover"
          :class="tone[item.kind]"
          :role="item.kind === 'error' ? 'alert' : 'status'"
          :aria-live="item.kind === 'error' ? 'assertive' : 'polite'"
          @mouseenter="pauseToast(item.id)"
          @mouseleave="resumeToast(item.id)"
          @focusin="pauseToast(item.id)"
          @focusout="resumeToast(item.id)"
        >
          <SIcon :name="icon[item.kind] || 'info'" class="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
          <span class="flex-1 break-words">{{ item.message }}</span>
          <button
            type="button"
            class="shrink-0 rounded opacity-50 hover:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-current"
            :aria-label="t('ui.dismiss')"
            @click="dismissToast(item.id)"
          >
            <SIcon name="x" class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.s-toast-enter-active,
.s-toast-leave-active {
  transition: all 0.2s ease;
}
.s-toast-enter-from,
.s-toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
