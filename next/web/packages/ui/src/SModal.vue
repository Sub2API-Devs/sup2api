<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
    closable?: boolean
    persistent?: boolean
  }>(),
  { width: 'md', closable: true }
)
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'close'): void }>()
const { t } = useI18n()

const widths: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl'
}

function close() {
  emit('update:open', false)
  emit('close')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open && props.closable && !props.persistent) close()
}

watch(
  () => props.open,
  (v) => {
    if (v) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  },
  { immediate: true }
)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="s-modal">
      <div v-if="open" class="modal-overlay" @mousedown.self="!persistent && closable && close()">
        <div class="modal-content flex flex-col" :class="widths[width]" role="dialog" aria-modal="true">
          <div v-if="title || $slots.header || closable" class="modal-header">
            <slot name="header">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
            </slot>
            <button v-if="closable" class="btn-ghost rounded-lg p-1.5" :aria-label="t('ui.close')" @click="close">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
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
