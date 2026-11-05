// Claude Code's tools-used header (x-claude-code-sandy-plover) as the 2.1.318
// CLI writes it for the gateway (request_tools_used_v1;
// SESSION-MEMORY-TOOLS-USED-DESIGN.md §3, §6). The values are Claude Code's
// own functions, run from the recovered source (tools-used-natives.mjs): the
// 30 vectors of the 2.1.318 review (artifacts/claude-2.1.318/review/
// sp-vectors.cjs, kept in test/fixtures/tools-used-vectors-2.1.318.json) are
// recomputed one by one, the history ones through the wire messages and the
// marks request-tools-used.js gives them; then the merge order, the client's
// value as it came, the User-Agent rule, no header without tools_used, the
// Worker context's tools_used, and the request command end to end.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { installSupport, linkNatives } from '../../support.mjs';
import { pinned } from '../../artifacts.mjs';
import { readRequestAgent, validToolsUsed } from '../../../request-agent.js';
const { nativeSkip, fixture, profile } = pinned('2.1.318');
const skip = nativeSkip('the tools-used header from Claude Code 2.1.318\'s own functions');
const vectors = new Map(JSON.parse(fs.readFileSync(fixture('tools-used-vectors'), 'utf8')).vectors.map(vector => [vector.name, vector.value]));
const UD = 'unreadable-tools-used-before-summary';
const ua = version => `claude-cli/${version} (external, sdk-cli)`;

// The support modules installed with the native functions behind their
// generated module (ccgateway-native-toolsUsed.js), as patch-cli.cjs installs them.
let loaded;
async function load() {
  if (loaded) return loaded;
  const { toolsUsedNatives } = await import('./tools-used-natives.mjs');
  const native = toolsUsedNatives();
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ccg-tools-used-'));
  await fsp.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
  await installSupport(dir, ['request-tools-used', 'request-agent']);
  globalThis.ccgToolsUsedNatives = native.logical;
  await fsp.writeFile(path.join(dir, 'stub-tools-used.js'), Object.keys(native.logical).map(name => `export const ${name} = globalThis.ccgToolsUsedNatives.${name};`).join('\n') + '\n');
  await linkNatives(dir);
  const agent = await import(pathToFileURL(path.join(dir, 'ccgateway-request-agent.js')));
  const tools = await import(pathToFileURL(path.join(dir, 'ccgateway-request-tools-used.js')));
  loaded = { native, agent, tools, dir };
  return loaded;
}
test.after(async () => { if (loaded) await fsp.rm(loaded.dir, { recursive: true, force: true }); });

// send is one request: the Worker's tools_used (undefined: a context without
// it; null: no context), its messages, and the header the patched send point
// writes for the User-Agent it sends (null: none), with the set it reports.
async function send(toolsUsed, messages = [], userAgent = ua('2.1.318')) {
  const { native, agent, tools } = await load();
  native.fresh();
  const context = toolsUsed === null ? null : { map: false, client: {}, ...toolsUsed !== undefined && { toolsUsed } };
  agent.prepareToolsUsed(context, messages);
  const headers = new Headers(userAgent === null ? {} : { 'user-agent': userAgent });
  const header = tools.ccgatewayToolsUsedHeader(headers, () => native.Nf(native.set()));
  return { header, reported: agent.toolsUsedReport(), names: native.set().names() };
}
const wire = records => records.map(record => ({ role: record.message.role ?? record.type, content: record.message.content }));
const header = async names => (await send({ memory: names })).header;

test('serialization: CC\'s own set and Nf give the review\'s vectors, through the memory as through the set', { skip }, async () => {
  const { native } = await load();
  const nativeHeader = names => { const set = new native.Ledger(); set.record(names); return native.Nf(set); };
  const many = Array.from({ length: 70 }, (_, i) => `mcp__s__tool_${String(i).padStart(2, '0')}`);
  const long = Array.from({ length: 40 }, (_, i) => `mcp__server_${i}__` + 'x'.repeat(200));
  const cases = [
    ['empty', []], ['builtin only (insertion order kept, Of tools last)', ['Read', 'Bash', 'Grep']],
    ['mcp + builtin', ['Bash', 'mcp__github__create_issue', 'Read', 'mcp__slack__post']], ['server tools', ['web_search', 'Bash', 'web_fetch']],
    ['mcp connector (mcp_tool_use)', ['srv:do_thing', 'Edit']], ['unreadable name -> UD', ['bad name!', 'Read']],
    ['duplicate', ['Read', 'Read', 'Bash', 'Read']], ['non-Of tools that look builtin', ['WebSearch', 'WebFetch', 'Skill', 'TaskStop', 'Bash']],
    ['70 names -> 64 cap with UD first', many], ['byte cap 7168', long],
  ];
  for (const [name, names] of cases) {
    assert.equal(nativeHeader(names), vectors.get(name), name);
    assert.equal(await header(names), vectors.get(name), name + ' (memory)');
  }
  const live = new native.Ledger();
  for (const names of [['Bash', 'Bash'], ['web_search'], ['mcp__github__get_issue', 'mcp__github__get_issue'], ['docs:search'], ['Agent', 'Agent']]) live.record(names);
  assert.equal(native.Nf(live), vectors.get('live ledger -> header'));
  assert.equal(await header(live.names()), vectors.get('live ledger -> header'));
});

test('the helpers the review recorded are CC\'s own', { skip }, async () => {
  const { native } = await load();
  const { get, logical } = native;
  const Dy = get('chunk-vn3g7zt8.js', 'Dy'), Hfo = get('chunk-sva49n74.js', 'Hfo'), td = get('chunk-ap4nnw1y.js', 'td'), ote = get('chunk-5ythzcas.js', 'ote');
  const pTo = get('chunk-5ythzcas.js', 'pTo'), gHn = get('chunk-sva49n74.js', 'gHn'), fbr = get('chunk-wvdswywk.js', 'fbr');
  const connector = [{ name: 'mcp__claude_ai_Gmail__search', url: 'https://gmail.mcp.claude.com/mcp', directory_entry: 'gmail' }, { name: 'Bash' }];
  assert.equal(Dy(connector).value, vectors.get('Dy with connector fields'));
  assert.equal(Dy([{ name: 'mcp__x__y', directory_entry: 'bad entry' }]).value, vectors.get('Dy unresolved'));
  assert.deepEqual({ pTo: pTo(['Read', 'mcp__a__b']), gHn: gHn(['Read', 'mcp__a__b']) }, vectors.get('pTo / gHn'));
  assert.equal(Hfo({ type: 'server_tool_use', name: ' web_fetch ' }), vectors.get('Hfo server_tool_use'));
  assert.equal(Hfo({ type: 'mcp_tool_use', name: 'q', server_name: 'srv' }), vectors.get('Hfo mcp_tool_use'));
  assert.equal(Hfo({ type: 'mcp_tool_use', name: 'q' }), vectors.get('Hfo mcp_tool_use no server'));
  assert.deepEqual(['Task', 'KillShell', 'Brief', 'Eval', 'Agent'].map(td), vectors.get('td aliases'));
  assert.deepEqual(['Read', 'mcp__a-b.c:d', 'x y', 'é'].map(ote), vectors.get('ote'));
  assert.deepEqual(JSON.parse(JSON.stringify([fbr('https://x.example/mcp?q=1', 'gmail', undefined), fbr(undefined, undefined, undefined), fbr('http://x', 'gmail', undefined)])), vectors.get('fbr'));
  const summary = `This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.\n\n${gHn(['Grep', 'mcp__jira__search', 'Read'])}\nSummary:\n1. ...`;
  assert.equal(logical.compactSummaryTools(summary), vectors.get('compact summary text'));
  assert.equal(logical.compactSummaryTools('Summary: no opening'), undefined);
  const companion = gHn(['mcp__mail__fetch', 'WebFetch']);
  assert.equal(logical.companionTools(companion), vectors.get('PZt on companion text'));
  assert.equal(logical.companionTools(companion + ' and more'), undefined);
  assert.equal(logical.toolsUsedUnreadable, UD);
  // A connector value (a client on api.anthropic.com) goes as it came.
  assert.deepEqual(await send({ client: vectors.get('Dy with connector fields') }), {
    header: vectors.get('Dy with connector fields'), reported: ['mcp__claude_ai_Gmail__search', 'Bash'], names: ['mcp__claude_ai_Gmail__search', 'Bash'] });
});

test('history: the wire messages with CC\'s marks give what nD gives CC\'s own records', { skip }, async () => {
  const { native } = await load();
  const { get, logical } = native;
  const nD = logical.toolsUsedFromHistory, gHn = get('chunk-sva49n74.js', 'gHn'), lJe = get('chunk-sahntffv.js', 'lJe');
  const u = (content, extra = {}) => ({ type: 'user', message: { role: 'user', content }, ...extra });
  const a = content => ({ type: 'assistant', message: { role: 'assistant', content } });
  // fromWire is the header's set from the wire messages alone (no memory).
  const fromWire = async messages => {
    const result = await send({}, messages);
    assert.equal(result.header, native.Nf(native.set()));
    return result.names;
  };
  const hist1 = [
    u('hi'),
    a([{ type: 'text', text: 'ok' }, { type: 'tool_use', id: 't1', name: 'Bash', input: {} }]),
    u([{ type: 'tool_result', tool_use_id: 't1', content: 'x' }]),
    a([{ type: 'server_tool_use', id: 's1', name: 'web_search', input: {} }, { type: 'web_search_tool_result', tool_use_id: 's1', content: [] }, { type: 'tool_use', id: 't2', name: 'mcp__github__get_issue', input: {} }]),
    u([{ type: 'tool_result', tool_use_id: 't2', content: 'y' }]),
    a([{ type: 'mcp_tool_use', id: 'm1', name: 'search', server_name: 'docs', input: {} }, { type: 'tool_use', id: 't3', name: 'Task', input: {} }]),
  ];
  assert.deepEqual(nD(hist1, undefined, false), vectors.get('nD resume (n=false)'));
  assert.deepEqual(nD(hist1), vectors.get('nD default (n=true)'));
  assert.deepEqual(await fromWire(wire(hist1)), vectors.get('nD default (n=true)'));

  // The compact summary: CC marks its record; the wire has only the text.
  const summaryText = `This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.\n\n${gHn(['Grep', 'mcp__jira__search', 'Read'])}\nSummary:\n1. ...`;
  const hist2 = [u([{ type: 'text', text: summaryText }], { isCompactSummary: true }), a([{ type: 'tool_use', id: 't9', name: 'Edit', input: {} }])];
  const hist2w = [u([{ type: 'text', text: summaryText }]), a([{ type: 'tool_use', id: 't9', name: 'Edit', input: {} }])];
  assert.deepEqual(nD(hist2, undefined, false), vectors.get('nD after compaction (isCompactSummary flag set)'));
  assert.deepEqual(nD(hist2w, undefined, false), vectors.get('nD after compaction (wire: no isCompactSummary flag)'));
  assert.deepEqual(await fromWire(wire(hist2w)), vectors.get('nD after compaction (isCompactSummary flag set)'));
  // The summary as a string, and followed by the prompt in the same message.
  assert.deepEqual(await fromWire([{ role: 'user', content: summaryText }, ...wire(hist2w).slice(1)]), vectors.get('nD after compaction (isCompactSummary flag set)'));
  assert.deepEqual(await fromWire([{ role: 'user', content: [{ type: 'text', text: summaryText }, { type: 'text', text: 'Continue.' }] }]), ['Grep', 'Read', 'mcp__jira__search']);
  // A text that only quotes the opening later on is not a summary.
  assert.deepEqual(await fromWire([{ role: 'user', content: 'Quote: ' + summaryText }]), []);

  // A subagent's hand-back frame in the Agent tool_result.
  const frameText = `<tools-used-before-summary>Grep, Read, mcp__db__query</tools-used-before-summary>\n${lJe}\n  the report`;
  const hist3 = [u('do it'), a([{ type: 'tool_use', id: 'ag1', name: 'Agent', input: {} }]), u([{ type: 'tool_result', tool_use_id: 'ag1', content: [{ type: 'text', text: frameText }] }])];
  assert.deepEqual(nD(hist3), vectors.get('nD Agent hand-back frame (n=true)'));
  assert.deepEqual(nD(hist3, undefined, false), vectors.get('nD Agent hand-back frame (resume, n=false)'));
  assert.deepEqual(await fromWire(wire(hist3)), vectors.get('nD Agent hand-back frame (n=true)'));
  const Ovr = get('chunk-sahntffv.js', 'Ovr'), uGe = get('chunk-sahntffv.js', 'uGe');
  const parts = [{ type: 'text', text: '<tools-used-before-summary>Grep, Read, mcp__db__query</tools-used-before-summary>\n' }, { type: 'text', text: 'the report' }];
  let framed;
  try { framed = Ovr(parts, 1, 0, uGe(parts)); } catch { framed = [{ type: 'text', text: `  <tools-used-before-summary>Grep, Read, mcp__db__query</tools-used-before-summary>\n  \n${lJe}\n  the report` }]; }
  const hist5 = [u('go'), a([{ type: 'tool_use', id: 'ag2', name: 'Agent', input: {} }]), u([{ type: 'tool_result', tool_use_id: 'ag2', content: framed }])];
  assert.deepEqual(nD(hist5), vectors.get('Agent tool_result as Ovr renders it'));
  assert.deepEqual(await fromWire(wire(hist5)), vectors.get('Agent tool_result as Ovr renders it'));

  // A turn companion: CC marks its record and reads it before a queued prompt.
  const companion = gHn(['mcp__mail__fetch', 'WebFetch']);
  const hist4 = [u(companion, { isMeta: true, turnCompanion: true }), u('[task finished]', { origin: { kind: 'task-notification' } })];
  assert.deepEqual(nD(hist4), vectors.get('nD turn companion (needs internal flags)'));
  assert.deepEqual(nD([u(companion), u('[task finished]')]), [], 'unmarked, nD reads nothing');
  assert.deepEqual(await fromWire(wire(hist4)), vectors.get('nD turn companion (needs internal flags)'));
  // On the wire the companion is a block of the prompt's message, or ends it.
  assert.deepEqual(await fromWire([{ role: 'user', content: [{ type: 'text', text: companion }, { type: 'text', text: '[task finished]' }] }]), vectors.get('nD turn companion (needs internal flags)'));
  assert.deepEqual(await fromWire([{ role: 'user', content: [{ type: 'text', text: 'hi' }, { type: 'text', text: companion }] }]), vectors.get('nD turn companion (needs internal flags)'));
  assert.deepEqual(await fromWire([{ role: 'user', content: [{ type: 'text', text: companion }, { type: 'text', text: gHn(['Glob']) }] }]), ['Glob', 'WebFetch', 'mcp__mail__fetch']);
  // A companion's text inside a longer block is not one.
  assert.deepEqual(await fromWire([{ role: 'user', content: 'see ' + companion }]), []);
  // Odd wire shapes are read as CC reads them, never thrown on.
  assert.deepEqual(await fromWire([null, 1, { role: 'system', content: 'x' }, { role: 'user' }, { role: 'assistant', content: 'text' }, { role: 'assistant', content: [{ type: 'tool_use', name: 5 }, { type: 'tool_use', name: '  KillShell ' }] }]), ['TaskStop']);
});

test('merge: the memory in its order, then the client\'s names, then the history\'s, each once', { skip }, async () => {
  const history = [
    { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'Read', input: {} }, { type: 'tool_use', id: 't2', name: 'Bash', input: {} }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'x' }, { type: 'tool_result', tool_use_id: 't2', content: 'y' }] },
    { role: 'assistant', content: [{ type: 'tool_use', id: 't3', name: 'Task', input: {} }, { type: 'server_tool_use', id: 's1', name: 'web_search', input: {} }] },
  ];
  // With memory: its first-use order stays, history adds what it lacks (nD's order).
  let result = await send({ memory: ['mcp__z__last', 'Bash'] }, history);
  assert.deepEqual(result.names, ['mcp__z__last', 'Bash', 'Agent', 'Read', 'web_search']);
  assert.deepEqual(result.reported, result.names);
  assert.equal(result.header, '[{"name":"mcp__z__last"},{"name":"web_search"},{"name":"Bash"},{"name":"Agent"},{"name":"Read"}]');
  // Without memory: nD's sorted result (a session the Worker no longer remembers).
  result = await send({}, history);
  assert.deepEqual(result.names, ['Agent', 'Bash', 'Read', 'web_search']);
  assert.equal(result.header, '[{"name":"web_search"},{"name":"Agent"},{"name":"Bash"},{"name":"Read"}]');
  // The memory's stand-in is a name like any other (the Worker's, for names it
  // cut): reported, and serialized where CC puts a name outside its built-ins.
  result = await send({ memory: ['Grep', UD] }, history);
  assert.deepEqual(result.reported, ['Grep', UD, 'Agent', 'Bash', 'Read', 'web_search']);
  assert.equal(result.header, `[{"name":"${UD}"},{"name":"web_search"},{"name":"Grep"},{"name":"Agent"},{"name":"Bash"},{"name":"Read"}]`);
  // The client's value goes as it came, byte for byte; its names are reported
  // after the memory's and before the history's, without the stand-in CC
  // puts first in a value it cut.
  const client = ' [ {"name":"Bash"} , {"name" : "mcp__a__b"} ] ';
  assert(validToolsUsed(client));
  result = await send({ client, memory: ['Grep'] }, history);
  assert.equal(result.header, client);
  assert.deepEqual(result.reported, ['Grep', 'Bash', 'mcp__a__b', 'Agent', 'Read', 'web_search']);
  result = await send({ client: `[{"name":"${UD}"},{"name":"Edit"}]` }, []);
  assert.equal(result.header, `[{"name":"${UD}"},{"name":"Edit"}]`);
  assert.deepEqual(result.reported, ['Edit']);
  result = await send({ client: `[{"name":"${UD}"}]` }, []);
  assert.deepEqual(result.reported, [UD]);
  result = await send({ client: '[]' }, history);
  assert.equal(result.header, '[]');
  assert.deepEqual(result.reported, ['Agent', 'Bash', 'Read', 'web_search']);
  // The report holds at most 256 names, the memory's first.
  const memory = Array.from({ length: 257 }, (_, i) => `mcp__m__t${i}`);
  result = await send({ memory }, history);
  assert.deepEqual(result.reported, memory.slice(0, 256));
  assert.equal(result.names.length, 261);
});

test('the header follows the User-Agent sent upstream: from claude-cli 2.1.318 on', { skip }, async () => {
  const value = '[{"name":"Bash"}]';
  for (const [agent, sends] of [[ua('2.1.318'), true], [ua('2.1.319'), true], [ua('2.1.1000'), true], [ua('2.2.0'), true], [ua('3.0.0'), true],
    [ua('2.1.316'), false], [ua('2.1.317'), false], [ua('2.0.999'), false], [ua('1.9.400'), false], [ua('2.1.31'), false],
    ['claude-cli/2.1.318.1 (external, sdk-cli)', false], ['claude-cli/2.1.318', true], ['anthropic-sdk-python/0.40.0', false], ['', false], [null, false],
    ['my-claude-cli/2.1.318 (external, cli)', false]]) {
    const result = await send({ client: value }, [], agent);
    assert.equal(result.header, sends ? value : null, String(agent));
    // The set is the request's either way: the Worker remembers it.
    assert.deepEqual(result.reported, ['Bash'], String(agent));
    const merged = await send({ memory: ['Read'] }, [], agent);
    assert.equal(merged.header, sends ? '[{"name":"Read"}]' : null, String(agent));
  }
});

test('without tools_used no header is sent; without a Worker context CC\'s own', { skip }, async () => {
  const history = [{ role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'Read', input: {} }] }];
  // A Worker context without tools_used: none, nothing merged or reported.
  assert.deepEqual(await send(undefined, history), { header: null, reported: undefined, names: [] });
  // No Worker context (an ordinary CLI, a request run by hand): CC's value.
  assert.deepEqual(await send(null, history), { header: undefined, reported: undefined, names: [] });
  // An empty tools_used lets the header go: the history's set.
  assert.deepEqual(await send({}, history), { header: '[{"name":"Read"}]', reported: ['Read'], names: ['Read'] });
  assert.deepEqual(await send({}, []), { header: '[]', reported: [], names: [] });
});

test('the Worker context\'s tools_used has the contract\'s shape', () => {
  const base = { version: 1, map: false };
  const read = toolsUsed => readRequestAgent(JSON.stringify({ ...base, tools_used: toolsUsed }));
  // Absent: the context as before, and no header.
  assert.deepEqual(readRequestAgent(JSON.stringify(base)), { map: false, key: undefined, client: {} });
  assert.deepEqual(read({}).toolsUsed, {});
  assert.deepEqual(read({ client: '[]' }).toolsUsed, { client: '[]' });
  assert.deepEqual(read({ client: '[{"name":"Bash"}]', memory: ['Bash', 'mcp__db__query', 'srv:q', UD] }).toolsUsed, { client: '[{"name":"Bash"}]', memory: ['Bash', 'mcp__db__query', 'srv:q', UD] });
  assert.deepEqual(read({ memory: [] }).toolsUsed, { memory: [] });
  assert.equal(read({ memory: Array.from({ length: 257 }, (_, i) => 't' + i) }).toolsUsed.memory.length, 257);
  const connector = '[{"name":"mcp__claude_ai_Gmail__search","url":"https://gmail.mcp.claude.com/mcp","directory_entry":"gmail"},{"name":"mcp__x__y","unresolved":true}]';
  assert.deepEqual(read({ client: connector }).toolsUsed, { client: connector });
  const atLimit = '[' + Array.from({ length: 64 }, () => '{"name":"Bash"}').join(',') + ']';
  assert.equal(read({ client: atLimit }).toolsUsed.client, atLimit);
  const padded = '[{"name":"Bash"}' + ' '.repeat(8192 - 17) + ']';
  assert.equal(Buffer.byteLength(padded), 8192);
  assert.equal(read({ client: padded }).toolsUsed.client, padded);
  for (const bad of [null, [], 'x', 1, { other: 1 }, { client: '' }, { client: 'not json' }, { client: '{"name":"Bash"}' }, { client: 'null' },
    { client: '[{"name":"Bash"}] x' }, { client: '[{"name":"bad name"}]' }, { client: '[{"name":""}]' }, { client: '[{}]' }, { client: '["Bash"]' },
    { client: '[{"name":"Bash","extra":1}]' }, { client: '[{"name":"Bash","unresolved":false}]' }, { client: '[{"name":"Bash","url":1}]' },
    { client: '[{"name":5}]' }, { client: '[' + Array.from({ length: 65 }, () => '{"name":"Bash"}').join(',') + ']' },
    { client: '[{"name":"Bash"}' + ' '.repeat(8192 - 16) + ']' }, { client: '[{"name":"' + 'x'.repeat(257) + '"}]' }, { client: [] },
    { memory: 'Bash' }, { memory: ['bad name'] }, { memory: [''] }, { memory: [5] }, { memory: ['x'.repeat(257)] }, { memory: null },
    { memory: Array.from({ length: 258 }, (_, i) => 't' + i) }]) {
    assert.throws(() => read(bad), /Invalid Worker agent context/, JSON.stringify(bad));
  }
});

// The request command end to end, in its own process: the Worker's context
// (CCG_REQUEST_AGENT) with tools_used, direct and build, the merge before the
// send, the header the send point writes (a stand-in transport calls it as
// the patched fetch wrapper does) and tools_used in the response metadata.
test('the request command merges before sending and reports the set in its response metadata', { skip }, async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ccg-tools-used-command-'));
  try {
    await fsp.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    await installSupport(dir, ['request-command', 'request-tools-used', 'request-agent']);
    const helper = pathToFileURL(path.join(import.meta.dirname, 'tools-used-natives.mjs')).href;
    for (const [name, code] of Object.entries({
      'stub-transport.js': 'export class AnthropicClient {} export const createClient=async()=>new AnthropicClient(); export const modelFetch=()=>{};',
      'stub-context.js': 'export const mainAgentContext=()=>({agentType:"main",agentId:"native-session"});export const modelBetas=()=>[];export const promptCachingScopeBeta={name:"prompt_caching_scope",header:"prompt-caching-scope-2026-01-05"},cacheDiagnosisBeta={name:"cache_diagnosis",header:"cache-diagnosis-2026-04-07"},extendedCacheTtlBeta={name:"extended_cache_ttl",header:"extended-cache-ttl-2025-04-11"};',
      'stub-betas.js': 'export const betasAllowed=()=>true;',
      'stub-session.js': 'export const getRootSession=()=>({});export const setEntrypointOnRequests=()=>{};',
      'stub-tools-used.js': `import { toolsUsedNatives } from ${JSON.stringify(helper)};
        const native = toolsUsedNatives(); native.fresh(); globalThis.ccgNative = native;
        ${Object.keys(profile.natives.toolsUsed).map(name => `export const ${name} = native.logical.${name};`).join('\n        ')}`,
      // Build hands back the messages it was given (the native builder's are the wire's).
      'ccgateway-request-build.js': "export const buildRequest=async c=>({body:{model:c.model,messages:c.messages},headers:{},identityLine:{line:'none'},clientBetas:[],addedBetas:[]});",
      // The transport calls the send point as the patched fetch wrapper does.
      'ccgateway-model-request.js': `import fs from 'node:fs';
        import { ccgatewayToolsUsedHeader } from './ccgateway-request-tools-used.js';
        export const checkModelRequest=()=>null;export const defaultTimeout=600000;export const requestCapture=()=>{throw Error('no capture')};
        export const openModelRequest=async(outgoing,signal,factory)=>{await factory({});
          const native=globalThis.ccgNative, value=ccgatewayToolsUsedHeader(new Headers({'user-agent':process.env.TEST_USER_AGENT}),()=>native.Nf(native.set()));
          fs.writeFileSync('sent.json',JSON.stringify({value:value===undefined?'native':value}));return {ok:true,status:200,statusText:'OK',headers:{}}};
        export const cancelModelResponse=async()=>{};export const readModelResponse=async()=>({done:true,text:''});`,
      'run.mjs': `import './ccgateway-request-tools-used.js';
        import {runRequestCommand} from './ccgateway-request-command.js';
        const agentNative={leadingBilling:()=>null,entrypoint:()=>'sdk-cli',querySourceFor:()=>'agent:custom',
          loopHeaders:{prev_tool_durations:'a',cc_compaction_request:'b',claude_code_compaction:'c',cc_context_compacted:'d',claude_code_context_compacted:'e'},
          turn:()=>({turnOrigin:'sdk',turnPosition:{promptIndex:0,turnIndex:0}}),requestBilling:()=>null,prompt:()=>''};
        process.exitCode=await runRequestCommand(process.argv.slice(2),{agentNative,directBuild:async raw=>raw});`,
    })) await fsp.writeFile(path.join(dir, name), code);
    await linkNatives(dir);
    const run = (mode, body, env) => new Promise((resolve, reject) => {
      fs.rmSync(path.join(dir, 'sent.json'), { force: true });
      const child = spawn(process.execPath, ['run.mjs', mode, '--response-meta', 'meta.json'], { cwd: dir, env: { ...process.env, TEST_USER_AGENT: ua('2.1.318'), ...env } });
      const err = [];
      child.stderr.on('data', b => err.push(b));
      child.on('error', reject);
      child.on('close', code => resolve({ code, stderr: Buffer.concat(err).toString() }));
      child.stdin.end(JSON.stringify(body));
    });
    const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    const messages = [
      { role: 'user', content: 'go' },
      { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: {} }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] },
    ];
    const context = toolsUsed => JSON.stringify({ version: 1, map: false, ...toolsUsed !== undefined && { tools_used: toolsUsed } });
    for (const [mode, body] of [['--direct', { model: 'm', messages }], ['--build', { model: 'm', messages }]]) {
      let result = await run(mode, body, { CCG_REQUEST_AGENT: context({ memory: ['mcp__db__query'] }) });
      assert.equal(result.code, 0, result.stderr);
      assert.deepEqual(read('sent.json'), { value: '[{"name":"mcp__db__query"},{"name":"Bash"}]' }, mode);
      assert.deepEqual(read('meta.json').tools_used, ['mcp__db__query', 'Bash'], mode);
      result = await run(mode, body, { CCG_REQUEST_AGENT: context({ client: '[{"name":"Read"}]' }) });
      assert.equal(result.code, 0, result.stderr);
      assert.deepEqual(read('sent.json'), { value: '[{"name":"Read"}]' }, mode);
      assert.deepEqual(read('meta.json').tools_used, ['Read', 'Bash'], mode);
      // A 2.1.316 User-Agent: no header, the set still reported.
      result = await run(mode, body, { CCG_REQUEST_AGENT: context({}), TEST_USER_AGENT: ua('2.1.316') });
      assert.equal(result.code, 0, result.stderr);
      assert.deepEqual(read('sent.json'), { value: null }, mode);
      assert.deepEqual(read('meta.json').tools_used, ['Bash'], mode);
      // No tools_used: no header and nothing reported.
      result = await run(mode, body, { CCG_REQUEST_AGENT: context(undefined) });
      assert.equal(result.code, 0, result.stderr);
      assert.deepEqual(read('sent.json'), { value: null }, mode);
      assert(!Object.hasOwn(read('meta.json'), 'tools_used'), mode);
      // No Worker context: CC's own header.
      result = await run(mode, body, { CCG_REQUEST_AGENT: '' });
      assert.equal(result.code, 0, result.stderr);
      assert.deepEqual(read('sent.json'), { value: 'native' }, mode);
      assert(!Object.hasOwn(read('meta.json'), 'tools_used'), mode);
    }
    // A malformed tools_used refuses the request before anything is sent.
    const result = await run('--direct', { model: 'm', messages }, { CCG_REQUEST_AGENT: context({ memory: ['bad name'] }) });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Invalid Worker agent context/);
    assert(!fs.existsSync(path.join(dir, 'sent.json')));
  } finally { await fsp.rm(dir, { recursive: true, force: true }); }
});
