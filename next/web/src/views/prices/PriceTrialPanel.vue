<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SKeyValue, SSpinner } from '@sub2api/ui'
import type { PricePreviewResult } from '@/api/types'
import GroupPicker from '@/components/GroupPicker.vue'
import { useAuthStore } from '@/stores/auth'
import { formatMoney, formatNumber } from '@/utils/format'
import { errorMessage } from '@/utils/errors'
import { TOKEN_VARS } from './priceExpr'
import BillingBreakdown from './BillingBreakdown.vue'

// Trial calculation (POST /prices/preview) for the price being edited.
const props = defineProps<{
  /** {mode, config, expression} of the current editor state, or {price_id}. null = not previewable. */
  source: Record<string, unknown> | null
}>()
const { t } = useI18n()
const auth = useAuthStore()

const usage = reactive<Record<string, number | ''>>({ p: 100000, c: 2000, cr: 80000, cc: 0, cc1h: 0 })
const len = ref<number | ''>('')
const headers = ref<Record<string, string>>({})
const params = ref<Record<string, string>>({})
const at = ref('')
const groupId = ref<number | null>(null)

const result = ref<PricePreviewResult | null>(null)
const error = ref('')
const loading = ref(false)
let seq = 0
let timer: ReturnType<typeof setTimeout> | undefined

const defaultLen = computed(() => ['p', 'cr', 'cc', 'cc1h'].reduce((s, k) => s + (Number(usage[k]) || 0), 0))

function parseParam(v: string): unknown {
  try {
    return JSON.parse(v)
  } catch {
    return v
  }
}

async function run() {
  clearTimeout(timer)
  if (!props.source) return
  const my = ++seq
  loading.value = true
  error.value = ''
  const u: Record<string, number> = {}
  for (const k of TOKEN_VARS) u[k] = Number(usage[k]) || 0
  if (len.value !== '' && len.value !== null) u.len = Number(len.value) || 0
  const body: Record<string, unknown> = {
    ...props.source,
    usage: u,
    headers: headers.value,
    params: Object.fromEntries(Object.entries(params.value).map(([k, v]) => [k, parseParam(v)]))
  }
  if (at.value) {
    const d = new Date(at.value)
    if (!Number.isNaN(d.getTime())) body.at = d.toISOString()
  }
  if (groupId.value) body.group_id = groupId.value
  try {
    const r = await api.post<PricePreviewResult>('/prices/preview', body)
    if (my !== seq) return
    result.value = r
  } catch (e) {
    if (my !== seq) return
    result.value = null
    error.value = errorMessage(e)
  } finally {
    if (my === seq) loading.value = false
  }
}

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(run, 700)
}

watch(() => [props.source, { ...usage }, len.value, headers.value, params.value, at.value, groupId.value], schedule, { deep: true, immediate: true })
onBeforeUnmount(() => clearTimeout(timer))

// Extra response fields (B): base_cost, rate_multiplier, expression, expr_hash.
const extra = computed(() => (result.value || {}) as PricePreviewResult & { base_cost?: string; rate_multiplier?: string | number })
const resultLen = computed(() => {
  const v = (result.value?.breakdown as any)?.vars?.len
  if (v !== undefined && v !== null) return v
  return len.value === '' ? defaultLen.value : len.value
})
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <label v-for="k in TOKEN_VARS" :key="k" class="text-xs">
        <span class="muted">{{ t(`prices.vars.${k}`) }}</span>
        <input v-model.number="usage[k]" type="number" min="0" class="input mt-1 !py-1.5" />
      </label>
      <label class="text-xs">
        <span class="muted">{{ t('prices.trial.len') }}</span>
        <input v-model.number="len" type="number" min="0" class="input mt-1 !py-1.5" :placeholder="String(defaultLen)" />
      </label>
    </div>
    <div class="grid gap-4 lg:grid-cols-2">
      <div>
        <p class="input-label">{{ t('prices.trial.headers') }}</p>
        <SKeyValue v-model="headers" key-placeholder="anthropic-beta" value-placeholder="fast-mode" />
      </div>
      <div>
        <p class="input-label">{{ t('prices.trial.params') }}</p>
        <SKeyValue v-model="params" key-placeholder="service_tier" value-placeholder="priority" />
        <p class="input-hint">{{ t('prices.trial.paramsHint') }}</p>
      </div>
    </div>
    <div class="flex flex-wrap items-end gap-4">
      <label class="text-sm">
        <span class="input-label">{{ t('prices.trial.at') }}</span>
        <input v-model="at" type="datetime-local" class="input !w-56" />
      </label>
      <label v-if="auth.has('group:read')" class="text-sm">
        <span class="input-label">{{ t('prices.trial.group') }}</span>
        <div class="w-48"><GroupPicker :model-value="groupId" @update:model-value="groupId = typeof $event === 'number' ? $event : null" /></div>
      </label>
      <SButton size="sm" variant="primary" :loading="loading" :disabled="!source" @click="run">{{ t('prices.trial.calculate') }}</SButton>
    </div>

    <div class="rounded-xl border border-gray-200 p-4 dark:border-dark-700">
      <p v-if="!source" class="muted text-sm">{{ t('prices.trial.fixFirst') }}</p>
      <p v-else-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <div v-else-if="result" class="space-y-3 text-sm">
        <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span>
            <span class="muted">{{ t('prices.trial.cost') }}</span>
            <span class="ml-2 text-lg font-semibold text-gray-900 dark:text-white">{{ formatMoney(result.cost, 6) }}</span>
          </span>
          <span>
            <span class="muted">{{ t('prices.trial.tier') }}</span>
            <span class="ml-2 font-mono">{{ result.tier || '—' }}</span>
            <span class="muted ml-1">(len = {{ formatNumber(resultLen) }})</span>
          </span>
          <SSpinner v-if="loading" size="sm" />
        </div>
        <div v-if="result.rules?.length">
          <p class="muted mb-1">{{ t('prices.trial.rules') }}</p>
          <ul class="space-y-1">
            <li v-for="(r, i) in result.rules" :key="i" class="flex items-center gap-2">
              <SBadge :tone="r.matched ? 'success' : 'gray'">{{ r.matched ? '✓' : '✗' }}</SBadge>
              <code class="font-mono text-xs">{{ r.cond }}</code>
              <span class="muted">×{{ r.multiplier }}</span>
            </li>
          </ul>
        </div>
        <div>
          <p class="muted mb-1">{{ t('prices.trial.breakdown') }}</p>
          <BillingBreakdown :breakdown="result.breakdown" :rate-multiplier="extra.rate_multiplier" :total="result.cost" />
        </div>
      </div>
      <div v-else-if="loading" class="text-center"><SSpinner /></div>
      <p v-else class="muted text-sm">{{ t('prices.trial.empty') }}</p>
    </div>
  </div>
</template>
