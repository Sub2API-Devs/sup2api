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
  const migrationMessage = ref('failurePolicy.unifiedMigration')
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const errors = ref<Record<string, string>>({})
  const saved = ref('')
  const revision = ref(0)
  const rejectedPolicy = ref<FailurePolicyForm | null>(null)
  const regexErrors = computed(() => {
    const result: Record<string, string> = {}
    for (const key of ['retry_rules', 'account_rules'] as const) {
      rejectedPolicy.value?.[key].forEach((rule, index) => {
        const current = policy.value[key].find(r => r.id === rule.id)
        const message = errors.value[`${key}.${index}.match.keywords`]
        if (message && JSON.stringify(current) === JSON.stringify(rule)) result[`${key}:${rule.id}`] = message
      })
    }
    return result
  })
  const dirty = computed(() => JSON.stringify(normalizedPolicy(policy.value)) !== saved.value)
  const isLoaded = computed(() => !!saved.value)
  function apply(response: FailurePolicyResponse) {
    policy.value = editablePolicy(response.policy)
    migrationNeeded.value = needsPolicyMigration(response.policy)
    migrationMessage.value = response.policy.schema_version < 3 ? 'failurePolicy.unifiedMigration' : 'failurePolicy.matchingMigration'
    configured.value = response.configured
    revision.value = response.policy.revision
    saved.value = JSON.stringify(policy.value)
    errors.value = {}
    rejectedPolicy.value = null
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
    const submitted: FailurePolicyForm = JSON.parse(JSON.stringify(policy.value))
    try {
      apply(await api.put<FailurePolicyResponse>(path, { expected_revision: revision.value, policy: normalizedPolicy(policy.value) }))
      toast(i18n.global.t('failurePolicy.published'), 'success')
    } catch (e) {
      rejectedPolicy.value = submitted
      errors.value = fieldErrors(e)
      if (!Object.keys(errors.value).length) error.value = errorMessage(e)
    } finally {
      saving.value = false
    }
  }
  return { policy, configured, migrationNeeded, migrationMessage, loading, saving, error, errors, regexErrors, dirty, isLoaded, load, save }
}
