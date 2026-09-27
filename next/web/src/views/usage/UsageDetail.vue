<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SHint, SLink, SSectionTitle, SSpinner, toast } from '@sub2api/ui'
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
    <SHint v-if="error" tone="danger" class="mb-2">{{ error }}</SHint>
    <SGrid :cols="1" :gap="6" lg-template="3fr 2fr">
      <!-- billing -->
      <section>
        <SSectionTitle :title="t('usage.billing.title')" />
        <dl class="kv">
          <dt>{{ t('usage.billing.price') }}</dt>
          <dd class="flex flex-wrap items-center gap-2">
            <template v-if="u.price">
              <SLink v-if="auth.has('price:read')" :to="`/prices/${u.price.id}`" class="font-mono text-xs">
                {{ u.price.model }}
              </SLink>
              <span v-else class="font-mono text-xs">{{ u.price.model }}</span>
              <SBadge :tone="u.price.source === 'sync' ? 'info' : 'primary'">
                {{ te(`prices.source.${u.price.source}`) ? t(`prices.source.${u.price.source}`) : u.price.source }}
              </SBadge>
            </template>
            <template v-else-if="u.price_id">
              <SLink v-if="auth.has('price:read')" :to="`/prices/${u.price_id}`">#{{ u.price_id }}</SLink>
              <span v-else>#{{ u.price_id }}</span>
            </template>
            <SHint v-else inline>—</SHint>
          </dd>

          <template v-if="u.expr_hash">
            <dt>{{ t('prices.expression') }}</dt>
            <dd class="flex flex-wrap items-center gap-2">
              <span>v{{ exprVersion }}</span>
              <code class="font-mono text-xs" :title="u.expr_hash">hash {{ u.expr_hash.slice(0, 8) }}…</code>
              <SLink v-if="auth.has('price:read')" as="button" class="text-xs" @click="historyOpen = true">{{ t('prices.viewHistory') }}</SLink>
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
              <SHint inline size="xs" class="ml-1">
                (len = {{ lenParts.parts.map((x) => formatNumber(x)).join(' + ') }} = {{ formatNumber(lenParts.len) }}<template v-if="tierBound !== null">
                  ≤ {{ formatNumber(tierBound) }}</template>)
              </SHint>
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
            <SHint v-else inline>—</SHint>
          </dd>

          <dt>{{ t('usage.billing.statusLabel') }}</dt>
          <dd class="flex flex-wrap items-center gap-2">
            <SBadge :tone="billingTone(u.billing_status)">{{ statusLabel(u.billing_status) }}</SBadge>
            <SHint v-if="ledgerId" inline size="xs">{{ t('usage.billing.ledger', { id: ledgerId }) }}</SHint>
          </dd>
        </dl>
      </section>

      <!-- request -->
      <section class="space-y-5">
        <div>
          <SSectionTitle :title="t('usage.request.title')" />
          <dl class="kv">
            <dt>{{ t('usage.request.id') }}</dt>
            <dd class="flex items-center gap-1">
              <code class="font-mono text-xs">{{ u.request_id }}</code>
              <SButton variant="ghost" size="sm" class="!px-1 !py-0 text-xs" @click="copy(u.request_id)">{{ t('common.copy') }}</SButton>
            </dd>
            <dt>{{ t('usage.request.clientId') }}</dt>
            <dd class="flex min-w-0 items-center gap-1" data-testid="detail-client-request-id">
              <template v-if="u.client_request_id">
                <code class="break-all font-mono text-xs">{{ u.client_request_id }}</code>
                <SButton variant="ghost" size="sm" class="shrink-0 !px-1 !py-0 text-xs" @click="copy(u.client_request_id)">{{ t('common.copy') }}</SButton>
              </template>
              <SHint v-else inline :title="t('usage.request.clientIdNone')">—</SHint>
            </dd>
            <template v-if="u.endpoint || u.protocol">
              <dt>{{ t('usage.request.endpoint') }}</dt>
              <dd class="font-mono text-xs">
                {{ u.endpoint || '—' }} <SHint inline size="xs">{{ u.protocol }}</SHint>
                <SHint v-if="u.platform" inline size="xs" class="font-sans"> · {{ t('common.platform') }} {{ u.platform }}</SHint>
              </dd>
            </template>
            <dt>{{ t('usage.cols.accountType') }}</dt>
            <dd>
              <template v-if="u.account_type">
                {{ accountTypes.typeLabel(u.plugin_key, u.account_type) }}
                <SHint inline size="xs">· {{ accountTypes.pluginName(u.plugin_key) }} <span class="font-mono">({{ u.plugin_key }}/{{ u.account_type }})</span></SHint>
              </template>
              <SHint v-else inline>—</SHint>
            </dd>
            <dt>{{ t('usage.cols.upstreamProtocol') }}</dt>
            <dd class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs">{{ u.upstream_protocol || u.protocol || '—' }}</span>
              <SBadge v-if="isConverted(u)" tone="warning">{{ t('usage.converted') }}</SBadge>
              <SHint v-if="isConverted(u)" inline size="xs">{{ t('usage.convertedFrom', { protocol: u.protocol }) }}</SHint>
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
              <SHint v-if="u.first_token_ms" inline>· {{ t('usage.request.firstToken') }} {{ formatNumber(u.first_token_ms) }} ms</SHint>
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
          <SSectionTitle :title="t('usage.tokens.title')" />
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
          <SSectionTitle :title="t('usage.hooks.title')" />
          <ul class="space-y-1 text-sm">
            <li v-for="(h, i) in hooks" :key="i" class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs">{{ h.plugin_key }}/{{ h.hook_id }}</span>
              <SBadge :tone="['deny', 'reject', 'block', 'blocked'].includes(h.decision) ? 'danger' : h.decision === 'allow' ? 'success' : 'gray'">
                {{ h.decision }}
              </SBadge>
              <SHint inline size="xs">{{ h.latency_ms }} ms</SHint>
              <span v-if="h.note" class="text-xs">{{ h.note }}</span>
            </li>
          </ul>
        </div>

        <div v-if="u.sticky_rule">
          <SSectionTitle :title="t('usage.sticky.title')" />
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
    </SGrid>
    <SHint v-if="!u.success && u.billing_status === 'free'" size="xs" class="mt-3">{{ t('usage.billing.freeNote') }}</SHint>
    <ExprHistoryModal v-model:open="historyOpen" :hash="u.expr_hash" />
  </div>
</template>
