<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, type ConfirmOptions } from '@sub2api/host'
import { SButton, SCode, SField, SInput, SFormModal, SSelect, STextarea, confirm, toast } from '@sub2api/ui'
import type { ApiKey, Group } from '@/api/types'
import { usePlatforms } from '@/composables/platforms'
import { notifyError } from '@/utils/errors'
import { applyFormError } from '@/utils/formErrors'
import { formatMoney } from '@/utils/format'
import KeyGroupDetails from './KeyGroupDetails.vue'
import KeyLimitsFields from './KeyLimitsFields.vue'
import { groupOptions, keyForm, keyFormBody, keyFormErrors } from './keyForm'
import { quotaOf } from './keyLimits'
import { maskKey } from './reveal'

// Creates a key (apiKey null) or edits one: name, group, IP allowlist, caps
// and quota, expiry; editing also resets the used quota and regenerates the
// key. Emits saved with the server's answer to the form (a created key
// carries its plaintext once) and rotated with the regenerated key (its new
// plaintext, once); either closes the editor. Resetting the quota leaves it
// open and emits updated with the key as it is now: the owner of `apiKey`
// puts it in place, the editor never writes to the key it was given.
const props = defineProps<{ open: boolean; apiKey?: ApiKey | null; groups: Group[] }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved', k: ApiKey): void; (e: 'rotated', k: ApiKey): void; (e: 'updated', k: ApiKey): void }>()
const { t } = useI18n()
const platforms = usePlatforms()
platforms.load()

const form = ref(keyForm())
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const editing = computed(() => !!props.apiKey)
const quota = computed(() => (props.apiKey ? quotaOf(props.apiKey) : null))
const selectedGroup = computed(() => props.groups.find((g) => g.id === form.value.group_id) ?? null)
const options = computed(() => groupOptions(props.groups, platforms.label, t('apikeys.exclusiveGroup')))

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

/** A confirmed action on the key being edited; the form is locked while it runs and a failure is toasted. */
async function confirmed(ask: ConfirmOptions, run: () => Promise<unknown>) {
  if (saving.value || !(await confirm(ask))) return
  saving.value = true
  try {
    await run()
  } catch (e) {
    notifyError(e)
  } finally {
    saving.value = false
  }
}

/** Replaces the key's secret: the editor closes and the answer carries the new plaintext. */
const rotate = (k: ApiKey) =>
  confirmed({ title: t('apikeys.rotate'), message: t('apikeys.rotateConfirm', { name: k.name }), danger: true }, async () => {
    const rotated = await api.post<ApiKey>(`/me/api-keys/${k.id}/rotate`, {})
    emit('update:open', false)
    emit('rotated', rotated)
  })

const resetQuota = (k: ApiKey) =>
  confirmed({ title: t('apikeys.quota.reset'), message: t('apikeys.quota.resetConfirm', { name: k.name }) }, async () => {
    emit('updated', await api.patch<ApiKey>(`/me/api-keys/${k.id}`, { reset_quota: true }))
    toast(t('apikeys.quota.resetDone'), 'success')
  })
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
      <SField v-if="apiKey" :label="t('apikeys.key')" :hint="t('apikeys.rotateHint')">
        <div class="flex items-center gap-2">
          <SCode inline class="flex-1" :text="maskKey(apiKey.key_prefix)" />
          <SButton size="sm" variant="secondary" icon="refresh" :disabled="saving" data-testid="rotate-api-key" @click="rotate(apiKey)">{{ t('apikeys.rotate') }}</SButton>
        </div>
      </SField>
      <SField :label="t('common.name')" required :error="errors.name">
        <SInput v-model="form.name" :placeholder="t('apikeys.namePlaceholder')" :disabled="saving" data-testid="key-name" />
      </SField>
      <SField :label="t('common.group')" required :error="errors.group_id" :hint="groups.length ? '' : t('apikeys.noGroups')">
        <SSelect v-model="form.group_id" :options="options" :placeholder="groups.length ? undefined : '—'" :disabled="saving" />
      </SField>
      <KeyGroupDetails v-if="selectedGroup" :group="selectedGroup" />
      <SField :label="t('apikeys.ipAllowlist')" :hint="t('apikeys.ipAllowlistHint')" :error="errors.allowed_ips">
        <STextarea v-model="form.allowed_ips" :aria-label="t('apikeys.ipAllowlist')" mono :rows="3" :maxlength="16384" :disabled="saving" data-testid="key-ips" />
      </SField>
      <KeyLimitsFields v-model="form.caps" :errors="errors" :disabled="saving" />
      <div v-if="apiKey && quota" class="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-xs">
        <span class="text-fg-muted">{{ t('apikeys.quota.used', { n: formatMoney(quota.used, 4) }) }}</span>
        <SButton size="xs" variant="ghost" icon="refresh" :disabled="saving || !quota.used" data-testid="reset-key-quota" @click="resetQuota(apiKey)">{{ t('apikeys.quota.reset') }}</SButton>
      </div>
      <SField :label="t('apikeys.expiresAt')" :hint="t('apikeys.expiresHint')" :error="errors.expires_at">
        <SInput v-model="form.expires_at" type="datetime-local" :disabled="saving" data-testid="key-expires" />
      </SField>
  </SFormModal>
</template>
