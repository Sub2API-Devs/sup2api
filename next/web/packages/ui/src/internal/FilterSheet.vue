<script setup lang="ts">
// Filter controls of SFilterBar / SPageHeader. Inline (the default) it
// renders #primary, the default slot, Reset (with `onReset`; disabled when
// `dirty` is false) and #end in place, inside the parent's flex row. With
// `collapse` and secondary filters (default slot) it folds into one row:
// #primary sharing the width and a Filters button (badge = `activeCount`)
// that opens a bottom sheet with the default-slot filters stacked full
// width, #end, and Reset / Done. Filters apply
// as they change through the page's v-model; Done (or Enter in a sheet field)
// closes the sheet and emits `done`, for a page that applies a draft then.
// `#advanced` holds the less used filters: inline they hide behind a "More
// filters" toggle after the default slot (badge `advancedCount`, highlighted
// while folded) and open as a full-width grid under the row
// (v-model:advancedOpen); folded they follow the default slot in the sheet.
// Each count covers its own slot, so the Filters badge, counting everything
// in the sheet, is their sum: `activeCount` (default slot) + `advancedCount`.
import { computed, ref, useId, useSlots } from 'vue'
import { useUiT } from '../i18n'
import SButton from '../SButton.vue'
import SDrawer from '../SDrawer.vue'
import SIcon from '../SIcon.vue'

const props = withDefaults(
  defineProps<{ collapse?: boolean; activeCount?: number; advancedCount?: number; title?: string; dirty?: boolean; onReset?: () => void }>(),
  {
    activeCount: 0,
    advancedCount: 0,
    title: undefined,
    dirty: undefined,
    onReset: undefined
  }
)
const emit = defineEmits<{ done: [] }>()
const advancedOpen = defineModel<boolean>('advancedOpen', { default: false })
const slots = useSlots()
const t = useUiT()
const open = ref(false)
const folded = computed(() => props.collapse && !!(slots.default || slots.advanced))
const sheetCount = computed(() => props.activeCount + props.advancedCount)
const formId = useId()
const advancedId = useId()
function finish() {
  open.value = false
  emit('done')
}
</script>

<template>
  <div v-if="folded" class="w-full">
    <div class="flex items-center gap-2">
      <div v-if="$slots.primary" class="flex min-w-0 flex-1 items-center gap-2 [&>*]:min-w-0 [&>*]:flex-1">
        <slot name="primary" />
      </div>
      <SButton
        icon="filter"
        aria-haspopup="dialog"
        :aria-expanded="open"
        :aria-label="sheetCount ? t('ui.filtersActive', { n: sheetCount }) : undefined"
        data-testid="filter-sheet-open"
        @click="open = true"
      >
        {{ t('ui.filters') }}
        <span
          v-if="sheetCount"
          class="min-w-[1.25rem] rounded-full bg-primary-600 px-1.5 text-center text-xs leading-5 text-white"
          aria-hidden="true"
        >
          {{ sheetCount }}
        </span>
      </SButton>
    </div>
    <SDrawer v-model:open="open" side="bottom" :title="title || t('ui.filters')">
      <!-- A form, so that Enter in a field submits it through Done. -->
      <form :id="formId" @submit.prevent="finish">
        <div class="flex flex-col gap-3 [&>*]:!w-full" data-testid="filter-sheet">
          <slot />
          <slot name="advanced" />
        </div>
        <div v-if="$slots.end" class="mt-3 flex flex-wrap items-center gap-2">
          <slot name="end" />
        </div>
      </form>
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
        <SButton type="submit" :form="formId" variant="primary" data-testid="filter-sheet-done">{{ t('ui.done') }}</SButton>
      </template>
    </SDrawer>
  </div>
  <template v-else>
    <slot name="primary" />
    <slot />
    <SButton
      v-if="$slots.advanced"
      size="sm"
      variant="ghost"
      :class="advancedCount && !advancedOpen ? '!text-primary-600 dark:!text-primary-400' : ''"
      :aria-expanded="advancedOpen"
      :aria-controls="advancedId"
      data-testid="filter-advanced-toggle"
      @click="advancedOpen = !advancedOpen"
    >
      {{ t('ui.moreFilters') }}
      <span
        v-if="advancedCount"
        class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-xxs text-white"
        data-testid="filter-advanced-count"
      >{{ advancedCount }}</span>
      <SIcon name="chevron-down" class="h-3.5 w-3.5 transition-transform" :class="advancedOpen ? 'rotate-180' : ''" />
    </SButton>
    <SButton
      v-if="onReset"
      size="sm"
      variant="ghost"
      icon="refresh"
      :disabled="dirty === false"
      data-testid="filter-reset"
      @click="onReset()"
    >
      {{ t('ui.resetFilters') }}
    </SButton>
    <div v-if="$slots.end" class="ms-auto flex items-center gap-2">
      <slot name="end" />
    </div>
    <div
      v-if="$slots.advanced"
      v-show="advancedOpen"
      :id="advancedId"
      class="grid w-full grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2 border-t border-dashed border-line pt-2 [&>*]:!w-full [&>*]:min-w-0"
      data-testid="filter-advanced"
    >
      <slot name="advanced" />
    </div>
  </template>
</template>
