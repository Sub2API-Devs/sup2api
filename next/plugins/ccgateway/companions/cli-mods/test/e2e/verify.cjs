// Targeted r2 checks that the A/B diff cannot show on its own: request line,
// gateway-header leakage, prompt/session invariants, byte-preserved client tool
// definitions, identity lines, beta order, credit receipts and the client-visible
// whitelist of an upstream error. Prints one line per assertion.
// node verify.cjs <capture-root> [case...]
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = process.argv[2] || '/t/cap';
const only = process.argv.slice(3);
const j = JSON.stringify;
const cases = fs.readdirSync(root).filter(d => fs.statSync(path.join(root, d)).isDirectory()).sort().filter(c => !only.length || only.includes(c));
const loadReq = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => /^req-\d+\.json$/.test(f)).sort().map(f => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : [];
const loadIn = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => /^in-\d+\.json$/.test(f)).sort().map(f => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : [];
const pairs = raw => { const m = {}; for (let i = 0; i + 1 < raw.length; i += 2) { const k = raw[i].toLowerCase(); (m[k] ??= []).push(raw[i + 1]); } return m; };
const billLine = r => { const s = r.body?.system; const first = Array.isArray(s) ? s[0]?.text : s; return typeof first === 'string' && first.startsWith('x-anthropic-billing-header:') ? first.split('\n')[0] : ''; };
const field = (line, name) => line.match(new RegExp('(?:^|[ ;])' + name + '=([^;]*)'))?.[1];
const uid = r => { try { return JSON.parse(JSON.parse(r.body.metadata.user_id)); } catch { try { return JSON.parse(r.body.metadata?.user_id ?? '{}'); } catch { return {}; } } };
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
// Core response whitelist (contracts/httpfacts/headers.go).
const KEEP = n => n === 'request-id' || n === 'anthropic-request-id' || n === 'retry-after' || n === 'x-should-retry' || n.startsWith('anthropic-ratelimit-') || n.startsWith('anthropic-fast-');
const CLI_AGENT_HEADERS = ['x-claude-code-request-class', 'x-claude-code-agent-id', 'x-claude-code-parent-agent-id', 'x-claude-code-agent-type', 'x-claude-code-prompt-id', 'x-claude-code-session-id'];
let fails = 0, checks = 0;
const ok = (cond, msg, detail) => { checks++; if (!cond) { fails++; console.log('FAIL ' + msg + (detail ? ' — ' + detail : '')); } else console.log('ok   ' + msg); };

for (const name of cases) {
  const A = loadReq(path.join(root, name, 'a')), B = loadReq(path.join(root, name, 'b')), IN = loadIn(path.join(root, name, 'in'));
  // 1. Request line: both sides are the beta Messages endpoint.
  for (const [side, list] of [['A', A], ['B', B]]) for (const r of list) {
    if (!String(r.url).startsWith('/v1/messages')) continue;
    ok(String(r.url).startsWith('/v1/messages?beta=true'), `${name} ${side} 请求行带 ?beta=true`, r.url);
  }
  // 2. Gateway headers never reach the upstream.
  for (const r of B) {
    const h = pairs(r.rawHeaders);
    const leaked = Object.keys(h).filter(k => k.startsWith('x-ccgateway') || k === 'x-request-id' || k === 'x-stainless-helper');
    ok(leaked.length === 0, `${name} B 出口无网关头`, leaked.join(','));
  }
  // 3. Prompt id ↔ billing header, session ↔ metadata.
  for (const r of B) {
    if (!r.body || typeof r.body !== 'object' || !j(r.body.system ?? '').includes('x-anthropic-billing-header')) continue;
    const b = billLine(r), h = pairs(r.rawHeaders);
    const hp = h['x-claude-code-prompt-id']?.[0], bp = field(b, 'cc_prompt_id');
    if (bp !== undefined) ok(hp === bp, `${name} prompt-id 头 = 计费头 cc_prompt_id`, `${hp} vs ${bp}`);
    if (r.body.metadata) {
      const u = uid(r);
      if (u.session_id) ok(u.session_id === h['x-claude-code-session-id']?.[0], `${name} session 头 = metadata`, `${h['x-claude-code-session-id']?.[0]} vs ${u.session_id}`);
    }
  }
  // 4. Client tool definitions: inbound bytes == outbound bytes (key order).
  if (IN.length && B.length) {
    const inbound = IN[0], outbound = B[0];
    let ib; try { ib = JSON.parse(inbound.body); } catch { ib = {}; }
    const it = Array.isArray(ib.tools) ? ib.tools : [], ot = Array.isArray(outbound.body?.tools) ? outbound.body.tools : [];
    if (it.length) {
      const missing = it.filter(t => !ot.some(u => u.name === t.name)).map(t => t.name);
      ok(missing.length === 0, `${name} 客户端工具都在出口`, missing.join(','));
      for (const t of it) {
        const u = ot.find(x => x.name === t.name);
        if (!u) continue;
        ok(j(u) === j(t), `${name} 工具 ${t.name} 逐字节保留（键序/字段）`, j(u) === j(t) ? '' : `in=${j(t).slice(0, 200)} out=${j(u).slice(0, 200)}`);
        const extra = Object.keys(u).filter(k => !(k in t));
        ok(extra.length === 0, `${name} 工具 ${t.name} 无新增字段`, extra.join(','));
      }
      const strictIn = it.some(t => 'strict' in t), strictOut = ot.some(t => 'strict' in t);
      ok(strictIn === strictOut, `${name} strict 字段未被添加/删除`, `in=${strictIn} out=${strictOut}`);
    }
  }
  // 5. Identity line.
  const sysTexts = r => {
    let b = r?.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
    const sys = b?.system;
    return (Array.isArray(sys) ? sys : typeof sys === 'string' ? [{ text: sys }] : []).map(x => x.text ?? '');
  };
  const isIdentity = t => /^You are (a Claude agent|Claude Code)/.test(t);
  if (name === 'main-build-low') {
    const lineOf = r => sysTexts(r).find(isIdentity);
    if (A[0] && B[0]) {
      const la = lineOf(A[0]), lb = lineOf(B[0]);
      ok(la !== undefined && la === lb, 'OAuth 身份行与官方逐字相同', `${j(la)} vs ${j(lb)}`);
    }
  }
  if (name === 'apikey-account-client') {
    // The logged-in client carries its own identity line; the gateway must
    // neither add nor move one (r2 FAIL-1 was this assertion, not a defect).
    if (!IN.length) ok(false, `${name} 有入站抓包`);
    else {
      const inL = sysTexts(IN[0]), outL = sysTexts(B[0]);
      ok(outL.filter(isIdentity).length === inL.filter(isIdentity).length, `${name} 身份行条数与入站一致（不新增）`, `${inL.filter(isIdentity).length} -> ${outL.filter(isIdentity).length}`);
      ok(j(outL.map(isIdentity)) === j(inL.map(isIdentity)), `${name} 身份行位置与入站一致`, `${j(inL.map(isIdentity))} vs ${j(outL.map(isIdentity))}`);
    }
  }
  if (name === 'apikey-account-noncc-high') {
    const texts = sysTexts(B[0]);
    ok(!texts.some(isIdentity), `${name} API-key 账号的非 CC 请求不补身份行`, texts.map(t => t.split('\n')[0]).join(' | ').slice(0, 160));
  }
  if (name.startsWith('plain-build-')) {
    // The line follows the injection level (r2 FAIL-3): micro/low append no
    // system prompt -> agent_sdk; high appends the client's system -> the
    // native non-interactive, appended-prompt line (official_cli_sdk).
    const texts = sysTexts(B[0]);
    const agent = texts.find(t => /^You are a Claude agent, built on Anthropic's Claude Agent SDK\.$/.test(t));
    const official = texts.find(t => /^You are Claude Code, Anthropic's official CLI for Claude/.test(t));
    if (name === 'plain-build-high') {
      ok(official !== undefined, `${name} 非 CC high 身份行为 official_cli_sdk（追加提示词时原生选择）`, texts.map(t => t.split('\n')[0]).join(' | ').slice(0, 200));
      ok(agent === undefined, `${name} 不同时补 agent_sdk 行`, j(agent));
    } else {
      ok(agent !== undefined, `${name} 非 CC 兜底身份行为 agent_sdk`, texts.map(t => t.split('\n')[0]).join(' | ').slice(0, 200));
    }
  }
  // 6. Beta list for the API-key shaped client through the OAuth account.
  // The reference is the inbound request: a first-party-only beta the client
  // never sent is not a gateway omission (r2 FAIL-2 was this assertion).
  if (name.startsWith('apikey-shape')) {
    const ba = pairs(A[0]?.rawHeaders ?? [])['anthropic-beta']?.[0] ?? '';
    const bb = pairs(B[0]?.rawHeaders ?? [])['anthropic-beta']?.[0] ?? '';
    const bi = pairs(IN[0]?.rawHeaders ?? [])['anthropic-beta']?.[0] ?? '';
    const la = ba ? ba.split(',') : [], lb = bb ? bb.split(',') : [], li = bi ? bi.split(',') : [];
    const added = lb.filter(x => !li.includes(x)), missing = li.filter(x => !lb.includes(x));
    ok(missing.length === 0, `${name} 客户端发的 beta 全在出口`, missing.join(','));
    const firstPartyOnly = la.filter(x => !li.includes(x));
    if (firstPartyOnly.length) console.log(`     ${name} A 独有、客户端没发（首方路径）: ${j(firstPartyOnly)}`);
    ok(j(lb.filter(x => la.includes(x))) === j(la.filter(x => lb.includes(x))), `${name} 客户端自带的 beta 顺序不变`, `${j(la)} -> ${j(lb)}`);
    console.log(`     ${name} betas in=${j(li)} A=${j(la)} B=${j(lb)} added=${j(added)}`);
  }
  // 7. Credit receipts (curl header dump cases).
  if (name.startsWith('credit-') && fs.existsSync(path.join(root, name, 'b.hdr'))) {
    const hdrFile = path.join(root, name, 'b.hdr');
    if (!fs.existsSync(hdrFile)) { ok(false, `${name} 有响应头`); continue; }
    const hdr = {};
    for (const line of fs.readFileSync(hdrFile, 'utf8').replace(/\r/g, '').split('\n')) { const i = line.indexOf(':'); if (i > 0) hdr[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim(); }
    const status = fs.readFileSync(hdrFile, 'utf8').split('\n')[0];
    const tracked = !hdr['x-ccgateway-fallback-credit-track'] && ['fallback-credit-2026-06-01', 'fallback-credit-2026-07-01', 'server-side-fallback-2026-07-01'].some(b => name.includes(b) || true);
    ok(/ 200/.test(status), `${name} 200`, status);
    const isSsf0601 = name.includes('ssf-0601');
    if (isSsf0601) {
      ok(!hdr['x-ccgateway-resource-principal'], `${name} 不进入 credit 路径（无 identity 头）`, j(Object.keys(hdr).filter(k => k.startsWith('x-ccgateway'))));
    } else {
      ok(!!hdr['x-ccgateway-resource-principal'] && !!hdr['x-ccgateway-resource-generation'], `${name} 回执：resource identity 头`, j([hdr['x-ccgateway-resource-principal'], hdr['x-ccgateway-resource-generation']]));
    }
    const respFiles = fs.existsSync(path.join(root, name, 'b')) ? fs.readdirSync(path.join(root, name, 'b')).filter(f => /^resp-\d+\.json$/.test(f)) : [];
    if (respFiles.length) {
      const resp = JSON.parse(fs.readFileSync(path.join(root, name, 'b', respFiles[0]), 'utf8'));
      const token = resp?.stop_details?.fallback_credit_token;
      // 0.1.91: the receipt follows the last byte as a trailer; the header
      // position is still accepted so both generations compare.
      let ready = hdr['x-ccgateway-fallback-credit-ready'];
      const proxyResp = path.join(root, name, 'in');
      if (fs.existsSync(proxyResp)) {
        const rf = fs.readdirSync(proxyResp).filter(f => /^resp-\d+\.json$/.test(f)).sort();
        if (rf.length) {
          const rec = JSON.parse(fs.readFileSync(path.join(proxyResp, rf[rf.length - 1]), 'utf8'));
          const t = Object.entries(rec.trailers || {}).find(([k]) => k === 'x-ccgateway-fallback-credit-ready');
          if (t) ready = t[1];
        }
      }
      ok(token && ready === sha(token), `${name} Ready = sha256(发放的 token)（头或 trailer）`, `token=${token} ready=${ready} expected=${token ? sha(token) : '-'}`);
    } else {
      ok(!hdr['x-ccgateway-fallback-credit-ready'], `${name} 未发放 credit 时不带 Ready`, j(hdr['x-ccgateway-fallback-credit-ready']));
    }
    ok(!('x-ccgateway-error-source' in hdr), `${name} 无 Worker 错误源头（未走错误路径）`, hdr['x-ccgateway-error-source']);
  }
  // 8. Upstream error: what the core whitelist would let through.
  if (name.startsWith('err400-')) {
    const f = path.join(root, name, 'client.hdr');
    if (!fs.existsSync(f)) { ok(false, `${name} 有客户端响应头`); continue; }
    const lines = fs.readFileSync(f, 'utf8').replace(/\r/g, '').split('\n').filter(Boolean);
    const status = lines[0];
    const kept = lines.slice(1).map(l => l.slice(0, l.indexOf(':'))).map(n => n.toLowerCase()).filter(KEEP);
    const dropped = lines.slice(1).map(l => l.slice(0, l.indexOf(':'))).map(n => n.toLowerCase()).filter(n => !KEEP(n) && n !== 'content-type');
    console.log(`     ${name} ${status} | 客户端可见（白名单内）: ${kept.join(',')} | 被核心白名单挡掉: ${dropped.join(',')}`);
    ok(/ 400/.test(status), `${name} 状态 400 透传`, status);
    ok(dropped.includes('x-ccgateway-error-source'), `${name} Worker 错误源头会被核心挡掉`, dropped.join(','));
    const body = fs.readFileSync(path.join(root, name, 'client.body'), 'utf8');
    ok(body.includes('probe error <>&'), `${name} 正文原样`, body.slice(0, 120));
  }
}
// ---- r3 round-2 checks: a second pass, each case with its own captures.
for (const name of cases) {
const A = loadReq(path.join(root, name, 'a')), B = loadReq(path.join(root, name, 'b')), IN = loadIn(path.join(root, name, 'in'));
// 9. Non-CC identity without metadata.user_id (CLI v27, plugin 0.1.92).
if (name === 'noncc-identity') {
  const order = ['turn1', 'turn2', 'other', 'nullid', 'client', 'direct'];
  const R = i => B[i];
  ok(B.length === 6, `${name} 六次投递都到了上游`, `B=${B.length}`);
  const hdrOf = r => pairs(r?.rawHeaders ?? []);
  const sess = i => uid(R(i) || {}).session_id;
  const headerSession = i => hdrOf(R(i))['x-claude-code-session-id']?.[0];
  const u1 = uid(R(0) || {});
  ok(/^[0-9a-f]{64}$/.test(u1.device_id ?? '') && u1.account_uuid === '00000000-0000-4000-8000-000000000001', `${name} turn1 补账号身份（device 64hex + 账号 UUID）`, j(u1));
  ok(typeof R(0)?.body?.metadata?.user_id === 'string', `${name} metadata.user_id 用 CC 的 JSON 字符串载体`, typeof R(0)?.body?.metadata?.user_id);
  ok(!!sess(0) && sess(0) === headerSession(0), `${name} turn1 session = 传输 session 头`, `${sess(0)} vs ${headerSession(0)}`);
  ok(sess(1) === sess(0) && headerSession(1) === sess(0), `${name} turn2 沿用 turn1 的会话`, `turn1=${sess(0)} turn2=${sess(1)} hdr=${headerSession(1)}`);
  ok(!!sess(2) && sess(2) !== sess(0), `${name} 另一个对话的会话不同`, `${sess(0)} vs ${sess(2)}`);
  ok(!!sess(3) && sess(3) === headerSession(3), `${name} user_id:null 也补身份`, j(uid(R(3) || {})));
  const u5 = uid(R(5) || {}), u4 = uid(R(4) || {});
  ok(u4.device_id !== 'client-device' && sess(4) !== '3f2a1b0c-4d5e-4f70-8192-a3b4c5d6e7f8', `${name} 客户端自带身份仍按账号映射`, j(u4));
  ok(R(5)?.body?.metadata === undefined, `${name} direct 不加 metadata`, j(R(5)?.body?.metadata));
  ok(Object.keys(R(0)?.body || {}).indexOf('metadata') < Object.keys(R(0)?.body || {}).indexOf('max_tokens'), `${name} metadata 位置与 CC 一致（max_tokens 之前）`, j(Object.keys(R(0)?.body || {})));
}

// 9b. Session continuity (CLI v38 build_session_state_v1). Claude Code's own
// second turn names the first request (cc_prev_req = the upstream's
// request-id) and counts turn 2; a CC client through the gateway gets the
// upstream's request-id back, so its own header does the same. A non-CC
// conversation whose header the gateway writes follows the same rules from
// the Worker's memory: cc_prev_req for a request continuing the answered one
// (its next message is that answer, and no later assistant message), and
// nothing for a shortened history, whose turn counts from its own messages.
const fieldNames = line => line.replace(/^x-anthropic-billing-header:/, '').split(';').map(part => part.trim().split('=')[0]).filter(Boolean);
if (name === 'turn2-build-low') {
  for (const [side, list] of [['A', A], ['B', B]]) {
    const second = billLine(list[1] || {});
    ok(field(second, 'cc_prev_req') === 'req_ccgaudit1' && field(second, 'cc_turn_index') === '2', `${name} ${side} 第二轮 cc_prev_req=第一轮上游 request-id、cc_turn_index=2`, second);
    ok(field(billLine(list[0] || {}), 'cc_prev_req') === undefined, `${name} ${side} 第一轮不带 cc_prev_req`, billLine(list[0] || {}));
  }
}
if (name === 'noncc-session') {
  const labels = ['first', 'second', 'shortened', 'tool-result', 'other-session', 'direct-first', 'direct-second', 'derived-first', 'derived-second'];
  ok(B.length === labels.length, `${name} ${labels.length} 次投递都到了上游`, `B=${B.length}`);
  const expect = [[undefined, '1'], ['req_ccgaudit1', '2'], [undefined, '1'], ['req_ccgaudit3', '1'], [undefined, '1'], [undefined, '1'], ['req_ccgaudit6', '2'], [undefined, '1'], [undefined, '2']];
  expect.forEach(([prev, turnIndex], i) => {
    const line = billLine(B[i] || {});
    ok(field(line, 'cc_prev_req') === prev && field(line, 'cc_turn_index') === turnIndex && field(line, 'cc_prompt_index') === '0' && field(line, 'cc_turn_origin') === 'sdk',
      `${name} ${labels[i]} cc_prev_req=${prev ?? '无'}、cc_turn_index=${turnIndex}`, line);
  });
  // The fields go in Claude Code's own order (the native header writes them).
  const official = ['cc_version', 'cc_entrypoint', 'cch', 'cc_prev_req', 'cc_prompt_id', 'cc_turn_origin', 'cc_prompt_index', 'cc_turn_index'];
  for (const i of [1, 3, 6]) {
    const names = fieldNames(billLine(B[i] || {}));
    ok(names.every((n, k) => official.includes(n) && (k === 0 || official.indexOf(n) > official.indexOf(names[k - 1]))), `${name} ${labels[i]} 字段顺序与官方一致`, names.join(','));
  }
}

// 10. Non-CC forged CC context headers (CLI v28, plugin 0.1.93).
if (name === 'noncc-context') {
  const labels = ['plain', 'forged', 'compaction', 'plain-direct', 'forged-direct'];
  ok(B.length === 5, `${name} 五次投递都到了上游`, `B=${B.length}`);
  const mask = v => JSON.stringify(v)
    .replace(/cch=[0-9a-f]{5}/g, 'cch=<cch>')
    .replace(/cc_prompt_id=[0-9a-f-]{36}/g, 'cc_prompt_id=<id>')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/a[0-9a-f]{16}/g, '<agent>');
  const view = r => {
    const h = pairs(r?.rawHeaders ?? []);
    const headers = Object.keys(h).filter(k => !['content-length', 'host', 'x-client-request-id'].includes(k)).map(k => k + ': ' + mask(h[k].join(',')));
    return headers.join('\n') + '\n--\n' + mask(r?.body ?? {});
  };
  const forbidden = r => {
    const h = pairs(r?.rawHeaders ?? []);
    return ['x-claude-code-agent-id', 'x-claude-code-parent-agent-id', 'x-claude-code-agent-type', 'x-cc-compaction-request', 'x-claude-code-compaction', 'x-cc-context-compacted', 'x-claude-code-context-compacted', 'x-claude-code-prev-tool-durations'].filter(k => h[k]);
  };
  for (const i of [1, 2]) {
    const f = forbidden(B[i]);
    ok(f.length === 0, `${name} ${labels[i]} 不带客户端的 CC 上下文头`, f.join(','));
    const bill = billLine(B[i]);
    ok(!/cc_is_subagent=true/.test(bill), `${name} ${labels[i]} 计费头不是子代理`, bill);
    ok(!/x-claude-code-request-class/.test(j(pairs(B[i]?.rawHeaders ?? {}))) || pairs(B[i]?.rawHeaders ?? {})['x-claude-code-request-class']?.[0] !== 'subagent', `${name} ${labels[i]} 出口 request-class 不是 subagent`, j(pairs(B[i]?.rawHeaders ?? {})['x-claude-code-request-class']));
  }
  ok(view(B[1]) === view(B[0]), `${name} 伪造子代理头 = 不带头的请求（逐字节，掩码随机值后）`, view(B[1]) === view(B[0]) ? '' : 'differ');
  ok(view(B[2]) === view(B[0]), `${name} 伪造压缩头 = 不带头的请求（逐字节，掩码随机值后）`, view(B[2]) === view(B[0]) ? '' : 'differ');
  ok(view(B[4]) === view(B[3]), `${name} direct 伪造头 = direct 不带头`, view(B[4]) === view(B[3]) ? '' : 'differ');
}

// 11. Nested subagents (1..3 levels), build and direct.
if (/^sub[123]-(build|direct)-/.test(name)) {
  const level = Number(name[3]);
  const h = r => pairs(r?.rawHeaders ?? {});
  const cls = r => h(r)['x-claude-code-request-class']?.[0];
  const aid = r => h(r)['x-claude-code-agent-id']?.[0];
  const pid = r => h(r)['x-claude-code-parent-agent-id']?.[0];
  const subs = B.filter(r => cls(r) === 'subagent');
  ok(subs.length > 0, `${name} 出口有子代理请求`, `B=${B.length}`);
  const depth = new Map();
  for (const r of B) {
    if (!aid(r)) continue;
    if (pid(r)) { ok(depth.has(pid(r)) || subs.indexOf(r) === 0, `${name} parent 指向上层已出现的 agent-id`, `${pid(r)} <- ${aid(r)}`); depth.set(aid(r), (depth.get(pid(r)) ?? 0) + 1); }
    else depth.set(aid(r), 1);
  }
  const max = Math.max(0, ...depth.values());
  ok(max === level, `${name} 子代理嵌套到第 ${level} 层`, `depth=${max}`);
  // Inbound vs outbound context headers, request by request.
  if (IN.length === B.length) {
    for (let i = 0; i < B.length; i++) {
      for (const k of ['x-claude-code-request-class', 'x-claude-code-agent-id', 'x-claude-code-parent-agent-id', 'x-claude-code-agent-type']) {
        const a = pairs(IN[i].rawHeaders)[k]?.[0], b = h(B[i])[k]?.[0];
        if (a !== undefined) ok(a === b, `${name} #${i + 1} ${k} 出口 = 客户端原值`, `${a} vs ${b}`);
      }
    }
    ok(IN.length === B.length, `${name} 入站/出口请求数一致`, `${IN.length} vs ${B.length}`);
  }
  for (const r of subs) {
    const bill = billLine(r);
    ok(/cc_is_subagent=true/.test(bill), `${name} 子代理计费头 cc_is_subagent=true`, bill);
    ok(!/extended-cache-ttl-2025-04-11/.test(h(r)['anthropic-beta']?.[0] ?? ''), `${name} 子代理不带 extended-cache-ttl`, h(r)['anthropic-beta']?.[0]);
  }
}

// 12. Fallback-credit streaming: receipt in the trailer, first byte first.
if (name === 'credit-stream-trailer-build' || name === 'credit-json-trailer-build') {
  const dir = path.join(root, name);
  const inDir = path.join(dir, 'in'), bDir = path.join(dir, 'b');
  const rf = f => fs.existsSync(f);
  const respFile = fs.existsSync(inDir) ? fs.readdirSync(inDir).filter(f => /^resp-\d+\.json$/.test(f)).sort()[0] : null;
  ok(!!respFile, `${name} 代理记录了 Worker 的应答`);
  const rec = respFile ? JSON.parse(fs.readFileSync(path.join(inDir, respFile), 'utf8')) : {};
  ok(rec.tracked === true, `${name} 请求被跟踪（credit 路径）`, j(rec.tracked));
  ok(!!(rec.headers || {})['x-ccgateway-resource-principal'] && !!(rec.headers || {})['x-ccgateway-resource-generation'], `${name} 应答仍有 resource identity 头`, j([(rec.headers || {})['x-ccgateway-resource-principal'], (rec.headers || {})['x-ccgateway-resource-generation']]));
  const respFiles = fs.existsSync(bDir) ? fs.readdirSync(bDir).filter(f => /^resp-\d+\.json$/.test(f)).sort() : [];
  const token = respFiles.length ? JSON.parse(fs.readFileSync(path.join(bDir, respFiles[respFiles.length - 1]), 'utf8'))?.stop_details?.fallback_credit_token : undefined;
  const ready = Object.entries(rec.trailers || {}).find(([k]) => k === 'x-ccgateway-fallback-credit-ready')?.[1];
  ok(!!token && ready === sha(token), `${name} 回执在 trailer 里且 = sha256(token)`, `token=${token} ready=${ready} trailers=${j(Object.keys(rec.trailers || {}))}`);
  ok(!(rec.headers || {})['x-ccgateway-fallback-credit-ready'], `${name} 回执不再出现在响应头`, j((rec.headers || {})['x-ccgateway-fallback-credit-ready']));
  const cl = fs.existsSync(path.join(dir, 'client.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'client.json'), 'utf8')) : null;
  if (cl) ok(Object.entries(cl.trailers || {}).some(([k, v]) => k === 'x-ccgateway-fallback-credit-ready' && v === sha(token)), `${name} 客户端也收到 trailer 回执`, j(cl.trailers));
  if (name === 'credit-stream-trailer-build') {
    const t = rec.timing || {};
    ok(t.firstByteMs >= 0 && t.endMs - t.firstByteMs >= 800, `${name} 首字节先于结束到达（未整段缓冲）`, `first=${t.firstByteMs}ms end=${t.endMs}ms chunks=${t.dataChunks}`);
    ok((t.dataChunks ?? 0) > 1, `${name} 应答分多块到达`, `chunks=${t.dataChunks}`);
    const emitFile = fs.existsSync(path.join(bDir, 'emit.jsonl')) ? fs.readFileSync(path.join(bDir, 'emit.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l)) : [];
    const start = emitFile.find(e => e.event === 'message_start'), delta = emitFile.find(e => e.event === 'message_delta');
    ok(start && delta && delta.ms - start.ms >= 1000, `${name} 假上游首事件与拒绝事件相隔约 1.5s`, `${start?.ms} -> ${delta?.ms}`);
  } else {
    ok(!rec.trailers || Object.keys(rec.trailers).length === 0 || !!ready, `${name} JSON 应答的回执位置已记录`, j({ trailers: Object.keys(rec.trailers || {}), readyHeader: (rec.headers || {})['x-ccgateway-fallback-credit-ready'] }));
  }
}

// 13. Identity edge inputs (static audit C3).
if (name === 'noncc-identity2') {
  const labels = ['empty-string', 'empty-object', 'unknown-only', 'collision-a', 'collision-b', 'later-turn'];
  const hdrOf = r => pairs(r?.rawHeaders ?? {});
  const sess = i => uid(B[i] || {}).session_id;
  const headerSession = i => hdrOf(B[i])['x-claude-code-session-id']?.[0];
  ok(B.length === 6, `${name} 六次投递都到了上游`, `B=${B.length}`);
  ok(!!sess(0) && sess(0) === headerSession(0), `${name} user_id="" 补账号身份且 session = 头`, `${sess(0)} vs ${headerSession(0)}`);
  console.log(`     ${name} user_id={} -> metadata=${j(B[1]?.body?.metadata ?? null)}; unknown-only -> metadata=${j(B[2]?.body?.metadata ?? null)}`);
  ok(sess(3) === sess(4) && sess(3) === headerSession(4), `${name} 首条消息相同的两个对话共享会话（设计）`, `a=${sess(3)} b=${sess(4)} hdr=${headerSession(4)}`);
  ok(sess(5) === sess(3), `${name} 同一对话的后续轮沿用会话`, `turn1=${sess(3)} later=${sess(5)}`);
  ok(B[3]?.body?.metadata?.extra === 'kept' && B[5]?.body?.metadata?.extra === 'kept', `${name} 客户端其他 metadata 键保留`, `${j(B[3]?.body?.metadata)} / ${j(B[5]?.body?.metadata)}`);
}

// 14. CC-shaped UA without a billing header, and a billing header that is not
// the first system block (static audit D3/D4).
if (name === 'noncc-context2') {
  const labels = ['cc-ua-no-billing', 'billing-not-first', 'billing-first', 'direct-cc-ua-no-billing'];
  ok(B.length === 4, `${name} 四次投递都到了上游`, `B=${B.length}`);
  const h = r => pairs(r?.rawHeaders ?? {});
  for (const i of [0, 3]) {
    const leaked = ['x-claude-code-agent-id', 'x-claude-code-parent-agent-id', 'x-claude-code-agent-type', 'x-cc-compaction-request'].filter(k => h(B[i])[k]);
    ok(leaked.length === 0, `${name} ${labels[i]} 不接受 CC 上下文`, leaked.join(','));
    ok(!/cc_is_subagent=true/.test(billLine(B[i])), `${name} ${labels[i]} 不是子代理`, billLine(B[i]));
    console.log(`     ${name} ${labels[i]} UA=${h(B[i])['user-agent']?.[0]}`);
  }
  const bill = i => billLine(B[i]);
  console.log(`     ${name} billing-not-first: billing=${bill(1) || '(none)'} blocks=${(B[1]?.body?.system || []).length}`);
  console.log(`     ${name} billing-first:    billing=${bill(2) || '(none)'} blocks=${(B[2]?.body?.system || []).length}`);
  ok(!!bill(2), `${name} 首块计费头的请求按 CC 处理（计费头保留）`, bill(2));
}

// 15. The Worker's own probe endpoint (static audit C5).
if (name === 'probe-build') {
  const f = path.join(root, name, 'client.json');
  if (!fs.existsSync(f)) ok(false, `${name} 有 probe 应答`);
  else {
    const r = JSON.parse(fs.readFileSync(f, 'utf8'));
    ok(r.status === 200, `${name} 200`, r.status);
    console.log(`     ${name} body keys=${j(Object.keys(r.body || {}))} head=${String(r.body).slice(0, 120)}`);
  }
}

// 16. A tracked stream relays like an untracked one (0.1.91 P2-1, Worker side).
if (name === 'credit-plain-vs-tracked') {
  const dir = path.join(root, name);
  const B2 = loadReq(path.join(dir, 'b'));
  ok(B2.length === 2, `${name} 两个请求都到了上游`, `B=${B2.length}`);
  const mask = v => JSON.stringify(v).replace(/cch=[0-9a-f]{5}/g, 'cch=<cch>').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>');
  ok(mask(B2[0]?.body) === mask(B2[1]?.body), `${name} 带不带 credit beta 的上游正文相同`, mask(B2[0]?.body) === mask(B2[1]?.body) ? '' : 'differ');
  const cl = f => fs.existsSync(path.join(dir, f)) ? JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) : null;
  const plain = cl('client-plain.json'), tracked = cl('client-tracked.json');
  const readyP = Object.entries(plain?.trailers || {}).some(([k]) => k === 'x-ccgateway-fallback-credit-ready');
  const readyT = Object.entries(tracked?.trailers || {}).some(([k]) => k === 'x-ccgateway-fallback-credit-ready');
  ok(plain && tracked && plain.status === 200 && tracked.status === 200, `${name} 两个请求都 200`, `${plain?.status}/${tracked?.status}`);
  ok(!readyP, `${name} 未跟踪的应答没有回执`, j(plain?.trailers));
  ok(readyT, `${name} 被跟踪的应答回执在 trailer`, j(tracked?.trailers));
  for (const [label, c] of [['untracked', plain], ['tracked', tracked]]) {
    const t = c?.timing || {};
    ok(t.firstByteMs >= 0 && t.endMs - t.firstByteMs >= 800, `${name} ${label} 首字节先于结束`, `first=${t.firstByteMs} end=${t.endMs} chunks=${t.chunks}`);
  }
}

}

for (const name of cases) {
// 17. Two tracked streams in flight at once (static audit A9, Worker side).
if (name === 'credit-concurrent') {
  const dir = path.join(root, name);
  const cl = f => fs.existsSync(path.join(dir, f)) ? JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) : null;
  const one = cl('client-1.json'), two = cl('client-2.json');
  ok(one && two && one.status === 200 && two.status === 200, `${name} 两个并发 tracked 都 200`, `${one?.status}/${two?.status}`);
  const ready = c => Object.entries(c?.trailers || {}).some(([k]) => k === 'x-ccgateway-fallback-credit-ready');
  ok(ready(one) && ready(two), `${name} 两个应答都有 trailer 回执`, `${j(one?.trailers)} / ${j(two?.trailers)}`);
  const t = c => c?.timing || {};
  // The upstream holds each stream ~1.5 s; a serialized second request would
  // end at ~3 s or later, a shared authority keeps both near 1.6-2.6 s.
  ok(t(one).endMs < 3200 && t(two).endMs < 3400, `${name} 第二个没有排队等第一个（end < 3.4s）`, `1st=${t(one).endMs}ms 2nd=${t(two).endMs}ms`);
  ok(Math.abs(t(one).endMs - t(two).endMs) < 900, `${name} 两者结束时间接近（并行）`, `${t(one).endMs} vs ${t(two).endMs}`);
}

}

console.log(`\n${checks - fails}/${checks} assertions passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
