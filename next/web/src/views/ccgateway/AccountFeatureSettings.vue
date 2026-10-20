<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SHint, SSegmented, SSelect } from '@sub2api/ui'
import RequestPolicySettings from './RequestPolicySettings.vue'
import { defaultRequestPolicy, type AccountFeaturePolicy, type FeaturePreview } from './requestPolicy'
import { reasonOf } from './ccgAuthFlow'
const props = defineProps<{ accountId: number; canEdit: boolean; disabled?: boolean; errors?: Record<string, string> }>()
const model = defineModel<AccountFeaturePolicy>()
const emit = defineEmits<{ loaded: [value: AccountFeaturePolicy]; status: [blocked: boolean] }>()
const { t } = useI18n()
const preview = ref<FeaturePreview | null>(null)
const groupId = ref<number | null>(null)
const failed = ref(false)
const conflict = ref(false)
const loading = ref(false)
const initialized = ref(false)
const policy = ref(defaultRequestPolicy())
let sequence = 0
let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined
const options = computed(() => (preview.value?.groups ?? []).map(group => ({ value: group.id, label: group.name })))
const editable = computed(() => !!preview.value?.editable && props.canEdit && !props.disabled && !loading.value && !failed.value)
const messages = computed(() => Object.entries(props.errors ?? {}).filter(([key]) => key.startsWith('cc_feature_policy')).map(([, message]) => message))
function setMode(mode: unknown) {
  if (!model.value || !editable.value) return
  model.value = { ...model.value, mode: mode as 'follow' | 'custom', overrides: mode === 'follow' ? {} : model.value.overrides }
}
async function load(initial = false, retainDraft = false) {
  const seq = ++sequence
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  failed.value = false
  conflict.value = false
  emit('status', true)
  const base = `/system/ccgateway/accounts/${props.accountId}/cc-features`
  try {
    const result = initial || !props.canEdit
      ? await api.get<FeaturePreview>(base, groupId.value == null ? undefined : { group_id: groupId.value }, { signal: controller.signal })
      : await api.post<FeaturePreview>(base + '/preview', { group_id: groupId.value, cc_feature_policy: model.value }, { signal: controller.signal })
    if (seq !== sequence) return
    preview.value = result
    policy.value = result.effective
    if (initial) {
      emit('loaded', structuredClone(result.cc_feature_policy))
      model.value = retainDraft && model.value
        ? { ...model.value, revision: result.cc_feature_policy.revision }
        : structuredClone(result.cc_feature_policy)
      initialized.value = true
    }
    if (groupId.value == null && result.groups.length) groupId.value = result.groups[0].id
  } catch (error) {
    if (seq === sequence) { failed.value = true; conflict.value = reasonOf(error) === 'feature_revision_conflict' }
  } finally {
    if (seq === sequence) { loading.value = false; emit('status', failed.value) }
  }
}
watch(() => props.accountId, () => {
  clearTimeout(timer)
  timer = undefined
  initialized.value = false
  groupId.value = null
  preview.value = null
  void load(true)
}, { immediate: true })
watch([groupId, model], () => {
  if (!initialized.value) return
  sequence++
  controller?.abort()
  clearTimeout(timer)
  loading.value = true
  emit('status', true)
  timer = setTimeout(() => void load(), 180)
}, { deep: true })
onBeforeUnmount(() => { sequence++; clearTimeout(timer); controller?.abort() })
</script>
<template>
  <section
    class="space-y-4"
    data-testid="account-cc-features"
  >
    <SHint>{{ t('ccgateway.layers.accountHint') }}</SHint>
    <SAlert
      v-for="message in messages"
      :key="message"
      tone="danger"
    >
      {{ message }}
    </SAlert>
    <SButton
      v-if="messages.length"
      size="sm"
      @click="load(true, true)"
    >
      {{ t('ccgateway.layers.retry') }}
    </SButton>
    <SAlert
      v-if="failed"
      tone="danger"
    >
      {{ t(conflict ? 'ccgateway.layers.conflict' : 'ccgateway.layers.previewFailed') }} <SButton
        size="sm"
        @click="load(conflict || !initialized, initialized)"
      >
        {{ t('ccgateway.layers.retry') }}
      </SButton>
    </SAlert>
    <SHint v-if="loading">
      {{ t('ccgateway.layers.loading') }}
    </SHint>
    <template v-if="preview && model">
      <div class="flex flex-wrap items-center gap-2">
        <SSelect
          v-model="groupId"
          :options="options"
          size="sm"
          class="w-full sm:w-56"
          :aria-label="t('ccgateway.layers.selectGroup')"
          data-testid="account-feature-group"
        />
        <SSegmented
          :model-value="model.mode"
          :options="[{ value: 'follow', label: t('ccgateway.layers.follow') }, { value: 'custom', label: t('ccgateway.layers.custom') }]"
          size="sm"
          :disabled="!editable"
          :aria-label="t('ccgateway.features.ccTitle')"
          data-testid="account-feature-mode"
          @update:model-value="setMode"
        />
      </div>
      <SAlert
        v-if="preview.disabled_reason"
        tone="neutral"
      >
        {{ t('ccgateway.layers.disabledReasons.' + preview.disabled_reason) }}
      </SAlert>
      <RequestPolicySettings
        v-model="policy"
        v-model:overrides="model.overrides"
        :inherited="preview.inherited"
        :effective="preview.effective"
        :sources="preview.sources"
        :disabled="!editable || model.mode !== 'custom'"
      />
    </template>
  </section>
</template>
