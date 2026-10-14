<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SCode, SCopyButton, SDescItem, SDescriptions, SGrid, SHint, SIcon, SLink, SSectionTitle, SSpinner } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { ACCOUNT_PAGE_PERMS } from '@/composables/useOwnership'
import { formatNumber } from '@/utils/format'
import { errorMessage } from '@/utils/errors'
import BillingBreakdown from '@/views/prices/BillingBreakdown.vue'
import ExprHistoryModal from '@/views/prices/ExprHistoryModal.vue'
import { useAccountTypes } from '@/views/accounts/accountTypes'
import { billingTone, isConverted, knownUsageRounds, type UsageRow } from './usage'
import UsageTokenFacts from './UsageTokenFacts.vue'
import CacheWriteFacts from './CacheWriteFacts.vue'
import { componentCacheWriteMetrics, otherUsageMetrics } from './cacheWriteEvidence'

// Expanded usage record: billing detail (A.14), hooks, sticky, request info.
const props = defineProps<{ row: UsageRow; path?: string }>()
const { t, te } = useI18n()
const auth = useAuthStore()
const accountTypes = useAccountTypes()
if (auth.has(ACCOUNT_PAGE_PERMS)) accountTypes.load()

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
const knownRounds = computed(() => knownUsageRounds(u.value))
const otherMetrics = computed(() => otherUsageMetrics(u.value.metrics))
const bd = computed<Record<string, any>>(() => (u.value.billing_detail as Record<string, any>) || {})
const componentCacheFacts = computed(() => componentCacheWriteMetrics(bd.value).filter(item => !knownRounds.value.length || item.kind !== 'replacement'))
const breakdown = computed<Record<string, any>>(() => bd.value.breakdown || {})
const vars = computed<Record<string, any>>(() => breakdown.value.vars || {})
const tierName = computed(() => u.value.matched_tier || bd.value.tier || '')
const rules = computed<Array<{ cond: string; multiplier: number | string; matched: boolean }>>(() =>
  Array.isArray(bd.value.rules) ? bd.value.rules : []
)
const ledgerId = computed(() => u.value.ledger_id ?? bd.value.ledger_id ?? null)
const rate = computed(() => bd.value.rate_multiplier ?? u.value.rate_multiplier ?? null)
const exprVersion = computed(() => bd.value.expr_version)
const billingInputs = computed(() => [
  ...Object.entries(bd.value.inputs?.params || {}).map(([key, value]) => ({ name: `param("${key}")`, value })),
  ...Object.entries(bd.value.inputs?.headers || {}).map(([key, value]) => ({ name: `header("${key}")`, value }))
])

function factValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

const hooks = computed(() => u.value.hook_decisions || [])

function statusLabel(s: string) {
  return te(`usage.billing.status.${s}`) ? t(`usage.billing.status.${s}`) : s
}
</script>

<template>
  <div class="usage-detail bg-surface-2/60 p-4 md:p-6">
    <div v-if="loading" class="py-4 text-center"><SSpinner /></div>
    <SHint v-if="error" tone="danger" class="mb-2">{{ error }}</SHint>
    <SGrid :cols="1" :gap="6" lg-template="3fr 2fr">
      <!-- billing -->
      <section class="min-w-0 rounded-xl border border-line bg-surface p-4">
        <SSectionTitle :title="t('usage.billing.title')" />
        <SDescriptions dense>
          <SDescItem :label="t('usage.billing.price')"><div class="flex flex-wrap items-center gap-2">
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
          </div></SDescItem>

          <template v-if="u.expr_hash">
            <SDescItem :label="t('prices.expression')"><div class="flex flex-wrap items-center gap-2">
              <span v-if="exprVersion !== undefined">v{{ exprVersion }}</span>
              <SCode inline :title="u.expr_hash" :text="t('usage.billing.hash', { hash: u.expr_hash.slice(0, 8) })" />
              <SLink v-if="auth.has('price:read')" as="button" class="text-xs" @click="historyOpen = true">{{
                t('prices.viewHistory')
              }}</SLink>
            </div></SDescItem>
          </template>

          <template v-if="u.billing_mode">
            <SDescItem :label="t('prices.modeCol')">{{ te(`prices.mode.${u.billing_mode}`) ? t(`prices.mode.${u.billing_mode}`) : u.billing_mode }}</SDescItem>
          </template>

          <template v-if="tierName">
            <SDescItem :label="t('usage.billing.tier')">
              <span class="font-mono">{{ tierName }}</span>
              <SHint v-if="vars.len !== undefined" inline size="xs" class="ml-1"> ({{ t('usage.billing.len', { n: formatNumber(vars.len) }) }}) </SHint>
            </SDescItem>
          </template>

          <template v-if="rules.length">
            <SDescItem :label="t('usage.billing.rules')">
              <ul class="space-y-1">
                <li v-for="(r, i) in rules" :key="i" class="flex flex-wrap items-center gap-2">
                  <SCode inline :text="r.cond" />
                  <span>×{{ r.multiplier }}</span>
                  <SBadge :tone="r.matched ? 'success' : 'gray'">
                    <SIcon :name="r.matched ? 'check' : 'x'" class="h-3 w-3" />{{ r.matched ? t('usage.billing.matched') : t('usage.billing.notMatched') }}
                  </SBadge>
                </li>
              </ul>
            </SDescItem>
          </template>

          <template v-if="billingInputs.length">
            <SDescItem :label="t('usage.billing.inputs')"><div class="space-y-1">
              <div v-for="input in billingInputs" :key="input.name" class="break-all font-mono text-xs">
                {{ input.name }} = {{ factValue(input.value) }}
              </div>
            </div></SDescItem>
          </template>

          <SDescItem :label="t('usage.billing.breakdown')">
            <BillingBreakdown
              v-if="Object.keys(breakdown).length || u.total_cost"
              :breakdown="breakdown"
              :rate-multiplier="rate"
              :total="u.total_cost"
              :rules="rules"
              :cache-write-labels="{ default: t('usage.tokens.cacheDefaultBucket'), oneHour: t('usage.tokens.cache1hBucket') }"
            />
            <SHint v-else inline>—</SHint>
          </SDescItem>

          <SDescItem :label="t('usage.billing.statusLabel')"><div class="flex flex-wrap items-center gap-2">
            <SBadge :tone="billingTone(u.billing_status)">{{ statusLabel(u.billing_status) }}</SBadge>
            <SHint v-if="ledgerId" inline size="xs">{{ t('usage.billing.ledger', { id: ledgerId }) }}</SHint>
          </div></SDescItem>
        </SDescriptions>
      </section>

      <!-- request -->
      <section class="min-w-0 space-y-5 rounded-xl border border-line bg-surface p-4">
        <div>
          <SSectionTitle :title="t('usage.request.title')" />
          <SDescriptions dense>
            <SDescItem :label="t('common.model')"><span class="font-mono text-xs">{{ u.model || '—' }}</span></SDescItem>
            <SDescItem :label="t('common.group')">{{ u.group_name || (u.group_id ? '#' + u.group_id : '—') }}</SDescItem>
            <template v-if="u.account_id || u.account_name">
              <SDescItem :label="t('common.account')">{{ u.account_name || '#' + u.account_id }}</SDescItem>
            </template>
            <SDescItem :label="t('usage.request.id')"><div class="flex items-center gap-1">
              <SCode inline class="min-w-0 break-all" :text="u.request_id" />
              <SCopyButton :text="u.request_id" icon-only class="shrink-0" />
            </div></SDescItem>
            <SDescItem :label="t('usage.request.clientId')"><div class="flex min-w-0 items-center gap-1" data-testid="detail-client-request-id">
              <template v-if="u.client_request_id">
                <SCode inline class="break-all" :text="u.client_request_id" />
                <SCopyButton :text="u.client_request_id" icon-only class="shrink-0" />
              </template>
              <SHint v-else inline :title="t('usage.request.clientIdNone')">—</SHint>
            </div></SDescItem>
            <template v-if="u.endpoint || u.protocol">
              <SDescItem :label="t('usage.request.endpoint')"><span class="font-mono text-xs">
                {{ u.endpoint || '—' }} <SHint inline size="xs">{{ u.protocol }}</SHint>
                <SHint v-if="u.platform" inline size="xs" class="font-sans"> · {{ t('common.platform') }} {{ u.platform }}</SHint>
              </span></SDescItem>
            </template>
            <SDescItem :label="t('usage.cols.accountType')">
              <template v-if="u.account_type">
                {{ accountTypes.typeLabel(u.plugin_key, u.account_type) }}
                <SHint inline size="xs"
                  >· {{ accountTypes.pluginName(u.plugin_key) }}
                  <span class="font-mono">({{ u.plugin_key }}/{{ u.account_type }})</span></SHint
                >
              </template>
              <SHint v-else inline>—</SHint>
            </SDescItem>
            <SDescItem :label="t('usage.cols.upstreamProtocol')"><div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs">{{ u.upstream_protocol || u.protocol || '—' }}</span>
              <SBadge v-if="isConverted(u)" tone="warning">{{ t('usage.converted') }}</SBadge>
              <SHint v-if="isConverted(u)" inline size="xs">{{ t('usage.convertedFrom', { protocol: u.protocol }) }}</SHint>
            </div></SDescItem>
            <template v-if="u.upstream_model && u.upstream_model !== u.model">
              <SDescItem :label="t('usage.request.upstreamModel')"><span class="font-mono text-xs">{{ u.upstream_model }}</span></SDescItem>
            </template>
            <template v-if="u.api_key_name || u.api_key_id">
              <SDescItem :label="t('usage.request.apiKey')">{{ u.api_key_name || '#' + u.api_key_id }}</SDescItem>
            </template>
            <SDescItem :label="t('usage.request.clientIP')"><span class="break-all font-mono text-xs" data-testid="detail-client-ip">{{ u.client_ip || '—' }}</span></SDescItem>
            <SDescItem :label="t('usage.request.userAgent')"><span class="break-all text-xs">{{ u.user_agent || '—' }}</span></SDescItem>
            <template v-if="u.node_id">
              <SDescItem :label="t('usage.request.node')"><span class="font-mono text-xs">{{ u.node_id }}</span></SDescItem>
            </template>
            <template v-if="u.attempts !== undefined">
              <SDescItem :label="t('usage.request.attempts')">{{ u.attempts }}</SDescItem>
            </template>
            <SDescItem :label="t('usage.request.statusCode')">{{ u.status_code || '—' }}</SDescItem>
            <SDescItem :label="t('usage.request.latency')">
              {{ formatNumber(u.latency_ms) }} ms
              <SHint v-if="u.first_token_ms" inline>· {{ t('usage.request.firstToken') }} {{ formatNumber(u.first_token_ms) }} ms</SHint>
            </SDescItem>
            <template v-if="!u.success && (u.error_type || u.error_message)">
              <SDescItem :label="t('usage.request.error')"><span class="break-words text-red-600 dark:text-red-400">
                <span class="font-mono text-xs">{{ u.error_type }}</span>
                <span v-if="u.error_message" class="block text-xs">{{ u.error_message }}</span>
              </span></SDescItem>
            </template>
          </SDescriptions>
        </div>

        <div>
          <SSectionTitle :title="t('usage.tokens.title')" />
          <div
            v-if="knownRounds.length"
            class="space-y-3"
            data-testid="known-usage-rounds"
          >
            <SHint tone="warning">
              {{ t('usage.tokens.incompleteRounds') }}
            </SHint>
            <div
              v-for="round in knownRounds"
              :key="round.round"
              data-testid="known-usage-round"
            >
              <h4 class="mb-2 text-sm font-medium">
                {{ t('usage.tokens.knownRound', { round: round.round }) }}
              </h4>
              <UsageTokenFacts :tokens="round.tokens" />
              <CacheWriteFacts :metrics="round.metrics" :has-cache-writes="!!(round.tokens.cache_creation_tokens || round.tokens.cache_creation_1h_tokens)" />
            </div>
          </div>
          <UsageTokenFacts
            v-else
            :tokens="u"
          />
          <CacheWriteFacts
            v-if="!knownRounds.length"
            :metrics="u.metrics"
            :has-cache-writes="!!(u.cache_creation_tokens || u.cache_creation_1h_tokens)"
          />
          <div
            v-for="item in componentCacheFacts"
            :key="`${item.kind}:${item.index}`"
            class="mt-3"
            data-testid="component-cache-write-facts"
          >
            <h4 class="text-sm font-medium">{{ t(`usage.cacheEvidence.component.${item.kind}`, { index: item.index }) }}</h4>
            <CacheWriteFacts :metrics="item.metrics" />
          </div>
          <SDescriptions v-if="Object.keys(otherMetrics).length" dense>
            <template v-for="(v, k) in otherMetrics" :key="k">
              <SDescItem><template #label><span class="font-mono text-xs">u("{{ k }}")</span></template>{{ factValue(v) }}</SDescItem>
            </template>
          </SDescriptions>
        </div>

        <div v-if="hooks.length">
          <SSectionTitle :title="t('usage.hooks.title')" />
          <ul class="space-y-1 text-sm">
            <li v-for="(h, i) in hooks" :key="i" class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs">{{ h.plugin_key }}/{{ h.hook_id }}</span>
              <SBadge
                :tone="['deny', 'reject', 'block', 'blocked'].includes(h.decision) ? 'danger' : h.decision === 'allow' ? 'success' : 'gray'"
              >
                {{ h.decision }}
              </SBadge>
              <SHint inline size="xs">{{ h.latency_ms }} ms</SHint>
              <span v-if="h.note" class="text-xs">{{ h.note }}</span>
            </li>
          </ul>
        </div>

        <div v-if="u.sticky_rule">
          <SSectionTitle :title="t('usage.sticky.title')" />
          <SDescriptions dense>
            <SDescItem :label="t('usage.sticky.rule')"><span class="font-mono text-xs">{{ u.sticky_rule }}</span></SDescItem>
            <SDescItem :label="t('usage.sticky.hit')">
              <SBadge :tone="u.sticky_hit ? 'success' : 'gray'">
                <SIcon :name="u.sticky_hit ? 'check' : 'x'" class="h-3 w-3" />{{ u.sticky_hit ? t('usage.sticky.hitYes') : t('usage.sticky.hitNo') }}
              </SBadge>
            </SDescItem>
          </SDescriptions>
        </div>
      </section>
    </SGrid>
    <SHint v-if="!u.success && u.billing_status === 'free'" size="xs" class="mt-3">{{ t('usage.billing.freeNote') }}</SHint>
    <ExprHistoryModal v-model:open="historyOpen" :hash="u.expr_hash" />
  </div>
</template>

