<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SButton, SCard, SDisclosure, SField, SHint, SSegmented, SSelect, SSwitch, STagInput } from '@sub2api/ui'
import AccountOverrideRow from './AccountOverrideRow.vue'
import IdPicker from './IdPicker.vue'
import LayerEditor from './LayerEditor.vue'
import { useCatalog } from './catalog'
import {
  canManage, clone, errorMessage, fetchChannels, fetchConfig, fetchDefaults, saveConfig, useDwHost, validateConfig,
  type AccountOverride, type Channel, type Config, type ConfigBody, type Layer
} from './host'

// Configuration: the global layer, group layers that replace it, account
// overrides that narrow it, and notifications through a core channel. Saved
// as one document with the version it was read at.
const host = useDwHost()
const t = host.t
const manage = computed(() => canManage())
const catalog = useCatalog()

/** The edited config, with groups and accounts always present. */
interface Draft extends Config {
  groups: Record<string, Layer>
  accounts: Record<string, AccountOverride>
}

const draft = ref<Draft | null>(null)
const version = ref(0)
const pristine = ref('') // the draft as read or saved, to tell unsaved edits
const defaults = ref<Layer | null>(null)
const channels = ref<Channel[]>([])
const loading = ref(false)
const error = ref('')
const warnings = ref<string[]>([])

function setDraft(body: ConfigBody) {
  draft.value = { ...body.config, groups: body.config.groups ?? {}, accounts: body.config.accounts ?? {} }
  pristine.value = JSON.stringify(draft.value)
  version.value = body.version
}

const dirty = computed(() => !!draft.value && JSON.stringify(draft.value) !== pristine.value)

async function reload() {
  loading.value = true
  error.value = ''
  try {
    const [body, d, ch] = await Promise.all([fetchConfig(), fetchDefaults(), fetchChannels().catch(() => [])])
    setDraft(body)
    defaults.value = d
    channels.value = ch
    warnings.value = body.warnings ?? []
  } catch (e) {
    error.value = errorMessage(e, t('config.loadFailed'))
  } finally {
    loading.value = false
  }
}

/** Reloads, once the user agrees to drop unsaved edits. */
async function discard() {
  if (dirty.value && !(await host.confirm({ message: t('config.discardConfirm'), confirmText: t('config.discard'), danger: true }))) return
  await reload()
}

onMounted(reload)
defineExpose({ reload: discard })

// ---- groups and accounts, keyed by id

const sortedIds = (m: Record<string, unknown>) => Object.keys(m).sort((a, b) => Number(a) - Number(b))
const groupIds = computed(() => sortedIds(draft.value?.groups ?? {}))
const accountIds = computed(() => sortedIds(draft.value?.accounts ?? {}))

const newGroup = ref('')
const newAccount = ref('')
const validId = (v: string) => /^\d+$/.test(v.trim()) && Number(v) > 0

function addGroup() {
  const c = draft.value
  const id = newGroup.value.trim()
  if (!c || !validId(id) || c.groups[id]) return
  // A new group starts as a copy of the global layer that adjusts: the
  // master switch stays the global one's.
  const { groups: _g, accounts: _a, notify: _n, ...global } = c
  c.groups[id] = { ...clone(global), enabled: true }
  newGroup.value = ''
}

function addAccount() {
  const c = draft.value
  const id = newAccount.value.trim()
  if (!c || !validId(id) || c.accounts[id]) return
  c.accounts[id] = {}
  newAccount.value = ''
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

// ---- validate and save

const saving = ref(false)

/** Has the plugin check the draft without saving: its warnings, or null and the error shown. */
async function validate(c: Draft): Promise<string[] | null> {
  error.value = ''
  try {
    const body = await validateConfig({ config: c, version: version.value })
    warnings.value = body.warnings ?? []
    return warnings.value
  } catch (e) {
    error.value = errorMessage(e, t('actionFailed'))
    warnings.value = []
    return null
  }
}

async function check() {
  if (!draft.value) return
  saving.value = true
  try {
    if ((await validate(draft.value))?.length === 0) host.toast(t('config.valid'), 'success')
  } finally {
    saving.value = false
  }
}

// Saving validates first: an invalid draft is not sent, and its warnings are
// confirmed.
async function save() {
  const c = draft.value
  if (!c) return
  saving.value = true
  try {
    const found = await validate(c)
    if (found === null) return
    if (found.length && !(await host.confirm({ message: t('config.warningsConfirm', { warnings: found.join('; ') }), confirmText: t('config.save') }))) return
    const body = await saveConfig({ config: c, version: version.value })
    setDraft(body)
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

    <!-- Read-only users get disabled fieldsets around the controls, never
         around a disclosure, whose toggle must keep working. -->
    <template v-if="draft">
      <SCard :title="t('config.global')" :subtitle="t('config.globalHint')" class="dw-block">
        <fieldset class="dw-fieldset" :disabled="!manage">
          <LayerEditor :model-value="draft" :defaults="defaults" master />
        </fieldset>
      </SCard>

      <SCard :title="t('config.groups')" :subtitle="t('config.groupsHint')" class="dw-block">
        <div class="dw-list">
          <SDisclosure v-for="id in groupIds" :key="id" variant="section" :label="catalog.groupName(Number(id))">
            <template v-if="manage" #actions>
              <SButton size="sm" variant="ghost" icon="trash" @click="delete draft.groups[id]">{{ t('remove') }}</SButton>
            </template>
            <fieldset class="dw-fieldset" :disabled="!manage">
              <LayerEditor v-model="draft.groups[id]" :defaults="defaults" />
            </fieldset>
          </SDisclosure>
          <form v-if="manage" class="dw-row" @submit.prevent="addGroup">
            <IdPicker v-model="newGroup" class="dw-w-16" kind="group" :exclude="groupIds" />
            <SButton type="submit" icon="plus" :disabled="!validId(newGroup)">{{ t('config.addGroup') }}</SButton>
          </form>
        </div>
      </SCard>

      <fieldset class="dw-fieldset" :disabled="!manage">
        <SCard :title="t('config.accounts')" :subtitle="t('config.accountsHint')" class="dw-block">
          <div class="dw-list">
            <AccountOverrideRow
              v-for="id in accountIds"
              :key="id"
              v-model="draft.accounts[id]"
              :label="catalog.accountName(Number(id))"
              @remove="delete draft.accounts[id]"
            />
            <form class="dw-row" @submit.prevent="addAccount">
              <IdPicker v-model="newAccount" class="dw-w-16" kind="account" :exclude="accountIds" />
              <SButton type="submit" icon="plus" :disabled="!validId(newAccount)">{{ t('config.addAccount') }}</SButton>
            </form>
          </div>
        </SCard>

        <SCard :title="t('logEvents.title')" :subtitle="t('logEvents.hint')" class="dw-block">
          <SField :label="t('enabled')">
            <SSwitch v-model="draft.log_events" />
          </SField>
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
        <SButton :disabled="!dirty" @click="discard">{{ t('config.discard') }}</SButton>
        <SButton :loading="saving" @click="check">{{ t('config.validate') }}</SButton>
        <SButton variant="primary" icon="check" :loading="saving" @click="save">{{ t('config.save') }}</SButton>
      </div>
    </template>
    <SHint v-else-if="loading">{{ t('loading') }}</SHint>
  </div>
</template>
