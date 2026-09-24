import { reactive } from 'vue'
import { api } from '@sub2api/host'

// Step-up (re-enter password) flow used by the HTTP client when the server
// answers 403 step_up_required. StepUpDialog.vue renders this state.

interface Pending {
  resolve: (r: { token: string; expiresIn: number } | null) => void
}

export const stepUpState = reactive({ open: false, pending: null as Pending | null })

export function requestStepUp(): Promise<{ token: string; expiresIn: number } | null> {
  return new Promise((resolve) => {
    stepUpState.pending?.resolve(null)
    stepUpState.pending = { resolve }
    stepUpState.open = true
  })
}

/** Exchanges the password for a step-up token; throws ApiError on failure. */
export async function submitStepUp(password: string) {
  const r = await api.post<{ step_up_token: string; expires_in: number }>('/auth/step-up', { password }, { noStepUp: true })
  const p = stepUpState.pending
  stepUpState.pending = null
  stepUpState.open = false
  p?.resolve({ token: r.step_up_token, expiresIn: r.expires_in || 300 })
}

export function cancelStepUp() {
  const p = stepUpState.pending
  stepUpState.pending = null
  stepUpState.open = false
  p?.resolve(null)
}
