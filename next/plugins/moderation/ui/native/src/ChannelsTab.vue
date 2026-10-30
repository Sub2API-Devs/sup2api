<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SHint, SSwitch, STable, type TableColumn } from '@sub2api/ui'
import ChannelEditModal from './ChannelEditModal.vue'
import EnabledBadge from './EnabledBadge.vue'
import PriceCell from './PriceCell.vue'
import RateCell from './RateCell.vue'
import { useCatalog } from './catalog'
import { ms, num } from './format'
import { callCostText, canManage, channelBody, deleteChannel, enumLabel, errorMessage, money, saveChannel, testChannel, useModHost, type Channel } from './host'

// Channels (CONTRACTS §72.6, new-api channels): the upstreams auditors call,
// with the auditors using each one, last-hour health and today's cost. Keys
// and proxies are sealed with the host key; only the key's last 4 characters
// and the proxy without its password are shown. Rows come from the shared
// catalog, refreshed after changes.
defineProps<{ alertPercent: number }>()
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

const catalog = useCatalog()
const rows = computed(() => catalog.state.channels)
const loading = computed(() => catalog.state.loading)
const error = computed(() => (catalog.state.errors.channels ? errorMessage(catalog.state.errors.channels, t('channels.loadFailed')) : ''))
const reload = () => catalog.refresh()
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

const editOpen = ref(false)
const editing = ref<Channel | null>(null)
function openEdit(c: Channel | null) {
  editing.value = c
  editOpen.value = true
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
    void catalog.refresh()
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
    void catalog.refresh()
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
      const msg = t('channels.testOk', { ms: num(r.latency_ms), model: r.model || c.model })
      host.toast((r.cost !== undefined ? t('channels.testCost', { msg, cost: callCostText(r.cost).text }) : msg) + url, 'success')
      if (r.cost?.mode === 'priced') void catalog.refresh()
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
            {{ t('channels.col.timeout') }} {{ ms(row.timeout_ms) }}<template v-if="row.has_proxy"> · {{ t('channels.viaProxy') }}</template>
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
        <template #cell-price="{ row }"><PriceCell :channel="row" /></template>
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

    <ChannelEditModal v-model:open="editOpen" :channel="editing" @saved="catalog.refresh()" />
  </div>
</template>
