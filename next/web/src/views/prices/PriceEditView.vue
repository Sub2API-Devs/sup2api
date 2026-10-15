<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, api } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SCode, SDescItem, SDescriptions, SField, SGrid, SHint, SInput, SLink, SPageHeader, SRadioGroup, SSectionTitle, SSegmented, SSettingRow, SSpinner, SSwitch, STextarea, confirm, toast, type SelectOption } from '@sub2api/ui'
import type { Price } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import { applyFormError } from '@/utils/formErrors'
import { formatDateTime } from '@/utils/format'
import ExprHistoryModal from './ExprHistoryModal.vue'
import PriceTrialPanel from './PriceTrialPanel.vue'
import VisualExprEditor from './VisualExprEditor.vue'
import VideoPriceEditor from './VideoPriceEditor.vue'
import { emptyVideoPrice, readVideoPrice, videoExpression } from './videoPrice'
import { issueText, type Issue } from './issues'
import PriceValidationCard from './PriceValidationCard.vue'
import { usePriceValidation, type PricePayload } from './usePriceValidation'
import {
  CACHE_VARS,
  TOKEN_VARS,
  checkVisual,
  compactPrices,
  defaultVisual,
  hasVisualConfig,
  normalizeVisual,
  num,
  parseExpression,
  perRequestExpr,
  perTokenExpr,
  tokenPricesFrom,
  visualConfigForSave,
  visualExpr,
  type PriceMode,
  type TokenPrices,
  type VisualConfig
} from './priceExpr'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const priceId = computed(() => {
  const v = route.params.id
  const n = Number(Array.isArray(v) ? v[0] : v)
  return Number.isFinite(n) && n > 0 ? n : null
})

const loading = ref(false)
const saving = ref(false)
const price = ref<Price | null>(null)
const form = reactive({ model: '', note: '', enabled: true })
const mode = ref<PriceMode>('per_token')
const perRequest = ref<number | ''>(0.01)
const perToken = reactive<TokenPrices>({ p: 3, c: 15, cr: 0.3, cc: 3.75, cc1h: 6 })
const visual = ref<VisualConfig>(defaultVisual())
const video = ref(emptyVideoPrice())
const exprView = ref<'visual' | 'source' | 'video'>('visual')
const sourceText = ref('')
const notVisual = ref(false)
const errors = ref<Record<string, string>>({})
const historyOpen = ref(false)

const readonly = computed(() => !auth.has('price:manage'))
const MODES = ['per_request', 'per_token', 'expression'] as const
const modeOptions = computed(() => MODES.map((m) => ({ value: m, label: t(`prices.mode.${m}`) })))
const isSynced = computed(() => price.value?.source === 'sync')
const syncedNotice = computed(() => {
  const p = price.value
  if (!p || p.source !== 'sync') return ''
  return t('prices.syncedNotice', {
    source: p.sync_source_name || t('prices.syncedNoticeDeleted'),
    time: p.synced_at ? formatDateTime(p.synced_at) : '—'
  })
})

// ------------------------------------------------------------------ load

function resetForm() {
  price.value = null
  Object.assign(form, { model: '', note: '', enabled: true })
  mode.value = 'per_token'
  perRequest.value = 0.01
  Object.assign(perToken, { p: 3, c: 15, cr: 0.3, cc: 3.75, cc1h: 6 })
  visual.value = defaultVisual()
  video.value = emptyVideoPrice()
  exprView.value = 'visual'
  sourceText.value = ''
  notVisual.value = false
  errors.value = {}
  validator.reset()
}

function applyPrice(p: Price) {
  price.value = p
  Object.assign(form, { model: p.model, note: p.note || '', enabled: p.enabled })
  mode.value = p.mode
  sourceText.value = p.expression || ''
  notVisual.value = false
  exprView.value = 'visual'
  const cfg = p.config || {}
  const parsed = parseExpression(p.expression)
  if (p.mode === 'per_request') {
    perRequest.value = cfg.price !== undefined ? num(cfg.price) : parsed?.tiers[0]?.flat ?? 0
  } else if (p.mode === 'per_token') {
    const src = TOKEN_VARS.some((k) => cfg[k] !== undefined) ? cfg : parsed?.tiers[0]
    Object.assign(perToken, tokenPricesFrom(src))
  } else if (cfg.video) {
    video.value = readVideoPrice(cfg.video)
    exprView.value = 'video'
  } else if (hasVisualConfig(cfg)) {
    visual.value = normalizeVisual(cfg)
  } else if (parsed) {
    visual.value = parsed
  } else {
    visual.value = defaultVisual()
    exprView.value = 'source'
    notVisual.value = true
  }
}

async function load() {
  resetForm()
  if (!priceId.value) return
  loading.value = true
  try {
    applyPrice(await api.get<Price>(`/prices/${priceId.value}`))
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}

// ------------------------------------------------------------------ derived payload

const payload = computed<PricePayload & { mode: PriceMode }>(() => {
  if (mode.value === 'per_request') {
    return { mode: 'per_request', config: { price: num(perRequest.value) }, expression: perRequestExpr(perRequest.value) }
  }
  if (mode.value === 'per_token') {
    const cfg = tokenPricesFrom(perToken)
    return { mode: 'per_token', config: compactPrices(cfg), expression: perTokenExpr(cfg) }
  }
  if (exprView.value === 'video') {
    return { mode: 'expression', config: { video: video.value }, expression: videoExpression(video.value) }
  }
  if (exprView.value === 'visual') {
    return { mode: 'expression', config: visualConfigForSave(visual.value), expression: visualExpr(normalizeVisual(visual.value)) }
  }
  return { mode: 'expression', config: {}, expression: sourceText.value }
})

const localIssues = computed<string[]>(() => {
  if (mode.value === 'expression' && exprView.value === 'visual') return checkVisual(visual.value).map((x) => t(x.key, x.params || {}))
  if (!payload.value.expression.trim()) return [t('prices.local.emptyExpr')]
  return []
})

const previewSource = computed(() => (localIssues.value.length ? null : { ...payload.value }))

// ------------------------------------------------------------------ expression view toggle

const exprViewOptions = computed<SelectOption[]>(() => [
  { value: 'video', label: t('prices.video.title') },
  { value: 'visual', label: t('prices.view.visual') },
  { value: 'source', label: t('prices.view.source') }
])

function onExprView(v: unknown) {
  if (v === 'video') {
    exprView.value = 'video'
    notVisual.value = false
  } else if (v === 'visual') toVisual()
  else if (v === 'source') toSource()
}

function toSource() {
  if (exprView.value === 'source') return
  sourceText.value = payload.value.expression
  exprView.value = 'source'
}

function toVisual() {
  if (exprView.value === 'visual') return
  if (exprView.value === 'video') sourceText.value = payload.value.expression
  const parsed = parseExpression(sourceText.value)
  if (!parsed) {
    notVisual.value = true
    toast(t('prices.notVisual'), 'warning')
    return
  }
  visual.value = parsed
  notVisual.value = false
  exprView.value = 'visual'
}

// ------------------------------------------------------------------ validation

const validator = usePriceValidation(payload, localIssues)
const { validation, error: validationError, validating, serverExpr } = validator

// ------------------------------------------------------------------ actions

async function submit(body: Record<string, unknown>): Promise<void> {
  try {
    if (priceId.value) {
      const r = await api.patch<Price>(`/prices/${priceId.value}`, body)
      toast(t('common.saved'), 'success')
      if (r && r.id) applyPrice(r)
      else await load()
    } else {
      const r = await api.post<Price>('/prices', body)
      toast(t('common.created'), 'success')
      if (r?.id) router.replace(`/prices/${r.id}`)
      else router.push('/prices')
    }
  } catch (e) {
    if (e instanceof ApiError && e.code === 'invalid_argument') {
      const d = e.details
      validator.showSaveIssues(d)
      // Big-cost warning: ask, then resend the same body with confirm=true.
      if (d.confirmation_required && !body.confirm) {
        const list = ((d.warnings || []) as Issue[]).map(issueText).join('\n')
        const ok = await confirm({
          title: t('prices.validate.warnTitle'),
          message: t('prices.validate.warnConfirm', { list: list || e.message }),
          danger: true
        })
        if (ok) await submit({ ...body, confirm: true })
        return
      }
    }
    applyFormError(e, errors)
  }
}

async function save() {
  if (readonly.value) return
  errors.value = {}
  if (!form.model.trim()) {
    errors.value = { model: t('common.required') }
    return
  }
  // Prices match complete model ids exactly (same rule as the server).
  if (!/^[A-Za-z0-9._:/@+-]{1,200}$/.test(form.model.trim())) {
    errors.value = { model: t('prices.modelInvalid') }
    return
  }
  if (localIssues.value.length) {
    toast(localIssues.value[0], 'error')
    return
  }
  saving.value = true
  try {
    await submit({
      model: form.model.trim(),
      mode: payload.value.mode,
      config: payload.value.config,
      expression: payload.value.expression,
      enabled: form.enabled,
      note: form.note
    })
  } finally {
    saving.value = false
  }
}

watch(priceId, load, { immediate: true })

const title = computed(() => {
  if (!priceId.value) return t('prices.newTitle')
  const p = price.value
  return p ? t('prices.editTitle', { name: p.model }) : t('prices.editTitleShort')
})
</script>

<template>
  <div class="space-y-5">
    <SPageHeader :title="title">
      <template #before>
        <SButton variant="ghost" size="sm" :title="t('common.back')" :aria-label="t('common.back')" icon-only icon="arrow-left" @click="router.push('/prices')" />
      </template>
      <template #title-extra>
        <SBadge v-if="price" :tone="isSynced ? 'info' : 'primary'" data-testid="price-edit-source">
          {{ isSynced && price.sync_source_name ? t('prices.sourceSync', { name: price.sync_source_name }) : t(`prices.source.${isSynced ? 'sync' : 'manual'}`) }}
        </SBadge>
      </template>
      <template #actions>
        <template v-if="!readonly">
          <SButton @click="router.push('/prices')">{{ t('common.cancel') }}</SButton>
          <SButton variant="primary" :loading="saving" @click="save">{{ t('common.save') }}</SButton>
        </template>
      </template>
    </SPageHeader>

    <SAlert v-if="syncedNotice && !loading" tone="info" dense data-testid="price-synced-notice">{{ syncedNotice }}</SAlert>

    <SSpinner v-if="loading" size="lg" block />
    <template v-else>
      <!-- basic -->
      <SCard :title="t('prices.basic')">
        <SAlert tone="primary" dense class="mb-4">{{ t('prices.scopeNote') }}</SAlert>
        <SGrid :cols="1" :md-cols="2">
          <SField :label="t('prices.model')" :hint="t('prices.modelHint')" :error="errors.model" required>
            <SInput v-model.trim="form.model" mono placeholder="claude-sonnet-4-5" :disabled="readonly" />
          </SField>
          <SField :label="t('common.note')" :error="errors.note">
            <SInput v-model="form.note" :disabled="readonly" />
          </SField>
        </SGrid>
        <SSettingRow :label="t('common.status')" dense flush class="mt-2" for="price-enabled">
          <SSwitch id="price-enabled" v-model="form.enabled" :disabled="readonly" :label="form.enabled ? t('common.enabled') : t('common.disabled')" />
        </SSettingRow>
        <SDescriptions v-if="price" class="mt-4 border-t border-line pt-4" dense>
          <SDescItem :label="t('prices.exprHash')"><div class="flex flex-wrap items-center gap-2">
            <SCode inline :text="price.expr_hash || '—'" />
            <SHint inline size="xs">v{{ price.expr_version || 1 }}</SHint>
            <SLink v-if="price.expr_hash" as="button" class="text-xs" @click="historyOpen = true">{{ t('prices.viewHistory') }}</SLink>
          </div></SDescItem>
          <SDescItem v-if="price.updated_at" :label="t('common.updatedAt')">{{ formatDateTime(price.updated_at) }}</SDescItem>
        </SDescriptions>
      </SCard>

      <!-- mode + editor -->
      <SCard :title="t('prices.billingMode')">
        <template #actions>
          <SSegmented
            v-if="mode === 'expression'"
            :model-value="exprView"
            :options="exprViewOptions"
            size="sm"
            :aria-label="t('prices.billingMode')"
            data-testid="price-expr-view"
            @update:model-value="onExprView"
          />
        </template>
        <SRadioGroup :model-value="mode" :options="modeOptions" inline :disabled="readonly" class="mb-4" @update:model-value="mode = $event as PriceMode" />
        <SHint size="xs" class="mb-4">{{ t(`prices.modeHint.${mode}`) }}</SHint>

        <div v-if="mode === 'per_request'" class="max-w-xs">
          <SField :label="t('prices.perRequestPrice')" :error="errors['config.price']">
            <SInput v-model.number="perRequest" type="number" min="0" step="any" :disabled="readonly" />
          </SField>
        </div>

        <div v-else-if="mode === 'per_token'">
          <SSectionTitle tag="p">{{ t('prices.perMillion') }}</SSectionTitle>
          <SGrid :cols-base="2" :cols="3" :lg-cols="5" :gap="3">
            <label v-for="k in TOKEN_VARS" :key="k" class="text-xs">
              <SHint inline size="xs">{{ t(`prices.vars.${k}`) }}</SHint>
              <SInput
                v-model.number="perToken[k]"
                type="number"
                min="0"
                step="any"
                class="mt-1"
                :placeholder="CACHE_VARS.includes(k) ? t('prices.unsetPlaceholder') : '0'"
                :disabled="readonly"
              />
            </label>
          </SGrid>
          <SHint size="xs" class="mt-1">{{ t('prices.cacheUnsetHint') }}</SHint>
        </div>

        <template v-else>
          <SAlert v-if="notVisual" tone="warning" dense class="mb-3">{{ t('prices.notVisual') }}</SAlert>
          <VideoPriceEditor v-if="exprView === 'video'" v-model="video" :disabled="readonly" />
          <VisualExprEditor v-else-if="exprView === 'visual'" v-model="visual" :disabled="readonly" />
          <SField v-else :label="t('prices.expression')" :error="errors.expression" :hint="t('prices.sourceHint')">
            <STextarea
              v-model="sourceText"
              :rows="8"
              spellcheck="false"
              class="text-xs"
              mono
              :readonly="readonly"
            />
          </SField>
        </template>

        <div v-if="mode !== 'expression' || exprView !== 'source'" class="mt-4">
          <SHint size="xs" class="mb-1">{{ t('prices.generated') }}</SHint>
          <SCode :text="payload.expression" />
          <template v-if="serverExpr && mode !== 'expression'">
            <SHint size="xs" class="mb-1 mt-2">{{ t('prices.serverGenerated') }}</SHint>
            <SCode :text="serverExpr" />
          </template>
          <SHint v-if="errors.expression" tone="danger" size="xs" class="mt-1">{{ errors.expression }}</SHint>
        </div>
      </SCard>

      <PriceValidationCard :local-issues="localIssues" :validation="validation" :error="validationError" :validating="validating" />

      <!-- trial -->
      <SCard :title="t('prices.trial.title')">
        <PriceTrialPanel :source="previewSource" />
      </SCard>
    </template>

    <ExprHistoryModal v-model:open="historyOpen" :hash="price?.expr_hash" />
  </div>
</template>
