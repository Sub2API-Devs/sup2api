<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { isApiError, useList } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SDrawer, SEmpty, SField, SHint, SInput, SLink, SModal, SPagination, SSegmented, SSelect, STable, type TableColumn } from '@sub2api/ui'
import { canManage, createWatch, deleteWatch, enumLabel, errorMessage, fetchWatchEvents, levelTone, updateWatch, useModHost, type Watch, type WatchEvent, type WatchLevel } from './host'

// Watch list (CONTRACTS §72.8): observe = moderated in the background and
// counted; enforce = moderated before the upstream call, a hit is refused.
const emit = defineEmits<{ (e: 'show-user', userId: number): void }>()
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

const filter = reactive({ level: '', user_id: '' })
const list = useList<Watch>(host.pluginApi, '/watchlist', { ...filter })
const error = computed(() => (list.error.value ? errorMessage(list.error.value, t('watch.loadFailed')) : ''))
watch(() => filter.level, () => Object.assign(list.filters, { ...filter }))
function search() {
  Object.assign(list.filters, { ...filter, user_id: filter.user_id.trim() })
  list.reload()
}
defineExpose({ reload: list.reload })

const levelOptions = computed(() => [
  { value: '', label: t('events.all') },
  { value: 'observe', label: t('level.observe') },
  { value: 'enforce', label: t('level.enforce') }
])

const columns = computed<TableColumn[]>(() => {
  const c: TableColumn[] = [
    { key: 'user_id', label: t('watch.col.user') },
    { key: 'level', label: t('watch.col.level'), nowrap: true },
    { key: 'violation_count', label: t('watch.col.violations'), align: 'right' },
    { key: 'hit_count', label: t('watch.col.hits'), align: 'right' },
    { key: 'last_hit_at', label: t('watch.col.lastHit'), nowrap: true },
    { key: 'expires_at', label: t('watch.col.expires'), nowrap: true },
    { key: 'source', label: t('watch.col.source') },
    { key: 'note', label: t('watch.col.note'), ellipsis: '14rem' }
  ]
  if (manage.value) c.push({ key: 'actions', label: '', align: 'right' })
  return c
})

// ---- add / edit
const editOpen = ref(false)
const editing = ref<Watch | null>(null)
const form = reactive<{ user_id: string; level: WatchLevel; days: number | null; note: string }>({ user_id: '', level: 'observe', days: 30, note: '' })
const formErr = reactive<Record<string, string>>({})
const saving = ref(false)

function openAdd() {
  editing.value = null
  Object.assign(form, { user_id: '', level: 'observe', days: 30, note: '' })
  for (const k of Object.keys(formErr)) delete formErr[k]
  editOpen.value = true
}

function openEdit(w: Watch) {
  editing.value = w
  const days = w.expires_at ? Math.max(1, Math.ceil((new Date(w.expires_at).getTime() - Date.now()) / 86400000)) : 0
  Object.assign(form, { user_id: String(w.user_id), level: w.level, days, note: w.note })
  for (const k of Object.keys(formErr)) delete formErr[k]
  editOpen.value = true
}

async function save() {
  for (const k of Object.keys(formErr)) delete formErr[k]
  const days = form.days === null || String(form.days).trim() === '' ? 0 : Number(form.days)
  saving.value = true
  try {
    if (editing.value) {
      await updateWatch(editing.value.user_id, { level: form.level, days, note: form.note })
    } else {
      const uid = Number(form.user_id.trim())
      if (!Number.isSafeInteger(uid) || uid <= 0) {
        formErr.user_id = t('blocks.invalidUser')
        return
      }
      await createWatch({ user_id: uid, level: form.level, days, note: form.note })
    }
    host.toast(t('watch.saved'), 'success')
    editOpen.value = false
    list.reload()
  } catch (e) {
    const fields = isApiError(e) ? e.fields : {}
    Object.assign(formErr, fields)
    if (!Object.keys(fields).length) host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    saving.value = false
  }
}

async function setLevel(w: Watch, level: WatchLevel) {
  try {
    await updateWatch(w.user_id, { level })
    w.level = level
    host.toast(t('watch.saved'), 'success')
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  }
}

async function remove(w: Watch) {
  const ok = await host.confirm({ message: t('watch.removeConfirm', { id: w.user_id }), confirmText: t('watch.remove') })
  if (!ok) return
  try {
    await deleteWatch(w.user_id)
    host.toast(t('watch.removed', { id: w.user_id }), 'success')
    list.reload()
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  }
}

// ---- history drawer
const historyOpen = ref(false)
const historyUser = ref<number | null>(null)
const history = ref<WatchEvent[]>([])
const historyLoading = ref(false)
async function openHistory(w: Watch) {
  historyUser.value = w.user_id
  historyOpen.value = true
  historyLoading.value = true
  try {
    history.value = await fetchWatchEvents(w.user_id)
  } catch (e) {
    history.value = []
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    historyLoading.value = false
  }
}
</script>

<template>
  <div>
    <SHint class="mod-hint">{{ t('watch.hint') }}</SHint>

    <SCard>
      <form class="mod-filters" @submit.prevent="search">
        <SField class="mod-filter" :label="t('watch.col.level')">
          <SSelect v-model="filter.level" :options="levelOptions" />
        </SField>
        <SField class="mod-filter" :label="t('events.userId')">
          <SInput v-model="filter.user_id" inputmode="numeric" />
        </SField>
        <div class="mod-filter-actions">
          <SButton type="submit" variant="primary" icon="search" :loading="list.loading.value">{{ t('events.search') }}</SButton>
          <SButton v-if="manage" icon="plus" @click="openAdd">{{ t('watch.add') }}</SButton>
        </div>
      </form>
    </SCard>

    <SAlert v-if="error" tone="danger" class="mod-section">{{ error }}</SAlert>

    <SCard :padded="false" class="mod-section">
      <STable :columns="columns" :rows="list.items.value" :loading="list.loading.value" row-key="user_id" :empty-text="t('watch.empty')" dense>
        <template #cell-user_id="{ row }">
          <SLink as="button" class="mod-num" :title="t('watch.showRecords')" @click="emit('show-user', row.user_id)">#{{ row.user_id }}</SLink>
        </template>
        <template #cell-level="{ row }">
          <SSegmented
            v-if="manage"
            :model-value="row.level"
            size="sm"
            :options="[{ value: 'observe', label: t('level.observe') }, { value: 'enforce', label: t('level.enforce') }]"
            @update:model-value="setLevel(row, $event as WatchLevel)"
          />
          <SBadge v-else :tone="levelTone(row.level)">{{ enumLabel('level', row.level) }}</SBadge>
        </template>
        <template #cell-violation_count="{ row }"><span class="mod-num">{{ host.i18n.formatNumber(row.violation_count) }}</span></template>
        <template #cell-hit_count="{ row }"><span class="mod-num">{{ host.i18n.formatNumber(row.hit_count) }}</span></template>
        <template #cell-last_hit_at="{ row }">{{ row.last_hit_at ? host.i18n.formatDateTime(row.last_hit_at) : '—' }}</template>
        <template #cell-expires_at="{ row }">
          <template v-if="row.expires_at">{{ host.i18n.formatDateTime(row.expires_at) }}</template>
          <SBadge v-else tone="gray">{{ t('watch.noExpiry') }}</SBadge>
        </template>
        <template #cell-source="{ row }">{{ enumLabel('watchSource', row.source) }}</template>
        <template #cell-note="{ row }"><span :title="row.note">{{ row.note || '—' }}</span></template>
        <template #cell-actions="{ row }">
          <SButton size="sm" variant="ghost" @click="openHistory(row)">{{ t('watch.history') }}</SButton>
          <SButton size="sm" variant="ghost" @click="openEdit(row)">{{ t('edit') }}</SButton>
          <SButton size="sm" variant="ghost" @click="remove(row)">{{ t('watch.remove') }}</SButton>
        </template>
      </STable>
      <div class="mod-pager">
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </div>
    </SCard>

    <SModal v-model:open="editOpen" :title="editing ? t('watch.editTitle', { id: editing.user_id }) : t('watch.add')" width="md">
      <form class="mod-form" @submit.prevent="save">
        <SField v-if="!editing" :label="t('events.userId')" required :error="formErr.user_id">
          <SInput v-model="form.user_id" inputmode="numeric" />
        </SField>
        <SField :label="t('watch.col.level')" :hint="t('watch.levelHint')" :error="formErr.level">
          <SSegmented v-model="form.level" :options="[{ value: 'observe', label: t('level.observe') }, { value: 'enforce', label: t('level.enforce') }]" />
        </SField>
        <SField :label="t('watch.days')" :hint="t('watch.daysHint')" :error="formErr.days">
          <SInput v-model="form.days" type="number" min="0" max="3650" step="1" />
        </SField>
        <SField :label="t('watch.col.note')" :error="formErr.note">
          <SInput v-model="form.note" :maxlength="500" />
        </SField>
      </form>
      <template #footer>
        <SButton @click="editOpen = false">{{ host.i18n.t('ui.cancel') }}</SButton>
        <SButton variant="primary" :loading="saving" @click="save">{{ t('save') }}</SButton>
      </template>
    </SModal>

    <SDrawer v-model:open="historyOpen" :title="t('watch.historyTitle', { id: historyUser })">
      <SEmpty v-if="!historyLoading && !history.length" :text="t('watch.noHistory')" />
      <ol v-else class="mod-history">
        <li v-for="e in history" :key="e.id">
          <div class="mod-history-head">
            <SBadge>{{ enumLabel('watchAction', e.action) }}</SBadge>
            <span v-if="e.from_level || e.to_level" class="mod-sub">{{ enumLabel('level', e.from_level) }} → {{ enumLabel('level', e.to_level) }}</span>
            <SHint inline size="xs">{{ host.i18n.formatDateTime(e.created_at) }}<template v-if="e.operator_id"> · #{{ e.operator_id }}</template></SHint>
          </div>
          <div v-if="e.reason" class="mod-sub">{{ e.reason }}</div>
        </li>
      </ol>
    </SDrawer>
  </div>
</template>
