<script setup lang="ts">
import { SButton, SField } from '@sub2api/ui'
import { useDwHost, type Filter, type ModelCandidate } from './host'

// Account / group / model filter shared by the status and events tabs, each
// picked with the core's entity picker ('' = any); extra fields go in the
// default slot. `models` are the page's own model candidates (modelCandidates).
defineProps<{ loading?: boolean; models?: ModelCandidate[] }>()
const filter = defineModel<Filter>({ required: true })
const emit = defineEmits<{ (e: 'search'): void; (e: 'clear'): void }>()
const host = useDwHost()
const t = host.t
const { EntityPicker } = host.components
</script>

<template>
  <form class="dw-filters" @submit.prevent="emit('search')">
    <SField class="dw-filter dw-filter-wide" :label="t('filter.account')">
      <EntityPicker v-model:id="filter.account_id" kind="account" />
    </SField>
    <SField class="dw-filter dw-filter-wide" :label="t('filter.group')">
      <EntityPicker v-model:id="filter.group_id" kind="group" />
    </SField>
    <SField class="dw-filter dw-filter-wide" :label="t('filter.model')">
      <EntityPicker v-model:id="filter.model" kind="model" :extra="models" />
    </SField>
    <slot />
    <div class="dw-filter-actions">
      <SButton type="submit" variant="primary" icon="search" :loading="loading">{{ t('filter.search') }}</SButton>
      <SButton @click="emit('clear')">{{ t('filter.clear') }}</SButton>
    </div>
  </form>
</template>
