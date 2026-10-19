<script setup lang="ts">
// The search toolbar of the usage lists: time range (#range) and the common
// filters on the first row, the rest behind "More filters", then the totals
// (#stats) with extra toggles (#actions) beside Reset / Search. Text filters
// apply on Search (or Enter) only; the time range slot applies at once.
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SIcon, SInput, SSelect } from '@sub2api/ui'

const props = withDefaults(defineProps<{
  modelValue: Record<string, unknown>
  admin?: boolean
  groupOptions?: Array<{ value: string | number; label: string }>
}>(), { admin: false, groupOptions: () => [] })
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, string>] }>()
const { t } = useI18n()
const expanded = ref(false)
const draft = reactive<Record<string, string>>({})
const primary = [
  { key: 'model_contains', icon: 'cpu' },
  { key: 'api_key_name', icon: 'key' },
  { key: 'client_ip', icon: 'globe' }
]
const advanced = computed(() => [
  'api_key_id', 'group_id', 'group_name', 'request_id', 'client_request_id', 'platform', 'protocol', 'endpoint', 'status_code', 'error_type',
  ...(props.admin ? ['user_id', 'user_email', 'account_id', 'account_name', 'plugin_key', 'account_type', 'node_id', 'upstream_model', 'upstream_protocol'] : [])
])
const keys = computed(() => [...primary.map(p => p.key), ...advanced.value, 'success', 'stream', 'billing_status'])
watch(() => props.modelValue, value => {
  for (const key of keys.value) draft[key] = String(value[key] ?? '')
}, { deep: true, immediate: true })
// Without field labels the empty choice names the filter, like a placeholder.
const groupChoices = computed(() => [
  { value: '', label: t('usage.search.group_id') },
  ...(props.groupOptions?.filter(option => option.value !== '').map(option => ({ ...option, value: String(option.value) })) || [])
])
const successOptions = computed(() => [{ value: '', label: t('common.status') }, { value: 'true', label: t('usage.success.ok') }, { value: 'false', label: t('usage.success.failed') }])
const streamOptions = computed(() => [{ value: '', label: t('usage.search.stream') }, { value: 'true', label: t('usage.stream') }, { value: 'false', label: t('usage.nonStream') }])
const billingOptions = computed(() => [
  { value: '', label: t('usage.billing.statusLabel') },
  ...['billed', 'free', 'pending', 'failed'].map(value => ({ value, label: t(`usage.billing.status.${value}`) }))
])
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
    class="mb-4 w-full rounded-xl border border-line bg-surface p-3 shadow-sm"
    @submit.prevent="apply"
  >
    <div class="flex flex-wrap items-start gap-2">
      <div
        v-if="$slots.range"
        class="shrink-0"
      >
        <slot name="range" />
      </div>
      <div class="grid min-w-[16rem] flex-1 grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
        <SInput
          v-for="p in primary"
          :key="p.key"
          v-model="draft[p.key]"
          size="sm"
          :icon="p.icon"
          :placeholder="t(`usage.search.${p.key}`)"
          :title="t(`usage.search.${p.key}`)"
          :aria-label="t(`usage.search.${p.key}`)"
          :maxlength="256"
          :mono="p.key === 'client_ip'"
          :data-testid="`filter-${p.key}`"
        />
        <SSelect
          v-model="draft.success"
          size="sm"
          :aria-label="t('common.status')"
          :options="successOptions"
        />
      </div>
      <SButton
        type="button"
        variant="ghost"
        size="sm"
        :class="advancedCount && !expanded ? '!text-primary-600 dark:!text-primary-400' : ''"
        :aria-expanded="expanded"
        data-testid="toggle-usage-filters"
        @click="expanded = !expanded"
      >
        {{ t('usage.search.advanced') }}
        <span
          v-if="advancedCount"
          class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-xxs text-white"
        >{{ advancedCount }}</span>
        <SIcon
          name="chevron-down"
          class="h-3.5 w-3.5 transition-transform"
          :class="expanded ? 'rotate-180' : ''"
        />
      </SButton>
    </div>
    <div
      v-if="expanded"
      class="mt-2 grid grid-cols-1 gap-2 border-t border-dashed border-line pt-2 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]"
      data-testid="usage-advanced-filters"
    >
      <template
        v-for="key in advanced"
        :key="key"
      >
        <SSelect
          v-if="key === 'group_id' && groupOptions?.length"
          v-model="draft[key]"
          size="sm"
          :aria-label="t(`usage.search.${key}`)"
          :options="groupChoices"
        />
        <SInput
          v-else
          v-model="draft[key]"
          size="sm"
          :placeholder="t(`usage.search.${key}`)"
          :title="t(`usage.search.${key}`)"
          :aria-label="t(`usage.search.${key}`)"
          :maxlength="256"
          :data-testid="`filter-${key}`"
        />
      </template>
      <SSelect
        v-model="draft.stream"
        size="sm"
        :aria-label="t('usage.search.stream')"
        :options="streamOptions"
      />
      <SSelect
        v-model="draft.billing_status"
        size="sm"
        :aria-label="t('usage.billing.statusLabel')"
        :options="billingOptions"
      />
    </div>
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <slot name="stats" />
      <div class="ms-auto flex flex-wrap items-center justify-end gap-2">
        <slot name="actions" />
        <SButton
          type="button"
          size="sm"
          data-testid="reset-usage-filters"
          @click="reset"
        >
          {{ t('common.reset') }}
        </SButton>
        <SButton
          type="submit"
          variant="primary"
          size="sm"
          icon="search"
          data-testid="search-usage"
        >
          {{ t('common.search') }}
        </SButton>
      </div>
    </div>
  </form>
</template>
