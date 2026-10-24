// Shared state of the request-policy layer cards (CONTRACTS §53, request
// levels): which policy the cards show (the draft, the draft merged over its
// parent, or the applied policy in a preview), where an edit goes, and whether
// a layer is editable or can be followed / customized. RequestPolicySettings
// builds it once and provides it; the billing, environment and prompt cards
// inject it, so `edit()` (and with it the "write only the fields this
// interaction set" rule) stays in one place.
import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SelectOption } from '@sub2api/ui'
import {
  customizeLayer, followLayer, layerCustomized, levelHasEnvironment, levelHasIdentity, levelHasPromptAndTools, levelOf,
  type FeatureLayer, type FeatureOverrides, type RequestLevel, type RequestPolicy
} from './requestPolicy'

type LockableLayer = 'identity' | 'environment' | 'prompt'

export interface PolicyLayers {
  /** The policy every card shows. */
  view: ComputedRef<RequestPolicy>
  /** Follow / customize switches: at a group or an account only, never in a preview. */
  toggles: ComputedRef<boolean>
  /** The form is disabled by its parent (read-only). */
  disabled: ComputedRef<boolean>
  modeOptions: ComputedRef<SelectOption[]>
  has: ComputedRef<{ identity: boolean; environment: boolean; prompt: boolean }>
  locked: (layer: LockableLayer) => boolean
  lockedText: (layer: LockableLayer) => string
  modeOf: (layer: FeatureLayer) => 'follow' | 'custom'
  modeLabel: (layer: FeatureLayer) => string
  setMode: (layer: FeatureLayer, mode: unknown) => void
  editable: (layer: FeatureLayer) => boolean
  /** Which layer the applied values came from (account previews). */
  layerOrigin: (layer: FeatureLayer) => string | undefined
  /** Origin of one field, for the matrix rows of the environment card. */
  fieldOrigin: (key: string) => string | undefined
  /** Writes only the fields `change` sets: into the overrides (group, account) or the policy (global). */
  edit: (change: (draft: FeatureOverrides) => void) => void
}

const KEY: InjectionKey<PolicyLayers> = Symbol('policyLayers')

const layerKeys: Record<FeatureLayer, string[]> = {
  level: ['level'],
  billing: ['build_billing_entrypoint', 'build_billing_sources.'],
  environment: ['build_attachment_sources.', 'build_injection.attachments.'],
  prompt: ['build_injection.system_prompt', 'build_injection.tools.']
}

export interface PolicyLayersInput {
  /** The draft over its parent at a group or an account, else the global policy. */
  draft: () => RequestPolicy
  /** A read-only preview shows the applied policy instead of the draft. */
  effective?: () => RequestPolicy | undefined
  disabled?: () => boolean | undefined
  inherited?: () => RequestPolicy | undefined
  sources?: () => Record<string, string> | undefined
  showSavedWhenDisabled?: () => boolean | undefined
  overrides: () => FeatureOverrides
  setOverrides: (next: FeatureOverrides) => void
  setPolicy: (next: RequestPolicy) => void
}

/** Builds the layer context and provides it to the layer cards. */
export function providePolicyLayers(input: PolicyLayersInput): PolicyLayers {
  const { t } = useI18n()
  const layered = computed(() => !!input.inherited?.())
  const showEffective = computed(() => !!input.disabled?.() && !!input.effective?.() && !input.showSavedWhenDisabled?.())
  const view = computed<RequestPolicy>(() => (showEffective.value ? input.effective!()! : input.draft()))
  const level = computed(() => levelOf(view.value))
  const levelName = (l: RequestLevel) => t('ccgateway.levels.names.' + l)
  const has = computed(() => ({ identity: levelHasIdentity(level.value), environment: levelHasEnvironment(level.value), prompt: levelHasPromptAndTools(level.value) }))
  const locked = (layer: LockableLayer) =>
    (layer === 'identity' && !has.value.identity) || (layer === 'environment' && !has.value.environment) || (layer === 'prompt' && !has.value.prompt)
  const lockedText = (layer: LockableLayer) =>
    t(layer === 'identity' ? 'ccgateway.levels.lockedPlain' : 'ccgateway.levels.locked', { level: levelName(({ identity: 'micro', environment: 'low', prompt: 'high' } as const)[layer]) })
  const modeOptions = computed<SelectOption[]>(() => [{ value: 'follow', label: t('ccgateway.layers.followParent') }, { value: 'custom', label: t('ccgateway.layers.custom') }])
  const modeOf = (layer: FeatureLayer): 'follow' | 'custom' => (layerCustomized(input.overrides(), layer) ? 'custom' : 'follow')
  const modeLabel = (layer: FeatureLayer) => t('ccgateway.layers.layerMode', { layer: layer === 'level' ? t('ccgateway.levels.title') : t('ccgateway.levels.layerNames.' + layer) })
  function setMode(layer: FeatureLayer, mode: unknown) {
    const inherited = input.inherited?.()
    if (!inherited) return
    input.setOverrides(mode === 'custom' ? customizeLayer(input.overrides(), inherited, layer) : followLayer(input.overrides(), layer))
  }
  // Customizing copies every inherited value of the layer; following deletes them.
  const editable = (layer: FeatureLayer) => !input.disabled?.() && !showEffective.value && !locked(layer as LockableLayer) && (!layered.value || layerCustomized(input.overrides(), layer))
  // Every edit goes to the policy (global) or the overrides (group, account),
  // writing only the field it sets.
  function edit(change: (draft: FeatureOverrides) => void) {
    const draft: FeatureOverrides = JSON.parse(JSON.stringify(layered.value ? input.overrides() : view.value))
    change(draft)
    if (layered.value) input.setOverrides(draft)
    else input.setPolicy(draft as RequestPolicy)
  }
  const fieldOrigin = (key: string) => {
    const source = input.sources?.()?.[key]
    return source ? t('ccgateway.layers.source', { source: t('ccgateway.layers.' + source) }) : undefined
  }
  function layerOrigin(layer: FeatureLayer) {
    const found = new Set(Object.entries(input.sources?.() ?? {}).filter(([key]) => layerKeys[layer].some(prefix => (prefix.endsWith('.') ? key.startsWith(prefix) : key === prefix))).map(([, source]) => source))
    const list = ['global', 'group', 'account'].filter(source => found.has(source))
    return list.length ? t('ccgateway.layers.source', { source: list.map(source => t('ccgateway.layers.' + source)).join(t('ccgateway.levels.convertSummary.list')) }) : undefined
  }
  const ctx: PolicyLayers = {
    view, toggles: computed(() => layered.value && !showEffective.value), disabled: computed(() => !!input.disabled?.()), modeOptions, has, locked, lockedText,
    modeOf, modeLabel, setMode, editable, layerOrigin, fieldOrigin, edit
  }
  provide(KEY, ctx)
  return ctx
}

export function usePolicyLayers(): PolicyLayers {
  const ctx = inject(KEY)
  if (!ctx) throw new Error('usePolicyLayers() needs providePolicyLayers() above it')
  return ctx
}
