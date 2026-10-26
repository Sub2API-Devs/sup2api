// Checks the Worker's assembled responses against what the client received:
// the stand-in core records each Worker answer (inbound-dir-*/resp-N.json,
// with body and the Worker's request-id header); the Worker logs
// (data-*/request-logs/*/metadata.json + response.json) are matched by
// request_id, and the client's bytes are assembled here independently
// (SSE -> one Messages response; JSON as is) and compared.
//   node respcheck.cjs <work dir>
// The pairing by request-id only works where the Worker log and the stand-in
// core see the same ID; respmatch.cjs pairs by content instead (README).
// assemble() is exported for respmatch.cjs.
const fs = require('fs'), path = require('path');

function assemble(text) {
  let msg = null; const blocks = []; const partial = {}; let error = null;
  for (const ev of text.split(/\r?\n\r?\n/)) {
    const data = ev.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).replace(/^ /, '')).join('\n');
    if (!data) continue;
    let e; try { e = JSON.parse(data); } catch { continue; }
    switch (e.type) {
      case 'message_start': msg = JSON.parse(JSON.stringify(e.message)); break;
      case 'content_block_start': blocks[e.index] = JSON.parse(JSON.stringify(e.content_block)); partial[e.index] = ''; break;
      case 'content_block_delta': {
        const b = blocks[e.index], d = e.delta;
        if (d.type === 'text_delta') b.text = (b.text || '') + d.text;
        else if (d.type === 'input_json_delta') partial[e.index] += d.partial_json;
        else if (d.type === 'thinking_delta') b.thinking = (b.thinking || '') + d.thinking;
        else if (d.type === 'signature_delta') b.signature = (b.signature || '') + d.signature;
        else if (d.type === 'citations_delta') (b.citations ||= []).push(d.citation);
        break;
      }
      case 'content_block_stop': if (partial[e.index]) { try { blocks[e.index].input = JSON.parse(partial[e.index]); } catch {} } break;
      case 'message_delta': if (msg) { Object.assign(msg, e.delta); if (e.usage) msg.usage = { ...msg.usage, ...e.usage }; } break;
      case 'error': error = e.error; break;
    }
  }
  if (!msg) return error ? { type: 'error', error } : null;
  msg.content = blocks.filter(Boolean);
  return msg;
}

module.exports = { assemble };
if (require.main === module) main(process.argv[2]);

function main(W) {
  const answers = new Map();
  for (const c of fs.existsSync(path.join(W, "cap")) ? fs.readdirSync(path.join(W, "cap")) : []) {
    const dir = path.join(W, "cap", c, "in");
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(f => /^resp-\d+\.json$/.test(f))) {
      const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const id = r.headers && r.headers['request-id'];
      if (id && typeof r.body === 'string') answers.set(id, r);
    }
  }
  let compared = 0, same = 0, rawFallback = 0, noAnswer = 0, notAssembled = 0; const diffs = [];
  const firstByte = [], end = [];
  for (const d of fs.readdirSync(W).filter(d => d.startsWith('data-'))) {
    const root = path.join(W, d, 'request-logs');
    if (!fs.existsSync(root)) continue;
    for (const id of fs.readdirSync(root)) {
      const mf = path.join(root, id, 'metadata.json');
      if (!fs.existsSync(mf)) continue;
      const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
      if (m.log_level !== 'full' || m.path !== '/v1/messages') continue;
      const a = answers.get(m.request_id);
      if (!a) { noAnswer++; continue; }
      firstByte.push(a.timing.firstByteMs); end.push(a.timing.endMs);
      const rj = path.join(root, id, 'response.json');
      if (!fs.existsSync(rj)) { if (fs.existsSync(path.join(root, id, 'response.body'))) rawFallback++; else notAssembled++; continue; }
      const got = JSON.parse(fs.readFileSync(rj, 'utf8'));
      const ct = String(a.headers['content-type'] || '');
      const want = ct.includes('event-stream') ? assemble(a.body) : JSON.parse(a.body);
      compared++;
      const strip = o => JSON.parse(JSON.stringify(o, (k, v) => (k === 'ccgateway_incomplete' || k === 'ccgateway_unparsed') ? undefined : v));
      if (JSON.stringify(strip(got)) === JSON.stringify(strip(want))) same++;
      else if (diffs.length < 5) diffs.push({ id, status: a.status, got: JSON.stringify(got).slice(0, 300), want: JSON.stringify(want).slice(0, 300) });
    }
  }
  const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
  console.log(JSON.stringify({ compared, same, rawFallback, notAssembled, noAnswer, diffs, timing: { n: end.length, firstByteMedianMs: median(firstByte), endMedianMs: median(end) } }, null, 1));
}
