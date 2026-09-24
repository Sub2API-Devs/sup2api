<script setup lang="ts">
import { dismissToast, toastState } from './feedback'

const tone: Record<string, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-900/40 dark:text-emerald-200',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800/50 dark:bg-red-900/40 dark:text-red-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/40 dark:text-amber-200',
  info: 'border-gray-200 bg-white text-gray-800 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-100'
}
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
      <TransitionGroup name="s-toast">
        <div
          v-for="t in toastState.items"
          :key="t.id"
          class="pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg"
          :class="tone[t.kind]"
          role="alert"
        >
          <span class="flex-1 break-words">{{ t.message }}</span>
          <button class="opacity-50 hover:opacity-100" @click="dismissToast(t.id)">×</button>
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
