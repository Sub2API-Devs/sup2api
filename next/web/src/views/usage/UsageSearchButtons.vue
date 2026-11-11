<script setup lang="ts">
// Reset / Search of the usage search bar: Search submits the bar's form,
// Reset emits `reset`. UsageFilters places them at the end of the filter row
// or of the stats row.
import { useI18n } from 'vue-i18n'
import { SButton } from '@sub2api/ui'

defineEmits<{ reset: [] }>()
const { t } = useI18n()
</script>

<template>
  <SButton
    type="button"
    size="sm"
    data-testid="reset-usage-filters"
    @click="$emit('reset')"
  >
    {{ t('common.reset') }}
  </SButton>
  <SButton
    type="submit"
    variant="primary"
    size="sm"
    icon="search"
    data-testid="search-usage"
  >
    {{ t('common.search') }}
  </SButton>
</template>
