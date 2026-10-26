// Decisive test of the CC / non-CC classification (r3, follow-up). Two requests
// carry the same forged Claude Code context headers; only where the billing
// header sits differs. A request CC classifies as its own adopts the client's
// request-class/agent-id; a non-CC request is built as CC's main thread (v28)
// and drops them.
//   billing-second-forged : billing header in the 2nd system block (CC says yes)
//   no-billing-forged     : no billing header at all (non-CC)
//   billing-first-forged  : billing header in the 1st block (control)
// Usage: node noncc3.cjs <messages-url> <build-policy> <policy-file>
const http = require('http'), fs = require('fs');
const [url, low, policyFile] = process.argv.slice(2);
const target = new URL(url);
// A CC client of CLIENT_CC_VERSION (run.sh; default 2.1.304).
const BILLING = `x-anthropic-billing-header: cc_version=${process.env.CLIENT_CC_VERSION || '2.1.304'}.9a4; cc_entrypoint=sdk-cli; cch=12abc;`;
const FORGED = {
  'x-claude-code-request-class': 'subagent', 'x-claude-code-agent-type': 'general-purpose',
  'x-claude-code-agent-id': 'a0123456789abcdef', 'x-claude-code-parent-agent-id': 'afedcba9876543210',
  'x-claude-code-prompt-id': '11111111-2222-4333-8444-555555555555',
};
const body = system => JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 64, system, messages: [{ role: 'user', content: 'Plan the trip.' }] });
const CASES = [
  ['billing-second-forged', body([{ type: 'text', text: 'Answer concisely.' }, { type: 'text', text: BILLING }])],
  ['no-billing-forged', body([{ type: 'text', text: 'Answer concisely.' }])],
  ['billing-first-forged', body([{ type: 'text', text: BILLING }])],
];
const post = ([label, payload]) => new Promise(resolve => {
  try { fs.writeFileSync(policyFile, low); } catch (e) { console.log('policy write ' + e.message); }
  const headers = {
    'content-type': 'application/json', 'anthropic-version': '2023-06-01',
    'x-api-key': 'ccg-audit-gateway-key', 'user-agent': 'anthropic-sdk-python/0.40.0',
    'x-ccgateway-request-policy': low, ...FORGED,
  };
  const req = http.request({ host: target.hostname, port: Number(target.port), path: target.pathname, method: 'POST', headers }, res => {
    const chunks = [];
    res.on('data', d => chunks.push(d)).on('end', () => { console.log(`${label} status=${res.statusCode}`); resolve(); });
  });
  req.on('error', e => { console.log(`${label} error=${e.message}`); resolve(); });
  req.end(payload);
});
(async () => { for (const c of CASES) await post(c); })();
