// State helpers shared by the toggle-like controls.
import { computed, nextTick, ref, type Ref } from 'vue'

/**
 * Open state that is controlled by `open` (v-model:open) when the parent
 * passes it and kept locally (starting at `defaultOpen`) otherwise.
 */
export function useOpenState(props: { open?: boolean; defaultOpen?: boolean }, emit: (e: 'update:open', v: boolean) => void) {
  const inner = ref(!!props.defaultOpen)
  const isOpen = computed(() => props.open ?? inner.value)
  function toggle() {
    inner.value = !isOpen.value
    emit('update:open', inner.value)
  }
  return { isOpen, toggle }
}

/**
 * Click / change handling of a native checkbox bound to a boolean
 * `modelValue` (SCheckbox, SSwitch). A click (pointer, label, Space) emits
 * the toggled value and the change event that follows is ignored; a change
 * without a click (setChecked in tests, form scripts) emits the new checked
 * state. After emitting, the DOM is written back to `modelValue`, so a
 * parent that keeps the old value stays in control.
 */
export function useCheckboxModel(
  props: { modelValue: boolean; disabled?: boolean },
  emit: (e: 'update:modelValue', v: boolean) => void,
  input: Ref<HTMLInputElement | undefined>,
  sync: () => void = () => {
    if (input.value && input.value.checked !== !!props.modelValue) input.value.checked = !!props.modelValue
  }
) {
  let clicked = false
  function onClick() {
    if (props.disabled) return
    clicked = true
    Promise.resolve().then(() => (clicked = false))
    emit('update:modelValue', !props.modelValue)
    nextTick(sync)
  }
  function onChange(e: Event) {
    if (clicked) {
      clicked = false
      return
    }
    emit('update:modelValue', (e.target as HTMLInputElement).checked)
    nextTick(sync)
  }
  return { onClick, onChange }
}

/**
 * After a choice was emitted, sets the input of each option label
 * (`root > label > input`, one per option in order; inputs in slot content
 * are skipped) to `isOn(index)`, so a parent that keeps the old value stays
 * in control (SSegmented, SChoiceCards).
 */
export function writeBackChecked(root: Ref<HTMLElement | undefined>, isOn: (index: number) => boolean) {
  nextTick(() => {
    root.value?.querySelectorAll<HTMLInputElement>(':scope > label > input').forEach((el, i) => {
      const want = isOn(i)
      if (el.checked !== want) el.checked = want
    })
  })
}
