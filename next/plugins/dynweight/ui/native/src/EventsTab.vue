<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useList } from '@sub2api/host'
import { SAlert, SBadge, SCard, SField, SHint, SPagination, SSelect, STable, type TableColumn } from '@sub2api/ui'
import KeyFilters from './KeyFilters.vue'
import { applyQuery, emptyFilter, enumOptions, errorMessage, eventKinds, eventTone, filterQuery, useDwHost, weightOf, type Filter, type WeightEvent } from './host'

// Weight events (newest first): degrades, climbs, restores, revivals, cleared
// sticky sessions and resets, filtered by key and kind.
const props = defineProps<{ preset?: (Filter & { n: number }) | null }>()
const host = useDwHost()
const t = host.t

const filter = reactive(emptyFilter())
const kind = ref('')
if (props.preset) Object.assign(filter, filterQuery(props.preset))
const query = () => ({ ...filterQuery(filter), kind: kind.value })

const list = useList<WeightEvent>(host.pluginApi, '/events', query(), { pageSize: 50 })
const error = computed(() => (list.error.value ? errorMessage(list.error.value, t('events.loadFailed')) : ''))

const search = () => applyQuery(list, query())

function clear() {
  Object.assign(filter, emptyFilter())
  kind.value = ''
  search()
}

watch(kind, search)
watch(
  () => props.preset,
  (p) => {
    if (!p) return
    Object.assign(filter, filterQuery(p))
    search()
  }
)

defineExpose({ reload: list.reload })

const kindOptions = computed(() => [{ value: '', label: t('events.allKinds') }, ...enumOptions('kind', eventKinds)])

const columns = computed<TableColumn[]>(() => [
  { key: 'created_at', label: t('events.col.time'), width: '10.5rem', nowrap: true },
  { key: 'kind', label: t('events.col.kind'), nowrap: true },
  { key: 'key', label: t('events.col.key'), ellipsis: '18rem' },
  { key: 'weight', label: t('events.col.weight'), nowrap: true },
  { key: 'rules', label: t('events.col.rules') },
  { key: 'detail', label: t('events.col.detail'), ellipsis: '18rem' }
])

const isWeightKind = (k: string) => k.startsWith('weight_')

/** One-line detail: the window counts, the reason, or the cleared sessions. */
function detailText(e: WeightEvent): string {
  const d = e.detail ?? {}
  if (e.reason) return t(`reason.${e.reason}`)
  if (e.kind === 'affinity_cleared') return t('events.cleared', { n: Number(d.cleared ?? 0) })
  const w = d.window as { total?: number; fail?: number } | undefined
  return w ? t('events.window', { total: w.total ?? 0, fail: w.fail ?? 0 }) : ''
}
</script>

<template>
  <div>
    <SCard>
      <KeyFilters v-model="filter" :loading="list.loading.value" @search="search" @clear="clear">
        <SField class="dw-filter" :label="t('events.kind')">
          <SSelect v-model="kind" :options="kindOptions" />
        </SField>
      </KeyFilters>
    </SCard>

    <SAlert v-if="error" tone="danger" class="dw-section">{{ error }}</SAlert>

    <SCard :padded="false" class="dw-section">
      <STable :columns="columns" :rows="list.items.value" :loading="list.loading.value" :empty-text="t('events.empty')" dense>
        <template #cell-created_at="{ row }">{{ host.i18n.formatDateTime(row.created_at) }}</template>
        <template #cell-kind="{ row }"><SBadge :tone="eventTone(row.kind)">{{ t(`kind.${row.kind}`) }}</SBadge></template>
        <template #cell-key="{ row }">
          <span class="dw-num">#{{ row.account_id }} · #{{ row.group_id }}</span>
          <div class="dw-sub">{{ row.model }}</div>
        </template>
        <template #cell-weight="{ row }">
          <span v-if="isWeightKind(row.kind)" class="dw-num">{{ weightOf(row.from) }} → {{ weightOf(row.to) }}</span>
          <SHint v-else inline>—</SHint>
        </template>
        <template #cell-rules="{ row }">
          <div class="dw-chips">
            <SBadge v-for="r in row.rules ?? []" :key="r" size="xs">{{ r }}</SBadge>
          </div>
        </template>
        <template #cell-detail="{ row }">{{ detailText(row) }}</template>
      </STable>
      <div class="dw-pager">
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </div>
    </SCard>
  </div>
</template>
