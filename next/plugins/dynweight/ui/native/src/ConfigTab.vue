<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SButton, SCard, SDisclosure, SField, SHint, SInput, SSegmented, SSelect, SSwitch, STagInput } from '@sub2api/ui'
import LayerEditor from './LayerEditor.vue'
import {
  canManage, clone, errorMessage, fetchChannels, fetchConfig, fetchDefaults, saveConfig, useDwHost,
  type AccountOverride, type Channel, type Config, type Layer
} from './host'

// Configuration: the global layer, group layers that replace it, account
// overrides that narrow it, and notifications through a core channel. Saved
// as one document with the version it was read at.
const host = useDwHost()
const t = host.t
const manage = computed(() => canManage())

const draft = ref<Config | null>(null)
const version = ref(0)
const defaults = ref<Layer | null>(null)
const channels = ref<Channel[]>([])
const loading = ref(false)
const error = ref('')
const warnings = ref<string[]>([])

async function reload() {
  loading.value = true
  error.value = ''
  try {
    const [body, d, ch] = await Promise.all([fetchConfig(), fetchDefaults(), fetchChannels().catch(() => [])])
    draft.value = { ...body.config, groups: body.config.groups ?? {}, accounts: body.config.accounts ?? {} }
    version.value = body.version
    defaults.value = d
    channels.value = ch
    warnings.value = []
  } catch (e) {
    error.value = errorMessage(e, t('config.loadFailed'))
  } finally {
    loading.value = false
  }
}

onMounted(reload)
defineExpose({ reload })

// ---- groups and accounts, keyed by id

const sortedIds = (m: Record<string, unknown> | null) => Object.keys(m ?? {}).sort((a, b) => Number(a) - Number(b))
const groupIds = computed(() => sortedIds(draft.value?.groups ?? null))
const accountIds = computed(() => sortedIds(draft.value?.accounts ?? null))

const newGroup = ref('')
const newAccount = ref('')
const validId = (v: string) => /^\d+$/.test(v.trim()) && Number(v) > 0

function addGroup() {
  const c = draft.value
  if (!c || !validId(newGroup.value) || c.groups![newGroup.value.trim()]) return
  const { groups: _g, accounts: _a, notify: _n, ...global } = c
  c.groups![newGroup.value.trim()] = clone(global)
  newGroup.value = ''
}

function addAccount() {
  const c = draft.value
  if (!c || !validId(newAccount.value) || c.accounts![newAccount.value.trim()]) return
  c.accounts![newAccount.value.trim()] = {}
  newAccount.value = ''
}

const inheritOptions = computed(() => [
  { value: '', label: t('accounts.inherit') },
  { value: 'on', label: t('accounts.on') },
  { value: 'off', label: t('accounts.off') }
])
const floorOptions = computed(() => [
  { value: '', label: t('accounts.inherit') },
  { value: 'base_percent', label: t('floor.base_percent') },
  { value: 'fixed', label: t('floor.fixed') }
])

const enabledOf = (o: AccountOverride) => (o.enabled === undefined ? '' : o.enabled ? 'on' : 'off')
function setEnabled(o: AccountOverride, v: string) {
  o.enabled = v === '' ? undefined : v === 'on'
}
function setFloorMode(o: AccountOverride, v: string) {
  o.min_weight_mode = v === '' ? undefined : (v as AccountOverride['min_weight_mode'])
  o.min_weight = v === '' ? undefined : (o.min_weight ?? 0)
}

// ---- notifications

const channelOptions = computed(() => [
  { value: '', label: t('notify.noChannel') },
  ...channels.value.map((c) => ({ value: c.id, label: host.i18n.text(c.label) }))
])
const channel = computed(() => channels.value.find((c) => c.id === draft.value?.notify.channel))
const languageOptions = computed(() => [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' }
])

// ---- save

const saving = ref(false)
async function save() {
  const c = draft.value
  if (!c) return
  saving.value = true
  try {
    for (const o of Object.values(c.accounts ?? {})) if (o.exempt_status_codes === '') o.exempt_status_codes = undefined
    const body = await saveConfig({ config: c, version: version.value })
    draft.value = { ...body.config, groups: body.config.groups ?? {}, accounts: body.config.accounts ?? {} }
    version.value = body.version
    warnings.value = body.warnings ?? []
    host.toast(t('config.saved'), 'success')
  } catch (e) {
    const conflict = isApiError(e) && e.status === 409
    host.toast(conflict ? t('config.conflict') : errorMessage(e, t('actionFailed')), 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <SAlert v-if="error" tone="danger" class="dw-block">{{ error }}</SAlert>
    <SAlert v-for="w in warnings" :key="w" tone="warning" class="dw-block">{{ w }}</SAlert>

    <template v-if="draft">
      <fieldset class="dw-fieldset" :disabled="!manage">
        <SCard :title="t('config.global')" :subtitle="t('config.globalHint')" class="dw-block">
          <LayerEditor :model-value="draft" :defaults="defaults" master />
        </SCard>

        <SCard :title="t('config.groups')" :subtitle="t('config.groupsHint')" class="dw-block">
          <div class="dw-list">
            <SDisclosure v-for="id in groupIds" :key="id" variant="section" :label="t('config.group', { id })">
              <template #actions>
                <SButton size="sm" variant="ghost" icon="trash" @click="delete draft.groups![id]">{{ t('remove') }}</SButton>
              </template>
              <LayerEditor v-model="draft.groups![id]" :defaults="defaults" />
            </SDisclosure>
            <form class="dw-row" @submit.prevent="addGroup">
              <SInput v-model="newGroup" class="dw-w-10" inputmode="numeric" :placeholder="t('config.groupId')" />
              <SButton type="submit" icon="plus" :disabled="!validId(newGroup)">{{ t('config.addGroup') }}</SButton>
            </form>
          </div>
        </SCard>

        <SCard :title="t('config.accounts')" :subtitle="t('config.accountsHint')" class="dw-block">
          <div class="dw-list">
            <div v-for="id in accountIds" :key="id" class="dw-row">
              <span class="dw-w-6 dw-num">#{{ id }}</span>
              <SField class="dw-w-8" :label="t('accounts.enabled')">
                <SSelect :model-value="enabledOf(draft.accounts![id])" :options="inheritOptions" @update:model-value="setEnabled(draft.accounts![id], $event as string)" />
              </SField>
              <SField class="dw-grow" :label="t('layer.exempt')">
                <SInput v-model="draft.accounts![id].exempt_status_codes" :placeholder="t('accounts.inherit')" />
              </SField>
              <SField class="dw-w-10" :label="t('layer.floorMode')">
                <SSelect :model-value="draft.accounts![id].min_weight_mode ?? ''" :options="floorOptions" @update:model-value="setFloorMode(draft.accounts![id], $event as string)" />
              </SField>
              <SField class="dw-w-8" :label="t('layer.floor')">
                <SInput v-model="draft.accounts![id].min_weight" type="number" min="0" :disabled="!draft.accounts![id].min_weight_mode" />
              </SField>
              <SButton class="dw-end" size="sm" variant="ghost" icon="trash" icon-only :aria-label="t('remove')" @click="delete draft.accounts![id]" />
            </div>
            <form class="dw-row" @submit.prevent="addAccount">
              <SInput v-model="newAccount" class="dw-w-10" inputmode="numeric" :placeholder="t('config.accountId')" />
              <SButton type="submit" icon="plus" :disabled="!validId(newAccount)">{{ t('config.addAccount') }}</SButton>
            </form>
          </div>
        </SCard>

        <SCard :title="t('notify.title')" :subtitle="t('notify.hint')" class="dw-block">
          <div class="dw-row">
            <SField :label="t('enabled')">
              <SSwitch v-model="draft.notify.enabled" />
            </SField>
            <SField class="dw-w-12" :label="t('notify.channel')" :hint="channel ? host.i18n.text(channel.description) : ''">
              <SSelect v-model="draft.notify.channel" :options="channelOptions" />
            </SField>
            <SField :label="t('notify.language')">
              <SSegmented v-model="draft.notify.language" :options="languageOptions" size="sm" />
            </SField>
          </div>
          <SField :label="t('notify.recipients')" :hint="channel ? t('notify.recipientsHint', { kind: channel.recipient }) : ''">
            <STagInput v-model="draft.notify.recipients" :max="20" />
          </SField>
          <SHint v-if="!channels.length">{{ t('notify.noChannels') }}</SHint>
        </SCard>
      </fieldset>

      <div v-if="manage" class="dw-toolbar">
        <SButton @click="reload">{{ t('config.discard') }}</SButton>
        <SButton variant="primary" icon="check" :loading="saving" @click="save">{{ t('config.save') }}</SButton>
      </div>
    </template>
    <SHint v-else-if="loading">{{ t('loading') }}</SHint>
  </div>
</template>
