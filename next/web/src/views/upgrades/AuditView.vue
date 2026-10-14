<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SCode, SInput, SPageHeader, SPagination, STable, type TableColumn } from '@sub2api/ui'
import TimeText from '@/components/TimeText.vue'
import { errorMessage } from '@/utils/errors'

// Audit log (GET /audit-logs, audit:read).
const { t } = useI18n()
const rows = ref<Array<{ id: number; user_id: number | null; action: string; target_type: string; target_id: string; detail: unknown; ip: string; created_at: string }>>([])
const page = ref(1), pageSize = ref(20), total = ref(0), action = ref(''), filter = ref(''), loading = ref(false), error = ref('')
let serial = 0
const columns = computed<TableColumn[]>(() => [
  { key: 'created_at', label: t('observe.time') },
  { key: 'user_id', label: t('observe.actor') },
  { key: 'action', label: t('observe.action') },
  { key: 'target', label: t('observe.target') },
  { key: 'ip', label: t('common.ip') }
])

async function load() {
  const token = ++serial
  loading.value = true
  try {
    const r = await api.list<(typeof rows.value)[number]>('/audit-logs', { page: page.value, page_size: pageSize.value, action: filter.value })
    if (token !== serial) return
    rows.value = r.items
    total.value = r.page.total
    error.value = ''
  } catch (e) {
    if (token === serial) error.value = errorMessage(e)
  } finally {
    if (token === serial) loading.value = false
  }
}
function search() {
  filter.value = action.value.trim()
  if (page.value === 1) void load()
  else page.value = 1
}
watch(page, load)
watch(pageSize, () => (page.value === 1 ? void load() : (page.value = 1)))
onMounted(load)
</script>

<template>
  <div>
    <SPageHeader :title="t('observe.audit')" :description="t('observe.auditHint')">
      <template #actions>
        <SButton icon="refresh" :loading="loading" @click="load">{{ t('common.refresh') }}</SButton>
      </template>
    </SPageHeader>
    <SAlert v-if="error" tone="danger" class="mb-3">{{ error }}</SAlert>
    <STable card :columns="columns" :rows="rows" :loading="loading" row-key="id" expandable>
      <template #toolbar>
        <form class="flex items-center gap-2" data-testid="audit-filter" @submit.prevent="search">
          <SInput v-model="action" class="!w-64" icon="search" clearable :aria-label="t('observe.filter')" :placeholder="t('observe.filter')" />
          <SButton type="submit">{{ t('observe.search') }}</SButton>
        </form>
      </template>
      <template #cell-created_at="{ row }"><TimeText :value="row.created_at" :muted="false" /></template>
      <template #cell-user_id="{ row }">{{ row.user_id ?? t('observe.system') }}</template>
      <template #cell-target="{ row }">{{ row.target_type }} · {{ row.target_id }}</template>
      <template #expand="{ row }"><SCode :text="JSON.stringify(row.detail, null, 2)" /></template>
      <template #footer>
        <SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </template>
    </STable>
  </div>
</template>
