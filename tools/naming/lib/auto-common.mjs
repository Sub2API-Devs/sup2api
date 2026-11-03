// Shared helpers for the evidence-based naming rules (auto-names.mjs, propagate.mjs).
//   import { listFiles, parseFile, minifiedModuleOf, isMinifiedName, singular, resultNameOf, ... } from './lib/auto-common.mjs'
// "Still minified" follows tools/verify/readability.mjs: the module is minified
// (more than 60% of its own, non-import bindings have names of 1–3 characters)
// and the binding's name is 1–3 characters long.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

export const readJsonl = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

export function listFiles() {
  return fs.readdirSync('original').filter((f) => /\.(js|mjs)$/.test(f) && !/\.min\.js$/.test(f) && f !== 'hljsBundle.generated.min.js').sort();
}

export function parseFile(file) {
  const src = fs.readFileSync(path.join('original', file), 'utf8');
  try {
    return { src, ast: parse(src, { sourceType: 'module' }) };
  } catch {
    return { src, ast: null };
  }
}

// Babel program path → is the module minified? Counts every non-import binding of every scope.
export function minifiedModuleOf(programPath) {
  let own = 0;
  let short = 0;
  const seen = new Set();
  const count = (scope) => {
    for (const b of Object.values(scope.bindings)) {
      if (b.kind === 'module' || seen.has(b)) continue;
      seen.add(b);
      own++;
      if (b.identifier.name.length <= 3) short++;
    }
  };
  count(programPath.scope);
  programPath.traverse({ Scopable(p) { count(p.scope); } });
  return own > 0 && short > own * 0.6;
}
export const isMinifiedName = (name) => name.length <= 3;

// Names a reader would accept as words. Rejected for every rule: they say nothing or would mislead.
export const BAD = new Set(['default', 'prototype', 'constructor', 'length', 'then', 'catch', 'finally', 'call', 'apply', 'bind', 'current', 'next', 'done', 'push', 'pop', 'shift',
  'toString', 'valueOf', 'hasOwnProperty', '__proto__', 'size', 'get', 'set', 'has', 'add', 'delete', 'clear', 'exports', 'module', 'require', 'undefined', 'arguments', 'eval', 'self', 'window', 'global', 'globalThis']);
export const RESERVED = new Set(['break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'await', 'arguments', 'eval', 'undefined', 'NaN', 'Infinity']);
// A usable new name: identifier, 2..40 chars, not reserved, not a minified-looking name.
export const okName = (n) => typeof n === 'string' && /^[A-Za-z_$][\w$]*$/.test(n) && n.length >= 4 && n.length <= 40 && !RESERVED.has(n) && !BAD.has(n) && !/^[A-Z][A-Z0-9_]*$/.test(n) && !/\d{2,}/.test(n) && !/^_/.test(n);
// Short names still welcome (conventional, readable at a glance).
export const SHORT_OK = new Set(['key', 'url', 'err', 'dir', 'cwd', 'pid', 'res', 'req', 'ctx', 'acc', 'msg', 'src', 'buf', 'row', 'col', 'tag', 'ref', 'map', 'now', 'end', 'pos', 'log', 'cmd', 'arg', 'env', 'doc', 'id', 'fn', 'cb', 'ms', 'ts', 'raw', 'out', 'idx', 'len', 'max', 'min', 'str', 'obj', 'arr', 'val', 'num', 'tmp', 'sum', 'run', 'opt', 'box', 'app', 'day', 'ext', 'hex', 'img', 'net', 'old', 'pad', 'pct', 'sec', 'seq', 'sql', 'tab', 'tok', 'top', 'txt', 'uid', 'uri', 'var', 'ver', 'xml', 'job', 'item', 'line', 'node', 'name', 'path', 'file', 'text', 'type', 'data', 'mode', 'info', 'kind']);
export const usable = (n) => okName(n) || SHORT_OK.has(n);

export const lowerFirst = (s) => s[0].toLowerCase() + s.slice(1);
// lowerCamel("URLPath") = "urlPath", lowerCamel("JSON") = "json", lowerCamel("FooBar") = "fooBar"
export const lowerCamel = (s) => { const m = /^[A-Z]{2,}(?=[A-Z][a-z]|[^A-Za-z]|$)/.exec(s); return m ? m[0].toLowerCase() + s.slice(m[0].length) : lowerFirst(s); };
export const upperFirst = (s) => s[0].toUpperCase() + s.slice(1);
export const camel = (s) => s.toLowerCase().replace(/[_\-.:/ ]+([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/[^\w$]/g, '');

// Singular form of a collection name (last camelCase word). null when the name is not clearly plural.
const IRREGULAR = { children: 'child', people: 'person', indices: 'index', indexes: 'index', aliases: 'alias', statuses: 'status', analyses: 'analysis', vertices: 'vertex', matrices: 'matrix', leaves: 'leaf', halves: 'half', selves: 'self', bytes: 'byte', series: null, species: null, news: null, data: null, metadata: null, details: 'detail', args: 'arg', argv: 'arg', params: 'param', props: 'prop', opts: 'opt', ids: 'id', uuids: 'uuid', urls: 'url', keys: 'key', dirs: 'dir', paths: 'path', files: 'file', lines: 'line', items: 'item', entries: 'entry' };
const NON_PLURAL = /(ss|us|is|ous|ics|ness|less|sis|xis|ws|as|os)$/;
export function singular(name) {
  if (typeof name !== 'string' || name.length < 3) return null;
  if (/^all[A-Z]/.test(name)) name = lowerFirst(name.slice(3)); // allTools -> tool
  const m = /^(.*?)([A-Z]?[a-z]+)$/.exec(name);
  if (!m) return null;
  const [, head, last0] = m;
  const cap = /^[A-Z]/.test(last0);
  const last = last0.toLowerCase();
  const fix = (w) => (w === null || w === undefined ? null : head + (cap ? upperFirst(w) : w));
  // fooList / fooArray / fooArr / fooItems / fooSet → foo
  if (head && /^(list|array|arr|set|items|collection)$/.test(last)) return /^[a-z]/.test(head) && head.length >= 3 ? head : null;
  if (last in IRREGULAR) return fix(IRREGULAR[last]);
  if (NON_PLURAL.test(last)) return null;
  if (/ies$/.test(last) && last.length > 4) return fix(last.slice(0, -3) + 'y');
  if (/(sses|shes|ches|xes|zes)$/.test(last)) return fix(last.slice(0, -2));
  if (/[^s]s$/.test(last)) return fix(last.slice(0, -1));
  return null;
}

// Name for the value a call returns, derived from the callee's (readable) name.
//   getFooBar → fooBar, loadConfig → config, useAppState → appState, createServer → server
// Predicates (isX, hasX, shouldX …) and verbs without an object return null.
const RESULT_VERB = /^(get|load|read|fetch|create|build|compute|resolve|parse|find|make|collect|gather|derive|extract|init|initialize|generate|select|lookup|query|retrieve|obtain|acquire|use|calculate|calc|detect|discover|determine|prepare|construct|new|to|ensure|open|spawn|start|connect)(?=[A-Z])/;
export function resultNameOf(callee) {
  if (typeof callee !== 'string') return null;
  const m = RESULT_VERB.exec(callee);
  if (!m) return null;
  let rest = callee.slice(m[1].length);
  if (/^(Or|And|If|For|From|With|By|To)[A-Z]/.test(rest)) return null;
  rest = rest.replace(/(Sync|Async|Cached|Once|Safe|Safely|Lazy|Impl|Internal)$/, '');
  if (rest.length < 3) return null;
  if (/^[A-Z0-9_]+$/.test(rest)) return rest.length >= 3 && rest.length <= 6 ? rest.toLowerCase() : null;
  const n = lowerCamel(rest);
  return usable(n) ? n : null;
}

// React: hook functions defined in the React chunk (`X=function(t){return s.H.useState(t)}`),
// plus createElement. Returns Map(exportName → hookName) and the chunk file.
export function reactHooks() {
  for (const f of fs.readdirSync('original').filter((x) => /^chunk-.*\.js$/.test(x))) {
    const s = fs.readFileSync(path.join('original', f), 'utf8');
    if (!s.includes('.H.useState(')) continue;
    const m = new Map();
    const re = /([\w$]+)=function\([^)]*\)\{return [\w$]+\.H\.(use\w+)\(/g;
    let x;
    while ((x = re.exec(s))) m.set(x[1], x[2]);
    const ce = /([\w$]+)=function\(\w,\w,\w\)\{var \w,\w=\{\},\w=null;if\(\w!=null\)for\(\w in \w\.key!==void 0/.exec(s);
    if (ce) m.set(ce[1], 'createElement');
    return { file: f, hooks: m };
  }
  return { file: null, hooks: new Map() };
}
export const COMPILER_RUNTIME = 'chunk-s89ma3n1.js';

// Atomic write: tmp file then rename (other members read analysis/names concurrently).
export function writeJsonlAtomic(file, rows) {
  const tmp = file + '.tmp-' + process.pid;
  const fd = fs.openSync(tmp, 'w');
  let buf = '';
  for (const r of rows) {
    buf += JSON.stringify(r) + '\n';
    if (buf.length > 1 << 20) { fs.writeSync(fd, buf); buf = ''; }
  }
  if (buf) fs.writeSync(fd, buf);
  fs.closeSync(fd);
  fs.renameSync(tmp, file);
}
