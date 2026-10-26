// Client for the fallback-credit streaming probe (r3). Posts one tracked credit
// request through the stand-in core and measures when bytes arrive: the Worker
// used to buffer a tracked answer whole (first byte ~= end), and now relays it
// and appends the receipt as a trailer (first byte << end). Writes the measured
// values to <out.json> and prints one summary line.
// Usage: node credit-client.cjs <messages-url> <policy> <stream 0|1> <beta> <out.json> [model]
const http = require('http'), fs = require('fs');
const [url, policy, streamFlag, beta, out, model = 'claude-opus-4-8'] = process.argv.slice(2);
const target = new URL(url);
const payload = JSON.stringify({ model, max_tokens: 64, ...(streamFlag === '1' ? { stream: true } : {}), messages: [{ role: 'user', content: 'Say OK.' }] });
const headers = {
  'content-type': 'application/json', 'anthropic-version': '2023-06-01',
  'x-api-key': 'ccg-audit-gateway-key', 'user-agent': 'anthropic-sdk-python/0.40.0',
  'anthropic-beta': beta ? 'claude-code-20250219,' + beta : 'claude-code-20250219', 'x-ccgateway-request-policy': policy,
};
const t0 = Date.now();
let firstByteMs = -1, chunks = 0, bytes = 0;
const req = http.request({ host: target.hostname, port: Number(target.port), path: target.pathname, method: 'POST', headers }, res => {
  const headersMs = Date.now() - t0;
  const body = [];
  res.on('data', d => { chunks++; bytes += d.length; if (firstByteMs < 0) firstByteMs = Date.now() - t0; body.push(d); });
  res.on('end', () => {
    const endMs = Date.now() - t0;
    const text = Buffer.concat(body).toString('utf8');
    const result = {
      url, status: res.statusCode, stream: streamFlag === '1',
      headers: res.headers, trailers: res.trailers || {}, bodyLength: text.length,
      timing: { headersMs, firstByteMs, endMs, chunks, bytes },
      bodyHead: text.slice(0, 300),
    };
    fs.writeFileSync(out, JSON.stringify(result, null, 1));
    console.log(`status=${res.statusCode} chunks=${chunks} bytes=${bytes} headers=${headersMs}ms first=${firstByteMs}ms end=${endMs}ms trailers=${JSON.stringify(res.trailers || {})}`);
  });
});
req.on('error', e => { console.log(`error=${e.message}`); fs.writeFileSync(out, JSON.stringify({ error: e.message }, null, 1)); });
req.end(payload);
