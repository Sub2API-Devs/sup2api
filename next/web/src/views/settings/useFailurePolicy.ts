import { computed, ref } from 'vue'
import { api } from '@sub2api/host'
import { toast } from '@sub2api/ui'
import { i18n } from '@/i18n'
import { errorMessage, fieldErrors } from '@/utils/errors'
import {
  emptyFailurePolicy,
  editablePolicy,
  normalizedPolicy,
  needsPolicyMigration,
  policyFormErrors,
  type FailurePolicyForm,
  type FailurePolicyResponse
} from './failurePolicy'

const path = '/settings/failure-policy'
export function useFailurePolicy() {
  const policy = ref<FailurePolicyForm>(emptyFailurePolicy())
  const configured = ref(false)
  const migrationNeeded = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const errors = ref<Record<string, string>>({})
  const saved = ref('')
  const revision = ref(0)
  const dirty = computed(() => JSON.stringify(normalizedPolicy(policy.value)) !== saved.value)
  const isLoaded = computed(() => !!saved.value)
  function apply(response: FailurePolicyResponse) {
    policy.value = editablePolicy(response.policy)
    migrationNeeded.value = needsPolicyMigration(response.policy)
    configured.value = response.configured
    revision.value = response.policy.revision
    saved.value = JSON.stringify(policy.value)
    errors.value = {}
  }
  async function load() {
    loading.value = true
    error.value = ''
    try {
      apply(await api.get<FailurePolicyResponse>(path))
    } catch (e) {
      error.value = errorMessage(e)
    } finally {
      loading.value = false
    }
  }
  async function save() {
    errors.value = policyFormErrors(policy.value, i18n.global.t('failurePolicy.numberRequired'), i18n.global.t('failurePolicy.invalidRule'))
    if (Object.keys(errors.value).length) return
    saving.value = true
    error.value = ''
    try {
      apply(await api.put<FailurePolicyResponse>(path, { expected_revision: revision.value, policy: normalizedPolicy(policy.value) }))
      toast(i18n.global.t('failurePolicy.published'), 'success')
    } catch (e) {
      errors.value = fieldErrors(e)
      if (!Object.keys(errors.value).length) error.value = errorMessage(e)
    } finally {
      saving.value = false
    }
  }
  return { policy, configured, migrationNeeded, loading, saving, error, errors, dirty, isLoaded, load, save }
}
