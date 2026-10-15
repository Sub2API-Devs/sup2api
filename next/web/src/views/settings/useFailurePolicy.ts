import { computed, ref } from 'vue'
import { api } from '@sub2api/host'
import { toast } from '@sub2api/ui'
import { i18n } from '@/i18n'
import { errorMessage, fieldErrors } from '@/utils/errors'
import {
  emptyFailurePolicy,
  normalizedPolicy,
  policyFormErrors,
  type FailurePolicy,
  type FailurePolicyForm,
  type FailurePolicyResponse
} from './failurePolicy'

const path = '/settings/failure-policy'

export function useFailurePolicy() {
  const policy = ref<FailurePolicyForm>(emptyFailurePolicy())
  const configured = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const errors = ref<Record<string, string>>({})
  const saved = ref('')
  const revision = ref(0)
  const history = ref<FailurePolicy[]>([])
  const historyLoading = ref(false)
  const dirty = computed(() => JSON.stringify(normalizedPolicy(policy.value)) !== saved.value)
  const isLoaded = computed(() => !!saved.value)

  function apply(response: FailurePolicyResponse) {
    policy.value = normalizedPolicy(response.policy)
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

  async function publish() {
    errors.value = policyFormErrors(policy.value, i18n.global.t('failurePolicy.numberRequired'))
    if (Object.keys(errors.value).length) return
    saving.value = true
    errors.value = {}
    error.value = ''
    try {
      apply(await api.put<FailurePolicyResponse>(path, { expected_revision: revision.value, policy: normalizedPolicy(policy.value) }))
      history.value = []
      toast(i18n.global.t('failurePolicy.published'), 'success')
    } catch (e) {
      errors.value = fieldErrors(e)
      if (!Object.keys(errors.value).length) error.value = errorMessage(e)
    } finally {
      saving.value = false
    }
  }

  function reset() {
    if (!saved.value) return
    policy.value = JSON.parse(saved.value)
    errors.value = {}
    error.value = ''
  }

  async function loadHistory() {
    historyLoading.value = true
    try {
      history.value = (await api.get<{ policies: FailurePolicy[] }>(path + '/history')).policies
    } catch (e) {
      error.value = errorMessage(e)
    } finally {
      historyLoading.value = false
    }
  }

  function restore(version: number | null) {
    const previous = history.value.find(p => p.revision === version)
    if (previous) policy.value = normalizedPolicy({ ...previous, revision: revision.value })
  }

  return {
    policy,
    configured,
    loading,
    saving,
    error,
    errors,
    revision,
    history,
    historyLoading,
    dirty,
    isLoaded,
    load,
    publish,
    reset,
    loadHistory,
    restore
  }
}
