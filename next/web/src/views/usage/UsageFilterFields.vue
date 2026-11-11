<script setup lang="ts">
// The search fields of UsageFilters, for the first row and for More filters:
// a select for each of `fields` picked from a list (see useUsageSearchLabels),
// a text box for the rest, the id-or-name boxes (user, API key, account)
// splitting what is typed into their two parameters (fieldPatch). They show
// the search draft `values` and report each change as `update` (the
// parameters it sets); the draft applies on Search.
import { SInput, SSelect } from '@sub2api/ui'
import { fieldPatch, fieldText, useUsageSearchLabels } from './usageFilters'

const props = withDefaults(
  defineProps<{
    fields: string[]
    values: Record<string, string>
    groupOptions?: Array<{ value: string | number; label: string }>
    protocolOptions?: string[]
  }>(),
  { groupOptions: () => [], protocolOptions: () => [] }
)
const emit = defineEmits<{ update: [patch: Record<string, string>] }>()
const { label, options } = useUsageSearchLabels(() => props.groupOptions, () => props.protocolOptions, () => props.values.protocol ?? '')
const ICONS: Record<string, string> = { model_contains: 'cpu', user: 'user', group_name: 'group', api_key: 'key', client_ip: 'globe' }
</script>

<template>
  <template v-for="field in fields" :key="field">
    <SSelect
      v-if="options[field]"
      :model-value="values[field] ?? ''"
      size="sm"
      :aria-label="label(field)"
      :options="options[field]"
      :data-testid="`filter-${field}`"
      @update:model-value="emit('update', fieldPatch(field, String($event ?? '')))"
    />
    <SInput
      v-else
      :model-value="fieldText(values, field)"
      size="sm"
      :icon="ICONS[field]"
      :placeholder="label(field)"
      :title="label(field)"
      :aria-label="label(field)"
      :maxlength="256"
      :mono="field === 'client_ip'"
      :data-testid="`filter-${field}`"
      @update:model-value="emit('update', fieldPatch(field, String($event ?? '')))"
    />
  </template>
</template>
