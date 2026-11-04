// Replays a captured request (req-NN.json: rawHeaders + rawBody) to 127.0.0.1:<port>, minus hop headers.
// node replay.cjs <req.json> <port> [auth-header-value]
const fs = require('fs'), http = require('http');
const [file, port, auth] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
const hop = new Set(['host', 'content-length', 'connection', 'transfer-encoding', 'accept-encoding']);
const headers = [];
for (let i = 0; i + 1 < r.rawHeaders.length; i += 2) {
  const k = r.rawHeaders[i], v = r.rawHeaders[i + 1];
  if (hop.has(k.toLowerCase())) continue;
  headers.push(k, /^(authorization)$/i.test(k) && auth ? auth : v);
}
headers.push('Host', '127.0.0.1:' + port, 'Content-Length', String(Buffer.byteLength(r.rawBody)));
const req = http.request({ host: '127.0.0.1', port: +port, method: r.method, path: r.url, headers }, res => {
  let n = 0; res.on('data', d => n += d.length).on('end', () => console.log('replay', file, 'status', res.statusCode, 'bytes', n));
});
req.on('error', e => console.log('replay error', e.message));
req.end(r.rawBody);
