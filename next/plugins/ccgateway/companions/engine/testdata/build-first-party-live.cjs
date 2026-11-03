// Builds first-party-live-2.1.316.json from the 2026-11-03 live test (account
// 82, CLI v45, the official Claude Code 2.1.316 client connected through a
// custom ANTHROPIC_BASE_URL, Sonnet 4.6): the Worker request logs in
// artifacts/cc-thirdparty/live82/ours/<log>/ (request.body, response.json,
// detail.json). Sanitized, structure kept: the client's tools are dropped
// (the memory does not read them), CC's prompt block is cut short, thinking
// signatures, metadata identifiers, client sessions and upstream request,
// message and tool-use IDs are replaced by fixed fixture values in their own
// formats, consistently across the requests.
//   node build-first-party-live.cjs <live82/ours> <out.json>
const fs = require('fs'), path = require('path');
const [src, out] = process.argv.slice(2);
const cases = [
  ['tool-1', 'a87cab8e'], ['tool-2', '257e57c2'],
  ['spawn-main-1', 'e4bedc06'], ['spawn-sub-1', 'fb980d8d'], ['spawn-sub-2', '28032aa3'], ['spawn-main-2', '8d31e9d2'],
];
const maps = new Map();
const fake = (kind, value, make) => {
  if (!maps.has(kind)) maps.set(kind, new Map());
  const m = maps.get(kind);
  if (!m.has(value)) m.set(value, make(m.size + 1));
  return m.get(value);
};
const pad = (n, w) => String(n).padStart(w, '0');
const ids = text => text
  .replace(/\bmsg_[A-Za-z0-9]{20,}/g, v => fake('msg', v, n => 'msg_011Fixture' + pad(n, 11)))
  .replace(/\breq_[A-Za-z0-9]{20,}/g, v => fake('req', v, n => 'req_011Fixture' + pad(n, 11)))
  .replace(/\btoolu_[A-Za-z0-9]{20,}/g, v => fake('toolu', v, n => 'toolu_01Fixture' + pad(n, 11)))
  .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, v => fake('uuid', v, n => '00000000-0000-4000-8000-' + pad(n, 12)));
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const outValue = {};
    for (const [k, v] of Object.entries(value)) outValue[k] = k === 'signature' ? 'fixture-signature' : sanitize(v);
    return outValue;
  }
  return typeof value === 'string' ? ids(value) : value;
}
const dirs = fs.readdirSync(src);
const result = [];
for (const [name, prefix] of cases) {
  const dir = path.join(src, dirs.find(d => d.startsWith(prefix)));
  const body = JSON.parse(fs.readFileSync(path.join(dir, 'request.body'), 'utf8'));
  const answer = JSON.parse(fs.readFileSync(path.join(dir, 'response.json'), 'utf8'));
  const detail = JSON.parse(fs.readFileSync(path.join(dir, 'detail.json'), 'utf8'));
  delete body.tools;
  body.system = body.system.map((block, i) => i === 2 ? { ...block, text: block.text.slice(0, 120) + ' [cut]' } : block);
  const user = JSON.parse(body.metadata.user_id);
  body.metadata.user_id = JSON.stringify({ device_id: 'f'.repeat(64), account_uuid: user.account_uuid ? '00000000-0000-4000-8000-00000000acc0' : '', session_id: user.session_id });
  const agent = (detail.request_headers['X-Claude-Code-Agent-Id'] ?? [])[0] ?? '';
  result.push(sanitize({
    name, agent_id: agent, request_id: (detail.response_headers['Request-Id'] ?? [])[0],
    body, answer: { id: answer.id, stop_reason: answer.stop_reason, content: answer.content },
  }));
}
fs.writeFileSync(out, JSON.stringify({ provenance: 'Live test 2026-11-03, account 82, CLI v45, official Claude Code 2.1.316 client via a custom base URL (Sonnet 4.6): Worker request logs, sanitized by build-first-party-live.cjs', cases: result }, null, 1) + '\n');
console.log(result.map(c => c.name + ' ' + c.agent_id + ' ' + c.request_id + ' ' + c.answer.id).join('\n'));
