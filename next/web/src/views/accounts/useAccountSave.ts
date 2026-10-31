// Save pipeline of the account editor (CONTRACTS §16, §18, §21.4, §41):
// the pre-request checks (invalidSection), the request body (requestBody), the
// POST / PATCH (submit) and the error routing (showSaveError) in one place.
// AccountEditor keeps the template and only wires the state below.
import type { ComputedRef, Ref } from 'vue'
import { computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { toast } from '@sub2api/ui'
import type { Account, AccountType, EnvironmentValues } from '@/api/types'
import { useProxiesLookup } from '@/composables/lookups'
import { errorMessage, fieldErrors, notifyError } from '@/utils/errors'
import { savedOverrides, validFeatureOverrides, type AccountFeaturePolicy } from '@/views/ccgateway/requestPolicy'
import { reasonOf } from '@/views/ccgateway/ccgAuthFlow'
import { accountControl } from './accountTypeChoices'
import { sectionOfErrors, splitFieldErrors, type EditorSection } from './editorErrors'
import { subscriptionLabel } from './subscription'
import type { useModelEdit } from './useModelEdit'
import { fromCards, repeatedModel, type ModelLimitCard } from './modelLimits'

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
  spm_limit: number
  /** The account layer of the environment variables (CONTRACTS §74.3). */
  environment: EnvironmentValues
}

/** The account editor's model list / mapping editor (useModelEdit: its state and actions). */
export type ModelEditor = ReturnType<typeof useModelEdit>

/** What saving needs of a CCGateway account beyond its type. */
export interface AccountSaveCcg {
  /** "automatic models" (the subscription's default list). */
  autoModels: Ref<boolean>
  autoDisableEnabled: Ref<boolean | null>
  /** The proxy_url to send instead of proxy_id. */
  proxyUrlToSend: ComputedRef<string>
  featureDirty: ComputedRef<boolean>
  featureBlocked: Ref<boolean>
  featurePolicy: Ref<AccountFeaturePolicy | undefined>
  /** New account: the draft flow is not authorized yet, so saving waits for it. */
  draft: ComputedRef<boolean>
  saveBlocked: ComputedRef<boolean>
  /** Key (or account id) of the prepared draft container. */
  draftKey: ComputedRef<string | null>
  preparationUrl: ComputedRef<string | undefined>
  /** The authorization panel of a new account. */
  adopt(): void
  rejected(reason: string): void
  showAuth(): void
}

export interface AccountSaveDeps {
  /** The account being edited (null for a new one). */
  account: ComputedRef<Account | null | undefined>
  accountType: ComputedRef<AccountType | null>
  editing: ComputedRef<boolean>
  basic: AccountBasics
  /** 指定模型限速 cards (CONTRACTS §68). */
  modelLimits: Ref<ModelLimitCard[]>
  errors: Ref<Record<string, string>>
  credErrors: Ref<Record<string, string>>
  saving: Ref<boolean>
  activeSection: Ref<EditorSection>
  locationLoading: Ref<boolean>
  /** The model list / mapping editor (useModelEdit). */
  models: ModelEditor
  /** Container locale and timezone (CCGateway accounts). */
  settings: { locale: string; timezone: string }
  /** CCGateway accounts only. */
  ccg: AccountSaveCcg
  collectCredentials(): Promise<Record<string, unknown> | null>
  showCredentialErrors(cred: Record<string, string>): void
  loadAutoDisablePolicy(): Promise<void>
  /** The usage limit card (CONTRACTS §73), saved on its own endpoint once the account is. */
  usageLimit?: {
    /** Shows the card's errors and reports whether it blocks saving. */
    invalid(): boolean
    /** Saves the limit of the saved account when it changed. */
    save(a: Account): Promise<void>
  }
  saved(a: Account): void
}

export function useAccountSave(deps: AccountSaveDeps) {
  const { t } = useI18n()
  const { account, accountType, editing, basic, errors, credErrors, saving, activeSection, models, ccg } = deps
  // Both decisions are the account type's (accountControl), not the editor's state.
  const schedulingConfigurable = computed(() => accountControl(accountType.value, 'schedulable').configurable)
  const autoDisableConfigurable = computed(() => accountControl(accountType.value, 'auto_disable').configurable)

  /** Checks done before the request; the section to show when one fails. */
  async function invalidSection(form: HTMLFormElement): Promise<EditorSection | 'native' | 'ccg' | null> {
    if (ccg.featureDirty.value && (ccg.featureBlocked.value || !validFeatureOverrides(ccg.featurePolicy.value!.overrides))) {
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
    if (ccg.saveBlocked.value) return 'ccg'
    const repeated = repeatedModel(deps.modelLimits.value)
    if (repeated) {
      errors.value = { model_limits: t('accounts.modelLimits.duplicate', { model: repeated }) }
      return 'scheduling'
    }
    if (deps.usageLimit?.invalid()) return 'scheduling'
    // Pending text-mode / draft edits are committed (and validated) before saving.
    return models.commitPending() ? null : 'models'
  }

  function requestBody(creds: Record<string, unknown>): Record<string, unknown> {
    if (ccg.autoModels.value && accountType.value?.plugin_key === 'ccgateway') models.setModels([...models.defaultModels.value])
    const body: Record<string, unknown> = {
      name: basic.name.trim(),
      group_ids: basic.group_ids,
      priority: Number(basic.priority),
      weight: Number(basic.weight),
      max_concurrency: Number(basic.max_concurrency),
      ...models.payload(),
      rpm_limit: Number(basic.rpm_limit) || 0,
      tpm_limit: Number(basic.tpm_limit) || 0,
      spm_limit: Number(basic.spm_limit) || 0,
      model_limits: fromCards(deps.modelLimits.value),
      environment: basic.environment
    }
    if (schedulingConfigurable.value) body.schedulable = basic.schedulable
    if (ccg.autoDisableEnabled.value === true && autoDisableConfigurable.value) body.auto_disable = basic.auto_disable
    if (ccgNeeded()) {
      body.settings = { locale: deps.settings.locale, timezone: deps.settings.timezone }
      body.auto_models = automaticModels()
      // Retired keys an older save may hold are dropped (the core ignores them).
      if (editing.value && ccg.featureDirty.value) {
        body.cc_feature_policy = { ...ccg.featurePolicy.value!, overrides: savedOverrides(ccg.featurePolicy.value!.overrides) }
      }
    }
    // Exactly one of proxy_id / proxy_url (CONTRACTS §21.4: both is a conflict).
    if (ccg.proxyUrlToSend.value) body.proxy_url = ccg.proxyUrlToSend.value
    else body.proxy_id = basic.proxy_id
    if (accountType.value && !account.value?.orphaned) body.credentials = creds
    return body
  }

  /** CCGateway accounts (managed and apikey) carry settings and need a proxy. */
  const ccgNeeded = () => accountType.value?.plugin_key === 'ccgateway'
  const automaticModels = () => ccgNeeded() && ccg.autoModels.value

  async function submit(body: Record<string, unknown>): Promise<Account> {
    if (editing.value) return api.patch<Account>(`/accounts/${account.value!.id}`, body)
    // The account type is (plugin_key, type); accounts have no platform.
    body.plugin_key = accountType.value!.plugin_key
    body.type = accountType.value!.type
    // A new Claude Code account adopts its authorized draft container.
    const draft = ccg.draft.value ? ccg.draftKey.value : null
    if (draft) body[ccg.preparationUrl.value ? 'preparation_key' : 'ccgateway_runtime'] = draft
    const created = await api.post<Account>('/accounts', body)
    if (draft) ccg.adopt()
    return created
  }

  function showSaveError(e: unknown) {
    if (reasonOf(e) === 'feature_revision_conflict') {
      errors.value = { cc_feature_policy: t('ccgateway.layers.conflict') }
      activeSection.value = 'cc_features'
      return
    }
    // The draft was refused (gone, or no longer signed in): back to the authorization steps.
    const ccgReason = ccg.draft.value ? reasonOf(e) : ''
    if (ccgReason === 'draft_not_found' || ccgReason === 'draft_not_authorized') {
      ccg.rejected(ccgReason)
      toast(t(`ccgateway.reason.${ccgReason}`), 'error')
      ccg.showAuth()
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
    if (problem === 'ccg') return void ccg.showAuth()
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
      if (deps.usageLimit && result?.id) {
        // The account is saved either way: a refused limit is reported, not retried
        // (re-submitting a new account would create it twice).
        try {
          await deps.usageLimit.save(result)
        } catch (e) {
          toast(t('accounts.usageLimit.saveFailed', { error: errorMessage(e) }), 'error')
        }
      }
      deps.saved(result)
    } catch (e) {
      showSaveError(e)
    } finally {
      saving.value = false
    }
  }

  return { save }
}
