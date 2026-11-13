<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  SAlert,
  SBadge,
  SButton,
  SCard,
  SDateTime,
  SField,
  SFormModal,
  SHint,
  SInput,
  SLink,
  SRowAction,
  STable,
  STableColumnSettings,
  useTableColumns,
  useViewport,
  type TableColumn
} from '@sub2api/ui'
import UserRef from './UserRef.vue'
import { enumLabel, num } from './format'
import { canManage, createBlock, deleteBlock, fetchBlocks, toastError, useModHost } from './host'
import type { Block } from './types'
import { applyErrorsOrToast, clearErrors, idNumber, type FieldErrors } from './forms'
import { useAsync } from './useAsync'

// Blocked users: list (GET /blocks), unblock (DELETE /blocks/:user_id),
// manual block (POST /blocks, in a dialog opened from the toolbar; the user
// is picked with the host's EntityPicker). Actions need the manage
// permission. A moderator or an allowlisted user cannot be banned: the
// backend's field error (user_id/staff, user_id/allowlisted) shows at the
// user. Each table cell keeps to one line; a reason opens its row (an
// expanded row with the whole reason), a phone card shows all of it.
const host = useModHost()
const t = host.t
const { EntityPicker } = host.components
const manage = computed(() => canManage())
const { compact } = useViewport()

const { data, loading, error, reload } = useAsync(fetchBlocks, () => t('blocks.loadFailed'))
const rows = computed(() => data.value || [])
const busy = ref<number | null>(null)
onMounted(reload)
defineExpose({ reload })

const columns = computed(() => {
  const c: TableColumn[] = [
    { key: 'user_id', label: t('blocks.col.user'), nowrap: true, hideable: false, mobile: 'title' },
    { key: 'source', label: t('blocks.col.source'), nowrap: true, mobile: 'status' },
    { key: 'reason', label: t('blocks.col.reason'), grow: true, mobile: 'subtitle' },
    { key: 'violations', label: t('blocks.col.violations'), align: 'right', nowrap: true, mobile: 'meta' },
    { key: 'created_at', label: t('blocks.col.created'), nowrap: true, mobile: 'meta' },
    { key: 'expires_at', label: t('blocks.col.expires'), nowrap: true, mobile: 'meta' }
  ]
  if (manage.value) c.push({ key: 'actions', label: t('actions'), align: 'right', hideable: false })
  return c
})
const columnState = useTableColumns(columns, 'moderation-blocks')

async function unblock(b: Block) {
  const ok = await host.confirm({ message: t('blocks.unblockConfirm', { id: b.user_id }), confirmText: t('blocks.unblock') })
  if (!ok) return
  busy.value = b.user_id
  try {
    await deleteBlock(b.user_id)
    host.toast(t('blocks.unblocked', { id: b.user_id }), 'success')
    data.value = rows.value.filter((r) => r.user_id !== b.user_id)
  } catch (e) {
    toastError(e)
  } finally {
    busy.value = null
  }
}

// Manual block dialog.
const formOpen = ref(false)
const form = reactive<{ user_id: string; reason: string; duration_hours: number | null }>({ user_id: '', reason: '', duration_hours: 24 })
const FIELDS = ['user_id', 'duration_hours']
const formErr = reactive<FieldErrors>({})
const saving = ref(false)

function openForm() {
  clearErrors(formErr)
  Object.assign(form, { user_id: '', reason: '', duration_hours: 24 })
  formOpen.value = true
}

async function submit() {
  clearErrors(formErr)
  const uid = idNumber(form.user_id)
  if (!(uid > 0)) formErr.user_id = t('blocks.invalidUser')
  // SInput type=number hands back a number (null when empty)
  const rawDh = String(form.duration_hours ?? '').trim()
  const dh = rawDh === '' ? 0 : Number(rawDh)
  if (!Number.isInteger(dh) || dh < 0) formErr.duration_hours = t('blocks.invalidDuration')
  if (formErr.user_id || formErr.duration_hours) return
  saving.value = true
  try {
    const body: { user_id: number; reason?: string; duration_hours?: number } = { user_id: uid, duration_hours: dh }
    if (form.reason.trim()) body.reason = form.reason.trim()
    await createBlock(body)
    host.toast(t('blocks.created', { id: uid }), 'success')
    formOpen.value = false
    await reload()
  } catch (e) {
    applyErrorsOrToast(formErr, e, FIELDS)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <SHint class="mod-hint">{{ t('blocks.hint') }}</SHint>

    <div class="mod-toolbar">
      <STableColumnSettings :state="columnState" />
      <SButton v-if="manage" variant="danger" size="sm" icon="lock" @click="openForm">{{ t('blocks.manual') }}</SButton>
    </div>

    <SAlert v-if="error" tone="danger" class="mod-block">{{ error }}</SAlert>

    <SCard :padded="false">
      <STable
        :columns="columnState.visibleColumns.value"
        :rows="rows"
        :loading="loading"
        row-key="user_id"
        :empty-text="t('blocks.empty')"
        dense
        :expandable="!compact"
        :expand-toggle="false"
      >
        <template #cell-user_id="{ row }"><UserRef :user-id="row.user_id" /></template>
        <template #cell-source="{ row }">
          <SBadge :tone="row.source === 'manual' ? 'accent' : 'warning'">{{ enumLabel('source', row.source) }}</SBadge>
        </template>
        <template #cell-reason="{ row, layout, expanded, toggleExpand }">
          <SLink
            v-if="row.reason && layout === 'table'"
            as="button"
            class="mod-reason-toggle"
            :aria-expanded="expanded"
            :title="t(expanded ? 'blocks.reasonHide' : 'blocks.reasonShow')"
            @click="toggleExpand()"
            >{{ row.reason }}</SLink
          >
          <span v-else class="mod-prewrap">{{ row.reason || '—' }}</span>
        </template>
        <template #expand="{ row }"><p class="mod-prewrap mod-body-text">{{ row.reason }}</p></template>
        <template #cell-violations="{ row }"><span class="mod-num">{{ num(row.violations) }}</span></template>
        <template #cell-created_at="{ row }"><SDateTime :value="row.created_at" mode="time" /></template>
        <template #cell-expires_at="{ row }">
          <SDateTime v-if="row.expires_at" :value="row.expires_at" mode="time" />
          <SBadge v-else tone="danger">{{ t('blocks.forever') }}</SBadge>
        </template>
        <template #cell-actions="{ row }">
          <SRowAction :label="t('blocks.unblock')" :loading="busy === row.user_id" @click="unblock(row)" />
        </template>
      </STable>
    </SCard>

    <SFormModal v-model:open="formOpen" :title="t('blocks.manual')" width="md" :loading="saving" :submit-text="t('blocks.submit')" submit-variant="danger" @submit="submit">
      <!-- Focus starts on the form, not in the user picker: that would drop its list over the other fields. -->
      <div class="mod-form" tabindex="-1" data-autofocus>
        <SField :label="t('blocks.col.user')" required :error="formErr.user_id">
          <EntityPicker v-model:id="form.user_id" kind="user" />
        </SField>
        <SField :label="t('blocks.reason')">
          <SInput v-model="form.reason" :maxlength="500" :placeholder="t('blocks.reasonPlaceholder')" />
        </SField>
        <SField :label="t('blocks.duration')" :error="formErr.duration_hours" :hint="t('blocks.durationHint')">
          <SInput v-model="form.duration_hours" type="number" min="0" step="1" />
        </SField>
      </div>
    </SFormModal>
  </div>
</template>
