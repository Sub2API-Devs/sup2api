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
const records = ref<InstanceType<typeof UsageRecords> | null>(null)
</script>

<template>
  <div>
    <SPageHeader :title="t('usage.title')" :description="t('usage.description')">
      <template #actions>
        <SButton :loading="records?.loading" icon="refresh" @click="records?.reload()">{{ t('common.refresh') }}</SButton>
      </template>
    </SPageHeader>
    <UsageRecords
      ref="records"
      list-path="/usage"
      summary-path="/usage/summary"
      default-range="today"
      admin
      :group-options="canGroups ? groupOptions : undefined"
    />
  </div>
</template>
