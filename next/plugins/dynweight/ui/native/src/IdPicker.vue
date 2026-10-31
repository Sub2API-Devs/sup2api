<script setup lang="ts">
import { computed } from 'vue'
import { SInput, SSelect } from '@sub2api/ui'
import { useCatalog } from './catalog'
import { useDwHost } from './host'

// A group or account picked by name (searchable), as its id in a string; ''
// is the `empty` option when given. Ids in `exclude` are not offered. Without
// a readable catalog it falls back to typing the id.
const props = defineProps<{ kind: 'group' | 'account'; empty?: string; exclude?: string[] }>()
const id = defineModel<string>({ required: true })
const t = useDwHost().t
const catalog = useCatalog()

const items = computed(() => (props.kind === 'group' ? catalog.state.groups : catalog.state.accounts))
const options = computed(() => [
  ...(props.empty === undefined ? [] : [{ value: '', label: props.empty }]),
  ...items.value.filter((x) => !props.exclude?.includes(String(x.id))).map((x) => ({ value: String(x.id), label: `${x.name} #${x.id}` }))
])
</script>

<template>
  <SSelect v-if="items.length" :model-value="id" :options="options" searchable @update:model-value="id = String($event ?? '')" />
  <SInput v-else v-model="id" inputmode="numeric" :placeholder="t(`picker.${kind}Id`)" />
</template>
