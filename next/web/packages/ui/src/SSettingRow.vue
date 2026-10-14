<script setup lang="ts">
// One setting: label and short description on the left, its control on the
// right (below it on narrow screens, or always with `stacked` for wide
// controls). The `details` slot is a longer explanation, collapsed behind a
// toggle. Like SField, the first @sub2api/ui control inside without an `id`
// takes the label's id (`for` names a control id explicitly), and gets
// aria-describedby (description / error) and aria-invalid. `error` shows a
// message under the control. Remaining attrs (data-testid, ...) go to the
// root. `dense` is for rows of a label and a small control only.
import { computed, useId, useSlots } from 'vue'
import SDisclosure from './SDisclosure.vue'
import { provideField, type ControlSize } from './field'

const props = defineProps<{
  label?: string
  description?: string
  stacked?: boolean
  dense?: boolean
  for?: string
  error?: string
  required?: boolean
  size?: ControlSize
}>()
const slots = useSlots()
const uid = useId()
const controlId = computed(() => props.for || `${uid}-control`)
const hasDescription = computed(() => !!props.description || !!slots.description)
const ctx = provideField({
  controlId,
  labelId: computed(() => `${uid}-label`),
  describedBy: computed(() => [props.error ? `${uid}-error` : '', hasDescription.value ? `${uid}-desc` : ''].filter(Boolean).join(' ') || undefined),
  invalid: computed(() => !!props.error),
  size: computed(() => props.size)
})
const labelFor = computed(() => (props.for || ctx.claimed.value ? controlId.value : undefined))
</script>

<template>
  <div class="grid gap-3" :class="[dense ? 'py-2.5' : 'py-4', stacked ? '' : 'sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8']">
    <div class="min-w-0">
      <component :is="labelFor ? 'label' : 'p'" :id="`${uid}-label`" :for="labelFor" class="text-sm font-medium text-fg">
        <slot name="label">{{ label }}</slot><span v-if="required" class="ml-0.5 text-red-500" aria-hidden="true">*</span>
      </component>
      <p v-if="hasDescription" :id="`${uid}-desc`" class="mt-1 max-w-3xl text-xs leading-5 text-fg-muted">
        <slot name="description">{{ description }}</slot>
      </p>
      <SDisclosure v-if="$slots.details" class="mt-1.5"><slot name="details" /></SDisclosure>
    </div>
    <div class="min-w-0" :class="stacked ? '' : 'sm:justify-self-end'">
      <div class="flex min-w-0 flex-wrap items-center gap-2" :class="stacked ? '' : 'sm:justify-end'"><slot /></div>
      <p v-if="error" :id="`${uid}-error`" class="input-error-text" :class="stacked ? '' : 'sm:text-right'">{{ error }}</p>
    </div>
  </div>
</template>
