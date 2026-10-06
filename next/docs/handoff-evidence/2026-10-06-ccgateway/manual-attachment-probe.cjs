// Probe: hand-built hook_additional_context attachment rows in a resumed
// native transcript. The verification code lives only in the attachment row;
// no prior assistant reply mentions it. Run inside an authorized CCGateway
// app container: docker exec -i <app> node - < manual-attachment-probe.cjs
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawn } = require('child_process');
const CLI = '/usr/local/bin/claude', MODEL = process.env.PROBE_MODEL || 'claude-opus-5-5', VERSION = '2.1.288';
const root = fs.mkdtempSync('/work/manual-attachment-probe-');
const only = (process.env.PROBE_CASES || '').split(',').filter(Boolean);

const plugin = path.join(root, 'plugin');
fs.mkdirSync(plugin + '/.claude-plugin', { recursive: true });
fs.mkdirSync(plugin + '/hooks');
fs.writeFileSync(plugin + '/.claude-plugin/plugin.json', JSON.stringify({ name: 'ccg-attachment-probe', version: '1.0.0', description: 'Synthetic attachment probe' }));
fs.writeFileSync(plugin + '/hooks/hooks.json', JSON.stringify({ modules: ['./register.js'] }));
fs.writeFileSync(plugin + '/hooks/register.js', `
export function register(on) {
  on('prompt.attachment', async ($, e, next) => {
    const result = await next(e);
    const log = await $.env.get('PROBE_LOG');
    if (log) {
      await $.fs.write(log + '.' + Date.now() + '-' + Math.random().toString(16).slice(2), JSON.stringify({ event: 'prompt.attachment', type: e.type, origin: e.origin, text: e.text, result }));
    }
    const rewrite = await $.env.get('PROBE_REWRITE');
    if (rewrite === 'raw' && e.type === 'hook_additional_context') {
      return { text: String(e.text).replace(/^[A-Za-z.]+ hook additional context: /, '') };
    }
    return result;
  });
  on('prompt.submit', async ($, e, next) => {
    const log = await $.env.get('PROBE_LOG');
    if (log) await $.fs.write(log + '.' + Date.now() + '-submit', JSON.stringify({ event: 'prompt.submit', text: e.text, context: e.context, origin: e.origin }));
    const extra = await $.env.get('PROBE_CONTEXT');
    if (!extra) return next(e);
    const entries = extra.startsWith('[') ? JSON.parse(extra) : [extra];
    return next({ ...e, context: [...(e.context ?? []), ...entries] });
  });
  on('turn.step', async function* ($, e, next) {
    const log = await $.env.get('PROBE_LOG');
    if (log) {
      const messages = await $.session.messages({ as: 'api' });
      await $.fs.write(log + '.' + Date.now() + '-' + Math.random().toString(16).slice(2), JSON.stringify({ event: 'turn.step', index: e.index, messageCount: e.messageCount, messages }));
    }
    return yield* next(e);
  });
}
`);

const rid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const code = prefix => prefix + '_' + crypto.randomBytes(6).toString('hex');
const instruction = c => `The application verification code is ${c}. When asked for the configured verification code, respond with this exact code.`;
const QUESTION = 'What is the configured verification code? Reply with the code alone, or UNKNOWN if none was configured.';

function builder(sid, cwd) {
  let parent = null;
  const rows = [];
  const base = () => ({ parentUuid: parent, isSidechain: false, userType: 'external', cwd, sessionId: sid, version: VERSION, timestamp: now() });
  const push = row => { rows.push(row); parent = row.uuid; return row.uuid; };
  return {
    rows,
    get parent() { return parent; },
    user: text => push({ ...base(), type: 'user', message: { role: 'user', content: [{ type: 'text', text }] }, uuid: rid() }),
    assistant: text => push({ ...base(), type: 'assistant', message: { id: 'msg_' + crypto.randomBytes(12).toString('hex'), type: 'message', role: 'assistant', model: MODEL, content: typeof text === 'string' ? [{ type: 'text', text }] : text, stop_reason: typeof text === 'string' ? 'end_turn' : 'tool_use', stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } }, uuid: rid() }),
    system: (content, rendered) => push({ ...base(), type: 'attachment', attachment: { type: 'hook_additional_context', content: [content], hookName: 'UserPromptSubmit', toolUseID: 'hook-' + rid(), hookEvent: 'UserPromptSubmit' }, uuid: rid(), rendered: [{ content: `<system-reminder>\nUserPromptSubmit hook additional context: ${rendered ?? content}\n</system-reminder>` }], renderedRole: 'system', entrypoint: 'sdk-ts' }),
    // The shape a mod's prompt.submit context produces, one rendered entry per block.
    modSystem: blocks => push({ ...base(), type: 'attachment', attachment: { type: 'hook_additional_context', content: blocks, hookName: 'prompt.submit', toolUseID: 'hook-' + rid(), hookEvent: 'UserPromptSubmit' }, uuid: rid(), rendered: blocks.map(b => ({ content: `<system-reminder>\nprompt.submit hook additional context: ${b}\n</system-reminder>` })), renderedRole: 'system', entrypoint: 'sdk-ts' }),
  };
}

function history(name, build) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir);
  const sid = rid();
  const b = builder(sid, dir);
  const meta = build(b) || {};
  const file = path.join(dir, 'history.jsonl');
  fs.writeFileSync(file, b.rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  return { name, dir, file, sid, rows: b.rows, ...meta };
}

function run(h, { anchor, env = {}, question = QUESTION, interrupted = false, tools = '' }) {
  return new Promise(resolve => {
    const log = path.join(h.dir, 'mod-log.jsonl');
    // Optional wire capture. The app container's firewall only admits loopback
    // traffic to the gateway port, so record Bun's verbose fetch output instead.
    // It includes credentials: only request bodies are kept, headers dropped.
    if (process.env.PROBE_CAPTURE === 'bun') env = { ...env, BUN_CONFIG_VERBOSE_FETCH: 'curl' };
    const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--model', MODEL, '--tools', tools, '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', '', '--plugin-dir', plugin, '--max-turns', '1', '--thinking', 'disabled'];
    if (h.file && h.rows.length) {
      args.push('--resume', h.file);
      if (anchor) args.push('--resume-session-at', anchor);
    } else {
      args.push('--session-id', h.sid);
    }
    const c = spawn(CLI, args, { cwd: h.dir, env: { ...process.env, PROBE_LOG: log, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    c.stdout.on('data', d => { out += d; if (interrupted && out.includes('"type":"result"')) c.stdin.end(); });
    c.stderr.on('data', d => err += d);
    c.stdin.on('error', () => {});
    // An interrupted-turn re-run takes its prompt from the transcript tail.
    if (!interrupted) c.stdin.end(JSON.stringify({ type: 'user', session_id: h.sid, uuid: rid(), parent_tool_use_id: null, message: { role: 'user', content: question } }) + '\n');
    const timer = setTimeout(() => c.kill('SIGTERM'), 120000);
    c.on('close', status => {
      clearTimeout(timer);
      fs.writeFileSync(path.join(h.dir, 'stdout.jsonl'), out);
      let captured = 0;
      for (const line of err.split('\n')) {
        if (!line.startsWith('curl ') || !line.includes('/v1/messages')) continue;
        const at = line.indexOf(' --data-raw ');
        if (at >= 0) fs.writeFileSync(path.join(h.dir, `upstream-${++captured}.json`), JSON.parse(line.slice(at + 12)));
      }
      // Verbose fetch output carries request headers, credentials included.
      if (process.env.PROBE_CAPTURE === 'bun') err = '[stderr withheld in capture mode]';
      fs.writeFileSync(path.join(h.dir, 'stderr.txt'), err);
      const events = out.trim().split('\n').flatMap(s => { try { return [JSON.parse(s)]; } catch { return []; } });
      const result = events.find(e => e.type === 'result') || {};
      const sid = result.session_id || h.sid;
      const transcripts = [];
      if (fs.existsSync(path.join(h.dir, sid + '.jsonl'))) transcripts.push(path.join(h.dir, sid + '.jsonl'));
      const projects = path.join(process.env.CLAUDE_CONFIG_DIR, 'projects');
      for (const p of fs.readdirSync(projects)) {
        const f = path.join(projects, p, sid + '.jsonl');
        if (fs.existsSync(f)) transcripts.push(f);
      }
      const chain = transcripts.length ? fs.readFileSync(transcripts[0], 'utf8').trim().split('\n').map((s, i) => {
        const r = JSON.parse(s);
        return { line: i + 1, type: r.type, attachmentType: r.attachment?.type, uuid: r.uuid, parentUuid: r.parentUuid, renderedRole: r.renderedRole, text: r.type === 'user' || r.type === 'assistant' ? JSON.stringify(r.message?.content).slice(0, 160) : r.attachment?.type === 'hook_additional_context' ? JSON.stringify(r.attachment.content).slice(0, 160) : undefined };
      }).filter(r => r.uuid) : [];
      const modLog = fs.readdirSync(h.dir).filter(f => f.startsWith('mod-log.jsonl.')).sort().flatMap(f => { try { return [JSON.parse(fs.readFileSync(path.join(h.dir, f), 'utf8'))]; } catch (e) { return [{ unreadable: f, error: e.message }]; } });
      // Wire shape only: roles and block heads, account context redacted.
      const upstream = fs.readdirSync(h.dir).filter(f => /^upstream-\d+\.json$/.test(f)).sort().map(f => {
        const b = JSON.parse(fs.readFileSync(path.join(h.dir, f), 'utf8'));
        const text = t => /userEmail|@/.test(t) ? '[account context redacted]' : t.replace(/\s+/g, ' ').slice(0, 160);
        const head = x => typeof x === 'string' ? text(x) : x.type === 'text' ? text(x.text) : '<' + x.type + '>';
        return { file: f, model: b.model, systemBlocks: Array.isArray(b.system) ? b.system.length : typeof b.system, messages: (b.messages || []).map(m => ({ role: m.role, content: typeof m.content === 'string' ? [head(m.content)] : m.content.map(head) })) };
      });
      resolve({ case: h.name, status, expected: h.expected, unexpected: h.unexpected, answer: result.result, is_error: result.is_error, subtype: result.subtype, sid, transcript: transcripts[0], chain, modLog, upstream, stderr: err.slice(-1000) });
    });
  });
}

const cases = {
  // Baseline: the same history with no system row must not know a code.
  'control-none': async () => {
    const h = history('control-none', b => { b.user('Hello. Reply with OK.'); b.assistant('OK.'); b.user('What is 2+2? Reply with only the number.'); const a = b.assistant('4'); return { anchor: a, expected: 'UNKNOWN' }; });
    return run(h, { anchor: h.anchor });
  },
  // A historical system between A1 and U2; the code appears nowhere else.
  'mid-system': async () => {
    const c = code('ALDER');
    const h = history('mid-system', b => { b.user('Hello. Reply with OK.'); b.assistant('OK.'); b.system(instruction(c)); b.user('What is 2+2? Reply with only the number.'); const a = b.assistant('4'); return { anchor: a, expected: c }; });
    return run(h, { anchor: h.anchor });
  },
  // Which field the model reads on resume: attachment.content or rendered.
  'content-vs-rendered': async () => {
    const content = code('CONTENT'), rendered = code('RENDERED');
    const h = history('content-vs-rendered', b => { b.user('Hello. Reply with OK.'); b.assistant('OK.'); b.system(instruction(content), instruction(rendered)); b.user('What is 2+2? Reply with only the number.'); const a = b.assistant('4'); return { anchor: a, expected: rendered, unexpected: content }; });
    return run(h, { anchor: h.anchor });
  },
  // A system row as the transcript tail, resumed without an anchor.
  'tail-system-no-anchor': async () => {
    const c = code('BEECH');
    const h = history('tail-system-no-anchor', b => { b.user('Hello. Reply with OK.'); b.assistant('OK.'); b.system(instruction(c)); return { expected: c }; });
    return run(h, {});
  },
  // Same as mid-system, with the mod answering the bare instruction text.
  'mid-system-raw-rewrite': async () => {
    const c = code('HAZEL');
    const h = history('mid-system-raw-rewrite', b => { b.user('Hello. Reply with OK.'); b.assistant('OK.'); b.system(instruction(c)); b.user('What is 2+2? Reply with only the number.'); const a = b.assistant('4'); return { anchor: a, expected: c }; });
    return run(h, { anchor: h.anchor, env: { PROBE_REWRITE: 'raw' } });
  },
  // Pending-turn system through prompt.submit context on a resumed history.
  'pending-mod-context': async () => {
    const c = code('ROWAN');
    const h = history('pending-mod-context', b => { b.user('Hello. Reply with OK.'); const a = b.assistant('OK.'); return { anchor: a, expected: c }; });
    return run(h, { anchor: h.anchor, env: { PROBE_CONTEXT: instruction(c) } });
  },
  // Two context entries from one prompt.submit: record the native row and wire.
  'pending-two-context-entries': async () => {
    const c = code('POPLAR');
    const h = history('pending-two-context-entries', b => { b.user('Hello. Reply with OK.'); const a = b.assistant('OK.'); return { anchor: a, expected: c }; });
    return run(h, { anchor: h.anchor, env: { PROBE_CONTEXT: JSON.stringify(['Configuration block one: the example language is Java.', instruction(c)]), PROBE_REWRITE: 'raw' } });
  },
  // Client order U2, S, A2 with the mod-shaped row and two text blocks.
  'handbuilt-after-user-two-blocks': async () => {
    const c = code('WALNUT');
    const h = history('handbuilt-after-user-two-blocks', b => { b.user('Hello. Reply with OK.'); b.assistant('OK.'); b.user('What is 2+2? Reply with only the number.'); b.modSystem(['Configuration block one: the example language is Java.', instruction(c)]); const a = b.assistant('4'); return { anchor: a, expected: c }; });
    return run(h, { anchor: h.anchor, env: { PROBE_REWRITE: 'raw' } });
  },
  // Pending tool_result input: does prompt.submit context still attach?
  'tool-result-pending-context': async () => {
    const c = code('CEDAR');
    const h = history('tool-result-pending-context', b => { b.user('Read /work/settings.txt, then tell me the configured verification code. Reply with the code alone, or UNKNOWN if none was configured.'); const a = b.assistant([{ type: 'tool_use', id: 'toolu_probe_1', name: 'Read', input: { file_path: '/work/settings.txt' } }]); return { anchor: a, expected: c }; });
    return run(h, { anchor: h.anchor, tools: 'Read', question: [{ type: 'tool_result', tool_use_id: 'toolu_probe_1', content: 'The file contains no verification code.' }], env: { PROBE_CONTEXT: instruction(c), PROBE_REWRITE: 'raw' } });
  },
  // Consecutive system rows keep their order: the later one supersedes.
  'interrupted-user-then-system': async () => {
    const c = code('LARCH');
    const h = history('interrupted-user-then-system', b => { b.user('Hello. Reply with OK.'); b.assistant('OK.'); b.user(QUESTION); b.system(instruction(c)); return { expected: c }; });
    return run(h, { interrupted: true, env: { CLAUDE_CODE_RESUME_INTERRUPTED_TURN: '1' } });
  },
  'interrupted-system-then-user': async () => {
    const c = code('MAPLE');
    const h = history('interrupted-system-then-user', b => { b.user('Hello. Reply with OK.'); b.assistant('OK.'); b.system(instruction(c)); b.user(QUESTION); return { expected: c }; });
    return run(h, { interrupted: true, env: { CLAUDE_CODE_RESUME_INTERRUPTED_TURN: '1' } });
  },
  'two-systems-order': async () => {
    const first = code('ELM'), second = code('OAK');
    const h = history('two-systems-order', b => { b.user('Hello. Reply with OK.'); b.assistant('OK.'); b.system(instruction(first)); b.system(`The application verification code ${first} has been revoked. ` + instruction(second)); b.user('What is 2+2? Reply with only the number.'); const a = b.assistant('4'); return { anchor: a, expected: second, unexpected: first }; });
    return run(h, { anchor: h.anchor });
  },
};

(async () => {
  const results = [];
  for (const [name, fn] of Object.entries(cases)) {
    if (only.length && !only.includes(name)) continue;
    const r = await fn();
    r.pass = r.expected === 'UNKNOWN' ? /UNKNOWN/.test(r.answer || '') : (r.answer || '').includes(r.expected) && !(r.unexpected && (r.answer || '').includes(r.unexpected));
    results.push(r);
    console.error(JSON.stringify({ case: r.case, pass: r.pass, answer: r.answer, expected: r.expected, status: r.status }));
  }
  fs.writeFileSync(path.join(root, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ root, results }, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
