// Flags top-level names whose form contradicts the value they are bound to:
// the typical symptom of names shifted by one inside a multi-declarator
// `var a = 1, b = "x", c = /re/` (rounds 3 found whole groups off by one).
//   node --max-old-space-size=8000 tools/verify/name-shape.mjs [final=naming/final] [out=analysis/name-shape]
//
// A name "expects" a value kind from its suffix/prefix (POLL_INTERVAL_MS →
// number, FOO_RE → regex, fooSchema → call, isFoo → boolean/function,
// FOO_URL → string, fooSet → Set …); the bound initialiser has a kind
// (number, string, regex, boolean, call, new X, object, array, function …).
// Numbers quoted in the declaration's doc (naming/docs-*.jsonl) are also
// compared with a numeric initialiser.
// Output: <out>/flags.jsonl  one row per flagged binding
//         <out>/statements.jsonl  flagged var statements with every
//           declarator {key, min, name, source, init (source text)} and the doc
//         <out>/summary.json  counts per rule and per naming source file
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

const FINAL = process.argv[2] ?? 'naming/final';
const OUT = process.argv[3] ?? 'analysis/name-shape';
fs.mkdirSync(OUT, { recursive: true });
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

const top = JSON.parse(fs.readFileSync(path.join(FINAL, 'top.json'), 'utf8'));
const docs = new Map();
for (const f of fs.readdirSync('naming')) if (/^docs-.*\.jsonl$/.test(f)) for (const x of readJsonl(path.join('naming', f))) if (x.id && x.doc) docs.set(x.id, x.doc);
// which semantic file a name came from (for routing the review)
const origin = new Map();
for (const f of fs.readdirSync('naming').sort()) if (/^semantic-.*\.jsonl$/.test(f)) for (const x of readJsonl(path.join('naming', f))) if (x.key) origin.set(x.file + x.key, f);

const kindOf = (n) => {
  if (!n) return 'none';
  switch (n.type) {
    case 'NumericLiteral': return 'number';
    case 'UnaryExpression': return n.operator === '-' && n.argument.type === 'NumericLiteral' ? 'number' : n.operator === '!' ? 'boolean' : 'expr';
    case 'BinaryExpression': return /^[*+\-/%]$|^\*\*$|^<<$/.test(n.operator) && kindOf(n.left) === 'number' && kindOf(n.right) === 'number' ? 'number' : ['===', '!==', '==', '!=', '<', '>', '<=', '>=', 'in', 'instanceof'].includes(n.operator) ? 'boolean' : 'expr';
    case 'StringLiteral': case 'TemplateLiteral': return 'string';
    case 'RegExpLiteral': return 'regex';
    case 'BooleanLiteral': return 'boolean';
    case 'NullLiteral': return 'null';
    case 'ObjectExpression': return 'object';
    case 'ArrayExpression': return 'array';
    case 'ArrowFunctionExpression': case 'FunctionExpression': return 'function';
    case 'ClassExpression': return 'class';
    case 'NewExpression': return n.callee.type === 'Identifier' ? `new ${n.callee.name}` : 'new';
    case 'CallExpression': {
      const c = n.callee;
      if (c.type === 'MemberExpression' && c.object.type === 'Identifier' && c.object.name === 'Object' && c.property.name === 'freeze') return kindOf(n.arguments[0]);
      if (c.type === 'Identifier' && c.name === 'RegExp') return 'regex';
      if (c.type === 'Identifier' && c.name === 'Symbol') return 'symbol';
      return 'call';
    }
    default: return 'expr';
  }
};

// expectation rules: [name test, allowed kinds, rule id]
const NUM = ['number', 'expr', 'call'];
const RULES = [
  [/^[A-Z][A-Z0-9_]*_(MS|SEC|SECS|SECONDS|MINUTES|HOURS|DAYS|BYTES|KB|MB|GB|KIB|MIB|COUNT|LIMIT|SIZE|LEN|LENGTH|TOKENS|CHARS|LINES|ITEMS|ROWS|COLS|PCT|PERCENT|RATIO|TTL|TIMEOUT|DEPTH|WIDTH|HEIGHT|RETRIES|ATTEMPTS|THRESHOLD|INTERVAL|DELAY)$/, NUM, 'unit-number'],
  [/^(MAX|MIN|DEFAULT_MAX|DEFAULT_MIN)_[A-Z0-9_]+$/, [...NUM, 'null'], 'max-min-number'],
  [/^[a-z][A-Za-z0-9]*(Ms|Seconds|Bytes|Count|Limit|Timeout|Interval|Delay|Threshold)$/, [...NUM, 'function'], 'unit-number-camel'],
  [/(Schema|SCHEMA)$/, ['call', 'expr', 'function', 'object', 'new'], 'schema'],
  [/(_RE|_REGEX|_PATTERN|Regex|RegExp|Re|Pattern)$/, ['regex', 'call', 'expr', 'array', 'function'], 'regex'],
  [/(Set|_SET)$/, ['new Set', 'call', 'expr', 'function'], 'set'],
  [/(Map|_MAP)$/, ['new Map', 'new WeakMap', 'object', 'call', 'expr', 'function', 'new'], 'map'],
  [/^[A-Z][A-Z0-9_]*_(URL|URI|PATH|PREFIX|SUFFIX|NAME|KEY|ENV|HEADER|MESSAGE|TEXT|LABEL|TITLE|PROMPT|DIR|FILE|FILENAME|EXT|HOST|DOMAIN|ID|VAR|SLUG|TAG|EVENT|GLYPH|CHAR|SEPARATOR)$/, ['string', 'expr', 'call', 'function'], 'string'],
  [/^(is|has|should|can|was|needs|supports)[A-Z]/, ['function', 'boolean', 'call', 'expr', 'null', 'new'], 'predicate'],
  [/^(get|create|make|build|read|load|parse|format|render|resolve|compute|to|use|with|run|apply|handle|ensure|normalize)[A-Z]/, ['function', 'call', 'expr', 'null', 'object'], 'verb-function'],
  [/^[A-Z][a-z]+[A-Za-z0-9]*(Tool|Dialog|View|Screen|Panel|Error|Client|Manager|Store|Cache|Queue|Provider|Component)$/, ['function', 'class', 'call', 'expr', 'object', 'new'], 'pascal-entity'],
];

const flags = [];
const stmts = [];
const perRule = {};
const perOrigin = {};
const files = fs.readdirSync('original').filter((f) => /\.(js|mjs)$/.test(f) && !/\.min\.js$/.test(f));
for (const file of files) {
  const names = top[file];
  if (!names) continue;
  const src = fs.readFileSync(path.join('original', file), 'utf8');
  let ast;
  try { ast = parse(src, { sourceType: 'module' }); } catch { continue; }
  for (const n0 of ast.program.body) {
    const n = n0.type === 'ExportNamedDeclaration' ? n0.declaration : n0;
    if (n?.type !== 'VariableDeclaration') continue;
    const decls = n.declarations.filter((d) => d.id.type === 'Identifier');
    const rows = decls.map((d) => {
      const rec = names['@' + d.id.start];
      return { key: '@' + d.id.start, min: d.id.name, name: rec?.name ?? d.id.name, source: rec?.source ?? 'minified', init: d.init ? src.slice(d.init.start, Math.min(d.init.end, d.init.start + 160)) : null, kind: kindOf(d.init), declId: rec?.declId };
    });
    let flagged = false;
    for (const r of rows) {
      if (r.source === 'minified' || r.source === 'facade' || r.source === 'vendor') continue;
      const why = [];
      for (const [re, allowed, id] of RULES) if (re.test(r.name) && !allowed.includes(r.kind) && !(r.kind.startsWith('new') && allowed.includes('new'))) why.push(id);
      const doc = r.declId ? docs.get(r.declId) : null;
      if (r.kind === 'number' && doc && rows.length > 1) {
        const v = Number(eval(r.init.replace(/_/g, ''))); // numeric literal or literal arithmetic only
        const quoted = [...doc.matchAll(/(?<![\w.])(\d+(?:\.\d+)?)(?![\w.])/g)].map((m) => +m[1]);
        const unitsOk = (q) => [1, 1000, 60000, 3600000, 1024, 1048576].some((u) => Math.abs(q * u - v) < 1e-9 || Math.abs(v * u - q) < 1e-9);
        if (quoted.length && !quoted.some(unitsOk)) why.push('doc-number');
      }
      if (!why.length) continue;
      flagged = true;
      const o = origin.get(file + r.key) ?? `(${r.source})`;
      for (const w of why) perRule[w] = (perRule[w] ?? 0) + 1;
      perOrigin[o] = (perOrigin[o] ?? 0) + 1;
      flags.push({ file, key: r.key, min: r.min, name: r.name, kind: r.kind, init: r.init, rules: why, origin: o, stmt: n.start });
    }
    if (flagged) stmts.push({ file, start: n.start, declarators: rows.map(({ declId, ...x }) => ({ ...x, doc: declId ? docs.get(declId) : undefined, origin: origin.get(file + x.key) })) });
  }
}
fs.writeFileSync(path.join(OUT, 'flags.jsonl'), flags.map((x) => JSON.stringify(x)).join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'statements.jsonl'), stmts.map((x) => JSON.stringify(x)).join('\n') + '\n');
const summary = { flagged: flags.length, statements: stmts.length, multiDeclaratorStatements: stmts.filter((s) => s.declarators.length > 1).length, perRule, perOrigin: Object.fromEntries(Object.entries(perOrigin).sort((a, b) => b[1] - a[1])) };
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
