<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SField, SHint, SInput, SModal, SSelect, SSwitch, STable, type TableColumn } from '@sub2api/ui'
import EnabledBadge from './EnabledBadge.vue'
import RateCell from './RateCell.vue'
import { num } from './format'
import { callCostText, canManage, deleteChannel, enumLabel, errorMessage, fetchChannels, money, saveChannel, testChannel, useModHost, type Channel, type ChannelType, type Protocol } from './host'

// Channels (CONTRACTS §72.6, new-api channels): the upstreams auditors call,
// with the auditors using each one, last-hour health and today's cost. Keys
// and proxies are sealed with the host key; only the key's last 4 characters
// and the proxy without its password are shown.
defineProps<{ alertPercent: number }>()
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
    { key: 'base_url', label: t('channels.col.baseUrl'), ellipsis: '13rem' },
    { key: 'model', label: t('channels.col.model'), ellipsis: '10rem' },
    { key: 'used_by', label: t('channels.col.usedBy') },
    { key: 'hour', label: t('channels.col.hour'), align: 'right', nowrap: true },
    { key: 'today', label: t('channels.col.today'), align: 'right', nowrap: true },
    { key: 'price', label: t('channels.col.price') },
    { key: 'enabled', label: t('channels.col.enabled'), nowrap: true }
  ]
  if (manage.value) c.push({ key: 'actions', label: '', align: 'right' })
  return c
})

/** Today's cost by source as "审核 $0.01 · AI 分析 $0.02" (sources with calls only). */
function todaySources(c: Channel): string {
  return Object.entries(c.stats?.cost_today_sources || {})
    .filter(([, s]) => s.calls > 0)
    .map(([k, s]) => `${enumLabel('costSource', k)} ${money(s.cost)}`)
    .join(' · ')
}

const typeOptions = computed(() => (['openai_moderation', 'typesafe', 'llm'] as ChannelType[]).map((v) => ({ value: v, label: t(`channelType.${v}`) })))
const protocols: Protocol[] = ['openai_chat', 'openai_responses', 'anthropic']
const protocolOptions = computed(() => protocols.map((v) => ({ value: v, label: t(`protocol.${v}`) })))
const defaultTimeout: Record<ChannelType, number> = { openai_moderation: 3000, typesafe: 8000, llm: 15000 }
const defaultModel: Record<ChannelType, string> = { openai_moderation: 'omni-moderation-latest', typesafe: 'jev-latest', llm: '' }

/** Price column: priced / free / not priced (with the reason as a tooltip and sub line). */
function priceState(c: Channel): { tone: 'success' | 'info' | 'warning' | 'gray'; label: string; sub: string } | null {
  const p = c.price_state
  if (!p) return null
  const model = p.billing_model || c.billing_model || c.model
  if (p.free) return { tone: 'info', label: t('channels.free'), sub: '' }
  if (p.priced) return { tone: 'success', label: t('channels.priced'), sub: c.billing_model ? t('channels.pricedAs', { model }) : '' }
  return { tone: 'warning', label: t('channels.unpriced'), sub: p.reason ? enumLabel('priceReason', p.reason) : '' }
}

const editOpen = ref(false)
const editing = ref<Channel | null>(null)
const form = reactive({
  type: 'openai_moderation' as ChannelType,
  protocol: 'openai_chat' as Protocol,
  name: '',
  base_url: '',
  api_key: '',
  model: '',
  billing_model: '',
  timeout_ms: 3000 as number | null,
  enabled: true,
  proxy: ''
})
const formErr = reactive<Record<string, string>>({})
const saving = ref(false)

function openEdit(c: Channel | null) {
  editing.value = c
  for (const k of Object.keys(formErr)) delete formErr[k]
  if (c)
    Object.assign(form, {
      type: c.type,
      protocol: (protocols as string[]).includes(c.protocol) ? c.protocol : 'openai_chat',
      name: c.name,
      base_url: c.base_url,
      api_key: '',
      model: c.model,
      billing_model: c.billing_model || '',
      timeout_ms: c.timeout_ms,
      enabled: c.enabled,
      proxy: c.proxy || ''
    })
  else Object.assign(form, { type: 'openai_moderation', protocol: 'openai_chat', name: '', base_url: '', api_key: '', model: '', billing_model: '', timeout_ms: null, enabled: true, proxy: '' })
  editOpen.value = true
}

async function save() {
  for (const k of Object.keys(formErr)) delete formErr[k]
  saving.value = true
  try {
    const body = channelBody({ ...form, timeout_ms: form.timeout_ms ? Number(form.timeout_ms) : 0, billing_model: form.billing_model.trim() })
    if (form.api_key.trim()) body.api_key = form.api_key.trim()
    // proxy: sent only when changed ('' removes it); the shown value has its password redacted.
    if (form.proxy.trim() !== (editing.value?.proxy || '')) body.proxy = form.proxy.trim()
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

/** PUT / POST body of a channel; the key and proxy are kept unless set by the caller. */
function channelBody(c: Pick<Channel, 'type' | 'protocol' | 'name' | 'base_url' | 'model' | 'timeout_ms' | 'enabled'> & { billing_model?: string }): Record<string, unknown> {
  const body: Record<string, unknown> = { type: c.type, name: c.name, base_url: c.base_url, model: c.model, billing_model: c.billing_model || '', timeout_ms: c.timeout_ms, enabled: c.enabled }
  if (c.type === 'llm') body.protocol = c.protocol
  return body
}

// Inline enable / disable (new-api channel-row-actions), confirmed first.
const toggling = ref<number | null>(null)
async function setEnabled(c: Channel, enabled: boolean) {
  const ok = await host.confirm({ message: t(enabled ? 'channels.enableConfirm' : 'channels.disableConfirm', { name: c.name }), danger: !enabled })
  if (!ok) return
  toggling.value = c.id
  try {
    await saveChannel(c.id, channelBody({ ...c, enabled }))
    c.enabled = enabled
    host.toast(t('saved'), 'success')
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    toggling.value = null
  }
}

/** Why a channel cannot be deleted: the analysis channel, or the auditors using it. */
function deleteError(e: unknown): string {
  if (!isApiError(e) || e.status !== 409) return errorMessage(e, t('actionFailed'))
  if (e.code === 'analysis_channel') return t('channels.isAnalysis')
  const names = ((e.details?.auditors || []) as Array<{ id: number; name: string }>).map((a) => a.name || `#${a.id}`)
  return names.length ? t('channels.inUse', { names: names.join('、') }) : errorMessage(e, t('actionFailed'))
}

async function remove(c: Channel) {
  const ok = await host.confirm({ message: t('channels.deleteConfirm', { name: c.name }), danger: true, confirmText: t('delete') })
  if (!ok) return
  try {
    await deleteChannel(c.id)
    host.toast(t('deleted'), 'success')
    reload()
  } catch (e) {
    host.toast(deleteError(e), 'error')
  }
}

const testing = ref<number | null>(null)
async function test(c: Channel) {
  testing.value = c.id
  try {
    const r = await testChannel(c.id)
    const url = r.url ? ` · ${r.url}` : ''
    if (r.ok) {
      const msg = t('channels.testOk', { ms: r.latency_ms, model: r.model || c.model })
      host.toast((r.cost !== undefined ? t('channels.testCost', { msg, cost: callCostText(r.cost).text }) : msg) + url, 'success')
      if (r.cost?.mode === 'priced') reload()
    } else host.toast(t('channels.testFailed', { err: [enumLabel('err', r.error), r.status, r.message].filter(Boolean).join(' ') }) + url, 'error')
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
        <template #cell-name="{ row }">
          {{ row.name }} <span class="mod-sub mod-num">#{{ row.id }}</span>
          <SBadge v-if="row.analysis" tone="purple" size="xs" class="mod-ml">{{ t('channels.analysis') }}</SBadge>
          <div class="mod-sub">
            <template v-if="row.has_key">{{ t('channels.col.key') }} <code class="mod-code mod-code-plain">…{{ row.api_key_tail || '****' }}</code></template>
            <SBadge v-else size="xs" tone="warning">{{ t('channels.noKey') }}</SBadge>
          </div>
        </template>
        <template #cell-type="{ row }">
          {{ enumLabel('channelType', row.type) }}
          <div v-if="row.type === 'llm' && row.protocol" class="mod-sub">{{ enumLabel('protocol', row.protocol) }}</div>
        </template>
        <template #cell-base_url="{ row }">
          <code class="mod-code mod-code-plain" :title="row.base_url">{{ row.base_url }}</code>
          <div class="mod-sub mod-num">
            {{ t('channels.col.timeout') }} {{ t('ms', { n: num(row.timeout_ms) }) }}<template v-if="row.has_proxy"> · {{ t('channels.viaProxy') }}</template>
          </div>
        </template>
        <template #cell-used_by="{ row }">
          <span v-if="row.used_by?.length" class="mod-chips mod-chips-wrap">
            <SBadge v-for="a in row.used_by" :key="a.id" size="xs">{{ a.name || `#${a.id}` }}</SBadge>
          </span>
          <SHint v-else inline>{{ row.analysis ? '—' : t('channels.unused') }}</SHint>
        </template>
        <template #cell-hour="{ row }">
          <template v-if="row.stats">
            <span class="mod-num">{{ t('channels.callsN', { n: num(row.stats.calls_1h) }) }}</span>
            <div class="mod-sub">{{ t('stats.errorRate') }} <RateCell :rate="row.stats.error_rate_1h" :alert-percent="alertPercent" /></div>
          </template>
          <SHint v-else inline>—</SHint>
        </template>
        <template #cell-today="{ row }">
          <template v-if="row.stats">
            <span class="mod-num" :title="todaySources(row)">{{ money(row.stats.cost_today.cost) }}</span>
            <div class="mod-sub mod-num">{{ t('channels.tokensN', { n: num(row.stats.tokens_today) }) }}</div>
            <div v-if="todaySources(row)" class="mod-sub">{{ todaySources(row) }}</div>
          </template>
          <SHint v-else inline>—</SHint>
        </template>
        <template #cell-model="{ row }">
          <span :title="row.model">{{ row.model || '—' }}</span>
          <div v-if="row.billing_model" class="mod-sub" :title="t('channels.billingModel')">{{ t('channels.pricedAs', { model: row.billing_model }) }}</div>
        </template>
        <template #cell-price="{ row }">
          <template v-if="priceState(row)">
            <SBadge :tone="priceState(row)!.tone" :title="priceState(row)!.sub">{{ priceState(row)!.label }}</SBadge>
            <div v-if="priceState(row)!.sub && !row.price_state?.priced" class="mod-sub mod-price-reason">{{ priceState(row)!.sub }}</div>
          </template>
          <SHint v-else inline>—</SHint>
        </template>
        <template #cell-enabled="{ row }">
          <SSwitch v-if="manage" :model-value="row.enabled" :disabled="toggling === row.id" :aria-label="t('channels.col.enabled')" @update:model-value="setEnabled(row, $event)" />
          <EnabledBadge v-else :enabled="row.enabled" />
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
        <SField v-if="form.type === 'llm'" :label="t('channels.protocol')" :error="formErr.protocol" :hint="t('channels.protocolHint')">
          <SSelect v-model="form.protocol" :options="protocolOptions" />
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
        <SField v-if="form.type !== 'openai_moderation'" :label="t('channels.billingModel')" :error="formErr.billing_model" :hint="t('channels.billingModelHint')">
          <SInput v-model="form.billing_model" :maxlength="128" :placeholder="form.model || defaultModel[form.type] || ''" />
        </SField>
        <SField :label="t('channels.col.timeout')" :error="formErr.timeout_ms" :hint="t('channels.timeoutHint', { n: defaultTimeout[form.type] })">
          <SInput v-model="form.timeout_ms" type="number" min="500" max="60000" step="100" :placeholder="String(defaultTimeout[form.type])" />
        </SField>
        <SField :label="t('channels.proxy')" :error="formErr.proxy" :hint="editing?.has_key ? t('channels.proxyKeyHint') : t('channels.proxyHint')">
          <SInput v-model="form.proxy" autocomplete="off" placeholder="socks5://user:pass@host:1080" />
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
