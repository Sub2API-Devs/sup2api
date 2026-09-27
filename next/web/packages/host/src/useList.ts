import { reactive, ref, watch, type Ref } from 'vue'
import type { ApiClient, PageInfo, Query } from './http'

export interface UseListOptions {
  /** Initial page size (20). */
  pageSize?: number
  /** Load on creation (true). */
  immediate?: boolean
  /** Called with the error of a failed load (the `error` ref is set either way). */
  onError?: (e: unknown) => void
}

export interface UseListResult<T> {
  items: Ref<T[]>
  loading: Ref<boolean>
  error: Ref<unknown>
  page: Ref<number>
  pageSize: Ref<number>
  total: Ref<number>
  filters: Record<string, any>
  reload: () => Promise<void>
}

/**
 * Paginated list state for a GET list endpoint.
 *   const list = useList<Event>(host.pluginApi, '/events', { q: '', status: '' })
 *   list.items, list.loading, list.page, list.pageSize, list.total, list.reload()
 * Changing page / pageSize reloads; changing a filter resets to page 1 and
 * reloads (debounced 250 ms). Stale responses are dropped (only the latest
 * load may write the state).
 */
export function useList<T>(
  client: ApiClient,
  path: string | (() => string),
  initialFilters: Record<string, any> = {},
  opts: UseListOptions = {}
): UseListResult<T> {
  const items = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const error = ref<unknown>(null)
  const page = ref(1)
  const pageSize = ref(opts.pageSize ?? 20)
  const total = ref(0)
  const filters = reactive({ ...initialFilters })
  let seq = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  async function reload() {
    const my = ++seq
    loading.value = true
    error.value = null
    try {
      const q: Query = { page: page.value, page_size: pageSize.value }
      for (const [k, v] of Object.entries(filters)) q[k] = v as any
      const res = await client.list<T>(typeof path === 'function' ? path() : path, q)
      if (my !== seq) return
      items.value = res.items
      const p: PageInfo = res.page
      total.value = p.total ?? res.items.length
    } catch (e) {
      if (my !== seq) return
      error.value = e
      opts.onError?.(e)
    } finally {
      if (my === seq) loading.value = false
    }
  }

  watch([page, pageSize], () => reload())
  watch(
    () => ({ ...filters }),
    () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (page.value !== 1) page.value = 1
        else reload()
      }, 250)
    },
    { deep: true }
  )

  if (opts.immediate !== false) reload()

  return { items, loading, error, page, pageSize, total, filters, reload }
}
