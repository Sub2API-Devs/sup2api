<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SHint, SPageHeader, STable, type TableColumn } from '@sub2api/ui'
import { formatDateTime } from '@/utils/format'
import { errorMessage } from '@/utils/errors'
const { t } = useI18n()
const rows = ref<Array<{ id: number; user_id: number | null; action: string; target_type: string; target_id: string; detail: unknown; ip: string; created_at: string }>>([])
const page = ref(1), total = ref(0), action = ref(''), filter = ref(''), loading = ref(false), error = ref('')
let serial = 0
const columns = computed<TableColumn[]>(() => [{ key: 'created_at', label: t('observe.time') }, { key: 'user_id', label: t('observe.actor') }, { key: 'action', label: t('observe.action') }, { key: 'target', label: t('observe.target') }, { key: 'ip', label: 'IP' }])
async function load() { const token = ++serial; loading.value = true; try { const r = await api.list<typeof rows.value[number]>('/audit-logs', { page: page.value, page_size: 20, action: filter.value }); if (token !== serial) return; rows.value = r.items; total.value = r.page.total; error.value = '' } catch (e) { if (token === serial) error.value = errorMessage(e) } finally { if (token === serial) loading.value = false } }
function search() { filter.value = action.value.trim(); if (page.value === 1) void load(); else page.value = 1 }
watch(page, load); onMounted(load)
</script>
<template>
  <div><SPageHeader :title="t('observe.audit')" :description="t('observe.auditHint')" />
    <form class="mb-4 flex gap-2" @submit.prevent="search"><input v-model="action" :aria-label="t('observe.filter')" :placeholder="t('observe.filter')" class="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-dark-600"><SButton type="submit">{{ t('observe.search') }}</SButton></form>
    <SHint v-if="error" tone="warning">{{ error }}</SHint>
    <STable :columns="columns" :rows="rows" :loading="loading" row-key="id" expandable>
      <template #cell-created_at="{ row }">{{ formatDateTime(row.created_at) }}</template>
      <template #cell-user_id="{ row }">{{ row.user_id ?? t('observe.system') }}</template>
      <template #cell-target="{ row }">{{ row.target_type }} · {{ row.target_id }}</template>
      <template #expand="{ row }"><pre class="whitespace-pre-wrap break-all text-xs">{{ JSON.stringify(row.detail, null, 2) }}</pre></template>
    </STable>
    <div class="mt-4 flex items-center gap-3 text-xs"><SButton :disabled="page <= 1 || loading" @click="page--">{{ t('observe.previous') }}</SButton><span>{{ t('observe.page',{ page, total }) }}</span><SButton :disabled="page * 20 >= total || loading" @click="page++">{{ t('observe.next') }}</SButton></div>
  </div>
</template>
