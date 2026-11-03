import { describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import { clusterStatus, describeSchedule, dotTone, formatDuration, nodeTaskCounts, runTone, sortClusterTasks, squareClass, taskTitle, type ClusterTask } from './tasks'

const t = (key: string, values?: Record<string, unknown>) => i18n.global.t(key, values ?? {})

const task = (over: Partial<ClusterTask>): ClusterTask => ({
  name: 'core.test.a', source: 'core', plugin_key: null, schedule: '@every 1m0s', timeout_ms: 50000, max_attempts: 1, enabled: true,
  registered: true, running: false, lease_node: null, last: null, last_success_at: null, consecutive_failures: 0, next_run_at: null,
  recent: [], stats_24h: { runs: 0, failed: 0, skipped: 0, avg_ms: 0, max_ms: 0 }, queued: 0, ...over
})

describe('scheduled task helpers', () => {
  it('describes schedules in words', () => {
    i18n.global.locale.value = 'zh'
    expect(describeSchedule('@every 1m0s', t)).toBe('每 1 分钟')
    expect(describeSchedule('@every 30s', t)).toBe('每 30 秒')
    expect(describeSchedule('@every 1h0m0s', t)).toBe('每 1 小时')
    expect(describeSchedule('@every 1h30m0s', t)).toBe('每 1 小时 30 分钟')
    expect(describeSchedule('0 3 * * *', t)).toBe('每天 03:00（UTC）')
    expect(describeSchedule('15 4 * * 1', t)).toBe('每周一 04:15（UTC）')
    expect(describeSchedule('5 * * * *', t)).toBe('每小时第 05 分（UTC）')
    expect(describeSchedule('*/5 1-3 * * *', t)).toBe('Cron：*/5 1-3 * * *（UTC）')
    expect(describeSchedule('', t)).toBe('按需')
    i18n.global.locale.value = 'en'
    expect(describeSchedule('@every 10m0s', t)).toBe('Every 10 min')
    expect(describeSchedule('0 3 * * *', t)).toBe('Daily at 03:00 (UTC)')
    expect(describeSchedule('', t)).toBe('On demand')
  })

  it('colors statuses', () => {
    expect(runTone('succeeded')).toBe('success')
    expect(runTone('failed')).toBe('danger')
    expect(runTone('timeout')).toBe('danger')
    expect(runTone('running')).toBe('info')
    expect(runTone('queued')).toBe('warning')
    expect(runTone('skipped')).toBe('gray')
    expect(runTone(undefined)).toBe('gray')
    expect(runTone('something-new')).toBe('gray')
    expect(dotTone('skipped')).toBe('neutral')
    expect(squareClass('failed')).toBe('bg-danger-500')
    expect(squareClass('succeeded')).toBe('bg-success-500')
  })

  it('shows a running task as running and a task without runs as never run', () => {
    expect(clusterStatus(task({}))).toBe('never')
    expect(clusterStatus(task({ last: { status: 'failed', duration_ms: 1, count: 0 } }))).toBe('failed')
    expect(clusterStatus(task({ running: true, last: { status: 'failed', duration_ms: 1, count: 0 } }))).toBe('running')
  })

  it('puts failing tasks first', () => {
    const sorted = sortClusterTasks([task({ name: 'b' }), task({ name: 'c', consecutive_failures: 2 }), task({ name: 'a' })])
    expect(sorted.map((x) => x.name)).toEqual(['c', 'a', 'b'])
  })

  it('formats durations and titles', () => {
    expect(formatDuration(120)).toBe('120 ms')
    expect(formatDuration(3400)).toBe('3.4 s')
    expect(formatDuration(125000)).toBe('2 min 5 s')
    expect(formatDuration(undefined)).toBe('—')
    expect(taskTitle({ name: 'core.x.y', title: { en: 'Sweep', zh: '清理' } }, 'zh')).toBe('清理')
    expect(taskTitle({ name: 'core.x.y' }, 'zh')).toBe('core.x.y')
  })

  it('counts the node tasks of one node', () => {
    const nodes = [{ node_id: 'n1', alive: true, tasks: [{ consecutive_failures: 0 }, { consecutive_failures: 3 }] as never }]
    expect(nodeTaskCounts(nodes, 'n1')).toEqual({ total: 2, failing: 1 })
    expect(nodeTaskCounts(nodes, 'n2')).toBeNull()
  })
})
