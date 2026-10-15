<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isApiError } from '@sub2api/host'
import { SAlert, SBadge, SInput, SSectionTitle, SSettingRow, SSettingsGroup, SSpinner, SSwitch, STable, type TableColumn, type Tone } from '@sub2api/ui'
import SettingsSaveBar from '@/components/SettingsSaveBar.vue'
import { useSettingsForm } from '@/composables/useSettingsForm'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'

// CPU offload of the shell-managed cluster (GET/PUT /system/offload, served
// by the local shell). Unmanaged single nodes have no such setting.
interface NodeLoad { node_id: string; mode: string; ready: boolean; enabled: boolean; cpu_percent: number | null; offloading: boolean }
interface Offload { enabled: boolean; cpu_threshold_percent: number }
interface Form { enabled: boolean; cpu_threshold_percent: number | null }

const MIN = 50
const MAX = 95
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('settings:manage'))

const first = ref(true)
const unmanaged = ref(false)
const nodes = ref<NodeLoad[]>([])
let timer: ReturnType<typeof setInterval> | undefined

const { form, saving, dirty, errors, save, reset, apply } = useSettingsForm<Form, Offload>({
  path: '/system/offload',
  defaults: { enabled: false, cpu_threshold_percent: 80 },
  fromServer: (r) => ({ enabled: !!r.enabled, cpu_threshold_percent: Number(r.cpu_threshold_percent) }),
  toBody: (f, errs) => {
    const n = f.cpu_threshold_percent ?? NaN
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
    const r = await api.get<Offload & { nodes?: NodeLoad[] }>('/system/offload')
    // Background refreshes only update the node loads, never an edited form.
    if (initial || !dirty.value) apply(r)
    nodes.value = r.nodes || []
    unmanaged.value = false
  } catch (e) {
    if (isApiError(e) && e.code === 'updater_unavailable') unmanaged.value = true
    else if (initial) notifyError(e)
  } finally {
    first.value = false
  }
}

async function submit() {
  // The answer carries no fresh node states; refresh them right away.
  if (await save()) void load()
}

const STATE_TONE: Record<string, Tone> = { offloading: 'warning', serving: 'success' }
function stateOf(n: NodeLoad): string {
  if (!n.enabled) return 'disabled'
  if (n.offloading) return 'offloading'
  if (n.mode === 'local' && n.ready) return 'serving'
  return n.mode === 'forward' ? 'forwarding' : 'unavailable'
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
        <SettingsSaveBar :dirty="dirty" :saving="saving" :can-manage="canManage" @save="submit" @reset="reset" />
      </template>
      <SSpinner v-if="first" block />
      <SAlert v-else-if="unmanaged" tone="neutral" class="my-4">{{ t('settings.offload.unmanaged') }}</SAlert>
      <template v-else>
        <SSettingRow :label="t('settings.offload.enabled')" :description="t('settings.offload.enabledHint')">
          <SSwitch v-model="form.enabled" :disabled="!canManage" :aria-label="t('settings.offload.enabled')" />
        </SSettingRow>
        <SSettingRow :label="t('settings.offload.threshold')" :description="t('settings.offload.range', { min: MIN, max: MAX })" :error="errors.cpu_threshold_percent">
          <template #details>{{ t('settings.offload.thresholdHint') }}</template>
          <SInput v-model="form.cpu_threshold_percent" type="number" step="1" :min="MIN" :max="MAX" suffix="%" name="cpu_threshold_percent" class="w-full sm:w-40" :disabled="!canManage" />
        </SSettingRow>
      </template>
    </SSettingsGroup>
    <STable v-if="!first && !unmanaged" card :columns="columns" :rows="nodes" row-key="node_id" data-testid="offload-nodes">
      <template #toolbar><SSectionTitle tag="h3" class="mb-0" :title="t('settings.offload.nodesTitle')" /></template>
      <template #cell-cpu_percent="{ row }">{{ row.cpu_percent == null ? '—' : `${Math.round(row.cpu_percent)}%` }}</template>
      <template #cell-state="{ row }"><SBadge :tone="STATE_TONE[stateOf(row)] ?? 'gray'">{{ t(`settings.offload.states.${stateOf(row)}`) }}</SBadge></template>
    </STable>
  </div>
</template>
