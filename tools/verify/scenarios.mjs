// 运行验证场景表。每个场景对任意一棵树（original/、runnable/、阅读树…）跑同样的命令。
//
// 用法（库）：import { scenarios } from './scenarios.mjs'
// 用法（命令行，单棵树跑一遍并检查预期）：
//   node tools/verify/scenarios.mjs <tree> [--only a,b] [--jobs 3] [--list]
//
// 场景字段：
//   name        唯一名字
//   desc        这个场景验证什么、预期是什么（中文，写进报告）
//   args        CLI 参数（数组，或 (ctx) => 数组；ctx = {cwd, home, tmp, projectRoot}）
//   sequence    多步：[{args, stdin}]，在同一沙箱里依次运行
//   upstream    是否启动假上游（默认 true；没有假上游时代理指向必然拒绝的端口）
//   firstParty  额外设置 _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1
//   script      假上游脚本（见 fake-upstream.mjs）
//   stdin       标准输入（默认不接）
//   env         额外环境变量
//   setup/collect  运行前准备 / 运行后收集（沙箱删除之前）
//   timeoutMs   超时
//   expect(r)   返回不满足的预期列表（字符串数组），空数组 = 通过
import fs from 'node:fs';
import path from 'node:path';
import { FAKE_API_KEY } from './run.mjs';

const VERSION_LINE = '2.1.316 (Claude Code)';
const P = (c, f) => path.join(c.cwd, f);

// ---- 断言小工具 ----
function check(r, { exit = 0, stdoutHas = [], stdoutIs, stderrHas = [], requests, apiRequests, external = 0, files } = {}) {
  const bad = [];
  if (r.timedOut) bad.push('timed out');
  if (exit !== undefined && r.exitCode !== exit) bad.push(`exit ${r.exitCode} != ${exit}`);
  if (stdoutIs !== undefined && r.stdout !== stdoutIs) bad.push(`stdout != ${JSON.stringify(stdoutIs)} (got ${JSON.stringify(r.stdout.slice(0, 200))})`);
  for (const s of stdoutHas) if (!r.stdout.includes(s)) bad.push(`stdout lacks ${JSON.stringify(s)}`);
  for (const s of stderrHas) if (!r.stderr.includes(s)) bad.push(`stderr lacks ${JSON.stringify(s)}`);
  const api = r.requests.filter((q) => q.kind === 'api');
  const ext = r.requests.filter((q) => q.kind !== 'api');
  if (requests !== undefined && r.requests.length !== requests) bad.push(`requests ${r.requests.length} != ${requests}`);
  if (apiRequests !== undefined && api.length !== apiRequests) bad.push(`api requests ${api.length} != ${apiRequests}`);
  if (external !== undefined && external !== null && ext.length !== external) bad.push(`external requests ${ext.length} != ${external}`);
  for (const [f, content] of Object.entries(files || {})) if (r.files[f] !== content) bad.push(`file ${f} = ${JSON.stringify(r.files[f])}, want ${JSON.stringify(content)}`);
  return bad;
}
const lastUser = (q) => q.body?.messages?.filter((m) => m.role === 'user').at(-1);
const toolResults = (r) => r.requests.filter((q) => q.kind === 'api').flatMap((q) => {
  const c = lastUser(q)?.content;
  return Array.isArray(c) ? c.filter((b) => b.type === 'tool_result') : [];
});
const parseJsonLines = (s) => s.split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return { unparsable: l }; } });

const mcpConfig = (c) => JSON.stringify({ mcpServers: { verify: { type: 'stdio', command: 'node',
  args: [path.join(c.projectRoot, 'tools', 'verify', 'fake-mcp-server.mjs'), path.join(c.tmp, 'mcp.jsonl')] } } });
const readMcpLog = (c) => { try { return parseJsonLines(fs.readFileSync(path.join(c.tmp, 'mcp.jsonl'), 'utf8')); } catch { return null; } };

const TOOL_SCRIPT = {
  steps: [
    { text: 'I will run a few tools.', tools: [{ name: 'Bash', input: { command: 'echo hi > bash-out.txt', description: 'Write hi to a file' } }] },
    { tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'note.txt'), content: 'alpha\nbeta\n' }) }] },
    { tools: [{ name: 'Read', input: (c) => ({ file_path: P(c, 'note.txt') }) }] },
    { tools: [{ name: 'Edit', input: (c) => ({ file_path: P(c, 'note.txt'), old_string: 'beta', new_string: 'gamma' }) }] },
    // 一次回答里并行两个 tool_use
    { tools: [{ name: 'Read', input: (c) => ({ file_path: P(c, 'bash-out.txt') }) },
              { name: 'Read', input: (c) => ({ file_path: P(c, 'note.txt') }) }] },
  ],
  final: 'All tools ran.',
};
const TOOLS_ALLOWED = ['--allowedTools', 'Bash,Read,Write,Edit'];

const BASH_STDOUT_SCRIPT = { steps: [{ tools: [{ name: 'Bash', input: { command: 'echo hi; echo err >&2; printf "%s\\n" "$((6*7))"', description: 'Print to stdout and stderr' } }] }], final: 'Bash done.' };

// 交互模式需要的预置配置：已完成引导、已批准假 API key（CLI 按 key 末 20 位记录）、已信任工作目录
function seedInteractiveConfig(c) {
  const dir = path.join(c.home, '.claude');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude.json'), JSON.stringify({
    hasCompletedOnboarding: true, lastOnboardingVersion: '2.1.316', theme: 'dark',
    customApiKeyResponses: { approved: [FAKE_API_KEY.trim().slice(-20)], rejected: [] },
    projects: { [c.cwd]: { hasTrustDialogAccepted: true } },
  }, null, 2));
}

export const scenarios = [
  // ---------- 离线、无请求 ----------
  { name: 'version', desc: '--version 走 cli.js 快速路径：打印 "2.1.316 (Claude Code)"，退出 0，无网络请求。',
    args: ['--version'], expect: (r) => check(r, { stdoutIs: VERSION_LINE + '\n', requests: 0 }) },
  { name: 'version-verbose', desc: '--version --verbose：多打印一行 "Commit: <git sha>"（cd7ceb45…）。',
    args: ['--version', '--verbose'], expect: (r) => check(r, { stdoutHas: [VERSION_LINE, 'Commit: cd7ceb459c6864567b16a11f60101b24421475c1'], requests: 0 }) },
  { name: 'help', desc: '--help：commander 生成的总帮助，含选项与子命令表，退出 0。',
    args: ['--help'], expect: (r) => check(r, { stdoutHas: ['Usage: claude [options] [command] [prompt]', 'Commands:', 'mcp'], requests: 0 }) },
  ...[
    ['mcp'], ['mcp', 'add'], ['mcp', 'list'], ['plugin'], ['plugin', 'marketplace'], ['plugin', 'install'], ['auth'],
    ['agents'], ['auto-mode'], ['doctor'], ['update'], ['install'], ['setup-token'], ['import'], ['ultrareview'], ['gateway'], ['purge'],
  ].map((sub) => ({ name: `help-${sub.join('-')}`, desc: `${sub.join(' ')} --help：子命令帮助，退出 0，不发请求。`,
    args: [...sub, '--help'], expect: (r) => check(r, { stdoutHas: [`Usage: claude ${sub[0]}`], requests: 0 }) })),
  { name: 'invalid-option', desc: '未知选项：commander 报 "error: unknown option"，退出 1。',
    args: ['--no-such-option-for-verify'], expect: (r) => check(r, { exit: 1, stderrHas: ["unknown option '--no-such-option-for-verify'"], requests: 0 }) },

  // ---------- 非 Ink 子命令 ----------
  { name: 'doctor', desc: 'claude doctor（非交互版）：打印安装与连接诊断文本，退出 0；自定义 base URL 下不取远程设置、不发请求。',
    args: ['doctor'], expect: (r) => check(r, { stdoutHas: ['Claude Code doctor', 'Running: unknown (2.1.316)'], requests: 0 }) },
  { name: 'plugin-list-json', desc: 'plugin list --json：空配置打印 []，退出 0。',
    args: ['plugin', 'list', '--json'], expect: (r) => check(r, { stdoutIs: '[]\n', requests: 0 }) },
  { name: 'agents-json', desc: 'agents --json：没有后台会话，打印 []，退出 0。',
    args: ['agents', '--json'], expect: (r) => check(r, { stdoutIs: '[]\n', requests: 0 }) },
  { name: 'update-offline', desc: 'update：CLI 调 npm view @anthropic-ai/claude-code@latest version --prefer-online 查最新版本；沙箱里的 npm 是立即失败的假 npm（run.mjs fakeNpm），打印 "Failed to check for updates / Unable to fetch latest version from npm registry"，退出 1，无网络请求。（旧版用真实 npm 时不稳定，见 verify.md 第 14 节。）',
    args: ['update'], expect: (r) => check(r, { exit: 1, stderrHas: ['Failed to check for updates', 'Unable to fetch latest version from npm registry'], requests: 0 }) },
  { name: 'mcp-add', desc: 'mcp add 系列（不走 Ink，可在公版 Bun 上跑）：add stdio（local 作用域，写 ~/.claude.json）→ 同名再 add 报已存在（退出 1）→ add --transport http → add -s project（写 ./.mcp.json）→ remove 不存在的名字（退出 1，列出已配置的 demo, proj, web）。mcp remove 成功路径要 Ink，不在此列。',
    sequence: [
      { args: ['mcp', 'add', 'demo', '--', 'node', 'server.js', '--flag'] },
      { args: ['mcp', 'add', 'demo', '--', 'node', 'server.js'] },
      { args: ['mcp', 'add', '--transport', 'http', 'web', 'http://127.0.0.1:9/mcp'] },
      { args: ['mcp', 'add', '-s', 'project', 'proj', '--', 'node', 'p.js'] },
      { args: ['mcp', 'remove', 'nothere'] },
    ],
    expect: (r) => {
      const [a, b, c, d, e] = r.steps;
      const bad = [];
      const want = (st, exit, stream, text, label) => { if (st.exitCode !== exit || !st[stream].includes(text)) bad.push(`${label}: exit ${st.exitCode} ${JSON.stringify((st.stdout + st.stderr).slice(0, 160))}`); };
      want(a, 0, 'stdout', 'Added stdio MCP server demo with command: node server.js --flag to local config', 'add');
      want(b, 1, 'stderr', 'MCP server demo already exists in local config', 'add dup');
      want(c, 0, 'stdout', 'Added HTTP MCP server web with URL: http://127.0.0.1:9/mcp to local config', 'add http');
      want(d, 0, 'stdout', 'Added stdio MCP server proj with command: node p.js to project config', 'add project');
      want(e, 1, 'stderr', 'No MCP server named "nothere". Configured servers: demo, proj, web', 'remove missing');
      try { if (!JSON.parse(r.files['.mcp.json']).mcpServers.proj) bad.push('.mcp.json lacks proj'); } catch { bad.push('.mcp.json missing'); }
      if (r.requests.length) bad.push(`requests ${r.requests.length}`);
      return bad;
    } },
  { name: 'mcp-list-ink-limit', desc: '已知限制：mcp list 用 Ink 渲染，需要 Anthropic 自用 Bun 的 Bun.ant.CellSegmenter；公版 Bun 1.4.4 上静默退出 1、无输出。用来确认两棵树失败方式相同。',
    args: ['mcp', 'list'], expect: (r) => check(r, { exit: 1, stdoutIs: '', requests: 0 }) },

  // ---------- -p（print）与假上游 ----------
  { name: 'print-hi', desc: '-p hi：自定义 base URL（第三方形状）发 1 个 POST /v1/messages?beta=true（SSE），stdout 是假上游文本，退出 0，无外网。',
    args: ['-p', 'hi'], script: {}, expect: (r) => check(r, { stdoutIs: 'Hello from the fake upstream.\n', apiRequests: 1, external: 0 }) },
  { name: 'print-hi-first-party', desc: '-p hi + _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1：按第一方形状发送（多出 x-claude-code-prompt-id / request-class / x-client-request-id 头、计费头带 cch=00000 等、body 多 diagnostics）；另外直接连 api.anthropic.com 取 policy_limits 与远程托管设置，被黑洞代理拒绝（各 6 次，含 5 次退避重试，约 20 秒）。',
    firstParty: true, args: ['-p', 'hi'], script: {}, timeoutMs: 120000,
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Hello from the fake upstream.\n', apiRequests: 1, external: null });
      const ext = r.requests.filter((q) => q.kind !== 'api');
      if (!ext.length || ext.some((q) => q.url !== 'api.anthropic.com:443')) bad.push(`external: ${ext.map((q) => q.url).join(',')}`);
      const sys0 = r.requests.find((q) => q.kind === 'api')?.body?.system?.[0]?.text || '';
      if (!sys0.includes('cch=00000')) bad.push('first-party billing header lacks cch');
      return bad;
    } },
  { name: 'print-json', desc: '-p --output-format json：stdout 是一个 result 对象（type=result, subtype=success, result=假上游文本, usage, total_cost_usd…）。',
    args: ['-p', 'hi', '--output-format', 'json'], script: {},
    expect: (r) => {
      const bad = check(r, { apiRequests: 1, external: 0 });
      try { const j = JSON.parse(r.stdout); if (j.type !== 'result' || j.subtype !== 'success' || j.result !== 'Hello from the fake upstream.') bad.push(`json: ${r.stdout.slice(0, 200)}`); }
      catch { bad.push('stdout not JSON'); }
      return bad;
    } },
  { name: 'print-stream-json', desc: '-p --output-format stream-json --verbose：逐行 JSON 事件（system/init → assistant → result）。',
    args: ['-p', 'hi', '--output-format', 'stream-json', '--verbose'], script: {},
    expect: (r) => {
      const bad = check(r, { apiRequests: 1, external: 0 });
      const ev = parseJsonLines(r.stdout);
      const types = ev.map((e) => e.type + (e.subtype ? '/' + e.subtype : ''));
      if (types[0] !== 'system/init' || types.at(-1) !== 'result/success' || !types.includes('assistant')) bad.push(`events: ${types.join(',')}`);
      return bad;
    } },
  { name: 'print-stdin', desc: '-p 不带提示词，从 stdin 读提示词。',
    args: ['-p'], stdin: 'hello from stdin\n', script: {},
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Hello from the fake upstream.\n', apiRequests: 1, external: 0 });
      const txt = JSON.stringify(r.requests[0]?.body?.messages?.[0] || '');
      if (!txt.includes('hello from stdin')) bad.push('prompt from stdin not in request');
      return bad;
    } },
  { name: 'print-stream-json-input', desc: '--input-format stream-json：stdin 一行 user 消息 JSON，输出 stream-json。',
    args: ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose'],
    stdin: JSON.stringify({ type: 'user', message: { role: 'user', content: 'hello via stream-json' } }) + '\n', script: {},
    expect: (r) => {
      const bad = check(r, { apiRequests: 1, external: 0 });
      if (!JSON.stringify(r.requests[0]?.body?.messages || '').includes('hello via stream-json')) bad.push('stream-json input not in request');
      if (!parseJsonLines(r.stdout).some((e) => e.type === 'result')) bad.push('no result event');
      return bad;
    } },
  { name: 'print-model-alias', desc: '--model sonnet：别名解析成具体模型 id 写进请求的 model 字段。',
    args: ['-p', 'hi', '--model', 'sonnet'], script: {},
    expect: (r) => { const bad = check(r, { apiRequests: 1, external: 0 }); const m = r.requests[0]?.body?.model; if (!/sonnet/.test(m || '')) bad.push(`model ${m}`); return bad; } },
  { name: 'print-system-prompt', desc: '--system-prompt / --append-system-prompt：自定义系统提示词出现在请求 system 里。',
    args: ['-p', 'hi', '--system-prompt', 'VERIFY-SYSTEM-PROMPT', '--append-system-prompt', 'VERIFY-APPENDED'], script: {},
    expect: (r) => { const bad = check(r, { apiRequests: 1, external: 0 }); const s = JSON.stringify(r.requests[0]?.body?.system || ''); if (!s.includes('VERIFY-SYSTEM-PROMPT') || !s.includes('VERIFY-APPENDED')) bad.push('system prompt missing'); return bad; } },
  { name: 'print-bare', desc: '--bare：最小模式（跳过 hooks/LSP/插件同步/CLAUDE.md 等），请求仍发出。',
    args: ['-p', 'hi', '--bare'], script: {}, expect: (r) => check(r, { stdoutIs: 'Hello from the fake upstream.\n', apiRequests: 1, external: 0 }) },
  { name: 'print-api-error', desc: '假上游对 /v1/messages 一律回 400 invalid_request_error：CLI 不做普通重试（retry-count 始终 0），而是逐级降级重发——去掉 thinking-token-count beta → 去掉 thinking.display → 关掉工具搜索（advanced-tool-use beta 去掉，延迟工具全部内联，12→21 个工具）后再重复前两级，共 6 个请求；最后打印 "API Error: 400 verify: forced error" 到 stdout，退出 1。',
    args: ['-p', 'hi'], script: { error: { status: 400, type: 'invalid_request_error', message: 'verify: forced error' } },
    expect: (r) => check(r, { exit: 1, stdoutIs: 'API Error: 400 verify: forced error\n', apiRequests: 6, external: 0 }) },
  { name: 'print-tools', desc: '-p + 工具往返：Bash（echo 重定向到文件）→ Write → Read → Edit → 并行两个 Read → 最终文本；6 个请求，每个 tool_result 回传到下一请求，工作目录最终 note.txt = "alpha\\ngamma\\n"。',
    args: ['-p', 'run the tools', ...TOOLS_ALLOWED], script: TOOL_SCRIPT, timeoutMs: 120000,
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'All tools ran.\n', apiRequests: 6, external: 0, files: { 'note.txt': 'alpha\ngamma\n', 'bash-out.txt': 'hi\n' } });
      const tr = toolResults(r);
      if (tr.length !== 6) bad.push(`tool_results ${tr.length} != 6`);
      if (tr.some((t) => t.is_error)) bad.push(`tool error: ${JSON.stringify(tr.filter((t) => t.is_error)).slice(0, 300)}`);
      return bad;
    } },
  { name: 'print-tools-stream-json', desc: '同 print-tools，但输出 stream-json，记录 tool_use / tool_result 事件形状。',
    args: ['-p', 'run the tools', ...TOOLS_ALLOWED, '--output-format', 'stream-json', '--verbose'], script: TOOL_SCRIPT, timeoutMs: 120000,
    expect: (r) => {
      const bad = check(r, { apiRequests: 6, external: 0, files: { 'note.txt': 'alpha\ngamma\n' } });
      const ev = parseJsonLines(r.stdout);
      if (ev.filter((e) => e.type === 'user').length < 5) bad.push('fewer than 5 user(tool_result) events');
      if (ev.at(-1)?.type !== 'result') bad.push('last event not result');
      return bad;
    } },
  { name: 'print-max-turns', desc: '--max-turns 1 且模型要求调用工具：执行 1 轮后停止，result subtype=error_max_turns，退出 1。',
    args: ['-p', 'run', ...TOOLS_ALLOWED, '--max-turns', '1', '--output-format', 'json'], script: TOOL_SCRIPT,
    expect: (r) => {
      const bad = check(r, { exit: 1, external: 0 });
      try { const j = JSON.parse(r.stdout); if (j.subtype !== 'error_max_turns') bad.push(`subtype ${j.subtype}`); } catch { bad.push('stdout not JSON'); }
      return bad;
    } },
  { name: 'print-permission-denied', desc: '没有 --allowedTools 时 -p 模式下 Write 被拒（不弹框），tool_result 为错误，文件不存在，最终仍输出文本。',
    args: ['-p', 'write'], script: { steps: [TOOL_SCRIPT.steps[1]], final: 'Could not write.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Could not write.\n', apiRequests: 2, external: 0 });
      if (r.files['note.txt'] !== undefined) bad.push('note.txt was written');
      const tr = toolResults(r);
      if (!tr[0]?.is_error) bad.push('tool_result not an error');
      return bad;
    } },
  { name: 'print-mcp', desc: '离线 MCP：--strict-mcp-config --mcp-config 启动本地 stdio 服务器（fake-mcp-server.mjs）。CLI 先发 server/discover 探测（2026-07-28 草案），被拒后 initialize(2025-11-25)→initialized→tools/list；MCP 工具默认延迟加载，假模型先 ToolSearch select 再调用 mcp__verify__echo，tool_result = "echo: ping"。',
    args: (c) => ['-p', 'use mcp', '--strict-mcp-config', '--mcp-config', mcpConfig(c), '--allowedTools', 'mcp__verify__echo'],
    script: { steps: [
      { tools: [{ name: 'ToolSearch', input: { query: 'select:mcp__verify__echo', max_results: 1 } }] },
      { tools: [{ name: 'mcp__verify__echo', input: { text: 'ping' } }] },
    ], final: 'MCP done.' },
    collect: readMcpLog, timeoutMs: 90000,
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'MCP done.\n', apiRequests: 3, external: 0 });
      const methods = (r.collected || []).map((m) => m.method);
      for (const m of ['initialize', 'notifications/initialized', 'tools/list', 'tools/call']) if (!methods.includes(m)) bad.push(`mcp lacks ${m}`);
      const tr = toolResults(r);
      if (!JSON.stringify(tr.at(-1) || '').includes('echo: ping')) bad.push('mcp tool_result missing');
      return bad;
    } },
  // ---------- 验证环境补丁：bun-ant-shim.js（Ink 渲染）、win-append-shim.js（Bash 输出） ----------
  // 这些场景带 shimAnt / shimWinAppend：结果反映的是"316 的 JS + 我们的垫片"，不是官方二进制本身（见 verify.md 第 12、13 节）。
  { name: 'ink-mcp-list-empty', shimAnt: true, desc: '[垫片] mcp list（Ink 渲染）：空配置打印 "No MCP servers configured. Use `claude mcp add` to add a server."，退出 0。',
    args: ['mcp', 'list'], expect: (r) => check(r, { stdoutIs: 'No MCP servers configured. Use `claude mcp add` to add a server.\n', requests: 0 }) },
  { name: 'ink-mcp-lifecycle', shimAnt: true, timeoutMs: 60000,
    desc: '[垫片] MCP 全流程（Ink）：add-json 非法配置报错（退出 1）→ add-json 本地 stdio 服务器（fake-mcp-server.mjs）→ mcp list 做健康检查显示 "√ Connected" → mcp get 显示作用域/状态/命令 → mcp remove 成功 → mcp list 回到空。',
    sequence: [
      { args: ['mcp', 'add-json', 'verify', '{}'] },
      { args: (c) => ['mcp', 'add-json', 'verify', JSON.stringify({ type: 'stdio', command: 'node', args: [path.join(c.projectRoot, 'tools', 'verify', 'fake-mcp-server.mjs')] })] },
      { args: ['mcp', 'list'] },
      { args: ['mcp', 'get', 'verify'] },
      { args: ['mcp', 'remove', 'verify'] },
      { args: ['mcp', 'list'] },
    ],
    expect: (r) => {
      const s = r.steps, bad = [];
      const want = (i, exit, text) => { if (s[i].exitCode !== exit || !(s[i].stdout + s[i].stderr).includes(text)) bad.push(`step ${i}: exit ${s[i].exitCode} ${JSON.stringify((s[i].stdout + s[i].stderr).slice(0, 160))}`); };
      want(0, 1, 'Invalid configuration');
      want(1, 0, 'Added stdio MCP server verify to local config');
      want(2, 0, 'Connected');
      want(3, 0, 'Scope: Local config');
      want(4, 0, 'Removed MCP server "verify" from local config');
      want(5, 0, 'No MCP servers configured');
      if (r.requests.length) bad.push(`requests ${r.requests.length}`);
      return bad;
    } },
  { name: 'ink-plugin-list', shimAnt: true, desc: '[垫片] plugin list（Ink）："No plugins installed. …"，退出 0。',
    args: ['plugin', 'list'], expect: (r) => check(r, { stdoutHas: ['No plugins installed.'], requests: 0 }) },
  { name: 'ink-plugin-marketplace-list', shimAnt: true, desc: '[垫片] plugin marketplace list（Ink）：只有内置的 anthropic-plugin-directory。',
    args: ['plugin', 'marketplace', 'list'], expect: (r) => check(r, { stdoutHas: ['Configured marketplaces:', 'anthropic-plugin-directory'], requests: 0 }) },
  { name: 'ink-auth-status', shimAnt: true, desc: '[垫片] auth status（Ink，默认 JSON）：loggedIn=true、authMethod=api_key、apiKeySource=ANTHROPIC_API_KEY；目录指向沙箱。',
    args: ['auth', 'status'], expect: (r) => {
      const bad = check(r, { requests: 0 });
      try { const j = JSON.parse(r.stdout); if (j.loggedIn !== true || j.authMethod !== 'api_key' || j.apiKeySource !== 'ANTHROPIC_API_KEY') bad.push(`auth: ${r.stdout.slice(0, 200)}`); } catch { bad.push('stdout not JSON'); }
      return bad;
    } },
  { name: 'ink-auth-status-text', shimAnt: true, desc: '[垫片] auth status --text：API key 来源、自定义 base URL、代理三行。',
    args: ['auth', 'status', '--text'], expect: (r) => check(r, { stdoutHas: ['API key: ANTHROPIC_API_KEY', 'Anthropic base URL: http://127.0.0.1:'], requests: 0 }) },
  { name: 'ink-auto-mode-defaults', shimAnt: true, desc: '[垫片] auto-mode defaults（Ink）：打印默认 allow / soft_deny 等规则 JSON。',
    args: ['auto-mode', 'defaults'], expect: (r) => {
      const bad = check(r, { requests: 0 });
      try { const j = JSON.parse(r.stdout); for (const k of ['allow', 'soft_deny']) if (!Array.isArray(j[k]) || !j[k].length) bad.push(`no ${k}`); } catch { bad.push('stdout not JSON'); }
      return bad;
    } },
  { name: 'ink-auto-mode-config', shimAnt: true, desc: '[垫片] auto-mode config（Ink）：没有用户设置时等于默认规则的 JSON。',
    args: ['auto-mode', 'config'], expect: (r) => { const bad = check(r, { requests: 0 }); try { JSON.parse(r.stdout); } catch { bad.push('stdout not JSON'); } return bad; } },

  // ---------- 伪终端（ConPTY）里的交互界面 ----------
  { name: 'tty-first-run', shimAnt: true, timeoutMs: 60000, env: { TERM: 'xterm-256color' },
    desc: '[垫片+伪终端] 全新配置、交互模式启动：欢迎画面（"Welcome to Claude Code v2.1.316" + 字符画）后做首次联网检查，直连 api.anthropic.com / platform.claude.com 被黑洞代理拒绝，显示 "Unable to connect to Anthropic services … ERR_PROXY_TUNNEL"，退出 1。比较的是 vt-screen.mjs 还原的最终屏幕。',
    args: [], tty: { cols: 100, rows: 30, idleMs: 2500, expectExit: true, steps: [] },
    expect: (r) => {
      const bad = check(r, { exit: 1, apiRequests: 0, external: null });
      const scr = (r.screen || []).join('\n');
      for (const t of ['Welcome to Claude Code v2.1.316', 'Unable to connect to Anthropic services']) if (!scr.includes(t)) bad.push(`screen lacks ${JSON.stringify(t)}`);
      return bad;
    } },
  { name: 'tty-session', shimAnt: true, timeoutMs: 90000, env: { TERM: 'xterm-256color' },
    desc: '[垫片+伪终端] 预置"已完成引导、已批准假 key、已信任工作目录"的配置，交互模式：等到输入框 → 输入 hi 回车 → 假上游回答含中文、emoji、全角字符的文本 → 屏幕上出现回答 → 输入 /exit 回车，打印 "Resume this session with: claude --resume <id>"，退出 0。比较两个时刻的屏幕快照（空闲输入框、回答之后）、最终屏幕和请求体。',
    setup: seedInteractiveConfig,
    script: { final: 'Hello from the fake upstream. 你好，世界！宽字符测试：ＡＢＣ 😀👍 done.' },
    args: [],
    tty: { cols: 100, rows: 30, idleMs: 1500, expectExit: true, steps: [
      { waitFor: 'auto mode on', idleMs: 1500, snapshot: true, send: 'hi' },
      { idleMs: 500, send: '\r' },
      { waitFor: 'Hello from the fake upstream', idleMs: 1500, snapshot: true, send: '/exit' },
      { idleMs: 800, send: '\r' },
    ] },
    expect: (r) => {
      const bad = check(r, { exit: 0, apiRequests: 1, external: 0 });
      if ((r.pty?.steps || []).some((s) => !s.matched)) bad.push(`pty steps: ${JSON.stringify(r.pty?.steps)}`);
      const after = (r.snapshots?.[1] || []).join('\n');
      if (!after.includes('你好，世界！宽字符测试：ＡＢＣ 😀👍 done.')) bad.push('reply with wide chars not on screen');
      if (!(r.screen || []).join('\n').includes('claude --resume')) bad.push('no resume hint after /exit');
      return bad;
    } },

  { name: 'print-bash-stdout', shimWinAppend: true,
    desc: '[垫片] Bash 工具直接输出到 stdout/stderr（echo hi; echo err >&2; $((6*7))）：tool_result = "hi\\nerr\\n42\\nShell cwd was reset to <CWD>"。不加 win-append-shim 时在 Windows 上是 "Exit code 1"（原因见 verify.md 第 13 节）。',
    args: ['-p', 'run bash', '--allowedTools', 'Bash'], script: BASH_STDOUT_SCRIPT,
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Bash done.\n', apiRequests: 2, external: 0 });
      const tr = toolResults(r)[0];
      if (!tr || tr.is_error || !String(tr.content).startsWith('hi\nerr\n42\n')) bad.push(`tool_result: ${JSON.stringify(tr).slice(0, 200)}`);
      return bad;
    } },
  { name: 'print-bash-stdout-unshimmed', desc: '对照：同一 Bash 命令不加垫片，tool_result 为 "Exit code 1"（is_error）。确认两棵树的失败方式相同；哪天变成成功，说明运行环境或 CLI 行为变了。',
    args: ['-p', 'run bash', '--allowedTools', 'Bash'], script: BASH_STDOUT_SCRIPT,
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Bash done.\n', apiRequests: 2, external: 0 });
      const tr = toolResults(r)[0];
      if (!tr?.is_error || tr.content !== 'Exit code 1') bad.push(`tool_result: ${JSON.stringify(tr).slice(0, 200)}`);
      return bad;
    } },

];

export function byName(names) {
  if (!names) return scenarios;
  const want = new Set(names);
  const out = scenarios.filter((s) => want.has(s.name));
  for (const n of want) if (!out.some((s) => s.name === n)) throw new Error(`没有场景 ${n}`);
  return out;
}

// ---- 命令行：单棵树跑一遍 ----
import { fileURLToPath } from 'node:url';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { runScenario, pool } = await import('./run.mjs');
  const argv = process.argv.slice(2);
  const opt = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined);
  if (argv.includes('--list')) { for (const s of scenarios) console.log(`${s.name.padEnd(28)} ${s.desc}`); process.exit(0); }
  const tree = argv.find((a, i) => !a.startsWith('--') && !['--only', '--jobs'].includes(argv[i - 1])) || 'original';
  const list = byName(opt('--only')?.split(','));
  let fail = 0;
  await pool(list, Number(opt('--jobs') || 3), async (s) => {
    const r = await runScenario(tree, s);
    const bad = s.expect ? s.expect(r) : [];
    if (bad.length) fail++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${s.name} (${r.durationMs} ms)${bad.length ? ' — ' + bad.join('; ') : ''}`);
  });
  process.exitCode = fail ? 1 : 0;
}
