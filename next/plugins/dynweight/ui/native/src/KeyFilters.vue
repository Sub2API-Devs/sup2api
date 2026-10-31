<script setup lang="ts">
import { SButton, SField, SInput } from '@sub2api/ui'
import IdPicker from './IdPicker.vue'
import { useDwHost, type Filter } from './host'

// Account / group (picked by name) / model filter shared by the status and
// events tabs; extra fields go in the default slot.
defineProps<{ loading?: boolean }>()
const filter = defineModel<Filter>({ required: true })
const emit = defineEmits<{ (e: 'search'): void; (e: 'clear'): void }>()
const t = useDwHost().t
</script>

<template>
  <form class="dw-filters" @submit.prevent="emit('search')">
    <SField class="dw-filter dw-filter-wide" :label="t('filter.account')">
      <IdPicker v-model="filter.account_id" kind="account" :empty="t('filter.all')" />
    </SField>
    <SField class="dw-filter dw-filter-wide" :label="t('filter.group')">
      <IdPicker v-model="filter.group_id" kind="group" :empty="t('filter.all')" />
    </SField>
    <SField class="dw-filter dw-filter-wide" :label="t('filter.model')">
      <SInput v-model="filter.model" />
    </SField>
    <slot />
    <div class="dw-filter-actions">
      <SButton type="submit" variant="primary" icon="search" :loading="loading">{{ t('filter.search') }}</SButton>
      <SButton @click="emit('clear')">{{ t('filter.clear') }}</SButton>
    </div>
  </form>
</template>
