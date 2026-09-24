// Price expression helpers: generation from the visual models (per_request,
// per_token, tiers + markup rules) and a small parser that turns exactly those
// generated forms back into the visual model. Pure TS without imports.

export type PriceMode = 'per_request' | 'per_token' | 'expression'

export const TOKEN_VARS = ['p', 'c', 'cr', 'cc', 'cc1h'] as const
export type TokenVar = (typeof TOKEN_VARS)[number]

/** USD per 1M tokens; null = not priced (term omitted; those cache tokens are not billed). */
export type TokenPrices = Record<TokenVar, number | null>

export const CACHE_VARS: readonly TokenVar[] = ['cr', 'cc', 'cc1h']

export interface Tier extends TokenPrices {
  name: string
  /** Upper bound of len (inclusive); null = "otherwise" (last tier). */
  max_len: number | null
  flat: number
}

export interface HeaderRule {
  kind: 'header'
  name: string
  op: 'contains' | 'eq'
  value: string
  multiplier: number
}

export interface ParamRule {
  kind: 'param'
  path: string
  op: 'contains' | 'eq'
  value: string
  multiplier: number
}

export interface TimeRule {
  kind: 'time'
  tz: string
  from_hour: number
  to_hour: number
  multiplier: number
}

export type MarkupRule = HeaderRule | ParamRule | TimeRule

export interface VisualConfig {
  tiers: Tier[]
  rules: MarkupRule[]
}

// ------------------------------------------------------------------ helpers

export function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function fmt(n: number): string {
  // Avoid float noise such as 0.30000000000000004.
  const s = String(n)
  if (s.length > 12 && !s.includes('e')) return String(Number(n.toPrecision(12)))
  return s
}

export function isSet(v: unknown): boolean {
  return v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))
}

function str(s: string): string {
  return JSON.stringify(s ?? '')
}

export function emptyTokenPrices(): TokenPrices {
  return { p: null, c: null, cr: null, cc: null, cc1h: null }
}

export function newTier(name: string, maxLen: number | null): Tier {
  return { name, max_len: maxLen, flat: 0, ...emptyTokenPrices() }
}

export function defaultVisual(): VisualConfig {
  return {
    tiers: [
      { name: 'standard', max_len: 200000, flat: 0, p: 3, c: 15, cr: 0.3, cc: 3.75, cc1h: 6 },
      { name: 'long_context', max_len: null, flat: 0, p: 6, c: 22.5, cr: 0.6, cc: 7.5, cc1h: 12 }
    ],
    rules: []
  }
}

export function tokenPricesFrom(cfg: any): TokenPrices {
  const out = emptyTokenPrices()
  for (const k of TOKEN_VARS) out[k] = isSet(cfg?.[k]) ? num(cfg?.[k]) : null
  return out
}

// ------------------------------------------------------------------ generation

function tokenTerms(tp: TokenPrices): string[] {
  const terms: string[] = []
  for (const k of TOKEN_VARS) {
    if (!isSet(tp[k])) continue
    const v = num(tp[k])
    // An explicit cache price of 0 (free) is kept so the expression shows it;
    // p/c zeros are noise.
    if (v === 0 && !CACHE_VARS.includes(k)) continue
    terms.push(`${k}*${fmt(v)}`)
  }
  return terms
}

/** Token prices without unset keys (config form sent to the server). */
export function compactPrices(tp: Partial<TokenPrices>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const k of TOKEN_VARS) if (isSet(tp[k])) out[k] = num(tp[k])
  return out
}

/** Visual config as sent to the server (unset prices omitted, tiers ordered). */
export function visualConfigForSave(cfg: VisualConfig): Record<string, unknown> {
  const v = normalizeVisual(cfg)
  return {
    tiers: orderedTiers(v.tiers).map((t, i, all) => ({
      name: t.name,
      max_len: i === all.length - 1 ? null : t.max_len,
      ...(num(t.flat) ? { flat: num(t.flat) } : {}),
      ...compactPrices(t)
    })),
    rules: v.rules
  }
}

export function tierCall(name: string, body: string): string {
  return `tier(${str(name)}, ${body})`
}

function tierBody(t: Tier): string {
  const parts: string[] = []
  if (num(t.flat) !== 0) parts.push(`flat(${fmt(num(t.flat))})`)
  parts.push(...tokenTerms(t))
  return parts.length ? parts.join(' + ') : '0'
}

export function perRequestExpr(price: unknown): string {
  return tierCall('base', `flat(${fmt(num(price))})`)
}

export function perTokenExpr(tp: TokenPrices): string {
  const terms = tokenTerms(tp)
  return tierCall('base', terms.length ? terms.join(' + ') : '0')
}

/** Orders tiers: bounded ones by max_len ascending, the last one is "otherwise". */
export function orderedTiers(tiers: Tier[]): Tier[] {
  if (tiers.length <= 1) return [...tiers]
  const last = tiers[tiers.length - 1]
  const rest = tiers.slice(0, -1).sort((a, b) => num(a.max_len, Infinity) - num(b.max_len, Infinity))
  return [...rest, last]
}

export function ruleCond(r: MarkupRule): string {
  switch (r.kind) {
    case 'header':
      return r.op === 'contains' ? `has(header(${str(r.name)}), ${str(r.value)})` : `header(${str(r.name)}) == ${str(r.value)}`
    case 'param':
      return r.op === 'contains' ? `has(param(${str(r.path)}), ${str(r.value)})` : `param(${str(r.path)}) == ${literal(r.value)}`
    case 'time': {
      const h = `hour(${str(r.tz)})`
      const a = Math.trunc(num(r.from_hour))
      const b = Math.trunc(num(r.to_hour))
      return a <= b ? `${h} >= ${a} && ${h} < ${b}` : `(${h} >= ${a} || ${h} < ${b})`
    }
  }
}

function literal(v: string): string {
  const s = String(v ?? '').trim()
  if (/^-?\d+(\.\d+)?$/.test(s) || s === 'true' || s === 'false') return s
  return str(String(v ?? ''))
}

export function visualExpr(cfg: VisualConfig): string {
  const tiers = orderedTiers(cfg.tiers || [])
  let base: string
  if (tiers.length === 0) base = tierCall('base', '0')
  else {
    base = tierCall(tiers[tiers.length - 1].name, tierBody(tiers[tiers.length - 1]))
    for (let i = tiers.length - 2; i >= 0; i--) {
      base = `len <= ${Math.trunc(num(tiers[i].max_len))} ? ${tierCall(tiers[i].name, tierBody(tiers[i]))} : ${base}`
    }
  }
  const rules = (cfg.rules || []).map((r) => ` ||| ${ruleCond(r)} ? ${fmt(num(r.multiplier, 1))} : 1`)
  return base + rules.join('')
}

/** Local problems of a visual config (i18n keys + params) that block saving. */
export function checkVisual(cfg: VisualConfig): Array<{ key: string; params?: Record<string, unknown> }> {
  const out: Array<{ key: string; params?: Record<string, unknown> }> = []
  if (!cfg.tiers.length) out.push({ key: 'prices.local.noTier' })
  const names = new Set<string>()
  cfg.tiers.forEach((t, i) => {
    if (!t.name.trim()) out.push({ key: 'prices.local.tierName', params: { n: i + 1 } })
    else if (names.has(t.name)) out.push({ key: 'prices.local.tierDup', params: { name: t.name } })
    names.add(t.name)
    if (i < cfg.tiers.length - 1 && (t.max_len === null || (t.max_len as unknown) === '' || !(num(t.max_len) > 0))) {
      out.push({ key: 'prices.local.tierMax', params: { name: t.name || i + 1 } })
    }
  })
  cfg.rules.forEach((r, i) => {
    if (r.kind === 'header' && !r.name.trim()) out.push({ key: 'prices.local.ruleField', params: { n: i + 1 } })
    if (r.kind === 'param' && !r.path.trim()) out.push({ key: 'prices.local.ruleField', params: { n: i + 1 } })
    if (r.kind === 'time' && !r.tz.trim()) out.push({ key: 'prices.local.ruleField', params: { n: i + 1 } })
  })
  return out
}

export function normalizeVisual(cfg: any): VisualConfig {
  const tiers: Tier[] = Array.isArray(cfg?.tiers)
    ? cfg.tiers.map((t: any, i: number) => ({
        name: String(t?.name ?? `tier_${i + 1}`),
        max_len: t?.max_len === null || t?.max_len === undefined || t?.max_len === '' ? null : num(t.max_len),
        flat: num(t?.flat ?? t?.prices?.flat),
        ...tokenPricesFrom(t?.prices && typeof t.prices === 'object' ? t.prices : t)
      }))
    : []
  const rules: MarkupRule[] = Array.isArray(cfg?.rules)
    ? cfg.rules
        .map((r: any): MarkupRule | null => {
          const m = num(r?.multiplier, 1)
          const kind = r?.kind ?? r?.source
          if (kind === 'header') return { kind: 'header', name: String(r.name ?? ''), op: r.op === 'eq' ? 'eq' : 'contains', value: String(r.value ?? ''), multiplier: m }
          if (kind === 'param') return { kind: 'param', path: String(r.path ?? ''), op: r.op === 'contains' ? 'contains' : 'eq', value: String(r.value ?? ''), multiplier: m }
          if (kind === 'time') return { kind: 'time', tz: String(r.tz ?? 'UTC'), from_hour: num(r.from_hour), to_hour: num(r.to_hour), multiplier: m }
          return null
        })
        .filter(Boolean)
    : []
  return { tiers, rules }
}

export function hasVisualConfig(cfg: any): boolean {
  return !!cfg && (Array.isArray(cfg.tiers) || Array.isArray(cfg.rules)) && (cfg.tiers?.length > 0 || cfg.rules?.length > 0)
}

// ------------------------------------------------------------------ parsing

type Tok = { t: 'str' | 'num' | 'id' | 'op'; v: string }

function tokenize(src: string): Tok[] | null {
  const out: Tok[] = []
  let i = 0
  const s = src
  while (i < s.length) {
    const ch = s[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (ch === '#') {
      // comment to end of line
      while (i < s.length && s[i] !== '\n') i++
      continue
    }
    if (ch === '"') {
      let j = i + 1
      let raw = '"'
      while (j < s.length && s[j] !== '"') {
        if (s[j] === '\\') {
          raw += s[j] + (s[j + 1] ?? '')
          j += 2
        } else raw += s[j++]
      }
      if (j >= s.length) return null
      raw += '"'
      try {
        out.push({ t: 'str', v: JSON.parse(raw) })
      } catch {
        return null
      }
      i = j + 1
      continue
    }
    const numM = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i))
    if (numM && (ch !== '-' || !out.length || out[out.length - 1].t === 'op')) {
      out.push({ t: 'num', v: numM[0] })
      i += numM[0].length
      continue
    }
    const idM = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i))
    if (idM) {
      out.push({ t: 'id', v: idM[0] })
      i += idM[0].length
      continue
    }
    const ops = ['|||', '<=', '>=', '==', '!=', '&&', '||', '<', '>', '?', ':', '(', ')', ',', '+', '*']
    const op = ops.find((o) => s.startsWith(o, i))
    if (!op) return null
    out.push({ t: 'op', v: op })
    i += op.length
  }
  return out
}

class Fail extends Error {}

class Parser {
  i = 0
  toks: Tok[]
  constructor(toks: Tok[]) {
    this.toks = toks
  }
  peek(o = 0): Tok | undefined {
    return this.toks[this.i + o]
  }
  isOp(v: string, o = 0) {
    const t = this.peek(o)
    return !!t && t.t === 'op' && t.v === v
  }
  isId(v: string, o = 0) {
    const t = this.peek(o)
    return !!t && t.t === 'id' && t.v === v
  }
  op(v: string) {
    if (!this.isOp(v)) throw new Fail(v)
    this.i++
  }
  id(v?: string): string {
    const t = this.peek()
    if (!t || t.t !== 'id' || (v !== undefined && t.v !== v)) throw new Fail(v || 'id')
    this.i++
    return t.v
  }
  str(): string {
    const t = this.peek()
    if (!t || t.t !== 'str') throw new Fail('string')
    this.i++
    return t.v
  }
  num(): number {
    const t = this.peek()
    if (!t || t.t !== 'num') throw new Fail('number')
    this.i++
    return Number(t.v)
  }
  done() {
    return this.i >= this.toks.length
  }

  // base := '(' base ')' | tierCall | 'len' '<=' NUM '?' tierCall ':' base
  base(): Tier[] {
    if (this.isOp('(')) {
      this.op('(')
      const b = this.base()
      this.op(')')
      return b
    }
    if (this.isId('len')) {
      this.id('len')
      this.op('<=')
      const max = this.num()
      this.op('?')
      const first = this.parenTier()
      first.max_len = max
      this.op(':')
      const rest = this.base()
      if (rest.length && rest[0].max_len !== null && rest[0].max_len <= max) throw new Fail('order')
      return [first, ...rest]
    }
    return [this.parenTier()]
  }

  parenTier(): Tier {
    if (this.isOp('(')) {
      this.op('(')
      const t = this.parenTier()
      this.op(')')
      return t
    }
    return this.tier()
  }

  tier(): Tier {
    this.id('tier')
    this.op('(')
    const name = this.str()
    this.op(',')
    const t = newTier(name, null)
    const seen = new Set<string>()
    const term = () => {
      if (this.isId('flat')) {
        this.id('flat')
        this.op('(')
        if (seen.has('flat')) throw new Fail('dup')
        seen.add('flat')
        t.flat = this.num()
        this.op(')')
        return
      }
      const tk = this.peek()
      if (tk?.t === 'num' && !this.isOp('*', 1)) {
        if (Number(tk.v) !== 0) throw new Fail('const')
        this.i++
        return
      }
      let v: string
      let n: number
      if (tk?.t === 'num') {
        n = this.num()
        this.op('*')
        v = this.id()
      } else {
        v = this.id()
        this.op('*')
        n = this.num()
      }
      if (!(TOKEN_VARS as readonly string[]).includes(v) || seen.has(v)) throw new Fail('var')
      seen.add(v)
      t[v as TokenVar] = n
    }
    term()
    while (this.isOp('+')) {
      this.op('+')
      term()
    }
    this.op(')')
    return t
  }

  // rule := cond '?' NUM ':' 1
  rule(): MarkupRule {
    const r = this.cond()
    this.op('?')
    const m = this.num()
    this.op(':')
    if (this.num() !== 1) throw new Fail('else')
    r.multiplier = m
    return r
  }

  cond(): MarkupRule {
    if (this.isOp('(')) {
      this.op('(')
      const r = this.cond()
      this.op(')')
      return r
    }
    if (this.isId('has')) {
      this.id('has')
      this.op('(')
      const fn = this.id()
      if (fn !== 'header' && fn !== 'param') throw new Fail('has')
      this.op('(')
      const key = this.str()
      this.op(')')
      this.op(',')
      const value = this.str()
      this.op(')')
      return fn === 'header'
        ? { kind: 'header', name: key, op: 'contains', value, multiplier: 1 }
        : { kind: 'param', path: key, op: 'contains', value, multiplier: 1 }
    }
    if (this.isId('header')) {
      this.id('header')
      this.op('(')
      const name = this.str()
      this.op(')')
      this.op('==')
      return { kind: 'header', name, op: 'eq', value: this.str(), multiplier: 1 }
    }
    if (this.isId('param')) {
      this.id('param')
      this.op('(')
      const path = this.str()
      this.op(')')
      this.op('==')
      const tk = this.peek()
      let value: string
      if (tk?.t === 'str') value = this.str()
      else if (tk?.t === 'num') {
        value = tk.v
        this.i++
      } else if (tk?.t === 'id' && (tk.v === 'true' || tk.v === 'false')) value = this.id()
      else throw new Fail('value')
      return { kind: 'param', path, op: 'eq', value, multiplier: 1 }
    }
    if (this.isId('hour')) {
      const tz = this.hourCall()
      this.op('>=')
      const a = this.num()
      let conj: string
      if (this.isOp('&&')) conj = '&&'
      else if (this.isOp('||')) conj = '||'
      else throw new Fail('conj')
      this.op(conj)
      const tz2 = this.hourCall()
      if (tz2 !== tz) throw new Fail('tz')
      this.op('<')
      const b = this.num()
      // && means from <= to; || means a range wrapping midnight.
      if ((conj === '&&') !== a <= b) throw new Fail('range')
      return { kind: 'time', tz, from_hour: a, to_hour: b, multiplier: 1 }
    }
    throw new Fail('cond')
  }

  hourCall(): string {
    this.id('hour')
    this.op('(')
    const tz = this.str()
    this.op(')')
    return tz
  }
}

function splitRules(toks: Tok[]): Tok[][] {
  const parts: Tok[][] = [[]]
  for (const t of toks) {
    if (t.t === 'op' && t.v === '|||') parts.push([])
    else parts[parts.length - 1].push(t)
  }
  return parts
}

/** Parses an expression of the generated forms back into the visual model; null if not representable. */
export function parseExpression(src: string): VisualConfig | null {
  let text = (src || '').trim()
  if (!text) return null
  const vm = /^v1\s*:/.exec(text)
  if (vm) text = text.slice(vm[0].length)
  const toks = tokenize(text)
  if (!toks || !toks.length) return null
  const [baseToks, ...ruleToks] = splitRules(toks)
  try {
    const bp = new Parser(baseToks)
    const tiers = bp.base()
    if (!bp.done()) return null
    const rules = ruleToks.map((rt) => {
      const rp = new Parser(rt)
      const r = rp.rule()
      if (!rp.done()) throw new Fail('trailing')
      return r
    })
    return { tiers, rules }
  } catch (e) {
    if (e instanceof Fail) return null
    throw e
  }
}

// ------------------------------------------------------------------ list summary

export type PriceSummary =
  | { kind: 'per_request'; price: number }
  | { kind: 'per_token'; prices: TokenPrices }
  | { kind: 'visual'; tiers: number; rules: number; tierNames: string[] }
  | { kind: 'custom' }

export function summarize(mode: PriceMode, config: Record<string, any> | null | undefined, expression: string): PriceSummary {
  if (mode === 'per_request') {
    if (config && config.price !== undefined) return { kind: 'per_request', price: num(config.price) }
    const v = parseExpression(expression)
    if (v && v.tiers.length === 1) return { kind: 'per_request', price: v.tiers[0].flat }
  }
  if (mode === 'per_token') {
    if (config && TOKEN_VARS.some((k) => config[k] !== undefined)) return { kind: 'per_token', prices: tokenPricesFrom(config) }
    const v = parseExpression(expression)
    if (v && v.tiers.length === 1) return { kind: 'per_token', prices: tokenPricesFrom(v.tiers[0]) }
  }
  const vis = hasVisualConfig(config) ? normalizeVisual(config) : parseExpression(expression)
  if (!vis) return { kind: 'custom' }
  return { kind: 'visual', tiers: vis.tiers.length, rules: vis.rules.length, tierNames: vis.tiers.map((t) => t.name) }
}
