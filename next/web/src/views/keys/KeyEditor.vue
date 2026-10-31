<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SField, SInput, SFormModal, SSelect, STextarea, confirm, toast } from '@sub2api/ui'
import type { ApiKey, Group } from '@/api/types'
import { usePlatforms } from '@/composables/platforms'
import { notifyError } from '@/utils/errors'
import { applyFormError } from '@/utils/formErrors'
import { formatMoney } from '@/utils/format'
import KeyGroupDetails from './KeyGroupDetails.vue'
import KeyLimitsFields from './KeyLimitsFields.vue'
import { keyForm, keyFormBody, keyFormErrors } from './keyForm'
import { quotaOf } from './keyLimits'

// Creates a key (apiKey null) or edits one: name, group, IP allowlist, caps
// and quota, expiry; editing also resets the used quota. Emits saved with the
// server's answer (a created key carries its plaintext once).
const props = defineProps<{ open: boolean; apiKey?: ApiKey | null; groups: Group[] }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved', k: ApiKey): void }>()
const { t } = useI18n()
const platforms = usePlatforms()
platforms.load()

const form = ref(keyForm())
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const editing = computed(() => !!props.apiKey)
const quota = computed(() => (props.apiKey ? quotaOf(props.apiKey) : null))
const selectedGroup = computed(() => props.groups.find((g) => g.id === form.value.group_id) ?? null)
const groupOptions = computed(() =>
  props.groups.map((g) => ({ value: g.id, label: g.platforms?.length ? `${g.name} · ${g.platforms.map((p) => platforms.label(p)).join(', ')}` : g.name }))
)

watch(() => props.open, (open) => {
  if (!open) return
  form.value = keyForm(props.apiKey, props.groups[0]?.id ?? null)
  errors.value = {}
}, { immediate: true })

const close = () => !saving.value && emit('update:open', false)

async function save() {
  if (saving.value) return
  errors.value = Object.fromEntries(Object.entries(keyFormErrors(form.value)).map(([k, v]) => [k, t(v)]))
  if (Object.keys(errors.value).length) return
  saving.value = true
  try {
    const body = keyFormBody(form.value, editing.value)
    // An unchanged group is left out: it may no longer be one the owner can pick.
    if (props.apiKey && body.group_id === props.apiKey.group_id) delete body.group_id
    const saved = props.apiKey ? await api.patch<ApiKey>(`/me/api-keys/${props.apiKey.id}`, body) : await api.post<ApiKey>('/me/api-keys', body)
    emit('update:open', false)
    emit('saved', saved)
  } catch (e) {
    applyFormError(e, errors)
  } finally {
    saving.value = false
  }
}

async function resetQuota() {
  const k = props.apiKey
  if (!k || saving.value || !(await confirm({ title: t('apikeys.quota.reset'), message: t('apikeys.quota.resetConfirm', { name: k.name }) }))) return
  saving.value = true
  try {
    Object.assign(k, await api.patch<ApiKey>(`/me/api-keys/${k.id}`, { reset_quota: true }))
    toast(t('apikeys.quota.resetDone'), 'success')
  } catch (e) {
    notifyError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SFormModal
    :open="open"
    :title="t(editing ? 'apikeys.edit' : 'apikeys.create')"
    width="lg"
    :loading="saving"
    :submit-text="t(editing ? 'common.save' : 'common.create')"
    :submit-attrs="{ 'data-testid': 'save-key' }"
    data-testid="key-editor"
    @update:open="!$event && close()"
    @submit="save"
  >
      <SField :label="t('common.name')" required :error="errors.name">
        <SInput v-model="form.name" :placeholder="t('apikeys.namePlaceholder')" :disabled="saving" data-testid="key-name" />
      </SField>
      <SField :label="t('common.group')" required :error="errors.group_id" :hint="groups.length ? '' : t('apikeys.noGroups')">
        <SSelect v-model="form.group_id" :options="groupOptions" :placeholder="groups.length ? undefined : '—'" :disabled="saving" />
      </SField>
      <KeyGroupDetails v-if="selectedGroup" :group="selectedGroup" />
      <SField :label="t('apikeys.ipAllowlist')" :hint="t('apikeys.ipAllowlistHint')" :error="errors.allowed_ips">
        <STextarea v-model="form.allowed_ips" :aria-label="t('apikeys.ipAllowlist')" mono :rows="3" :maxlength="16384" :disabled="saving" data-testid="key-ips" />
      </SField>
      <KeyLimitsFields v-model="form.caps" :errors="errors" :disabled="saving" />
      <div v-if="quota" class="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-xs">
        <span class="text-fg-muted">{{ t('apikeys.quota.used', { n: formatMoney(quota.used, 4) }) }}</span>
        <SButton size="xs" variant="ghost" icon="refresh" :disabled="saving || !quota.used" data-testid="reset-key-quota" @click="resetQuota">{{ t('apikeys.quota.reset') }}</SButton>
      </div>
      <SField :label="t('apikeys.expiresAt')" :hint="t('apikeys.expiresHint')" :error="errors.expires_at">
        <SInput v-model="form.expires_at" type="datetime-local" :disabled="saving" data-testid="key-expires" />
      </SField>
  </SFormModal>
</template>
