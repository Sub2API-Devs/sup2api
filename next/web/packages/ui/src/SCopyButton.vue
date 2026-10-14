<script setup lang="ts">
// Copies `text` to the clipboard (navigator.clipboard, falling back to
// execCommand) and toasts "Copied" / "Copy failed" (`toast` = false keeps
// quiet). Shows a check for 1.5 s after copying. `label` defaults to
// "Copy"; `iconOnly` renders a square icon button (the label becomes its
// aria-label and title). Emits `copied(text)` or `error`.
import { onBeforeUnmount, ref } from 'vue'
import SButton from './SButton.vue'
import { useUiT } from './i18n'
import { copyToClipboard } from './clipboard'
import { toast as showToast } from './feedback'

const props = withDefaults(
  defineProps<{
    text: string | number | null | undefined
    label?: string
    iconOnly?: boolean
    size?: 'sm' | 'md'
    variant?: 'ghost' | 'secondary'
    toast?: boolean
    disabled?: boolean
  }>(),
  { size: 'sm', variant: 'ghost', toast: true }
)
const emit = defineEmits<{ (e: 'copied', text: string): void; (e: 'error'): void }>()
const t = useUiT()
const done = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function copy() {
  const text = String(props.text ?? '')
  const ok = await copyToClipboard(text)
  if (ok) {
    done.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (done.value = false), 1500)
    if (props.toast) showToast(t('ui.copied'), 'success')
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
    :disabled="disabled || text === null || text === undefined || text === ''"
    @click.stop="copy"
  >
    {{ done ? t('ui.copied') : label || t('ui.copy') }}
  </SButton>
</template>
