<script setup lang="ts">
// A titled block of settings: SSettingRow children separated by dividers,
// with the same card surface as SCard. The `details` slot is a longer
// explanation of the whole group, collapsed behind a toggle. `collapsible`
// turns the header into a toggle (v-model:open, or uncontrolled starting at
// `defaultOpen`). Remaining attrs (data-testid, ...) go to the root.
import { computed, useId } from 'vue'
import SDisclosure from './SDisclosure.vue'
import SIcon from './SIcon.vue'
import { useOpenState } from './controlled'

const props = withDefaults(
  defineProps<{ title?: string; description?: string; collapsible?: boolean; open?: boolean; defaultOpen?: boolean }>(),
  { open: undefined, defaultOpen: true }
)
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()
const state = useOpenState(props, emit)
const isOpen = computed(() => !props.collapsible || state.isOpen.value)
const bodyId = useId()
</script>

<template>
  <section class="card">
    <header
      v-if="title || $slots.title || $slots.actions"
      class="flex items-start justify-between gap-3 rounded-t-card border-line bg-surface-2/60 px-4 py-3"
      :class="isOpen ? 'border-b' : 'rounded-b-card'"
    >
      <div class="min-w-0 flex-1">
        <button
          v-if="collapsible"
          type="button"
          class="flex w-full items-center gap-2 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
          :aria-expanded="isOpen"
          :aria-controls="bodyId"
          @click="state.toggle"
        >
          <SIcon name="chevron-right" class="h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-150" :class="isOpen ? 'rotate-90' : ''" />
          <slot name="title"><h5 class="text-sm font-semibold text-fg">{{ title }}</h5></slot>
        </button>
        <slot v-else name="title"><h5 class="text-sm font-semibold text-fg">{{ title }}</h5></slot>
        <p v-if="description" class="mt-0.5 max-w-3xl text-xs leading-5 text-fg-muted" :class="collapsible ? 'pl-6' : ''">{{ description }}</p>
        <SDisclosure v-if="$slots.details" class="mt-1" :class="collapsible ? 'pl-6' : ''"><slot name="details" /></SDisclosure>
      </div>
      <div class="flex shrink-0 items-center gap-2"><slot name="actions" /></div>
    </header>
    <div v-if="isOpen" :id="bodyId" class="divide-y divide-line px-4"><slot /></div>
  </section>
</template>
