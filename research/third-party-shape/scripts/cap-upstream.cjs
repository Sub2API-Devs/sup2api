// Wraps the e2e kit's fake-upstream.cjs (unchanged on disk) and adds two more
// listeners sharing its handler and request counter:
//   TLS_PORT (+TLS_KEY/TLS_CERT) - TLS on 127.0.0.1, the "real" api.anthropic.com
//                                  (container --add-host api.anthropic.com:127.0.0.1)
//   HTTP_PORT                    - plain HTTP on 127.0.0.1, a third-party base URL
// Each record gets a "listener" field (unix | tls:<port> | http:<port>).
// Usage: [FAKE_SRC=...] node cap-upstream.cjs <sock> <capture-dir> <cert-dir>
const fs = require('fs'), Module = require('module'), path = require('path');
const file = process.env.FAKE_SRC || path.join(__dirname, 'fake-upstream.cjs');
let src = fs.readFileSync(file, 'utf8');
const before = src;
src = src.replace('index: id, method: req.method, url: req.url,', 'index: id, listener: req.__listener || "unix", method: req.method, url: req.url,');
if (src === before) throw new Error('fake-upstream.cjs: record patch point not found');
src += `
;(() => {
  const h0 = server.listeners('request')[0];
  // GET /api/hello (the TUI's connectivity check) answers 200 so the TUI starts;
  // recorded as usual.
  const h = (q, r) => {
    if (['/api/hello', '/v1/oauth/hello'].includes(q.url.split('?')[0])) {
      const wh = r.writeHead.bind(r), en = r.end.bind(r);
      r.writeHead = (s, hd) => wh(200, { 'content-type': 'application/json' });
      r.end = () => en('{"message":"hello"}');
    }
    h0(q, r);
  };
  server.removeAllListeners('request'); server.on('request', h);
  const hp = process.env.HTTP_PORT, tp = process.env.TLS_PORT;
  if (hp) require('http').createServer((q, r) => { q.__listener = 'http:' + hp; h(q, r); }).listen(+hp, '127.0.0.1', () => console.log('http on', hp));
  if (tp) https.createServer({ key: fs.readFileSync(process.env.TLS_KEY), cert: fs.readFileSync(process.env.TLS_CERT) }, (q, r) => { q.__listener = 'tls:' + tp; h(q, r); })
    .listen(+tp, '127.0.0.1', () => console.log('tls on', tp));
})();
`;
const m = new Module(file, module);
m.filename = file;
m.paths = Module._nodeModulePaths(path.dirname(file));
m._compile(src, file);
