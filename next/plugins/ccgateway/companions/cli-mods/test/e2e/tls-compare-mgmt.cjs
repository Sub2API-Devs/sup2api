// Reports the recorded management-path connections (tls-probe.cjs via
// tls-fingerprint-mgmt.sh): per client and request path the ALPN offer, JA3,
// JA4, then whether `ccgateway-mgmt` matches the official client's
// /v1/messages request and the same CLI's `request --direct`, and whether each
// measurement is stable across runs.
//   node tls-compare-mgmt.cjs <connections.jsonl>
const fs = require('fs');
const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const clientOf = label => label.replace(/-\d+$/, '');
const pathOf = r => ((r.requestLine ?? '').split(' ')[1] ?? '?').replace(/\?.*/, '');
const tlsKey = r => r.hello ? JSON.stringify({ ja4: r.hello.ja4, ja3: r.hello.ja3, ext: r.hello.extensions, alpn: r.hello.alpn, groups: r.hello.groups, sig: r.hello.sigAlgs, versions: r.hello.versions, keyShares: r.hello.keyShares, certCompression: r.hello.certCompression, grease: r.hello.grease, sni: r.hello.sni, sid: r.hello.sessionIdLength, cs: r.hello.ciphers }) : 'none';
const by = new Map();
for (const r of rows) {
  const key = `${clientOf(r.label)} ${r.requestLine?.split(' ')[0] ?? '?'} ${pathOf(r)}`;
  const entry = by.get(key) ?? { tls: new Set(), rows: [] };
  entry.tls.add(tlsKey(r)); entry.rows.push(r); by.set(key, entry);
}
const summary = [];
for (const [key, v] of by) {
  const r = v.rows[0], h = r.hello;
  summary.push({ key, runs: v.rows.length, stable: v.tls.size === 1, alpn: h?.alpn ?? [], ja3: h?.ja3, ja4: h?.ja4, sni: h?.sni, error: r.error, headerNames: r.headerNames, ua: r.headers?.['user-agent'] });
}
console.log(JSON.stringify(summary, null, 1));
const same = (a, b) => [...by.get(a.key).tls].every(t => by.get(b.key).tls.has(t)) && [...by.get(b.key).tls].every(t => by.get(a.key).tls.has(t));
// The official client's own startup reads (GET /api/claude_code/*) use another
// stack; the reference is its /v1/messages request.
const official = summary.filter(s => /^official-\S+ POST \/v1\/messages$/.test(s.key));
const mgmt = summary.filter(s => /-mgmt\S* GET \/api\/oauth\/usage$/.test(s.key));
const direct = summary.filter(s => /-direct\S* POST \/v1\/messages$/.test(s.key));
for (const m of mgmt) {
  for (const o of official) console.log(`mgmt ${m.key} vs ${o.key}: TLS ${same(m, o) ? 'identical' : 'DIFFERENT'}`);
  for (const d of direct) console.log(`mgmt ${m.key} vs ${d.key}: TLS ${same(m, d) ? 'identical' : 'DIFFERENT'}`);
}
