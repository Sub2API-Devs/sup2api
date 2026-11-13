<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { MAX_ACCOUNT_BATCH, useList } from '@sub2api/host'
import { SAlert, SBadge, SBulkBar, SButton, SCard, SField, SHint, SModal, SSwitch } from '@sub2api/ui'
import KeyFilters from './KeyFilters.vue'
import KeyStatusTable from './KeyStatusTable.vue'
import StatsPanel from './StatsPanel.vue'
import { useCatalog } from './catalog'
import { applyQuery, canReset, emptyFilter, errorMessage, filterQuery, keyListApi, keyOf, modelCandidates, resetsAllAccounts, seesAllAccounts, useDwHost, useReset, type Filter, type KeyStatus } from './host'

// Effective weights per (account, group, model), degraded first, each with
// its evaluation detail. A key, the selected accounts (optionally in one
// group / model), or every key of the filtered account / group can be reset
// to the base. A `preset` (from the page's ?account= …) fills the filter and
// shows every key of it, not only the degraded ones. A viewer of some
// accounts only (seesAllAccounts) picks an account first and gets no node
// counters.
const props = defineProps<{ preset?: Filter | null }>()
const emit = defineEmits<{ (e: 'show-events', f: Filter): void }>()
const host = useDwHost()
const t = host.t
const { EntityPicker } = host.components
const manage = computed(() => canReset())
const catalog = useCatalog()

const filter = reactive({ ...emptyFilter(), ...(props.preset ? filterQuery(props.preset) : {}) })
const degraded = ref(!props.preset)
const query = () => ({ ...filterQuery(filter), degraded: degraded.value ? '1' : '' })

const allAccounts = seesAllAccounts()
const list = useList<KeyStatus>(keyListApi(), '/status', query(), { pageSize: 50 })
const needsAccount = computed(() => !allAccounts && !list.filters.account_id)
const error = computed(() => (list.error.value ? errorMessage(list.error.value, t('status.loadFailed')) : ''))
const models = computed(() => modelCandidates(list.items.value))

const search = () => applyQuery(list, query())

function clear() {
  Object.assign(filter, emptyFilter())
  search()
}

const stats = ref<InstanceType<typeof StatsPanel> | null>(null)
defineExpose({ reload: () => Promise.all([list.reload(), stats.value?.reload()]) })

const { busy, reset } = useReset(list.reload)

const accountLabel = (r: KeyStatus) => catalog.accountName(r.account_id, r.account_name)
const resetRow = (r: KeyStatus) =>
  reset({ account_id: r.account_id, group_id: r.group_id, model: r.model }, t('status.resetKeyConfirm', { account: accountLabel(r), group: catalog.groupName(r.group_id), model: r.model }), keyOf(r))

// Reset every key the applied filter's account and/or group covers (not what
// is typed but not searched yet). A group alone covers every account: only a
// holder of the full account:update gets it (the core refuses the others).
// null when an id is not a positive integer (the list then shows the error).
const filtered = computed(() => {
  const f = list.filters as Filter
  const id = (v: string) => (v === '' ? 0 : /^\d+$/.test(v) ? Number(v) : NaN)
  const k = { account_id: id(f.account_id), group_id: id(f.group_id), model: f.model }
  return Number.isNaN(k.account_id) || Number.isNaN(k.group_id) || (!k.account_id && !k.group_id) ? null : k
})
const resetFiltered = () => filtered.value && reset(filtered.value, t('status.resetFilterConfirm'), 'filter')

// Batch reset: the accounts of the selected rows (at most
// MAX_ACCOUNT_BATCH), in every group and model or in the ones given. The
// selection is of the rows shown: any load (filter, page, reload) clears it.
const selected = ref<string[]>([])
watch(list.items, () => (selected.value = []))
const selectedAccounts = computed(() => [...new Set(selected.value.map((k) => Number(k.split('|')[0])))])
const tooMany = computed(() => selectedAccounts.value.length > MAX_ACCOUNT_BATCH)
const pageKeys = computed(() => list.items.value.map(keyOf))
const batch = reactive({ open: false, group_id: '', model: '' })
function openBatch() {
  Object.assign(batch, { open: true, group_id: '', model: '' })
}
async function resetSelected() {
  if (tooMany.value) return
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
    <StatsPanel v-if="allAccounts" ref="stats" class="dw-block" />

    <SCard>
      <KeyFilters v-model="filter" :loading="list.loading.value" :models="models" @search="search" @clear="clear">
        <SField class="dw-filter" :label="t('status.degradedOnly')">
          <SSwitch v-model="degraded" @update:model-value="search" />
        </SField>
      </KeyFilters>
    </SCard>

    <div v-if="manage && filtered && (filtered.account_id || resetsAllAccounts())" class="dw-toolbar">
      <SButton variant="danger" icon="refresh" :loading="busy === 'filter'" @click="resetFiltered">
        {{ t('status.resetFiltered') }}
      </SButton>
    </div>

    <SAlert v-if="error" tone="danger" class="dw-section">{{ error }}</SAlert>
    <SAlert v-else-if="needsAccount" class="dw-section" data-testid="dw-needs-account">{{ t('filter.needsAccount') }}</SAlert>

    <SBulkBar v-if="manage" class="dw-section" :count="selected.length" :page-selected="pageKeys.length > 0 && pageKeys.every((k) => selected.includes(k))" @select-page="selected = pageKeys" @clear="selected = []">
      <SBadge :tone="tooMany ? 'danger' : 'gray'" size="xs">{{ t('status.selectedAccounts', { n: selectedAccounts.length, max: MAX_ACCOUNT_BATCH }) }}</SBadge>
      <SButton size="sm" variant="danger" icon="refresh" :disabled="tooMany" @click="openBatch">{{ t('status.resetSelected', { n: selectedAccounts.length }) }}</SButton>
    </SBulkBar>

    <KeyStatusTable v-model:selected="selected" class="dw-section" :list="list" :busy="busy" :selectable="manage" @reset="resetRow" @show-events="showEvents" />

    <SModal v-model:open="batch.open" :title="t('status.resetSelected', { n: selectedAccounts.length })">
      <SHint class="dw-hint">{{ t('status.resetSelectedHint') }}</SHint>
      <div class="dw-list">
        <SField :label="t('filter.group')">
          <EntityPicker v-model:id="batch.group_id" kind="group" />
        </SField>
        <SField :label="t('filter.model')" :hint="t('status.modelHint')">
          <EntityPicker v-model:id="batch.model" kind="model" :extra="models" />
        </SField>
      </div>
      <template #footer>
        <SButton @click="batch.open = false">{{ t('cancel') }}</SButton>
        <SButton variant="danger" :loading="busy === 'batch'" :disabled="tooMany" @click="resetSelected">{{ t('status.reset') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
