import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../../../../..')
const root = path.join(repo, 'next/web')
const output = path.join(here, 'cache-ttl-ui-local')
const require = createRequire(path.join(root, 'package.json'))
const { createServer } = await import(pathToFileURL(require.resolve('vite')))
const { default: vue } = await import(pathToFileURL(require.resolve('@vitejs/plugin-vue')))
const { chromium } = createRequire(import.meta.url)('C:/Users/16790/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
fs.mkdirSync(output, { recursive: true })
process.chdir(root)

const observed = (total, oneHour, unknown) => ({ cache_write_evidence: { version: 1, total: { state: 'value', value: total }, explicit_5m: { state: 'value', value: 0 }, explicit_1h: { state: 'value', value: oneHour }, unclassified_tokens: unknown, completeness: unknown ? 'partial' : 'complete', source: 'sse', pricing_policy: 'platform_default_cache_write_compat' } })
const base = { id: 1, request_id: 'local-cache-ttl-fixture', model: 'local-synthetic-model', group_name: '本地合成分组', success: true, status_code: 200, input_tokens: 10, output_tokens: 12, cache_read_tokens: 0, cache_creation_tokens: 1219, cache_creation_1h_tokens: 1376, total_cost: '0.01282725', billing_status: 'billed', billing_mode: 'tokens', latency_ms: 123, stream: true, created_at: '2026-10-09T00:00:00Z' }
const fixtures = {
  partial: { ...base, metrics: observed(2595, 1376, 1219), billing_detail: { breakdown: { items: [{ label: 'cc', quantity: 1219, rate: '3.75', cost: '0.00457125' }, { label: 'cc1h', quantity: 1376, rate: '6', cost: '0.008256' }] }, inputs: { additional: [{ Metrics: observed(1441, 222, 1219) }], replacement: [{ Metrics: observed(1552, 333, 1219) }] } } },
  legacy: { ...base, metrics: {}, billing_detail: {} },
  'one-hour-only': { ...base, success: false, status_code: 502, input_tokens: 0, output_tokens: 0, cache_creation_tokens: 0, cache_creation_1h_tokens: 1647, total_cost: '0.009882', metrics: observed(1647, 1647, 0), billing_detail: {} }
}
const modules = {
  'review-auth': 'export const useAuthStore=()=>({has:()=>false})',
  'review-account-types': 'export const useAccountTypes=()=>({load:()=>{}})',
  'review-host': `export * from ${JSON.stringify(path.join(root, 'packages/host/src/index.ts').replaceAll('\\', '/'))};export const api={get:async()=>{throw Error('Fixture does not use API')},post:async()=>{throw Error('Read only')},put:async()=>{throw Error('Read only')},delete:async()=>{throw Error('Read only')}};export const session={get:()=>null,onChange:()=>()=>{}};`,
  'review-main': `import {createApp,h} from 'vue';import {i18n} from '@/i18n';import UsageDetail from '@/views/usage/UsageDetail.vue';import UsageTokens from '@/views/usage/UsageTokens.vue';import '@/style.css';const fixtures=${JSON.stringify(fixtures)};const key=new URL(location.href).searchParams.get('case')||'partial';const row=fixtures[key];i18n.global.locale.value='zh';createApp({render:()=>h('main',{style:'max-width:1400px;margin:0 auto;padding:16px;box-sizing:border-box'},[h('header',{style:'padding:12px;margin-bottom:16px;border:2px solid #b45309;background:#fffbeb'},[h('h1',{style:'font-size:20px;font-weight:700'},'本地组件视觉验收 · '+key),h('p',null,'合成计量数据；非生产管理页面；无账号、密钥或真实请求。')]),h('section',{style:'max-width:360px;margin-bottom:16px;border:1px solid #ddd;padding:12px'},[h('h2',null,'列表用量组件'),h(UsageTokens,{row})]),h(UsageDetail,{row})])}).use(i18n).mount('#app');`
}
const fixturePlugin = {
  name: 'cache-ttl-readonly-fixture',
  resolveId(id) { if (id in modules) return '\0' + id },
  load(id) { if (id.startsWith('\0') && id.slice(1) in modules) return modules[id.slice(1)] },
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url?.startsWith('/api/')) { res.statusCode = 403; res.end('Fixture blocks API'); return }
      if (req.url?.split('?')[0] !== '/cache-ttl-review.html') { next(); return }
      res.setHeader('Content-Type', 'text/html')
      res.end(await server.transformIndexHtml(req.url, '<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local cache TTL review</title></head><body><div id="app"></div><script type="module" src="/@id/review-main"></script></body></html>'))
    })
  }
}
const server = await createServer({ configFile: false, root, optimizeDeps: { noDiscovery: true, include: ['vue', 'vue-i18n', 'vue-router', 'pinia'] }, plugins: [vue(), fixturePlugin], resolve: { alias: [
  { find: '@/stores/auth', replacement: 'review-auth' }, { find: '@/views/accounts/accountTypes', replacement: 'review-account-types' }, { find: '@sub2api/host', replacement: 'review-host' }, { find: '@sub2api/ui', replacement: path.join(root, 'packages/ui/src/index.ts') }, { find: '@', replacement: path.join(root, 'src') }
] }, server: { host: '127.0.0.1', port: 5194, strictPort: true } })
await server.listen()
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const results = []
  for (const width of [1440, 390]) {
    for (const name of Object.keys(fixtures)) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, locale: 'zh-CN' })
      const errors = [], blocked = []
      page.on('pageerror', e => errors.push(e.message))
      await page.route('**/*', route => { const url = new URL(route.request().url()); return url.hostname === '127.0.0.1' ? route.continue() : (blocked.push(url.origin), route.abort()) })
      await page.goto(`http://127.0.0.1:5194/cache-ttl-review.html?case=${name}`, { waitUntil: 'networkidle' })
      await page.locator('.usage-detail').waitFor({ timeout: 15000 })
      const layout = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, height: document.body.scrollHeight, overflow: [...document.querySelectorAll('main *')].flatMap(el => { const b = el.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1) ? [{ tag: el.tagName, class: el.className, text: (el.textContent || '').slice(0, 100), left: b.left, right: b.right }] : [] }) }))
      const screenshot = `${name}-${width}.png`
      await page.screenshot({ path: path.join(output, screenshot), fullPage: true })
      results.push({ name, width, screenshot, ...layout, errors, blocked, facts: await page.getByTestId('cache-write-facts').count(), text: await page.locator('main').innerText() })
      await page.close()
    }
  }
  const sources = ['src/views/usage/UsageDetail.vue', 'src/views/usage/CacheWriteFacts.vue', 'src/views/usage/cacheWriteEvidence.ts', 'src/views/usage/UsageTokens.vue', 'src/views/usage/UsageTokenFacts.vue', 'src/views/prices/BillingBreakdown.vue', 'src/i18n/locales/zh/usage.ts', 'src/style.css']
  const sourceSHA256 = Object.fromEntries(sources.map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]))
  fs.writeFileSync(path.join(output, 'render-result.json'), JSON.stringify({ scope: 'Local synthetic fixtures, current real components and CSS; not production', gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), sourceSHA256, results }, null, 2))
  console.log(JSON.stringify(results.map(({ name, width, body, height, overflow, errors, blocked, facts }) => ({ name, width, body, height, overflow, errors, blocked, facts })), null, 2))
} finally { if (browser) await browser.close(); await server.close() }
