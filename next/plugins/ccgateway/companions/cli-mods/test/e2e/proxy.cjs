// Local stand-in for the core: forwards the client's request to the Worker
// unchanged except for the request-policy header the core adds (and, when
// CREDIT_SIM=1, the fallback-credit tracking headers the core adds for a
// request whose betas register the credit protocol). Keeps no copy of the body
// (streams both ways), so SSE passes through. With INBOUND_FILE it records each
// inbound request (ordered raw headers + body) and each Worker answer
// (resp-N.json: status, headers, trailers, first-byte/end timing); with
// WORKER_RESP_LOG it appends the Worker's response status/headers for every
// POST it forwards. r3: trailers are forwarded to the client so a credit
// receipt's new position is observable from the client side.
// Usage: node proxy.cjs <listen-port> <worker-port> <policy-file>
const http = require('http'), fs = require('fs');
const [listen, worker, policyFile] = process.argv.slice(2);
const HOP = new Set(['host', 'connection', 'content-length', 'transfer-encoding', 'keep-alive', 'proxy-connection', 'upgrade']);
let logged = 0, respN = 0;
const inboundFile = process.env.INBOUND_FILE || '';
const inboundDir = () => { try { return fs.readFileSync(inboundFile, 'utf8').trim(); } catch { return ''; } };
const respLog = process.env.WORKER_RESP_LOG || '';
const creditSim = process.env.CREDIT_SIM === '1';
const workerKey = process.env.WORKER_API_KEY || '';
// The betas that register the credit protocol (contracts/credits/prompt.go).
const CREDIT_BETAS = ['fallback-credit-2026-06-01', 'fallback-credit-2026-07-01', 'server-side-fallback-2026-07-01'];
let identity;

// workerIdentity is what the core's ResourceTransport.Identity returns: the
// Worker's verified principal and authorization generation.
async function workerIdentity() {
  if (identity) return identity;
  identity = await new Promise(resolve => {
    const req = http.request({ host: '127.0.0.1', port: Number(worker), path: '/_ccgateway/resources/identity', method: 'GET', headers: { 'x-api-key': workerKey } }, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d)).on('end', () => {
        let body = {};
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {}
        const id = { status: res.statusCode, principal: res.headers['x-ccgateway-resource-principal'], generation: res.headers['x-ccgateway-resource-generation'], body };
        console.error('identity', JSON.stringify(id).slice(0, 300));
        resolve(id);
      });
    });
    req.on('error', e => { console.error('identity error', e.message); resolve({ status: 0 }); });
    req.end();
  });
  return identity;
}

const headerValues = (h, name) => {
  const raw = h[name];
  return raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
};
const enabled = values => values.some(v => String(v).split(',').some(b => CREDIT_BETAS.includes(b.trim())));

http.createServer((req, res) => {
  let policy = {};
  try { policy = JSON.parse(fs.readFileSync(policyFile, 'utf8')); } catch {}
  const mode = req.method, url = req.url;
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) if (!HOP.has(k.toLowerCase())) headers[k] = v;
  if (policy && Object.keys(policy).length) headers['x-ccgateway-request-policy'] = JSON.stringify(policy);
  headers.host = '127.0.0.1:' + worker;
  const creditTracked = creditSim && mode === 'POST' && enabled(headerValues(req.headers, 'anthropic-beta'));
  const finish = () => {
    const dir = inboundDir();
    if (!dir || mode !== 'POST') return;
    fs.mkdirSync(dir, { recursive: true });
    const n = fs.readdirSync(dir).filter(f => /^in-\d+\.json$/.test(f)).length + 1;
    fs.writeFileSync(dir + `/in-${String(n).padStart(2, '0')}.json`, JSON.stringify({
      method: mode, url, rawHeaders: req.rawHeaders, body: Buffer.concat(chunks).toString('utf8'), creditTracked,
    }, null, 1));
  };
  const chunks = [];
  let bodyDone = false;
  // A tracked request waits for the identity fetch before it is forwarded, so
  // its body is buffered here (attaching a pipe later would lose it).
  const buffered = creditTracked;
  if (inboundFile || buffered) req.on('data', d => chunks.push(d));
  req.on('end', () => { bodyDone = true; });
  const dispatch = id => {
    if (creditTracked && id && id.status === 200 && id.principal && id.generation) {
      headers['x-ccgateway-fallback-credit-track'] = '1';
      headers['x-ccgateway-resource-principal'] = id.principal;
      headers['x-ccgateway-resource-generation'] = id.generation;
    }
    if (logged++ < 60) console.error('proxy', mode, url, 'policy=' + JSON.stringify(policy), creditTracked ? 'credit=tracked' : '');
    const t0 = Date.now();
    let firstByteMs = -1, bytes = 0, dataChunks = 0;
    const bodyParts = [];
    const up = http.request({ host: '127.0.0.1', port: Number(worker), method: mode, path: url, headers }, ur => {
      const headersAt = Date.now() - t0;
      const out = {};
      for (const [k, v] of Object.entries(ur.headers)) if (k.toLowerCase() !== 'connection' && k.toLowerCase() !== 'transfer-encoding') out[k] = v;
      if (respLog && mode === 'POST') {
        let line = { url, status: ur.statusCode, tracked: creditTracked, headers: out };
        try { line.identity = { principal: out['x-ccgateway-resource-principal'], generation: out['x-ccgateway-resource-generation'] }; } catch {}
        fs.appendFileSync(respLog, JSON.stringify(line) + '\n');
      }
      res.writeHead(ur.statusCode || 502, out);
      ur.on('data', d => {
        dataChunks++;
        if (firstByteMs < 0) firstByteMs = Date.now() - t0;
        bytes += d.length;
        bodyParts.push(d);
        res.write(d);
      });
      ur.on('end', () => {
        const endMs = Date.now() - t0;
        const trailers = ur.trailers || {};
        if (Object.keys(trailers).length) { try { res.addTrailers(trailers); } catch (e) { console.error('trailer forward', e.message); } }
        res.end();
        const dir = inboundDir();
        if (dir && mode === 'POST') {
          try {
            fs.mkdirSync(dir, { recursive: true });
            const n = ++respN;
            fs.writeFileSync(dir + `/resp-${String(n).padStart(2, '0')}.json`, JSON.stringify({
              url, status: ur.statusCode, tracked: creditTracked, headers: out, trailers,
              body: Buffer.concat(bodyParts).toString("utf8"),
              timing: { headersMs: headersAt, firstByteMs, endMs, dataChunks, bytes },
            }, null, 1));
          } catch (e) { console.error('resp record', e.message); }
        }
      });
    });
    up.on('error', (e) => { console.error('proxy upstream error', e.message); res.writeHead(502, { 'content-type': 'application/json' }); res.end('{"type":"error","error":{"type":"api_error","message":"proxy"}}'); });
    if (buffered) { if (bodyDone) up.end(Buffer.concat(chunks)); else req.on('end', () => up.end(Buffer.concat(chunks))); }
    else req.pipe(up);
    req.on('end', finish);
  };
  if (creditTracked) workerIdentity().then(dispatch); else dispatch(null);
}).listen(Number(listen), '127.0.0.1', () => console.log('proxy on', listen, '->', worker, creditSim ? 'credit-sim' : ''));
