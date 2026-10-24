<script setup lang="ts">
// The CC version dialog of one account runtime (GET/POST/PUT
// /system/ccgateway/cli/:id): the Worker checks its packaged CLI (catalog
// state ready / failed) and can look up a channel's latest release. A pinned
// CLI (every packaged runtime) refuses periodic lookups, so that switch only
// shows for an unpinned one.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SDescItem, SDescriptions, SHint, SModal, SSegmented, SSettingRow, SSettingsGroup, SSwitch } from '@sub2api/ui'
import { formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import { useOptionalT } from '@/composables/optionalText'
import { useCcgError } from './ccgError'

interface CLIState {
  pinned_version?: string
  /** The Worker's check of its packaged CLI (the field keeps its old name). */
  catalog: { installed_version: string; state: string; checked_at: string; synced_at: string; error?: string }
  auto_update: boolean
  channel: 'stable' | 'latest'
  latest_version: string
}

const props = defineProps<{ accountId: number; disabled?: boolean }>()
const emit = defineEmits<{ (event: 'changed'): void }>()
const { t } = useI18n()
const tr = useOptionalT()
const auth = useAuthStore()
const describe = useCcgError()
const manage = computed(() => auth.has('settings:manage'))
const open = ref(false)
const busy = ref(false)
const error = ref('')
const state = ref<CLIState | null>(null)
const blocked = computed(() => !manage.value || props.disabled || busy.value)
const path = computed(() => `/system/ccgateway/cli/${props.accountId}`)
const channels = computed(() => [{ value: 'stable', label: t('ccgateway.cli.stable') }, { value: 'latest', label: t('ccgateway.cli.latest') }])
let controller: AbortController | undefined

/** The controller reports Go's zero time for "never". */
function when(value?: string) { return !value || value.startsWith('0001-') ? '—' : formatDateTime(value) }
function label(value: string) { return tr(`ccgateway.cli.states.${value}`, undefined, value) }

async function request(operation: (signal: AbortSignal) => Promise<CLIState>) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  controller = new AbortController()
  try {
    const previous = state.value?.catalog.installed_version
    state.value = await operation(controller.signal)
    if (previous && previous !== state.value.catalog.installed_version) emit('changed')
  } catch (e) {
    if (!controller.signal.aborted) error.value = describe(e) || t('ccgateway.cli.failed')
  } finally {
    busy.value = false
  }
}

function load() { return request(signal => api.get<CLIState>(path.value, undefined, { signal })) }

async function action(action: 'check' | 'sync') {
  if (blocked.value) return
  await request(signal => api.post<CLIState>(path.value, { action }, { signal }))
}

async function policy(auto: boolean, channel: string) {
  if (blocked.value || !state.value || !['stable', 'latest'].includes(channel)) return
  await request(signal => api.put<CLIState>(path.value, { auto_update: auto, channel }, { signal }))
}

watch(open, value => { if (value) void load(); else controller?.abort() })
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <SButton size="sm" variant="ghost" :disabled="disabled" :data-testid="`cli-settings-${accountId}`" @click="open = true">{{ t('ccgateway.cli.title') }}</SButton>
  <SModal v-model:open="open" :title="`${t('ccgateway.cli.title')} #${accountId}`" width="lg">
    <div class="space-y-4">
      <SHint>{{ t('ccgateway.cli.hint') }}</SHint>
      <SAlert v-if="error" tone="danger" dense>{{ error }}</SAlert>
      <template v-if="state">
        <SHint v-if="state.pinned_version" data-testid="cli-pinned">{{ t('ccgateway.cli.pinned', { version: state.pinned_version }) }}</SHint>
        <SDescriptions :columns="2" dense>
          <SDescItem :label="t('ccgateway.cli.installed')" :value="state.catalog.installed_version || '—'" mono />
          <SDescItem :label="t('ccgateway.cli.available')" :value="state.latest_version || '—'" mono />
          <SDescItem :label="t('ccgateway.cli.status')">{{ label(state.catalog.state) }}</SDescItem>
          <SDescItem :label="t('ccgateway.cli.checkedAt')"><span class="tabular-nums">{{ when(state.catalog.checked_at) }}</span></SDescItem>
          <SDescItem :label="t('ccgateway.cli.syncedAt')"><span class="tabular-nums">{{ when(state.catalog.synced_at) }}</span></SDescItem>
        </SDescriptions>
        <SAlert v-if="state.catalog.error" tone="danger" dense data-testid="cli-check-error"><span class="break-all">{{ state.catalog.error }}</span></SAlert>
        <SSettingsGroup>
          <SSettingRow :label="t('ccgateway.cli.channel')" dense>
            <SSegmented :model-value="state.channel" :options="channels" size="sm" :disabled="!!blocked" :aria-label="t('ccgateway.cli.channel')" data-testid="cli-channel" @update:model-value="policy(state!.auto_update, String($event))" />
          </SSettingRow>
          <SSettingRow v-if="!state.pinned_version" :label="t('ccgateway.cli.auto')" :description="t('ccgateway.cli.autoHint')">
            <SSwitch :model-value="state.auto_update" :disabled="!!blocked" :aria-label="t('ccgateway.cli.auto')" data-testid="cli-auto-update" @update:model-value="policy($event, state!.channel)" />
          </SSettingRow>
        </SSettingsGroup>
      </template>
    </div>
    <template #footer>
      <SButton :loading="busy" @click="load">{{ t('common.refresh') }}</SButton>
      <SButton :disabled="blocked || !state" @click="action('check')">{{ t('ccgateway.cli.check') }}</SButton>
      <SButton :disabled="blocked || !state" @click="action('sync')">{{ t('ccgateway.cli.sync') }}</SButton>
    </template>
  </SModal>
</template>
