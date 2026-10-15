<script setup lang="ts">
// Large selectable cards (pick an account type, a plan, a mode): each
// option shows `icon`, `label`, `description`. A radio group (arrow keys
// move) or, with `multiple`, a group of checkboxes — then modelValue is an
// array. `cols` 1–4 columns from sm: up (phones: one column). Inside SField
// / SSettingRow the group is labelled by the frame's label unless
// `ariaLabel` is given.
import { computed, ref, useId } from 'vue'
import SIcon from './SIcon.vue'
import { TONE_TEXT, toneOf } from './tones'
import type { ChoiceOption } from './types'
import { useFieldControl } from './field'
import { writeBackChecked } from './controlled'

type V = ChoiceOption['value']
const props = withDefaults(
  defineProps<{ modelValue: V | V[] | undefined; options: ChoiceOption[]; cols?: 1 | 2 | 3 | 4; multiple?: boolean; name?: string; disabled?: boolean; ariaLabel?: string; error?: boolean }>(),
  { cols: 2 }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: V | V[]): void }>()
const uid = useId()
const root = ref<HTMLElement>()
const { a11y, invalid } = useFieldControl(props, false)
const COLS: Record<number, string> = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' }
const list = computed<V[]>(() => (Array.isArray(props.modelValue) ? props.modelValue : []))
const isOn = (v: V) => (props.multiple ? list.value.includes(v) : props.modelValue === v)

function choose(o: ChoiceOption, checked: boolean) {
  if (props.multiple) {
    const next = list.value.filter((x) => x !== o.value)
    if (checked) next.push(o.value)
    emit('update:modelValue', next)
  } else emit('update:modelValue', o.value)
  writeBackChecked(root, (i) => isOn(props.options[i]?.value))
}
</script>

<template>
  <div ref="root" class="grid grid-cols-1 gap-3" :class="COLS[cols]" :role="multiple ? 'group' : 'radiogroup'" v-bind="a11y">
    <label
      v-for="(o, i) in options"
      :key="i"
      class="relative flex items-start gap-3 rounded-control border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500/40"
      :class="[
        isOn(o.value) ? 'border-primary-500 bg-primary-50/60 dark:border-primary-500 dark:bg-primary-900/20' : invalid ? 'border-red-400' : 'border-line bg-surface',
        disabled || o.disabled ? 'cursor-not-allowed opacity-50' : isOn(o.value) ? 'cursor-default' : 'cursor-pointer hover:border-line-strong'
      ]"
    >
      <input
        :type="multiple ? 'checkbox' : 'radio'"
        class="sr-only"
        :name="name || uid"
        :value="String(o.value)"
        :checked="isOn(o.value)"
        :disabled="disabled || o.disabled"
        :aria-describedby="o.description ? `${uid}-d${i}` : undefined"
        @change="choose(o, ($event.target as HTMLInputElement).checked)"
      />
      <SIcon v-if="o.icon" :name="o.icon" class="mt-0.5 h-5 w-5 shrink-0" :class="TONE_TEXT[isOn(o.value) ? 'primary' : toneOf(o.tone)]" />
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-medium text-fg">{{ o.label }}</span>
        <span v-if="o.description" :id="`${uid}-d${i}`" class="mt-1 block text-xs leading-5 text-fg-muted">{{ o.description }}</span>
        <slot :name="`option-${String(o.value)}`" :option="o" :checked="isOn(o.value)" />
      </span>
      <span
        class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border"
        :class="[multiple ? 'rounded-[0.3rem]' : 'rounded-full', isOn(o.value) ? 'border-primary-500 bg-primary-500 text-white' : 'border-line-strong bg-surface']"
        aria-hidden="true"
      >
        <SIcon v-if="isOn(o.value) && multiple" name="check" class="h-3 w-3" />
        <span v-else-if="isOn(o.value)" class="h-1.5 w-1.5 rounded-full bg-white" />
      </span>
    </label>
  </div>
</template>
