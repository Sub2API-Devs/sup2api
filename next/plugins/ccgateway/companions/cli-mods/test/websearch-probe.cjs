// Observe the original CLI's WebSearch wrapper against a loopback-only model.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');
const { spawn } = require('node:child_process'), assert = require('node:assert/strict');
const [binary, output] = process.argv.slice(2);
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-websearch-probe-'));
const record = { requests: [] };
function reply(res, body, content, stop, search = false) {
  const message = { id: 'msg_' + record.requests.length, type: 'message', role: 'assistant', model: body.model, content, stop_reason: stop, stop_sequence: null, usage: { input_tokens: 100, output_tokens: 10, ...(search ? { server_tool_use: { web_search_requests: 1 } } : {}) } };
  if (!body.stream) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(message)); return; }
  res.setHeader('content-type', 'text/event-stream');
  const emit = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  emit('message_start', { message: { ...message, content: [], stop_reason: null } });
  content.forEach((block, index) => {
    const tool = block.type === 'tool_use' || block.type === 'server_tool_use';
    emit('content_block_start', { index, content_block: tool ? { ...block, input: {} } : block.type === 'text' ? { type: 'text', text: '' } : block });
    if (tool) emit('content_block_delta', { index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) } });
    if (block.type === 'text') emit('content_block_delta', { index, delta: { type: 'text_delta', text: block.text } });
    emit('content_block_stop', { index });
  });
  emit('message_delta', { delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 10 } }); emit('message_stop', {}); res.end();
}
const server = http.createServer(async (req, res) => {
  let raw = ''; for await (const chunk of req) raw += chunk;
  let body; try { body = JSON.parse(raw); } catch { body = {}; }
  if (!req.url.startsWith('/v1/messages') || req.url.includes('count_tokens')) { res.end('{"input_tokens":100}'); return; }
  record.requests.push(body);
  if (body.tools?.some(tool => tool.type === 'web_search_20250305')) {
    reply(res, body, [
      { type: 'server_tool_use', id: 'server_search', name: 'web_search', input: { query: 'fixture query' } },
      { type: 'web_search_tool_result', tool_use_id: 'server_search', content: [{ type: 'web_search_result', url: 'https://example.test/search-result', title: 'Fixture title', encrypted_content: 'opaque-fixture' }] },
      { type: 'text', text: 'SEARCH_SUMMARY_SENTINEL' },
    ], 'end_turn', true);
  } else if (record.requests.length === 1) reply(res, body, [{ type: 'tool_use', id: 'local_search', name: 'WebSearch', input: { query: 'fixture query', allowed_domains: ['example.test'] } }], 'tool_use');
  else reply(res, body, [{ type: 'text', text: 'DONE' }], 'end_turn');
});
server.listen(0, '127.0.0.1', () => {
  const env = { PATH: process.env.PATH, HOME: home, CLAUDE_CONFIG_DIR: path.join(home, 'config'), ANTHROPIC_API_KEY: 'mock-only', ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.address().port}`, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' };
  const child = spawn(binary, ['-p', 'Search the web.', '--tools', 'WebSearch', '--allowedTools', 'WebSearch', '--strict-mcp-config', '--no-session-persistence', '--model', 'claude-haiku-4-5-20251001', '--max-turns', '4', '--output-format', 'json'], { cwd: home, env });
  let stdout = '', stderr = ''; child.stdin.end(); child.stdout.on('data', b => stdout += b); child.stderr.on('data', b => stderr += b);
  const timer = setTimeout(() => child.kill('SIGKILL'), 45000);
  child.on('close', (code, signal) => {
    clearTimeout(timer); Object.assign(record, { code, signal, stdout, stderr });
    try {
      assert.equal(code, 0, stderr);
      const side = record.requests.find(r => r.tools?.some(t => t.type === 'web_search_20250305'));
      assert.ok(side, 'original CLI must send a server-search side request');
      const tool = side.tools.find(t => t.type === 'web_search_20250305');
      assert.equal(tool.name, 'web_search'); assert.equal(tool.max_uses, 8); assert.deepEqual(tool.allowed_domains, ['example.test']);
      assert.deepEqual(side.tool_choice, { type: 'tool', name: 'web_search' });
      const results = record.requests.flatMap(r => (r.messages ?? []).flatMap(m => Array.isArray(m.content) ? m.content : [])).filter(b => b.type === 'tool_result' && b.tool_use_id === 'local_search');
      assert.ok(results.some(r => JSON.stringify(r).includes('https://example.test/search-result') && JSON.stringify(r).includes('SEARCH_SUMMARY_SENTINEL')));
      record.passed = true; record.observation = { requests: record.requests.length, serverTool: tool, toolChoice: side.tool_choice, returnsLinksAndSummary: true };
    } catch (error) { record.passed = false; record.error = String(error); }
    fs.writeFileSync(output, JSON.stringify(record, null, 2)); server.close();
    console.log(JSON.stringify({ passed: record.passed, error: record.error, observation: record.observation, stderr })); process.exitCode = record.passed ? 0 : 1;
  });
});
