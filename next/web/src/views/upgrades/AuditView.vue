<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SInput, SPageHeader } from '@sub2api/ui'
import AuditLogTable from '@/components/AuditLogTable.vue'

// Audit log (GET /audit-logs, audit:read).
const { t } = useI18n()
const action = ref(''), filter = ref('')
const table = ref<InstanceType<typeof AuditLogTable>>()
const query = computed(() => ({ action: filter.value }))

function search() {
  const next = action.value.trim()
  if (next === filter.value) table.value?.load()
  else filter.value = next
}
</script>

<template>
  <div>
    <SPageHeader :title="t('observe.audit')" :description="t('observe.auditHint')">
      <template #actions>
        <SButton icon="refresh" :loading="table?.loading" @click="table?.load()">{{ t('common.refresh') }}</SButton>
      </template>
      <template #filters>
        <form class="flex items-center gap-2" data-testid="audit-filter" @submit.prevent="search">
          <SInput v-model="action" class="w-64" icon="search" clearable :aria-label="t('observe.filter')" :placeholder="t('observe.filter')" />
          <SButton type="submit">{{ t('observe.search') }}</SButton>
        </form>
      </template>
    </SPageHeader>
    <AuditLogTable ref="table" :query="query" />
  </div>
</template>
