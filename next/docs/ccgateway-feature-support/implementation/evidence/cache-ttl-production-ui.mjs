// Receives a real platform session over a private stdin pipe. Never run with
// credentials in argv, environment, a file, a trace, HAR or console output.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('C:/Users/16790/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const output = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cache-ttl-ui-production')
let browser, context, stage = 'stdin', fatal = '', input
let authorizedRequestID = ''
const report = { scope: 'Real production application via SSH loopback tunnel; no mock responses', checks: [], captures: [], blocked: [], pageErrors: 0 }
const privateLabels = new Set()

function check(condition, reason) { if (!condition) throw new Error(reason) }
function healthy() {
  check(!fatal, fatal)
  check(Date.now() < input.expires_at - 30_000, 'access token near expiry; no refresh permitted')
}
try {
  check(!process.stdin.isTTY, 'a private stdin pipe is required')
  const chunks = []; let size = 0
  for await (const chunk of process.stdin) { size += chunk.length; check(size < 32_768, 'stdin exceeds bound'); chunks.push(chunk) }
  input = JSON.parse(Buffer.concat(chunks).toString('utf8')); chunks.length = 0
  const base = new URL(input.base)
  check(['127.0.0.1', '[::1]', 'localhost'].includes(base.hostname), 'base must be an SSH loopback tunnel, not public HTTP')
  check(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password && !base.search && !base.hash && base.pathname === '/', 'invalid tunnel origin')
  check(typeof input.access_token === 'string' && input.access_token.length > 20 && !/[\r\n]/.test(input.access_token), 'invalid access token shape')
  check(Number.isSafeInteger(input.expires_at) && input.expires_at > Date.now() + 120_000, 'access token expires too soon')
  check(typeof input.usage_client_request_id === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(input.usage_client_request_id), 'an exact public acceptance client request id is required')
  check(Number.isSafeInteger(input.usage_log_id) && input.usage_log_id > 0, 'an exact accepted usage row id is required')
  check(typeof input.expected_core_version === 'string' && /^0\.1\.\d+$/.test(input.expected_core_version), 'expected release version required')
  fs.mkdirSync(output, { recursive: true })
  stage = 'launch'
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' })
  await context.addInitScript(({ origin, token, expires }) => {
    if (location.origin !== origin) return
    localStorage.setItem('s2a.session', JSON.stringify({ access_token: token, refresh_token: '', expires_at: expires }))
    localStorage.setItem('s2a.locale', 'zh')
  }, { origin: base.origin, token: input.access_token, expires: input.expires_at })

  // All production responses pass through unchanged. Initial usage list and
  // summary requests are narrowed to the authorized RID, before any broad data
  // reaches the browser. The visible filter is filled with the same RID below.
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    if (fatal) return route.abort()
    if (url.origin !== base.origin || req.method() !== 'GET') {
      report.blocked.push({ reason: url.origin !== base.origin ? 'cross-origin' : 'non-GET', path: url.origin === base.origin ? url.pathname : '[external]', method: req.method() })
      return route.abort()
    }
    if (/\/(auth|credentials|secrets|api-keys)(\/|$)/.test(url.pathname) || /\/(logs|request-logs|diagnostics)(\/|$)/.test(url.pathname)) {
      report.blocked.push({ reason: 'outside-read-scope', path: '[restricted]' }); return route.abort()
    }
    if (url.pathname === '/api/v1/usage' || url.pathname === '/api/v1/usage/summary') {
      if (!authorizedRequestID) return route.abort()
      url.searchParams.set('client_request_id', input.usage_client_request_id)
      url.searchParams.set('request_id', authorizedRequestID)
      return route.continue({ url: url.toString() })
    }
    if (/^\/api\/v1\/usage\/\d+$/.test(url.pathname) && url.pathname !== `/api/v1/usage/${input.usage_log_id}`) return route.abort()
    return route.continue()
  })
  context.on('response', response => {
    if (response.status() !== 401) return
    fatal = 'HTTP 401; session renewal forbidden'
    void context.close().catch(() => {})
  })
  const page = await context.newPage()
  page.on('pageerror', () => { report.pageErrors++ })
  // Use the real login token for exact preflight reads only; no account data is
  // saved and this request context is discarded together with the browser.
  stage = 'real-api-preflight'
  for (const [name, endpoint] of [['me', '/api/v1/me'], ['version', '/api/v1/system/version'], ['usage', `/api/v1/usage/${input.usage_log_id}`]]) {
    healthy()
    const response = await context.request.get(base.origin + endpoint, { headers: { Authorization: `Bearer ${input.access_token}` }, maxRedirects: 0 })
    if (response.status() === 401) fatal = 'HTTP 401; session renewal forbidden'
    check(response.status() === 200, 'read preflight failed')
    const data = (await response.json()).data
    for (const key of ['email', 'display_name', 'user_email', 'user_name', 'account_name', 'api_key_name', 'group_name']) {
      if (typeof data?.[key] === 'string' && data[key].length > 0) privateLabels.add(data[key])
    }
    if (name === 'version') check(data?.version === input.expected_core_version, 'release version mismatch')
    if (name === 'me') check(data?.superuser || ['usage:all:read', 'plugin:read', 'settings:read'].every(p => data?.permissions?.includes(p)), 'real session lacks required read permissions')
    if (name === 'usage') {
      check(data?.id === input.usage_log_id && data?.client_request_id === input.usage_client_request_id, 'usage row does not match authorized RID')
      check(typeof data.request_id === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(data.request_id), 'authorized usage row lacks a valid request id')
      authorizedRequestID = data.request_id
      privateLabels.add(authorizedRequestID)
    }
    report.checks.push({ name, status: response.status() })
  }
  async function capture(name) {
    healthy()
    const layout = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, height: document.body.scrollHeight }))
    // AppTopbar.vue's real RouterLink wraps the balance. Match its destination
    // without reading or retaining the monetary value.
    const masks = [page.locator('input[type="password"]'), page.locator('header a[href="/me/usage?tab=ledger"]'), ...[...privateLabels].map(value => page.getByText(value, { exact: false }))]
    await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true, mask: masks, maskColor: '#cbd5e1' })
    report.captures.push({ name, privacyMasked: true, topbarBalanceMasked: true, ...layout })
  }
  const isUsageList = response => new URL(response.url()).pathname === '/api/v1/usage'
  async function verifyUsageList(response) {
    healthy()
    check(response.status() === 200, 'exact usage list failed')
    const body = await response.json()
    check(Array.isArray(body?.data) && body.data.length === 1 && body.page?.total === 1, 'authorized usage list is not unique')
    const row = body.data[0]
    check(row.id === input.usage_log_id && row.request_id === authorizedRequestID && row.client_request_id === input.usage_client_request_id, 'usage list does not match authorized record')
  }
  for (const width of [1440, 390]) {
    stage = `usage-${width}`; healthy()
    await page.setViewportSize({ width, height: 1000 })
    const initialList = page.waitForResponse(isUsageList)
    await page.goto(base.origin + '/usage', { waitUntil: 'networkidle' })
    await verifyUsageList(await initialList)
    healthy(); check(!page.url().includes('/login') && !page.url().includes('/forbidden'), 'real app rejected session')
    const filteredList = page.waitForResponse(isUsageList)
    await page.getByPlaceholder('精确匹配 X-Request-Id').fill(input.usage_client_request_id)
    await verifyUsageList(await filteredList)
    if (width >= 768) {
      const row = page.locator('tr').filter({ has: page.getByTestId('client-request-id') }).filter({ hasText: input.usage_client_request_id })
      check(await row.count() === 1, 'visible authorized usage row is not unique')
      await row.locator('td').first().getByRole('button').click()
    } else {
      const row = page.getByTestId('mobile-usage-record').filter({ hasText: input.usage_client_request_id })
      check(await row.count() === 1, 'visible authorized usage row is not unique')
      await row.getByRole('button', { name: '查看详情', exact: true }).click()
    }
    await page.locator('.usage-detail').filter({ visible: true }).waitFor()
    await page.getByTestId('cache-write-facts').filter({ visible: true }).first().waitFor()
    await capture(`usage-${width}`)
    stage = `features-${width}`; healthy()
    await page.goto(base.origin + '/plugins/ccgateway?tab=settings', { waitUntil: 'networkidle' })
    await page.getByTestId('settings-tab-requests').click()
    await page.getByTestId('feature-support').filter({ visible: true }).waitFor()
    await capture(`features-${width}`)
  }
  report.completed = true
} catch (error) {
  report.completed = false
  report.failure = { stage, reason: fatal || 'runner validation or browser action failed', type: error?.name || 'Error' }
  process.exitCode = 1
} finally {
  if (context) await context.close().catch(() => {})
  if (browser) await browser.close().catch(() => {})
  if (input) { input.access_token = ''; input = undefined }
  privateLabels.clear()
  authorizedRequestID = ''
  // No raw error text, headers, tokens, bodies or console messages are persisted.
  if (fs.existsSync(output)) fs.writeFileSync(path.join(output, 'render-result.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
}
