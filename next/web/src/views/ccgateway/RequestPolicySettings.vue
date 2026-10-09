<script setup lang="ts">
// CC features: Claude Code's tools and error handling inside the Worker, and how
// unsupported client requests are handled. Features the official API supports need
// no setting; attachment sources are no longer edited here (saved values still apply).
import { useI18n } from 'vue-i18n'
import type { RequestPolicy } from './requestPolicy'
const policy = defineModel<RequestPolicy>({ required: true })
const { t } = useI18n()
</script>
<template>
  <section class="space-y-4" data-testid="request-policy">
    <div><h4 class="font-semibold">{{ t('ccgateway.features.ccTitle') }}</h4><p class="mt-1 text-xs text-gray-500">{{ t('ccgateway.features.ccHint') }}</p></div>
    <section class="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-dark-700" data-testid="cc-runtime-settings">
      <h5 class="text-sm font-medium">{{ t('ccgateway.features.ccRuntime') }}</h5>
      <div class="grid gap-3 md:grid-cols-2">
        <label class="block text-sm"><span class="font-medium">{{ t('ccgateway.policy.toolSearch') }}</span><select v-model="policy.tool_search" class="input mt-2 w-full" data-testid="tool-search"><option v-for="mode in ['request', 'false', 'true', 'auto']" :key="mode" :value="mode">{{ t('ccgateway.policy.search_' + mode) }}</option><option v-if="policy.tool_search?.startsWith('auto:')" :value="policy.tool_search">{{ policy.tool_search }}</option></select><small class="mt-2 block text-gray-500">{{ t('ccgateway.policy.toolSearchHint') }}</small></label>
        <label class="block text-sm"><span class="font-medium">{{ t('ccgateway.policy.customToolPrefix') }}</span><input v-model="policy.custom_tool_prefix" class="input mt-2 w-full" type="text" maxlength="32" placeholder="ccgateway" data-testid="custom-tool-prefix" /><small class="mt-2 block text-gray-500">{{ t('ccgateway.policy.customToolPrefixHint') }}</small><code class="mt-2 block text-xs">mcp__{{ policy.custom_tool_prefix || 'ccgateway' }}__lookup</code></label>
        <label class="flex items-start gap-2 text-sm md:col-span-2"><input v-model="policy.pass_upstream_errors" type="checkbox" class="mt-1" data-testid="pass-upstream-errors" /><span>{{ t('ccgateway.policy.passUpstreamErrors') }}<small class="mt-1 block text-gray-500">{{ t('ccgateway.policy.passUpstreamErrorsHint') }}</small></span></label>
      </div>
    </section>
    <section class="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-dark-700" data-testid="unsupported-requests">
      <h5 class="text-sm font-medium">{{ t('ccgateway.policy.fallbackTitle') }}</h5>
      <div class="grid gap-3 sm:grid-cols-2">
        <fieldset v-for="kind in ['unknown_beta', 'unknown_field'] as const" :key="kind" class="space-y-2">
          <legend class="mb-2 text-sm font-medium">{{ t(kind === 'unknown_beta' ? 'ccgateway.policy.unknownBeta' : 'ccgateway.policy.unknownField') }}</legend>
          <label v-for="action in ['ignore', 'reject'] as const" :key="action" class="flex items-center gap-2 text-sm"><input v-model="policy[kind]" type="radio" :value="action" :data-testid="kind === 'unknown_beta' ? 'unknown-beta' : 'unknown-field'" />{{ t('ccgateway.policy.' + action) }}</label>
        </fieldset>
      </div>
      <p class="text-xs text-gray-500">{{ t('ccgateway.policy.ignoreHint') }}</p>
    </section>
  </section>
</template>
