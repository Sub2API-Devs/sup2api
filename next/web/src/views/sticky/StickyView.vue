<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SDropdown, SPageHeader, SSwitch, STable, confirm, toast, type MenuAction, type TableColumn } from '@sub2api/ui'
import type { StickyRule, StickyStats } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import { formatNumber } from '@/utils/format'
import StickyRuleModal from './StickyRuleModal.vue'
import StickySettingsCard from './StickySettingsCard.vue'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('sticky:manage'))

type Stats = StickyStats & { rule_id?: number }
type Row = StickyRule & { stats?: Stats }

const rules = ref<StickyRule[]>([])
const stats = ref<Stats[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const [r, s] = await Promise.all([
      api.list<StickyRule>('/sticky-rules', { page_size: 200 }),
      api.get<Stats[]>('/sticky-rules/stats').catch(() => [] as Stats[])
    ])
    rules.value = [...r.items].sort((a, b) => b.priority - a.priority || a.id - b.id)
    stats.value = Array.isArray(s) ? s : []
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

const rows = computed<Row[]>(() =>
  rules.value.map((r) => ({
    ...r,
    stats: stats.value.find((s) => s.rule_id === r.id || s.rule === r.name || s.rule === String(r.id))
  }))
)

const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('common.name') },
  { key: 'enabled', label: t('common.enabled'), width: '80px' },
  { key: 'priority', label: t('sticky.cols.priority'), align: 'right', width: '70px' },
  { key: 'match', label: t('sticky.cols.match') },
  { key: 'binding', label: t('sticky.cols.binding') },
  { key: 'stats', label: t('sticky.cols.stats'), width: '170px' },
  { key: 'actions', label: '', align: 'right', width: '60px' }
])

function list(v?: string[]) {
  return v && v.length ? v.join(', ') : t('sticky.any')
}

function sourcesSummary(r: StickyRule) {
  return (r.key_sources || [])
    .map((k) => {
      if (k.type === 'body') return `body:${k.path || ''}`
      if (k.type === 'header') return `header:${k.name || ''}`
      if (k.type === 'plugin') return k.needs?.length ? `plugin(${k.needs.join(',')})` : 'plugin'
      return k.type
    })
    .join(' → ')
}

function hitRate(s?: Stats) {
  if (!s) return null
  const total = (s.hits || 0) + (s.misses || 0)
  return total ? ((s.hits / total) * 100).toFixed(1) + '%' : '—'
}

function actions(r: Row): MenuAction[] {
  const admin = r.source === 'admin'
  return [
    { key: 'edit', label: t('common.edit') },
    { key: 'copy', label: t('sticky.copyAsAdmin'), hidden: admin },
    // Without "rule" in key_includes the bindings are shared; the server refuses to flush them.
    { key: 'flush', label: t('sticky.flush'), hidden: !(r.key_includes || []).includes('rule') },
    { key: 'delete', label: t('common.delete'), danger: true, hidden: !admin }
  ]
}

// ------------------------------------------------------------------ actions

const modalOpen = ref(false)
const editing = ref<StickyRule | null>(null)
const copying = ref(false)

function openCreate() {
  editing.value = null
  copying.value = false
  modalOpen.value = true
}

async function onAction(r: Row, key: string) {
  if (key === 'edit' || key === 'copy') {
    editing.value = r
    copying.value = key === 'copy'
    modalOpen.value = true
  } else if (key === 'flush') {
    if (!(await confirm({ message: t('sticky.flushConfirm', { name: r.name }), danger: true }))) return
    try {
      const res = await api.post<{ deleted?: number; flushed?: number } | null>(`/sticky-rules/${r.id}/flush`)
      const n = res?.deleted ?? res?.flushed
      toast(n !== undefined ? t('sticky.flushedN', { n }) : t('sticky.flushed'), 'success')
    } catch (e) {
      notifyError(e)
    }
  } else if (key === 'delete') {
    if (!(await confirm({ message: t('common.confirmDelete', { name: r.name }), danger: true }))) return
    try {
      await api.del(`/sticky-rules/${r.id}`)
      toast(t('common.deleted'), 'success')
      load()
    } catch (e) {
      notifyError(e)
    }
  }
}

async function toggle(r: Row, v: boolean) {
  const target = rules.value.find((x) => x.id === r.id)
  if (!target) return
  const prev = target.enabled
  target.enabled = v
  try {
    await api.patch(`/sticky-rules/${r.id}`, { enabled: v })
  } catch (e) {
    target.enabled = prev
    notifyError(e)
  }
}
</script>

<template>
  <div class="space-y-5">
    <SPageHeader :title="t('sticky.title')" :description="t('sticky.description')">
      <template #actions>
        <SButton @click="load">{{ t('common.refresh') }}</SButton>
        <SButton v-if="canManage" variant="primary" @click="openCreate">+ {{ t('sticky.newRule') }}</SButton>
      </template>
    </SPageHeader>

    <StickySettingsCard />

    <div class="card overflow-hidden">
      <STable :columns="columns" :rows="rows" :loading="loading">
        <template #cell-name="{ row }">
          <div class="font-mono text-sm">{{ row.name }}</div>
          <div class="mt-0.5 flex items-center gap-1">
            <SBadge :tone="row.source === 'admin' ? 'primary' : 'purple'">
              {{ t(`sticky.source.${row.source}`) }}
            </SBadge>
            <span v-if="row.plugin_key" class="muted text-xs">{{ row.plugin_key }}</span>
          </div>
        </template>
        <template #cell-enabled="{ row }">
          <SSwitch :model-value="row.enabled" :disabled="!canManage" @update:model-value="toggle(row, $event)" />
        </template>
        <template #cell-match="{ row }">
          <dl class="grid grid-cols-[max-content_1fr] gap-x-2 text-xs">
            <dt class="muted">{{ t('sticky.modal.protocols') }}</dt>
            <dd class="font-mono">{{ list(row.match?.protocols) }}</dd>
            <dt class="muted">{{ t('sticky.modal.models') }}</dt>
            <dd class="font-mono">{{ list(row.match?.models) }}</dd>
            <template v-if="row.match?.userAgentContains?.length">
              <dt class="muted">UA</dt>
              <dd class="font-mono">{{ list(row.match.userAgentContains) }}</dd>
            </template>
            <dt class="muted">{{ t('sticky.cols.keySources') }}</dt>
            <dd class="font-mono">{{ sourcesSummary(row) || '—' }}<span v-if="row.value_regex" class="muted"> /{{ row.value_regex }}/</span></dd>
          </dl>
        </template>
        <template #cell-binding="{ row }">
          <div class="text-xs">
            <div>{{ t('sticky.cols.ttl') }}: {{ row.ttl_seconds ? t('sticky.ttlValue', { n: formatNumber(row.ttl_seconds) }) : t('sticky.ttlDefault') }}</div>
            <div class="muted">{{ t('sticky.cols.keyIncludes') }}: {{ (row.key_includes || []).map((k) => t(`sticky.includes.${k}`)).join(' + ') || '—' }}</div>
            <SBadge class="mt-1" :tone="row.on_failure === 'stick' ? 'warning' : 'gray'">{{ t(`sticky.onFailure.${row.on_failure}`) }}</SBadge>
          </div>
        </template>
        <template #cell-stats="{ row }">
          <div v-if="row.stats" class="text-xs">
            <div class="font-semibold text-gray-900 dark:text-white">{{ hitRate(row.stats) }}</div>
            <div class="muted">
              {{ t('sticky.statsLine', { hits: formatNumber(row.stats.hits), misses: formatNumber(row.stats.misses), rebinds: formatNumber(row.stats.rebinds) }) }}
            </div>
          </div>
          <span v-else class="muted">—</span>
        </template>
        <template #cell-actions="{ row }">
          <SDropdown v-if="canManage" :actions="actions(row)" @select="onAction(row, $event)" />
        </template>
      </STable>
    </div>

    <StickyRuleModal v-model:open="modalOpen" :rule="editing" :copy="copying" @saved="load" />
  </div>
</template>
