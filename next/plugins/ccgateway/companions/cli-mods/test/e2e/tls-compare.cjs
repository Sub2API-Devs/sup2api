// Compares the recorded connections (tls-probe.cjs) by client: per label the
// JA3/JA4, ALPN offer, extension order, and the HTTP/1.1 header names in
// order (values of volatile headers ignored), then whether each client's
// fingerprint is stable across its runs and how the custom CLIs differ from
// the official ones.
//   node tls-compare.cjs <connections.jsonl>
const fs = require('fs');
const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const client = label => label.replace(/-\d+$/, '');
const tlsKey = r => r.hello ? JSON.stringify({ ja4: r.hello.ja4, ja3: r.hello.ja3, ext: r.hello.extensions, alpn: r.hello.alpn, groups: r.hello.groups, sig: r.hello.sigAlgs, versions: r.hello.versions, keyShares: r.hello.keyShares, certCompression: r.hello.certCompression, grease: r.hello.grease, sni: r.hello.sni, sid: r.hello.sessionIdLength }) : 'none';
const out = {};
for (const r of rows) {
  const c = client(r.label), path = (r.requestLine ?? '').split(' ')[1] ?? '?';
  const k = c + ' ' + (r.requestLine ?? '').split(' ')[0] + ' ' + path.replace(/\?.*/, '');
  (out[k] ??= { tls: new Set(), heads: new Set(), sample: r }).tls.add(tlsKey(r));
  out[k].heads.add(JSON.stringify(r.headerNames ?? []));
}
const summary = Object.entries(out).map(([k, v]) => ({ key: k, tlsVariants: v.tls.size, headVariants: v.heads.size, ja4: v.sample.hello?.ja4, ja3: v.sample.hello?.ja3, alpnOffer: v.sample.hello?.alpn, negotiated: v.sample.negotiated, ua: v.sample.headers?.['user-agent'], headerNames: v.sample.headerNames, error: v.sample.error }));
console.log(JSON.stringify(summary, null, 1));
// Messages connections: does each custom CLI hello equal an official one?
const messages = summary.filter(s => / POST \/v1\/messages$/.test(s.key));
const official = messages.filter(s => s.key.startsWith('official-'));
for (const s of messages.filter(s => !s.key.startsWith('official-'))) {
  const mine = out[s.key];
  for (const o of official) {
    const theirs = out[o.key];
    const sameTls = [...mine.tls].every(t => theirs.tls.has(t)) && [...theirs.tls].every(t => mine.tls.has(t));
    const a = s.headerNames ?? [], b = o.headerNames ?? [];
    console.log(`${s.key} vs ${o.key}: TLS ${sameTls ? 'identical' : 'DIFFERENT'}; header names ${JSON.stringify(a) === JSON.stringify(b) ? 'identical' : 'differ'} (only custom: ${JSON.stringify(a.filter(x => !b.includes(x)))}, only official: ${JSON.stringify(b.filter(x => !a.includes(x)))})`);
  }
}
