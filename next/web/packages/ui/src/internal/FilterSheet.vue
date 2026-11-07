<script setup lang="ts">
// Phone form of a filter strip (SFilterBar, SPageHeader #filters): one row
// with the #primary filters sharing the width and a Filters button (badge =
// `activeCount`) that opens a bottom sheet with the other filters (default
// slot) stacked full width, the #end content, and a footer with Reset (when
// `onReset` is given; disabled when `dirty` is false) and Done. Filters apply
// as they change through the page's v-model; Done only closes the sheet.
import { ref } from 'vue'
import { useUiT } from '../i18n'
import SButton from '../SButton.vue'
import SDrawer from '../SDrawer.vue'

withDefaults(defineProps<{ activeCount?: number; title?: string; dirty?: boolean; onReset?: () => void }>(), {
  activeCount: 0,
  title: undefined,
  dirty: undefined,
  onReset: undefined
})
const t = useUiT()
const open = ref(false)
</script>

<template>
  <div class="flex items-center gap-2">
    <div v-if="$slots.primary" class="flex min-w-0 flex-1 items-center gap-2 [&>*]:min-w-0 [&>*]:flex-1">
      <slot name="primary" />
    </div>
    <SButton
      icon="filter"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :aria-label="activeCount ? t('ui.filtersActive', { n: activeCount }) : undefined"
      data-testid="filter-sheet-open"
      @click="open = true"
    >
      {{ t('ui.filters') }}
      <span
        v-if="activeCount"
        class="min-w-[1.25rem] rounded-full bg-primary-600 px-1.5 text-center text-xs leading-5 text-white"
        aria-hidden="true"
      >
        {{ activeCount }}
      </span>
    </SButton>
    <SDrawer v-model:open="open" side="bottom" :title="title || t('ui.filters')">
      <div class="flex flex-col gap-3 [&>*]:!w-full" data-testid="filter-sheet">
        <slot />
      </div>
      <div v-if="$slots.end" class="mt-3 flex flex-wrap items-center gap-2">
        <slot name="end" />
      </div>
      <template #footer>
        <SButton
          v-if="onReset"
          variant="ghost"
          icon="refresh"
          class="me-auto"
          :disabled="dirty === false"
          data-testid="filter-reset"
          @click="onReset()"
        >
          {{ t('ui.resetFilters') }}
        </SButton>
        <SButton variant="primary" data-testid="filter-sheet-done" @click="open = false">{{ t('ui.done') }}</SButton>
      </template>
    </SDrawer>
  </div>
</template>
