import { api } from '@sub2api/host'

/**
 * Moves users into a named segment (POST /segments/:id/members). A user is in
 * exactly one segment, so this is every change of membership; the personal
 * segment a user leaves is deleted with its settings.
 */
export function moveToSegment(segmentId: number, userIds: number[]) {
  return api.post<{ moved: number }>(`/segments/${segmentId}/members`, { user_ids: userIds })
}
