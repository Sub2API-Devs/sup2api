<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SSpinner, toast } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { copyText, formatNumber } from '@/utils/format'
import { errorMessage } from '@/utils/errors'
import BillingBreakdown from '@/views/prices/BillingBreakdown.vue'
import ExprHistoryModal from '@/views/prices/ExprHistoryModal.vue'
import { useAccountTypes } from '@/views/accounts/accountTypes'
import { billingTone, isConverted, type UsageRow } from './usage'

// Expanded usage record: billing detail (A.14), hooks, sticky, request info.
const props = defineProps<{ row: UsageRow; path?: string }>()
const { t, te } = useI18n()
const auth = useAuthStore()
const accountTypes = useAccountTypes()

const detail = ref<UsageRow | null>(null)
const loading = ref(false)
const error = ref('')
const historyOpen = ref(false)

onMounted(async () => {
  if (!props.path) return
  loading.value = true
  try {
    detail.value = await api.get<UsageRow>(props.path)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
})

const u = computed<UsageRow>(() => ({ ...props.row, ...(detail.value || {}) }))
const bd = computed<Record<string, any>>(() => (u.value.billing_detail as Record<string, any>) || {})
const breakdown = computed<Record<string, any>>(() => bd.value.breakdown || {})
const vars = computed<Record<string, any>>(() => breakdown.value.vars || bd.value.inputs || {})
const tierName = computed(() => u.value.matched_tier || bd.value.tier || '')
const rules = computed<Array<{ cond: string; multiplier: number | string; matched: boolean }>>(() =>
  Array.isArray(bd.value.rules) ? bd.value.rules : []
)
const ledgerId = computed(() => u.value.ledger_id ?? bd.value.ledger_id ?? null)
const rate = computed(() => bd.value.rate_multiplier ?? u.value.rate_multiplier ?? null)
const exprVersion = computed(() => bd.value.expr_version ?? 1)

const lenParts = computed(() => {
  const v = vars.value
  const parts = ['p', 'cr', 'cc', 'cc1h'].map((k) => Number(v[k]) || 0)
  return { parts, len: v.len !== undefined ? Number(v.len) : parts.reduce((a, b) => a + b, 0) }
})

/** Upper bound of the matched tier, if the breakdown lists tier boundaries. */
const tierBound = computed(() => {
  const tiers = breakdown.value.tiers
  if (!Array.isArray(tiers)) return null
  const tier = tiers.find((x: any) => x && typeof x === 'object' && x.name === tierName.value)
  const m = tier?.max_len ?? tier?.le ?? tier?.max
  return m === undefined || m === null ? null : Number(m)
})

const hooks = computed(() => u.value.hook_decisions || [])

function statusLabel(s: string) {
  return te(`usage.billing.status.${s}`) ? t(`usage.billing.status.${s}`) : s
}

async function copy(v: string) {
  if (await copyText(v)) toast(t('common.copied'), 'success')
}
</script>

<template>
  <div class="px-2 py-3">
    <div v-if="loading" class="py-4 text-center"><SSpinner /></div>
    <p v-if="error" class="mb-2 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <div class="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <!-- billing -->
      <section>
        <h4 class="section-title">{{ t('usage.billing.title') }}</h4>
        <dl class="kv">
          <dt>{{ t('usage.billing.price') }}</dt>
          <dd class="flex flex-wrap items-center gap-2">
            <template v-if="u.price">
              <RouterLink v-if="auth.has('price:read')" :to="`/prices/${u.price.id}`" class="link font-mono text-xs">
                {{ u.price.model_pattern }}
              </RouterLink>
              <span v-else class="font-mono text-xs">{{ u.price.model_pattern }}</span>
              <SBadge :tone="u.price.source === 'admin' ? 'primary' : 'purple'">
                {{ u.price.source === 'admin' ? t('prices.source.admin') : t('prices.source.plugin_default') }}
                <template v-if="u.price.plugin_key"> · {{ u.price.plugin_key }}</template>
              </SBadge>
            </template>
            <template v-else-if="u.price_id">
              <RouterLink v-if="auth.has('price:read')" :to="`/prices/${u.price_id}`" class="link">#{{ u.price_id }}</RouterLink>
              <span v-else>#{{ u.price_id }}</span>
            </template>
            <span v-else class="muted">—</span>
          </dd>

          <template v-if="u.expr_hash">
            <dt>{{ t('prices.expression') }}</dt>
            <dd class="flex flex-wrap items-center gap-2">
              <span>v{{ exprVersion }}</span>
              <code class="font-mono text-xs" :title="u.expr_hash">hash {{ u.expr_hash.slice(0, 8) }}…</code>
              <button v-if="auth.has('price:read')" class="link text-xs" @click="historyOpen = true">{{ t('prices.viewHistory') }}</button>
            </dd>
          </template>

          <template v-if="u.billing_mode">
            <dt>{{ t('prices.modeCol') }}</dt>
            <dd>{{ te(`prices.mode.${u.billing_mode}`) ? t(`prices.mode.${u.billing_mode}`) : u.billing_mode }}</dd>
          </template>

          <template v-if="tierName">
            <dt>{{ t('usage.billing.tier') }}</dt>
            <dd>
              <span class="font-mono">{{ tierName }}</span>
              <span class="muted ml-1 text-xs">
                (len = {{ lenParts.parts.map((x) => formatNumber(x)).join(' + ') }} = {{ formatNumber(lenParts.len) }}<template v-if="tierBound !== null">
                  ≤ {{ formatNumber(tierBound) }}</template>)
              </span>
            </dd>
          </template>

          <template v-if="rules.length">
            <dt>{{ t('usage.billing.rules') }}</dt>
            <dd>
              <ul class="space-y-1">
                <li v-for="(r, i) in rules" :key="i" class="flex flex-wrap items-center gap-2">
                  <code class="font-mono text-xs">{{ r.cond }}</code>
                  <span>×{{ r.multiplier }}</span>
                  <SBadge :tone="r.matched ? 'success' : 'gray'">{{ r.matched ? '✓ ' + t('usage.billing.matched') : '✗ ' + t('usage.billing.notMatched') }}</SBadge>
                </li>
              </ul>
            </dd>
          </template>

          <dt>{{ t('usage.billing.breakdown') }}</dt>
          <dd>
            <BillingBreakdown
              v-if="Object.keys(breakdown).length || u.total_cost"
              :breakdown="breakdown"
              :rate-multiplier="rate"
              :total="u.total_cost"
            />
            <span v-else class="muted">—</span>
          </dd>

          <dt>{{ t('usage.billing.statusLabel') }}</dt>
          <dd class="flex flex-wrap items-center gap-2">
            <SBadge :tone="billingTone(u.billing_status)">{{ statusLabel(u.billing_status) }}</SBadge>
            <span v-if="ledgerId" class="muted text-xs">{{ t('usage.billing.ledger', { id: ledgerId }) }}</span>
          </dd>
        </dl>
      </section>

      <!-- request -->
      <section class="space-y-5">
        <div>
          <h4 class="section-title">{{ t('usage.request.title') }}</h4>
          <dl class="kv">
            <dt>{{ t('usage.request.id') }}</dt>
            <dd class="flex items-center gap-1">
              <code class="font-mono text-xs">{{ u.request_id }}</code>
              <button class="btn btn-ghost btn-sm !px-1 !py-0 text-xs" @click="copy(u.request_id)">{{ t('common.copy') }}</button>
            </dd>
            <dt>{{ t('usage.request.clientId') }}</dt>
            <dd class="flex min-w-0 items-center gap-1" data-testid="detail-client-request-id">
              <template v-if="u.client_request_id">
                <code class="break-all font-mono text-xs">{{ u.client_request_id }}</code>
                <button class="btn btn-ghost btn-sm shrink-0 !px-1 !py-0 text-xs" @click="copy(u.client_request_id)">{{ t('common.copy') }}</button>
              </template>
              <span v-else class="muted" :title="t('usage.request.clientIdNone')">—</span>
            </dd>
            <template v-if="u.endpoint || u.protocol">
              <dt>{{ t('usage.request.endpoint') }}</dt>
              <dd class="font-mono text-xs">
                {{ u.endpoint || '—' }} <span class="muted">{{ u.protocol }}</span>
                <span v-if="u.platform" class="muted font-sans"> · {{ t('common.platform') }} {{ u.platform }}</span>
              </dd>
            </template>
            <dt>{{ t('usage.cols.accountType') }}</dt>
            <dd>
              <template v-if="u.account_type">
                {{ accountTypes.typeLabel(u.plugin_key, u.account_type) }}
                <span class="muted text-xs">· {{ accountTypes.pluginName(u.plugin_key) }} <span class="font-mono">({{ u.plugin_key }}/{{ u.account_type }})</span></span>
              </template>
              <span v-else class="muted">—</span>
            </dd>
            <dt>{{ t('usage.cols.upstreamProtocol') }}</dt>
            <dd class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs">{{ u.upstream_protocol || u.protocol || '—' }}</span>
              <SBadge v-if="isConverted(u)" tone="warning">{{ t('usage.converted') }}</SBadge>
              <span v-if="isConverted(u)" class="muted text-xs">{{ t('usage.convertedFrom', { protocol: u.protocol }) }}</span>
            </dd>
            <template v-if="u.upstream_model && u.upstream_model !== u.model">
              <dt>{{ t('usage.request.upstreamModel') }}</dt>
              <dd class="font-mono text-xs">{{ u.upstream_model }}</dd>
            </template>
            <template v-if="u.api_key_name || u.api_key_id">
              <dt>{{ t('usage.request.apiKey') }}</dt>
              <dd>{{ u.api_key_name || '#' + u.api_key_id }}</dd>
            </template>
            <dt>{{ t('usage.request.statusCode') }}</dt>
            <dd>{{ u.status_code || '—' }}</dd>
            <dt>{{ t('usage.request.latency') }}</dt>
            <dd>
              {{ formatNumber(u.latency_ms) }} ms
              <span v-if="u.first_token_ms" class="muted">· {{ t('usage.request.firstToken') }} {{ formatNumber(u.first_token_ms) }} ms</span>
            </dd>
            <template v-if="!u.success && (u.error_type || u.error_message)">
              <dt>{{ t('usage.request.error') }}</dt>
              <dd class="text-red-600 dark:text-red-400">
                <span class="font-mono text-xs">{{ u.error_type }}</span>
                <span v-if="u.error_message" class="block text-xs">{{ u.error_message }}</span>
              </dd>
            </template>
          </dl>
        </div>

        <div>
          <h4 class="section-title">{{ t('usage.tokens.title') }}</h4>
          <dl class="kv">
            <dt>{{ t('prices.vars.p') }}</dt>
            <dd>{{ formatNumber(u.input_tokens) }}</dd>
            <dt>{{ t('prices.vars.c') }}</dt>
            <dd>{{ formatNumber(u.output_tokens) }}</dd>
            <dt>{{ t('prices.vars.cr') }}</dt>
            <dd>{{ formatNumber(u.cache_read_tokens) }}</dd>
            <dt>{{ t('prices.vars.cc') }}</dt>
            <dd>{{ formatNumber(u.cache_creation_tokens) }}</dd>
            <template v-if="u.cache_creation_1h_tokens">
              <dt>{{ t('prices.vars.cc1h') }}</dt>
              <dd>{{ formatNumber(u.cache_creation_1h_tokens) }}</dd>
            </template>
            <template v-for="(v, k) in u.metrics || {}" :key="k">
              <dt class="font-mono text-xs">u("{{ k }}")</dt>
              <dd>{{ formatNumber(v as number) }}</dd>
            </template>
          </dl>
        </div>

        <div v-if="hooks.length">
          <h4 class="section-title">{{ t('usage.hooks.title') }}</h4>
          <ul class="space-y-1 text-sm">
            <li v-for="(h, i) in hooks" :key="i" class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs">{{ h.plugin_key }}/{{ h.hook_id }}</span>
              <SBadge :tone="['deny', 'reject', 'block', 'blocked'].includes(h.decision) ? 'danger' : h.decision === 'allow' ? 'success' : 'gray'">
                {{ h.decision }}
              </SBadge>
              <span class="muted text-xs">{{ h.latency_ms }} ms</span>
              <span v-if="h.note" class="text-xs">{{ h.note }}</span>
            </li>
          </ul>
        </div>

        <div v-if="u.sticky_rule">
          <h4 class="section-title">{{ t('usage.sticky.title') }}</h4>
          <dl class="kv">
            <dt>{{ t('usage.sticky.rule') }}</dt>
            <dd class="font-mono text-xs">{{ u.sticky_rule }}</dd>
            <dt>{{ t('usage.sticky.hit') }}</dt>
            <dd>
              <SBadge :tone="u.sticky_hit ? 'success' : 'gray'">{{ u.sticky_hit ? '✓ ' + t('usage.sticky.hitYes') : '✗ ' + t('usage.sticky.hitNo') }}</SBadge>
            </dd>
          </dl>
        </div>
      </section>
    </div>
    <p v-if="!u.success && u.billing_status === 'free'" class="muted mt-3 text-xs">{{ t('usage.billing.freeNote') }}</p>
    <ExprHistoryModal v-model:open="historyOpen" :hash="u.expr_hash" />
  </div>
</template>
