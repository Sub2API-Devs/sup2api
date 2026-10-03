// Production-sized local UI fixture. Opt in with SUB2API_MOCK_TOPOLOGY=1.
// Use "routing" to include forwarding and offload candidate relationships.
import { fail, now, on } from './router'

if (process.env.SUB2API_MOCK_TOPOLOGY) {
  const routing = process.env.SUB2API_MOCK_TOPOLOGY === 'routing'
  const legacy = process.env.SUB2API_MOCK_TOPOLOGY === 'legacy'
  const failure = process.env.SUB2API_MOCK_TOPOLOGY === 'failure'
  on('GET', '/system/version', () => failure ? fail(503, 'unavailable', 'Identity temporarily unavailable') : ({
    __status: 200,
    __headers: legacy ? {} : { 'X-Sub2api-Entry-Node': routing ? 'sup2api-4' : 'sup2api-2' },
    body: { data: { version: '0.1.11', managed: true, core_node_id: routing || legacy ? 'sup2api-1' : 'sup2api-2', core_boot_id: routing || legacy ? 'core-0' : 'core-1' } }
  }))
  const count = 4
  const versions: Record<string, string> = { anthropic: '0.2.1', gemini: '0.2.0', moderation: '0.1.6', openai: '0.3.0', volcengine: '0.10.1' }
  on('GET', '/nodes', () => Array.from({ length: count }, (_, i) => ({
    node_id: `sup2api-${i + 1}`, boot_id: `core-${i}`, addr: `127.0.0.1:${3130 + i}`, host_version: '0.1.9',
    started_at: now(-3600), last_heartbeat: now(-1),
    plugins: Object.fromEntries(Object.entries(versions).map(([key, version]) => [key, { serving: version, state: 'active', instances: [{ version, state: 'ready', restarts: 0 }] }]))
  })))
  on('GET', '/system/upgrades', () => ({
    upgrades: [], primary_node: 'sup2api-1', revision: 1,
    nodes: Array.from({ length: count }, (_, i) => ({
      node_id: `sup2api-${i + 1}`, shell_boot_id: `gateway-${i}`, core_boot_id: `core-${i}`, release_digest: 'fixture-release',
      mode: routing && i === 3 ? 'forward' : 'local', ready: true, enabled: true, stopped: false,
      route_revision: 1, last_seen: now(-1), cpu_percent: routing && i === 1 ? 87 : 0.3 + i / 10, offloading: routing && i === 1
    }))
  }))
  on('GET', '/system/releases', () => ({ releases: [{ digest: 'fixture-release', manifest: { release_id: 'v0.1.9', build_id: 'fixture', source_commit: 'mock', created_at: now(-3600) } }] }))
}
