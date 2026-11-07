<script setup lang="ts">
// Custom span of SDateRange: start / end dates ("YYYY-MM-DD", the end
// inclusive) and Apply, enabled once start ≤ end.
import { computed } from 'vue'
import { useUiT } from '../i18n'

const props = defineProps<{ start: string; end: string }>()
const emit = defineEmits<{ (e: 'update:start', v: string): void; (e: 'update:end', v: string): void; (e: 'apply'): void }>()
const t = useUiT()
const valid = computed(() => !!props.start && !!props.end && props.start <= props.end)
const value = (e: Event) => (e.target as HTMLInputElement).value

function submit() {
  if (valid.value) emit('apply')
}
</script>

<template>
  <form class="flex flex-col gap-2" @submit.prevent="submit">
    <span class="text-xs font-medium text-fg-muted">{{ t('ui.custom') }}</span>
    <label class="flex flex-col gap-1 text-xs text-fg-subtle">
      {{ t('ui.startDate') }}
      <input
        :value="start"
        type="date"
        class="input input-sm"
        :max="end || undefined"
        data-testid="date-range-start"
        @input="emit('update:start', value($event))"
      />
    </label>
    <label class="flex flex-col gap-1 text-xs text-fg-subtle">
      {{ t('ui.endDate') }}
      <input
        :value="end"
        type="date"
        class="input input-sm"
        :min="start || undefined"
        data-testid="date-range-end"
        @input="emit('update:end', value($event))"
      />
    </label>
    <button type="submit" class="btn btn-primary btn-sm mt-auto" :disabled="!valid" data-testid="date-range-apply">
      {{ t('ui.apply') }}
    </button>
  </form>
</template>
