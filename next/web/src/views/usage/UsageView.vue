<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SPageHeader } from '@sub2api/ui'
import type { Group } from '@/api/types'
import { useGroupsLookup } from '@/composables/lookups'
import { useAuthStore } from '@/stores/auth'
import UsageRecords from './UsageRecords.vue'

const { t } = useI18n()
const auth = useAuthStore()

const canGroups = auth.has('group:read')
const groups = canGroups ? useGroupsLookup().groups : ref<Group[]>([])
const groupOptions = computed(() => groups.value.map((g) => ({ value: g.id, label: g.name })))
// The page owns the header; the records component follows `revision` and
// reports its loading state, so no ref reaches into its methods.
const revision = ref(0)
const loading = ref(false)
function refresh() {
  revision.value++
}
</script>

<template>
  <div>
    <SPageHeader :title="t('usage.title')" :description="t('usage.description')">
      <template #actions>
        <SButton :loading="loading" icon="refresh" @click="refresh">{{ t('common.refresh') }}</SButton>
      </template>
    </SPageHeader>
    <UsageRecords
      v-model:loading="loading"
      :revision="revision"
      list-path="/usage"
      summary-path="/usage/summary"
      default-range="today"
      admin
      :group-options="canGroups ? groupOptions : undefined"
    />
  </div>
</template>
