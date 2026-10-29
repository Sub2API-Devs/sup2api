<script setup lang="ts">
// Page header. When the title repeats the app top bar's (see
// provideTitleContext) the title is not drawn again and the description
// moves into the top bar, so the header is a single toolbar row: #filters on
// the left, #actions on the right. Otherwise (detail pages, nested scopes) it
// is a title block with the actions beside it and the filters below.
import { computed, onBeforeUnmount, useSlots, watchEffect } from 'vue'
import { useDescriptionSink, useTitleVisibility } from './titleContext'
const props = defineProps<{ title: string; description?: string }>()
const slots = useSlots()
const showTitle = useTitleVisibility(() => props.title)
const sink = useDescriptionSink()
const lifted = computed(() => !showTitle.value && !!sink && !slots.before && !slots['title-extra'])
const headed = computed(() => showTitle.value || !!slots.before || !!slots['title-extra'] || (!!props.description && !lifted.value))
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
  <div
    v-if="$slots.filters || (!headed && $slots.actions)"
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
      class="ms-auto flex shrink-0 flex-wrap items-center gap-2"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
