import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, normalize } from 'node:path'
import { fail, on, paginate } from './router'

// Mock of the dynweight plugin routes (/p/dynweight/*, CONTRACTS §74.5) and
// its native UI from plugins/dynweight/ui/native/dist (build it first). The
// configuration is kept in memory; validation only checks what the console
// cannot (version conflicts), the plugin itself does the rest.

const DW_DIST = fileURLToPath(new URL('../../plugins/dynweight/ui/native/dist/', import.meta.url))

export const dynweightUIPlugin = {
  key: 'dynweight',
  version: '0.4.0',
  name: { en: 'Dynamic Weight', zh: '动态权重' },
  asset_base: '/plugin-ui/dynweight/0.4.0-dev',
  menus: [{ id: 'dynweight', section: 'gateway', label: { en: 'Dynamic Weight', zh: '动态权重' }, page: 'dashboard', icon: 'chart' }],
  pages: { dashboard: { type: 'native', title: { en: 'Dynamic Weight', zh: '动态权重' }, component: 'DynweightDashboard' } },
  slots: [{ slot: 'account.list.weight', component: 'DynweightAccountWeight', permission: 'dynweight:read' }],
  native_entry: 'ui/native/entry.js',
  trust: 'official',
  host_ui_compat: '^3.3'
}

export function dynweightAsset(path: string): { type: string; body: Buffer } | null {
  if (!path.startsWith('ui/native/')) return null
  const rel = normalize(path.slice('ui/native/'.length))
  if (rel.startsWith('..')) return null
  const file = join(DW_DIST, rel)
  if (!existsSync(file)) return null
  return { type: rel.endsWith('.css') ? 'text/css' : 'text/javascript', body: readFileSync(file) }
}

// The factory layer of dynweight 0.4.0 (rules.DefaultLayer).
const DEFAULT_LAYER = {
  enabled: true,
  window_seconds: 60,
  min_samples: 10,
  min_samples_strict: true,
  clear_sticky_on_zero: true,
  exempt_status_codes: '400',
  min_weight_mode: 'base_percent',
  min_weight: 0,
  rules: [
    { name: '错误率过高', conditions: [{ metric: 'error_rate', op: 'gte', value: 30 }], periods: 3, hit_periods: 2 },
    { name: '首字 p95 过慢', conditions: [{ metric: 'ttfb', p: 95, op: 'gte', value: 10000 }], periods: 3, hit_periods: 2 },
    {
      name: '首字挂死',
      conditions: [
        { metric: 'ttfb', p: 100, op: 'gte', value: 60000 },
        { join: 'or', metric: 'latency', p: 100, op: 'gte', value: 120000, scope: 'non_stream' }
      ],
      periods: 1,
      hit_periods: 1
    },
    {
      name: '健康恢复',
      conditions: [
        { metric: 'error_rate', op: 'lt', value: 15 },
        { join: 'and', metric: 'ttfb', p: 95, op: 'lt', value: 10000, when_empty: 'pass' },
        { join: 'and', metric: 'ttfb', p: 100, op: 'lt', value: 60000, when_empty: 'pass' },
        { join: 'and', metric: 'latency', p: 100, op: 'lt', value: 120000, scope: 'non_stream', when_empty: 'pass' }
      ],
      periods: 1,
      hit_periods: 1
    },
    { name: '复活探测', conditions: [{ metric: 'weight', op: 'lte', value: 0 }], periods: 2, hit_periods: 2 }
  ],
  strategies: [
    { name: '错误率过高', when: '错误率过高', actions: [{ type: 'weight_degrade', mode: 'current_percent', value: 30 }, { type: 'affinity_clear', percent: 30 }] },
    { name: '首字 p95 过慢', when: '首字 p95 过慢', actions: [{ type: 'weight_degrade', mode: 'current_percent', value: 30 }, { type: 'affinity_clear', percent: 30 }] },
    { name: '首字挂死', when: '首字挂死', actions: [{ type: 'weight_degrade', mode: 'current_percent', value: 50 }, { type: 'affinity_clear', percent: 30 }] },
    { name: '自动回升', when: '健康恢复', actions: [{ type: 'weight_climb', mode: 'base_percent', value: 10 }] },
    { name: '复活探测', when: '复活探测', actions: [{ type: 'weight_climb', mode: 'base_percent', value: 10 }] }
  ]
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

let version = 1
let config: any = {
  ...clone(DEFAULT_LAYER),
  groups: { '1': { ...clone(DEFAULT_LAYER), window_seconds: 120 } },
  accounts: { '1': { enabled: false } },
  notify: { enabled: false, channel: '', recipients: [], language: 'zh' },
  log_events: true
}

on('GET', '/p/dynweight/config', () => ({ config, version }))
on('GET', '/p/dynweight/defaults', () => DEFAULT_LAYER)
on('GET', '/p/dynweight/channels', () => [])
on('POST', '/p/dynweight/config/validate', (req) => ({ config: req.body?.config, version: req.body?.version ?? version, warnings: [] }))
on('PUT', '/p/dynweight/config', (req) => {
  if (Number(req.body?.version) !== version) return fail(409, 'conflict', 'the configuration was changed meanwhile, reload it / 配置已被修改，请刷新后重试')
  config = req.body.config
  version++
  return { config, version, warnings: [] }
})
on('GET', '/p/dynweight/status', (req) => paginate([], req.query))
on('GET', '/p/dynweight/events', (req) => paginate([], req.query))
on('GET', '/p/dynweight/stats', () => ({ enabled: true, config_version: version, node_id: 'mock-1', started_at: Math.floor(Date.now() / 1000) }))
on('GET', '/p/dynweight/weights', () => ({}))
on('POST', '/p/dynweight/reset', () => ({ reset: 0 }))
