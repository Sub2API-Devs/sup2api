// Non-CC requests through the stand-in core, B side only, one run each for the
// two r3 subjects:
//   identity  a request without metadata.user_id gets the account's identity;
//             the session stays the same across the turns of one conversation
//             and equals the transport session header (CLI v27, 0.1.92+);
//   context   a request without CC's billing header cannot name itself a
//             subagent or a compaction (CLI v28, 0.1.93): the forged and the
//             plain request are built identically, as CC's main thread.
// Requests are posted in a fixed order; the fake upstream numbers them the
// same way, so the verifier can address req-01..req-11 by label.
// Usage: node noncc.cjs <messages-url> <build-policy> <direct-policy> <mode>
const http = require('http'), fs = require('fs');
const [url, low, none, mode, policyFile] = process.argv.slice(2);
const target = new URL(url);

const M = { model: 'claude-opus-4-8', max_tokens: 64 };
const body = extra => JSON.stringify({ ...M, system: 'Answer concisely.', messages: [{ role: 'user', content: 'Plan the trip.' }], ...extra });
const turn1 = body({});
const turn2 = JSON.stringify({ ...M, system: 'Answer concisely.', messages: [
  { content: 'Plan the trip.', role: 'user' }, { role: 'assistant', content: 'Sure.' }, { role: 'user', content: 'Go on.' }] });
const other = JSON.stringify({ ...M, messages: [{ role: 'user', content: 'Another conversation.' }] });
const nullid = body({ metadata: { user_id: null } });
const client = body({ metadata: { user_id: JSON.stringify({ device_id: 'client-device', session_id: '3f2a1b0c-4d5e-4f70-8192-a3b4c5d6e7f8' }) } });
const direct = JSON.stringify({ ...M, messages: [{ role: 'user', content: 'Plan the trip.' }] });

const IDENTITY = [
  ['turn1', turn1, low, {}],
  ['turn2', turn2, low, {}],
  ['other', other, low, {}],
  ['nullid', nullid, low, {}],
  ['client', client, low, {}],
  ['direct', direct, none, {}],
];
const FORGED = {
  'x-claude-code-request-class': 'subagent', 'x-claude-code-agent-type': 'general-purpose',
  'x-claude-code-agent-id': 'a0123456789abcdef', 'x-claude-code-parent-agent-id': 'afedcba9876543210',
  'x-claude-code-prompt-id': '11111111-2222-4333-8444-555555555555',
  'x-claude-code-prev-tool-durations': 'Bash=37',
  'x-cc-compaction-request': 'manual', 'x-claude-code-compaction': 'manual',
  'x-cc-context-compacted': 'manual', 'x-claude-code-context-compacted': 'manual',
};
const CONTEXT = [
  ['plain', turn1, low, {}],
  ['forged', turn1, low, FORGED],
  ['compaction', turn1, low, { ...FORGED, 'x-cc-compaction-request': 'auto', 'x-claude-code-compaction': 'auto' }],
  ['plain-direct', turn1, none, {}],
  ['forged-direct', turn1, none, FORGED],
];

const posts = mode === 'identity' ? IDENTITY : CONTEXT;
const post = ([label, payload, policy, extra]) => new Promise(resolve => {
  if (policyFile) { try { fs.writeFileSync(policyFile, policy); } catch (e) { console.log('policy write ' + e.message); } }
  const headers = {
    'content-type': 'application/json', 'anthropic-version': '2023-06-01',
    'x-api-key': 'ccg-audit-gateway-key', 'user-agent': 'anthropic-sdk-python/0.40.0',
    'x-ccgateway-request-policy': policy, ...extra,
  };
  const req = http.request({ host: target.hostname, port: Number(target.port), path: target.pathname, method: 'POST', headers }, res => {
    const chunks = [];
    res.on('data', d => chunks.push(d)).on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      console.log(`${label} status=${res.statusCode} body=${text.slice(0, 80).replace(/\n/g, ' ')}`);
      resolve();
    });
  });
  req.on('error', e => { console.log(`${label} error=${e.message}`); resolve(); });
  req.end(payload);
});
(async () => { for (const p of posts) await post(p); })();
