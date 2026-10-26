// Field-by-field comparison of the two sides of each scenario: A = the
// official client straight to the fake upstream, B = the same client through
// the stand-in core + Worker + patched CLI. Prints differences only.
// node compare.cjs <capture-root> [scenario...]
const fs = require('fs'), path = require('path');
const root = process.argv[2] || '/t/cap';
const only = process.argv.slice(3);

const load = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => /^req-\d+\.json$/.test(f)).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : [];
// Always-different-per-run values: checked for shape only.
const RANDOM_HEADERS = new Set(['x-client-request-id', 'x-claude-code-session-id', 'x-claude-code-prompt-id',
  'x-claude-code-agent-id', 'x-claude-code-parent-agent-id', 'x-stainless-retry-count', 'x-claude-code-prev-tool-durations']);
const IGNORE_HEADERS = new Set(['content-length', 'host', 'connection', 'authorization', 'accept-encoding', 'x-api-key']);
const RANDOM_BODY = new Set(['previous_message_id', 'diagnostics']);

const j = JSON.stringify;
// Harness-induced and per-run noise: the two client homes must compare as one
// path, and agent ids / tool timings are random in each run.
const norm = v => {
  const walk = x => typeof x === 'string' ? x.split('/t/client-a').join('/t/client').split('/t/client-b').join('/t/client')
    .replace(/\ba[0-9a-f]{16}\b/g, 'aAGENTID').replace(/Agent=\d+/g, 'Agent=N')
    : Array.isArray(x) ? x.map(walk) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, y]) => [k, walk(y)])) : x;
  return walk(v);
};
const short = v => { if (v === undefined) return '(无)'; const s = typeof v === 'string' ? v : j(v); return s.length > 400 ? s.slice(0, 400) + `…(${s.length})` : s; };
// Payload line of a system block (the first line of a billing-header block).
const head = t => (typeof t === 'string' ? t.split('\n')[0] : '');

function classify(r) {
  const b = r.body || {}, msgs = b.messages || [], t = j(msgs);
  const isCC = j(b.system || '').includes('x-anthropic-billing-header') || /Claude Code/.test(j(b.system || ''));
  if (!b.messages) return { kind: 'non-message ' + r.url, isCC };
  const sub = /LEVEL2/.test(t) ? 'LEVEL2 子代理' : /LEVEL1/.test(t) ? 'LEVEL1 子代理' : null;
  const round = /tool_result/.test(t) ? '第2轮+' : '第1轮';
  return { kind: (sub ? sub : isCC ? '主线程' : '非 CC') + ' ' + round, isCC };
}

function compareSystem(a, b, out) {
  const A = Array.isArray(a) ? a : a === undefined ? [] : [{ type: 'text', text: a }];
  const B = Array.isArray(b) ? b : b === undefined ? [] : [{ type: 'text', text: b }];
  if (typeof a === 'string' || typeof b === 'string') out.push(`  system 形状: A=${typeof a} B=${typeof b}`);
  if (A.length !== B.length) out.push(`  system 块数 A=${A.length} B=${B.length}`);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const x = A[i], y = B[i];
    if (!x) { out.push(`  system[${i}] 只有 B: ${short(head(y?.text))} 区段键=${j(Object.keys(y || {}))}`); continue; }
    if (!y) { out.push(`  system[${i}] 只有 A: ${short(head(x.text))}`); continue; }
    if (j(Object.keys(x)) !== j(Object.keys(y))) out.push(`  system[${i}] 键序/键集 A=${j(Object.keys(x))} B=${j(Object.keys(y))}`);
    if (norm(x.text) !== norm(y.text)) {
      const la = (x.text || '').split('\n'), lb = (y.text || '').split('\n');
      let p = 0; while (p < la.length && la[p] === lb[p]) p++;
      out.push(`  system[${i}] 文字不同（A ${x.text?.length}B / B ${y.text?.length}B），首个不同行 #${p + 1}:\n      A: ${short(la[p])}\n      B: ${short(lb[p])}`);
      if (head(x.text) !== head(y.text)) out.push(`      首行 A: ${short(head(x.text))}\n      首行 B: ${short(head(y.text))}`);
    }
    if (j(x.cache_control) !== j(y.cache_control)) out.push(`  system[${i}] cache_control A=${j(x.cache_control)} B=${j(y.cache_control)}`);
    const extra = Object.keys({ ...x, ...y }).filter(k => k !== 'type' && k !== 'text' && k !== 'cache_control');
    for (const k of extra) if (j(x[k]) !== j(y[k])) out.push(`  system[${i}].${k} A=${short(x[k])} B=${short(y[k])}`);
  }
}

function compareBody(a, b, out) {
  const A = a || {}, B = b || {};
  const ka = Object.keys(A), kb = Object.keys(B);
  if (j(ka) !== j(kb)) {
    out.push(`  body 键 A(${ka.length})=${j(ka)}`);
    out.push(`  body 键 B(${kb.length})=${j(kb)}`);
  }
  for (const k of ka.filter(x => !kb.includes(x))) out.push(`  body.${k} 只有 A: ${short(A[k])}`);
  for (const k of kb.filter(x => !ka.includes(x))) out.push(`  body.${k} 只有 B: ${short(B[k])}`);
  for (const k of ka.filter(x => kb.includes(x))) {
    if (j(norm(A[k])) === j(norm(B[k]))) continue;
    if (k === 'system') { compareSystem(A[k], B[k], out); continue; }
    if (k === 'messages') {
      const ma = A[k], mb = B[k];
      if (ma.length !== mb.length) out.push(`  messages 条数 A=${ma.length} B=${mb.length}`);
      for (let i = 0; i < Math.max(ma.length, mb.length); i++) {
        if (j(norm(ma[i])) === j(norm(mb[i]))) continue;
        const ca = ma[i]?.content, cb = mb[i]?.content;
        if (typeof ca === 'string' || typeof cb === 'string') { out.push(`  messages[${i}] (${ma[i]?.role}) 形状 A=${typeof ca} B=${typeof cb}`); }
        const ba = Array.isArray(ca) ? ca : [], bb = Array.isArray(cb) ? cb : [];
        if (ba.length !== bb.length) out.push(`  messages[${i}] (${ma[i]?.role}) 块数 A=${ba.length} B=${bb.length}: A=${j(ba.map(x => x.type))} B=${j(bb.map(x => x.type))}`);
        for (let q = 0; q < Math.max(ba.length, bb.length); q++) {
          const x = ba[q], y = bb[q];
          if (j(norm(x)) === j(norm(y))) continue;
          if (!x || !y) { out.push(`  messages[${i}].content[${q}] 只有 ${x ? 'A' : 'B'}: ${short(x || y)}`); continue; }
          if (j(Object.keys(x)) !== j(Object.keys(y))) out.push(`  messages[${i}].content[${q}] (${x.type}) 键 A=${j(Object.keys(x))} B=${j(Object.keys(y))}`);
          for (const f of new Set([...Object.keys(x), ...Object.keys(y)])) {
            if (j(norm(x[f])) === j(norm(y[f]))) continue;
            out.push(`  messages[${i}].content[${q}] (${x.type}).${f}:\n      A: ${short(x[f])}\n      B: ${short(y[f])}`);
          }
        }
      }
      continue;
    }
    if (k === 'tools') {
      const na = A[k].map(t => t.name), nb = B[k].map(t => t.name);
      if (j(na) !== j(nb)) { out.push(`  tools 名单 A=${j(na)}\n           B=${j(nb)}`); continue; }
      A[k].forEach((t, i) => {
        const u = B[k][i];
        if (j(Object.keys(t)) !== j(Object.keys(u))) out.push(`  tools[${t.name}] 键 A=${j(Object.keys(t))} B=${j(Object.keys(u))}`);
        for (const f of new Set([...Object.keys(t), ...Object.keys(u)])) if (j(norm(t[f])) !== j(norm(u[f]))) out.push(`  tools[${t.name}].${f} A=${short(t[f])} B=${short(u[f])}`);
      });
      continue;
    }
    if (k === 'metadata') { out.push(`  metadata A=${short(A[k])}\n           B=${short(B[k])}`); continue; }
    if (RANDOM_BODY.has(k)) { out.push(`  body.${k}（每次随机，值 A=${short(A[k])} B=${short(B[k])}）`); continue; }
    out.push(`  body.${k} A=${short(A[k])} B=${short(B[k])}`);
  }
}

function headerPairs(raw) {
  const out = [];
  for (let i = 0; i + 1 < raw.length; i += 2) out.push([raw[i].toLowerCase(), raw[i + 1]]);
  return out;
}

function compareHeaders(a, b, out) {
  const A = headerPairs(a.rawHeaders || []), B = headerPairs(b.rawHeaders || []);
  const ma = new Map(A), mb = new Map(B);
  for (const [k, v] of ma) {
    if (IGNORE_HEADERS.has(k)) continue;
    if (!mb.has(k)) { out.push(`  头 ${k} 只有 A: ${short(v)}`); continue; }
    if (mb.get(k) === v) continue;
    if (RANDOM_HEADERS.has(k)) { out.push(`  头 ${k}（每次随机）A=${short(v)} B=${short(mb.get(k))}`); continue; }
    if (k === 'anthropic-beta') {
      const x = v.split(','), y = mb.get(k).split(',');
      out.push(`  头 anthropic-beta A=${j(x)}\n                  B=${j(y)}${j(x) !== j(y) && j([...x].sort()) === j([...y].sort()) ? '（仅顺序）' : ''}`);
      continue;
    }
    out.push(`  头 ${k} A=${short(v)} B=${short(mb.get(k))}`);
  }
  for (const [k, v] of mb) if (!IGNORE_HEADERS.has(k) && !ma.has(k)) out.push(`  头 ${k} 只有 B: ${short(v)}`);
  const orderA = A.filter(([k]) => !IGNORE_HEADERS.has(k)).map(([k]) => k);
  const orderB = B.filter(([k]) => !IGNORE_HEADERS.has(k)).map(([k]) => k);
  if (j(orderA) !== j(orderB)) out.push(`  头顺序 A=${j(orderA)}\n         B=${j(orderB)}`);
}

const dirs = fs.readdirSync(root).filter(d => fs.statSync(path.join(root, d)).isDirectory()).sort();
for (const name of dirs) {
  if (only.length && !only.includes(name)) continue;
  const A = load(path.join(root, name, 'a')), B = load(path.join(root, name, 'b'));
  console.log(`\n##### ${name}   A=${A.length} B=${B.length}`);
  const usedB = new Set();
  for (const a of A) {
    const k = classify(a).kind;
    const bi = B.findIndex((b, i) => !usedB.has(i) && classify(b).kind === k);
    if (bi < 0) { console.log(`\n-- ${k}: B 侧无对应请求（A url=${a.url}）`); continue; }
    usedB.add(bi);
    const b = B[bi];
    const out = [];
    if (a.url !== b.url) out.push(`  URL A=${a.url} B=${b.url}`);
    if (a.method !== b.method) out.push(`  方法 A=${a.method} B=${b.method}`);
    compareHeaders(a, b, out);
    compareBody(a.body, b.body, out);
    console.log(`\n-- ${k}: ${out.length ? out.length + ' 处差异' : '完全一致（除忽略项）'}`);
    for (const line of out) console.log(line);
  }
  for (const [i, b] of B.entries()) if (!usedB.has(i)) console.log(`\n-- B 侧多出: ${classify(b).kind} url=${b.url}`);
}
