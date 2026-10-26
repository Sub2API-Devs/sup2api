// Client values through the stand-in core (0.1.95): a non-CC client's numbers,
// generation values and an unreadable metadata.user_id. Each request is posted
// in order with its policy; the fake upstream numbers them the same way, so
// values-verify.cjs addresses req-NN by the order printed here.
// Usage: node values.cjs <messages-url> <build-policy> <direct-policy> <policy-file> <out.json>
const http = require('http'), fs = require('fs');
const [url, build, direct, policyFile, out] = process.argv.slice(2);
const target = new URL(url);

// Raw JSON text, so the numbers are exactly the client's.
const history = '[{"role":"user","content":"Look it up."},' +
  '{"role":"assistant","content":[{"type":"tool_use","id":"toolu_ccgaudit1","name":"lookup","input":{"id":12345678901234567891,"ratio":1.0,"neg":-0,"exp":1e2,"small":0.1,"exact":1.00000000000000001}}]},' +
  '{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_ccgaudit1","content":"found"}]}]';
const tools = '[{"name":"lookup","description":"Look up a record.","input_schema":{"type":"object","properties":{"id":{"type":"integer","maximum":99999999999999999999,"minimum":-9007199254740993}}}}]';
const body = (extra = '') => `{"model":"claude-opus-4-8","max_tokens":64,"system":"Answer concisely.","messages":${history},"tools":${tools}${extra}}`;
const simple = (fields) => `{"model":"claude-opus-4-8","system":"Answer concisely.","messages":[{"role":"user","content":"Say OK."}],${fields}}`;

const CASES = [
  ['numbers', body(), build],
  ['numbers-direct', body(), direct],
  ['top-k-extra', body(',"top_k":5.0,"x_future":{"n":9007199254740993}'), build],
  ['max-tokens-inexact', simple('"max_tokens":1.00000000000000001'), build],
  ['max-tokens-ten', simple('"max_tokens":10.0'), build],
  ['max-tokens-zero', simple('"max_tokens":0'), build],
  ['thinking-future', simple('"max_tokens":64,"thinking":{"type":"future_mode","level":2}'), build],
  ['thinking-no-budget', simple('"max_tokens":64,"thinking":{"type":"enabled"}'), build],
  ['stream-string', simple('"max_tokens":64,"stream":"true"'), build],
  ['user-id-number', simple('"max_tokens":64,"metadata":{"user_id":17}'), build],
  ['user-id-bad-json', simple('"max_tokens":64,"metadata":{"user_id":"{bad"}'), build],
  ['user-id-number-direct', simple('"max_tokens":64,"metadata":{"user_id":17}'), direct],
];

const post = ([label, payload, policy]) => new Promise(resolve => {
  fs.writeFileSync(policyFile, policy);
  const headers = {
    'content-type': 'application/json', 'anthropic-version': '2023-06-01',
    'x-api-key': 'ccg-audit-gateway-key', 'user-agent': 'anthropic-sdk-python/0.40.0',
    'x-ccgateway-request-policy': policy,
  };
  const req = http.request({ host: target.hostname, port: Number(target.port), path: target.pathname, method: 'POST', headers }, res => {
    const chunks = [];
    res.on('data', d => chunks.push(d)).on('end', () => resolve({ label, sent: payload, status: res.statusCode, body: Buffer.concat(chunks).toString('utf8').slice(0, 600) }));
  });
  req.on('error', e => resolve({ label, sent: payload, status: 0, body: e.message }));
  req.end(payload);
});

(async () => {
  const results = [];
  for (const c of CASES) {
    const r = await post(c);
    results.push(r);
    console.log(`  ${r.label} status=${r.status}${r.status === 200 ? '' : ' ' + r.body.slice(0, 160)}`);
  }
  fs.writeFileSync(out, JSON.stringify(results, null, 1));
})();
