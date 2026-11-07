<script setup lang="ts">
// Page header. When the title repeats the app top bar's (see
// provideTitleContext) the title is not drawn again and the description
// moves into the top bar, so the header is a single toolbar row: #filters on
// the left, #actions on the right. With no #filters the actions alone would
// take that row, so they move into the top bar beside the title instead
// (on a compact screen a button there with an icon shows only the icon).
// Otherwise (detail pages, nested scopes) it is a title block with the
// actions beside it and the filters below.
// `#filters-primary` holds the filters that stay in sight on a phone; on
// wide screens they come before #filters. On a compact screen with
// `filtersCollapse` (default true) the filters fold into one row: the
// primary ones and a Filters button (badge `filtersActiveCount`) opening a
// bottom sheet with #filters. `mobileMenu` lists secondary actions as data
// (@menu-select gets the key): ghost buttons after #actions on a wide
// screen, a "⋯" menu in the top bar on a compact one.
import { computed, onBeforeUnmount, useSlots, watchEffect } from 'vue'
import { useActionsTarget, useDescriptionSink, useTitleVisibility } from './titleContext'
import { useViewport } from './viewport'
import type { MenuAction } from './types'
import FilterSheet from './internal/FilterSheet.vue'
import PageActions from './internal/PageActions.vue'

const props = withDefaults(
  defineProps<{ title: string; description?: string; filtersActiveCount?: number; filtersCollapse?: boolean; mobileMenu?: MenuAction[] }>(),
  { description: undefined, filtersActiveCount: 0, filtersCollapse: true, mobileMenu: () => [] }
)
const emit = defineEmits<{ (e: 'menu-select', key: string): void }>()
const slots = useSlots()
const showTitle = useTitleVisibility(() => props.title)
const sink = useDescriptionSink()
const actionsTarget = useActionsTarget()
const lifted = computed(() => !showTitle.value && !!sink && !slots.before && !slots['title-extra'])
const headed = computed(() => showTitle.value || !!slots.before || !!slots['title-extra'] || (!!props.description && !lifted.value))

// The top bar hides the description on a compact screen.
const { compact } = useViewport()
const hasFilters = computed(() => !!slots.filters || !!slots['filters-primary'])
const folded = computed(() => compact.value && props.filtersCollapse && !!slots.filters)
const hasMenu = computed(() => props.mobileMenu.length > 0)
const actionsUp = computed(() => !!actionsTarget && lifted.value && !headed.value && !hasFilters.value && (!!slots.actions || hasMenu.value))
const menuUp = computed(() => compact.value && !!actionsTarget && hasMenu.value)
const topBar = computed(() => actionsUp.value || menuUp.value)
// The menu goes with the actions in the page unless the top bar shows it.
const pageMenu = computed(() => (topBar.value ? [] : props.mobileMenu))
const pageActions = computed(() => !!slots.actions || pageMenu.value.length > 0)
const rowActions = computed(() => !headed.value && !actionsUp.value && pageActions.value)

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
    <PageActions
      v-if="pageActions"
      :menu="pageMenu"
      class="flex flex-wrap items-center gap-2"
      @select="emit('menu-select', $event)"
    >
      <slot name="actions" />
    </PageActions>
  </div>
  <Teleport
    v-if="topBar"
    defer
    :to="actionsTarget!"
  >
    <PageActions
      top-bar
      :menu="mobileMenu"
      class="flex shrink-0 items-center gap-2"
      data-testid="page-actions"
      @select="emit('menu-select', $event)"
    >
      <slot
        v-if="actionsUp"
        name="actions"
      />
    </PageActions>
  </Teleport>
  <div
    v-if="hasFilters || rowActions"
    class="mb-3 flex flex-wrap items-end gap-2"
  >
    <FilterSheet
      v-if="folded"
      class="min-w-0 flex-1"
      :active-count="filtersActiveCount"
    >
      <template
        v-if="$slots['filters-primary']"
        #primary
      >
        <slot name="filters-primary" />
      </template>
      <slot name="filters" />
    </FilterSheet>
    <div
      v-else-if="hasFilters"
      class="flex min-w-0 flex-1 flex-wrap items-end gap-2"
    >
      <slot name="filters-primary" />
      <slot name="filters" />
    </div>
    <PageActions
      v-if="rowActions"
      :menu="pageMenu"
      class="ms-auto flex max-w-full shrink-0 flex-wrap items-center gap-2"
      @select="emit('menu-select', $event)"
    >
      <slot name="actions" />
    </PageActions>
  </div>
</template>
