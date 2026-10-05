<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiBetaCatalog } from './betaCatalog'
import { defaultRequestPolicy, type BetaMapping, type RequestPolicy } from './requestPolicy'
const policy = defineModel<RequestPolicy>({ required: true })
const { t } = useI18n()
const search = ref('')
const envMappings = [
  {field: 'max_tokens', target: 'CLAUDE_CODE_MAX_OUTPUT_TOKENS'},
  {field: 'thinking.budget_tokens', target: 'MAX_THINKING_TOKENS / CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING'},
  {field: 'cache_control.ttl', target: 'CLAUDE_CODE_PROMPT_CACHE_TTL'},
  {field: 'tools[].defer_loading', target: 'ENABLE_TOOL_SEARCH / tool.describe'},
  {field: 'anthropic-beta', target: 'ANTHROPIC_BETAS'},
  {field: 'fine-grained-tool-streaming', target: 'CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING'},
  {field: 'context-1m', target: 'CLAUDE_CODE_DISABLE_1M_CONTEXT / CLAUDE_CODE_MAX_CONTEXT_TOKENS'},
  {field: 'output_config.format', target: '--json-schema / MAX_STRUCTURED_OUTPUT_RETRIES'},
  {field: 'output_config.effort / speed', target: '--effort / --settings fastMode'},
]
const bodyFeatures = [{"id": "model", "field": "model", "status": "adapted"}, {"id": "output", "field": "max_tokens", "status": "adapted"}, {"id": "stream", "field": "stream", "status": "adapted"}, {"id": "system", "field": "system", "status": "adapted"}, {"id": "history", "field": "messages", "status": "partial"}, {"id": "tools", "field": "tools / tool_choice", "status": "partial"}, {"id": "thinking", "field": "thinking", "status": "partial"}, {"id": "cache", "field": "cache_control", "status": "partial"}, {"id": "schema", "field": "output_config.format", "status": "adapted"}] as const
const catalog = computed(() => apiBetaCatalog.filter(name => name.includes(search.value.trim().toLowerCase())))
function add() { policy.value.betas.push({ name: '', mapping: 'forward' }) }
function mappings(name: string): BetaMapping[] {
  const options: BetaMapping[] = ['native', 'forward']
  if (name === 'fast-mode-2026-02-01') options.push('fast')
  if (name === 'fine-grained-tool-streaming-2025-05-14') options.push('fine_grained_tools')
  if (name === 'advanced-tool-use-2025-11-20') options.push('tool_search')
  return options
}
function feature(name: string) {
  if (name.startsWith('claude-code-') || name.startsWith('oauth-')) return 'native'
  if (name.startsWith('interleaved-thinking-')) return 'thinking'
  if (name.startsWith('fine-grained-tool-streaming-')) return 'streaming'
  if (name.startsWith('context-1m-')) return 'context'
  if (name.startsWith('fast-mode-')) return 'fast'
  if (name.startsWith('advanced-tool-use-')) return 'search'
  if ((name.includes('cache') || name.includes('caching'))) return 'cache'
  if (name.startsWith('structured-outputs-')) return 'schema'
  if (name.startsWith('output-128k-')) return 'output'
  if (name.includes('thinking')) return 'thinking'
  if (name.startsWith('token-efficient-tools-')) return 'tools'
  if (name.startsWith('model-context-window-')) return 'overflow'
  if (name.startsWith('mid-conversation-output-config-')) return 'effort'
  return 'custom'
}
</script>
<template>
  <section
    class="space-y-5 rounded-xl border border-gray-200 p-4 dark:border-dark-700"
    data-testid="request-policy"
  >
    <div>
      <h4 class="font-semibold">
        {{ t('ccgateway.policy.title') }}
      </h4>
      <p class="mt-1 text-sm text-gray-500">
        {{ t('ccgateway.policy.hint') }}
      </p>
    </div>
    <div>
      <h5 class="font-semibold">
        {{ t('ccgateway.policy.bodyTitle') }}
      </h5>
      <p class="mt-1 text-xs leading-5 text-gray-500">
        {{ t('ccgateway.policy.bodyHint') }}
      </p>
    </div>
    <div class="grid gap-3 lg:grid-cols-2">
      <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-dark-700">
        <input
          v-model="policy.allow_fast"
          type="checkbox"
          class="mt-1"
          data-testid="allow-fast"
        >
        <span class="min-w-0"><span class="block text-sm font-medium">{{ t('ccgateway.policy.fast') }}</span>
          <span class="mt-2 block text-xs leading-5 text-gray-500">{{ t('ccgateway.policy.fastHint') }}</span>
        </span>
      </label>
      <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-dark-700">
        <input
          v-model="policy.allow_effort"
          type="checkbox"
          class="mt-1"
          data-testid="allow-effort"
        >
        <span class="min-w-0"><span class="block text-sm font-medium">{{ t('ccgateway.policy.effort') }}</span>
          <span class="mt-2 block text-xs leading-5 text-gray-500">{{ t('ccgateway.policy.effortHint') }}</span>
        </span>
      </label>
    </div>
    <label class="block rounded-lg border border-gray-200 p-4 dark:border-dark-700">
      <span class="block text-sm font-medium">{{ t('ccgateway.policy.toolSearch') }}</span>
      <span class="mt-1 block text-xs leading-5 text-gray-500">{{ t('ccgateway.policy.toolSearchHint') }}</span>
      <select
        v-model="policy.tool_search"
        class="input mt-3 w-full"
      >
        <option
          v-for="mode in ['request', 'false', 'true', 'auto']"
          :key="mode"
          :value="mode"
        >{{ t(`ccgateway.policy.search_${mode}`) }}</option>
        <option
          v-if="policy.tool_search?.startsWith('auto:')"
          :value="policy.tool_search"
        >{{ policy.tool_search }}</option>
      </select>
    </label>
    <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-700">
      <table class="w-full text-left text-sm">
        <thead class="bg-gray-50 text-xs text-gray-500 dark:bg-dark-800">
          <tr>
            <th class="px-3 py-2">
              {{ t('ccgateway.policy.featureName') }}
            </th>
            <th class="px-3 py-2">
              {{ t('ccgateway.policy.requestField') }}
            </th>
            <th class="px-3 py-2">
              {{ t('ccgateway.policy.effect') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-dark-700">
          <tr
            v-for="f in bodyFeatures"
            :key="f.id"
          >
            <td class="px-3 py-3 align-top">
              <span class="block whitespace-nowrap font-medium">{{ t(`ccgateway.policy.bodyFeatures.${f.id}.name`) }}</span><span
                class="mt-1 block text-xs"
                :class="f.status === 'adapted' ? 'text-teal-600' : 'text-gray-500'"
              >{{ t(`ccgateway.policy.${f.status}`) }}</span>
            </td>
            <td class="px-3 py-3 align-top">
              <code class="text-xs">{{ f.field }}</code>
            </td>
            <td class="min-w-48 px-3 py-3 text-xs leading-5 text-gray-500">
              {{ t(`ccgateway.policy.bodyFeatures.${f.id}.hint`) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <details class="rounded-lg border border-gray-200 p-4 dark:border-dark-700">
      <summary class="cursor-pointer text-sm font-medium">
        {{ t('ccgateway.policy.envTitle') }}
      </summary>
      <p class="my-3 text-xs leading-5 text-gray-500">
        {{ t('ccgateway.policy.envHint') }}
      </p>
      <dl class="space-y-3 text-xs">
        <div
          v-for="entry in envMappings"
          :key="entry.field"
          class="grid gap-1 lg:grid-cols-2"
        >
          <dt class="font-mono">
            {{ entry.field }}
          </dt><dd class="break-all font-mono text-gray-500">
            {{ entry.target }}
          </dd>
        </div>
      </dl>
      <a
        class="mt-3 inline-block text-xs text-teal-600"
        href="https://code.claude.com/docs/en/env-vars"
        target="_blank"
        rel="noopener noreferrer"
      >Claude Code ↗</a>
    </details>
    <h5 class="font-semibold">
      {{ t('ccgateway.policy.fallbackTitle') }}
    </h5>
    <div class="grid gap-3 lg:grid-cols-2">
      <fieldset class="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-800">
        <legend class="float-left w-full text-sm font-medium">
          {{ t('ccgateway.policy.unknownBeta') }}
        </legend>
        <label
          v-for="action in ['ignore', 'reject'] as const"
          :key="action"
          class="flex clear-both cursor-pointer items-center gap-2 text-sm"
        >
          <input
            v-model="policy.unknown_beta"
            type="radio"
            :value="action"
            data-testid="unknown-beta"
          >{{ t(`ccgateway.policy.${action}`) }}
        </label>
      </fieldset>
      <fieldset class="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-800">
        <legend class="float-left w-full text-sm font-medium">
          {{ t('ccgateway.policy.unknownField') }}
        </legend>
        <label
          v-for="action in ['ignore', 'reject'] as const"
          :key="action"
          class="flex clear-both cursor-pointer items-center gap-2 text-sm"
        >
          <input
            v-model="policy.unknown_field"
            type="radio"
            :value="action"
            data-testid="unknown-field"
          >{{ t(`ccgateway.policy.${action}`) }}
        </label>
      </fieldset>
    </div>
    <p class="text-xs leading-5 text-gray-500">
      {{ t('ccgateway.policy.ignoreHint') }}
    </p>
    <div class="border-t border-gray-200 pt-5 dark:border-dark-700">
      <h5 class="font-semibold">
        {{ t('ccgateway.policy.headerTitle') }}
      </h5>
      <p class="mt-1 text-xs leading-5 text-gray-500">
        {{ t('ccgateway.policy.headerHint') }}
      </p>
    </div>
    <div class="grid gap-3 lg:grid-cols-2">
      <div
        v-for="(rule, i) in policy.betas"
        :key="i"
        class="rounded-lg bg-gray-50 p-3 dark:bg-dark-800"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-sm font-medium">{{ t(`ccgateway.policy.feature_${feature(rule.name)}`) }}</span><span class="text-xs text-teal-600">{{ t(`ccgateway.policy.mapping_${rule.mapping}`) }}</span>
        </div>
        <code class="mt-2 block break-all text-xs text-gray-500">{{ rule.name }}</code>
        <p class="mt-2 text-xs leading-5 text-gray-500">
          {{ t(`ccgateway.policy.description_${rule.mapping === 'forward' && rule.name === 'context-1m-2025-08-07' ? 'context' : rule.mapping}`) }}
        </p>
      </div>
    </div>
    <details
      class="rounded-lg border border-gray-200 dark:border-dark-700"
      data-testid="beta-rules"
    >
      <summary class="cursor-pointer p-4 text-sm font-medium">
        {{ t('ccgateway.policy.betas') }}
        <span class="mt-1 block text-xs font-normal text-gray-500">{{ t('ccgateway.policy.ruleSummary', { count: policy.betas.length, catalog: apiBetaCatalog.length }) }}</span>
      </summary>
      <div class="space-y-3 border-t border-gray-200 p-4 dark:border-dark-700">
        <p class="text-xs leading-5 text-gray-500">
          {{ t('ccgateway.policy.mappingHint') }}
        </p>
        <div
          v-for="(rule, i) in policy.betas"
          :key="i"
          class="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-dark-800"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium">{{ t(`ccgateway.policy.feature_${feature(rule.name)}`) }}</span>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              :aria-label="t('common.delete')"
              @click="policy.betas.splice(i, 1)"
            >
              ×
            </button>
          </div>
          <div class="grid gap-3 xl:grid-cols-2">
            <label class="min-w-0 text-xs text-gray-500">{{ t('ccgateway.policy.betaName') }}
              <input
                v-model="rule.name"
                class="input mt-1 w-full min-w-0 font-mono text-xs"
                placeholder="feature-name-YYYY-MM-DD"
                maxlength="128"
                spellcheck="false"
              >
            </label>
            <label class="min-w-0 text-xs text-gray-500">{{ t('ccgateway.policy.mapping') }}
              <select
                v-model="rule.mapping"
                class="input mt-1 w-full"
                :aria-label="t('ccgateway.policy.mapping')"
              >
                <option
                  v-for="m in mappings(rule.name)"
                  :key="m"
                  :value="m"
                >{{ t(`ccgateway.policy.mapping_${m}`) }}</option>
              </select>
            </label>
          </div>
          <p class="text-xs leading-5 text-gray-500">
            {{ t(`ccgateway.policy.description_${rule.mapping === 'forward' && rule.name === 'context-1m-2025-08-07' ? 'context' : rule.mapping}`) }}
          </p>
        </div>
        <p
          v-if="!policy.betas.length"
          class="text-sm text-gray-500"
        >
          {{ t('ccgateway.policy.empty') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            :disabled="policy.betas.length >= 64"
            @click="add"
          >
            {{ t('ccgateway.policy.add') }}
          </button>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            @click="policy = defaultRequestPolicy()"
          >
            {{ t('ccgateway.policy.defaults') }}
          </button>
        </div>
      </div>
    </details>
    <details
      class="rounded-lg border border-gray-200 dark:border-dark-700"
      data-testid="beta-catalog"
    >
      <summary class="cursor-pointer p-4 text-sm font-medium">
        {{ t('ccgateway.policy.catalog') }} ({{ apiBetaCatalog.length }})
      </summary>
      <div class="space-y-3 border-t border-gray-200 p-4 dark:border-dark-700">
        <p class="text-xs leading-5 text-gray-500">
          {{ t('ccgateway.policy.catalogHint') }}
        </p>
        <input
          v-model="search"
          class="input w-full"
          :placeholder="t('ccgateway.policy.catalogSearch')"
          :aria-label="t('ccgateway.policy.catalogSearch')"
        >
        <div class="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-dark-700">
          <div
            v-for="name in catalog"
            :key="name"
            class="flex flex-wrap items-center justify-between gap-2 py-3"
          >
            <code class="break-all text-xs">{{ name }}</code>
            <span
              class="text-xs"
              :class="policy.betas.some(b => b.name === name) ? 'text-teal-600' : 'text-gray-500'"
            >{{ t(policy.betas.some(b => b.name === name) ? 'ccgateway.policy.configured' : 'ccgateway.policy.unconfigured') }}</span>
          </div>
          <p
            v-if="!catalog.length"
            class="py-3 text-sm text-gray-500"
          >
            {{ t('ccgateway.policy.noResults') }}
          </p>
        </div>
        <a
          href="https://platform.claude.com/docs/en/api/beta-headers"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-teal-600"
        >Anthropic API Beta ↗</a>
      </div>
    </details>
  </section>
</template>
