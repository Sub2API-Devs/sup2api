<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SField, SHint, SModal, SSelect, SSwitch, confirm } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { useCcgError } from './ccgError'

interface CLIState {
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
      <SHint v-if="error" tone="danger">{{ error }}</SHint>
      <template v-if="state">
        <div class="grid grid-cols-2 gap-3 text-sm">
          <SField :label="t('ccgateway.cli.installed')"><span class="font-mono">{{ state.catalog.installed_version || '—' }}</span></SField>
          <SField :label="t('ccgateway.cli.catalog')"><span class="font-mono">{{ state.catalog.catalog_version || '—' }}</span></SField>
          <SField :label="t('ccgateway.cli.available')"><span class="font-mono">{{ state.latest_version || '—' }}</span></SField>
          <SField :label="t('ccgateway.cli.status')">{{ label(state.catalog.state) }} · {{ state.catalog.tool_count }} / {{ state.catalog.variant_count }}</SField>
          <SField :label="t('ccgateway.cli.checkedAt')">{{ state.catalog.checked_at?.startsWith('0001-') ? '—' : state.catalog.checked_at || '—' }}</SField>
          <SField :label="t('ccgateway.cli.syncedAt')">{{ state.catalog.synced_at?.startsWith('0001-') ? '—' : state.catalog.synced_at || '—' }}</SField>
        </div>
        <SHint v-if="state.catalog.error" tone="danger">{{ state.catalog.error }}</SHint>
        <SHint v-if="state.update_error" tone="danger">{{ state.update_error }}</SHint>
        <SHint v-if="state.updating || state.update_state !== 'idle'">{{ t('ccgateway.cli.operation') }}: {{ label(state.update_state) }}</SHint>
        <SField :label="t('ccgateway.cli.channel')"><SSelect :model-value="state.channel" :options="channels" :disabled="blocked" @update:model-value="policy(state!.auto_update, String($event))" /></SField>
        <SSwitch :model-value="state.auto_update" :disabled="blocked" data-testid="cli-auto-update" @update:model-value="policy($event, state!.channel)">{{ t('ccgateway.cli.auto') }}</SSwitch>
        <SHint>{{ t('ccgateway.cli.autoHint') }}</SHint>
      </template>
    </div>
    <template #footer>
      <SButton :loading="busy" @click="load">{{ t('common.refresh') }}</SButton>
      <SButton :disabled="blocked || !state" @click="action('check')">{{ t('ccgateway.cli.check') }}</SButton>
      <SButton :disabled="blocked || !state" @click="action('sync')">{{ t('ccgateway.cli.sync') }}</SButton>
      <SButton variant="primary" :disabled="blocked || !state" @click="action('update')">{{ t('ccgateway.cli.update') }}</SButton>
    </template>
  </SModal>
</template>
