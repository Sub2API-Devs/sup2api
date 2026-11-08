<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { isApiError, listAll, MAX_ACCOUNT_BATCH } from '@sub2api/host'
import { SAlert, SCard, SHint } from '@sub2api/ui'
import ConfigAccountModal from './ConfigAccountModal.vue'
import ConfigAccountsTable from './ConfigAccountsTable.vue'
import ConfigGroupModal from './ConfigGroupModal.vue'
import ConfigGroupsTable from './ConfigGroupsTable.vue'
import ConfigLayerFields from './ConfigLayerFields.vue'
import ConfigNotify from './ConfigNotify.vue'
import ConfigSaveBar from './ConfigSaveBar.vue'
import ConfigSummary from './ConfigSummary.vue'
import ItemsTable from './ItemsTable.vue'
import { useCatalog } from './catalog'
import { changes as changesOf, sortedIds, type Draft } from './configView'
import {
  canManage,
  errorMessage,
  fetchChannels,
  fetchConfig,
  fetchDefaults,
  layerIncomplete,
  overrideIncomplete,
  saveConfig,
  useDwHost,
  validateConfig,
  type AccountOverride,
  type Channel,
  type ConfigBody,
  type Layer,
  type Named
} from './host'

// Configuration: the global layer, group layers that replace it, account
// overrides that narrow it, and notifications through a core channel. Saved
// as one document with the version it was read at. Groups and accounts are
// edited in dialogs whose Apply only changes the draft; the bar at the
// bottom saves it. `openAccount` (?override_account= of the page) opens the
// override dialog of that account once the config is loaded.
const props = defineProps<{ openAccount?: string | null }>()
const emit = defineEmits<{ (e: 'update:openAccount', v: null): void }>()
const host = useDwHost()
const t = host.t
const manage = computed(() => canManage())
const catalog = useCatalog()

const draft = ref<Draft | null>(null)
const saved = ref<Draft | null>(null) // the draft as read or saved, to tell unsaved edits
const version = ref(0)
const defaults = ref<Layer | null>(null)
const channels = ref<Channel[]>([])
const loading = ref(false)
const error = ref('')
const warnings = ref<string[]>([])

function setDraft(body: ConfigBody) {
  const c: Draft = { ...body.config, groups: body.config.groups ?? {}, accounts: body.config.accounts ?? {} }
  draft.value = c
  saved.value = JSON.parse(JSON.stringify(c))
  version.value = body.version
  void loadAccountGroups(Object.keys(c.accounts))
}

const changes = computed(() => (draft.value && saved.value ? changesOf(draft.value, saved.value) : null))
const dirty = computed(() => {
  const c = changes.value
  return !!c && (c.global || c.notify || c.groups.length > 0 || c.accounts.length > 0)
})

// Where the draft cannot be validated or saved: a number left empty in a
// layer (its own, a rule's or an item's) or an account floor. The plugin
// would refuse it, or read a group's as the default.
const problems = computed(() => {
  const c = draft.value
  if (!c) return []
  return [
    ...(layerIncomplete(c) ? [t('cfg.save.global')] : []),
    ...sortedIds(c.groups)
      .filter(id => layerIncomplete(c.groups[id]))
      .map(id => t('cfg.save.group', { name: catalog.groupName(Number(id)) })),
    ...sortedIds(c.accounts)
      .filter(id => overrideIncomplete(c.accounts[id]))
      .map(id => t('cfg.save.account', { name: catalog.accountName(Number(id)) }))
  ]
})
const invalid = computed(() => problems.value.length > 0)

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
  if (
    (dirty.value || invalid.value) &&
    !(await host.confirm({ message: t('config.discardConfirm'), confirmText: t('config.discard'), danger: true }))
  )
    return
  await reload()
}

onMounted(reload)
defineExpose({ reload: discard })

// ---- the groups of the overridden accounts, for the values they inherit

// Read through the core account list (account:read); without it, or for an
// account it does not return, the inherited values are the global ones. An
// account is looked up again until a batch that holds it is answered.
const accountGroups = ref<Record<string, number[]>>({})
const looked = new Set<string>()

async function loadAccountGroups(ids: string[]) {
  const todo = ids.filter(id => !looked.has(id))
  const batches = Array.from({ length: Math.ceil(todo.length / MAX_ACCOUNT_BATCH) }, (_, i) =>
    todo.slice(i * MAX_ACCOUNT_BATCH, (i + 1) * MAX_ACCOUNT_BATCH)
  )
  await Promise.all(
    batches.map(async batch => {
      try {
        const found = await listAll<Named & { group_ids?: number[] }>(host.api, '/accounts', {
          query: { ids: batch.join(','), orphaned: 'all' },
          max: batch.length
        })
        batch.forEach(id => looked.add(id))
        for (const a of found) {
          accountGroups.value[a.id] = a.group_ids ?? []
          catalog.state.accounts[a.id] = a.name
        }
      } catch {
        /* this batch is asked again next time */
      }
    })
  )
}

// ---- dialogs: the group or account opened ('' = a new one), null = closed

const groupTarget = ref<string | null>(null)
const accountTarget = ref<string | null>(null)

function applyGroup(id: string, layer: Layer) {
  if (draft.value) draft.value.groups[id] = layer
  groupTarget.value = null
}

async function removeGroup(id: string) {
  const message = t('cfg.groups.removeConfirm', { group: catalog.groupName(Number(id)) })
  if (!(await host.confirm({ message, confirmText: t('cfg.groups.remove'), danger: true }))) return
  delete draft.value?.groups[id]
}

// An override left with nothing set is removed rather than kept empty.
function applyAccount(id: string, o: AccountOverride) {
  if (draft.value && Object.values(o).every(v => v === undefined)) delete draft.value.accounts[id]
  else if (draft.value) draft.value.accounts[id] = o
  accountTarget.value = null
}

async function removeAccount(id: string) {
  const message = t('cfg.accounts.removeConfirm', { account: catalog.accountName(Number(id)) })
  if (!(await host.confirm({ message, confirmText: t('cfg.accounts.remove'), danger: true }))) return
  delete draft.value?.accounts[id]
}

watch(
  [() => props.openAccount, draft],
  ([id, c]) => {
    if (!id || !c) return
    accountTarget.value = id
    emit('update:openAccount', null)
  },
  { immediate: true }
)

// ---- save

const saving = ref(false)

// Saving validates first: an invalid draft is not sent, and its warnings are
// confirmed.
async function save() {
  const c = draft.value
  if (!c || invalid.value) return
  saving.value = true
  error.value = ''
  try {
    const checked = await validateConfig({ config: c, version: version.value })
    const found = checked.warnings ?? []
    warnings.value = found
    if (
      found.length &&
      !(await host.confirm({ message: t('config.warningsConfirm', { warnings: found.join('; ') }), confirmText: t('config.save') }))
    )
      return
    const body = await saveConfig({ config: c, version: version.value })
    setDraft(body)
    warnings.value = body.warnings ?? []
    host.toast(t('config.saved'), 'success')
  } catch (e) {
    const conflict = isApiError(e) && e.status === 409
    // The plugin's refusal says what to fix: it stays on the page, over the config.
    if (!conflict) error.value = errorMessage(e, t('actionFailed'))
    host.toast(conflict ? t('config.conflict') : errorMessage(e, t('actionFailed')), 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="dw-cfg">
    <SAlert v-if="error" tone="danger" class="dw-block">{{ error }}</SAlert>
    <SAlert v-for="w in warnings" :key="w" tone="warning" class="dw-block">{{ w }}</SAlert>

    <template v-if="draft">
      <ConfigSummary v-model="draft" :readonly="!manage" class="dw-block" />

      <SCard :title="t('cfg.global.title')" :subtitle="t('cfg.global.hint')" class="dw-block">
        <ConfigLayerFields v-model="draft" :readonly="!manage" />
        <div class="dw-cfg-items">
          <ItemsTable
            :rules="draft.rules"
            :strategies="draft.strategies"
            :defaults="defaults"
            :readonly="!manage"
            @change="({ rules, strategies }) => draft && Object.assign(draft, { rules, strategies })"
          />
        </div>
      </SCard>

      <ConfigGroupsTable :draft="draft" :readonly="!manage" @add="groupTarget = ''" @edit="groupTarget = $event" @remove="removeGroup" />
      <ConfigAccountsTable
        :draft="draft"
        :account-groups="accountGroups"
        :readonly="!manage"
        @add="accountTarget = ''"
        @edit="accountTarget = $event"
        @remove="removeAccount"
      />
      <ConfigNotify v-model="draft" :channels="channels" :readonly="!manage" />

      <ConfigSaveBar
        v-if="manage && changes && (dirty || invalid)"
        :changes="changes"
        :problems="problems"
        :saving="saving"
        @discard="discard"
        @save="save"
      />

      <ConfigGroupModal
        :target="groupTarget"
        :draft="draft"
        :defaults="defaults"
        :readonly="!manage"
        @close="groupTarget = null"
        @apply="applyGroup"
      />
      <ConfigAccountModal
        :target="accountTarget"
        :draft="draft"
        :account-groups="accountGroups"
        :readonly="!manage"
        @close="accountTarget = null"
        @apply="applyAccount"
        @pick="loadAccountGroups([$event])"
      />
    </template>
    <SHint v-else-if="loading">{{ t('loading') }}</SHint>
  </div>
</template>
