<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SPageHeader } from '@sub2api/ui'
import UsageRecords from './UsageRecords.vue'

const { t } = useI18n()

// The page owns the header and the refresh button, which sits in the search
// bar (#actions) rather than on a row of its own; the records component
// follows `revision` and reports its loading state, so no ref reaches into
// its methods.
const revision = ref(0)
const loading = ref(false)
function refresh() {
  revision.value++
}
</script>

<template>
  <div>
    <SPageHeader :title="t('usage.title')" :description="t('usage.description')" />
    <UsageRecords
      v-model:loading="loading"
      :revision="revision"
      list-path="/usage"
      summary-path="/usage/summary"
      admin
    >
      <template #actions>
        <SButton size="sm" :loading="loading" icon="refresh" @click="refresh">{{ t('common.refresh') }}</SButton>
      </template>
    </UsageRecords>
  </div>
</template>
