// The console's answer to 403 verification_required (CONTRACTS §80.2): the
// HTTP client asks requestStepUp for a proof, StepUpHost shows the dialog of
// the pending request. Requests needing a step-up at the same time verify
// one after another; an aborted request leaves the queue (null), and signing
// out cancels them all.
import { shallowRef } from 'vue'
import type { VerificationChallenge } from '@sub2api/host'

export interface PendingStepUp {
  /** Distinguishes requests with the same challenge (the dialog's key). */
  id: number
  challenge: VerificationChallenge
  resolve: (proof: string | null) => void
}

/** The request waiting for its verification, shown by StepUpHost. */
export const pendingStepUp = shallowRef<PendingStepUp | null>(null)

const waiting: PendingStepUp[] = []
let seq = 0

function showNext() {
  if (!pendingStepUp.value) pendingStepUp.value = waiting.shift() ?? null
}

/** Resolves the proof for challenge, or null when the user cancels or signal aborts. */
export function requestStepUp(challenge: VerificationChallenge, signal?: AbortSignal): Promise<string | null> {
  if (signal?.aborted) return Promise.resolve(null)
  return new Promise((resolve) => {
    const entry: PendingStepUp = { id: ++seq, challenge, resolve }
    signal?.addEventListener('abort', () => drop(entry), { once: true })
    waiting.push(entry)
    showNext()
  })
}

function drop(entry: PendingStepUp) {
  if (pendingStepUp.value === entry) return settleStepUp(null)
  const i = waiting.indexOf(entry)
  if (i < 0) return
  waiting.splice(i, 1)
  entry.resolve(null)
}

/** Ends the pending verification with its proof (null: cancelled) and shows the next one. */
export function settleStepUp(proof: string | null) {
  const p = pendingStepUp.value
  pendingStepUp.value = null
  p?.resolve(proof)
  showNext()
}

/** Cancels the pending verification and every waiting one (the session ended). */
export function cancelStepUps() {
  for (const e of waiting.splice(0)) e.resolve(null)
  settleStepUp(null)
}
