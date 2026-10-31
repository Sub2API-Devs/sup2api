<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useList } from '@sub2api/host'
import { SAlert, SBadge, SBulkBar, SButton, SCard, SField, SHint, SInput, SModal, SPagination, SSwitch, STable, type TableColumn } from '@sub2api/ui'
import IdPicker from './IdPicker.vue'
import KeyDetail from './KeyDetail.vue'
import KeyFilters from './KeyFilters.vue'
import StatsPanel from './StatsPanel.vue'
import { useCatalog } from './catalog'
import { applyQuery, canManage, emptyFilter, errorMessage, filterQuery, resetWeights, successRate, useDwHost, weightOf, weightTone, type Filter, type Key, type KeyStatus } from './host'

// Effective weights per (account, group, model), degraded first, each with
// its evaluation detail. A key, the selected accounts (optionally in one
// group / model), or every key of the filtered account / group can be reset
// to the base.
const emit = defineEmits<{ (e: 'show-events', f: Filter): void }>()
const host = useDwHost()
const t = host.t
const manage = computed(() => canManage())
const catalog = useCatalog()

const filter = reactive(emptyFilter())
const degraded = ref(true)
const query = () => ({ ...filterQuery(filter), degraded: degraded.value ? '1' : '' })

const list = useList<KeyStatus>(host.pluginApi, '/status', query(), { pageSize: 50 })
const error = computed(() => (list.error.value ? errorMessage(list.error.value, t('status.loadFailed')) : ''))

const search = () => applyQuery(list, query())

function clear() {
  Object.assign(filter, emptyFilter())
  search()
}

const stats = ref<InstanceType<typeof StatsPanel> | null>(null)
defineExpose({ reload: () => Promise.all([list.reload(), stats.value?.reload()]) })

const columns = computed<TableColumn[]>(() => [
  { key: 'account', label: t('status.col.account'), ellipsis: '14rem' },
  { key: 'group_id', label: t('status.col.group'), ellipsis: '10rem' },
  { key: 'model', label: t('status.col.model'), ellipsis: '12rem' },
  { key: 'weight', label: t('status.col.weight'), nowrap: true },
  { key: 'window', label: t('status.col.window'), nowrap: true },
  { key: 'rules', label: t('status.col.rules') },
  { key: 'changed_at', label: t('status.col.changed'), nowrap: true },
  { key: 'actions', label: t('status.col.actions'), align: 'right', nowrap: true }
])

const keyOf = (r: Key) => `${r.account_id}|${r.group_id}|${r.model}`
const rows = computed(() => list.items.value.map((r) => ({ ...r, key: keyOf(r), hits: r.rules.filter((x) => x.hit) })))
const rate = (total: number, fail: number) => successRate(total, fail) ?? '—'

const busy = ref('')
async function reset(k: Key & { account_ids?: number[] }, message: string, tag: string) {
  if (!(await host.confirm({ message, confirmText: t('status.reset'), danger: true }))) return false
  busy.value = tag
  try {
    const r = await resetWeights(k)
    host.toast(t('status.resetDone', { n: r.reset }), 'success')
    await list.reload()
    return true
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
    return false
  } finally {
    busy.value = ''
  }
}

const accountLabel = (r: KeyStatus) => catalog.accountName(r.account_id, r.account_name)
const resetRow = (r: KeyStatus) =>
  reset(r, t('status.resetKeyConfirm', { account: accountLabel(r), group: catalog.groupName(r.group_id), model: r.model }), keyOf(r))

// Reset every key the applied filter's account and/or group covers (not what
// is typed but not searched yet).
// null when an id is not a positive integer (the list then shows the error).
const filtered = computed(() => {
  const f = list.filters as Filter
  const id = (v: string) => (v === '' ? 0 : /^\d+$/.test(v) ? Number(v) : NaN)
  const k = { account_id: id(f.account_id), group_id: id(f.group_id), model: f.model }
  return Number.isNaN(k.account_id) || Number.isNaN(k.group_id) || (!k.account_id && !k.group_id) ? null : k
})
const resetFiltered = () => filtered.value && reset(filtered.value, t('status.resetFilterConfirm'), 'filter')

// Batch reset: the accounts of the selected rows, in every group and model
// or in the ones given.
const selected = ref<string[]>([])
const selectedAccounts = computed(() => [...new Set(selected.value.map((k) => Number(k.split('|')[0])))])
const batch = reactive({ open: false, group_id: '', model: '' })
function openBatch() {
  Object.assign(batch, { open: true, group_id: '', model: '' })
}
async function resetSelected() {
  const k = { account_id: 0, account_ids: selectedAccounts.value, group_id: Number(batch.group_id) || 0, model: batch.model.trim() }
  if (!(await reset(k, t('status.resetSelectedConfirm', { n: k.account_ids.length }), 'batch'))) return
  batch.open = false
  selected.value = []
}

const showEvents = (r: KeyStatus) => emit('show-events', { account_id: String(r.account_id), group_id: String(r.group_id), model: r.model })
</script>

<template>
  <div>
    <SHint class="dw-hint">{{ t('status.hint') }}</SHint>
    <StatsPanel ref="stats" class="dw-block" />

    <SCard>
      <KeyFilters v-model="filter" :loading="list.loading.value" @search="search" @clear="clear">
        <SField class="dw-filter" :label="t('status.degradedOnly')">
          <SSwitch v-model="degraded" @update:model-value="search" />
        </SField>
      </KeyFilters>
    </SCard>

    <div v-if="manage && filtered" class="dw-toolbar">
      <SButton variant="danger" icon="refresh" :loading="busy === 'filter'" @click="resetFiltered">
        {{ t('status.resetFiltered') }}
      </SButton>
    </div>

    <SAlert v-if="error" tone="danger" class="dw-section">{{ error }}</SAlert>

    <SBulkBar v-if="manage" class="dw-section" :count="selected.length" :page-selected="rows.length > 0 && rows.every((r) => selected.includes(r.key))" @select-page="selected = rows.map((r) => r.key)" @clear="selected = []">
      <SButton size="sm" variant="danger" icon="refresh" @click="openBatch">{{ t('status.resetSelected', { n: selectedAccounts.length }) }}</SButton>
    </SBulkBar>

    <SCard :padded="false" class="dw-section">
      <STable
        v-model:selected="selected"
        :columns="columns"
        :rows="rows"
        :loading="list.loading.value"
        row-key="key"
        :empty-text="t('status.empty')"
        :selectable="manage"
        expandable
        dense
      >
        <template #cell-account="{ row }">
          <span>{{ row.account_name || catalog.accountName(row.account_id) }}</span>
          <div class="dw-sub dw-num">#{{ row.account_id }}</div>
        </template>
        <template #cell-group_id="{ row }">{{ catalog.groupName(row.group_id) }}</template>
        <template #cell-weight="{ row }">
          <SBadge v-if="row.reset" tone="gray">{{ t('status.resetBadge') }}</SBadge>
          <SBadge v-else :tone="weightTone(row.effective, row.base)">{{ weightOf(row.effective) }} / {{ row.base }}</SBadge>
          <SBadge v-if="!row.adjusting" tone="gray" size="xs" class="dw-ml">{{ t('status.paused') }}</SBadge>
          <SBadge v-else-if="row.state !== 'normal'" :tone="row.state === 'degrading' ? 'warning' : 'info'" size="xs" class="dw-ml">{{ t(`state.${row.state}`) }}</SBadge>
          <SBadge v-if="row.adjusting && row.no_climb_strategy" tone="danger" size="xs" class="dw-ml" :title="t('detail.noClimb')">!</SBadge>
        </template>
        <template #cell-window="{ row }">
          <template v-if="row.eval_window">
            <span class="dw-num">{{ t('status.windowStats', { total: row.total, fail: row.fail, rate: rate(row.total, row.fail) }) }}</span>
            <div class="dw-sub">
              {{ row.verdict ? t(`verdict.${row.verdict}`) : '' }}
              <template v-if="row.recent.windows">· {{ t('status.recent', { n: row.recent.windows, rate: rate(row.recent.total, row.recent.fail) }) }}</template>
            </div>
          </template>
          <template v-else>
            <SHint inline>{{ t('status.notEvaluated') }}</SHint>
            <div class="dw-sub dw-num">{{ t('status.current', { total: row.current.total, fail: row.current.fail }) }}</div>
          </template>
        </template>
        <template #cell-rules="{ row }">
          <div class="dw-chips">
            <SBadge v-for="r in row.hits" :key="r.name" :tone="r.fired ? 'danger' : 'warning'" size="xs" :title="t('status.ruleSamples', { n: r.samples, lookback: r.lookback })">
              {{ r.name }}
            </SBadge>
            <SHint v-if="!row.hits.length" inline>—</SHint>
          </div>
        </template>
        <template #cell-changed_at="{ row }">{{ row.changed_at ? host.i18n.formatDateTime(row.changed_at * 1000) : '—' }}</template>
        <template #cell-actions="{ row }">
          <SButton size="sm" variant="ghost" @click="showEvents(row)">{{ t('status.events') }}</SButton>
          <SButton v-if="manage && !row.reset" size="sm" :loading="busy === row.key" @click="resetRow(row)">{{ t('status.reset') }}</SButton>
        </template>
        <template #expand="{ row }">
          <KeyDetail :row="row" />
        </template>
      </STable>
      <div class="dw-pager">
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </div>
    </SCard>

    <SModal v-model:open="batch.open" :title="t('status.resetSelected', { n: selectedAccounts.length })">
      <SHint class="dw-hint">{{ t('status.resetSelectedHint') }}</SHint>
      <div class="dw-list">
        <SField :label="t('filter.group')">
          <IdPicker v-model="batch.group_id" kind="group" :empty="t('filter.all')" />
        </SField>
        <SField :label="t('filter.model')" :hint="t('status.modelHint')">
          <SInput v-model="batch.model" />
        </SField>
      </div>
      <template #footer>
        <SButton @click="batch.open = false">{{ t('cancel') }}</SButton>
        <SButton variant="danger" :loading="busy === 'batch'" @click="resetSelected">{{ t('status.reset') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
