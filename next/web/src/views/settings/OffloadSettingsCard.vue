<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isApiError } from '@sub2api/host'
import { SBadge, SButton, SCard, SField, SGrid, SHint, SInput, SSpinner, SSwitch, STable, toast, type TableColumn } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { fieldErrors, notifyError } from '@/utils/errors'

// CPU offload of the shell-managed cluster (GET/PUT /system/offload, served
// by the local shell). Unmanaged single nodes have no such setting.
interface NodeLoad { node_id: string; mode: string; ready: boolean; enabled: boolean; cpu_percent: number | null; offloading: boolean }
interface OffloadState { enabled: boolean; cpu_threshold_percent: number; nodes: NodeLoad[] }

const MIN = 50
const MAX = 95
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('settings:manage'))

const loading = ref(true)
const saving = ref(false)
const unmanaged = ref(false)
const loaded = ref<{ enabled: boolean; cpu_threshold_percent: number } | null>(null)
const form = reactive({ enabled: false, cpu_threshold_percent: 80 as number | string })
const nodes = ref<NodeLoad[]>([])
const errors = ref<Record<string, string>>({})
let timer: ReturnType<typeof setInterval> | undefined

const dirty = computed(() => !!loaded.value && (form.enabled !== loaded.value.enabled || String(form.cpu_threshold_percent) !== String(loaded.value.cpu_threshold_percent)))
const columns = computed<TableColumn[]>(() => [
  { key: 'node_id', label: t('settings.offload.node') },
  { key: 'cpu_percent', label: t('settings.offload.cpu') },
  { key: 'state', label: t('settings.offload.state') }
])

function apply(r: OffloadState, withForm = true) {
  nodes.value = r.nodes || []
  if (!withForm) return
  loaded.value = { enabled: !!r.enabled, cpu_threshold_percent: Number(r.cpu_threshold_percent) }
  Object.assign(form, loaded.value)
}

async function load(initial = false) {
  try {
    const r = await api.get<OffloadState>('/system/offload')
    // Background refreshes only update the node loads, never an edited form.
    apply(r, initial || !dirty.value)
    unmanaged.value = false
  } catch (e) {
    if (isApiError(e) && e.code === 'updater_unavailable') unmanaged.value = true
    else if (initial) notifyError(e)
  } finally {
    loading.value = false
  }
}

async function save() {
  const n = Number(String(form.cpu_threshold_percent).trim())
  errors.value = Number.isInteger(n) && n >= MIN && n <= MAX ? {} : { cpu_threshold_percent: t('settings.offload.range', { min: MIN, max: MAX }) }
  if (Object.keys(errors.value).length) return
  saving.value = true
  try {
    apply(await api.put<OffloadState>('/system/offload', { enabled: form.enabled, cpu_threshold_percent: n }))
    toast(t('common.saved'), 'success')
  } catch (e) {
    const fe = fieldErrors(e)
    errors.value = fe
    if (!Object.keys(fe).length) notifyError(e)
  } finally {
    saving.value = false
  }
}

function stateOf(n: NodeLoad): { tone: 'success' | 'warning' | 'gray'; label: string } {
  if (!n.enabled) return { tone: 'gray', label: t('settings.offload.states.disabled') }
  if (n.offloading) return { tone: 'warning', label: t('settings.offload.states.offloading') }
  if (n.mode === 'local' && n.ready) return { tone: 'success', label: t('settings.offload.states.serving') }
  if (n.mode === 'forward') return { tone: 'gray', label: t('settings.offload.states.forwarding') }
  return { tone: 'gray', label: t('settings.offload.states.unavailable') }
}

onMounted(() => {
  load(true)
  timer = setInterval(() => load(), 5000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <SCard :title="t('settings.offload.title')" :subtitle="t('settings.offload.subtitle')" data-testid="offload-settings">
    <div v-if="loading" class="py-6 text-center"><SSpinner /></div>
    <SHint v-else-if="unmanaged">{{ t('settings.offload.unmanaged') }}</SHint>
    <div v-else class="space-y-4">
      <SGrid :cols="1" :md-cols="2">
        <SField :label="t('settings.offload.enabled')" :hint="t('settings.offload.enabledHint')">
          <div class="pt-2"><SSwitch v-model="form.enabled" :disabled="!canManage" /></div>
        </SField>
        <SField :label="t('settings.offload.threshold')" :hint="t('settings.offload.thresholdHint') + ' ' + t('settings.offload.range', { min: MIN, max: MAX })" :error="errors.cpu_threshold_percent">
          <div class="flex items-center gap-2">
            <SInput v-model="form.cpu_threshold_percent" type="number" step="1" :min="MIN" :max="MAX" name="cpu_threshold_percent" :disabled="!canManage" />
            <SHint inline>%</SHint>
          </div>
        </SField>
      </SGrid>
      <div v-if="canManage" class="flex justify-end gap-2">
        <SButton v-if="dirty" size="sm" @click="loaded && Object.assign(form, loaded)">{{ t('common.reset') }}</SButton>
        <SButton size="sm" variant="primary" :loading="saving" :disabled="!dirty" @click="save">{{ t('common.save') }}</SButton>
      </div>
      <STable :columns="columns" :rows="nodes" row-key="node_id">
        <template #cell-cpu_percent="{ row }">{{ row.cpu_percent == null ? '—' : `${Math.round(row.cpu_percent)}%` }}</template>
        <template #cell-state="{ row }"><SBadge :tone="stateOf(row).tone">{{ stateOf(row).label }}</SBadge></template>
      </STable>
    </div>
  </SCard>
</template>
