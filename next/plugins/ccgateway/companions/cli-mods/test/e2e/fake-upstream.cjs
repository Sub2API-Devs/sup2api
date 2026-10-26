// Fake Anthropic upstream over TLS on a unix socket for the workflow audit (r3).
// Records every Messages request (ordered raw headers + body) as req-N.json and
// answers per SCENARIO:
//   text        -> "OK"
//   tool        -> first round: Bash tool_use; after a tool_result: "DONE"
//   subagent    -> main: Agent("LEVEL1: ..."), LEVEL1: Agent("LEVEL2: ..."), else "OK"
//   sub1/2/3    -> main -> LEVEL1 -> ... -> "OK" (1/2/3 subagent levels)
//   bg          -> a background Agent, then the notification turn
//   fork        -> Agent(subagent_type:"fork")
//   aux         -> same as text; records non-/v1/messages paths (404)
//   credit      -> a refusal carrying stop_details.fallback_credit_token
//   credit-slow -> the same, streamed, with CREDIT_DELAY_MS between the first
//                  event and the refusal events (the P2-1 streaming probe)
//   error400    -> 400 with a body and headers outside the core whitelist
// It also serves GET /api/oauth/profile (the Worker's resource-identity probe)
// and writes the profile answer to profile.json, never to a req-N.json.
// Usage: node fake-upstream.cjs <sock> <capture-dir> <cert-dir>
const fs = require('fs'), https = require('https'), path = require('path');
const [sock, dir, certDir] = process.argv.slice(2);
const scenario = process.env.SCENARIO || 'text';
fs.mkdirSync(dir, { recursive: true });
let n = 0;
const CREDIT_TOKEN = 'ccgaudit-credit-token-1';

function sse(res, model, blocks, stop, stopDetails, delay = 0, logDir = '', logId = 0) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'request-id': 'req_ccgaudit' + n });
  const t0 = Date.now();
  const log = type => { if (logDir) fs.appendFileSync(path.join(logDir, 'emit.jsonl'), JSON.stringify({ id: logId, event: type, ms: Date.now() - t0 }) + '\n'); };
  const ev = (type, data) => { log(type); res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`); };
  ev('message_start', { message: { id: 'msg_ccg_audit_' + n, type: 'message', role: 'assistant', model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } });
  const content = () => {
    blocks.forEach((b, i) => {
      if (b.type === 'text') {
        ev('content_block_start', { index: i, content_block: { type: 'text', text: '' } });
        ev('content_block_delta', { index: i, delta: { type: 'text_delta', text: b.text } });
      } else {
        ev('content_block_start', { index: i, content_block: { type: 'tool_use', id: b.id, name: b.name, input: {} } });
        ev('content_block_delta', { index: i, delta: { type: 'input_json_delta', partial_json: JSON.stringify(b.input) } });
      }
      ev('content_block_stop', { index: i });
    });
    const delta = { stop_reason: stop, stop_sequence: null, ...(stopDetails ? { stop_details: stopDetails } : {}) };
    ev('message_delta', { delta, usage: { output_tokens: 1 } });
    ev('message_stop', {});
    res.end();
  };
  if (delay) setTimeout(content, delay); else content();
}

const server = https.createServer({ key: fs.readFileSync(path.join(certDir, 'key.pem')), cert: fs.readFileSync(path.join(certDir, 'cert.pem')) }, (req, res) => {
  const chunks = [];
  req.on('data', d => chunks.push(d)).on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    // The Worker's resource-identity probe: a managed OAuth profile.
    if (req.url.split('?')[0] === '/api/oauth/profile') {
      fs.writeFileSync(path.join(dir, 'profile.json'), JSON.stringify({ method: req.method, url: req.url, headers: req.headers }, null, 1));
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({
        account: { uuid: '00000000-0000-4000-8000-0000000000a1', email_address: 'ccg-audit@example.invalid' },
        organization: { uuid: '00000000-0000-4000-8000-0000000000a2', organization_type: 'claude_max' },
      }));
    }
    const id = ++n;
    let parsed = body; try { parsed = JSON.parse(body); } catch {}
    fs.writeFileSync(path.join(dir, `req-${String(id).padStart(2, '0')}.json`), JSON.stringify({
      index: id, method: req.method, url: req.url,
      rawHeaders: req.rawHeaders, headers: req.headers, body: parsed, rawBody: body,
    }, null, 1));
    if (!req.url.startsWith('/v1/messages') || req.url.includes('count_tokens')) {
      res.writeHead(404, { 'content-type': 'application/json' });
      return res.end('{"type":"error","error":{"type":"not_found_error","message":"fake"}}');
    }
    const b = parsed, text = JSON.stringify(b.messages ?? []);
    if (scenario === 'error400') {
      res.writeHead(400, { 'content-type': 'application/json', 'request-id': 'req_err_probe', 'x-internal-route': 'private', 'set-cookie': 'a=b' });
      return res.end(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'probe error <>&' } }));
    }
    const agent = (b.tools ?? []).find(t => t.name === 'Agent' || t.name === 'Task');
    let blocks = [{ type: 'text', text: 'OK' }];
    let stopDetails;
    if (scenario === 'tool') {
      if (!text.includes('tool_result')) blocks = [{ type: 'tool_use', id: 'toolu_ccgaudit_' + id, name: 'Bash', input: { command: 'echo CCG_TOOL_OK', description: 'echo marker' } }];
      else blocks = [{ type: 'text', text: 'DONE' }];
    } else if (agent && ['sub1', 'sub2', 'sub3', 'bg', 'fork'].includes(scenario)) {
      const classHeader = String(req.headers['x-claude-code-request-class'] || '');
      const toolTurn = text.includes('tool_result');
      const spawn = (prompt, extra = {}) => {
        blocks = [{ type: 'tool_use', id: 'toolu_ccgaudit_' + id, name: agent.name, input: { description: 'probe', prompt, subagent_type: 'general-purpose', run_in_background: false, ...extra } }];
      };
      if (scenario === 'sub1') {
        if (!toolTurn && !text.includes('LEVEL1')) spawn('LEVEL1: reply with the single word OK.');
      } else if (scenario === 'sub2') {
        if (toolTurn || text.includes('LEVEL2')) blocks = [{ type: 'text', text: 'OK' }];
        else if (text.includes('LEVEL1')) spawn('LEVEL2: reply with the single word OK.');
        else if (text.includes('use a subagent')) spawn('LEVEL1: use a subagent to say OK.');
      } else if (scenario === 'sub3') {
        if (toolTurn || text.includes('LEVEL3')) blocks = [{ type: 'text', text: 'OK' }];
        else if (text.includes('LEVEL2')) spawn('LEVEL3: reply with the single word OK.');
        else if (text.includes('LEVEL1')) spawn('LEVEL2: use a subagent to say OK.');
        else if (text.includes('use a subagent')) spawn('LEVEL1: use a subagent to say OK.');
      } else if (scenario === 'bg') {
        if (classHeader === 'subagent' || text.includes('BG:')) blocks = [{ type: 'text', text: 'OK' }];
        else if (!toolTurn) blocks = [{ type: 'tool_use', id: 'toolu_ccgaudit_' + id, name: agent.name, input: { description: 'background probe', prompt: 'BG: reply with the single word OK.', subagent_type: 'general-purpose', run_in_background: true } }];
      } else if (scenario === 'fork') {
        if (classHeader === 'subagent') blocks = [{ type: 'text', text: 'OK' }];
        else if (!toolTurn) blocks = [{ type: 'tool_use', id: 'toolu_ccgaudit_' + id, name: agent.name, input: { description: 'fork probe', prompt: 'FORK: reply with the single word OK.', subagent_type: 'fork' } }];
      }
    } else if (scenario === 'subagent' && agent) {
      if (text.includes('tool_result') || text.includes('LEVEL2')) blocks = [{ type: 'text', text: 'OK' }];
      else if (text.includes('LEVEL1')) blocks = [{ type: 'tool_use', id: 'toolu_ccgaudit_' + id, name: agent.name, input: { description: 'probe', prompt: 'LEVEL2: reply with the single word OK.', subagent_type: 'general-purpose', run_in_background: false } }];
      else if (text.includes('use a subagent')) blocks = [{ type: 'tool_use', id: 'toolu_ccgaudit_' + id, name: agent.name, input: { description: 'probe', prompt: 'LEVEL1: use a subagent to say OK.', subagent_type: 'general-purpose', run_in_background: false } }];
    } else if (scenario === 'credit' || scenario === 'credit-slow') {
      blocks = [{ type: 'text', text: "I can't help with that." }];
      stopDetails = { fallback_credit_token: CREDIT_TOKEN, fallback_has_prefill_claim: false };
      const response = { id: 'msg_ccg_audit_' + id, type: 'message', role: 'assistant', model: b.model, content: blocks, stop_reason: 'refusal', stop_sequence: null, stop_details: stopDetails, usage: { input_tokens: 1, output_tokens: 1 } };
      fs.writeFileSync(path.join(dir, `resp-${String(id).padStart(2, '0')}.json`), JSON.stringify(response, null, 1));
      const delay = scenario === 'credit-slow' ? Number(process.env.CREDIT_DELAY_MS || 1500) : 0;
      if (b.stream) return sse(res, b.model, blocks, 'refusal', stopDetails, delay, dir, id);
      if (delay) return setTimeout(() => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(response)); }, delay);
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(response));
    }
    if (b.stream) return sse(res, b.model, blocks, blocks[0].type === 'tool_use' ? 'tool_use' : 'end_turn');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ id: 'msg_ccg_audit_' + id, type: 'message', role: 'assistant', model: b.model, content: blocks, stop_reason: blocks[0].type === 'tool_use' ? 'tool_use' : 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }));
  });
});
try { fs.unlinkSync(sock); } catch {}
server.listen(sock, () => console.log('listening', sock, 'scenario', scenario));
