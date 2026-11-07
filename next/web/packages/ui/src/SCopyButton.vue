<script setup lang="ts">
// Copies `text` to the clipboard (navigator.clipboard, falling back to
// execCommand) and toasts "Copied" / "Copy failed" (`toast` = false keeps
// quiet). Shows a check for 1.5 s after copying. `label` defaults to
// "Copy"; `iconOnly` renders a square icon button (the label becomes its
// aria-label and title). Emits `copied(text)` or `error`. On touch screens
// it stays visible inside hover-revealed containers and the "Copied" toast
// is short (the finger hides the check).
import { onBeforeUnmount, ref } from 'vue'
import SButton from './SButton.vue'
import { useUiT } from './i18n'
import { copyToClipboard } from './clipboard'
import { toast as showToast } from './feedback'
import { isBlank } from './value'
import { useViewport } from './viewport'

const props = withDefaults(
  defineProps<{
    text: string | number | null | undefined
    label?: string
    iconOnly?: boolean
    size?: 'xs' | 'sm' | 'md'
    variant?: 'ghost' | 'secondary'
    toast?: boolean
    disabled?: boolean
  }>(),
  { size: 'sm', variant: 'ghost', toast: true }
)
const emit = defineEmits<{ (e: 'copied', text: string): void; (e: 'error'): void }>()
const t = useUiT()
const { touch } = useViewport()
const done = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function copy() {
  const text = String(props.text ?? '')
  const ok = await copyToClipboard(text)
  if (ok) {
    done.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (done.value = false), 1500)
    if (props.toast) showToast(t('ui.copied'), 'success', touch.value ? 1500 : undefined)
    emit('copied', text)
  } else {
    if (props.toast) showToast(t('ui.copyFailed'), 'error')
    emit('error')
  }
}
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <SButton
    :variant="variant"
    :size="size"
    :icon="done ? 'check' : 'copy'"
    :icon-only="iconOnly"
    :aria-label="iconOnly ? label || t('ui.copy') : undefined"
    :title="iconOnly ? label || t('ui.copy') : undefined"
    :disabled="disabled || isBlank(text)"
    class="touch:enabled:!opacity-100"
    @click.stop="copy"
  >
    {{ done ? t('ui.copied') : label || t('ui.copy') }}
  </SButton>
</template>
