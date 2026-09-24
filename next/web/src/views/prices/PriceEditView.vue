<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, api } from '@sub2api/host'
import { SBadge, SButton, SCard, SField, SIcon, SPageHeader, SSpinner, SSwitch, confirm, toast } from '@sub2api/ui'
import type { Price, PriceValidateResult } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { errorMessage, fieldErrors, notifyError } from '@/utils/errors'
import { formatDateTime, formatMoney } from '@/utils/format'
import ExprHistoryModal from './ExprHistoryModal.vue'
import PriceTrialPanel from './PriceTrialPanel.vue'
import VisualExprEditor from './VisualExprEditor.vue'
import { issueText, type Issue } from './issues'
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
const exprView = ref<'visual' | 'source'>('visual')
const sourceText = ref('')
const notVisual = ref(false)
const errors = ref<Record<string, string>>({})
const historyOpen = ref(false)

const readonly = computed(() => !auth.has('price:manage'))
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
  exprView.value = 'visual'
  sourceText.value = ''
  notVisual.value = false
  errors.value = {}
  validation.value = null
  validationError.value = ''
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

const payload = computed<{ mode: PriceMode; config: Record<string, unknown>; expression: string }>(() => {
  if (mode.value === 'per_request') {
    return { mode: 'per_request', config: { price: num(perRequest.value) }, expression: perRequestExpr(perRequest.value) }
  }
  if (mode.value === 'per_token') {
    const cfg = tokenPricesFrom(perToken)
    return { mode: 'per_token', config: compactPrices(cfg), expression: perTokenExpr(cfg) }
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

function toSource() {
  if (exprView.value === 'source') return
  sourceText.value = visualExpr(normalizeVisual(visual.value))
  exprView.value = 'source'
}

function toVisual() {
  if (exprView.value === 'visual') return
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

interface ValidationView {
  ok: boolean
  expression?: string
  errors: Issue[]
  warnings: Issue[]
  cost_per_million_input?: string | number
}

const validation = ref<ValidationView | null>(null)
const validationError = ref('')
const validating = ref(false)
let vSeq = 0
let vTimer: ReturnType<typeof setTimeout> | undefined

async function validateNow(): Promise<ValidationView | null> {
  clearTimeout(vTimer)
  const body = { ...payload.value }
  if (!body.expression.trim() || localIssues.value.length) {
    validation.value = null
    return null
  }
  const my = ++vSeq
  validating.value = true
  try {
    const r = await api.post<PriceValidateResult & { cost_per_million_input?: string }>('/prices/validate', body)
    if (my === vSeq) {
      validation.value = { ...r, errors: (r?.errors || []) as Issue[], warnings: (r?.warnings || []) as Issue[] }
      validationError.value = ''
    }
    return validation.value
  } catch (e) {
    if (my === vSeq) {
      validation.value = null
      validationError.value = errorMessage(e)
    }
    return null
  } finally {
    if (my === vSeq) validating.value = false
  }
}

watch(
  payload,
  () => {
    clearTimeout(vTimer)
    vTimer = setTimeout(validateNow, 500)
  },
  { deep: true, immediate: true }
)
onBeforeUnmount(() => clearTimeout(vTimer))

/** Server-normalized expression when it differs from the locally generated one. */
const serverExpr = computed(() => {
  const e = validation.value?.expression
  return e && e.trim() !== payload.value.expression.trim() ? e : ''
})

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
      const d = e.details || {}
      if (Array.isArray(d.errors) || Array.isArray(d.warnings)) {
        validation.value = {
          ok: !(d.errors?.length > 0),
          expression: d.expression,
          errors: d.errors || [],
          warnings: d.warnings || []
        }
      }
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
    const fe = fieldErrors(e)
    errors.value = fe
    if (!Object.keys(fe).length) notifyError(e)
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

// Declared last: load() -> resetForm() touches the validation state above.
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
        <button class="btn btn-ghost btn-sm !px-1.5" :title="t('common.back')" @click="router.push('/prices')">
          <SIcon name="arrow-left" class="h-4 w-4" />
        </button>
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

    <p
      v-if="syncedNotice && !loading"
      class="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:bg-sky-900/20 dark:text-sky-200"
      data-testid="price-synced-notice"
    >
      {{ syncedNotice }}
    </p>

    <div v-if="loading" class="py-16 text-center"><SSpinner size="lg" /></div>
    <template v-else>
      <!-- basic -->
      <SCard :title="t('prices.basic')">
        <p class="mb-4 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-800 dark:bg-primary-900/20 dark:text-primary-200">{{ t('prices.scopeNote') }}</p>
        <div class="grid gap-4 md:grid-cols-2">
          <SField :label="t('prices.model')" :hint="t('prices.modelHint')" :error="errors.model" required>
            <input v-model.trim="form.model" class="input font-mono" placeholder="claude-sonnet-4-5" :disabled="readonly" />
          </SField>
          <SField :label="t('common.note')" :error="errors.note">
            <input v-model="form.note" class="input" :disabled="readonly" />
          </SField>
          <SField :label="t('common.status')">
            <div class="pt-2"><SSwitch v-model="form.enabled" :disabled="readonly" :label="form.enabled ? t('common.enabled') : t('common.disabled')" /></div>
          </SField>
        </div>
        <dl v-if="price" class="kv mt-4 border-t border-gray-100 pt-4 dark:border-dark-700">
          <dt>{{ t('prices.exprHash') }}</dt>
          <dd class="flex flex-wrap items-center gap-2">
            <code class="font-mono text-xs">{{ price.expr_hash || '—' }}</code>
            <span class="muted text-xs">v{{ price.expr_version || 1 }}</span>
            <button v-if="price.expr_hash" class="link text-xs" @click="historyOpen = true">{{ t('prices.viewHistory') }}</button>
          </dd>
          <template v-if="price.updated_at">
            <dt>{{ t('common.updatedAt') }}</dt>
            <dd>{{ formatDateTime(price.updated_at) }}</dd>
          </template>
        </dl>
      </SCard>

      <!-- mode + editor -->
      <SCard :title="t('prices.billingMode')">
        <template #actions>
          <div v-if="mode === 'expression'" class="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-dark-600">
            <button
              type="button"
              class="px-3 py-1 text-xs"
              :class="exprView === 'visual' ? 'bg-primary-500 text-white' : 'text-gray-600 dark:text-gray-300'"
              @click="toVisual"
            >
              {{ t('prices.view.visual') }}
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs"
              :class="exprView === 'source' ? 'bg-primary-500 text-white' : 'text-gray-600 dark:text-gray-300'"
              @click="toSource"
            >
              {{ t('prices.view.source') }}
            </button>
          </div>
        </template>
        <div class="mb-4 flex flex-wrap gap-5">
          <label v-for="m in ['per_request', 'per_token', 'expression'] as const" :key="m" class="flex items-center gap-2 text-sm">
            <input v-model="mode" type="radio" class="checkbox !rounded-full" :value="m" :disabled="readonly" />
            {{ t(`prices.mode.${m}`) }}
          </label>
        </div>
        <p class="muted mb-4 text-xs">{{ t(`prices.modeHint.${mode}`) }}</p>

        <div v-if="mode === 'per_request'" class="max-w-xs">
          <SField :label="t('prices.perRequestPrice')" :error="errors['config.price']">
            <input v-model.number="perRequest" type="number" min="0" step="any" class="input" :disabled="readonly" />
          </SField>
        </div>

        <div v-else-if="mode === 'per_token'">
          <p class="section-title">{{ t('prices.perMillion') }}</p>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <label v-for="k in TOKEN_VARS" :key="k" class="text-xs">
              <span class="muted">{{ t(`prices.vars.${k}`) }}</span>
              <input
                v-model.number="perToken[k]"
                type="number"
                min="0"
                step="any"
                class="input mt-1"
                :placeholder="CACHE_VARS.includes(k) ? t('prices.unsetPlaceholder') : '0'"
                :disabled="readonly"
              />
            </label>
          </div>
          <p class="input-hint">{{ t('prices.cacheUnsetHint') }}</p>
        </div>

        <template v-else>
          <div v-if="notVisual" class="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            {{ t('prices.notVisual') }}
          </div>
          <VisualExprEditor v-if="exprView === 'visual'" v-model="visual" :disabled="readonly" />
          <SField v-else :label="t('prices.expression')" :error="errors.expression" :hint="t('prices.sourceHint')">
            <textarea
              v-model="sourceText"
              rows="8"
              spellcheck="false"
              class="input font-mono text-xs"
              :readonly="readonly"
            />
          </SField>
        </template>

        <div v-if="mode !== 'expression' || exprView === 'visual'" class="mt-4">
          <p class="muted mb-1 text-xs">{{ t('prices.generated') }}</p>
          <pre class="code-block">{{ payload.expression }}</pre>
          <template v-if="serverExpr && mode !== 'expression'">
            <p class="muted mb-1 mt-2 text-xs">{{ t('prices.serverGenerated') }}</p>
            <pre class="code-block">{{ serverExpr }}</pre>
          </template>
          <p v-if="errors.expression" class="input-error-text">{{ errors.expression }}</p>
        </div>
      </SCard>

      <!-- validation -->
      <SCard :title="t('prices.validate.title')">
        <template #actions><SSpinner v-if="validating" size="sm" /></template>
        <ul v-if="localIssues.length" class="space-y-1 text-sm text-red-600 dark:text-red-400">
          <li v-for="(x, i) in localIssues" :key="i">✕ {{ x }}</li>
        </ul>
        <p v-else-if="validationError" class="text-sm text-red-600 dark:text-red-400">{{ validationError }}</p>
        <div v-else-if="validation" class="space-y-1 text-sm">
          <p v-if="validation.ok && !validation.errors.length" class="text-emerald-600 dark:text-emerald-400">✓ {{ t('prices.validate.ok') }}</p>
          <p v-for="(x, i) in validation.errors" :key="'e' + i" class="text-red-600 dark:text-red-400">✕ {{ issueText(x) }}</p>
          <p v-if="validation.cost_per_million_input !== undefined && validation.cost_per_million_input !== null" class="muted">
            {{ t('prices.validate.costPerMillion', { cost: formatMoney(validation.cost_per_million_input) }) }}
          </p>
          <p v-for="(x, i) in validation.warnings" :key="'w' + i" class="text-amber-600 dark:text-amber-400">⚠ {{ issueText(x) }}</p>
        </div>
        <p v-else class="muted text-sm">{{ t('prices.validate.pending') }}</p>
      </SCard>

      <!-- trial -->
      <SCard :title="t('prices.trial.title')">
        <PriceTrialPanel :source="previewSource" />
      </SCard>
    </template>

    <ExprHistoryModal v-model:open="historyOpen" :hash="price?.expr_hash" />
  </div>
</template>
