// Checks the 0.1.95 client-values phase: every request reached the upstream
// (no Worker refusal), and the upstream got the client's values as written.
// Usage: node values-verify.cjs <capture-dir>
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const results = JSON.parse(fs.readFileSync(path.join(dir, 'client.json'), 'utf8'));
const reqs = fs.readdirSync(path.join(dir, 'b')).filter(f => /^req-\d+\.json$/.test(f)).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(dir, 'b', f), 'utf8')));
const has = (...tokens) => raw => tokens.every(t => raw.includes(t)) || `missing ${tokens.filter(t => !raw.includes(t)).join(' ')}`;
const json = check => (raw, body) => check(body);
const identity = body => {
  const value = body.metadata?.user_id;
  if (typeof value !== 'string') return `user_id ${JSON.stringify(value)}`;
  const id = JSON.parse(value);
  return /^[0-9a-f]{64}$/.test(id.device_id) && /^[0-9a-f-]{36}$/.test(id.session_id) || `identity ${value}`;
};
const NUMBERS = ['"id":12345678901234567891', '"ratio":1.0', '"neg":-0', '"exp":1e2', '"small":0.1', '"exact":1.00000000000000001', '"maximum":99999999999999999999', '"minimum":-9007199254740993'];
const CHECKS = {
  'numbers': has(...NUMBERS),
  'numbers-direct': has(...NUMBERS),
  'top-k-extra': has('"top_k":5.0', '"x_future":{"n":9007199254740993}', ...NUMBERS),
  'max-tokens-inexact': has('"max_tokens":1.00000000000000001'),
  'max-tokens-ten': json(body => body.max_tokens === 10 || `max_tokens ${body.max_tokens}`),
  'max-tokens-zero': has('"max_tokens":0'),
  'thinking-future': json(body => JSON.stringify(body.thinking) === '{"type":"future_mode","level":2}' || `thinking ${JSON.stringify(body.thinking)}`),
  'thinking-no-budget': json(body => JSON.stringify(body.thinking) === '{"type":"enabled"}' || `thinking ${JSON.stringify(body.thinking)}`),
  'stream-string': json(body => body.stream === 'true' || `stream ${JSON.stringify(body.stream)}`),
  'user-id-number': json(identity),
  'user-id-bad-json': json(identity),
  'user-id-number-direct': json(body => body.metadata?.user_id === 17 || `user_id ${JSON.stringify(body.metadata?.user_id)}`),
};
let pass = 0, fail = 0, next = 0;
for (const r of results) {
  let verdict;
  if (r.status !== 200) verdict = `status ${r.status} ${r.body.slice(0, 120)}`;
  else {
    const req = reqs[next++];
    verdict = !req ? 'no upstream request' : CHECKS[r.label](req.rawBody, req.body);
  }
  if (verdict === true) pass++; else fail++;
  console.log(`  ${verdict === true ? 'PASS' : 'FAIL'} ${r.label}${verdict === true ? '' : ': ' + verdict}`);
}
console.log(`values ${pass}/${pass + fail} pass`);
