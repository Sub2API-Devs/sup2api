// Mock handlers: prices, price sync sources, usage, ledger, billing/sticky settings, sticky rules.
// (POST /users/:id/balance/adjust and GET /me/balance live in resources.ts / core.ts.)
import { createHash } from 'node:crypto'
import { fail, nextId, noContent, now, on, paginate, type MockRequest } from './router'

type PriceMode = 'per_request' | 'per_token' | 'expression'
type LText = { en: string; zh: string }
const msg = (en: string, zh: string): LText => ({ en, zh })
const money = (n: number) => n.toFixed(8)
const hashOf = (s: string) => createHash('sha256').update(s).digest('hex')

// ------------------------------------------------------------------ tiny expression engine (mock only)

const TOKEN_VARS = ['p', 'c', 'cr', 'cc', 'cc1h'] as const
type TokenVar = (typeof TOKEN_VARS)[number]
type Usage = Record<TokenVar | 'len', number>

const fmtN = (n: number) => String(Number(n.toPrecision(12)))
const isSet = (v: unknown) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))

function tokenTerms(src: any): string[] {
  const out: string[] = []
  for (const k of TOKEN_VARS) {
    if (!isSet(src?.[k])) continue
    const v = Number(src[k])
    if (v === 0 && (k === 'p' || k === 'c')) continue
    out.push(`${k}*${fmtN(v)}`)
  }
  return out
}

function genExpr(mode: PriceMode, config: any): string {
  if (mode === 'per_request') return `tier("base", flat(${fmtN(Number(config?.price) || 0)}))`
  if (mode === 'per_token') {
    const t = tokenTerms(config)
    return `tier("base", ${t.length ? t.join(' + ') : '0'})`
  }
  const tiers: any[] = Array.isArray(config?.tiers) ? config.tiers : []
  if (!tiers.length) return 'tier("base", 0)'
  const body = (t: any) => {
    const parts: string[] = []
    if (Number(t.flat)) parts.push(`flat(${fmtN(Number(t.flat))})`)
    parts.push(...tokenTerms(t.prices || t))
    return parts.length ? parts.join(' + ') : '0'
  }
  const call = (t: any) => `tier(${JSON.stringify(String(t.name))}, ${body(t)})`
  let expr = call(tiers[tiers.length - 1])
  for (let i = tiers.length - 2; i >= 0; i--) expr = `len <= ${Number(tiers[i].max_len) || 0} ? ${call(tiers[i])} : ${expr}`
  return expr
}

const ALLOWED_IDENTS = new Set(
  'p c cr cc cc1h len img img_o ai ao tier flat param header has hour weekday day month max min abs ceil floor u true false v1'.split(' ')
)

function splitRules(src: string): string[] {
  const out: string[] = []
  let cur = ''
  let inStr = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inStr) {
      cur += ch
      if (ch === '\\') cur += src[++i] ?? ''
      else if (ch === '"') inStr = false
    } else if (ch === '"') {
      inStr = true
      cur += ch
    } else if (src.startsWith('|||', i)) {
      out.push(cur)
      cur = ''
      i += 2
    } else cur += ch
  }
  out.push(cur)
  return out
}

interface EvalInput {
  usage: Partial<Usage>
  headers?: Record<string, string>
  params?: Record<string, unknown>
  metrics?: Record<string, number>
  at?: Date
}

function run(part: string, input: EvalInput, tokens: Usage): { value: number; tier: string } {
  let tier = ''
  const headers = Object.fromEntries(Object.entries(input.headers || {}).map(([k, v]) => [k.toLowerCase(), String(v)]))
  const at = input.at || new Date()
  const inTz = (tz: string, opt: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat('en-US', { ...opt, timeZone: tz }).format(at)
    } catch {
      return new Intl.DateTimeFormat('en-US', { ...opt, timeZone: 'UTC' }).format(at)
    }
  }
  const lib: Record<string, unknown> = {
    tier: (name: string, v: number) => ((tier = name), v),
    flat: (x: number) => x * 1e6, // everything is scaled back by 1e-6 below
    param: (path: string) => String(path).split('.').reduce<any>((o, k) => (o == null ? o : o[k]), input.params || {}) ?? '',
    header: (name: string) => headers[String(name).toLowerCase()] ?? '',
    has: (s: unknown, sub: unknown) => String(s ?? '').includes(String(sub)),
    hour: (tz: string) => Number(inTz(tz, { hour: 'numeric', hourCycle: 'h23' })),
    weekday: (tz: string) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(inTz(tz, { weekday: 'short' })),
    day: (tz: string) => Number(inTz(tz, { day: 'numeric' })),
    month: (tz: string) => Number(inTz(tz, { month: 'numeric' })),
    max: Math.max,
    min: Math.min,
    abs: Math.abs,
    ceil: Math.ceil,
    floor: Math.floor,
    u: (k: string) => (input.metrics || {})[k] || 0
  }
  const names = [...TOKEN_VARS, 'len', ...Object.keys(lib)]
  const values = [...TOKEN_VARS.map((k) => tokens[k]), tokens.len, ...Object.values(lib)]
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function(...names, `"use strict"; return (${part});`)
  const v = fn(...values)
  return { value: typeof v === 'number' ? v : Number(v), tier }
}

/**
 * Evaluates an expression: token variables are raw token counts and
 * coefficients are USD per 1M, so the base part is divided by 1e6 (flat()
 * pre-multiplies to compensate). Rules multiply the base.
 */
function evaluate(expression: string, input: EvalInput) {
  const src = expression.trim().replace(/^v1\s*:/, '')
  const bare = src.replace(/"(?:[^"\\]|\\.)*"/g, '""')
  for (const m of bare.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) if (!ALLOWED_IDENTS.has(m[0])) throw new Error(`unknown identifier ${m[0]}`)
  const [base, ...rules] = splitRules(src)
  const u = input.usage
  const tokens: Usage = { p: +u.p! || 0, c: +u.c! || 0, cr: +u.cr! || 0, cc: +u.cc! || 0, cc1h: +u.cc1h! || 0, len: 0 }
  tokens.len = u.len !== undefined ? +u.len || 0 : tokens.p + tokens.cr + tokens.cc + tokens.cc1h
  const b = run(base, input, tokens)
  const subtotal = b.value / 1e6
  // Per-variable items: evaluate with only that variable set (same len, same tier).
  const zero: Usage = { p: 0, c: 0, cr: 0, cc: 0, cc1h: 0, len: tokens.len }
  const flat = run(base, input, zero).value / 1e6
  const items: Array<{ tier: string; label: string; quantity?: number; rate?: number; expr: string; cost: string }> = []
  if (flat) items.push({ tier: b.tier, label: 'flat', expr: `flat(${fmtN(flat)})`, cost: money(flat) })
  for (const k of TOKEN_VARS) {
    if (!tokens[k]) continue
    const cost = run(base, input, { ...zero, [k]: tokens[k] }).value / 1e6 - flat
    if (!cost) continue
    const rate = Number(((cost / tokens[k]) * 1e6).toPrecision(10))
    items.push({ tier: b.tier, label: k, quantity: tokens[k], rate, expr: `${k}*${fmtN(rate)}`, cost: money(cost) })
  }
  let mult = 1
  const ruleResults = rules.map((r) => {
    const m = /^([\s\S]*)\?\s*([\d.]+)\s*:\s*1\s*$/.exec(r.trim())
    const v = run(r, input, tokens).value
    if (v !== 1) mult *= v
    return { cond: (m ? m[1] : r).trim(), multiplier: m ? Number(m[2]) : v, matched: v !== 1 }
  })
  return { tier: b.tier, tokens, subtotal, flat, items, rules: ruleResults, multiplier: mult, cost: subtotal * mult }
}

function tryEvaluate(expression: string, input: EvalInput) {
  try {
    return evaluate(expression, input)
  } catch {
    return null
  }
}

// ------------------------------------------------------------------ prices

// Prices are keyed by complete model ids; wildcards are rejected (same rule as the server).
const MODEL_ID = /^[A-Za-z0-9._:/@+-]{1,200}$/

interface MockPrice {
  id: number
  model: string
  mode: PriceMode
  config: Record<string, any>
  expression: string
  expr_version: number
  expr_hash: string
  /** manual: entered by an admin; sync: imported from a price source. */
  source: 'manual' | 'sync'
  sync_source_id: number | null
  synced_at: string | null
  enabled: boolean
  note: string
  updated_by: number | null
  updated_at: string
}

const history = new Map<string, { expr_hash: string; expression: string; expr_version: number; created_at: string }>()

function remember(expression: string) {
  const h = hashOf(expression)
  if (!history.has(h)) history.set(h, { expr_hash: h, expression, expr_version: 1, created_at: now() })
  return h
}

type PriceSeed = Omit<MockPrice, 'expr_hash' | 'expr_version' | 'updated_at' | 'expression' | 'sync_source_id' | 'synced_at' | 'updated_by'> & {
  expression?: string
  sync_source_id?: number | null
}

function mkPrice(p: PriceSeed): MockPrice {
  const expression = p.mode === 'expression' && p.expression ? p.expression : genExpr(p.mode, p.config)
  const synced = p.source === 'sync'
  return {
    ...p,
    expression,
    expr_version: 1,
    expr_hash: remember(expression),
    sync_source_id: synced ? p.sync_source_id ?? null : null,
    synced_at: synced ? now(-2 * 86400) : null,
    updated_by: 1,
    updated_at: now(-86400)
  }
}

// ------------------------------------------------------------------ price sync catalogs (mock upstream data)

type Family = 'anthropic' | 'openai' | 'google' | 'mistral' | 'deepseek' | 'xai'
interface CatalogEntry {
  model: string
  family: Family
  mode: PriceMode
  config: Record<string, any>
}

const round = (n: number) => Number(n.toPrecision(4))

const KNOWN: CatalogEntry[] = [
  {
    model: 'claude-sonnet-4-5',
    family: 'anthropic',
    mode: 'expression',
    config: {
      tiers: [
        { name: 'standard', max_len: 200000, p: 3, c: 15, cr: 0.3, cc: 3.75, cc1h: 6 },
        { name: 'long_context', max_len: null, p: 6, c: 22.5, cr: 0.6, cc: 7.5, cc1h: 12 }
      ]
    }
  },
  { model: 'claude-haiku-4-5', family: 'anthropic', mode: 'per_token', config: { p: 1, c: 5, cr: 0.1, cc: 1.25, cc1h: 2 } },
  { model: 'claude-opus-4-1', family: 'anthropic', mode: 'per_token', config: { p: 15, c: 75, cr: 1.5, cc: 18.75, cc1h: 30 } },
  { model: 'gpt-4o', family: 'openai', mode: 'per_token', config: { p: 2.5, c: 10, cr: 1.25 } },
  { model: 'gpt-4o-mini', family: 'openai', mode: 'per_token', config: { p: 0.15, c: 0.6, cr: 0.075 } },
  { model: 'gpt-5', family: 'openai', mode: 'per_token', config: { p: 1.25, c: 10, cr: 0.125 } },
  { model: 'gemini-2.5-flash', family: 'google', mode: 'per_token', config: { p: 0.3, c: 2.5, cr: 0.075 } },
  {
    model: 'gemini-2.5-pro',
    family: 'google',
    mode: 'expression',
    config: {
      tiers: [
        { name: 'standard', max_len: 200000, p: 1.25, c: 10, cr: 0.31 },
        { name: 'long_context', max_len: null, p: 2.5, c: 15, cr: 0.625 }
      ]
    }
  },
  { model: 'mistral-large-latest', family: 'mistral', mode: 'per_token', config: { p: 2, c: 6 } },
  { model: 'deepseek-chat', family: 'deepseek', mode: 'per_token', config: { p: 0.27, c: 1.1, cr: 0.07 } },
  { model: 'grok-4', family: 'xai', mode: 'per_token', config: { p: 3, c: 15, cr: 0.75 } }
]

const PREFIX: Record<Family, string> = { anthropic: 'claude-legacy', openai: 'gpt-variant', google: 'gemini-exp', mistral: 'mistral', deepseek: 'deepseek', xai: 'grok' }
const SUFFIX = ['preview', 'latest', '2024-08-06', 'mini', 'turbo', 'instruct']
const FAMILIES = Object.keys(PREFIX) as Family[]

/** Deterministic synthetic models of a family (to exercise large previews). */
function synthetic(family: Family, count: number): CatalogEntry[] {
  const out: CatalogEntry[] = []
  for (let i = 1; i <= count; i++) {
    const r = (k: number) => rnd(FAMILIES.indexOf(family) * 10007 + i * 31 + k)
    const p = round(0.05 + r(1) * 10)
    const cfg: Record<string, number> = { p, c: round(p * (3 + Math.floor(r(2) * 3))) }
    if (r(3) > 0.4) cfg.cr = round(p / 10)
    out.push({ model: `${PREFIX[family]}-${String(i).padStart(4, '0')}-${SUFFIX[i % SUFFIX.length]}`, family, mode: 'per_token', config: cfg })
  }
  return out
}

/** Vendor id of a family in each catalog (LiteLLM calls Google "gemini"). */
const vendorOf = (kind: 'litellm' | 'models_dev', f: Family) => (kind === 'litellm' && f === 'google' ? 'gemini' : f)

const CATALOG = {
  litellm: [...KNOWN, ...FAMILIES.flatMap((f) => synthetic(f, 800))],
  models_dev: [
    // models.dev lists the newer GPT-4o price than the one we synced from LiteLLM.
    ...KNOWN.map((e) => (e.model === 'gpt-4o' ? { ...e, config: { p: 2.5, c: 10, cr: 1.25, cc: 0 } } : e)),
    ...FAMILIES.flatMap((f) => synthetic(f, 12))
  ],
  // What the upstream sup2api instance exposes to our key (base prices; its group rate is 1.5).
  sup2api: KNOWN.filter((e) => e.family === 'anthropic' || e.family === 'openai')
}
const UPSTREAM_GROUP_RATE = 1.5
const SKIPPED = { litellm: 37, models_dev: 4, sup2api: 0 }

function scaleConfig(cfg: Record<string, any>, m: number): Record<string, any> {
  const scale = (o: Record<string, any>) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, (TOKEN_VARS as readonly string[]).includes(k) || k === 'flat' ? round(Number(v) * m) : v]))
  if (Array.isArray(cfg.tiers)) return { ...cfg, tiers: cfg.tiers.map(scale) }
  return scale(cfg)
}

const SONNET_DEFAULT =
  'len <= 200000 ? tier("standard", p*3 + c*15 + cr*0.3 + cc*3.75 + cc1h*6) : tier("long_context", p*6 + c*22.5 + cr*0.6 + cc*7.5 + cc1h*12)'

const litellmSynth = CATALOG.litellm.filter((e) => e.model.startsWith('claude-legacy-'))

const prices: MockPrice[] = [
  // Manual, identical to the synced definition -> "unchanged" in previews.
  mkPrice({ id: 1, model: 'claude-sonnet-4-5', mode: 'expression', config: {}, expression: SONNET_DEFAULT, source: 'manual', enabled: true, note: '' }),
  // Synced from LiteLLM and still current -> "unchanged".
  mkPrice({ id: 2, model: 'claude-haiku-4-5', mode: 'per_token', config: { p: 1, c: 5, cr: 0.1, cc: 1.25, cc1h: 2 }, source: 'sync', sync_source_id: 1, enabled: true, note: '' }),
  mkPrice({
    id: 3,
    model: 'claude-sonnet-x',
    mode: 'expression',
    config: {
      tiers: [
        { name: 'standard', max_len: 200000, p: 3, c: 15, cr: 0.3, cc: 3.75, cc1h: 6 },
        { name: 'long_context', max_len: null, p: 6, c: 22.5, cr: 0.6, cc: 7.5, cc1h: 12 }
      ],
      rules: [{ kind: 'header', name: 'anthropic-beta', op: 'contains', value: 'fast-mode', multiplier: 2 }]
    },
    source: 'manual',
    enabled: true,
    note: 'fast mode costs double'
  }),
  mkPrice({ id: 4, model: 'web-search', mode: 'per_request', config: { price: 0.01 }, source: 'manual', enabled: true, note: '' }),
  // Manual and different from every source -> "manual" (unticked by default).
  mkPrice({
    id: 5,
    model: 'claude-opus-4-1',
    mode: 'expression',
    config: {},
    expression: 'tier("base", flat(0.01) + p*15 + c*75) * (hour("Asia/Shanghai") < 8 ? 0.8 : 1)',
    source: 'manual',
    enabled: false,
    note: 'night discount'
  }),
  // Synced from LiteLLM, source price changed since -> "update".
  mkPrice({ id: 6, model: 'gpt-4o', mode: 'per_token', config: { p: 5, c: 15, cr: 2.5 }, source: 'sync', sync_source_id: 1, enabled: true, note: '' }),
  // Synced from models.dev and current.
  mkPrice({ id: 7, model: 'gemini-2.5-flash', mode: 'per_token', config: { p: 0.3, c: 2.5, cr: 0.075 }, source: 'sync', sync_source_id: 2, enabled: true, note: '' }),
  mkPrice({ id: 8, model: 'gpt-4o-mini', mode: 'per_token', config: { p: 0.3, c: 1.2 }, source: 'sync', sync_source_id: 1, enabled: true, note: '' }),
  // A few synthetic LiteLLM models: current, outdated, and manually edited.
  ...litellmSynth.slice(0, 6).map((e, i) => mkPrice({ id: 20 + i, model: e.model, mode: e.mode, config: e.config, source: 'sync', sync_source_id: 1, enabled: true, note: '' })),
  ...litellmSynth
    .slice(6, 10)
    .map((e, i) => mkPrice({ id: 30 + i, model: e.model, mode: e.mode, config: scaleConfig(e.config, 0.8), source: 'sync', sync_source_id: 1, enabled: true, note: '' })),
  ...litellmSynth
    .slice(10, 13)
    .map((e, i) => mkPrice({ id: 40 + i, model: e.model, mode: e.mode, config: scaleConfig(e.config, 1.2), source: 'manual', enabled: true, note: 'negotiated' }))
]

function exprOf(body: any): { mode: PriceMode; config: Record<string, any>; expression: string } {
  const mode: PriceMode = ['per_request', 'per_token', 'expression'].includes(body?.mode) ? body.mode : 'expression'
  const config = body?.config && typeof body.config === 'object' ? body.config : {}
  let expression = String(body?.expression || '')
  if (mode !== 'expression' || !expression.trim()) expression = genExpr(mode, config)
  return { mode, config, expression }
}

function validate(body: any) {
  const { mode, config, expression } = exprOf(body)
  const errors: Array<{ code: string; message: LText; detail?: unknown }> = []
  const warnings: Array<{ code: string; message: LText; detail?: unknown }> = []
  let perMillion = 0
  if (!expression.trim()) errors.push({ code: 'empty', message: msg('expression is empty', '表达式为空') })
  else {
    try {
      // Smoke test: 1M input tokens, below and above every plausible tier boundary.
      for (const len of [0, 1e6, 1e9]) {
        const r = evaluate(expression, { usage: { p: 1e6, len } })
        if (!Number.isFinite(r.cost) || r.cost < 0) throw new Error('result is not a finite non-negative number')
        perMillion = Math.max(perMillion, r.cost)
      }
      evaluate(expression, { usage: { p: 1000, c: 1000, cr: 1000, cc: 1000, cc1h: 1000 } })
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e)
      errors.push({ code: 'compile', message: msg(text, `表达式错误：${text}`) })
    }
  }
  const threshold = Number(billingSettings.big_cost_warning_usd) || 10
  if (!errors.length && perMillion > threshold) {
    warnings.push({
      code: 'big_cost',
      message: msg(`1M input tokens cost $${fmtN(perMillion)} (threshold $${threshold})`, `100 万输入 token 费用 $${fmtN(perMillion)}，超过阈值 $${threshold}`),
      detail: { cost: perMillion }
    })
  }
  return {
    ok: errors.length === 0,
    expression,
    expr_hash: hashOf(expression),
    errors,
    warnings,
    samples: 24,
    cost_per_million_input: money(perMillion),
    mode,
    config
  }
}

function priceFilter(q: Record<string, string>) {
  return prices
    .filter((p) => {
      if (q.mode && p.mode !== q.mode) return false
      if (q.source && p.source !== q.source) return false
      if (q.sync_source_id && String(p.sync_source_id ?? '') !== q.sync_source_id) return false
      if (q.enabled && (q.enabled === 'true' || q.enabled === '1') !== p.enabled) return false
      if (q.q && !`${p.model} ${p.note}`.toLowerCase().includes(q.q.toLowerCase())) return false
      return true
    })
    .sort((a, b) => a.model.localeCompare(b.model) || a.id - b.id)
}

/** API shape of a price: adds the name of its sync source. */
function priceView(p: MockPrice) {
  const src = p.sync_source_id ? sources.find((s) => s.id === p.sync_source_id) : undefined
  return { ...p, sync_source_name: src ? src.name : null }
}

const findPrice = (req: MockRequest) => prices.find((p) => p.id === Number(req.params.id))

on('GET', '/prices', (req) => {
  const r = paginate(priceFilter(req.query), req.query)
  return { ...r, data: r.data.map(priceView) }
})
on('POST', '/prices/validate', (req) => {
  const v = validate(req.body)
  return { ok: v.ok, expression: v.expression, expr_hash: v.expr_hash, errors: v.errors, warnings: v.warnings, samples: v.samples, cost_per_million_input: v.cost_per_million_input }
})

function tierBounds(expression: string) {
  return [...expression.matchAll(/len\s*<=\s*(\d+)\s*\?\s*tier\("((?:[^"\\]|\\.)*)"/g)].map((m) => ({ name: m[2], max_len: Number(m[1]) }))
}

on('POST', '/prices/preview', (req) => {
  const b = req.body || {}
  let src: { mode: PriceMode; config: Record<string, any>; expression: string }
  if (b.price_id) {
    const p = prices.find((x) => x.id === Number(b.price_id))
    if (!p) return fail(404, 'not_found', 'price not found')
    src = { mode: p.mode, config: p.config, expression: p.expression }
  } else src = exprOf(b)
  const params = Object.fromEntries(Object.entries(b.params || {}).map(([k, v]) => [k, v]))
  const r = tryEvaluate(src.expression, { usage: b.usage || {}, headers: b.headers, params, metrics: b.metrics, at: b.at ? new Date(b.at) : undefined })
  if (!r) return fail(400, 'invalid_argument', 'expression cannot be evaluated')
  const rate = b.group_id ? (Number(b.group_id) === 2 ? 1.5 : 1) : 1
  return {
    cost: money(r.cost * rate),
    base_cost: money(r.cost),
    rate_multiplier: rate.toFixed(2),
    tier: r.tier,
    rules: r.rules,
    expression: src.expression,
    expr_hash: hashOf(src.expression),
    breakdown: {
      vars: r.tokens,
      tiers: tierBounds(src.expression),
      items: r.items,
      subtotal: money(r.subtotal),
      base: money(r.cost),
      rules_multiplier: r.multiplier
    }
  }
})

on('GET', '/prices/history/:hash', (req) => history.get(req.params.hash) || fail(404, 'not_found', 'no such expression'))

on('GET', '/prices/:id', (req) => {
  const p = findPrice(req)
  return p ? { ...priceView(p), analysis: { params: [], headers: [], metrics: [] } } : fail(404, 'not_found', 'price not found')
})

function checkSave(body: any) {
  const v = validate(body)
  if (v.errors.length) return fail(400, 'invalid_argument', 'expression is invalid', { expression: v.expression, errors: v.errors, warnings: v.warnings })
  if (v.warnings.some((w) => w.code === 'big_cost') && !body?.confirm) {
    return fail(400, 'invalid_argument', 'high cost requires confirmation', { expression: v.expression, errors: [], warnings: v.warnings, confirmation_required: true })
  }
  return v
}

const modelInvalid = () => fail(400, 'invalid_argument', 'invalid', { fields: [{ field: 'model', code: 'invalid', message: 'a complete model id (no wildcards)' }] })
const modelTaken = () => fail(409, 'conflict', 'a price for this model already exists')

on('POST', '/prices', (req) => {
  const b = req.body || {}
  if (!b.model) return fail(400, 'invalid_argument', 'invalid', { fields: [{ field: 'model', code: 'required', message: 'Model is required' }] })
  if (!MODEL_ID.test(b.model)) return modelInvalid()
  if ('platform' in b) return fail(400, 'invalid_argument', 'unknown field "platform"')
  const v = checkSave(b)
  if ('__status' in v) return v
  // One price per model (prices are global and keyed by complete model ids).
  if (prices.some((p) => p.model === b.model)) return modelTaken()
  const p: MockPrice = {
    id: nextId(),
    model: b.model,
    mode: v.mode,
    config: v.config,
    expression: v.expression,
    expr_version: 1,
    expr_hash: remember(v.expression),
    source: 'manual',
    sync_source_id: null,
    synced_at: null,
    enabled: b.enabled !== false,
    note: b.note || '',
    updated_by: 1,
    updated_at: now()
  }
  prices.push(p)
  return { __status: 201, body: { data: priceView(p) } }
})

on('PATCH', '/prices/:id', (req) => {
  const p = findPrice(req)
  if (!p) return fail(404, 'not_found', 'price not found')
  const b = req.body || {}
  const keys = Object.keys(b).filter((k) => k !== 'confirm')
  if (b.model !== undefined && !MODEL_ID.test(b.model)) return modelInvalid()
  if (b.model !== undefined && b.model !== p.model && prices.some((x) => x.model === b.model)) return modelTaken()
  if (keys.every((k) => k === 'enabled' || k === 'note')) {
    if (b.enabled !== undefined) p.enabled = !!b.enabled
    if (b.note !== undefined) p.note = String(b.note)
    p.updated_at = now()
    return priceView(p)
  }
  const v = checkSave({ ...p, ...b })
  if ('__status' in v) return v
  // Editing the definition of a synced price turns it into a manual price.
  const defChanged =
    (b.model !== undefined && b.model !== p.model) ||
    v.mode !== p.mode ||
    v.expression !== p.expression ||
    (b.config !== undefined && JSON.stringify(b.config) !== JSON.stringify(p.config))
  Object.assign(p, {
    model: b.model ?? p.model,
    mode: v.mode,
    config: v.config,
    expression: v.expression,
    expr_hash: remember(v.expression),
    enabled: b.enabled ?? p.enabled,
    note: b.note ?? p.note,
    updated_by: 1,
    updated_at: now()
  })
  if (defChanged && p.source === 'sync') Object.assign(p, { source: 'manual', sync_source_id: null })
  return priceView(p)
})

on('DELETE', '/prices/:id', (req) => {
  const i = prices.findIndex((p) => p.id === Number(req.params.id))
  if (i < 0) return fail(404, 'not_found', 'price not found')
  prices.splice(i, 1)
  return noContent()
})

// ------------------------------------------------------------------ price sync sources

type SourceKind = 'litellm' | 'models_dev' | 'sup2api'
const SOURCE_KINDS: SourceKind[] = ['litellm', 'models_dev', 'sup2api']
const DEFAULT_URL: Record<SourceKind, string> = {
  litellm: 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
  models_dev: 'https://models.dev/api.json',
  sup2api: ''
}
const DEFAULT_PROVIDERS: Record<'litellm' | 'models_dev', string[]> = {
  litellm: ['anthropic', 'openai', 'gemini'],
  models_dev: ['anthropic', 'openai', 'google']
}

interface MockSource {
  id: number
  name: string
  kind: SourceKind
  url: string
  api_key: string
  options: Record<string, any>
  enabled: boolean
  last_synced_at: string | null
  last_error: string
  created_at: string
  updated_at: string
}

const sources: MockSource[] = [
  {
    id: 1,
    name: 'LiteLLM',
    kind: 'litellm',
    url: DEFAULT_URL.litellm,
    api_key: '',
    options: { providers: [...DEFAULT_PROVIDERS.litellm] },
    enabled: true,
    last_synced_at: now(-2 * 86400),
    last_error: '',
    created_at: now(-30 * 86400),
    updated_at: now(-2 * 86400)
  },
  {
    id: 2,
    name: 'models.dev',
    kind: 'models_dev',
    url: DEFAULT_URL.models_dev,
    api_key: '',
    options: { providers: [...DEFAULT_PROVIDERS.models_dev] },
    enabled: true,
    last_synced_at: now(-5 * 86400),
    last_error: '',
    created_at: now(-30 * 86400),
    updated_at: now(-5 * 86400)
  },
  {
    id: 3,
    name: '上游 A',
    kind: 'sup2api',
    url: 'https://up.example.com',
    api_key: 'sk-s2a-mock-upstream',
    options: { apply_multiplier: true },
    enabled: true,
    last_synced_at: null,
    last_error: '',
    created_at: now(-3 * 86400),
    updated_at: now(-3 * 86400)
  },
  {
    id: 4,
    name: '上游 B（离线）',
    kind: 'sup2api',
    url: 'https://down.example.com',
    api_key: 'sk-s2a-mock-down',
    options: { apply_multiplier: false },
    enabled: false,
    last_synced_at: null,
    last_error: 'GET https://down.example.com/api/v1/me/prices: dial tcp: connection refused',
    created_at: now(-3 * 86400),
    updated_at: now(-3 * 86400)
  }
]

function sourceView(s: MockSource) {
  const { api_key, ...rest } = s
  return { ...rest, has_api_key: !!api_key, price_count: prices.filter((p) => p.sync_source_id === s.id).length }
}

const findSource = (req: MockRequest) => sources.find((s) => s.id === Number(req.params.id))

const fieldFail = (fields: Array<{ field: string; code: string; message: string }>) => fail(400, 'invalid_argument', 'invalid', { fields })

function isHttpUrl(v: unknown): boolean {
  try {
    const u = new URL(String(v))
    return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.host
  } catch {
    return false
  }
}

/** Validates and normalizes options for a kind; returns the options or a field error list. */
function sourceOptions(kind: SourceKind, raw: any): Record<string, any> | Array<{ field: string; code: string; message: string }> {
  if (kind === 'sup2api') {
    if (raw?.apply_multiplier !== undefined && typeof raw.apply_multiplier !== 'boolean') {
      return [{ field: 'options.apply_multiplier', code: 'invalid', message: 'must be a boolean' }]
    }
    return { apply_multiplier: raw?.apply_multiplier !== false }
  }
  if (raw?.providers === undefined) return { providers: [...DEFAULT_PROVIDERS[kind]] }
  if (!Array.isArray(raw.providers) || raw.providers.some((x: unknown) => typeof x !== 'string' || !/^[a-z0-9_.-]{1,64}$/i.test(x))) {
    return [{ field: 'options.providers', code: 'invalid', message: 'providers must be a list of vendor ids' }]
  }
  return { providers: [...new Set(raw.providers as string[])] }
}

on('GET', '/price-sources', () => sources.map(sourceView))

on('POST', '/price-sources', (req) => {
  const b = req.body || {}
  const errs: Array<{ field: string; code: string; message: string }> = []
  const name = String(b.name ?? '').trim()
  if (!name) errs.push({ field: 'name', code: 'required', message: 'Name is required' })
  if (!SOURCE_KINDS.includes(b.kind)) errs.push({ field: 'kind', code: 'enum', message: 'kind must be litellm, models_dev or sup2api' })
  const kind = b.kind as SourceKind
  const url = String(b.url ?? (SOURCE_KINDS.includes(kind) ? DEFAULT_URL[kind] : '')).trim()
  if (!url) errs.push({ field: 'url', code: 'required', message: 'URL is required' })
  else if (!isHttpUrl(url)) errs.push({ field: 'url', code: 'invalid', message: 'must be an http(s) URL' })
  if (kind === 'sup2api' && !String(b.api_key ?? '').trim()) errs.push({ field: 'api_key', code: 'required', message: 'An upstream sup2api source needs an API key' })
  const opts = SOURCE_KINDS.includes(kind) ? sourceOptions(kind, b.options) : {}
  if (Array.isArray(opts)) errs.push(...opts)
  if (errs.length) return fieldFail(errs)
  if (sources.some((s) => s.name === name)) return fail(409, 'conflict', 'a price source with this name already exists')
  const s: MockSource = {
    id: nextId(),
    name,
    kind,
    url,
    api_key: String(b.api_key ?? '').trim(),
    options: opts as Record<string, any>,
    enabled: b.enabled !== false,
    last_synced_at: null,
    last_error: '',
    created_at: now(),
    updated_at: now()
  }
  sources.push(s)
  return { __status: 201, body: { data: sourceView(s) } }
})

on('PATCH', '/price-sources/:id', (req) => {
  const s = findSource(req)
  if (!s) return fail(404, 'not_found', 'price source not found')
  const b = req.body || {}
  const errs: Array<{ field: string; code: string; message: string }> = []
  const kind: SourceKind = b.kind !== undefined ? b.kind : s.kind
  if (!SOURCE_KINDS.includes(kind)) errs.push({ field: 'kind', code: 'enum', message: 'kind must be litellm, models_dev or sup2api' })
  const name = b.name !== undefined ? String(b.name).trim() : s.name
  if (!name) errs.push({ field: 'name', code: 'required', message: 'Name is required' })
  const url = b.url !== undefined ? String(b.url).trim() : s.url
  if (!url) errs.push({ field: 'url', code: 'required', message: 'URL is required' })
  else if (!isHttpUrl(url)) errs.push({ field: 'url', code: 'invalid', message: 'must be an http(s) URL' })
  // api_key: omitted / null = keep, "" = clear, other = replace.
  const apiKey = b.api_key === undefined || b.api_key === null ? s.api_key : String(b.api_key).trim()
  if (kind === 'sup2api' && !apiKey) errs.push({ field: 'api_key', code: 'required', message: 'An upstream sup2api source needs an API key' })
  const opts = SOURCE_KINDS.includes(kind) ? (b.options !== undefined || kind !== s.kind ? sourceOptions(kind, b.options) : s.options) : {}
  if (Array.isArray(opts)) errs.push(...opts)
  if (errs.length) return fieldFail(errs)
  if (sources.some((x) => x.id !== s.id && x.name === name)) return fail(409, 'conflict', 'a price source with this name already exists')
  Object.assign(s, { name, kind, url, api_key: apiKey, options: opts, enabled: b.enabled !== undefined ? !!b.enabled : s.enabled, updated_at: now() })
  return sourceView(s)
})

on('DELETE', '/price-sources/:id', (req) => {
  const i = sources.findIndex((s) => s.id === Number(req.params.id))
  if (i < 0) return fail(404, 'not_found', 'price source not found')
  const id = sources[i].id
  // Imported prices are kept; they just lose the link to the source.
  for (const p of prices) if (p.sync_source_id === id) p.sync_source_id = null
  sources.splice(i, 1)
  return noContent()
})

/** "Fetches" a source: the mock catalog filtered by vendors, or an error message. */
function fetchCatalog(s: MockSource): { entries: CatalogEntry[] } | { error: string } {
  if (/down|fail/i.test(s.url)) return { error: `GET ${s.url.replace(/\/$/, '')}${s.kind === 'sup2api' ? '/api/v1/me/prices' : ''}: dial tcp: connection refused` }
  if (s.kind === 'sup2api') {
    if (!s.api_key) return { error: 'upstream rejected the API key (401 unauthenticated)' }
    const m = s.options?.apply_multiplier === false ? 1 : UPSTREAM_GROUP_RATE
    return { entries: CATALOG.sup2api.map((e) => ({ ...e, config: m === 1 ? e.config : scaleConfig(e.config, m) })) }
  }
  const kind = s.kind
  const want = new Set<string>(Array.isArray(s.options?.providers) ? s.options.providers : DEFAULT_PROVIDERS[kind])
  return { entries: CATALOG[kind].filter((e) => want.has(vendorOf(kind, e.family))) }
}

function incomingOf(e: CatalogEntry) {
  return { mode: e.mode, config: e.config, expression: genExpr(e.mode, e.config) }
}

function syncAction(e: CatalogEntry): { action: 'create' | 'update' | 'manual' | 'unchanged'; current: MockPrice | undefined } {
  const current = prices.find((p) => p.model === e.model)
  if (!current) return { action: 'create', current }
  const inc = incomingOf(e)
  if (current.mode === inc.mode && current.expression.trim() === inc.expression.trim()) return { action: 'unchanged', current }
  return { action: current.source === 'sync' ? 'update' : 'manual', current }
}

on('POST', '/price-sources/:id/preview', (req) => {
  const s = findSource(req)
  if (!s) return fail(404, 'not_found', 'price source not found')
  const r = fetchCatalog(s)
  if ('error' in r) {
    s.last_error = r.error
    return fail(503, 'unavailable', `cannot fetch prices from ${s.name}: ${r.error}`)
  }
  s.last_error = ''
  const items = r.entries
    .map((e) => {
      const { action, current } = syncAction(e)
      return {
        model: e.model,
        action,
        incoming: incomingOf(e),
        current: current
          ? { id: current.id, mode: current.mode, config: current.config, expression: current.expression, source: current.source, sync_source_id: current.sync_source_id, enabled: current.enabled }
          : null
      }
    })
    .sort((a, b) => a.model.localeCompare(b.model))
  return { source_id: s.id, fetched_at: now(), total: items.length, skipped: SKIPPED[s.kind], items }
})

on('POST', '/price-sources/:id/apply', (req) => {
  const s = findSource(req)
  if (!s) return fail(404, 'not_found', 'price source not found')
  const models = req.body?.models
  if (!Array.isArray(models) || models.some((m: unknown) => typeof m !== 'string')) {
    return fieldFail([{ field: 'models', code: 'invalid', message: 'models must be a list of model ids' }])
  }
  const r = fetchCatalog(s)
  if ('error' in r) {
    s.last_error = r.error
    return fail(503, 'unavailable', `cannot fetch prices from ${s.name}: ${r.error}`)
  }
  const byModel = new Map(r.entries.map((e) => [e.model, e]))
  const out = { created: 0, updated: 0, unchanged: 0, skipped: [] as Array<{ model: string; reason: string }> }
  for (const model of new Set<string>(models)) {
    const e = byModel.get(model)
    if (!e) {
      out.skipped.push({ model, reason: 'not offered by the source' })
      continue
    }
    if (!MODEL_ID.test(model)) {
      out.skipped.push({ model, reason: 'not a complete model id' })
      continue
    }
    const inc = incomingOf(e)
    const { action, current } = syncAction(e)
    if (action === 'unchanged') {
      out.unchanged++
      continue
    }
    const fields = {
      mode: inc.mode,
      config: inc.config,
      expression: inc.expression,
      expr_hash: remember(inc.expression),
      source: 'sync' as const,
      sync_source_id: s.id,
      synced_at: now(),
      updated_by: 1,
      updated_at: now()
    }
    if (current) {
      Object.assign(current, fields, { expr_version: current.expr_version })
      out.updated++
    } else {
      prices.push({ id: nextId(), model, expr_version: 1, enabled: true, note: '', ...fields })
      out.created++
    }
  }
  s.last_synced_at = now()
  s.last_error = ''
  return out
})

// ------------------------------------------------------------------ usage

const USERS = [
  { id: 1, email: 'admin@example.com', name: 'Admin' },
  { id: 2, email: 'zhangsan@example.com', name: '张三' },
  { id: 3, email: 'lisi@example.com', name: '李四' }
]
const GROUPS = [
  { id: 1, name: 'default', rate: 1 },
  { id: 2, name: 'vip', rate: 1.5 }
]
// Same accounts as mock/accounts.ts. Anthropic-platform accounts sometimes
// serve the openai chat endpoint through conversion to anthropic.messages;
// the built-in openai / gemini accounts serve their own platforms.
const ACCOUNTS = [
  { id: 12, name: 'claude-main', plugin_key: 'anthropic', type: 'apikey', upstream: 'anthropic.messages' },
  { id: 13, name: 'claude-bak', plugin_key: 'anthropic', type: 'apikey', upstream: 'anthropic.messages' },
  { id: 16, name: 'relay-1', plugin_key: 'relay', type: 'relay_key', upstream: 'anthropic.messages' },
  { id: 19, name: 'openai-main', plugin_key: 'openai', type: 'apikey', upstream: 'openai.chat' },
  { id: 20, name: 'gemini-main', plugin_key: 'gemini', type: 'apikey', upstream: 'gemini.generate' }
]
const MODELS = ['claude-sonnet-x', 'claude-sonnet-4-5', 'claude-haiku-4-5']
const OWN_MODELS: Record<string, string[]> = { openai: ['gpt-4o', 'gpt-4o-mini'], gemini: ['gemini-2.5-flash'] }
/** Client endpoint per upstream protocol of the native accounts. */
const NATIVE_ENDPOINT: Record<string, { platform: string; protocol: string; endpoint: string }> = {
  'openai.chat': { platform: 'openai', protocol: 'openai.chat', endpoint: '/v1/chat/completions' },
  'gemini.generate': { platform: 'gemini', protocol: 'gemini.generate', endpoint: '/v1beta/models/gemini-2.5-flash:generateContent' }
}

function rnd(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function priceFor(model: string) {
  // One price per complete model id (no wildcards).
  return prices.find((p) => p.enabled && p.model === model) || null
}

const usageRows: any[] = []
const ledgerRows: any[] = []

for (let i = 0; i < 90; i++) {
  const r = (k: number) => rnd(i * 7 + k)
  const user = USERS[Math.floor(r(1) * USERS.length)]
  const group = GROUPS[Math.floor(r(2) * GROUPS.length)]
  const account = ACCOUNTS[Math.floor(r(3) * ACCOUNTS.length)]
  const own = OWN_MODELS[account.plugin_key]
  const model = own ? own[Math.floor(r(4) * own.length)] : MODELS[Math.floor(r(4) * MODELS.length)]
  const at = new Date(Date.now() - Math.floor(r(5) * 7 * 86400000))
  const blocked = r(6) < 0.06
  const failed = !blocked && r(7) < 0.08
  const success = !blocked && !failed
  const inTok = success ? Math.floor(r(8) * 4000) + 200 : 0
  const outTok = success ? Math.floor(r(9) * 1500) + 50 : 0
  const cr = success && r(10) < 0.6 ? Math.floor(r(11) * 60000) : 0
  const cc = success && r(12) < 0.3 ? Math.floor(r(13) * 5000) : 0
  const fast = r(14) < 0.2
  // Client used the openai chat endpoint; anthropic-platform accounts serve it via conversion.
  const viaOpenAI = account.plugin_key === 'anthropic' && rnd(i * 13 + 99) < 0.2
  const price = priceFor(model)
  const requestId = 'req_' + hashOf('u' + i).slice(0, 16)
  // Client X-Request-Id (CONTRACTS §14.4): most SDK calls send one.
  const clientRequestId = r(20) < 0.7 ? `cli-${hashOf('c' + i).slice(0, 8)}-${hashOf('d' + i).slice(0, 4)}` : ''
  const native = NATIVE_ENDPOINT[account.upstream]
  const hook_decisions = [
    { plugin_key: 'guard', hook_id: 'content-filter', decision: blocked ? 'deny' : 'allow', latency_ms: 3 + Math.floor(r(15) * 20), note: blocked ? 'matched rule "no-secrets"' : undefined }
  ]
  let billing: any = { status: 'free' }
  if (success && price) {
    const vars = { p: inTok, c: outTok, cr, cc, cc1h: 0 }
    const ev = tryEvaluate(price.expression, { usage: vars, headers: fast ? { 'anthropic-beta': 'fast-mode' } : {}, at })
    if (ev) {
      const total = ev.cost * group.rate
      billing = {
        status: 'billed',
        total,
        tier: ev.tier,
        detail: {
          tier: ev.tier,
          rules: ev.rules,
          breakdown: {
            vars: ev.tokens,
            tiers: tierBounds(price.expression),
            items: ev.items,
            subtotal: money(ev.subtotal),
            base: money(ev.cost),
            rules_multiplier: ev.multiplier
          },
          cost: money(ev.cost),
          rate_multiplier: group.rate.toFixed(2),
          total_cost: money(total),
          expr_version: 1
        }
      }
    }
  }
  const row: any = {
    id: 5000 + i,
    request_id: requestId,
    client_request_id: clientRequestId,
    user_id: user.id,
    user_email: user.email,
    api_key_id: user.id * 10,
    api_key_name: `${user.name}-key`,
    group_id: group.id,
    group_name: group.name,
    account_id: blocked ? null : account.id,
    account_name: blocked ? null : account.name,
    // plugin_key/account_type: the account type; platform/protocol: the client endpoint.
    plugin_key: blocked ? '' : account.plugin_key,
    account_type: blocked ? '' : account.type,
    platform: native?.platform ?? (viaOpenAI ? 'openai' : 'anthropic'),
    protocol: native?.protocol ?? (viaOpenAI ? 'openai.chat' : 'anthropic.messages'),
    upstream_protocol: blocked ? '' : account.upstream,
    endpoint: native?.endpoint ?? (viaOpenAI ? '/v1/chat/completions' : '/v1/messages'),
    model,
    upstream_model: model,
    stream: r(16) < 0.7,
    status_code: success ? 200 : blocked ? 403 : 529,
    success,
    error_type: blocked ? 'blocked_by_hook' : failed ? 'upstream_overloaded' : '',
    error_message: blocked ? 'request rejected by guard' : failed ? 'Overloaded' : '',
    input_tokens: inTok,
    output_tokens: outTok,
    cache_read_tokens: cr,
    cache_creation_tokens: cc,
    cache_creation_1h_tokens: 0,
    total_cost: money(billing.total || 0),
    rate_multiplier: group.rate.toFixed(2),
    billing_status: billing.status,
    billing_mode: price?.mode,
    matched_tier: billing.tier || '',
    price_id: billing.status === 'billed' ? price?.id : null,
    expr_hash: billing.status === 'billed' ? price?.expr_hash : '',
    latency_ms: success ? 800 + Math.floor(r(17) * 4000) : 120,
    first_token_ms: success ? 300 + Math.floor(r(18) * 900) : undefined,
    sticky_rule: 'claude-code-session',
    sticky_hit: r(19) < 0.7,
    hook_decisions,
    created_at: at.toISOString(),
    _detail: billing.detail,
    _price: billing.status === 'billed' && price ? { id: price.id, model: price.model, source: price.source } : null
  }
  usageRows.push(row)
}
usageRows.sort((a, b) => b.created_at.localeCompare(a.created_at))

// Ledger: usage debits + a few admin credits, oldest first to compute balance_after.
{
  const running = new Map<number, number>()
  const events: any[] = []
  for (const u of USERS) events.push({ user: u, delta: 20, kind: 'admin_adjust', at: new Date(Date.now() - 8 * 86400000).toISOString(), note: 'top-up', ref_type: '', ref_id: '', operator_id: 1 })
  for (const u of usageRows) {
    if (u.billing_status !== 'billed') continue
    const user = USERS.find((x) => x.id === u.user_id)!
    events.push({ user, delta: -Number(u.total_cost), kind: 'usage', at: u.created_at, note: '', ref_type: 'usage', ref_id: u.request_id, usage: u })
  }
  events.push({ user: USERS[1], delta: 0.5, kind: 'refund', at: now(-3600), note: 'refund for failed request', ref_type: 'usage', ref_id: 'req_refund0001', operator_id: 1 })
  events.push({ user: USERS[2], delta: 5, kind: 'plugin_credit', at: now(-7200), note: 'promo code', ref_type: 'order', ref_id: 'ord_778', plugin_key: 'payments' })
  events.sort((a, b) => a.at.localeCompare(b.at))
  for (const e of events) {
    const bal = (running.get(e.user.id) || 0) + e.delta
    running.set(e.user.id, bal)
    const id = 88000 + ledgerRows.length
    if (e.usage) e.usage.ledger_id = id
    ledgerRows.push({
      id,
      user_id: e.user.id,
      user_email: e.user.email,
      user_name: e.user.name,
      delta: money(e.delta),
      balance_after: money(bal),
      kind: e.kind,
      ref_type: e.ref_type,
      ref_id: e.ref_id,
      idempotency_key: e.kind === 'usage' ? `usage:${e.ref_id}` : `mock:${id}`,
      operator_id: e.operator_id ?? null,
      plugin_key: e.plugin_key ?? null,
      note: e.note,
      created_at: e.at
    })
  }
  ledgerRows.reverse()
}

function publicUsage(u: any, self = false) {
  const { _detail, _price, ...rest } = u
  void _detail
  void _price
  if (self) {
    delete rest.account_id
    delete rest.account_name
  }
  return rest
}

function usageFilter(rows: any[], q: Record<string, string>) {
  return rows.filter((u) => {
    if (q.from && u.created_at < q.from) return false
    if (q.to && u.created_at > q.to) return false
    if (q.user_id && String(u.user_id) !== q.user_id) return false
    if (q.group_id && String(u.group_id) !== q.group_id) return false
    if (q.account_id && String(u.account_id) !== q.account_id) return false
    if (q.client_request_id && u.client_request_id !== q.client_request_id) return false
    if (q.model) {
      const pat = q.model
      if (pat.endsWith('*') ? !u.model.startsWith(pat.slice(0, -1)) : !u.model.includes(pat)) return false
    }
    if (q.success === 'true' && !u.success) return false
    if (q.success === 'false' && u.success) return false
    return true
  })
}

function usageDetail(u: any, self = false) {
  return { ...publicUsage(u, self), billing_detail: u._detail ? { ...u._detail, ledger_id: u.ledger_id ?? null } : null, price: u._price, metrics: {} }
}

on('GET', '/usage/summary', (req) => {
  const q = { ...req.query }
  if (!q.from && !q.to) q.from = new Date(Date.now() - 30 * 86400000).toISOString()
  const by = q.group_by || 'day'
  const map = new Map<string, any>()
  for (const u of usageFilter(usageRows, q)) {
    const key = by === 'model' ? u.model : by === 'user' ? String(u.user_id) : u.created_at.slice(0, 10)
    const s = map.get(key) || { key, requests: 0, success: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0, total_cost: 0 }
    if (by === 'user') s.user_email = u.user_email
    s.requests++
    if (u.success) s.success++
    s.input_tokens += u.input_tokens
    s.output_tokens += u.output_tokens
    s.cache_read_tokens += u.cache_read_tokens
    s.cache_creation_tokens += u.cache_creation_tokens
    s.total_cost += Number(u.total_cost)
    map.set(key, s)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((s) => ({ ...s, total_cost: money(s.total_cost) }))
})
on('GET', '/usage', (req) => paginate(usageFilter(usageRows, req.query).map((u) => publicUsage(u)), req.query))
on('GET', '/usage/:id', (req) => {
  const u = usageRows.find((x) => x.id === Number(req.params.id))
  return u ? usageDetail(u) : fail(404, 'not_found', 'usage record not found')
})
on('GET', '/me/usage', (req) => paginate(usageFilter(usageRows.filter((u) => u.user_id === 1), req.query).map((u) => publicUsage(u, true)), req.query))
on('GET', '/me/usage/:id', (req) => {
  const u = usageRows.find((x) => x.id === Number(req.params.id) && x.user_id === 1)
  return u ? usageDetail(u, true) : fail(404, 'not_found', 'usage record not found')
})

// ------------------------------------------------------------------ ledger

function ledgerFilter(rows: any[], q: Record<string, string>) {
  return rows.filter((l) => {
    if (q.user_id && String(l.user_id) !== q.user_id) return false
    if (q.kind && l.kind !== q.kind) return false
    if (q.from && l.created_at < q.from) return false
    if (q.to && l.created_at > q.to) return false
    return true
  })
}

on('GET', '/ledger', (req) => paginate(ledgerFilter(ledgerRows, req.query), req.query))
on('GET', '/me/ledger', (req) => paginate(ledgerFilter(ledgerRows.filter((l) => l.user_id === 1), req.query), req.query))

// ------------------------------------------------------------------ settings

const billingSettings = { missing_price_policy: 'reject', min_balance: '0', big_cost_warning_usd: '10' }
const stickySettings = { enabled: true, default_ttl_seconds: 3600, keep_on_account_disabled: false }

on('GET', '/settings/billing', () => billingSettings)
on('PUT', '/settings/billing', (req) => {
  const b = req.body || {}
  if (!['reject', 'free'].includes(b.missing_price_policy)) {
    return fail(400, 'invalid_argument', 'invalid', { fields: [{ field: 'missing_price_policy', code: 'enum', message: 'must be reject or free' }] })
  }
  Object.assign(billingSettings, { missing_price_policy: b.missing_price_policy, min_balance: String(b.min_balance), big_cost_warning_usd: String(b.big_cost_warning_usd) })
  return billingSettings
})
on('GET', '/settings/sticky', () => stickySettings)
on('PUT', '/settings/sticky', (req) => {
  const b = req.body || {}
  Object.assign(stickySettings, { enabled: !!b.enabled, default_ttl_seconds: Number(b.default_ttl_seconds) || 3600, keep_on_account_disabled: !!b.keep_on_account_disabled })
  return stickySettings
})

// Gateway settings (CONTRACTS §8, §14.4): ranges 1–10, 100–30000, 50–2000.
const gatewaySettings = { max_attempts: 3, platform_call_timeout_ms: 2000, default_hook_timeout_ms: 300 }
const GATEWAY_RANGES: Record<keyof typeof gatewaySettings, [number, number]> = {
  max_attempts: [1, 10],
  platform_call_timeout_ms: [100, 30000],
  default_hook_timeout_ms: [50, 2000]
}
on('GET', '/settings/gateway', () => gatewaySettings)
on('PUT', '/settings/gateway', (req) => {
  const b = req.body || {}
  const fields: Array<{ field: string; code: string; message: string }> = []
  for (const [k, [min, max]] of Object.entries(GATEWAY_RANGES)) {
    const v = b[k]
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
      fields.push({ field: k, code: 'out_of_range', message: `${k} must be an integer between ${min} and ${max}` })
    }
  }
  if (fields.length) return fail(400, 'invalid_argument', 'invalid gateway settings', { fields })
  Object.assign(gatewaySettings, { max_attempts: b.max_attempts, platform_call_timeout_ms: b.platform_call_timeout_ms, default_hook_timeout_ms: b.default_hook_timeout_ms })
  return gatewaySettings
})

// ------------------------------------------------------------------ sticky rules

const stickyRules: any[] = [
  {
    id: 1,
    name: 'claude-code-session',
    source: 'plugin_default',
    plugin_key: 'anthropic',
    enabled: true,
    priority: 100,
    match: { protocols: ['anthropic.messages'], models: ['claude-*'], userAgentContains: [] },
    key_sources: [
      { type: 'body', path: 'metadata.user_id' },
      { type: 'header', name: 'x-session-id' }
    ],
    value_regex: 'session_([a-f0-9-]+)',
    ttl_seconds: 3600,
    key_includes: ['group', 'model', 'rule'],
    on_failure: 'failover'
  },
  {
    id: 2,
    name: 'anthropic-api-key',
    source: 'plugin_default',
    plugin_key: 'anthropic',
    enabled: false,
    priority: 10,
    match: { protocols: ['anthropic.messages'], models: [], userAgentContains: [] },
    key_sources: [{ type: 'api_key' }],
    value_regex: '',
    ttl_seconds: 0,
    key_includes: ['group', 'rule'],
    on_failure: 'failover'
  },
  {
    id: 3,
    name: 'cli-users-stick',
    source: 'admin',
    plugin_key: null,
    enabled: true,
    priority: 200,
    match: { protocols: [], models: ['claude-sonnet-*'], userAgentContains: ['claude-cli'] },
    key_sources: [{ type: 'user' }],
    value_regex: '',
    ttl_seconds: 1800,
    key_includes: ['group', 'model'],
    on_failure: 'stick'
  }
]
const stickyStats: Record<string, { hits: number; misses: number; rebinds: number }> = {
  'claude-code-session': { hits: 18234, misses: 2311, rebinds: 142 },
  'anthropic-api-key': { hits: 0, misses: 0, rebinds: 0 },
  'cli-users-stick': { hits: 912, misses: 88, rebinds: 3 }
}

on('GET', '/sticky-rules/stats', () => stickyRules.map((r) => ({ rule: r.name, ...(stickyStats[r.name] || { hits: 0, misses: 0, rebinds: 0 }) })))
on('GET', '/sticky-rules', (req) => paginate(stickyRules, req.query))
on('POST', '/sticky-rules', (req) => {
  const b = req.body || {}
  if (!b.name) return fail(400, 'invalid_argument', 'invalid', { fields: [{ field: 'name', code: 'required', message: 'Name is required' }] })
  if (stickyRules.some((r) => r.name === b.name)) return fail(400, 'invalid_argument', 'invalid', { fields: [{ field: 'name', code: 'duplicate', message: 'Name already used' }] })
  const rule = { ...b, id: nextId(), source: 'admin', plugin_key: null }
  stickyRules.push(rule)
  return rule
})
on('PATCH', '/sticky-rules/:id', (req) => {
  const r = stickyRules.find((x) => x.id === Number(req.params.id))
  if (!r) return fail(404, 'not_found', 'rule not found')
  const b = req.body || {}
  if (r.source === 'plugin_default' && Object.keys(b).some((k) => !['enabled', 'priority', 'ttl_seconds'].includes(k))) {
    return fail(409, 'conflict', 'plugin default rules only allow enabled/priority/ttl_seconds')
  }
  Object.assign(r, b)
  return r
})
on('DELETE', '/sticky-rules/:id', (req) => {
  const i = stickyRules.findIndex((x) => x.id === Number(req.params.id))
  if (i < 0) return fail(404, 'not_found', 'rule not found')
  if (stickyRules[i].source !== 'admin') return fail(409, 'conflict', 'plugin default rules cannot be deleted')
  stickyRules.splice(i, 1)
  return noContent()
})
on('POST', '/sticky-rules/:id/flush', (req) => {
  const r = stickyRules.find((x) => x.id === Number(req.params.id))
  if (!r) return fail(404, 'not_found', 'rule not found')
  if (!(r.key_includes || []).includes('rule')) return fail(409, 'conflict', 'bindings are shared with other rules and cannot be flushed on their own')
  return { deleted: Math.floor(Math.random() * 40) }
})
