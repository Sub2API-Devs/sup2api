<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SField, SHint, SInput, SModal, SSelect, SSwitch, STable, type TableColumn } from '@sub2api/ui'
import { canManage, deleteChannel, enumLabel, errorMessage, fetchChannels, saveChannel, testChannel, useModHost, type Channel, type ChannelType } from './host'

// Channels (CONTRACTS §72.6): the upstreams auditors call. Keys are sealed
// with the host key and never shown again; only the last 4 characters.
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

const rows = ref<Channel[]>([])
const loading = ref(false)
const error = ref('')

async function reload() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await fetchChannels()
  } catch (e) {
    error.value = errorMessage(e, t('channels.loadFailed'))
  } finally {
    loading.value = false
  }
}
onMounted(reload)
defineExpose({ reload })

const columns = computed<TableColumn[]>(() => {
  const c: TableColumn[] = [
    { key: 'name', label: t('channels.col.name'), nowrap: true },
    { key: 'type', label: t('channels.col.type'), nowrap: true },
    { key: 'base_url', label: t('channels.col.baseUrl'), ellipsis: '18rem' },
    { key: 'model', label: t('channels.col.model'), ellipsis: '12rem' },
    { key: 'key', label: t('channels.col.key'), nowrap: true },
    { key: 'timeout_ms', label: t('channels.col.timeout'), align: 'right', nowrap: true },
    { key: 'enabled', label: t('channels.col.enabled'), nowrap: true }
  ]
  if (manage.value) c.push({ key: 'actions', label: '', align: 'right' })
  return c
})

const typeOptions = computed(() => (['openai_moderation', 'typesafe', 'llm'] as ChannelType[]).map((v) => ({ value: v, label: t(`channelType.${v}`) })))
const defaultTimeout: Record<ChannelType, number> = { openai_moderation: 3000, typesafe: 8000, llm: 15000 }
const defaultModel: Record<ChannelType, string> = { openai_moderation: 'omni-moderation-latest', typesafe: 'jev-latest', llm: '' }

const editOpen = ref(false)
const editing = ref<Channel | null>(null)
const form = reactive({ type: 'openai_moderation' as ChannelType, name: '', base_url: '', api_key: '', model: '', timeout_ms: 3000 as number | null, enabled: true })
const formErr = reactive<Record<string, string>>({})
const saving = ref(false)

function openEdit(c: Channel | null) {
  editing.value = c
  for (const k of Object.keys(formErr)) delete formErr[k]
  if (c) Object.assign(form, { type: c.type, name: c.name, base_url: c.base_url, api_key: '', model: c.model, timeout_ms: c.timeout_ms, enabled: c.enabled })
  else Object.assign(form, { type: 'openai_moderation', name: '', base_url: '', api_key: '', model: '', timeout_ms: null, enabled: true })
  editOpen.value = true
}

async function save() {
  for (const k of Object.keys(formErr)) delete formErr[k]
  saving.value = true
  try {
    const body: Record<string, unknown> = {
      type: form.type,
      name: form.name,
      base_url: form.base_url,
      model: form.model,
      timeout_ms: form.timeout_ms ? Number(form.timeout_ms) : 0,
      enabled: form.enabled
    }
    if (form.api_key.trim()) body.api_key = form.api_key.trim()
    await saveChannel(editing.value?.id ?? null, body)
    host.toast(t('saved'), 'success')
    editOpen.value = false
    reload()
  } catch (e) {
    const fields = isApiError(e) ? e.fields : {}
    Object.assign(formErr, fields)
    if (!Object.keys(fields).length) host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    saving.value = false
  }
}

async function remove(c: Channel) {
  const ok = await host.confirm({ message: t('channels.deleteConfirm', { name: c.name }), danger: true, confirmText: t('delete') })
  if (!ok) return
  try {
    await deleteChannel(c.id)
    host.toast(t('deleted'), 'success')
    reload()
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  }
}

const testing = ref<number | null>(null)
async function test(c: Channel) {
  testing.value = c.id
  try {
    const r = await testChannel(c.id)
    if (r.ok) host.toast(t('channels.testOk', { ms: r.latency_ms, model: r.model || c.model }), 'success')
    else host.toast(t('channels.testFailed', { err: [enumLabel('err', r.error), r.status, r.message].filter(Boolean).join(' ') }), 'error')
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    testing.value = null
  }
}
</script>

<template>
  <div>
    <SHint class="mod-hint">{{ t('channels.hint') }}</SHint>
    <div v-if="manage" class="mod-toolbar">
      <SButton variant="primary" icon="plus" @click="openEdit(null)">{{ t('channels.add') }}</SButton>
    </div>
    <SAlert v-if="error" tone="danger" class="mod-block">{{ error }}</SAlert>

    <SCard :padded="false">
      <STable :columns="columns" :rows="rows" :loading="loading" :empty-text="t('channels.empty')" dense>
        <template #cell-name="{ row }">{{ row.name }} <span class="mod-sub mod-num">#{{ row.id }}</span></template>
        <template #cell-type="{ row }">{{ enumLabel('channelType', row.type) }}</template>
        <template #cell-base_url="{ row }"><code class="mod-code mod-code-plain">{{ row.base_url }}</code></template>
        <template #cell-key="{ row }">
          <code v-if="row.has_key" class="mod-code">…{{ row.api_key_tail || '****' }}</code>
          <SBadge v-else tone="warning">{{ t('channels.noKey') }}</SBadge>
        </template>
        <template #cell-timeout_ms="{ row }"><span class="mod-num">{{ t('ms', { n: host.i18n.formatNumber(row.timeout_ms) }) }}</span></template>
        <template #cell-enabled="{ row }">
          <SBadge :tone="row.enabled ? 'success' : 'gray'" dot>{{ row.enabled ? t('enabled') : t('disabled') }}</SBadge>
        </template>
        <template #cell-actions="{ row }">
          <SButton size="sm" variant="ghost" :loading="testing === row.id" @click="test(row)">{{ t('channels.test') }}</SButton>
          <SButton size="sm" variant="ghost" @click="openEdit(row)">{{ t('edit') }}</SButton>
          <SButton size="sm" variant="ghost" @click="remove(row)">{{ t('delete') }}</SButton>
        </template>
      </STable>
    </SCard>

    <SModal v-model:open="editOpen" :title="editing ? t('channels.editTitle', { name: editing.name }) : t('channels.add')" width="lg">
      <form class="mod-form" @submit.prevent="save">
        <SField :label="t('channels.col.type')" :error="formErr.type" :hint="editing ? t('channels.typeFixed') : t(`channelTypeHint.${form.type}`)">
          <SSelect v-model="form.type" :options="typeOptions" :disabled="!!editing" />
        </SField>
        <SField :label="t('channels.col.name')" required :error="formErr.name">
          <SInput v-model="form.name" :maxlength="64" />
        </SField>
        <SField :label="t('channels.col.baseUrl')" required :error="formErr.base_url" :hint="t('channels.baseUrlHint')">
          <SInput v-model="form.base_url" placeholder="https://api.openai.com" />
        </SField>
        <SField :label="t('channels.apiKey')" :error="formErr.api_key" :hint="editing?.has_key ? t('channels.keepKey', { tail: editing.api_key_tail }) : ''">
          <SInput v-model="form.api_key" type="password" autocomplete="off" />
        </SField>
        <SField :label="t('channels.col.model')" :error="formErr.model" :required="form.type === 'llm'">
          <SInput v-model="form.model" :placeholder="defaultModel[form.type] || 'gpt-4o-mini'" />
        </SField>
        <SField :label="t('channels.col.timeout')" :error="formErr.timeout_ms" :hint="t('channels.timeoutHint', { n: defaultTimeout[form.type] })">
          <SInput v-model="form.timeout_ms" type="number" min="500" max="60000" step="100" :placeholder="String(defaultTimeout[form.type])" />
        </SField>
        <SField :label="t('channels.col.enabled')">
          <SSwitch v-model="form.enabled" />
        </SField>
      </form>
      <template #footer>
        <SButton @click="editOpen = false">{{ host.i18n.t('ui.cancel') }}</SButton>
        <SButton variant="primary" :loading="saving" @click="save">{{ t('save') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
