<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useList } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SField, SHint, SPagination, SSwitch, STable, type TableColumn } from '@sub2api/ui'
import KeyFilters from './KeyFilters.vue'
import { canManage, emptyFilter, errorMessage, filterQuery, resetWeights, useDwHost, weightOf, weightTone, type Filter, type KeyStatus } from './host'

// Effective weights per (account, group, model), degraded first; a key, or
// every key of the filtered account / group, can be reset to its base.
const emit = defineEmits<{ (e: 'show-events', f: Filter): void }>()
const host = useDwHost()
const t = host.t
const manage = computed(() => canManage())

const filter = reactive(emptyFilter())
const degraded = ref(true)
const query = () => ({ ...filterQuery(filter), degraded: degraded.value ? '1' : '' })

const list = useList<KeyStatus>(host.pluginApi, '/status', query(), { pageSize: 50 })
const error = computed(() => (list.error.value ? errorMessage(list.error.value, t('status.loadFailed')) : ''))

function search() {
  const next = query()
  if (Object.entries(next).every(([k, v]) => list.filters[k] === v)) list.reload()
  else Object.assign(list.filters, next)
}

function clear() {
  Object.assign(filter, emptyFilter())
  search()
}

defineExpose({ reload: list.reload })

const columns = computed<TableColumn[]>(() => [
  { key: 'account', label: t('status.col.account'), ellipsis: '14rem' },
  { key: 'group_id', label: t('status.col.group'), nowrap: true },
  { key: 'model', label: t('status.col.model'), ellipsis: '12rem' },
  { key: 'weight', label: t('status.col.weight'), nowrap: true },
  { key: 'window', label: t('status.col.window'), nowrap: true },
  { key: 'rules', label: t('status.col.rules') },
  { key: 'changed_at', label: t('status.col.changed'), nowrap: true },
  { key: 'actions', label: t('status.col.actions'), align: 'right', nowrap: true }
])

const keyOf = (r: { account_id: number; group_id: number; model: string }) => `${r.account_id}|${r.group_id}|${r.model}`
const rows = computed(() => list.items.value.map((r) => ({ ...r, key: keyOf(r) })))
const percent = (fail: number, total: number) => (total ? Math.round((fail / total) * 1000) / 10 : 0)

const busy = ref('')
async function reset(k: { account_id: number; group_id: number; model: string }, message: string, tag: string) {
  if (!(await host.confirm({ message, confirmText: t('status.reset'), danger: true }))) return
  busy.value = tag
  try {
    const r = await resetWeights(k)
    host.toast(t('status.resetDone', { n: r.reset }), 'success')
    await list.reload()
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    busy.value = ''
  }
}

const resetRow = (r: KeyStatus) => reset(r, t('status.resetKeyConfirm', { account: r.account_name || `#${r.account_id}`, group: r.group_id, model: r.model }), keyOf(r))

// Reset every key the filter's account and/or group covers.
const filtered = computed(() => {
  const f = filterQuery(filter)
  return { account_id: Number(f.account_id) || 0, group_id: Number(f.group_id) || 0, model: f.model }
})
const resetFiltered = () => reset(filtered.value, t('status.resetFilterConfirm'), 'filter')

const showEvents = (r: KeyStatus) => emit('show-events', { account_id: String(r.account_id), group_id: String(r.group_id), model: r.model })
</script>

<template>
  <div>
    <SHint class="dw-hint">{{ t('status.hint') }}</SHint>

    <SCard>
      <KeyFilters v-model="filter" :loading="list.loading.value" @search="search" @clear="clear">
        <SField class="dw-filter" :label="t('status.degradedOnly')">
          <SSwitch v-model="degraded" @update:model-value="search" />
        </SField>
      </KeyFilters>
    </SCard>

    <div v-if="manage && (filtered.account_id || filtered.group_id)" class="dw-toolbar">
      <SButton variant="danger" icon="refresh" :loading="busy === 'filter'" @click="resetFiltered">
        {{ t('status.resetFiltered') }}
      </SButton>
    </div>

    <SAlert v-if="error" tone="danger" class="dw-section">{{ error }}</SAlert>

    <SCard :padded="false" class="dw-section">
      <STable :columns="columns" :rows="rows" :loading="list.loading.value" row-key="key" :empty-text="t('status.empty')" dense>
        <template #cell-account="{ row }">
          <span>{{ row.account_name || `#${row.account_id}` }}</span>
          <div class="dw-sub dw-num">#{{ row.account_id }}</div>
        </template>
        <template #cell-group_id="{ row }"><span class="dw-num">#{{ row.group_id }}</span></template>
        <template #cell-weight="{ row }">
          <SBadge v-if="row.reset" tone="gray">{{ t('status.resetBadge') }}</SBadge>
          <SBadge v-else :tone="weightTone(row.effective, row.base)">{{ weightOf(row.effective) }} / {{ row.base }}</SBadge>
          <SBadge v-if="!row.adjusting" tone="gray" size="xs" class="dw-ml">{{ t('status.paused') }}</SBadge>
          <div v-if="row.last_change" class="dw-sub">{{ t(`kind.${row.last_change}`) }}</div>
        </template>
        <template #cell-window="{ row }">
          <template v-if="row.eval_window">
            <span class="dw-num">{{ t('status.windowStats', { total: row.total, fail: row.fail, rate: percent(row.fail, row.total) }) }}</span>
            <div class="dw-sub">
              {{ row.verdict ? t(`verdict.${row.verdict}`) : '' }}
              <template v-if="row.recent.windows">· {{ t('status.recent', { n: row.recent.windows, rate: percent(row.recent.fail, row.recent.total) }) }}</template>
            </div>
          </template>
          <SHint v-else inline>—</SHint>
        </template>
        <template #cell-rules="{ row }">
          <div class="dw-chips">
            <SBadge v-for="r in row.rules.filter((x: { hit: boolean }) => x.hit)" :key="r.name" :tone="r.fired ? 'danger' : 'warning'" size="xs" :title="t('status.ruleSamples', { n: r.samples, lookback: r.lookback })">
              {{ r.name }}
            </SBadge>
            <SHint v-if="!row.rules.some((x: { hit: boolean }) => x.hit)" inline>—</SHint>
          </div>
        </template>
        <template #cell-changed_at="{ row }">{{ row.changed_at ? host.i18n.formatDateTime(row.changed_at * 1000) : '—' }}</template>
        <template #cell-actions="{ row }">
          <SButton size="sm" variant="ghost" @click="showEvents(row)">{{ t('status.events') }}</SButton>
          <SButton v-if="manage && !row.reset" size="sm" :loading="busy === row.key" @click="resetRow(row)">{{ t('status.reset') }}</SButton>
        </template>
      </STable>
      <div class="dw-pager">
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </div>
    </SCard>
  </div>
</template>
