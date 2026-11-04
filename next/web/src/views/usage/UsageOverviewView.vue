<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SPageHeader } from '@sub2api/ui'
import type { Group } from '@/api/types'
import { useGroupsLookup } from '@/composables/lookups'
import { useAuthStore } from '@/stores/auth'
import UsageOverview from './UsageOverview.vue'

// The overview menu item: all users' statistics (`admin`) or the caller's.
const props = withDefaults(defineProps<{ admin?: boolean }>(), { admin: false })
const { t } = useI18n()
const auth = useAuthStore()

const canGroups = props.admin && auth.has('group:read')
const groups = canGroups ? useGroupsLookup().groups : ref<Group[]>([])
const groupOptions = computed(() => groups.value.map((g) => ({ value: g.id, label: g.name })))
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
      :group-options="canGroups ? groupOptions : undefined"
    />
  </div>
</template>
