// Types and helpers of the scheduled tasks page (GET /system/tasks,
// TASK-FRAMEWORK-DESIGN §10).
import type { StatusTone, Tone } from '@sub2api/ui'

export type LocalizedText = Record<string, string>

export interface RunSummary {
  node?: string
  started_at?: string | null
  finished_at?: string | null
  duration_ms: number
  status: string
  count: number
  message?: string
  error?: string
}

export interface Stats24h { runs: number; failed: number; skipped: number; avg_ms: number; max_ms: number }

export interface ClusterTask {
  name: string
  title?: LocalizedText
  description?: LocalizedText
  source: string
  plugin_key: string | null
  schedule: string
  timeout_ms: number
  max_attempts: number
  enabled: boolean
  registered: boolean
  running: boolean
  lease_node: string | null
  last: RunSummary | null
  last_success_at: string | null
  consecutive_failures: number
  next_run_at: string | null
  recent: string[]
  stats_24h: Stats24h
  queued: number
}

export interface NodeTask {
  name: string
  title?: LocalizedText
  description?: LocalizedText
  schedule: string
  timeout_ms: number
  require_work: boolean
  running: boolean
  last_started_at?: string
  last_finished_at?: string
  duration_ms: number
  status?: string
  count: number
  message?: string
  error?: string
  last_success_at?: string
  consecutive_failures: number
  skipped: number
  next_run_at?: string
  recent: string[]
  failed_24h: number
}

export interface NodeTasks { node_id: string; alive: boolean; tasks: NodeTask[] }

export interface TaskSummary { total: number; running: number; failing: number; failed_24h: number; leader: string }

export interface TasksOverview { summary: TaskSummary; cluster: ClusterTask[]; nodes: NodeTasks[] }

export interface TaskDetail {
  name: string
  scope: 'cluster' | 'node'
  title?: LocalizedText
  description?: LocalizedText
  schedule: string
  timeout_ms: number
  max_attempts?: number
  require_work?: boolean
  run_on_start?: boolean
  cluster?: ClusterTask
  nodes?: NodeTasks[]
}

export interface TaskRun {
  id: string
  node?: string
  scheduled_at?: string
  started_at?: string | null
  finished_at?: string | null
  duration_ms: number
  attempt: number
  max_attempts: number
  status: string
  manual: boolean
  count: number
  message?: string
  error?: string
  errors?: Array<{ attempt: number; at: string; error: string }>
}

export interface RunsPage { runs: TaskRun[]; next_before_id: number | null }

/** Every status a run or a task can show. */
export const STATUSES = ['running', 'succeeded', 'failed', 'timeout', 'skipped', 'queued', 'retrying', 'cancelled', 'never'] as const

const TONES: Record<string, Tone> = {
  running: 'info',
  succeeded: 'success',
  failed: 'danger',
  timeout: 'danger',
  skipped: 'gray',
  queued: 'warning',
  retrying: 'warning',
  cancelled: 'gray',
  never: 'gray'
}

/** Badge tone of a run status. */
export function runTone(status: string | null | undefined): Tone {
  return TONES[status || 'never'] ?? 'gray'
}

/** Status dot tone (SStatusDot) of a run status. */
export function dotTone(status: string | null | undefined): StatusTone {
  const tone = runTone(status)
  return tone === 'success' || tone === 'warning' || tone === 'danger' || tone === 'info' ? tone : 'neutral'
}

/** CSS classes of one square of the "recent runs" strip. */
export function squareClass(status: string): string {
  switch (runTone(status)) {
    case 'success': return 'bg-success-500'
    case 'danger': return 'bg-danger-500'
    case 'warning': return 'bg-warning-500'
    case 'info': return 'bg-info-500'
    default: return 'bg-gray-300 dark:bg-gray-600'
  }
}

/** The status a cluster task shows: running, its latest run, or never run. */
export function clusterStatus(task: ClusterTask): string {
  if (task.running) return 'running'
  return task.last?.status || 'never'
}

/** The status a node task shows on one node. */
export function nodeStatus(task: NodeTask): string {
  if (task.running) return 'running'
  return task.status || 'never'
}

type Translate = (key: string, values?: Record<string, unknown>) => string

const UNITS: Array<[string, string]> = [['h', 'hours'], ['m', 'minutes'], ['s', 'seconds']]

/**
 * Words for a task schedule as the server writes it: "@every 1m0s" (a Go
 * duration), a five-field cron in UTC, or "" (runs only what is submitted).
 */
export function describeSchedule(schedule: string, t: Translate): string {
  const s = (schedule || '').trim()
  if (!s) return t('tasks.schedule.onDemand')
  if (s.startsWith('@every ')) {
    const parts: string[] = []
    const rest = s.slice(7).replace(/(\d+)ms$/, '')
    for (const [unit, key] of UNITS) {
      const m = new RegExp(`(\\d+(?:\\.\\d+)?)${unit}(?!s)`).exec(rest)
      const n = m ? Number(m[1]) : 0
      if (n > 0) parts.push(t(`tasks.schedule.${key}`, { n }))
    }
    if (!parts.length) return s
    return t('tasks.schedule.every', { what: parts.join(' ') })
  }
  const f = s.split(/\s+/)
  if (f.length === 5 && /^\d+$/.test(f[0]) && /^\d+$/.test(f[1]) && f[2] === '*' && f[3] === '*') {
    const time = `${f[1].padStart(2, '0')}:${f[0].padStart(2, '0')}`
    if (f[4] === '*') return t('tasks.schedule.daily', { time })
    if (/^[0-6]$/.test(f[4])) return t('tasks.schedule.weekly', { day: t(`tasks.weekday.${f[4]}`), time })
  }
  if (f.length === 5 && /^\d+$/.test(f[0]) && f[1] === '*' && f[2] === '*' && f[3] === '*' && f[4] === '*') {
    return t('tasks.schedule.hourlyAt', { minute: f[0].padStart(2, '0') })
  }
  return t('tasks.schedule.cron', { expr: s })
}

/** "120 ms", "3.4 s", "2 min 5 s". */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`
  const min = Math.floor(ms / 60_000)
  const sec = Math.round((ms % 60_000) / 1000)
  return sec ? `${min} min ${sec} s` : `${min} min`
}

/** The task's display title: its localized title, or its name. */
export function taskTitle(task: { name: string; title?: LocalizedText }, locale: string): string {
  const t = task.title
  if (!t) return task.name
  return t[locale] || t.en || Object.values(t)[0] || task.name
}

/** Cluster tasks with failing ones first, then by name. */
export function sortClusterTasks(tasks: ClusterTask[]): ClusterTask[] {
  return [...tasks].sort((a, b) => Number(b.consecutive_failures > 0) - Number(a.consecutive_failures > 0) || a.name.localeCompare(b.name))
}

/** Every node task name across nodes, sorted. */
export function nodeTaskNames(nodes: NodeTasks[]): string[] {
  return [...new Set(nodes.flatMap((n) => n.tasks.map((t) => t.name)))].sort()
}

/** Node task counts of one node, for the cluster nodes page. */
export function nodeTaskCounts(nodes: NodeTasks[], nodeID: string): { total: number; failing: number } | null {
  const n = nodes.find((x) => x.node_id === nodeID)
  if (!n) return null
  return { total: n.tasks.length, failing: n.tasks.filter((t) => t.consecutive_failures > 0).length }
}
