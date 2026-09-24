<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SEmpty, SIcon, SPageHeader, SSelect, STable, toast, type TableColumn, type Tone } from '@sub2api/ui'
import type { PluginReview, PluginSummary } from '@/api/types'
import { lt } from '@/i18n'
import { notifyError } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import { consentPath, putReview } from './reviewCache'
import PluginAvatar from './parts/PluginAvatar.vue'
import StatusBadge from './parts/StatusBadge.vue'
import TrustBadge from './parts/TrustBadge.vue'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const items = ref<PluginSummary[]>([])
const loading = ref(false)
const q = ref('')
const status = ref<string | null>(null)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()

const STATUSES = ['awaiting_consent', 'installed', 'enabling', 'enabled', 'upgrading', 'disabled']
const statusOptions = computed(() => STATUSES.map((s) => ({ value: s, label: t(`plugins.status.${s}`) })))

const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('plugins.list.plugin') },
  { key: 'status', label: t('common.status') },
  { key: 'version', label: t('common.version') },
  { key: 'publisher', label: t('plugins.publisher') },
  { key: 'nodes', label: t('plugins.list.nodes') },
  { key: 'actions', label: '', align: 'right' }
])

const rows = computed(() => {
  const kw = q.value.trim().toLowerCase()
  return items.value.filter((p) => {
    if (status.value && p.status !== status.value) return false
    if (!kw) return true
    return p.key.toLowerCase().includes(kw) || lt(p.name).toLowerCase().includes(kw) || (p.publisher || '').toLowerCase().includes(kw)
  })
})

async function load() {
  loading.value = true
  try {
    const r = await api.list<PluginSummary>('/plugins', { page_size: 200 })
    items.value = r.items
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}

/** Node summary: {state: count} or [{node_id, state}] -> [{state, count}]. */
function nodeSummary(p: PluginSummary): Array<{ state: string; count: number }> {
  const n = p.nodes
  if (!n) return []
  const counts: Record<string, number> = {}
  if (Array.isArray(n)) {
    for (const x of n) {
      const s = typeof x === 'object' && x ? String((x as any).state ?? 'unknown') : String(x)
      counts[s] = (counts[s] || 0) + 1
    }
  } else if (typeof n === 'object') {
    for (const [k, v] of Object.entries(n)) counts[k] = Number(v) || 0
  }
  return Object.entries(counts).map(([state, count]) => ({ state, count }))
}

function nodeTone(s: string): Tone {
  return s === 'running' || s === 'active' || s === 'ready' || s === 'healthy' ? 'success' : s === 'failed' || s === 'crashed' || s === 'unavailable' ? 'danger' : 'gray'
}

function open(p: PluginSummary) {
  router.push(`/plugins/${encodeURIComponent(p.key)}`)
}

function review(p: PluginSummary) {
  const v = p.desired_version || p.active_version
  if (v) router.push(consentPath(p.key, v))
}

function pickFile() {
  fileInput.value?.click()
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!/\.s2plugin$/i.test(file.name)) {
    toast(t('plugins.list.badFile'), 'error')
    return
  }
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const r = await api.upload<PluginReview>('/plugins/upload', fd)
    putReview(r)
    toast(t('plugins.list.uploaded', { name: lt(r.name) || r.plugin_key, version: r.version }), 'success')
    router.push(consentPath(r.plugin_key, r.version))
  } catch (err) {
    notifyError(err)
  } finally {
    uploading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <SPageHeader :title="t('plugins.list.title')" :description="t('plugins.list.description')">
      <template #actions>
        <SButton :loading="loading" @click="load"><SIcon name="refresh" class="h-4 w-4" />{{ t('common.refresh') }}</SButton>
        <RouterLink v-if="auth.has('plugin:market:read')" to="/market" class="btn btn-secondary btn-md">
          <SIcon name="market" class="h-4 w-4" />{{ t('plugins.market.title') }}
        </RouterLink>
        <SButton v-if="auth.has('plugin:install')" variant="primary" :loading="uploading" @click="pickFile">
          <SIcon name="upload" class="h-4 w-4" />{{ t('plugins.list.upload') }}
        </SButton>
        <input ref="fileInput" type="file" accept=".s2plugin" class="hidden" @change="onFile" />
      </template>
      <template #filters>
        <input v-model="q" class="input w-64" :placeholder="t('plugins.list.searchPlaceholder')" />
        <div class="w-48">
          <SSelect v-model="status" :options="statusOptions" :placeholder="t('plugins.list.allStatuses')" />
        </div>
      </template>
    </SPageHeader>

    <STable :columns="columns" :rows="rows" :loading="loading" row-key="key" class="cursor-pointer" @row-click="open">
      <template #empty>
        <SEmpty icon="plugin" :text="t('plugins.list.empty')" />
      </template>
      <template #cell-name="{ row }">
        <div class="flex items-center gap-3">
          <PluginAvatar :name="lt(row.name)" :plugin-key="row.key" :icon="(row as any).icon" />
          <div class="min-w-0">
            <div class="truncate font-medium text-gray-900 dark:text-white">{{ lt(row.name) || row.key }}</div>
            <div class="truncate font-mono text-xs muted">{{ row.key }}</div>
          </div>
        </div>
      </template>
      <template #cell-status="{ row }">
        <div class="flex flex-col items-start gap-0.5">
          <StatusBadge :status="row.status" />
          <span v-if="row.status_reason" class="max-w-[16rem] truncate text-xs text-red-500" :title="row.status_reason">{{ row.status_reason }}</span>
        </div>
      </template>
      <template #cell-version="{ row }">
        <span class="font-mono text-sm">{{ row.active_version ? 'v' + row.active_version : '—' }}</span>
        <span
          v-if="row.desired_version && row.desired_version !== row.active_version"
          class="ml-1 font-mono text-xs text-primary-600 dark:text-primary-400"
          :title="t('plugins.desiredVersion')"
          >→ v{{ row.desired_version }}</span
        >
      </template>
      <template #cell-publisher="{ row }">
        <div class="flex items-center gap-2">
          <span class="text-sm">{{ row.publisher || '—' }}</span>
          <TrustBadge :trust="row.trust" />
        </div>
      </template>
      <template #cell-nodes="{ row }">
        <div class="flex flex-wrap gap-1">
          <SBadge v-for="n in nodeSummary(row)" :key="n.state" :tone="nodeTone(n.state)">{{ n.state }} × {{ n.count }}</SBadge>
          <span v-if="nodeSummary(row).length === 0" class="muted">—</span>
        </div>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-2" @click.stop>
          <SButton v-if="row.status === 'awaiting_consent' && auth.has('plugin:install')" size="sm" variant="primary" @click="review(row)">
            <SIcon name="shield" class="h-4 w-4" />{{ t('plugins.list.review') }}
          </SButton>
          <SButton size="sm" variant="ghost" @click="open(row)">{{ t('common.detail') }}</SButton>
        </div>
      </template>
    </STable>
  </div>
</template>
