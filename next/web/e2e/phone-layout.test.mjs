/* global process, document, window, getComputedStyle */
// Phone layout regression of the console, run against the mock app (no
// backend). next/e2e is the API-level Go suite and drives no browser, so this
// is a node:test file using Playwright from its global install:
//
//   npx vite --mode mock --port 5185 &
//   NODE_PATH=$(npm root -g) E2E_WEB_URL=http://localhost:5185 node --test e2e/phone-layout.test.mjs
//
// On an iPhone 13, a Pixel 7 and a Galaxy S8 (360px, the narrowest common
// width) it signs in (admin@example.com / admin), opens
// every page of the console menu and of system settings, the plugin settings
// the installed plugins list opens, and the pages only another page links to,
// and checks that
// - the page does not scroll sideways: documentElement.scrollWidth stays within
//   the device width (innerWidth itself grows with the content under device
//   emulation, so it is not the yardstick);
// - list pages show their rows as STable cards, with no visible <table> in main,
//   and nothing in a card, its details opened, reaches past the card's edge
//   (the cards cut it there, so the page width alone would not show it);
// - on the main list pages the first card starts within the first screen.
// - a tab bar with more tabs than fit scrolls inside itself, the selected tab
//   in view;
// - ticking a card docks the bulk bar at the bottom without moving the list:
//   the first card stays where it was, the fab hides and the end of the page
//   scrolls clear of the dock;
// - docked actions that do not fit fade at the edge hiding them, and a tap on
//   a button only partly in view brings it into view without pressing it.
import { createRequire } from 'node:module'
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'

// createRequire honours NODE_PATH, so the global Playwright install resolves.
const { chromium, devices } = createRequire(import.meta.url)('playwright')

const BASE = process.env.E2E_WEB_URL || 'http://localhost:5185'
const DEVICES = ['iPhone 13', 'Pixel 7', 'Galaxy S8']
/** Pages whose rows are STable cards on a phone. */
const CARD_PAGES = [
  '/accounts',
  '/groups',
  '/proxies',
  '/prices',
  '/usage',
  '/ledger',
  '/users',
  '/plugins',
  '/publishers',
  '/nodes',
  '/system/tasks',
  '/system/audit',
  '/me/api-keys',
  '/me/usage',
  '/me/wallet'
]
/** List pages whose first card must show without scrolling. */
const FIRST_SCREEN_PAGES = [
  '/accounts',
  '/groups',
  '/proxies',
  '/prices',
  '/usage',
  '/ledger',
  '/users',
  '/publishers',
  '/system/audit',
  '/me/api-keys',
  '/me/usage'
]

/** List pages with a bulk bar: ticking a card docks it at the bottom of the screen. */
const BULK_PAGES = ['/accounts', '/me/api-keys']

/** A page whose tab bar is wider than a phone, opened on its last tabs. */
const TABS_PAGE = '/plugins/guard?tab=settings'

/**
 * The pages of system settings (CONTRACTS §90): on the settings page the
 * sidebar shows the settings view's menu instead of the console's, with the
 * configuration pages (/settings?tab=<key>), groups and model prices.
 */
async function settingsPages(page) {
  await page.goto(`${BASE}/settings`)
  await page.waitForSelector('[data-testid="nav-view-settings"]', { state: 'attached' })
  await page.waitForLoadState('networkidle')
  return page.$$eval('[data-testid="nav-view-settings"] a[href]:not([data-testid="nav-back"])', links =>
    links.map(a => a.getAttribute('href'))
  )
}

/** The plugins' settings: the links on the rows of the installed plugins list, the one place that opens them. */
async function pluginSettingsPages(page) {
  await page.goto(`${BASE}/plugins`)
  await page.waitForSelector('main ul[role="list"] > li')
  return page.$$eval('main ul[role="list"] > li a[href]', links => links.map(a => a.getAttribute('href')))
}

for (const name of DEVICES) {
  describe(`phone layout on ${name}`, () => {
    const device = devices[name]
    let browser
    let page
    let pages = []

    before(async () => {
      browser = await chromium.launch()
      const context = await browser.newContext({ ...device })
      page = await context.newPage()
      await page.goto(`${BASE}/login`)
      await page.fill('input[type=email]', 'admin@example.com')
      await page.fill('input[type=password]', 'admin')
      await page.click('button[type=submit]')
      await page.waitForURL(url => !url.pathname.startsWith('/login'))
      await page.waitForSelector('aside nav a[href]', { state: 'attached' })
      // The submenus (core directories and plugin sections) start folded; open them all to list every page.
      await page.$$eval('aside nav [aria-expanded="false"]', buttons => buttons.forEach(b => b.click()))
      const sidebar = await page.$$eval('aside nav a[href]', links => links.map(a => a.getAttribute('href')))
      pages = [...new Set([...sidebar, ...(await settingsPages(page)), ...(await pluginSettingsPages(page))])]
    })
    after(() => browser?.close())

    test('the menu, system settings and the installed plugins list reach the console pages', () => {
      assert.ok(pages.length > 10, `pages: ${pages.join(', ')}`)
      for (const path of CARD_PAGES) assert.ok(pages.includes(path), `${path} is not in the menu`)
      assert.ok(pages.includes('/plugins/guard?tab=settings'), 'the installed plugins list opens no settings form')
    })

    test('no page scrolls sideways; list pages show cards, the main ones within the first screen', async t => {
      for (const path of pages) {
        await t.test(path, async () => {
          await page.goto(`${BASE}${path}`)
          await page.waitForLoadState('networkidle')
          if (CARD_PAGES.includes(path)) await page.waitForSelector('main ul[role="list"] > li', { timeout: 10_000 })
          // Open the cards' folded details: they must fit the card as well.
          await page.$$eval('main ul[role="list"] > li button[aria-expanded="false"]:not([aria-haspopup])', buttons =>
            buttons.forEach(b => b.click())
          )
          const m = await page.evaluate(() => {
            const main = document.querySelector('main')
            const cards = Array.from(main.querySelectorAll('ul[role="list"] > li'))
            // How far a card's content reaches past its edge. Truncated text does not count: its own box cuts it.
            const cutInside = (el, card) => {
              for (let p = el.parentElement; p !== card; p = p.parentElement) if (getComputedStyle(p).overflowX !== 'visible') return true
              return false
            }
            const past = card => {
              const box = card.getBoundingClientRect()
              const reach = el => {
                const r = el.getBoundingClientRect()
                const by = r.width ? Math.max(r.right - box.right, box.left - r.left) : 0
                return by > 1 && !cutInside(el, card) ? by : 0
              }
              return Math.max(0, ...Array.from(card.querySelectorAll('*'), reach))
            }
            return {
              scrollWidth: document.documentElement.scrollWidth,
              tables: Array.from(main.querySelectorAll('table')).filter(table => table.checkVisibility()).length,
              cardTop: cards.length ? cards[0].getBoundingClientRect().top : null,
              pastCard: Math.max(0, ...cards.map(past))
            }
          })
          assert.ok(m.scrollWidth <= device.viewport.width, `${path} is ${m.scrollWidth}px wide on a ${device.viewport.width}px screen`)
          assert.ok(m.pastCard <= 1, `${path}: a card's content reaches ${m.pastCard}px past the card`)
          if (!CARD_PAGES.includes(path)) return
          assert.equal(m.tables, 0, `${path} shows a table`)
          if (FIRST_SCREEN_PAGES.includes(path))
            assert.ok(m.cardTop < device.viewport.height, `${path}: the first card starts at ${m.cardTop}px`)
        })
      }
    })

    test('a tab bar with more tabs than fit scrolls inside itself, the selected tab in view', async () => {
      await page.goto(`${BASE}${TABS_PAGE}`)
      const measure = () => {
        const scroller = document.querySelector('main [role="tablist"]')?.parentElement
        const tab = scroller?.querySelector('[role="tab"][aria-selected="true"]')?.getBoundingClientRect()
        if (!tab) return null
        const box = scroller.getBoundingClientRect()
        return {
          hidden: scroller.scrollWidth - scroller.clientWidth,
          inView: tab.left >= box.left - 1 && tab.right <= box.right + 1,
          scrollWidth: document.documentElement.scrollWidth
        }
      }
      // The settings tab is added once the plugin's settings load; the bar then scrolls to it.
      await page.waitForFunction(
        `(${measure})()?.inView && document.querySelector('main [role="tab"][aria-selected="true"]').dataset.key === 'settings'`
      )
      const m = await page.evaluate(measure)
      assert.ok(m.hidden > 0, `${TABS_PAGE}: the tabs fit the screen, the check needs a wider tab bar`)
      assert.ok(m.scrollWidth <= device.viewport.width, `${TABS_PAGE} is ${m.scrollWidth}px wide on a ${device.viewport.width}px screen`)
    })

    test('ticking a card docks the bulk bar without moving the list; the page end scrolls clear of it', async t => {
      for (const path of BULK_PAGES) {
        await t.test(path, async () => {
          await page.goto(`${BASE}${path}`)
          const first = page.locator('main ul[role="list"] > li').first()
          await first.waitFor()
          const fab = page.locator('[data-fab]')
          await fab.waitFor()
          const topBefore = (await first.boundingBox()).y
          await first.locator('input[type="checkbox"]').first().check({ force: true })
          await page.locator('[data-bulk-dock] [role="region"]').waitFor()
          assert.equal((await first.boundingBox()).y, topBefore, `${path}: the first card moved`)
          assert.equal(await fab.isVisible(), false, `${path}: the fab shows over the dock`)
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
          const m = await page.evaluate(() => {
            const main = document.querySelector('main')
            const dock = document.querySelector('[data-bulk-dock] [role="region"]')
            const content = Array.from(main.querySelectorAll('ul[role="list"] > li, nav')).filter(el => el.checkVisibility())
            return {
              dockTop: dock.getBoundingClientRect().top,
              contentBottom: Math.max(...content.map(el => el.getBoundingClientRect().bottom))
            }
          })
          assert.ok(m.contentBottom <= m.dockTop, `${path}: the page ends at ${m.contentBottom}px under the dock at ${m.dockTop}px`)
        })
      }
    })

    test('docked actions that do not fit fade at the hidden edge; a tap on a cut button only brings it into view', async t => {
      let overflowing = 0
      for (const path of BULK_PAGES) {
        await t.test(path, async () => {
          await page.goto(`${BASE}${path}`)
          const first = page.locator('main ul[role="list"] > li').first()
          await first.waitFor()
          await first.locator('input[type="checkbox"]').first().check({ force: true })
          const scroller = page.locator('[data-bulk-dock] [role="region"] > :last-child')
          const last = scroller.locator(':scope > * > :last-child')
          await last.waitFor()
          const hidden = await scroller.evaluate(el => el.scrollWidth - el.clientWidth)
          const mask = () => scroller.evaluate(el => getComputedStyle(el).maskImage)
          if (!hidden) return assert.equal(await mask(), 'none', `${path}: the actions fit but fade`)
          overflowing++
          assert.notEqual(await mask(), 'none', `${path}: ${hidden}px of actions are hidden without a fade`)

          // Leave about half of the last (destructive) button showing at the end edge.
          await scroller.evaluate(el =>
            el.scrollTo({ left: el.scrollWidth - el.clientWidth - el.firstElementChild.lastElementChild.offsetWidth / 2 })
          )
          const atEnd = () => scroller.evaluate(el => el.scrollWidth - el.clientWidth - el.scrollLeft < 1)
          assert.equal(await atEnd(), false)
          const box = await scroller.boundingBox()
          const cut = await last.boundingBox()
          const y = cut.y + cut.height / 2
          await page.touchscreen.tap((cut.x + box.x + box.width) / 2, y)
          await page.waitForFunction(el => el.scrollWidth - el.clientWidth - el.scrollLeft < 1, await scroller.elementHandle())
          assert.equal(await page.locator('[role="dialog"]').count(), 0, `${path}: the tap pressed the cut button`)

          const shown = await last.boundingBox()
          await page.touchscreen.tap(shown.x + shown.width / 2, y)
          await page.locator('[role="dialog"]').waitFor()
        })
      }
      assert.ok(overflowing, 'the actions fit the screen on every page: the check needs a wider row')
    })
  })
}
