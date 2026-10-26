// Checks the Worker's assembled responses (CCGateway 0.1.103+, request logs at
// level full) against what the client received, pairing by content: every
// Worker answer the stand-in core recorded (cap/*/in/resp-N.json) is assembled
// independently (SSE -> one Messages response, JSON as is) into a pool, and each
// Worker log's response.json must take one matching entry out of it. The
// request-id the stand-in core sees is the fake upstream's, which repeats in
// every case, so respcheck.cjs's pairing by ID cannot be used here.
//   node respmatch.cjs <work dir>...
const fs = require('fs'), p = require('path');
const { assemble } = require('./respcheck.cjs');
const canon = v => Array.isArray(v) ? v.map(canon)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).filter(k => k !== 'ccgateway_incomplete' && k !== 'ccgateway_unparsed').sort().map(k => [k, canon(v[k])]))
  : v;
const key = o => JSON.stringify(canon(o));
for (const W of process.argv.slice(2)) {
  const pool = new Map(); let answers = 0;
  for (const c of fs.readdirSync(p.join(W, 'cap'))) {
    const d = p.join(W, 'cap', c, 'in');
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter(f => /^resp-/.test(f))) {
      const r = JSON.parse(fs.readFileSync(p.join(d, f)));
      answers++;
      const ct = String(r.headers['content-type'] || '');
      let v; try { v = ct.includes('event-stream') ? assemble(r.body) : JSON.parse(r.body); } catch { v = { raw: r.body }; }
      const k = key(v); pool.set(k, (pool.get(k) || 0) + 1);
    }
  }
  let logs = 0, json = 0, found = 0, raw = 0, none = 0; const miss = [];
  for (const w of fs.readdirSync(W).filter(d => d.startsWith('data-'))) {
    const root = p.join(W, w, 'request-logs');
    if (!fs.existsSync(root)) continue;
    for (const id of fs.readdirSync(root)) {
      const mf = p.join(root, id, 'metadata.json');
      if (!fs.existsSync(mf)) continue;
      const m = JSON.parse(fs.readFileSync(mf));
      if (m.path !== '/v1/messages' || m.log_level !== 'full') continue;
      logs++;
      const rj = p.join(root, id, 'response.json');
      if (!fs.existsSync(rj)) { fs.existsSync(p.join(root, id, 'response.body')) ? raw++ : none++; continue; }
      json++;
      const k = key(JSON.parse(fs.readFileSync(rj)));
      if (pool.get(k) > 0) { found++; pool.set(k, pool.get(k) - 1); }
      else if (miss.length < 3) miss.push({ id, got: k.slice(0, 300), events: m.response_events, status: m.status });
    }
  }
  console.log(W.split('/').slice(-2).join('/'), JSON.stringify({ clientAnswers: answers, fullLogs: logs, responseJson: json, matchedClientAnswer: found, rawBodyOnly: raw, noResponseFile: none, miss }));
}
