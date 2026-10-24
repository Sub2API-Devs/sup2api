import { api, useList as useHostList, type UseListOptions, type UseListResult } from '@sub2api/host'
import { notifyError } from '@/utils/errors'

/**
 * Paginated list state for a GET list endpoint (console flavour of
 * `@sub2api/host`'s useList: bound to the console `api` client, failed loads
 * show the error toast).
 *   const list = useList<User>('/users', { q: '', status: '' })
 *   list.items, list.loading, list.page, list.pageSize, list.total, list.reload()
 * Changing a filter resets to page 1 and reloads (debounced for text).
 */
export function useList<T>(
  path: string | (() => string),
  initialFilters: Record<string, any> = {},
  opts: Omit<UseListOptions, 'onError'> = {}
): UseListResult<T> {
  return useHostList<T>(api, path, initialFilters, { ...opts, onError: notifyError })
}
