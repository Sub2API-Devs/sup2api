<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SButton, SDisclosure, SSettingsGroup, SSpinner, SSwitch } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import FailurePolicyControls from './FailurePolicyControls.vue'
import FailureRulesTable from './FailureRulesTable.vue'
import FailurePolicyPreview from './FailurePolicyPreview.vue'
import { useFailurePolicy } from './useFailurePolicy'
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('settings:manage'))
const { policy, configured, migrationNeeded, migrationMessage, loading, saving, error, errors, regexErrors, dirty, isLoaded, load, save } = useFailurePolicy()
const disabled = computed(() => !canManage.value || !!saving.value)
const retryNotes = ['retryNote1', 'retryNote2', 'retryNote3', 'retryNote4']
const disableNotes = ['disableNote1', 'disableNote2', 'disableNote3', 'disableNote4']
const ruleErrors = computed(() =>
  Object.entries(errors.value)
    .filter(([key]) => /^(retry_rules|account_rules)/.test(key))
    .map(([, message]) => message)
)
onMounted(load)
</script>
<template>
  <div
    class="space-y-5"
    data-testid="failure-policy-settings"
  >
    <SSpinner
      v-if="loading"
      block
    />
    <SAlert
      v-if="error"
      tone="danger"
    >
      {{ error
      }}<template #actions>
        <SButton
          :disabled="!!saving"
          @click="load"
        >
          {{ t('failurePolicy.reload') }}
        </SButton>
      </template>
    </SAlert>
    <template v-if="isLoaded && !loading">
      <SAlert
        v-if="!configured"
        tone="info"
      >
        {{ t('failurePolicy.migration') }}
      </SAlert>
      <SAlert
        v-if="migrationNeeded"
        tone="warning"
      >
        {{ t(migrationMessage) }}
      </SAlert>
      <SAlert
        v-if="ruleErrors.length"
        tone="danger"
      >
        <div
          v-for="(message, index) in ruleErrors"
          :key="index"
        >
          {{ message }}
        </div>
      </SAlert>
      <SSettingsGroup
        :title="t('failurePolicy.retryEnabled')"
        :description="t('failurePolicy.retrySectionHint')"
        data-testid="retry-settings"
      >
        <template #actions>
          <SSwitch
            v-model="policy.retry_enabled"
            :disabled="disabled"
            :aria-label="t('failurePolicy.retryEnabled')"
          />
        </template>
        <ul
          class="my-4 list-disc space-y-1 rounded-lg border border-line bg-surface-2 px-5 py-3 pl-8 text-sm leading-6 text-fg-muted"
          data-testid="retry-notes"
        >
          <li
            v-for="key in retryNotes"
            :key="key"
          >
            {{ t(`failurePolicy.${key}`) }}
          </li>
        </ul>
        <FailurePolicyControls
          v-model="policy"
          :disabled="disabled"
          :errors="errors"
        />
        <div class="py-4">
          <FailureRulesTable
            v-model="policy.retry_rules"
            :regex-errors="regexErrors"
            :show-errors="Object.keys(errors).length > 0"
            :account="false"
            :disabled="disabled"
          />
        </div>
        <div
          v-if="canManage"
          class="flex justify-end py-4"
        >
          <SButton
            variant="primary"
            size="sm"
            :loading="saving === 'retry'"
            :disabled="disabled || (!dirty('retry') && configured && !migrationNeeded)"
            data-testid="retry-save"
            @click="save('retry')"
          >
            {{ t('common.save') }}
          </SButton>
        </div>
      </SSettingsGroup>
      <SSettingsGroup
        :title="t('failurePolicy.disableSection')"
        :description="t('failurePolicy.accountHint')"
        data-testid="disable-settings"
      >
        <template #actions>
          <SSwitch
            v-model="policy.account_enabled"
            :disabled="disabled"
            :aria-label="t('failurePolicy.accountEnabled')"
          />
        </template>
        <ul
          class="my-4 list-disc space-y-1 rounded-lg border border-line bg-surface-2 px-5 py-3 pl-8 text-sm leading-6 text-fg-muted"
          data-testid="disable-notes"
        >
          <li
            v-for="key in disableNotes"
            :key="key"
          >
            {{ t(`failurePolicy.${key}`) }}
          </li>
        </ul>
        <div class="py-4">
          <FailureRulesTable
            v-model="policy.account_rules"
            :regex-errors="regexErrors"
            :show-errors="Object.keys(errors).length > 0"
            :account="true"
            :disabled="disabled"
          />
        </div>
        <div
          v-if="canManage"
          class="flex justify-end py-4"
        >
          <SButton
            variant="primary"
            size="sm"
            :loading="saving === 'account'"
            :disabled="disabled || (!dirty('account') && configured && !migrationNeeded)"
            data-testid="account-save"
            @click="save('account')"
          >
            {{ t('common.save') }}
          </SButton>
        </div>
      </SSettingsGroup>
      <SDisclosure :label="t('failurePolicy.preview')">
        <FailurePolicyPreview :policy="policy" />
      </SDisclosure>
    </template>
  </div>
</template>
