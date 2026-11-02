// 命名表加载与合并。格式规范见 naming/README.md。
// 用法：
//   import { loadNaming } from './naming.mjs'
//   const { modules, clashes, warnings, files } = loadNaming('naming')
//   modules: Map<file, { top: Map<原名, Spec>, locals: Map<偏移数字, Spec>, exports: Map<导出名, Spec> }>
//   Spec = { name, source, confidence, note, from }（from = 来自哪个命名表文件）
// 读取 <dir> 下递归所有 *.json 与 *.jsonl（跳过 _ 开头的文件）：
//   JSON  { "<file>": { "@N": spec, "top": {"<压缩名>": spec}, "locals": {"@N": spec}, "exports": {"<导出名>": spec} } }
//         模块对象里直接写的 "@N" 与 locals 等价（顶层绑定也可以用偏移键）。
//   JSONL 每行 { "file", "key": "@N" | "top": "<压缩名>" | "export": "<导出名>", "name", "source", "confidence", "note" }
//   spec 可以是字符串（= {name, source:"auto"}）或对象 {name, source, confidence, note, …}（其他字段忽略）。
//   顶层键不是模块文件名（*.js/*.mjs/*.cjs）的 JSON 项、以 $ 开头的键：忽略并记 warnings。
// 同一键在多处给了不同名字：置信度高者胜；相同则按来源 vendor > reference > semantic > auto > 其他；
// 再相同取先加载者（文件路径排序靠前、文件内靠前）。所有分歧记入 clashes。
import fs from 'node:fs';
import path from 'node:path';

export const SOURCES = ['vendor', 'reference', 'semantic', 'auto'];
const SOURCE_RANK = new Map(SOURCES.map((s, i) => [s, i]));
export const DEFAULT_CONFIDENCE = 0.5;
const MODULE_FILE = /\.(js|mjs|cjs)$/;

function listFiles(dir) {
  const out = [];
  if (!dir || !fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listFiles(p));
    else if (/\.jsonl?$/.test(ent.name) && !ent.name.startsWith('_')) out.push(p);
  }
  return out.sort();
}

export function normalizeSpec(v, from) {
  if (typeof v === 'string') return { name: v, source: 'auto', confidence: DEFAULT_CONFIDENCE, note: null, from };
  if (!v || typeof v.name !== 'string') throw new Error(`${from}: naming entry must be a string or {name: string, …}`);
  return {
    name: v.name,
    source: typeof v.source === 'string' ? v.source : 'auto',
    confidence: typeof v.confidence === 'number' ? v.confidence : DEFAULT_CONFIDENCE,
    note: v.note ?? null,
    from,
  };
}

const rank = (s) => (SOURCE_RANK.has(s) ? SOURCE_RANK.get(s) : SOURCES.length);

function better(a, b) {
  if (a.confidence !== b.confidence) return a.confidence > b.confidence ? a : b;
  const ra = rank(a.source);
  const rb = rank(b.source);
  if (ra !== rb) return ra < rb ? a : b;
  return a;
}

export function emptyModule() {
  return { top: new Map(), locals: new Map(), exports: new Map() };
}

class Merger {
  constructor() {
    this.modules = new Map();
    this.clashes = [];
    this.warnings = [];
  }
  mod(file) {
    let m = this.modules.get(file);
    if (!m) this.modules.set(file, (m = emptyModule()));
    return m;
  }
  put(file, section, key, spec) {
    const m = this.mod(file);
    const prev = m[section].get(key);
    if (!prev) return void m[section].set(key, spec);
    if (prev.name === spec.name) return;
    const win = better(prev, spec);
    this.clashes.push({ file, section, key: section === 'locals' ? '@' + key : key, candidates: [prev, spec].map((s) => ({ name: s.name, source: s.source, confidence: s.confidence, from: s.from })), chosen: win.name });
    m[section].set(key, win);
  }
  offsetKey(k, from) {
    const mm = /^@(\d+)$/.exec(k);
    if (!mm) throw new Error(`${from}: binding key "${k}" must be "@<offset>"`);
    return Number(mm[1]);
  }
  addObject(obj, from) {
    for (const [file, entry] of Object.entries(obj)) {
      if (file.startsWith('$') || !MODULE_FILE.test(file)) {
        this.warnings.push({ from, kind: 'ignored-key', key: file });
        continue;
      }
      if (!entry || typeof entry !== 'object') throw new Error(`${from}: entry for ${file} must be an object`);
      for (const [k, v] of Object.entries(entry)) {
        if (k.startsWith('@')) this.put(file, 'locals', this.offsetKey(k, from), normalizeSpec(v, from));
        else if (k === 'top' || k === 'exports') for (const [kk, vv] of Object.entries(v ?? {})) this.put(file, k, kk, normalizeSpec(vv, from));
        else if (k === 'locals') for (const [kk, vv] of Object.entries(v ?? {})) this.put(file, 'locals', this.offsetKey(kk, from), normalizeSpec(vv, from));
        else if (!k.startsWith('$')) this.warnings.push({ from, kind: 'ignored-section', key: `${file}.${k}` });
      }
    }
  }
  addLine(rec, from) {
    if (!rec || typeof rec.file !== 'string') throw new Error(`${from}: JSONL record needs "file"`);
    const spec = normalizeSpec(rec, from);
    if (typeof rec.key === 'string') this.put(rec.file, 'locals', this.offsetKey(rec.key, from), spec);
    else if (typeof rec.top === 'string') this.put(rec.file, 'top', rec.top, spec);
    else if (typeof rec.export === 'string') this.put(rec.file, 'exports', rec.export, spec);
    else throw new Error(`${from}: JSONL record needs "key", "top" or "export"`);
  }
}

// 测试与库调用：直接合并内存对象。
export function namingFromObjects(objs) {
  const m = new Merger();
  objs.forEach((o, i) => m.addObject(o, `inline#${i}`));
  return { modules: m.modules, clashes: m.clashes, warnings: m.warnings, files: [] };
}

export function loadNaming(dir) {
  const m = new Merger();
  const files = listFiles(dir);
  for (const f of files) {
    const from = path.relative(process.cwd(), f).replace(/\\/g, '/');
    const text = fs.readFileSync(f, 'utf8');
    if (f.endsWith('.jsonl')) {
      let ln = 0;
      for (const line of text.split('\n')) {
        ln++;
        if (line.trim()) m.addLine(JSON.parse(line), `${from}:${ln}`);
      }
    } else m.addObject(JSON.parse(text), from);
  }
  return { modules: m.modules, clashes: m.clashes, warnings: m.warnings, files: files.map((f) => path.relative(process.cwd(), f).replace(/\\/g, '/')) };
}

// 供 worker 传递：Map 转数组再转回。
export function moduleEntryToJSON(m) {
  if (!m) return null;
  return { top: [...m.top], locals: [...m.locals], exports: [...m.exports] };
}
export function moduleEntryFromJSON(j) {
  if (!j) return emptyModule();
  return { top: new Map(j.top), locals: new Map(j.locals), exports: new Map(j.exports) };
}
