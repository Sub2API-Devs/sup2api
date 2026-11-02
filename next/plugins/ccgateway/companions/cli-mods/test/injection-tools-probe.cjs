// Runs the patched CLI's build with the tools a request is given on its first
// turn and compares them with the official capture of the same version
// (injection-tools.cjs). The CLI is the compiled one (Linux x64), against a
// loopback mock, in a Worker-like environment (telemetry and nonessential
// traffic off, a fresh HOME, no skills or agent files): the definitions it
// renders are what an account Worker's CLI sends.
//   node injection-tools-probe.cjs <patched-CLI> <official-request.json> <report.json> [model]
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');
const { spawn } = require('node:child_process');
const { compareInjectedTools } = require('./injection-tools.cjs');
const [cli, officialFile, reportFile, model = 'claude-sonnet-4-6'] = process.argv.slice(2);
if (!reportFile) throw Error('Usage: node injection-tools-probe.cjs patched-CLI official-request.json report.json [model]');
const official = JSON.parse(fs.readFileSync(officialFile, 'utf8'));
// Every tool the official first turn sends with its definition (the default
// injection), then WebSearch and NotebookEdit, which it defers; and the
// default set without ToolSearch, where nothing is deferred.
const firstTurn = official.tools.filter(tool => tool.defer_loading !== true).map(tool => tool.name);
const cases = [
  { name: 'first-turn', tools: firstTurn, compare: true },
  { name: 'first-turn-and-deferred', tools: [...firstTurn, 'WebSearch', 'NotebookEdit'], compare: true },
  { name: 'without-toolsearch', tools: [...firstTurn.filter(name => name !== 'ToolSearch'), 'WebSearch', 'NotebookEdit'], compare: false },
];

function run(server, tools) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-injection-home-'));
  fs.mkdirSync(path.join(home, '.claude'));
  fs.writeFileSync(path.join(home, '.claude.json'), '{"hasCompletedOnboarding":true}');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-injection-work-'));
  const body = { model, systemPrompt: [], messages: [{ role: 'user', content: 'Reply with CAPTURED. Do not call any tools.' }], parameters: { max_tokens: 32000 },
    requestPolicy: { contract_version: 2, build_injection: { tools: Object.fromEntries(tools.map(name => [name, true])) } } };
  const env = { PATH: process.env.PATH, HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude'), DISABLE_AUTOUPDATER: '1', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    DISABLE_TELEMETRY: '1', DO_NOT_TRACK: '1', DISABLE_ERROR_REPORTING: '1', DISABLE_GROWTHBOOK: '1', CLAUDE_CODE_ENABLE_TELEMETRY: '0',
    ANTHROPIC_API_KEY: 'sk-ant-api03-ccgaudit-fake', ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.address().port}`, _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL: '1' };
  return new Promise(resolve => {
    const before = server.seen.length, child = spawn(cli, ['request', '--build'], { env, cwd: work });
    let stderr = ''; child.stderr.on('data', chunk => stderr += chunk); child.stdout.resume();
    child.stdin.end(JSON.stringify(body));
    child.on('close', code => resolve({ code, stderr: stderr.slice(0, 2000), requests: server.seen.slice(before) }));
  });
}

const server = http.createServer(async (req, res) => {
  let raw = ''; for await (const chunk of req) raw += chunk;
  server.seen.push({ headers: req.headers, body: JSON.parse(raw) });
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ id: 'msg_probe', type: 'message', role: 'assistant', model, content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }));
});
server.seen = [];
server.listen(0, '127.0.0.1', async () => {
  const report = { cli, official: officialFile, model, cases: [] };
  for (const item of cases) {
    const result = await run(server, item.tools);
    const sent = result.requests[0]?.body;
    const tools = sent?.tools ?? [];
    const problems = result.code !== 0 || result.requests.length !== 1 ? [`exit ${result.code}, ${result.requests.length} requests: ${result.stderr}`]
      : item.compare ? compareInjectedTools(official.tools, tools, item.tools)
      // Without ToolSearch nothing is deferred: each chosen tool is sent whole.
      : tools.map(tool => tool.name).sort().join(',') === [...item.tools].sort().join(',') && !tools.some(tool => tool.defer_loading) ? [] : [`sent ${tools.map(tool => tool.name).join(',')}`];
    report.cases.push({ name: item.name, chosen: item.tools, sent: tools.map(tool => tool.name), runtimeVersion: result.requests[0]?.headers['x-stainless-runtime-version'], problems, tools });
    process.stderr.write(`${problems.length ? 'fail' : 'pass'} ${item.name}: ${tools.map(tool => tool.name).join(',')}${problems.length ? '\n  ' + problems.join('\n  ') : ''}\n`);
  }
  report.status = report.cases.every(item => item.problems.length === 0) ? 'passed' : 'failed';
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
  server.close();
  process.exitCode = report.status === 'passed' ? 0 : 1;
});
