// TLS and HTTP/1.1 fingerprint probe for what a client sends to
// api.anthropic.com. Listens on 127.0.0.1:443 (the container maps
// api.anthropic.com to loopback), reads each connection's raw ClientHello,
// then completes TLS with a self-signed api.anthropic.com certificate (the
// client trusts it through NODE_EXTRA_CA_CERTS), offers http/1.1 by ALPN,
// records the raw HTTP/1.1 request head (header names as written, in order)
// and answers a minimal Messages response. One JSON line per connection goes
// to <out>/connections.jsonl, tagged with the label in <out>/label (the run
// script writes it before each client).
//   node tls-probe.cjs <cert dir> <out dir>
const net = require('net'), tls = require('tls'), { Duplex } = require('stream'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const [certDir, outDir] = process.argv.slice(2);
const key = fs.readFileSync(path.join(certDir, 'server.key.pem')), cert = fs.readFileSync(path.join(certDir, 'server.crt.pem'));
const GREASE = v => (v & 0x0f0f) === 0x0a0a && (v >> 8) === (v & 0xff);
const hex4 = v => v.toString(16).padStart(4, '0');
const sha12 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

function parseClientHello(buf) {
  // record header (5) + handshake header (4)
  if (buf[0] !== 0x16) throw Error('not a TLS handshake record');
  const recordVersion = buf.readUInt16BE(1);
  let p = 5;
  if (buf[p] !== 1) throw Error('not a ClientHello');
  p += 4;
  const legacyVersion = buf.readUInt16BE(p); p += 2;
  p += 32; // random
  const sidLen = buf[p]; p += 1 + sidLen;
  const csLen = buf.readUInt16BE(p); p += 2;
  const ciphers = []; for (let i = 0; i < csLen; i += 2) ciphers.push(buf.readUInt16BE(p + i)); p += csLen;
  const compLen = buf[p]; const compression = [...buf.subarray(p + 1, p + 1 + compLen)]; p += 1 + compLen;
  const extTotal = buf.readUInt16BE(p); p += 2;
  const end = p + extTotal, extensions = [];
  const info = { sni: null, alpn: [], groups: [], pointFormats: [], sigAlgs: [], versions: [], keyShares: [], pskModes: [], certCompression: [], delegated: [], alps: [], recordSizeLimit: null, padding: null, ech: false, sessionTicket: null, sctRequested: false, statusRequest: false };
  while (p < end) {
    const type = buf.readUInt16BE(p), len = buf.readUInt16BE(p + 2), d = buf.subarray(p + 4, p + 4 + len);
    extensions.push(type);
    const u16list = (off, n) => { const out = []; for (let i = 0; i < n; i += 2) out.push(d.readUInt16BE(off + i)); return out; };
    switch (type) {
      case 0: { let q = 2; while (q < d.length) { const nt = d[q], nl = d.readUInt16BE(q + 1); if (nt === 0) info.sni = d.subarray(q + 3, q + 3 + nl).toString(); q += 3 + nl; } break; }
      case 5: info.statusRequest = true; break;
      case 10: info.groups = u16list(2, d.readUInt16BE(0)); break;
      case 11: info.pointFormats = [...d.subarray(1, 1 + d[0])]; break;
      case 13: info.sigAlgs = u16list(2, d.readUInt16BE(0)); break;
      case 16: { let q = 2; while (q < d.length) { const l = d[q]; info.alpn.push(d.subarray(q + 1, q + 1 + l).toString()); q += 1 + l; } break; }
      case 18: info.sctRequested = true; break;
      case 21: info.padding = len; break;
      case 27: info.certCompression = u16list(1, d[0]); break;
      case 28: info.recordSizeLimit = d.readUInt16BE(0); break;
      case 34: info.delegated = u16list(2, d.readUInt16BE(0)); break;
      case 35: info.sessionTicket = len; break;
      case 43: info.versions = u16list(1, d[0]); break;
      case 45: info.pskModes = [...d.subarray(1, 1 + d[0])]; break;
      case 51: { let q = 2; while (q < d.length) { const g = d.readUInt16BE(q), l = d.readUInt16BE(q + 2); info.keyShares.push(g); q += 4 + l; } break; }
      case 17513: case 17613: { let q = 2; const n = d.readUInt16BE(0); while (q < 2 + n) { const l = d[q]; info.alps.push(d.subarray(q + 1, q + 1 + l).toString()); q += 1 + l; } break; }
      case 0xfe0d: info.ech = true; break;
    }
    p += 4 + len;
  }
  const c = ciphers.filter(v => !GREASE(v)), e = extensions.filter(v => !GREASE(v));
  const g = info.groups.filter(v => !GREASE(v)), versions = info.versions.filter(v => !GREASE(v));
  const ja3 = [legacyVersion, c.join('-'), e.join('-'), g.join('-'), info.pointFormats.join('-')].join(',');
  const tlsv = versions.includes(0x0304) ? '13' : versions.includes(0x0303) || legacyVersion === 0x0303 ? '12' : '??';
  const alpn = info.alpn[0] ? info.alpn[0][0] + info.alpn[0].at(-1) : '00';
  const ja4a = `t${tlsv}${info.sni ? 'd' : 'i'}${String(Math.min(c.length, 99)).padStart(2, '0')}${String(Math.min(e.length, 99)).padStart(2, '0')}${alpn}`;
  const ja4b = sha12(c.map(hex4).sort().join(','));
  const ja4c = sha12(e.filter(v => v !== 0 && v !== 16).map(hex4).sort().join(',') + '_' + info.sigAlgs.filter(v => !GREASE(v)).map(hex4).join(','));
  return {
    recordVersion: hex4(recordVersion), legacyVersion: hex4(legacyVersion), sessionIdLength: sidLen, compression,
    ciphers: ciphers.map(v => GREASE(v) ? 'GREASE' : hex4(v)), extensions: extensions.map(v => GREASE(v) ? 'GREASE' : v),
    ...info, groups: info.groups.map(v => GREASE(v) ? 'GREASE' : hex4(v)), sigAlgs: info.sigAlgs.map(hex4), versions: info.versions.map(v => GREASE(v) ? 'GREASE' : hex4(v)),
    keyShares: info.keyShares.map(v => GREASE(v) ? 'GREASE' : hex4(v)), grease: ciphers.some(GREASE) || extensions.some(GREASE),
    helloLength: buf.readUInt16BE(3),
    ja3: crypto.createHash('md5').update(ja3).digest('hex'), ja3String: ja3, ja4: `${ja4a}_${ja4b}_${ja4c}`,
  };
}

const server = net.createServer(socket => {
  const started = Date.now();
  let first = Buffer.alloc(0);
  const record = { label: fs.existsSync(path.join(outDir, 'label')) ? fs.readFileSync(path.join(outDir, 'label'), 'utf8').trim() : '', at: new Date().toISOString() };
  const onData = chunk => {
    first = Buffer.concat([first, chunk]);
    if (first.length < 5 || first.length < 5 + first.readUInt16BE(3)) return;
    socket.removeListener('data', onData); socket.pause();
    try { record.hello = parseClientHello(first); } catch (e) { record.error = String(e.message); }
    // TLSSocket over a net.Socket reads its handle directly, so bytes already
    // read (the ClientHello) cannot be put back; a JS Duplex replays them.
    const replay = first;
    const wire = new Duplex({
      read() {},
      write(chunk, encoding, done) { socket.write(chunk, done); },
      final(done) { socket.end(); done(); },
    });
    wire.push(replay);
    socket.on('data', d => wire.push(d));
    socket.on('end', () => wire.push(null));
    socket.on('close', () => wire.destroy());
    const secure = new tls.TLSSocket(wire, { isServer: true, key, cert, ALPNProtocols: ['http/1.1'] });
    let head = Buffer.alloc(0), body = Buffer.alloc(0), headEnd = -1, need = 0, chunked = false, done = false;
    secure.on('secure', () => { record.negotiated = { protocol: secure.getProtocol(), alpn: secure.alpnProtocol, cipher: secure.getCipher()?.standardName }; });
    secure.on('data', d => {
      if (done) return;
      if (headEnd < 0) {
        head = Buffer.concat([head, d]);
        headEnd = head.indexOf('\r\n\r\n');
        if (headEnd < 0) return;
        const lines = head.subarray(0, headEnd).toString('latin1').split('\r\n');
        record.requestLine = lines[0].replace(/\?.*? /, m => m);
        record.headerNames = lines.slice(1).map(l => l.slice(0, l.indexOf(':')));
        const h = Object.fromEntries(lines.slice(1).map(l => [l.slice(0, l.indexOf(':')).toLowerCase(), l.slice(l.indexOf(':') + 1).trim()]));
        record.headers = Object.fromEntries(Object.entries(h).map(([k, v]) => [k, /authorization|x-api-key|cookie/.test(k) ? '[REDACTED]' : v]));
        body = head.subarray(headEnd + 4);
        chunked = /chunked/i.test(h['transfer-encoding'] ?? '');
        need = Number(h['content-length'] ?? 0);
      } else body = Buffer.concat([body, d]);
      const complete = chunked ? body.includes('\r\n0\r\n\r\n') || body.subarray(0, 5).toString() === '0\r\n\r\n' : body.length >= need;
      if (!complete) return;
      done = true;
      record.bodyBytes = body.length; record.ms = Date.now() - started;
      fs.appendFileSync(path.join(outDir, 'connections.jsonl'), JSON.stringify(record) + '\n');
      const msg = JSON.stringify({ id: 'msg_tlsprobe', type: 'message', role: 'assistant', model: 'claude-haiku-4-5-20251001', content: [{ type: 'text', text: 'OK' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } });
      const sse = `event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { ...JSON.parse(msg), content: [], stop_reason: null } })}\n\nevent: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\nevent: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"OK"}}\n\nevent: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\nevent: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":1}}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n`;
      const stream = /"stream"\s*:\s*true/.test(body.toString());
      const isMessages = /^POST \/v1\/messages/.test(record.requestLine);
      const payload = !isMessages ? '{}' : stream ? sse : msg;
      secure.end(`HTTP/1.1 200 OK\r\ncontent-type: ${isMessages && stream ? 'text/event-stream' : 'application/json'}\r\ncontent-length: ${Buffer.byteLength(payload)}\r\nrequest-id: req_tlsprobe\r\nconnection: close\r\n\r\n${payload}`);
    });
    secure.on('error', e => { if (!done) { record.error = String(e.message); fs.appendFileSync(path.join(outDir, 'connections.jsonl'), JSON.stringify(record) + '\n'); done = true; } });
    socket.resume();
  };
  socket.on('data', onData);
  socket.on('error', () => {});
});
server.listen(443, '127.0.0.1', () => fs.writeFileSync(path.join(outDir, 'ready'), '1'));
