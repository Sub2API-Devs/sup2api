import { computed, inject, onBeforeUnmount, onMounted, provide, reactive, ref, shallowRef, watch, type InjectionKey, type Ref } from 'vue'
import { errorMessage, fetchAuditors, fetchChannels, fetchCosts, fetchFlows, useModHost, type Auditor, type Channel, type Costs, type Flow, type Group } from '../host'
import { fetchCategoryStats, fetchPerformance, fetchStatus, fetchTrend, type CategoryStats, type Granularity, type PerformanceResult, type Status, type TrendResult } from '../stats'
import { groupList, loadGroups, loadUsers } from '../directory'

// Data of the overview tab (CONTRACTS §72.14.2), fetched in one place:
// GET /status, /stats/categories, /stats/trend, /stats/performance, /costs
// (7 / 30 days), and the auditor / channel / flow lists for names. Refreshes
// every minute while the tab is shown and the page visible; the lists only
// on a full reload (header button).

export const REFRESH_MS = 60_000

export type CostRange = 'today' | '7d' | '30d'

/** One fetched resource: value, error text, loading flag. */
interface Slot<T> {
  data: Ref<T | null>
  error: Ref<string>
  loading: Ref<boolean>
  load: () => Promise<void>
}

function slot<T>(fetch: () => Promise<T>, failText: () => string): Slot<T> {
  const data = shallowRef<T | null>(null)
  const error = ref('')
  const loading = ref(false)
  let seq = 0
  async function load() {
    const n = ++seq
    loading.value = true
    try {
      const v = await fetch()
      if (n !== seq) return
      data.value = v
      error.value = ''
    } catch (e) {
      if (n === seq) error.value = errorMessage(e, failText())
    } finally {
      if (n === seq) loading.value = false
    }
  }
  return { data, error, loading, load }
}

export function useOverview(active: () => boolean) {
  const t = useModHost().t

  const trendGranularity = ref<Granularity>('day')
  const perf = reactive({ granularity: 'hour' as Granularity, group: null as number | null, flow: null as number | null })
  const costRange = ref<CostRange>('today')

  const status = slot(fetchStatus, () => t('overviewP3.loadFailed'))
  const categories = slot(fetchCategoryStats, () => t('overviewP3.categories.loadFailed'))
  const trend = slot<TrendResult>(() => fetchTrend({ granularity: trendGranularity.value }), () => t('overviewP3.trend.loadFailed'))
  const performance = slot<PerformanceResult>(
    () => fetchPerformance({ granularity: perf.granularity, group_id: perf.group ?? undefined, flow_id: perf.flow ?? undefined }),
    () => t('overviewP3.perf.loadFailed')
  )
  const costs = slot<Costs>(() => fetchCosts(costRange.value), () => t('cost.loadFailed'))

  const auditors = shallowRef<Auditor[]>([])
  const channels = shallowRef<Channel[]>([])
  const flows = shallowRef<Flow[]>([])
  const groups = computed<Group[]>(() => groupList() || [])

  async function loadLists() {
    const [a, c, f] = await Promise.allSettled([fetchAuditors(), fetchChannels(), fetchFlows(), loadGroups()])
    if (a.status === 'fulfilled') auditors.value = a.value || []
    if (c.status === 'fulfilled') channels.value = c.value || []
    if (f.status === 'fulfilled') flows.value = f.value || []
  }

  let lastRefresh = 0
  /** Refreshes every figure; `full` also reloads the name lists. */
  async function refresh(full = false) {
    lastRefresh = Date.now()
    await Promise.all([
      status.load(),
      categories.load(),
      trend.load(),
      performance.load(),
      costRange.value === 'today' ? null : costs.load(),
      full ? loadLists() : null
    ])
  }

  watch(trendGranularity, () => trend.load())
  watch(perf, () => performance.load())
  watch(costRange, (r) => r !== 'today' && costs.load())
  // Names of the people in the attention card.
  watch(status.data, (s) => s && loadUsers(s.attention.map((a) => a.user_id)))

  let timer: ReturnType<typeof setInterval> | undefined
  const due = () => active() && !document.hidden && Date.now() - lastRefresh >= REFRESH_MS - 1000
  const tick = () => due() && refresh()
  onMounted(() => {
    refresh(true)
    timer = setInterval(tick, REFRESH_MS)
    document.addEventListener('visibilitychange', tick)
  })
  onBeforeUnmount(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', tick)
  })
  // Coming back to a stale tab refreshes it at once.
  watch(active, (on) => on && tick())

  const byId = <T extends { id: number }>(list: Ref<T[]>) => computed(() => new Map(list.value.map((x) => [x.id, x])))
  const auditorById = byId(auditors)
  const channelById = byId(channels)
  const flowById = byId(flows)
  const nameOf = (m: Ref<Map<number, { name: string }>>) => (id: number) => m.value.get(id)?.name || `#${id}`

  return {
    status,
    categories,
    trend,
    performance,
    costs,
    trendGranularity,
    perf,
    costRange,
    auditors,
    channels,
    flows,
    groups,
    auditorById,
    channelById,
    flowById,
    auditorName: nameOf(auditorById),
    channelName: nameOf(channelById),
    flowName: nameOf(flowById),
    refresh
  }
}

export type OverviewData = ReturnType<typeof useOverview>

const KEY: InjectionKey<OverviewData> = Symbol('moderation-overview')

/** Makes the overview data available to the cards of the tab. */
export function provideOverview(d: OverviewData) {
  provide(KEY, d)
}

/** The overview data of the enclosing tab (cards only). */
export function useOverviewData(): OverviewData {
  const d = inject(KEY)
  if (!d) throw new Error('overview card used outside OverviewTab')
  return d
}
