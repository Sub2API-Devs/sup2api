<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { SBadge, SButton, SCard, SIcon, STable } from '@sub2api/ui'
import { canManage, createBlock, deleteBlock, enumLabel, errorMessage, fetchBlocks, useModHost, type Block } from './host'

// Blocked users: list (GET /blocks), unblock (DELETE /blocks/:user_id),
// manual block (POST /blocks). Actions need the manage permission.
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

const rows = ref<Block[]>([])
const loading = ref(false)
const error = ref('')
const busy = ref<number | null>(null)

async function reload() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await fetchBlocks()
  } catch (e) {
    error.value = errorMessage(e, t('blocks.loadFailed'))
  } finally {
    loading.value = false
  }
}

onMounted(reload)
defineExpose({ reload })

const columns = computed(() => {
  const c = [
    { key: 'user_id', label: t('blocks.col.user') },
    { key: 'reason', label: t('blocks.col.reason') },
    { key: 'violations', label: t('blocks.col.violations'), align: 'right' as const },
    { key: 'source', label: t('blocks.col.source') },
    { key: 'created_at', label: t('blocks.col.created') },
    { key: 'expires_at', label: t('blocks.col.expires') }
  ]
  if (manage.value) c.push({ key: 'actions', label: t('blocks.col.actions'), align: 'right' as const })
  return c
})

async function unblock(b: Block) {
  const ok = await host.confirm({ message: t('blocks.unblockConfirm', { id: b.user_id }), confirmText: t('blocks.unblock') })
  if (!ok) return
  busy.value = b.user_id
  try {
    await deleteBlock(b.user_id)
    host.toast(t('blocks.unblocked', { id: b.user_id }), 'success')
    rows.value = rows.value.filter((r) => r.user_id !== b.user_id)
  } catch (e) {
    host.toast(errorMessage(e, t('loadFailed')), 'error')
  } finally {
    busy.value = null
  }
}

// Manual block form.
const form = reactive({ user_id: '', reason: '', duration_hours: '24' })
const formErr = reactive({ user_id: '', duration_hours: '' })
const saving = ref(false)

async function submit() {
  formErr.user_id = ''
  formErr.duration_hours = ''
  const uid = Number(form.user_id.trim())
  if (!/^\d+$/.test(form.user_id.trim()) || !Number.isSafeInteger(uid) || uid <= 0) formErr.user_id = t('blocks.invalidUser')
  // v-model on type=number may hand back a number
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
    const fields = (e as { fields?: Record<string, string> })?.fields || {}
    if (fields.user_id) formErr.user_id = fields.user_id
    if (fields.duration_hours) formErr.duration_hours = fields.duration_hours
    if (!fields.user_id && !fields.duration_hours) host.toast(errorMessage(e, t('loadFailed')), 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <p class="mod-hint">{{ t('blocks.hint') }}</p>

    <SCard v-if="manage" :title="t('blocks.manual')" class="mod-section-b">
      <form class="mod-block-form" @submit.prevent="submit">
        <label class="mod-filter">
          <span class="input-label">{{ t('blocks.userId') }}<span class="mod-req">*</span></span>
          <input v-model="form.user_id" class="input" :class="formErr.user_id ? 'input-error' : ''" inputmode="numeric" />
          <span v-if="formErr.user_id" class="input-error-text">{{ formErr.user_id }}</span>
        </label>
        <label class="mod-filter mod-filter-wide">
          <span class="input-label">{{ t('blocks.reason') }}</span>
          <input v-model="form.reason" class="input" maxlength="500" :placeholder="t('blocks.reasonPlaceholder')" />
        </label>
        <label class="mod-filter">
          <span class="input-label">{{ t('blocks.duration') }}</span>
          <input v-model="form.duration_hours" class="input" :class="formErr.duration_hours ? 'input-error' : ''" type="number" min="0" step="1" />
          <span v-if="formErr.duration_hours" class="input-error-text">{{ formErr.duration_hours }}</span>
          <span v-else class="input-hint">{{ t('blocks.durationHint') }}</span>
        </label>
        <div class="mod-filter-actions">
          <SButton type="submit" variant="danger" :loading="saving"><SIcon name="lock" class="mod-icon" />{{ t('blocks.submit') }}</SButton>
        </div>
      </form>
    </SCard>

    <p v-if="error" class="mod-alert mod-alert-danger">{{ error }}</p>

    <SCard :padded="false">
      <STable :columns="columns" :rows="rows" :loading="loading" row-key="user_id" :empty-text="t('blocks.empty')">
        <template #cell-user_id="{ row }"><span class="mod-num">#{{ row.user_id }}</span></template>
        <template #cell-reason="{ row }"><span class="mod-ellipsis mod-w-reason" :title="row.reason">{{ row.reason || '—' }}</span></template>
        <template #cell-violations="{ row }"><span class="mod-num">{{ row.violations ?? '—' }}</span></template>
        <template #cell-source="{ row }">
          <SBadge :tone="row.source === 'manual' ? 'purple' : 'warning'">{{ enumLabel('source', row.source) }}</SBadge>
        </template>
        <template #cell-created_at="{ row }"><span class="mod-nowrap">{{ host.i18n.formatDateTime(row.created_at) }}</span></template>
        <template #cell-expires_at="{ row }">
          <span v-if="row.expires_at" class="mod-nowrap">{{ host.i18n.formatDateTime(row.expires_at) }}</span>
          <SBadge v-else tone="danger">{{ t('blocks.forever') }}</SBadge>
        </template>
        <template #cell-actions="{ row }">
          <SButton size="sm" :loading="busy === row.user_id" @click="unblock(row)">{{ t('blocks.unblock') }}</SButton>
        </template>
      </STable>
    </SCard>
  </div>
</template>
