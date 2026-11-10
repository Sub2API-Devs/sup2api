<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { SAlert, SBadge, SButton, SCard, SField, SHint, SInput, SLink, SSelect, STable, type TableColumn } from '@sub2api/ui'
import BindingEditModal from './BindingEditModal.vue'
import { bindingKey, bindingKind, fallbackOf, hasAccountBindings, resolveSteps, sortBindings } from './bindingOps'
import { useCatalog } from './catalog'
import { joinList } from './format'
import { canManage, deleteBinding, errorMessage, fetchAccounts, toastError, useModHost } from './host'
import type { Binding, BindingKind, CoreAccount, TabKey } from './types'
import { useAsync } from './useAsync'

// Bindings of flows to groups and accounts (CONTRACTS §72.17): every
// binding, most specific first, edited in a dialog; a preview tells which
// binding a request of a group sent to an account goes by. Group bindings
// are the same ones the flows list edits. A binding to a disabled,
// unpublished or deleted flow is inactive (GET /bindings `inactive`): it
// does not apply, its row says what its requests go by instead, and the
// preview passes over it.
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())
const emit = defineEmits<{ (e: 'go-tab', tab: TabKey): void }>()

const catalog = useCatalog()
const accounts = useAsync<CoreAccount[]>(fetchAccounts, () => t('bindings.loadFailed'))
onMounted(accounts.reload)
const accountList = computed(() => accounts.data.value ?? [])
const reload = () => Promise.all([catalog.refresh(['bindings', 'flows', 'groups']), accounts.reload()])
defineExpose({ reload })

const rows = computed(() => sortBindings(catalog.state.bindings).map((b) => ({ ...b, key: bindingKey(b) })))
const error = computed(() => (catalog.state.errors.bindings ? errorMessage(catalog.state.errors.bindings, t('bindings.loadFailed')) : ''))
const inactive = computed(() => !catalog.state.accountBindingsActive && hasAccountBindings(rows.value))

const accountLabel = (id: number) => {
  const a = accountList.value.find((x) => x.id === id)
  return a ? `${a.name} #${id}` : `#${id}`
}
const groupLabel = (id: number) => (id === 0 ? t('flows.defaultGroup') : catalog.groupName(id))

// ---- filters
const kindFilter = ref<BindingKind | null>(null)
const query = ref('')
const kindOptions = computed(() => [
  { value: null, label: t('bindings.allKinds') },
  ...(['group_account', 'account', 'group'] as const).map((k) => ({ value: k, label: t(`bindings.kind.${k}`) }))
])
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return rows.value.filter((b) => {
    if (kindFilter.value && bindingKind(b.group_id, b.account_id) !== kindFilter.value) return false
    if (!q) return true
    const text = [b.account_id ? accountLabel(b.account_id) : '', b.group_id || !b.account_id ? groupLabel(b.group_id) : '', flowText(b.flow_id)]
    return text.join(' ').toLowerCase().includes(q)
  })
})

const columns = computed<TableColumn[]>(() => {
  const c: TableColumn[] = [
    { key: 'scope', label: t('bindings.col.scope'), mobile: 'title' },
    { key: 'kind', label: t('bindings.col.kind'), nowrap: true, mobile: 'status' },
    { key: 'flow', label: t('bindings.col.flow'), mobile: 'meta', mobileSpan: 2 }
  ]
  if (manage.value) c.push({ key: 'actions', label: '', align: 'right' })
  return c
})

const kindTone = (k: BindingKind) => (k === 'group_account' ? 'accent' : k === 'account' ? 'info' : 'gray')
const flowText = (id: number) => (id ? catalog.flowName(id) : t('bindings.exempt'))
/** Why the flow of an inactive binding does not run. */
function flowState(id: number): string {
  const f = catalog.flow(id)
  return t(`bindings.flowState.${!f ? 'missing' : !f.enabled ? 'disabled' : 'unpublished'}`)
}
/** What a binding leads to: its flow, or "not moderated". */
const targetText = (b: Binding) => (b.flow_id ? flowText(b.flow_id) : t('bindings.exempt'))
/** What the requests of an inactive binding go by now (the same lookup as the preview). */
function fallbackText(b: Binding): string {
  // an account bound in any group: each request falls back within its own group
  if (bindingKind(b.group_id, b.account_id) === 'account') return t('bindings.fallbackPerGroup')
  const next = fallbackOf(rows.value, b)
  return next ? t('bindings.fallbackBy', { scope: scopeText(next), target: targetText(next) }) : t('bindings.fallbackNone')
}

async function openFlow(id: number) {
  await host.router.push({ query: { ...host.router.currentRoute.value.query, tab: 'flows', flow: String(id) } })
  emit('go-tab', 'flows')
}

// ---- edit
const editOpen = ref(false)
const editing = ref<Binding | null>(null)
function openEdit(b: Binding | null) {
  editing.value = b
  editOpen.value = true
}
const refreshBindings = () => catalog.refresh(['bindings', 'flows'])

async function remove(b: Binding) {
  const message = t('bindings.deleteConfirm', { scope: scopeText(b) })
  if (!(await host.confirm({ message, danger: true, confirmText: t('delete') }))) return
  try {
    await deleteBinding(b)
    host.toast(t('deleted'), 'success')
    await refreshBindings()
  } catch (e) {
    toastError(e)
  }
}

function scopeText(b: Binding): string {
  switch (bindingKind(b.group_id, b.account_id)) {
    case 'group':
      return groupLabel(b.group_id)
    case 'account':
      return t('bindings.accountAnyGroup', { account: accountLabel(b.account_id) })
    default:
      return t('bindings.accountInGroup', { account: accountLabel(b.account_id), group: groupLabel(b.group_id) })
  }
}

// ---- preview: which binding a request goes by
const preview = ref<{ group: string; account: string }>({ group: '', account: '' })
const previewGroups = computed(() =>
  catalog
    .groupOptions()
    .filter((o) => o.value !== 0)
    .map((o) => ({ value: String(o.value), label: o.label }))
)
const previewAccounts = computed(() => [
  { value: '', label: t('bindings.previewNoAccount') },
  ...accountList.value.map((a) => ({ value: String(a.id), label: `${a.name} #${a.id}` }))
])
const previewResult = computed(() => {
  const g = Number(preview.value.group)
  if (!preview.value.group || !Number.isInteger(g)) return null
  const a = Number(preview.value.account) || 0
  const { hit, skipped } = resolveSteps(rows.value, g, a)
  const note = skipped.length ? t('bindings.previewSkipped', { scopes: joinList(skipped.map(scopeText)) }) : ''
  if (!hit) return { text: t('bindings.previewNone'), note, tone: 'gray' as const }
  return { text: t('bindings.previewBy', { scope: scopeText(hit), target: targetText(hit) }), note, tone: hit.flow_id ? ('success' as const) : ('warning' as const) }
})
</script>

<template>
  <div>
    <SHint class="mod-hint">{{ t('bindings.hint') }}</SHint>
    <SAlert v-if="inactive" tone="warning" class="mod-block">{{ t('bindings.inactive') }}</SAlert>
    <SAlert v-if="error" tone="danger" class="mod-block">{{ error }}</SAlert>

    <div class="mod-toolbar mod-bindings-toolbar">
      <SSelect
        :model-value="kindFilter"
        :options="kindOptions"
        :aria-label="t('bindings.col.kind')"
        class="mod-bindings-kind"
        @update:model-value="kindFilter = $event as BindingKind | null"
      />
      <SInput
        v-model="query"
        type="search"
        icon="search"
        :placeholder="t('bindings.search')"
        :aria-label="t('bindings.search')"
        class="mod-bindings-search"
        clearable
      />
      <SButton v-if="manage" variant="primary" icon="plus" class="mod-ml-auto" @click="openEdit(null)">{{ t('bindings.add') }}</SButton>
    </div>

    <SCard :padded="false">
      <STable
        :columns="columns"
        :rows="filtered"
        :loading="catalog.state.loading"
        row-key="key"
        :empty-text="rows.length ? t('bindings.noMatch') : t('bindings.empty')"
        dense
      >
        <template #cell-scope="{ row }">
          <span class="mod-bindings-scope">
            <span>{{ row.account_id ? accountLabel(row.account_id) : groupLabel(row.group_id) }}</span>
            <span v-if="row.account_id" class="mod-sub">{{
              row.group_id ? t('bindings.inGroup', { group: groupLabel(row.group_id) }) : t('bindings.anyGroup')
            }}</span>
            <span v-else class="mod-sub">{{ row.group_id ? t('bindings.allAccounts') : t('bindings.defaultScope') }}</span>
          </span>
        </template>
        <template #cell-kind="{ row }">
          <SBadge :tone="kindTone(row.kind)">{{ t(`bindings.kind.${row.kind}`) }}</SBadge>
        </template>
        <template #cell-flow="{ row }">
          <SBadge v-if="!row.flow_id" tone="warning">{{ t('bindings.exempt') }}</SBadge>
          <template v-else>
            <SLink as="button" @click="openFlow(row.flow_id)">{{ flowText(row.flow_id) }}</SLink>
            <template v-if="row.inactive">
              <SBadge tone="gray" class="mod-ml">{{ t('bindings.rowInactive', { state: flowState(row.flow_id) }) }}</SBadge>
              <div class="mod-sub">{{ fallbackText(row) }}</div>
            </template>
          </template>
        </template>
        <template #cell-actions="{ row }">
          <SButton size="sm" variant="ghost" @click="openEdit(row)">{{ t('edit') }}</SButton>
          <SButton size="sm" variant="ghost" @click="remove(row)">{{ t('delete') }}</SButton>
        </template>
      </STable>
    </SCard>

    <SCard :title="t('bindings.previewTitle')" class="mod-section">
      <div class="mod-bindings-preview">
        <SField class="mod-filter" :label="t('bindings.col.group')">
          <SSelect v-if="previewGroups.length" v-model="preview.group" :options="previewGroups" :placeholder="t('bindings.pickGroup')" searchable />
          <SInput v-else v-model="preview.group" inputmode="numeric" :placeholder="t('bindings.groupIdPlaceholder')" />
        </SField>
        <SField class="mod-filter" :label="t('bindings.col.account')">
          <SSelect v-if="accountList.length" v-model="preview.account" :options="previewAccounts" searchable />
          <SInput v-else v-model="preview.account" inputmode="numeric" :placeholder="t('bindings.accountIdPlaceholder')" />
        </SField>
      </div>
      <p v-if="previewResult" class="mod-bindings-result">
        <SBadge :tone="previewResult.tone" dot>{{ previewResult.text }}</SBadge>
        <span v-if="previewResult.note" class="mod-sub mod-ml">{{ previewResult.note }}</span>
      </p>
      <SHint v-else size="xs">{{ t('bindings.previewHint') }}</SHint>
    </SCard>

    <BindingEditModal v-model:open="editOpen" :binding="editing" :accounts="accountList" :account-label="accountLabel" @saved="refreshBindings" />
  </div>
</template>
