<script setup lang="ts">
// Inline notice block. `tone` neutral / info / success / warning / danger
// (also primary, accent; info by default). Icon by tone unless `icon` names
// another or is false. `title` / #title in bold above the default slot;
// #actions on the right (stacked below on narrow screens). `dismissible`
// shows a × that emits `dismiss` (the parent hides the alert). Danger
// alerts are role="alert", the others role="status". `dense` is the compact
// variant for forms and table cells.
import { computed } from 'vue'
import SIcon from './SIcon.vue'
import { useUiT } from './i18n'
import { TONE_BLOCK, TONE_ICON, TONE_TEXT, toneOf } from './tones'
import type { StatusTone } from './types'

const props = withDefaults(defineProps<{ tone?: StatusTone | 'error'; title?: string; icon?: string | false; dismissible?: boolean; dense?: boolean }>(), { tone: 'info', icon: undefined })
const emit = defineEmits<{ (e: 'dismiss'): void }>()
const t = useUiT()
const tone = computed(() => toneOf(props.tone))
const iconName = computed(() => (props.icon === false ? '' : props.icon || TONE_ICON[tone.value]))
</script>

<template>
  <div
    class="flex items-start rounded-control border"
    :class="[TONE_BLOCK[tone], dense ? 'gap-2 px-3 py-2 text-xs' : 'gap-3 px-4 py-3 text-sm']"
    :role="tone === 'danger' ? 'alert' : 'status'"
  >
    <SIcon v-if="iconName" :name="iconName" class="shrink-0" :class="[TONE_TEXT[tone], dense ? 'mt-px h-3.5 w-3.5' : 'mt-0.5 h-4 w-4']" />
    <div class="min-w-0 flex-1 sm:flex sm:items-start sm:justify-between sm:gap-3">
      <div class="min-w-0 leading-5">
        <p v-if="title || $slots.title" class="font-semibold"><slot name="title">{{ title }}</slot></p>
        <div :class="title || $slots.title ? 'mt-0.5 opacity-90' : ''"><slot /></div>
      </div>
      <div v-if="$slots.actions" class="mt-2 flex shrink-0 flex-wrap items-center gap-2 sm:mt-0"><slot name="actions" /></div>
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="-m-1 shrink-0 rounded p-1 opacity-60 hover:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-current"
      :aria-label="t('ui.dismiss')"
      @click="emit('dismiss')"
    >
      <SIcon name="x" :class="dense ? 'h-3.5 w-3.5' : 'h-4 w-4'" />
    </button>
  </div>
</template>
