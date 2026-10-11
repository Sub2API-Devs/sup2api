<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SField, SInput, SSelect } from '@sub2api/ui'

const props = withDefaults(defineProps<{
  modelValue: Record<string, unknown>
  admin?: boolean
  groupOptions?: Array<{ value: string | number; label: string }>
}>(), { admin: false, groupOptions: () => [] })
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, string>] }>()
const { t } = useI18n()
const expanded = ref(false)
const draft = reactive<Record<string, string>>({})
const primary = ['model_contains', 'api_key_name', 'client_ip']
const advanced = computed(() => [
  'api_key_id', 'group_id', 'group_name', 'request_id', 'client_request_id', 'platform', 'protocol', 'endpoint', 'status_code', 'error_type',
  ...(props.admin ? ['user_id', 'user_email', 'account_id', 'account_name', 'plugin_key', 'account_type', 'node_id', 'upstream_model', 'upstream_protocol'] : [])
])
const keys = computed(() => [...primary, ...advanced.value, 'success', 'stream', 'billing_status'])
watch(() => props.modelValue, value => {
  for (const key of keys.value) draft[key] = String(value[key] ?? '')
}, { deep: true, immediate: true })
const groupChoices = computed(() => props.groupOptions?.map(option => ({ ...option, value: String(option.value) })) || [])
const all = computed(() => ({ value: '', label: t('common.all') }))
const successOptions = computed(() => [all.value, { value: 'true', label: t('usage.success.ok') }, { value: 'false', label: t('usage.success.failed') }])
const streamOptions = computed(() => [all.value, { value: 'true', label: t('usage.stream') }, { value: 'false', label: t('usage.nonStream') }])
const billingOptions = computed(() => [all.value, ...['billed', 'free', 'pending', 'failed'].map(value => ({ value, label: t(`usage.billing.status.${value}`) }))])
const advancedCount = computed(() => [...advanced.value, 'stream', 'billing_status'].filter(key => props.modelValue[key] !== undefined && props.modelValue[key] !== '').length)
function apply() {
  emit('update:modelValue', Object.fromEntries(keys.value.map(key => [key, String(draft[key] ?? '').trim()])))
}
function reset() {
  for (const key of keys.value) draft[key] = ''
  apply()
}
</script>

<template>
  <form
    class="w-full space-y-3"
    @submit.prevent="apply"
  >
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SField
        v-for="key in primary"
        :key="key"
        :label="t(`usage.search.${key}`)"
      >
        <SInput
          v-model="draft[key]"
          :aria-label="t(`usage.search.${key}`)"
          :maxlength="256"
          :data-testid="`filter-${key}`"
        />
      </SField>
      <SField :label="t('common.status')">
        <SSelect
          v-model="draft.success"
          :aria-label="t('common.status')"
          :options="successOptions"
        />
      </SField>
    </div>
    <div
      v-if="expanded"
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      data-testid="usage-advanced-filters"
    >
      <SField
        v-for="key in advanced"
        :key="key"
        :label="t(`usage.search.${key}`)"
      >
        <SSelect
          v-if="key === 'group_id' && groupOptions?.length"
          v-model="draft[key]"
          :aria-label="t(`usage.search.${key}`)"
          :options="groupChoices"
        />
        <SInput
          v-else
          v-model="draft[key]"
          :aria-label="t(`usage.search.${key}`)"
          :maxlength="256"
          :data-testid="`filter-${key}`"
        />
      </SField>
      <SField :label="t('usage.search.stream')">
        <SSelect
          v-model="draft.stream"
          :aria-label="t('usage.search.stream')"
          :options="streamOptions"
        />
      </SField>
      <SField :label="t('usage.billing.statusLabel')">
        <SSelect
          v-model="draft.billing_status"
          :aria-label="t('usage.billing.statusLabel')"
          :options="billingOptions"
        />
      </SField>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <SButton
        type="button"
        variant="ghost"
        :aria-expanded="expanded"
        data-testid="toggle-usage-filters"
        @click="expanded = !expanded"
      >
        {{ t('usage.search.advanced') }}{{ advancedCount ? ` (${advancedCount})` : '' }}
      </SButton>
      <SButton
        type="button"
        data-testid="reset-usage-filters"
        @click="reset"
      >
        {{ t('common.reset') }}
      </SButton>
      <SButton
        type="submit"
        variant="primary"
        data-testid="search-usage"
      >
        {{ t('common.search') }}
      </SButton>
    </div>
  </form>
</template>
