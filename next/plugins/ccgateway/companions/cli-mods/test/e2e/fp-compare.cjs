// The third-party scenarios (thirdparty.sh) against the official first-party
// shape: for each tp-* scenario, the official client's first-party requests
// (A, straight to the fake upstream) and what reached the fake upstream from
// the same client in its third-party shape through the gateway (B), paired by
// kind in order. Values that differ in every run are normalized first (the
// session, prompt, agent and client request IDs, cch, the fake's request and
// message IDs, the credentials, the client home), after checking the
// relations Claude Code keeps between them; every difference left is listed,
// and the totals by difference say what the conversion does not reach.
//   node fp-compare.cjs <capture-root> [scenario...]
// Exit code 1 when an invariant fails.
const fs = require('fs'), path = require('path');
const root = process.argv[2] || '/t/cap';
const only = process.argv.slice(3);
const j = JSON.stringify;
const load = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => /^req-\d+\.json$/.test(f)).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))).filter(r => String(r.url).startsWith('/v1/messages')) : [];
const headers = r => { const out = []; for (let i = 0; i + 1 < (r.rawHeaders || []).length; i += 2) out.push([r.rawHeaders[i].toLowerCase(), r.rawHeaders[i + 1]]); return out; };
const header = (r, name) => headers(r).find(([k]) => k === name)?.[1];
const billing = r => { const s = r.body?.system; const t = Array.isArray(s) ? s[0]?.text : s; return typeof t === 'string' && t.startsWith('x-anthropic-billing-header:') ? t : ''; };
const field = (line, name) => new RegExp(`(?:^|[ :])${name}=([^;]+);`).exec(line)?.[1];
function kind(r) {
  const t = j(r.body?.messages ?? []);
  const sub = /LEVEL3/.test(t) ? 'LEVEL3' : /LEVEL2/.test(t) ? 'LEVEL2' : /LEVEL1/.test(t) ? 'LEVEL1' : 'main';
  return sub + (/tool_result/.test(t) ? ' 2+' : ' 1');
}

// The values every run makes anew; the relations among them are checked
// before they are masked.
const MASK_HEADERS = new Set(['x-client-request-id', 'x-claude-code-session-id', 'x-claude-code-prompt-id', 'x-claude-code-agent-id', 'x-claude-code-parent-agent-id', 'x-claude-code-prev-tool-durations', 'authorization', 'x-api-key']);
const IGNORE_HEADERS = new Set(['content-length', 'host', 'connection', 'accept-encoding']);
function normalize(value) {
  const walk = x => typeof x === 'string' ? x.split('/t/client-a').join('/t/client').split('/t/client-b').join('/t/client')
    .replace(/\bcch=[0-9a-f]{5};/g, 'cch=<cch>;')
    .replace(/\bcc_prompt_id=[0-9a-f-]{36};/g, 'cc_prompt_id=<prompt>;')
    .replace(/\breq_ccgaudit\d+\b/g, 'req_<n>').replace(/\bmsg_ccg_audit_\d+\b/g, 'msg_<n>')
    .replace(/\ba[0-9a-f]{16}\b/g, 'a<agent>').replace(/Agent=\d+/g, 'Agent=N').replace(/\b\d+ms\b/g, 'Nms').replace(/duration_ms: \d+/g, 'duration_ms: N')
    .replace(/"(device_id|session_id|account_uuid)":"[^"]*"/g, '"$1":"<id>"').replace(/\\"(device_id|session_id|account_uuid)\\":\\"[^\\"]*\\"/g, '\\"$1\\":\\"<id>\\"')
    : Array.isArray(x) ? x.map(walk) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, y]) => [k, walk(y)])) : x;
  return walk(value);
}

// diff lists the JSON paths where a and b differ (key order included).
function diff(a, b, at, out) {
  if (j(a) === j(b)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    if (!Array.isArray(a) && j(Object.keys(a)) !== j(Object.keys(b)) && j(Object.keys(a).sort()) === j(Object.keys(b).sort())) out.push(`${at} 键序 A=${j(Object.keys(a))} B=${j(Object.keys(b))}`);
    const keys = Array.isArray(a) ? [...Array(Math.max(a.length, b.length)).keys()] : [...new Set([...Object.keys(a), ...Object.keys(b)])];
    for (const k of keys) {
      const p = Array.isArray(a) ? `${at}[${k}]` : `${at}.${k}`;
      if (!(k in a)) out.push(`${p} 只有 B: ${short(b[k])}`);
      else if (!(k in b)) out.push(`${p} 只有 A: ${short(a[k])}`);
      else diff(a[k], b[k], p, out);
    }
    return;
  }
  out.push(`${at} A=${short(a)} B=${short(b)}`);
}
const short = v => { const s = typeof v === 'string' ? v : j(v); return s === undefined ? '(无)' : s.length > 240 ? s.slice(0, 240) + `…(${s.length})` : s; };

// diagnosticsFollow checks a side's diagnostics as Claude Code writes them
// (2026-11-03 live test: v45 wrote none on continuations): a thread's request
// with an answer in its messages names the thread's previous answer (the
// fake's message ID for that request), its first request null. Compaction
// requests are left out (CC sends them off the main thread's transcript).
function diagnosticsFollow(side, rows, label) {
  const last = new Map();
  for (const r of rows) {
    const thread = header(r, 'x-claude-code-agent-id') || 'main';
    const compaction = header(r, 'x-claude-code-request-class') === 'compaction';
    const answered = (r.body?.messages ?? []).some(m => m.role === 'assistant');
    if (!compaction) {
      const expected = answered ? last.get(thread) ?? '(unknown)' : null;
      const actual = r.body?.diagnostics?.previous_message_id;
      check(actual === expected, `${label} ${side} ${kind(r)}: diagnostics.previous_message_id ${j(actual)}, expected ${j(expected)}`);
    }
    last.set(thread, 'msg_ccg_audit_' + r.index);
  }
}

let failures = 0;
const check = (ok, what) => { if (!ok) { failures++; console.log(`  FAIL ${what}`); } };
const totals = new Map();
const dirs = fs.readdirSync(root).filter(d => d.startsWith('tp-') && fs.statSync(path.join(root, d)).isDirectory()).sort();
for (const name of dirs) {
  if (only.length && !only.includes(name)) continue;
  const A = load(path.join(root, name, 'a')), B = load(path.join(root, name, 'b'));
  console.log(`\n##### ${name}   A=${A.length} B=${B.length}`);
  const converted = !/-off$|-direct$/.test(name);
  // Invariants of the B side, as Claude Code keeps them in its first-party shape.
  if (converted) {
    for (const r of B) {
      const line = billing(r), sub = field(line, 'cc_is_subagent') === 'true';
      check(field(line, 'cch') === '00000', `${name} ${kind(r)}: cch placeholder`);
      check(header(r, 'x-claude-code-prompt-id') === field(line, 'cc_prompt_id'), `${name} ${kind(r)}: prompt-id header = cc_prompt_id`);
      // CC's compaction request names no prompt and no turn.
      const compaction = header(r, 'x-claude-code-request-class') === 'compaction';
      check((field(line, 'cc_prompt_id') !== undefined) !== compaction, `${name} ${kind(r)}: cc_prompt_id`);
      if (!sub) check((field(line, 'cc_turn_origin') !== undefined) !== compaction, `${name} ${kind(r)}: turn fields`);
      if (sub) check(header(r, 'x-claude-code-agent-type') !== 'custom', `${name} ${kind(r)}: agent type not custom`);
      check(r.body?.diagnostics !== undefined, `${name} ${kind(r)}: diagnostics`);
    }
    // One prompt ID per prompt: a turn's requests and its subagents share it.
    const prompts = (side) => side.map(r => field(billing(r), 'cc_prompt_id'));
    const shape = ids => ids.map(id => ids.indexOf(id));
    check(j(shape(prompts(A))) === j(shape(prompts(B))), `${name}: prompt IDs shared as A shares them ${j(shape(prompts(A)))} vs ${j(shape(prompts(B)))}`);
    // The rule holds for the official client (A, the reference) and for B.
    diagnosticsFollow('A', A, name);
    diagnosticsFollow('B', B, name);
  } else {
    for (const r of B) check(field(billing(r), 'cch') === undefined, `${name} ${kind(r)}: not converted`);
  }
  const used = new Set();
  for (const a of A) {
    const bi = B.findIndex((b, i) => !used.has(i) && kind(b) === kind(a));
    if (bi < 0) { console.log(`-- ${kind(a)}: B 侧无对应请求`); totals.set('B 侧缺请求', (totals.get('B 侧缺请求') ?? 0) + 1); continue; }
    used.add(bi);
    const b = B[bi], out = [];
    // A subagent names the agent type the official client names.
    if (converted && header(a, 'x-claude-code-agent-type') !== undefined) check(header(b, 'x-claude-code-agent-type') === header(a, 'x-claude-code-agent-type'), `${name} ${kind(a)}: agent type ${j(header(b, 'x-claude-code-agent-type'))}, official ${j(header(a, 'x-claude-code-agent-type'))}`);
    if (a.url !== b.url) out.push(`URL A=${a.url} B=${b.url}`);
    const ha = headers(a).filter(([k]) => !IGNORE_HEADERS.has(k)), hb = headers(b).filter(([k]) => !IGNORE_HEADERS.has(k));
    const na = ha.map(([k]) => k), nb = hb.map(([k]) => k), ma = new Map(ha), mb = new Map(hb);
    for (const k of na.filter(k => !nb.includes(k))) out.push(`头 ${k} 只有 A = ${short(ma.get(k))}`);
    for (const k of nb.filter(k => !na.includes(k))) out.push(`头 ${k} 只有 B = ${short(mb.get(k))}`);
    const both = list => list.filter(k => na.includes(k) && nb.includes(k));
    if (j(both(na)) !== j(both(nb))) out.push(`头顺序 A=${j(both(na))} B=${j(both(nb))}`);
    for (const [k, v] of ma) {
      if (!mb.has(k) || MASK_HEADERS.has(k) || mb.get(k) === v) continue;
      if (k === 'anthropic-beta') {
        const x = v.split(','), y = mb.get(k).split(',');
        for (const beta of x.filter(beta => !y.includes(beta))) out.push(`beta ${beta} 只有 A`);
        for (const beta of y.filter(beta => !x.includes(beta))) out.push(`beta ${beta} 只有 B`);
        const order = list => list.filter(beta => x.includes(beta) && y.includes(beta));
        if (j(order(x)) !== j(order(y))) out.push(`beta 顺序 A=${j(x)} B=${j(y)}`);
        continue;
      }
      out.push(`头 ${k} A=${short(v)} B=${short(mb.get(k))}`);
    }
    diff(normalize(a.body), normalize(b.body), 'body', out);
    console.log(`-- ${kind(a)}: ${out.length ? out.length + ' 处差异' : '一致（规范化后）'}`);
    for (const line of out) {
      console.log('  ' + line);
      const key = (/ 只有 [AB]( = |$)/.test(line) && !line.startsWith('body') ? line.replace(/ = [\s\S]*$/, '') : line.replace(/ A=[\s\S]*$| B=[\s\S]*$|: [\s\S]*$/, '')).replace(/\[\d+\]/g, '[]');
      totals.set(key, (totals.get(key) ?? 0) + 1);
    }
  }
  for (const [i, b] of B.entries()) if (!used.has(i)) console.log(`-- B 侧多出: ${kind(b)}`);
}
console.log('\n===== 差异汇总（按位置，次数）');
for (const [key, count] of [...totals].sort((x, y) => y[1] - x[1])) console.log(`${String(count).padStart(4)}  ${key}`);
console.log(`\ninvariants: ${failures} failed`);
process.exitCode = failures ? 1 : 0;
