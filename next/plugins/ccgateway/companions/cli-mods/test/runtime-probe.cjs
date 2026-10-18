// Loopback model stub; no real credentials, network model, or shell tool calls.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const http = require('node:http'), { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const [binary, entry, output, scenario = 'normal'] = process.argv.slice(2);
if (!output) throw Error('runtime-probe.cjs bun-or-cli cli.js-or-dash output.json [scenario]');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-native-probe-'));
const fixture = path.join(__dirname, 'fixture');
const record = { scenario, requests: [], results: [], errors: [] };
const settings = path.join(tmp, 'settings.json');
const debugFile = path.join(tmp, 'debug.log');
const hookLog = path.join(tmp, 'hooks.jsonl');
const hookCommand = `'${process.execPath}' '${path.join(__dirname, 'hook-probe.cjs')}' '${hookLog}' '${scenario}'`;
const hooks = Object.fromEntries(['SessionStart', 'PreToolUse', 'PostToolUse', 'PostToolUseFailure'].map(event => [event, [{ matcher: '.*', hooks: [{ type: 'command', command: hookCommand }] }]]));
fs.writeFileSync(settings, JSON.stringify({ hooks }));
const expectedInput = scenario === 'control' ? { command: 'echo CONTROL_MUST_BE_BLOCKED' } : { script: 'echo CLI_MUST_NOT_EXECUTE', extra: { preserve: 42 } };
const names = scenario === 'unhandled' ? ['NativeUnhandled'] : scenario === 'control' ? ['Bash'] : scenario === 'unknown' ? ['UndeclaredTool'] : scenario.startsWith('original') ? ['Bash', 'Read', 'TaskCreate', 'WebFetch'] : ['Bash', 'NativeEcho'];
function reply(res, body, blocks, stop) {
  const message = { id: `msg_probe_${record.requests.length}`, type: 'message', role: 'assistant', model: body.model, content: blocks, stop_reason: stop, stop_sequence: null, usage: { input_tokens: 100, output_tokens: 10 } };
  if (!body.stream) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(message)); return; }
  res.setHeader('content-type', 'text/event-stream');
  const emit = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  emit('message_start', { message: { ...message, content: [], stop_reason: null } });
  blocks.forEach((block, index) => {
    emit('content_block_start', { index, content_block: block.type === 'tool_use' ? { ...block, input: {} } : { type: 'text', text: '' } });
    emit('content_block_delta', { index, delta: block.type === 'tool_use' ? { type: 'input_json_delta', partial_json: JSON.stringify(block.input) } : { type: 'text_delta', text: block.text } });
    emit('content_block_stop', { index });
  });
  emit('message_delta', { delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 10 } });
  emit('message_stop', {}); res.end();
}
const server = http.createServer(async (req, res) => {
  let raw = ''; for await (const bytes of req) raw += bytes;
  let body; try { body = JSON.parse(raw); } catch { body = {}; }
  if (!req.url.startsWith('/v1/messages') || req.url.includes('count_tokens')) { res.end('{"input_tokens":100}'); return; }
  const results = (body.messages ?? []).flatMap(m => Array.isArray(m.content) ? m.content : []).filter(c => c.type === 'tool_result');
  record.requests.push({ tools: body.tools, results });
  record.results = results;
  if (record.requests.length === 1) {
    if (scenario === 'mcp') {
      const legacy = body.tools.find(t => t.name.startsWith('mcp__') && t.name.endsWith('__LegacyEcho'));
      if (legacy) names.push(legacy.name);
    }
    reply(res, body, names.map((name, i) => ({ type: 'tool_use', id: `tool_probe_${i}`, name, input: expectedInput })), 'tool_use');
  }
  else reply(res, body, [{ type: 'text', text: 'PROBE_COMPLETE' }], 'end_turn');
});
server.listen(0, '127.0.0.1', () => {
  const env = { PATH: process.env.PATH, HOME: tmp, CLAUDE_CONFIG_DIR: path.join(tmp, 'config'), ANTHROPIC_API_KEY: 'local-mock-only', ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.address().port}`, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', CCG_PROBE_SCENARIO: scenario };
  const args = [...entry === '-' ? [] : [entry], '--debug-file', debugFile, '--plugin-dir', fixture, '--settings', settings, '--strict-mcp-config', '--no-session-persistence', '--model', 'claude-haiku-4-5-20251001', '--max-turns', '4', '--output-format', 'json'];
  if (scenario === 'disabled') args.push('--tools', '');
  if (scenario === 'denied') args.push('--disallowedTools', 'Bash,NativeEcho');
  if (scenario === 'original-denied') args.push('--disallowedTools', 'Bash,Read,TaskCreate,WebFetch');
  args.push('-p', 'Use the provided tools, then finish.');
  const child = spawn(binary, args, { cwd: tmp, env }); let stdout = '', stderr = '';
  child.stdin.end(); child.stdout.on('data', b => stdout += b); child.stderr.on('data', b => stderr += b);
  const timer = setTimeout(() => child.kill('SIGKILL'), 60000);
  child.on('error', e => record.errors.push(e.message));
  child.on('close', (code, signal) => {
    clearTimeout(timer); Object.assign(record, { code, signal, stdout, stderr });
    try {
      assert.equal(code, 0); assert.ok(record.requests.length >= 2, 'model must receive tool results');
      for (const name of names) {
        const definitions = record.requests[0].tools.filter(t => t.name === name);
        if (scenario === 'unknown' || scenario === 'original-denied') { assert.equal(definitions.length, 0); continue; }
        assert.equal(definitions.length, 1, `${name} advertised once without prefix`);
        if (scenario === 'control' || scenario === 'original') continue;
        if (name.startsWith('mcp__')) assert.equal(definitions[0].description, 'LEGACY_MCP');
        else {
          assert.equal(definitions[0].description, `MOD_NATIVE_${name}`);
          assert.deepEqual(definitions[0].input_schema, { type: 'object', properties: { script: { type: 'string' } }, required: ['script'], additionalProperties: false });
        }
      }
      if (scenario === 'mcp') assert.equal(names.length, 3, 'legacy MCP tool must still register');
      if (scenario === 'reregister') {
        const updated = record.requests[1].tools.filter(t => t.name === 'NativeEcho');
        assert.equal(updated.length, 1);
        assert.equal(updated[0].description, 'MOD_NATIVE_UPDATED');
        assert.deepEqual(updated[0].input_schema.required, ['updated']);
      }
      for (let i = 0; i < names.length; i++) {
        const result = record.results.find(r => r.tool_use_id === `tool_probe_${i}`);
        assert.ok(result, 'missing result');
        const text = typeof result.content === 'string' ? result.content : result.content.map(c => c.text ?? '').join('');
        if (scenario === 'control' || scenario === 'unhandled') assert.ok(result.is_error && text.includes('No tool.call mod handler answered'));
        else if (scenario === 'hooks-deny') assert.ok(result.is_error && text.includes('HOOK_EXPLICIT_DENY'), text);
        else {
          assert.ok(!result.is_error, text);
          const expected = { marker: 'MOD_INTERCEPTED', name: names[i], ...expectedInput, command: null };
          if (scenario === 'hooks-update') expected.script = 'FROM_PREHOOK';
          assert.deepEqual(JSON.parse(text.split('\n\n<system-reminder>')[0]), scenario === 'hooks-update' ? { marker: 'POST_REWRITTEN', name: names[i], original: expected } : expected);
        }
      }
      record.hooks = fs.existsSync(hookLog) ? fs.readFileSync(hookLog, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
      assert.ok(record.hooks.some(h => h.event === 'SessionStart'), 'SessionStart hook must run');
      for (const name of names) {
        const rows = record.hooks.filter(h => h.tool === name);
        assert.equal(rows.filter(h => h.event === 'PreToolUse').length, 1, `${name} pre hook exactly once`);
        const failure = scenario === 'control' || scenario === 'unhandled';
        assert.equal(rows.filter(h => h.event === 'PostToolUse').length, failure || scenario === 'hooks-deny' ? 0 : 1, `${name} post hook count`);
        assert.equal(rows.filter(h => h.event === 'PostToolUseFailure').length, failure ? 1 : 0, `${name} failure hook count`);
      }
      const debugText = fs.existsSync(debugFile) ? fs.readFileSync(debugFile, 'utf8') : '';
      assert.ok(!debugText.includes('Error normalizing tool input'), 'original tool normalization must not run'); record.passed = true;
    } catch (error) { record.errors.push(error.message); record.passed = false; }
    if (!record.passed && fs.existsSync(debugFile)) record.debug = fs.readFileSync(debugFile, 'utf8').split('\n').filter(line => /hook|plugin|error|native/i.test(line)).slice(-40).join('\n');
    fs.writeFileSync(output, JSON.stringify(record, null, 2)); server.close();
    console.log(JSON.stringify({ scenario, passed: record.passed, code, requests: record.requests.length, errors: record.errors.map(e => e.slice(0,300)), debug: record.debug, stderr: stderr.slice(-1000) }));
    process.exitCode = record.passed ? 0 : 1;
  });
});
