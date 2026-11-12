import { api } from '@sub2api/host'
import { useAuthStore } from '@/stores/auth'

/**
 * Whether the caller may list the members of a segment
 * (GET /segments/:id/members): its rows are users, so it takes user:read
 * besides the segment:read the pages of segments are opened with.
 */
export function canListMembers(auth = useAuthStore()): boolean {
  return auth.has('user:read')
}

/**
 * Moves users into a named segment (POST /segments/:id/members). A user is in
 * exactly one segment, so this is every change of membership; the personal
 * segment a user leaves is deleted with its settings.
 */
export function moveToSegment(segmentId: number, userIds: number[]) {
  return api.post<{ moved: number }>(`/segments/${segmentId}/members`, { user_ids: userIds })
}
