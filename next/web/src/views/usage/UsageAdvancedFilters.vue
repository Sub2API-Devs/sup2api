<script setup lang="ts">
// The More filters fields of UsageFilters: a text search for each of
// `fields` (a select for group_id when `groupOptions` are given), then the
// stream and billing status selects. They show the search draft `values` and
// report each change as `update` (key, value); the draft applies on Search.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SInput, SSelect } from '@sub2api/ui'

const props = withDefaults(
  defineProps<{ fields: string[]; values: Record<string, string>; groupOptions?: Array<{ value: string | number; label: string }> }>(),
  { groupOptions: () => [] }
)
const emit = defineEmits<{ update: [key: string, value: string] }>()
const { t } = useI18n()
// Without field labels the empty choice names the filter, like a placeholder.
const groupChoices = computed(() => [
  { value: '', label: t('usage.search.group_id') },
  ...props.groupOptions.filter(option => option.value !== '').map(option => ({ ...option, value: String(option.value) }))
])
const streamOptions = computed(() => [
  { value: '', label: t('usage.search.stream') },
  { value: 'true', label: t('usage.stream') },
  { value: 'false', label: t('usage.nonStream') }
])
const billingOptions = computed(() => [
  { value: '', label: t('usage.billing.statusLabel') },
  ...['billed', 'free', 'pending', 'failed'].map(value => ({ value, label: t(`usage.billing.status.${value}`) }))
])
function set(key: string, value: unknown) {
  emit('update', key, String(value ?? ''))
}
</script>

<template>
  <div class="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]" data-testid="usage-advanced-filters">
    <template v-for="key in fields" :key="key">
      <SSelect
        v-if="key === 'group_id' && groupOptions.length"
        :model-value="values[key]"
        size="sm"
        :aria-label="t(`usage.search.${key}`)"
        :options="groupChoices"
        @update:model-value="set(key, $event)"
      />
      <SInput
        v-else
        :model-value="values[key]"
        size="sm"
        :placeholder="t(`usage.search.${key}`)"
        :title="t(`usage.search.${key}`)"
        :aria-label="t(`usage.search.${key}`)"
        :maxlength="256"
        :data-testid="`filter-${key}`"
        @update:model-value="set(key, $event)"
      />
    </template>
    <SSelect
      :model-value="values.stream"
      size="sm"
      :aria-label="t('usage.search.stream')"
      :options="streamOptions"
      @update:model-value="set('stream', $event)"
    />
    <SSelect
      :model-value="values.billing_status"
      size="sm"
      :aria-label="t('usage.billing.statusLabel')"
      :options="billingOptions"
      @update:model-value="set('billing_status', $event)"
    />
  </div>
</template>
