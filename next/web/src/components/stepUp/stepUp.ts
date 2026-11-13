// The console's answer to 403 verification_required (CONTRACTS §80.2): the
// HTTP client asks requestStepUp for a proof, StepUpHost shows the dialog of
// the pending request. Requests needing a step-up at the same time verify
// one after another.
import { shallowRef } from 'vue'
import type { VerificationChallenge } from '@sub2api/host'

interface PendingStepUp {
  challenge: VerificationChallenge
  resolve: (proof: string | null) => void
}

/** The request waiting for its verification, shown by StepUpHost. */
export const pendingStepUp = shallowRef<PendingStepUp | null>(null)

let queue: Promise<unknown> = Promise.resolve()

/** Resolves the proof for challenge, or null when the user cancels. */
export function requestStepUp(challenge: VerificationChallenge): Promise<string | null> {
  const next = queue.then(() => new Promise<string | null>((resolve) => (pendingStepUp.value = { challenge, resolve })))
  queue = next
  return next
}

/** Ends the pending verification with its proof (null: cancelled). */
export function settleStepUp(proof: string | null) {
  const p = pendingStepUp.value
  pendingStepUp.value = null
  p?.resolve(proof)
}
