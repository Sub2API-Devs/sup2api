<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { SAlert, SBadge, SButton, SCard, SField, SHint, SInput, STable, type TableColumn } from '@sub2api/ui'
import { dt, enumLabel } from './format'
import { canManage, createBlock, deleteBlock, fetchBlocks, toastError, useModHost } from './host'
import type { Block } from './types'
import { applyErrorsOrToast, clearErrors, type FieldErrors } from './forms'
import { useAsync } from './useAsync'

// Blocked users: list (GET /blocks), unblock (DELETE /blocks/:user_id),
// manual block (POST /blocks). Actions need the manage permission.
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

const { data, loading, error, reload } = useAsync(fetchBlocks, () => t('blocks.loadFailed'))
const rows = computed(() => data.value || [])
const busy = ref<number | null>(null)
onMounted(reload)
defineExpose({ reload })

const columns = computed(() => {
  const c: TableColumn[] = [
    { key: 'user_id', label: t('blocks.col.user') },
    { key: 'reason', label: t('blocks.col.reason'), ellipsis: '16rem' },
    { key: 'violations', label: t('blocks.col.violations'), align: 'right', class: 'mod-num' },
    { key: 'source', label: t('blocks.col.source') },
    { key: 'created_at', label: t('blocks.col.created'), nowrap: true },
    { key: 'expires_at', label: t('blocks.col.expires'), nowrap: true }
  ]
  if (manage.value) c.push({ key: 'actions', label: t('blocks.col.actions'), align: 'right' })
  return c
})

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

// Manual block form.
const form = reactive<{ user_id: string; reason: string; duration_hours: number | null }>({ user_id: '', reason: '', duration_hours: 24 })
const FIELDS = ['user_id', 'duration_hours']
const formErr = reactive<FieldErrors>({})
const saving = ref(false)

async function submit() {
  clearErrors(formErr)
  const uid = Number(form.user_id.trim())
  if (!/^\d+$/.test(form.user_id.trim()) || !Number.isSafeInteger(uid) || uid <= 0) formErr.user_id = t('blocks.invalidUser')
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
    form.user_id = ''
    form.reason = ''
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

    <SCard v-if="manage" :title="t('blocks.manual')" class="mod-section-b">
      <form class="mod-block-form" @submit.prevent="submit">
        <SField class="mod-filter" :label="t('blocks.userId')" required :error="formErr.user_id">
          <SInput v-model="form.user_id" inputmode="numeric" />
        </SField>
        <SField class="mod-filter mod-filter-wide" :label="t('blocks.reason')">
          <SInput v-model="form.reason" :maxlength="500" :placeholder="t('blocks.reasonPlaceholder')" />
        </SField>
        <SField class="mod-filter" :label="t('blocks.duration')" :error="formErr.duration_hours" :hint="t('blocks.durationHint')">
          <SInput v-model="form.duration_hours" type="number" min="0" step="1" />
        </SField>
        <div class="mod-filter-actions">
          <SButton type="submit" variant="danger" icon="lock" :loading="saving">{{ t('blocks.submit') }}</SButton>
        </div>
      </form>
    </SCard>

    <SAlert v-if="error" tone="danger" class="mod-block">{{ error }}</SAlert>

    <SCard :padded="false">
      <STable :columns="columns" :rows="rows" :loading="loading" row-key="user_id" :empty-text="t('blocks.empty')">
        <template #cell-user_id="{ row }"><span class="mod-num">#{{ row.user_id }}</span></template>
        <template #cell-source="{ row }">
          <SBadge :tone="row.source === 'manual' ? 'accent' : 'warning'">{{ enumLabel('source', row.source) }}</SBadge>
        </template>
        <template #cell-created_at="{ row }">{{ dt(row.created_at) }}</template>
        <template #cell-expires_at="{ row }">
          <template v-if="row.expires_at">{{ dt(row.expires_at) }}</template>
          <SBadge v-else tone="danger">{{ t('blocks.forever') }}</SBadge>
        </template>
        <template #cell-actions="{ row }">
          <SButton size="sm" :loading="busy === row.user_id" @click="unblock(row)">{{ t('blocks.unblock') }}</SButton>
        </template>
      </STable>
    </SCard>
  </div>
</template>
