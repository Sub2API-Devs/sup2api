// Probe: can a Claude Code mod's $.tool.register replace the SDK MCP adapter
// CCGateway uses for API-client tools? Runs inside an authorized CCGateway app
// container (Claude Code 2.1.288):
//   docker exec -i -e PROBE_CASES=a,b <app> node - < mod-tool-register-probe.cjs
//
// Every case is a real first-party request (the app container's firewall
// drops loopback connections, so a local mock upstream is not reachable).
// Request bodies come from Bun's verbose fetch (BUN_CONFIG_VERBOSE_FETCH=curl).
// That stderr carries credentials: only the --data-raw body is parsed, stderr
// itself is discarded. Bodies are redacted (metadata, session_context, e-mail
// addresses) before anything is written or printed.
// The CLI is driven like the gateway: stream-json, an initialize control
// request (sdkMcpServers only in the SDK baseline), can_use_tool callbacks.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawn } = require('child_process');
const CLI = '/usr/local/bin/claude', MODEL = process.env.PROBE_MODEL || 'claude-opus-5-5', PLUGIN = 'ccgateway';
const root = fs.mkdtempSync('/work/modtool-probe-');
const only = (process.env.PROBE_CASES || '').split(',').filter(Boolean);
const rid = () => crypto.randomUUID();

// ---- the mod under test -------------------------------------------------
const plugin = path.join(root, 'plugin');
fs.mkdirSync(plugin + '/.claude-plugin', { recursive: true });
fs.mkdirSync(plugin + '/hooks');
fs.writeFileSync(plugin + '/.claude-plugin/plugin.json', JSON.stringify({ name: PLUGIN, version: '1.0.0', description: 'mod tool register probe' }));
fs.writeFileSync(plugin + '/hooks/hooks.json', JSON.stringify({ modules: ['./register.js'] }));
// Each hook is self-contained. Observed in 2.1.288: when a hook calls a
// function declared inside register() (arrow or declaration), nothing of the
// module ran, not even writes placed before the call, and no error surfaced;
// a module top-level function and a register-scope `let` counter both work.
const LOG = `const L = await $.env.get('PROBE_LOG'); const log = async o => { if (L) await $.fs.write(L + '.' + Date.now() + '-' + Math.random().toString(16).slice(2), JSON.stringify(o)); };`;
const REGISTER = phase => `
    const file = await $.env.get('PROBE_TOOLS_FILE');
    if (file && ((await $.env.get('PROBE_REGISTER_AT')) || 'session.start') === '${phase}') {
      for (const t of JSON.parse(await $.fs.read(file))) {
        try { await log({ event: 'register', phase: '${phase}', name: t.name, ok: true, value: await $.tool.register(t) }); }
        catch (err) { await log({ event: 'register', phase: '${phase}', name: t.name, ok: false, error: String(err && err.message || err) }); }
      }
      try { await log({ event: 'tool.list', phase: '${phase}', list: (await $.tool.list()).filter(x => x.mcp) }); }
      catch (err) { await log({ event: 'tool.list', phase: '${phase}', error: String(err && err.message || err) }); }
    }`;
fs.writeFileSync(plugin + '/hooks/register.js', `
export function register(on) {
  on('session.start', async ($, e, next) => { ${LOG} await log({ event: 'session.start' }); ${REGISTER('session.start')}
    return next(e); });
  on('prompt.submit', async ($, e, next) => { ${LOG} ${REGISTER('prompt.submit')}
    return next(e); });
  on('prompt.compose', async ($, e, next) => { ${LOG} await log({ event: 'prompt.compose', tools: e.tools }); return next(e); });
  on('tool.describe', async ($, e, next) => { ${LOG}
    const r = await next(e);
    await log({ event: 'tool.describe', tool: e.tool, inIsDeferred: e.isDeferred, provider: e.provider, result: { isDeferred: r.isDeferred, descriptionLength: r.description.length } });
    const file = await $.env.get('PROBE_DEFER_FILE');
    if (!file) return r;
    const d = JSON.parse(await $.fs.read(file));
    return Object.hasOwn(d, e.tool) ? { ...r, isDeferred: d[e.tool] } : r;
  });
  on('tool.call', async ($, e, next) => { ${LOG}
    await log({ event: 'tool.call', e });
    const allow = ((await $.env.get('PROBE_ALLOW')) || '').split(',').filter(Boolean);
    if (allow.includes(e.tool)) return next(e);
    return { deny: 'ccgateway: execution belongs to the API client.' };
  });
}
`);

// ---- tool sets ----------------------------------------------------------
const SET_A = [
  { name: 'get_weather', description: '获取指定城市的天气。Returns current conditions.\n第二行：单位默认摄氏。', inputSchema: { type: 'object', properties: { location: { type: 'object', description: '位置', properties: { city: { type: 'string' }, country: { type: 'string', enum: ['CN', 'US', 'FR'] } }, required: ['city'], additionalProperties: false }, units: { type: 'string', enum: ['celsius', 'fahrenheit'], default: 'celsius' }, days: { type: 'integer', minimum: 1, maximum: 7 } }, required: ['location'], additionalProperties: false } },
  { name: 'lookup_order', description: 'Look up an order by id.', inputSchema: { $schema: 'http://json-schema.org/draft-07/schema#', type: 'object', $defs: { item: { type: 'object', properties: { sku: { type: 'string', pattern: '^[A-Z]{3}-\\d+$' }, qty: { type: 'integer' } }, required: ['sku'] } }, properties: { order_id: { type: 'string' }, items: { type: 'array', items: { $ref: '#/$defs/item' } }, filter: { anyOf: [{ type: 'string' }, { type: 'null' }] }, meta: { type: 'object', additionalProperties: { type: 'string' } } }, required: ['order_id'] } },
  { name: 'empty_desc', description: '', inputSchema: { type: 'object', properties: {} } },
  { name: 'Read', description: 'Client-defined Read: reads a record from the client database.', inputSchema: { type: 'object', properties: { record_id: { type: 'string' } }, required: ['record_id'] } },
  { name: 'mcp__srv__tool', description: 'A client tool whose name already has the MCP form.', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } },
  { name: 'n' + 'x'.repeat(63), description: 'A tool with a 64-character name.', inputSchema: { type: 'object' } },
];
const SET_B = [
  { name: 'search_docs', description: 'Search the documentation.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'get_time', description: 'Get the current time.', inputSchema: { type: 'object', properties: { tz: { type: 'string' } } } },
  { name: 'pinned_tool', description: 'A tool pinned into the prompt list.', inputSchema: { type: 'object', properties: {} } },
];

// ---- redaction and summaries ---------------------------------------------
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
function redact(v, key) {
  if (key === 'metadata' || key === 'session_context') return '[redacted]';
  if (typeof v === 'string') return v.replace(EMAIL, '[redacted-email]');
  if (Array.isArray(v)) return v.map(x => redact(x));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, redact(x, k)]));
  return v;
}
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const short = s => String(s).replace(/\s+/g, ' ').slice(0, 160);
function blockHead(b) {
  if (typeof b === 'string') return short(b);
  const cc = b.cache_control ? ' +cache_control' + JSON.stringify(b.cache_control) : '';
  if (b.type === 'text') return 'text:' + short(b.text) + cc;
  if (b.type === 'tool_use') return `tool_use:${b.name}#${b.id}:${JSON.stringify(b.input)}${cc}`;
  if (b.type === 'tool_result') return `tool_result#${b.tool_use_id}${b.is_error ? ' is_error' : ''}:[${(Array.isArray(b.content) ? b.content : [b.content]).map(c => typeof c === 'string' ? short(c) : c.type === 'text' ? 'text:' + short(c.text) : c.type === 'tool_reference' ? 'tool_reference:' + c.tool_name : '<' + c.type + '>').join(' | ')}]${cc}`;
  return '<' + b.type + '>' + cc;
}
function summarize(body) {
  const tools = (body.tools || []).map(t => ({ name: t.name, extraKeys: Object.keys(t).filter(k => !['name', 'description', 'input_schema'].includes(k)), defer_loading: t.defer_loading, cache_control: t.cache_control, type: t.type }));
  const system = Array.isArray(body.system) ? body.system.map(b => ({ chars: b.text.length, sha: sha(b.text), cache_control: b.cache_control, head: short(b.text).slice(0, 80) })) : body.system;
  return {
    model: body.model, max_tokens: body.max_tokens, tool_choice: body.tool_choice, otherKeys: Object.keys(body).filter(k => !['model', 'messages', 'system', 'tools', 'max_tokens', 'metadata', 'stream', 'thinking', 'tool_choice'].includes(k)),
    toolCount: tools.length, tools, system,
    messages: (body.messages || []).map(m => ({ role: m.role, content: typeof m.content === 'string' ? [short(m.content)] : m.content.map(blockHead) })),
  };
}
const canon = v => JSON.stringify(v);
function compareRegistered(registered, body) {
  return registered.map(t => {
    const ts = body.tools || [];
    const wire = ts.find(w => w.name === t.name) || ts.find(w => w.name === `mcp__${PLUGIN}__${t.name}`);
    if (!wire) return { client: t.name, wire: null };
    const want = t.inputSchema ?? { type: 'object' };
    return { client: t.name, wire: wire.name, nameIdentical: wire.name === t.name, descriptionIdentical: wire.description === t.description, wireDescription: wire.description === t.description ? undefined : wire.description, schemaIdentical: canon(wire.input_schema) === canon(want), wireSchema: canon(wire.input_schema) === canon(want) ? undefined : wire.input_schema, extraKeys: Object.keys(wire).filter(k => !['name', 'description', 'input_schema'].includes(k)) };
  });
}

// ---- one CLI run ----------------------------------------------------------
let realCalls = 0;
function run(name, o) {
  return new Promise(resolve => {
    const dir = path.join(root, name);
    fs.mkdirSync(dir, { recursive: true });
    const log = path.join(dir, 'mod-log');
    const sid = o.resume ? null : rid();
    const env = { ...process.env, PROBE_LOG: log, ENABLE_TOOL_SEARCH: 'false', CLAUDE_CODE_MAX_OUTPUT_TOKENS: '256', DISABLE_AUTOUPDATER: '1', DISABLE_AUTO_COMPACT: '1', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1', CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1', CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION: '0', MAX_THINKING_TOKENS: '0', BUN_CONFIG_VERBOSE_FETCH: 'curl', ...o.env };
    if (o.register) { const f = path.join(dir, 'tools.json'); fs.writeFileSync(f, JSON.stringify(o.register)); env.PROBE_TOOLS_FILE = f; }
    if (o.defer) { const f = path.join(dir, 'defer.json'); fs.writeFileSync(f, JSON.stringify(o.defer)); env.PROBE_DEFER_FILE = f; }
    // Offline: an unresolvable base URL. Bun prints the request before DNS
    // fails, so the body is captured and nothing leaves the container.
    if (o.offline) Object.assign(env, { ANTHROPIC_BASE_URL: 'http://ccg-probe.invalid', _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL: '1' });
    const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--include-partial-messages', '--permission-prompt-tool', 'stdio', '--tools', o.tools ?? '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', '', '--settings', '{"disableAllHooks":false}', '--disable-slash-commands', '--no-chrome', '--max-turns', String(o.maxTurns || 1), '--model', MODEL, '--thinking', 'disabled'];
    if (o.tools === null) args.splice(args.indexOf('--tools'), 2); // the CLI's default tool set
    if (!o.noPlugin) args.push('--plugin-dir', plugin);
    if (o.jsonSchema) args.push('--json-schema', JSON.stringify(o.jsonSchema));
    if (o.extraArgs) args.push(...o.extraArgs);
    if (o.resume) args.push('--resume', o.resume.file, '--resume-session-at', o.resume.anchor);
    else args.push('--session-id', sid);
    const sdk = o.sdk || [];
    const sdkServers = [...new Set(sdk.map(t => sdkName(t.name)[0]))].sort();
    const c = spawn(CLI, args, { cwd: dir, env, stdio: ['pipe', 'pipe', 'pipe'] });
    let buf = '', err = '';
    const frames = [], callbacks = [];
    const write = v => { try { c.stdin.write(JSON.stringify(v) + '\n'); } catch {} };
    const initId = rid();
    write({ type: 'control_request', request_id: initId, request: { subtype: 'initialize', sdkMcpServers: sdkServers, hooks: {}, supportedDialogKinds: [], promptSuggestions: false, excludeDynamicSections: true } });
    c.stdout.on('data', d => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        let f; try { f = JSON.parse(line); } catch { continue; }
        if (f.type === 'control_response' && f.response?.request_id === initId) {
          frames.push({ type: 'init_response', subtype: f.response.subtype, error: f.response.error });
          write({ type: 'user', session_id: sid || o.resume.sid, uuid: rid(), parent_tool_use_id: null, message: { role: 'user', content: o.prompt } });
          continue;
        }
        if (f.type === 'control_request') {
          const q = f.request || {};
          callbacks.push({ subtype: q.subtype, tool_name: q.tool_name, server_name: q.server_name, method: q.message?.method });
          let payload;
          if (q.subtype === 'can_use_tool') payload = (o.allow || []).includes(q.tool_name) ? { behavior: 'allow', updatedInput: q.input } : { behavior: 'deny', message: 'Tools are executed by the API client', toolUseID: q.tool_use_id };
          else if (q.subtype === 'mcp_message') payload = { mcp_response: sdkReply(q, sdk) };
          else { write({ type: 'control_response', response: { subtype: 'error', request_id: f.request_id, error: 'Unsupported callback' } }); continue; }
          write({ type: 'control_response', response: { subtype: 'success', request_id: f.request_id, response: payload } });
          continue;
        }
        frames.push(f);
        if (f.type === 'result') c.stdin.end();
      }
    });
    c.stderr.on('data', d => {
      err += d;
      if (o.offline && /\ncurl [^\n]*\/v1\/messages[^\n]* --data-raw [^\n]*\n/.test('\n' + err)) setTimeout(() => c.kill('SIGTERM'), 3000);
    });
    c.stdin.on('error', () => {});
    const timer = setTimeout(() => c.kill('SIGTERM'), o.offline ? 60000 : 180000);
    c.on('close', status => {
      clearTimeout(timer);
      let bodies = [];
      for (const line of err.split('\n')) {
        if (!line.startsWith('curl ') || !line.includes('/v1/messages')) continue;
        const at = line.indexOf(' --data-raw ');
        if (at >= 0) { try { bodies.push(JSON.parse(JSON.parse(line.slice(at + 12)))); } catch {} }
      }
      if (o.offline) bodies = bodies.slice(0, 1); // retries repeat the same body
      else realCalls += bodies.length;
      err = null; // verbose fetch output carries credentials
      bodies = bodies.map(b => redact(b));
      bodies.forEach((b, i) => fs.writeFileSync(path.join(dir, `upstream-${i + 1}.json`), JSON.stringify(b, null, 2)));
      const init = frames.find(f => f.type === 'system' && f.subtype === 'init');
      const result = frames.find(f => f.type === 'result') || {};
      const sessionId = result.session_id || sid;
      const assistants = frames.filter(f => f.type === 'assistant').flatMap(f => f.message.content.filter(b => b.type === 'tool_use').map(b => ({ name: b.name, id: b.id, input: b.input })));
      const streamToolStarts = frames.filter(f => f.type === 'stream_event' && f.event?.type === 'content_block_start' && f.event.content_block?.type === 'tool_use').map(f => f.event.content_block.name + '#' + f.event.content_block.id);
      const userToolResults = frames.filter(f => f.type === 'user').flatMap(f => (Array.isArray(f.message?.content) ? f.message.content : []).filter(b => b.type === 'tool_result').map(blockHead));
      const projects = path.join(process.env.CLAUDE_CONFIG_DIR, 'projects');
      let transcript = null;
      for (const p of fs.readdirSync(projects)) { const f = path.join(projects, p, sessionId + '.jsonl'); if (fs.existsSync(f)) transcript = f; }
      const rows = transcript ? fs.readFileSync(transcript, 'utf8').trim().split('\n').map(s => JSON.parse(s)) : [];
      const nativeToolUses = rows.filter(r => r.type === 'assistant').flatMap(r => r.message.content.filter(b => b.type === 'tool_use').map(b => ({ uuid: r.uuid, name: b.name, id: b.id })));
      const nativeToolResults = rows.filter(r => r.type === 'user' && Array.isArray(r.message?.content)).flatMap(r => r.message.content.filter(b => b.type === 'tool_result').map(blockHead));
      const lastAssistant = [...rows].reverse().find(r => r.type === 'assistant');
      const modLog = fs.readdirSync(dir).filter(f => f.startsWith('mod-log.')).sort().map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
      const out = {
        case: name, mode: o.offline ? 'offline' : 'real', status, args: args.map(a => a.length > 200 ? a.slice(0, 200) + '...' : a),
        init: init && { tools: init.tools, mcp_servers: init.mcp_servers, plugins: init.plugins?.map(p => p.name) },
        initResponse: frames.find(f => f.type === 'init_response'),
        callbacks, result: { subtype: result.subtype, is_error: result.is_error, result: short(result.result || ''), structured_output: result.structured_output, num_turns: result.num_turns, permission_denials: result.permission_denials },
        streamToolStarts, assistantToolUses: assistants, userToolResults,
        transcript: transcript && path.basename(path.dirname(transcript)) + '/' + path.basename(transcript), nativeToolUses, nativeToolResults,
        modLog,
        upstream: bodies.map(summarize), registeredVsWire: o.register || o.sdk ? compareRegistered(o.register || o.sdk, bodies[0] || {}) : undefined,
        frameTypes: frames.map(f => f.type + (f.subtype ? ':' + f.subtype : '')).filter((t, i, a) => a.indexOf(t) === i),
      };
      Object.defineProperty(out, 'priv', { value: { transcript, sessionId, lastAssistantUuid: lastAssistant?.uuid, nativeToolUses, bodies }, enumerable: false });
      resolve(out);
    });
  });
}

// SDK MCP baseline, the same split the gateway's sdk_mcp.go makes.
function sdkName(name) { const m = /^mcp__([A-Za-z0-9_-]+?)__(.+)$/.exec(name); return m ? [m[1], m[2]] : ['ccgateway', name]; }
function sdkReply(q, tools) {
  const m = q.message || {}, r = { jsonrpc: '2.0', id: m.id };
  if (m.method === 'initialize') r.result = { protocolVersion: m.params?.protocolVersion || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: q.server_name, version: '0.1.0' } };
  else if (m.method === 'tools/list') r.result = { tools: tools.filter(t => sdkName(t.name)[0] === q.server_name).map(t => ({ name: sdkName(t.name)[1], description: t.description, inputSchema: t.inputSchema })) };
  else if (m.method === 'ping' || m.method === 'notifications/initialized') r.result = {};
  else r.error = { code: -32601, message: 'Tool execution belongs to the API client' };
  return r;
}

const W = n => `mcp__${PLUGIN}__${n}`;
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const OK = 'Reply with OK.';
const state = {};
const PARALLEL = [...SET_A.slice(0, 2), SET_A[3]];
const cases = {
  // Real-request baselines: --tools Read mimics typical gateway scenarios where
  // at least one built-in is exposed (e.g. for gateway operations or fallback).
  'A-mod': () => run('A-mod', { register: SET_A, tools: 'Read', prompt: OK }),
  'A-sdk': () => run('A-sdk', { sdk: SET_A, tools: 'Read', prompt: OK }),
  // Offline harness check (Bun prints nothing for a failed DNS lookup, so
  // offline cases only yield the mod's own log: registration results,
  // prompt.compose's tool names, tool.describe placement).
  'A-sdk-offline': () => run('A-sdk-offline', { offline: true, sdk: SET_A, prompt: OK }),
  // Registration against the --tools whitelist (H7).
  'reg-tools-empty': () => run('reg-tools-empty', { offline: true, register: SET_B, prompt: OK }),
  'reg-tools-read': () => run('reg-tools-read', { offline: true, register: SET_B, tools: 'Read', prompt: OK }),
  'reg-tools-read-plus-full': () => run('reg-tools-read-plus-full', { offline: true, register: SET_B, tools: ['Read', ...SET_B.map(t => W(t.name))].join(','), prompt: OK }),
  'reg-tools-read-plus-short': () => run('reg-tools-read-plus-short', { offline: true, register: SET_B, tools: ['Read', ...SET_B.map(t => t.name)].join(','), prompt: OK }),
  'reg-tools-read-plus-glob': () => run('reg-tools-read-plus-glob', { offline: true, register: SET_B, tools: 'Read,mcp__ccgateway__*', prompt: OK }),
  'reg-tools-self': () => run('reg-tools-self', { offline: true, register: SET_B, tools: SET_B.map(t => W(t.name)).join(','), prompt: OK }),
  'reg-tools-default': () => run('reg-tools-default', { offline: true, register: SET_B, tools: null, prompt: OK }),
  'reg-tools-toolsearch-off': () => run('reg-tools-toolsearch-off', { offline: true, register: SET_B, tools: 'ToolSearch', prompt: OK }),
  'reg-disallow-read': () => run('reg-disallow-read', { offline: true, register: SET_B, tools: ['Read', ...SET_B.map(t => W(t.name))].join(','), extraArgs: ['--disallowedTools', 'Read'], prompt: OK }),
  'reg-structured-only': () => run('reg-structured-only', { offline: true, register: SET_B, tools: 'StructuredOutput', jsonSchema: { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'] }, prompt: OK }),
  // H2: another set in a fresh process; registration after session.start.
  'B-mod': () => run('B-mod', { offline: true, register: SET_B, tools: 'Read', prompt: OK }),
  'late-register': () => run('late-register', { offline: true, register: SET_B, tools: 'Read', env: { PROBE_REGISTER_AT: 'prompt.submit' }, prompt: OK }),
  // H7: no tools at all.
  'none': () => run('none', { offline: true, prompt: OK }),
  // H6 offline: placement only.
  'defer-offline': () => run('defer-offline', { offline: true, register: SET_B, tools: 'ToolSearch', env: { ENABLE_TOOL_SEARCH: 'true' }, defer: { [W('search_docs')]: true, [W('pinned_tool')]: false }, prompt: OK }),
  'defer-default-offline': () => run('defer-default-offline', { offline: true, register: SET_B, tools: 'ToolSearch', env: { ENABLE_TOOL_SEARCH: 'true' }, prompt: OK }),
  // H9 offline: StructuredOutput beside registered tools.
  'structured-offline': () => run('structured-offline', { offline: true, register: SET_B, tools: process.env.PROBE_STRUCT_TOOLS ?? 'Read', jsonSchema: { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'] }, prompt: OK }),
  // H3: model's tool_use names; tool.call sees the registered tools' calls.
  // Since registered tools don't appear on the wire, the model can't call them.
  // Instead: allow Read through, verify tool.call sees it with the core name.
  'toolcall-real': () => run('toolcall-real', { register: SET_B, tools: 'Read', allow: ['Read'], env: { PROBE_ALLOW: 'Read' }, prompt: 'Call Read with file_path "/etc/hostname". Do not write any text.' }),
  // H5: resume at assistant with tool_results; since registered tools don't go
  // to the API, we can't get genuine client tool_use from the model. Skip.
  // H6: ToolSearch discovering a registered tool. Since registered tools don't
  // appear in prompt.compose, ToolSearch won't find them. Skip real case.
  // H9: --json-schema's StructuredOutput beside registered tools.
  'structured-real': () => run('structured-real', { register: SET_B, allow: ['StructuredOutput'], maxTurns: 2, env: { PROBE_ALLOW: 'StructuredOutput' }, jsonSchema: { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'] }, prompt: 'Return answer "ok".' }),
};

(async () => {
  const results = [];
  for (const [name, fn] of Object.entries(cases)) {
    if (only.length && !only.includes(name)) continue;
    if (results.some(r => r.case === name)) continue;
    const r = await fn();
    results.push(r);
    if (state.parallel && !results.includes(state.parallel)) results.push(state.parallel);
    console.error(JSON.stringify({ case: r.case, status: r.status, result: r.result.subtype, upstream: r.upstream.length, realCalls }));
  }
  // Body comparisons: Mod registration against the SDK MCP baseline, and the
  // offline harness against a real request.
  const systemDiff = {};
  for (const [x, y] of [['A-mod', 'A-sdk'], ['reg-tools-read', 'sdk-tools-read'], ['A-sdk', 'A-sdk-offline']]) {
    const a = results.find(r => r.case === x), b = results.find(r => r.case === y);
    if (!(a && b && a.priv.bodies[0] && b.priv.bodies[0])) continue;
    const A = a.priv.bodies[0], B = b.priv.bodies[0];
    const lines = z => (Array.isArray(z.system) ? z.system.map(s => s.text).join('\n') : String(z.system)).split('\n');
    const la = lines(A), lb = lines(B);
    const byName = z => [...(z.tools || [])].sort((p, q) => p.name < q.name ? -1 : 1);
    const msgs = z => canon(z.messages).replace(/modtool-probe-[A-Za-z0-9]+\/[A-Za-z-]+/g, 'DIR');
    systemDiff[x + ' vs ' + y] = { systemIdentical: canon(A.system) === canon(B.system), onlyFirst: la.filter(l => !lb.includes(l)).map(short), onlySecond: lb.filter(l => !la.includes(l)).map(short), toolsIdentical: canon(A.tools) === canon(B.tools), toolsIdenticalIgnoringOrder: canon(byName(A)) === canon(byName(B)), toolOrderFirst: (A.tools || []).map(t => t.name), toolOrderSecond: (B.tools || []).map(t => t.name), messagesIdenticalIgnoringDir: msgs(A) === msgs(B), otherKeysIdentical: canon(Object.keys(A)) === canon(Object.keys(B)) };
  }
  fs.writeFileSync(path.join(root, 'results.json'), JSON.stringify({ realCalls, systemDiff, results }, null, 2));
  console.log(JSON.stringify({ root, realCalls, systemDiff, results }, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
