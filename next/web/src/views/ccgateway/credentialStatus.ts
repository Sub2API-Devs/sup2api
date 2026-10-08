import type { CcgRuntimeHealth } from '@/api/types'

// Missing selection or an expired token is not evidence that credentials must
// be replaced. The native CLI owns source selection and refresh on real use.
export function canAutoStartAuthorization(status: CcgRuntimeHealth | null): boolean {
  return status?.logged_in === false && !status.credential_source_unresolved && status.access_token_expired !== true
}
