import { reactive, ref, watch, type Ref } from 'vue'
import { api, type PageInfo, type Query } from '@sub2api/host'
import { notifyError } from '@/utils/errors'

/**
 * Paginated list state for a GET list endpoint.
 *   const list = useList<User>('/users', { q: '', status: '' })
 *   list.items, list.loading, list.page, list.pageSize, list.total, list.reload()
 * Changing a filter resets to page 1 and reloads (debounced for text).
 */
export function useList<T>(path: string | (() => string), initialFilters: Record<string, any> = {}, opts: { pageSize?: number; immediate?: boolean } = {}) {
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
      const res = await api.list<T>(typeof path === 'function' ? path() : path, q)
      if (my !== seq) return
      items.value = res.items
      const p: PageInfo = res.page
      total.value = p.total ?? res.items.length
    } catch (e) {
      if (my !== seq) return
      error.value = e
      notifyError(e)
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

/** Runs an async action with a loading flag and error toast. */
export function useAction() {
  const busy = ref(false)
  async function run<R>(fn: () => Promise<R>): Promise<R | undefined> {
    busy.value = true
    try {
      return await fn()
    } catch (e) {
      notifyError(e)
      return undefined
    } finally {
      busy.value = false
    }
  }
  return { busy, run }
}
