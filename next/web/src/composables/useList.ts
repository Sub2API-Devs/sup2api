import { watch } from 'vue'
import { api, useList as useHostList, type UseListOptions, type UseListResult } from '@sub2api/host'
import { notifyError } from '@/utils/errors'

/**
 * Paginated list state for a GET list endpoint (console flavour of
 * `@sub2api/host`'s useList: bound to the console `api` client, failed loads
 * show the error toast).
 *   const list = useList<User>('/users', { q: '', status: '' })
 *   list.items, list.loading, list.page, list.pageSize, list.total, list.reload()
 * Changing a filter resets to page 1 and reloads (debounced for text).
 * A page left without rows while others have some gives way to the last page.
 */
export function useList<T>(
  path: string | (() => string),
  initialFilters: Record<string, any> = {},
  opts: Omit<UseListOptions, 'onError'> = {}
): UseListResult<T> {
  const list = useHostList<T>(api, path, initialFilters, { ...opts, onError: notifyError })
  // A page past the last one has no rows to show (they were deleted, here or
  // elsewhere, since it was opened): the list moves to the last page.
  watch(list.items, items => {
    const last = Math.ceil(list.total.value / list.pageSize.value)
    if (!items.length && last >= 1 && list.page.value > last) list.page.value = last
  })
  return list
}

/**
 * How many list filters are set (not '', null, undefined or false), leaving
 * out the keys in `ignore` — for the Filters button badge on a phone
 * (SPageHeader `filters-active-count`, SFilterBar `active-count`), the ones
 * kept in sight beside the button: the search box `q` by default.
 */
export function activeFilterCount(filters: Record<string, unknown>, ignore: readonly string[] = ['q']): number {
  return Object.entries(filters).filter(([key, value]) => !ignore.includes(key) && value !== '' && value != null && value !== false).length
}
