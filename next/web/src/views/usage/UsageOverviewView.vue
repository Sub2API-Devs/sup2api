<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SPageHeader } from '@sub2api/ui'
import UsageOverview from './UsageOverview.vue'

// The overview menu item: all users' statistics (`admin`) or the caller's.
withDefaults(defineProps<{ admin?: boolean }>(), { admin: false })
const { t } = useI18n()
const revision = ref(0)
const loading = ref(false)
</script>

<template>
  <div>
    <SPageHeader :title="t(admin ? 'usage.overviewTitle' : 'usage.myOverviewTitle')" :description="t(admin ? 'usage.overviewDescription' : 'usage.myOverviewDescription')">
      <template #actions>
        <SButton :loading="loading" icon="refresh" @click="revision++">{{ t('common.refresh') }}</SButton>
      </template>
    </SPageHeader>
    <UsageOverview
      v-model:loading="loading"
      :revision="revision"
      :summary-path="admin ? '/usage/summary' : '/me/usage/summary'"
      :default-range="admin ? 'today' : '7d'"
      :admin="admin"
    />
  </div>
</template>
