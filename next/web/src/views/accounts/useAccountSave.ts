// Save pipeline of the account editor (CONTRACTS §16, §18, §21.4, §41):
// the pre-request checks (invalidSection), the request body (requestBody), the
// POST / PATCH (submit) and the error routing (showSaveError) in one place.
// AccountEditor keeps the template and only wires the state below.
import type { ComputedRef, Ref } from 'vue'
import { nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { toast } from '@sub2api/ui'
import type { Account, AccountType } from '@/api/types'
import { useProxiesLookup } from '@/composables/lookups'
import { fieldErrors, notifyError } from '@/utils/errors'
import { savedOverrides, validFeatureOverrides, type AccountFeaturePolicy } from '@/views/ccgateway/requestPolicy'
import { reasonOf } from '@/views/ccgateway/ccgAuthFlow'
import { sectionOfErrors, splitFieldErrors, type EditorSection } from './editorErrors'
import { subscriptionLabel } from './subscription'

/** Editable basics of an account (AccountEditor's `basic`). */
export interface AccountBasics {
  name: string
  group_ids: number[]
  proxy_id: number | null
  priority: number
  weight: number
  max_concurrency: number
  schedulable: boolean
  auto_disable: boolean
  rpm_limit: number
  tpm_limit: number
}

/** The model list / mapping editor, as far as saving needs it. */
export interface SaveModels {
  setModels(next: string[]): void
  payload(): { models: string[]; model_mapping: Record<string, string> }
  commitPending(): boolean
  defaultModels(): string[]
}

export interface AccountSaveDeps {
  /** The account being edited (null for a new one). */
  account: ComputedRef<Account | null | undefined>
  accountType: ComputedRef<AccountType | null>
  editing: ComputedRef<boolean>
  basic: AccountBasics
  errors: Ref<Record<string, string>>
  credErrors: Ref<Record<string, string>>
  saving: Ref<boolean>
  activeSection: Ref<EditorSection>
  locationLoading: Ref<boolean>
  models: SaveModels
  /** Container locale and timezone (CCGateway accounts). */
  environment(): { locale: string; timezone: string }
  /** CCGateway accounts: settings, proxy, auto models and the CC feature draft. */
  gateway: {
    needed: ComputedRef<boolean>
    automaticModels: ComputedRef<boolean>
    schedulingConfigurable: ComputedRef<boolean>
    autoDisableEnabled: Ref<boolean | null>
    autoDisableConfigurable: ComputedRef<boolean>
    proxyUrlToSend: ComputedRef<string>
    featureDirty: ComputedRef<boolean>
    featureBlocked: Ref<boolean>
    featurePolicy: Ref<AccountFeaturePolicy | undefined>
    draft: ComputedRef<boolean>
    /** The draft flow is not authorized yet: saving waits for it. */
    saveBlocked: ComputedRef<boolean>
    draftKey: ComputedRef<string | null>
    preparationUrl: ComputedRef<string | undefined>
    adopt(): void
    rejected(reason: string): void
    showAuth(): void
  }
  collectCredentials(): Promise<Record<string, unknown> | null>
  showCredentialErrors(cred: Record<string, string>): void
  loadAutoDisablePolicy(): Promise<void>
  saved(a: Account): void
}

export function useAccountSave(deps: AccountSaveDeps) {
  const { t } = useI18n()
  const { account, accountType, editing, basic, errors, credErrors, saving, activeSection, models, gateway } = deps

  /** Checks done before the request; the section to show when one fails. */
  async function invalidSection(form: HTMLFormElement): Promise<EditorSection | 'native' | 'ccg' | null> {
    if (gateway.featureDirty.value && (gateway.featureBlocked.value || !validFeatureOverrides(gateway.featurePolicy.value!.overrides))) {
      errors.value = { cc_feature_policy: t('ccgateway.layers.invalid') }
      return 'cc_features'
    }
    // Native constraints are checked explicitly so the first invalid field can
    // be revealed before the browser tries to focus it in a hidden pane.
    const invalid = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input:invalid, select:invalid, textarea:invalid')
    if (invalid) {
      const section = invalid.closest<HTMLElement>('[data-editor-section]')?.dataset.editorSection
      if (section) activeSection.value = section as EditorSection
      await nextTick()
      if (invalid.isConnected) invalid.reportValidity()
      return 'native'
    }
    if (!basic.name.trim()) {
      errors.value = { name: t('ui.schema.v.required') }
      return 'connection'
    }
    if (gateway.saveBlocked.value) return 'ccg'
    // Pending text-mode / draft edits are committed (and validated) before saving.
    return models.commitPending() ? null : 'models'
  }

  function requestBody(creds: Record<string, unknown>): Record<string, unknown> {
    if (gateway.automaticModels.value) models.setModels([...models.defaultModels()])
    const body: Record<string, unknown> = {
      name: basic.name.trim(),
      group_ids: basic.group_ids,
      priority: Number(basic.priority),
      weight: Number(basic.weight),
      max_concurrency: Number(basic.max_concurrency),
      ...models.payload(),
      rpm_limit: Number(basic.rpm_limit) || 0,
      tpm_limit: Number(basic.tpm_limit) || 0
    }
    if (gateway.schedulingConfigurable.value) body.schedulable = basic.schedulable
    if (gateway.autoDisableEnabled.value === true && gateway.autoDisableConfigurable.value) body.auto_disable = basic.auto_disable
    if (gateway.needed.value) {
      const environment = deps.environment()
      body.settings = { locale: environment.locale, timezone: environment.timezone }
      body.auto_models = gateway.automaticModels.value
      // Retired keys an older save may hold are dropped (the core ignores them).
      if (editing.value && gateway.featureDirty.value) {
        body.cc_feature_policy = { ...gateway.featurePolicy.value!, overrides: savedOverrides(gateway.featurePolicy.value!.overrides) }
      }
    }
    // Exactly one of proxy_id / proxy_url (CONTRACTS §21.4: both is a conflict).
    if (gateway.proxyUrlToSend.value) body.proxy_url = gateway.proxyUrlToSend.value
    else body.proxy_id = basic.proxy_id
    if (accountType.value && !account.value?.orphaned) body.credentials = creds
    return body
  }

  async function submit(body: Record<string, unknown>): Promise<Account> {
    if (editing.value) return api.patch<Account>(`/accounts/${account.value!.id}`, body)
    // The account type is (plugin_key, type); accounts have no platform.
    body.plugin_key = accountType.value!.plugin_key
    body.type = accountType.value!.type
    // A new Claude Code account adopts its authorized draft container.
    const draft = gateway.draft.value ? gateway.draftKey.value : null
    if (draft) body[gateway.preparationUrl.value ? 'preparation_key' : 'ccgateway_runtime'] = draft
    const created = await api.post<Account>('/accounts', body)
    if (draft) gateway.adopt()
    return created
  }

  function showSaveError(e: unknown) {
    if (reasonOf(e) === 'feature_revision_conflict') {
      errors.value = { cc_feature_policy: t('ccgateway.layers.conflict') }
      activeSection.value = 'cc_features'
      return
    }
    // The draft was refused (gone, or no longer signed in): back to the authorization steps.
    const ccgReason = gateway.draft.value ? reasonOf(e) : ''
    if (ccgReason === 'draft_not_found' || ccgReason === 'draft_not_authorized') {
      gateway.rejected(ccgReason)
      toast(t(`ccgateway.reason.${ccgReason}`), 'error')
      gateway.showAuth()
      return
    }
    const all = fieldErrors(e)
    const { cred, base } = splitFieldErrors(all)
    errors.value = base
    deps.showCredentialErrors(cred)
    const section = sectionOfErrors(base, cred)
    if (section) activeSection.value = section
    if (!Object.keys(all).length) notifyError(e)
  }

  async function save(event: Event) {
    if (deps.locationLoading.value) return
    errors.value = {}
    credErrors.value = {}
    const problem = await invalidSection(event.currentTarget as HTMLFormElement)
    if (problem === 'ccg') return void gateway.showAuth()
    if (problem && problem !== 'native') activeSection.value = problem
    if (problem) return
    const creds = await deps.collectCredentials()
    if (!creds) {
      activeSection.value = 'connection'
      return
    }
    saving.value = true
    await deps.loadAutoDisablePolicy()
    const body = requestBody(creds)
    try {
      const result = await submit(body)
      toast(t(editing.value ? 'common.updated' : 'common.created'), 'success')
      // The plugin may adjust a new account's models to its subscription (CONTRACTS §59).
      if (!editing.value && result?.models && result.subscription_type && JSON.stringify(result.models) !== JSON.stringify(body.models)) {
        toast(t('accounts.modelsAdjusted', { plan: subscriptionLabel(result.subscription_type), n: result.models.length }), 'info')
      }
      if (body.proxy_url) {
        // The proxy picker cache may now miss the (re)used proxy.
        useProxiesLookup(true)
        if (result?.proxy_created) toast(t('accounts.proxyAutoCreated'), 'info')
      }
      deps.saved(result)
    } catch (e) {
      showSaveError(e)
    } finally {
      saving.value = false
    }
  }

  return { invalidSection, requestBody, submit, showSaveError, save }
}
