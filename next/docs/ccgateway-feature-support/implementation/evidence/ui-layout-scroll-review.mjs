import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../../../web')
const require = createRequire(path.join(root, 'package.json'))
const { createServer } = await import(pathToFileURL(require.resolve('vite')))
const { default: vue } = await import(pathToFileURL(require.resolve('@vitejs/plugin-vue')))
const { chromium } = createRequire(import.meta.url)('C:/Users/16790/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const phase = process.argv[2] === 'before' ? 'before' : 'after'
const output = path.join(here, `ui-layout-${phase}`); fs.mkdirSync(output, { recursive: true }); process.chdir(root)
const catalog = { catalog_version: 'local-layout-fixture', policy_schema_version: 1, runtime_verified: false, features: Array.from({ length: 12 }, (_, i) => ({ id: `F-LOCAL-${i}`, title: `合成特性 ${i + 1}`, scope: 'api', category: 'generation', status: 'partial', body_paths: [], beta_headers: [], mechanisms: [], reason: '仅用于实际组件布局检查' })) }
const config = { account_runtimes: true, mode: 'local', host: '', port: 22, user: '', auth_mode: 'password', host_key_fingerprint: '', has_password: false, has_private_key: false, has_passphrase: false, has_admin_key: false, has_api_key: false, images: {}, network: { pool: '10.0.0.0/8', allocation: 'random' } }
const evidence = { cache_write_evidence: { version: 1, total: { state: 'value', value: 2595 }, explicit_5m: { state: 'value', value: 0 }, explicit_1h: { state: 'value', value: 1376 }, unclassified_tokens: 1219, completeness: 'partial', source: 'sse', pricing_policy: 'platform_default_cache_write_compat' } }
const row = { id: 1, request_id: 'local-layout-request', client_request_id: 'local-layout-rid', model: 'local-test-model', user_email: 'local-fixture@example.invalid', group_name: '本地夹具分组', account_name: '本地夹具账号', success: true, status_code: 200, input_tokens: 218, output_tokens: 409, cache_read_tokens: 2752, cache_creation_tokens: 1219, cache_creation_1h_tokens: 1376, total_cost: '0.0267054', billing_status: 'billed', latency_ms: 23804, stream: true, created_at: '2026-10-09T00:00:00Z', metrics: evidence }
const modules = {
  'layout-auth': 'export const useAuthStore=()=>({has:()=>false})',
  'layout-account-types': 'export const useAccountTypes=()=>({load:()=>{}})',
  'layout-host': `export * from ${JSON.stringify(path.join(root, 'packages/host/src/index.ts').replaceAll('\\', '/'))};export const api={get:async path=>path.endsWith('/features')?${JSON.stringify(catalog)}:path.endsWith('/remote-config')?${JSON.stringify(config)}:{},post:async()=>{throw Error('Read only')},put:async()=>{throw Error('Read only')},delete:async()=>{throw Error('Read only')}};export const session={get:()=>null,onChange:()=>()=>{}};`,
  'layout-main': `import {createApp,h} from 'vue';import {i18n} from '@/i18n';import UsageTable from '@/views/usage/UsageTable.vue';import RemoteSettings from '@/views/ccgateway/RemoteSettings.vue';import '@/style.css';i18n.global.locale.value='zh';const usage=new URL(location.href).searchParams.get('case')==='usage';createApp({render:()=>h('div',{class:'layout-shell'},[h('aside',{class:'layout-sidebar'},'本地合成侧栏'),h('main',{class:'layout-main'},[h('header',{style:'padding:16px;border:2px solid #b45309;margin-bottom:24px;background:#fffbeb'},'本地实际组件布局验收 · 合成数据 · 非生产截图'),h('div',{style:'height:160px'},'模拟真实页标题、过滤及统计区域'),usage?h('div',{class:'card overflow-hidden'},[h(UsageTable,{rows:[${JSON.stringify(row)}],showClientRequestId:true})]):h(RemoteSettings)])])}).use(i18n).mount('#app');`
}
const fixture = { name: 'layout-fixture', resolveId(id) { if (id in modules) return '\0' + id }, load(id) { if (id.startsWith('\0') && id.slice(1) in modules) return modules[id.slice(1)] }, configureServer(server) { server.middlewares.use(async (req, res, next) => {
  if (req.url?.split('?')[0] !== '/layout.html') { next(); return }
  res.setHeader('Content-Type', 'text/html'); res.end(await server.transformIndexHtml(req.url, '<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>.layout-shell{display:flex;min-width:0}.layout-sidebar{width:240px;flex-shrink:0;padding:24px}.layout-main{min-width:0;flex:1;padding:32px}@media(max-width:767px){.layout-sidebar{display:none}.layout-main{padding:16px}}</style></head><body><div id="app"></div><script type="module" src="/@id/layout-main"></script></body></html>'))
} ) } }
const server = await createServer({ configFile: false, root, optimizeDeps: { noDiscovery: true, include: ['vue', 'vue-i18n', 'vue-router', 'pinia'] }, plugins: [vue(), fixture], resolve: { alias: [{ find: '@/stores/auth', replacement: 'layout-auth' }, { find: '@/views/accounts/accountTypes', replacement: 'layout-account-types' }, { find: '@sub2api/host', replacement: 'layout-host' }, { find: '@sub2api/ui', replacement: path.join(root, 'packages/ui/src/index.ts') }, { find: '@', replacement: path.join(root, 'src') }] }, server: { host: '127.0.0.1', port: 5195, strictPort: true } })
await server.listen(); let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true }); const results = []
  for (const width of [1440, 900, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, locale: 'zh-CN' }), errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
    await page.goto('http://127.0.0.1:5195/layout.html?case=usage', { waitUntil: 'networkidle' })
    if (width >= 768) await page.locator('table tbody tr').first().locator('td').first().getByRole('button').click()
    else await page.getByTestId('mobile-usage-record').getByRole('button', { name: '查看详情', exact: true }).click()
    const detail = page.locator('.usage-detail').filter({ visible: true }); await detail.waitFor()
    for (const scroll of width >= 768 ? ['left', 'right'] : ['left']) {
      if (scroll === 'right') await page.locator('.table-container').evaluate(el => { el.scrollLeft = el.scrollWidth })
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)))
      const bounds = await detail.evaluate(el => {
        const d = el.getBoundingClientRect(), container = el.closest('.table-container'), c = container?.getBoundingClientRect()
        return { viewport: innerWidth, body: document.body.scrollWidth, detailLeft: d.left, detailRight: d.right, containerLeft: c?.left ?? 0, containerRight: c?.right ?? innerWidth, scrollLeft: container?.scrollLeft ?? 0, scrollWidth: container?.scrollWidth ?? 0, clientWidth: container?.clientWidth ?? 0, contentOverflow: [...el.querySelectorAll('section, dt, dd')].some(x => { const b = x.getBoundingClientRect(); return b.right > d.right + 1 || b.left < d.left - 1 }) }
      })
      await page.screenshot({ path: path.join(output, `usage-${width}-${scroll}.png`), fullPage: true })
      results.push({ name: `usage-${width}-${scroll}`, ...bounds, pass: bounds.detailLeft >= bounds.containerLeft - 1 && bounds.detailRight <= bounds.containerRight + 1 && !bounds.contentOverflow })
    }
    await page.goto('http://127.0.0.1:5195/layout.html?case=features', { waitUntil: 'networkidle' }); await page.getByTestId('settings-tab-requests').click()
    for (const position of ['initial', 'bottom']) {
      if (position === 'bottom') await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
      const overlap = await page.getByTestId('remote-save').evaluate(button => {
        const footer = button.parentElement, form = footer.parentElement, previous = footer.previousElementSibling, f = footer.getBoundingClientRect(), p = previous.getBoundingClientRect()
        return { footerTop: f.top, previousBottom: p.bottom, footerPosition: getComputedStyle(footer).position, overlapsPrevious: f.top < p.bottom - 1, viewport: innerWidth, body: document.body.scrollWidth, formWidth: form.getBoundingClientRect().width }
      })
      await page.screenshot({ path: path.join(output, `features-${width}-${position}.png`), fullPage: position === 'initial' })
      results.push({ name: `features-${width}-${position}`, ...overlap, pass: !overlap.overlapsPrevious })
    }
    results.push({ name: `errors-${width}`, errors, pass: !errors.length }); await page.close()
  }
  fs.writeFileSync(path.join(output, 'render-result.json'), JSON.stringify({ phase, scope: 'local real components with synthetic sidebar and data; not production', results }, null, 2)); console.log(JSON.stringify(results, null, 2))
  if (phase === 'after' && results.some(r => !r.pass)) process.exitCode = 1
} finally { if (browser) await browser.close(); await server.close() }
