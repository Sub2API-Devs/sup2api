// Round-2 non-CC probes (r3). Every case is B side only, one POST each, in a
// fixed order so req-N.json can be addressed by label:
//   identity2  the identity generator's edge inputs (empty, {}, unknown-only,
//              the same first message twice, a later turn of that conversation)
//   context2   a CC-shaped User-Agent without a billing header, and a billing
//              header that is not the first system block
//   probe      the Worker's own /v1/ccgateway/probe endpoint
// Usage: node noncc2.cjs <messages-url> <build-policy> <direct-policy> <mode>
const http = require('http'), fs = require('fs');
const [url, low, none, mode, policyFile] = process.argv.slice(2);
const target = new URL(url);
const M = { model: 'claude-opus-4-8', max_tokens: 64 };
const msg = (content, extra) => JSON.stringify({ ...M, system: 'Answer concisely.', messages: [{ role: 'user', content }], ...extra });

const IDENTITY2 = [
  ['empty-string', msg('Plan the trip.', { metadata: { user_id: '' } }), low, {}],
  ['empty-object', msg('Plan the trip.', { metadata: { user_id: {} } }), low, {}],
  ['unknown-only', msg('Plan the trip.', { metadata: { user_id: { device_id_other: 'x' } } }), low, {}],
  ['collision-a', msg('Same opening.', { metadata: { extra: 'kept' } }), low, {}],
  ['collision-b', msg('Same opening.'), low, {}],
  ['later-turn', JSON.stringify({ ...M, system: 'Answer concisely.', metadata: { extra: 'kept' }, messages: [
    { role: 'user', content: 'Same opening.' }, { role: 'assistant', content: 'Sure.' }, { role: 'user', content: 'Go on.' }] }), low, {}],
];

// A CC client of CLIENT_CC_VERSION (run.sh; default 2.1.304): keep it equal across compared runs.
const CLIENT_VERSION = process.env.CLIENT_CC_VERSION || '2.1.304';
const BILLING = `x-anthropic-billing-header: cc_version=${CLIENT_VERSION}.9a4; cc_entrypoint=sdk-cli; cch=12abc;`;
const CC_UA = `claude-cli/${CLIENT_VERSION} (external, sdk-cli)`;
const CONTEXT2 = [
  ['cc-ua-no-billing', msg('Plan the trip.'), low, { 'user-agent': CC_UA }],
  ['billing-not-first', JSON.stringify({ ...M, system: [{ type: 'text', text: 'Answer concisely.' }, { type: 'text', text: BILLING }], messages: [{ role: 'user', content: 'Plan the trip.' }] }), low, {}],
  ['billing-first', JSON.stringify({ ...M, system: [{ type: 'text', text: BILLING + '\nYou are a Claude agent, built on Anthropic\'s Claude Agent SDK.' }], messages: [{ role: 'user', content: 'Plan the trip.' }] }), low, {}],
  ['direct-cc-ua-no-billing', msg('Plan the trip.'), none, { 'user-agent': CC_UA }],
];

const posts = mode === 'identity2' ? IDENTITY2 : mode === 'context2' ? CONTEXT2 : [];
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

if (mode === 'probe') {
  // The Worker's probe endpoint: the same request shape as a model request,
  // answered by the Worker (no upstream call).
  const body = msg('Plan the trip.');
  const headers = {
    'content-type': 'application/json', 'anthropic-version': '2023-06-01',
    'x-api-key': 'ccg-audit-gateway-key', 'x-ccgateway-request-policy': low,
  };
  const req = http.request({ host: target.hostname, port: Number(target.port), path: '/v1/ccgateway/probe', method: 'POST', headers }, res => {
    const chunks = [];
    res.on('data', d => chunks.push(d)).on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      require('fs').writeFileSync(process.env.PROBE_OUT || '/t/cap2/probe/client.json', JSON.stringify({ status: res.statusCode, headers: res.headers, body: text }, null, 1));
      console.log(`probe status=${res.statusCode} body=${text.slice(0, 160).replace(/\n/g, ' ')}`);
    });
  });
  req.on('error', e => console.log(`probe error=${e.message}`));
  req.end(body);
} else {
  (async () => { for (const p of posts) await post(p); })();
}
