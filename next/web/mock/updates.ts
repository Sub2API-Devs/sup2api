import { fail, now, on } from './router'

let repository = 'example/sub2api'
let imported = false
on('GET', '/system/version', () => ({ version: '0.1.8', managed: true }))
on('GET', '/system/update-source', () => ({ repository }))
on('PUT', '/system/update-source', req => {
  repository = String(req.body?.repository || '').replace(/^https:\/\/github.com\//, '').replace(/\/$/, '')
  return { repository }
})
on('GET', '/system/update-check', () => ({ repository, current_version: '0.1.8', latest_version: repository ? '0.1.9' : '', has_update: !!repository, compatible: !!repository, tag: 'v0.1.9', release_url: `https://github.com/${repository}/releases/tag/v0.1.9`, notes: '改进网关状态展示与在线更新检测。\nGateway state visibility and online update checks.', manifest_asset: 'manifest.json', checked_at: now(), published_at: now(-3600), cached: false }))
on('POST', '/system/releases/import', req => {
  if (req.body?.repository !== repository) return fail(409, 'conflict', 'Update source changed')
  imported = true
  return { digest: 'release-online', manifest: { release_id: 'v0.1.9', build_id: 'online', source_commit: 'demo', created_at: now() } }
})
on('GET', '/system/releases', () => ({ releases: [
  ...['old','new'].map((v,i) => ({ digest:`release-${v}`,manifest:{ release_id:`0.1.${7+i}`,build_id:v,source_commit:'demo',created_at:now(-100) } })),
  ...(imported ? [{ digest: 'release-online', manifest: { release_id: 'v0.1.9', build_id: 'online', source_commit: 'demo', created_at: now() } }] : [])
] }))
