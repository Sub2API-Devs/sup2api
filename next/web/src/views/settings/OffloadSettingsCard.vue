<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isApiError } from '@sub2api/host'
import { SAlert, SBadge, SField, SHint, SInput, SSectionTitle, SSettingRow, SSettingsGroup, SSpinner, SSwitch, STable, type TableColumn } from '@sub2api/ui'
import SettingsSaveBar from '@/components/SettingsSaveBar.vue'
import { useSettingsForm } from '@/composables/useSettingsForm'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'

// CPU offload of the shell-managed cluster (GET/PUT /system/offload, served
// by the local shell). Unmanaged single nodes have no such setting.
interface NodeLoad { node_id: string; mode: string; ready: boolean; enabled: boolean; cpu_percent: number | null; offloading: boolean }
interface OffloadState { enabled: boolean; cpu_threshold_percent: number; nodes?: NodeLoad[] }
interface Form { enabled: boolean; cpu_threshold_percent: number | string | null }

const MIN = 50
const MAX = 95
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('settings:manage'))

const first = ref(true)
const unmanaged = ref(false)
const nodes = ref<NodeLoad[]>([])
let timer: ReturnType<typeof setInterval> | undefined

const { form, saving, dirty, errors, save, reset, apply } = useSettingsForm<Form, { enabled: boolean; cpu_threshold_percent: number }>({
  path: '/system/offload',
  defaults: { enabled: false, cpu_threshold_percent: 80 },
  fromServer: (r: OffloadState) => ({ enabled: !!r.enabled, cpu_threshold_percent: Number(r.cpu_threshold_percent) }),
  onApply: (r: OffloadState) => {
    if (r?.nodes) nodes.value = r.nodes
  },
  toBody: (f, errs) => {
    const n = Number(String(f.cpu_threshold_percent ?? '').trim())
    if (!Number.isInteger(n) || n < MIN || n > MAX) errs.cpu_threshold_percent = t('settings.offload.range', { min: MIN, max: MAX })
    return { enabled: f.enabled, cpu_threshold_percent: n }
  }
})

const columns = computed<TableColumn[]>(() => [
  { key: 'node_id', label: t('settings.offload.node') },
  { key: 'cpu_percent', label: t('settings.offload.cpu') },
  { key: 'state', label: t('settings.offload.state') }
])

async function load(initial = false) {
  try {
    const r = await api.get<OffloadState>('/system/offload')
    // Background refreshes only update the node loads, never an edited form.
    if (initial || !dirty.value) apply(r)
    else nodes.value = r.nodes || []
    unmanaged.value = false
  } catch (e) {
    if (isApiError(e) && e.code === 'updater_unavailable') unmanaged.value = true
    else if (initial) notifyError(e)
  } finally {
    first.value = false
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
  <div class="space-y-5">
    <SSettingsGroup :title="t('settings.offload.title')" :description="t('settings.offload.subtitle')" data-testid="offload-settings">
      <template v-if="!first && !unmanaged" #actions>
        <SettingsSaveBar :dirty="dirty" :saving="saving" :can-manage="canManage" @save="save" @reset="reset" />
      </template>
      <div v-if="first" class="py-6 text-center"><SSpinner /></div>
      <SAlert v-else-if="unmanaged" tone="neutral" class="my-4">{{ t('settings.offload.unmanaged') }}</SAlert>
      <template v-else>
        <SSettingRow :label="t('settings.offload.enabled')" :description="t('settings.offload.enabledHint')" for="offload-enabled">
          <SSwitch id="offload-enabled" v-model="form.enabled" :disabled="!canManage" :aria-label="t('settings.offload.enabled')" />
        </SSettingRow>
        <SSettingRow :label="t('settings.offload.threshold')" :description="t('settings.offload.range', { min: MIN, max: MAX })" for="offload-threshold">
          <template #details>{{ t('settings.offload.thresholdHint') }}</template>
          <SField :error="errors.cpu_threshold_percent" class="w-full sm:w-40">
            <div class="flex items-center gap-2">
              <SInput
                id="offload-threshold"
                v-model="form.cpu_threshold_percent"
                type="number"
                step="1"
                :min="MIN"
                :max="MAX"
                name="cpu_threshold_percent"
                :error="!!errors.cpu_threshold_percent"
                :disabled="!canManage"
              />
              <SHint inline>%</SHint>
            </div>
          </SField>
        </SSettingRow>
      </template>
    </SSettingsGroup>
    <STable v-if="!first && !unmanaged" card :columns="columns" :rows="nodes" row-key="node_id" data-testid="offload-nodes">
      <template #toolbar><SSectionTitle tag="h3" class="!mb-0" :title="t('settings.offload.nodesTitle')" /></template>
      <template #cell-cpu_percent="{ row }">{{ row.cpu_percent == null ? '—' : `${Math.round(row.cpu_percent)}%` }}</template>
      <template #cell-state="{ row }"><SBadge :tone="stateOf(row).tone">{{ stateOf(row).label }}</SBadge></template>
    </STable>
  </div>
</template>
