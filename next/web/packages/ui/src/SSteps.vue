<script setup lang="ts">
// Step list (wizards, multi-stage jobs). Each step has `title`,
// `description` and `state` done / current / pending / error; without
// states, steps before `current` (a key) are done, `current` is current and
// the rest pending. `direction` horizontal (default) / vertical. Slot
// `step-<key>` adds content under a step (vertical layouts: logs, actions).
import { computed } from 'vue'
import SIcon from './SIcon.vue'
import { useUiT } from './i18n'
import type { StepItem, StepState } from './types'

const props = withDefaults(defineProps<{ steps: StepItem[]; current?: string; direction?: 'horizontal' | 'vertical' }>(), { direction: 'horizontal' })
const t = useUiT()
const states = computed<StepState[]>(() => {
  const ci = props.steps.findIndex((s) => s.key === props.current)
  return props.steps.map((s, i) => s.state ?? (ci < 0 ? 'pending' : i < ci ? 'done' : i === ci ? 'current' : 'pending'))
})
const DOT: Record<StepState, string> = {
  done: 'border-primary-500 bg-primary-500 text-white',
  current: 'border-primary-500 bg-surface text-primary-600 ring-4 ring-primary-500/15 dark:text-primary-400',
  pending: 'border-line-strong bg-surface text-fg-subtle',
  error: 'border-red-500 bg-red-500 text-white'
}
const SR: Record<StepState, string> = { done: 'ui.stepDone', current: 'ui.stepCurrent', pending: '', error: 'ui.stepError' }
</script>

<template>
  <ol :class="direction === 'vertical' ? 'space-y-0' : 'flex flex-wrap items-start gap-y-3'">
    <li
      v-for="(s, i) in steps"
      :key="s.key"
      class="relative"
      :class="direction === 'vertical' ? 'flex gap-3 pb-5 last:pb-0' : 'flex min-w-[8rem] flex-1 items-start gap-2 pr-3'"
      :aria-current="states[i] === 'current' ? 'step' : undefined"
    >
      <span
        v-if="direction === 'vertical' && i < steps.length - 1"
        class="absolute left-3 top-7 -ml-px h-[calc(100%-1.75rem)] w-0.5"
        :class="states[i] === 'done' ? 'bg-primary-500' : 'bg-line'"
        aria-hidden="true"
      />
      <span class="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold" :class="DOT[states[i]]">
        <SIcon v-if="states[i] === 'done'" name="check" class="h-3.5 w-3.5" />
        <SIcon v-else-if="states[i] === 'error'" name="x" class="h-3.5 w-3.5" />
        <template v-else>{{ i + 1 }}</template>
      </span>
      <div class="min-w-0 flex-1 pt-0.5">
        <div class="flex items-center gap-2">
          <p class="text-sm font-medium" :class="states[i] === 'pending' ? 'text-fg-muted' : states[i] === 'error' ? 'text-red-600 dark:text-red-400' : 'text-fg'">
            {{ s.title }}<span v-if="SR[states[i]]" class="sr-only"> ({{ t(SR[states[i]]) }})</span>
          </p>
          <span v-if="direction === 'horizontal' && i < steps.length - 1" class="hidden h-px flex-1 sm:block" :class="states[i] === 'done' ? 'bg-primary-500' : 'bg-line'" aria-hidden="true" />
        </div>
        <p v-if="s.description" class="mt-0.5 text-xs leading-5 text-fg-muted">{{ s.description }}</p>
        <slot :name="`step-${s.key}`" :step="s" :state="states[i]" />
      </div>
    </li>
  </ol>
</template>
