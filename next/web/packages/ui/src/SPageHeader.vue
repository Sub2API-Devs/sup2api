<script setup lang="ts">
// Page header. When the title repeats the app top bar's (see
// provideTitleContext) the title is not drawn again and the description
// moves into the top bar, so the header is a single toolbar row: #filters on
// the left, #actions on the right. With no #filters the actions alone would
// take that row, so on a wide screen they move into the top bar beside the
// title instead. Otherwise (detail pages, nested scopes) it is a title block
// with the actions beside it and the filters below.
import { computed, onBeforeUnmount, useSlots, watchEffect } from 'vue'
import { useActionsTarget, useDescriptionSink, useTitleVisibility } from './titleContext'
import { useViewport } from './viewport'
const props = defineProps<{ title: string; description?: string }>()
const slots = useSlots()
const showTitle = useTitleVisibility(() => props.title)
const sink = useDescriptionSink()
const actionsTarget = useActionsTarget()
const lifted = computed(() => !showTitle.value && !!sink && !slots.before && !slots['title-extra'])
const headed = computed(() => showTitle.value || !!slots.before || !!slots['title-extra'] || (!!props.description && !lifted.value))

// The top bar hides the description on a compact screen; the actions stay in the page there too.
const { compact } = useViewport()
const actionsUp = computed(() => !!actionsTarget && lifted.value && !headed.value && !slots.filters && !!slots.actions && !compact.value)

let owned = ''
watchEffect(() => {
  if (!sink) return
  const text = lifted.value ? props.description || '' : ''
  if (text || sink.value === owned) sink.value = text
  owned = text
})
onBeforeUnmount(() => {
  if (sink && owned && sink.value === owned) sink.value = ''
})
</script>

<template>
  <div
    v-if="headed"
    class="mb-4 flex flex-wrap items-start justify-between gap-3"
  >
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <slot name="before" />
        <h1
          v-if="showTitle"
          class="truncate text-lg font-semibold text-gray-900 dark:text-white"
        >
          {{ title }}
        </h1>
        <slot name="title-extra" />
      </div>
      <p
        v-if="description && !lifted"
        class="mt-0.5 text-sm text-gray-500 dark:text-dark-400"
      >
        {{ description }}
      </p>
    </div>
    <div
      v-if="$slots.actions"
      class="flex flex-wrap items-center gap-2"
    >
      <slot name="actions" />
    </div>
  </div>
  <Teleport
    v-if="actionsUp"
    defer
    :to="actionsTarget!"
  >
    <div
      class="flex shrink-0 items-center gap-2"
      data-testid="page-actions"
    >
      <slot name="actions" />
    </div>
  </Teleport>
  <div
    v-else-if="$slots.filters || (!headed && $slots.actions)"
    class="mb-3 flex flex-wrap items-end gap-2"
  >
    <div
      v-if="$slots.filters"
      class="flex min-w-0 flex-1 flex-wrap items-end gap-2"
    >
      <slot name="filters" />
    </div>
    <div
      v-if="!headed && $slots.actions"
      class="ms-auto flex max-w-full shrink-0 flex-wrap items-center gap-2"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
