<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { defaultRequestPolicy, type BetaMapping, type RequestPolicy } from './requestPolicy'
const policy = defineModel<RequestPolicy>({ required: true })
const { t } = useI18n()
const mappings: BetaMapping[] = ['native', 'forward', 'fine_grained_tools', 'fast']
function add() { policy.value.betas.push({ name: '', mapping: 'forward' }) }
</script>
<template>
  <section
    class="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-dark-700"
    data-testid="request-policy"
  >
    <div>
      <h4 class="font-semibold">
        {{ t('ccgateway.policy.title') }}
      </h4><p class="mt-1 text-sm text-gray-500">
        {{ t('ccgateway.policy.hint') }}
      </p>
    </div>
    <div class="flex flex-wrap gap-5">
      <label class="flex items-center gap-2 text-sm"><input
        v-model="policy.allow_fast"
        type="checkbox"
        data-testid="allow-fast"
      >{{ t('ccgateway.policy.fast') }}</label>
      <label class="flex items-center gap-2 text-sm"><input
        v-model="policy.allow_effort"
        type="checkbox"
      >{{ t('ccgateway.policy.effort') }}</label>
    </div>
    <p class="text-xs text-gray-500">
      {{ t('ccgateway.policy.fastHint') }}
    </p>
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="block text-sm">{{ t('ccgateway.policy.unknownBeta') }}<select
        v-model="policy.unknown_beta"
        class="input mt-1 w-full"
        data-testid="unknown-beta"
      ><option value="reject">{{ t('ccgateway.policy.reject') }}</option><option value="ignore">{{ t('ccgateway.policy.ignore') }}</option></select></label>
      <label class="block text-sm">{{ t('ccgateway.policy.unknownField') }}<select
        v-model="policy.unknown_field"
        class="input mt-1 w-full"
        data-testid="unknown-field"
      ><option value="reject">{{ t('ccgateway.policy.reject') }}</option><option value="ignore">{{ t('ccgateway.policy.ignore') }}</option></select></label>
    </div>
    <p class="text-xs text-gray-500">
      {{ t('ccgateway.policy.ignoreHint') }}
    </p>
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span class="text-sm font-medium">{{ t('ccgateway.policy.betas') }} ({{ policy.betas.length }})</span><div class="flex gap-2">
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          @click="policy = defaultRequestPolicy()"
        >
          {{ t('ccgateway.policy.defaults') }}
        </button><button
          type="button"
          class="btn btn-secondary btn-sm"
          :disabled="policy.betas.length >= 64"
          @click="add"
        >
          {{ t('ccgateway.policy.add') }}
        </button>
      </div>
    </div>
    <div class="max-h-80 space-y-2 overflow-y-auto">
      <div
        v-for="(rule, i) in policy.betas"
        :key="i"
        class="flex flex-wrap gap-2 sm:flex-nowrap"
      >
        <input
          v-model="rule.name"
          class="input min-w-0 flex-1 font-mono text-xs"
          :aria-label="t('ccgateway.policy.betaName')"
          placeholder="feature-name-YYYY-MM-DD"
          maxlength="128"
          spellcheck="false"
        >
        <select
          v-model="rule.mapping"
          class="input w-48"
          :aria-label="t('ccgateway.policy.mapping')"
        >
          <option
            v-for="m in mappings"
            :key="m"
            :value="m"
          >
            {{ t(`ccgateway.policy.mapping_${m}`) }}
          </option>
        </select>
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :aria-label="t('common.delete')"
          @click="policy.betas.splice(i, 1)"
        >
          ×
        </button>
      </div>
    </div>
    <p
      v-if="!policy.betas.length"
      class="text-sm text-gray-500"
    >
      {{ t('ccgateway.policy.empty') }}
    </p>
    <p class="text-xs text-gray-500">
      {{ t('ccgateway.policy.mappingHint') }}
    </p>
  </section>
</template>
