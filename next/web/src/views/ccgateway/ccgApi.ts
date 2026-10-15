// Calls shared by the CCGateway authorization panels (docs/CCGATEWAY-DRAFT-RUNTIMES.md).
import { api } from '@sub2api/host'

/** Draft runtimes of the authorization flow. */
export const DRAFTS = '/system/ccgateway/drafts'

/** Container calls may wait for an image pull or the login process. */
export const longCall = () => ({ signal: AbortSignal.timeout(95_000) })

/** Deletes an abandoned draft (best effort: the core's sweep removes the rest). */
export function discardDraft(path: string) {
  void api.del(path).catch(() => undefined)
}
