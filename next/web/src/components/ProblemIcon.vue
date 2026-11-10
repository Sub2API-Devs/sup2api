<script setup lang="ts">
import { SIcon, STooltip } from '@sub2api/ui'

// A problem shown as a warning icon: the sentence lives in the tooltip and in
// the icon's accessible name, so a table cell stays one line. The icon takes
// keyboard focus, which shows the tooltip too (as the status badges do,
// CONTRACTS §73.4); a tap focuses it as well, which is how a touch screen
// opens the tooltip. Attributes such as data-testid land on the focusable icon.
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ text: string; tone?: 'warning' | 'danger' }>(), { tone: 'warning' })

// A dialog puts the focus on its first control when it opens, which may be
// this icon: that focus alone must not open the tooltip. So a focus reaches
// the tooltip only when the keyboard made it (it shows the focus ring) or a
// press on the icon did. The press is the icon's own: its click does not go
// on to pick a card or row around it.
let pressed = false
function setPressed(on: boolean) {
  pressed = on
}
function onFocus(e: FocusEvent) {
  if (!pressed && !(e.target as Element).matches(':focus-visible')) e.stopPropagation()
  pressed = false
}
</script>

<template>
  <STooltip :content="text">
    <span
      tabindex="0"
      role="img"
      :aria-label="text"
      class="inline-flex shrink-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
      :class="tone === 'danger' ? 'text-danger-600 dark:text-danger-400' : 'text-warning-600 dark:text-warning-400'"
      v-bind="$attrs"
      @pointerdown="setPressed(true)"
      @focusin="onFocus"
      @focusout="setPressed(false)"
      @click.stop
    >
      <SIcon name="warning" class="h-4 w-4" />
    </span>
  </STooltip>
</template>
