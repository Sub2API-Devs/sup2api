<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SDateTime, SAlert, SCode, SHint, SPagination, STable, type TableColumn } from '@sub2api/ui'
import { errorMessage } from '@/utils/errors'

// Audit log rows (GET /audit-logs, audit:read) matching `query`, newest first.
// Writes served by plugin routes (plugin.route.write) show their request
// under the action.
const props = defineProps<{ query?: Record<string, string>; hideTarget?: boolean }>()
const { t } = useI18n()

interface AuditRow {
  id: number
  user_id: number | null
  user_email: string | null
  user_name: string | null
  action: string
  target_type: string
  target_id: string
  detail: Record<string, any> | null
  ip: string
  created_at: string
}

const rows = ref<AuditRow[]>([])
const page = ref(1), pageSize = ref(20), total = ref(0), loading = ref(false), error = ref('')
let serial = 0
const columns = computed<TableColumn[]>(() => [
  { key: 'created_at', label: t('observe.time') },
  { key: 'user_id', label: t('observe.actor') },
  { key: 'action', label: t('observe.action') },
  ...(props.hideTarget ? [] : [{ key: 'target', label: t('observe.target') }]),
  { key: 'ip', label: t('common.ip') }
])

async function load() {
  const token = ++serial
  loading.value = true
  try {
    const r = await api.list<AuditRow>('/audit-logs', { ...props.query, page: page.value, page_size: pageSize.value })
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

function reload() {
  if (page.value === 1) void load()
  else page.value = 1
}

watch(page, load)
watch(pageSize, reload)
watch(() => JSON.stringify(props.query || {}), reload)
onMounted(load)
defineExpose({ load, loading })
</script>

<template>
  <div>
    <SAlert v-if="error" tone="danger" class="mb-3">{{ error }}</SAlert>
    <STable card :columns="columns" :rows="rows" :loading="loading" row-key="id" expandable data-testid="audit-log-table">
      <template #cell-created_at="{ row }"><SDateTime mode="absolute" :value="row.created_at" /></template>
      <template #cell-user_id="{ row }">
        <template v-if="row.user_id == null">{{ t('observe.system') }}</template>
        <span v-else :title="row.user_email || undefined">{{ row.user_name || row.user_email || '#' + row.user_id }}</span>
      </template>
      <template #cell-action="{ row }">
        <span class="font-mono text-xs">{{ row.action }}</span>
        <SHint v-if="row.detail?.method" size="xs" class="font-mono">{{ row.detail.method }} {{ row.detail.path }} → {{ row.detail.status }}</SHint>
      </template>
      <template #cell-target="{ row }">{{ row.target_type }} · {{ row.target_id }}</template>
      <template #expand="{ row }"><SCode :text="JSON.stringify(row.detail, null, 2)" /></template>
      <template #footer>
        <SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </template>
    </STable>
  </div>
</template>
