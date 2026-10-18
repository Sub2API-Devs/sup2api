<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SDescItem, SDescriptions, SHint, SModal, SSegmented, SSettingRow, SSettingsGroup, SSwitch, confirm } from '@sub2api/ui'
import { formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import { useCcgError } from './ccgError'

interface CLIState {
  pinned_version?: string
  catalog: { installed_version: string; catalog_version: string; state: string; tool_count: number; variant_count: number; checked_at: string; synced_at: string; error?: string }
  auto_update: boolean
  auto_update_mode: 'managed'
  channel: 'stable' | 'latest'
  latest_version: string
  updating: boolean
  update_state: string
  update_error: string
}

const props = defineProps<{ accountId: number; disabled?: boolean }>()
const emit = defineEmits<{ (event: 'changed'): void }>()
const { t, te } = useI18n()
const auth = useAuthStore()
const describe = useCcgError()
const manage = computed(() => auth.has('settings:manage'))
const open = ref(false)
const busy = ref(false)
const error = ref('')
const state = ref<CLIState | null>(null)
const blocked = computed(() => !manage.value || props.disabled || busy.value || state.value?.updating)
const path = computed(() => `/system/ccgateway/cli/${props.accountId}`)
const channels = computed(() => [{ value: 'stable', label: t('ccgateway.cli.stable') }, { value: 'latest', label: t('ccgateway.cli.latest') }])
let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined

function stopPolling() { clearTimeout(timer); timer = undefined }
/** The controller reports Go's zero time for "never". */
function when(value?: string) { return !value || value.startsWith('0001-') ? '—' : formatDateTime(value) }
function label(value: string) { return te(`ccgateway.cli.states.${value}`) ? t(`ccgateway.cli.states.${value}`) : value }

async function request(operation: (signal: AbortSignal) => Promise<CLIState>) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  stopPolling()
  controller = new AbortController()
  try {
    const previous = state.value?.catalog.installed_version
    state.value = await operation(controller.signal)
    if (previous && previous !== state.value.catalog.installed_version) emit('changed')
    if (open.value && (state.value.updating || ['starting', 'syncing'].includes(state.value.catalog.state))) timer = setTimeout(load, 2000)
  } catch (e) {
    if (!controller.signal.aborted) error.value = describe(e) || t('ccgateway.cli.failed')
  } finally {
    busy.value = false
  }
}

function load() { return request(signal => api.get<CLIState>(path.value, undefined, { signal })) }

async function action(action: 'check' | 'sync' | 'update') {
  if (blocked.value) return
  if (action === 'update' && !await confirm({ title: t('ccgateway.cli.update'), message: t('ccgateway.cli.confirm'), confirmText: t('ccgateway.cli.update') })) return
  await request(signal => api.post<CLIState>(path.value, { action }, { signal }))
}

async function policy(auto: boolean, channel: string) {
  if (blocked.value || !state.value || !['stable', 'latest'].includes(channel)) return
  await request(signal => api.put<CLIState>(path.value, { auto_update: auto, channel }, { signal }))
}

watch(open, value => { if (value) void load(); else { stopPolling(); controller?.abort() } })
onBeforeUnmount(() => { stopPolling(); controller?.abort() })
</script>

<template>
  <SButton size="sm" variant="ghost" :disabled="disabled" :data-testid="`cli-settings-${accountId}`" @click="open = true">{{ t('ccgateway.cli.title') }}</SButton>
  <SModal v-model:open="open" :title="`${t('ccgateway.cli.title')} #${accountId}`" width="lg">
    <div class="space-y-4">
      <SHint>{{ t('ccgateway.cli.hint') }}</SHint>
      <SAlert v-if="error" tone="danger" dense>{{ error }}</SAlert>
      <template v-if="state">
        <SHint v-if="state.pinned_version">{{ t('ccgateway.cliProfile.pinned', {version: state.pinned_version}) }}</SHint>
        <SDescriptions :columns="2" dense>
          <SDescItem :label="t('ccgateway.cli.installed')" :value="state.catalog.installed_version || '—'" mono />
          <SDescItem :label="t('ccgateway.cli.catalog')" :value="state.catalog.catalog_version || '—'" mono />
          <SDescItem :label="t('ccgateway.cli.available')" :value="state.latest_version || '—'" mono />
          <SDescItem :label="t('ccgateway.cli.status')">{{ label(state.catalog.state) }} · {{ state.catalog.tool_count }} / {{ state.catalog.variant_count }}</SDescItem>
          <SDescItem :label="t('ccgateway.cli.checkedAt')"><span class="tabular-nums">{{ when(state.catalog.checked_at) }}</span></SDescItem>
          <SDescItem :label="t('ccgateway.cli.syncedAt')"><span class="tabular-nums">{{ when(state.catalog.synced_at) }}</span></SDescItem>
        </SDescriptions>
        <SAlert v-if="state.catalog.error" tone="danger" dense><span class="break-all">{{ state.catalog.error }}</span></SAlert>
        <SAlert v-if="state.update_error" tone="danger" dense><span class="break-all">{{ state.update_error }}</span></SAlert>
        <SHint v-if="state.updating || state.update_state !== 'idle'">{{ t('ccgateway.cli.operation') }}: {{ label(state.update_state) }}</SHint>
        <SSettingsGroup>
          <SSettingRow :label="t('ccgateway.cli.channel')" dense>
            <SSegmented :model-value="state.channel" :options="channels" size="sm" :disabled="!!blocked" :aria-label="t('ccgateway.cli.channel')" data-testid="cli-channel" @update:model-value="policy(state!.auto_update, String($event))" />
          </SSettingRow>
          <SSettingRow :label="t('ccgateway.cli.auto')" :description="t('ccgateway.cli.autoHint')">
            <SSwitch :model-value="state.auto_update" :disabled="!!blocked || !!state.pinned_version" :aria-label="t('ccgateway.cli.auto')" data-testid="cli-auto-update" @update:model-value="policy($event, state!.channel)" />
          </SSettingRow>
        </SSettingsGroup>
      </template>
    </div>
    <template #footer>
      <SButton :loading="busy" @click="load">{{ t('common.refresh') }}</SButton>
      <SButton :disabled="blocked || !state" @click="action('check')">{{ t('ccgateway.cli.check') }}</SButton>
      <SButton :disabled="blocked || !state" @click="action('sync')">{{ t('ccgateway.cli.sync') }}</SButton>
      <SButton variant="primary" :disabled="blocked || !state || !!state?.pinned_version" @click="action('update')">{{ t('ccgateway.cli.update') }}</SButton>
    </template>
  </SModal>
</template>
