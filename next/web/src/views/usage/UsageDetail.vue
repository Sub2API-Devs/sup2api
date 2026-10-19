<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SCode, SCopyButton, SDescItem, SDescriptions, SGrid, SHint, SIcon, SIPAddress, SSectionTitle, SSpinner } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { ACCOUNT_PAGE_PERMS } from '@/composables/useOwnership'
import { formatNumber } from '@/utils/format'
import { errorMessage } from '@/utils/errors'
import { useAccountTypes } from '@/views/accounts/accountTypes'
import { factText, hookTone, isConverted, knownUsageRounds, type UsageRow } from './usage'
import UsageBillingFacts from './UsageBillingFacts.vue'
import UsageTokenFacts from './UsageTokenFacts.vue'
import CacheWriteFacts from './CacheWriteFacts.vue'
import { componentCacheWriteMetrics, otherUsageMetrics } from './cacheWriteEvidence'
import FailureDecisionDetails from '@/views/settings/FailureDecisionDetails.vue'
import type { FailureDecision } from '@/views/settings/failurePolicy'

// Expanded usage record: billing detail (A.14), request info, tokens, hooks, sticky.
const props = defineProps<{ row: UsageRow; path?: string }>()
const { t } = useI18n()
const auth = useAuthStore()
const accountTypes = useAccountTypes()
if (auth.has(ACCOUNT_PAGE_PERMS)) accountTypes.load()

const detail = ref<UsageRow | null>(null)
const loading = ref(false)
const error = ref('')

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
const componentCacheFacts = computed(() => componentCacheWriteMetrics(u.value.billing_detail).filter((item) => !knownRounds.value.length || item.kind !== 'replacement'))
const hooks = computed(() => u.value.hook_decisions || [])
const failureDecisions = computed<FailureDecision[]>(() => {
  try {
    const value: unknown = JSON.parse(u.value.anomalies?.failure_policy || '[]')
    return Array.isArray(value) ? value.filter(v => v && typeof v.action === 'string').slice(0, 10) : []
  } catch { return [] }
})
</script>

<template>
  <div class="usage-detail bg-surface-2/60 p-4 md:p-6">
    <SSpinner v-if="loading" block />
    <SHint v-if="error" tone="danger" class="mb-2">{{ error }}</SHint>
    <SGrid :cols="1" :gap="6" lg-template="3fr 2fr">
      <UsageBillingFacts :u="u" />

      <!-- request -->
      <section class="min-w-0 space-y-5 rounded-xl border border-line bg-surface p-4">
        <div>
          <SSectionTitle :title="t('usage.request.title')" />
          <SDescriptions dense>
            <SDescItem :label="t('common.model')"><span class="font-mono text-xs">{{ u.model || '—' }}</span></SDescItem>
            <SDescItem :label="t('common.group')">{{ u.group_name || (u.group_id ? '#' + u.group_id : '—') }}</SDescItem>
            <SDescItem v-if="u.account_id || u.account_name" :label="t('common.account')">{{ u.account_name || '#' + u.account_id }}</SDescItem>
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
            <SDescItem v-if="u.endpoint || u.protocol" :label="t('usage.request.endpoint')"><span class="font-mono text-xs">
                {{ u.endpoint || '—' }} <SHint inline size="xs">{{ u.protocol }}</SHint>
                <SHint v-if="u.platform" inline size="xs" class="font-sans"> · {{ t('common.platform') }} {{ u.platform }}</SHint>
              </span></SDescItem>
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
            <SDescItem v-if="u.upstream_model && u.upstream_model !== u.model" :label="t('usage.request.upstreamModel')"><span class="font-mono text-xs">{{ u.upstream_model }}</span></SDescItem>
            <SDescItem v-if="u.api_key_name || u.api_key_id" :label="t('usage.request.apiKey')">{{ u.api_key_name || '#' + u.api_key_id }}</SDescItem>
            <SDescItem :label="t('usage.request.clientIP')"><SIPAddress :value="u.client_ip" data-testid="detail-client-ip" /></SDescItem>
            <SDescItem :label="t('usage.request.userAgent')"><span class="break-all text-xs">{{ u.user_agent || '—' }}</span></SDescItem>
            <SDescItem v-if="u.node_id" :label="t('usage.request.node')"><span class="font-mono text-xs">{{ u.node_id }}</span></SDescItem>
            <SDescItem v-if="u.attempts !== undefined" :label="t('usage.request.attempts')">{{ u.attempts }}</SDescItem>
            <SDescItem :label="t('usage.request.statusCode')">{{ u.status_code || '—' }}</SDescItem>
            <SDescItem :label="t('usage.request.latency')">
              {{ formatNumber(u.latency_ms) }} ms
              <SHint v-if="u.first_token_ms" inline>· {{ t('usage.request.firstToken') }} {{ formatNumber(u.first_token_ms) }} ms</SHint>
            </SDescItem>
            <SDescItem v-if="!u.success && (u.error_type || u.error_message)" :label="t('usage.request.error')"><SHint tone="danger" size="xs" class="break-words">
                <span class="font-mono">{{ u.error_type }}</span>
                <span v-if="u.error_message" class="block">{{ u.error_message }}</span>
              </SHint></SDescItem>
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
            <SDescItem v-for="(v, k) in otherMetrics" :key="k" :value="factText(v)"><template #label><span class="font-mono text-xs">u("{{ k }}")</span></template></SDescItem>
          </SDescriptions>
        </div>

        <div v-if="hooks.length">
          <SSectionTitle :title="t('usage.hooks.title')" />
          <ul class="space-y-1 text-sm">
            <li v-for="(h, i) in hooks" :key="i" class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs">{{ h.plugin_key }}/{{ h.hook_id }}</span>
              <SBadge :tone="hookTone(h.decision)">{{ h.decision }}</SBadge>
              <SHint inline size="xs">{{ h.latency_ms }} ms</SHint>
              <span v-if="h.note" class="text-xs">{{ h.note }}</span>
            </li>
          </ul>
        </div>

        <div v-if="failureDecisions.length" data-testid="failure-decisions">
          <SSectionTitle :title="t('failurePolicy.decisions')" />
          <FailureDecisionDetails v-for="(decision, index) in failureDecisions" :key="index" :decision="decision" />
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
  </div>
</template>
