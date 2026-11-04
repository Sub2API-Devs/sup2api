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
//   sequence    多步：[{args, stdin, tty?}]，在同一沙箱里依次运行；某一步带 tty 时只有这一步在伪终端里跑
//   upstream    是否启动假上游（默认 true；没有假上游时代理指向必然拒绝的端口）
//   firstParty  额外设置 _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1
//   script      假上游脚本（见 fake-upstream.mjs；第三轮加了 routes、side 函数、delayMs）
//   stdin       标准输入（默认不接）
//   env         额外环境变量
//   setup/collect  运行前准备 / 运行后收集（沙箱删除之前）
//   timeoutMs   超时
//   shimAnt / shimWinAppend / shimWinHookSpawn  验证环境垫片（verify.md 第 12、13 节，scenarios.md 第 3 节）
//   tty         伪终端：{cols, rows, idleMs, expectExit, steps: [{waitFor, timeoutMs, idleMs, snapshot, send}]}（见 pty-driver.js）
//   expect(r)   返回不满足的预期列表（字符串数组），空数组 = 通过
// 第三轮（scenarios 成员）新增的 44 个场景从 "第三轮" 注释开始，清单与判定方法见 docs/process/scenarios.md。
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

// ---- 第三轮场景用到的夹具与小工具（scenarios 成员加，说明见 docs/process/scenarios.md） ----
// tool_result 断言：error=true/false 检查 is_error；has 子串；is 全等（content 是字符串或文本块数组时都按文本比）
const resultText = (t) => (typeof t?.content === 'string' ? t.content : JSON.stringify(t?.content ?? ''));
function wantResult(bad, t, { error, has, is } = {}, label) {
  if (!t) { bad.push(`${label}: no tool_result`); return; }
  if (error !== undefined && !!t.is_error !== error) bad.push(`${label}: is_error=${!!t.is_error} ${resultText(t).slice(0, 160)}`);
  if (has !== undefined && !resultText(t).includes(has)) bad.push(`${label}: lacks ${JSON.stringify(has)} in ${resultText(t).slice(0, 160)}`);
  if (is !== undefined && resultText(t) !== is) bad.push(`${label}: ${JSON.stringify(resultText(t).slice(0, 160))} != ${JSON.stringify(is)}`);
}
const readText = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const fwd = (p) => p.replace(/\\/g, '/');
function writeProjectSettings(c, obj, file = 'settings.json') {
  fs.mkdirSync(P(c, '.claude'), { recursive: true });
  fs.writeFileSync(P(c, `.claude/${file}`), JSON.stringify(obj, null, 2));
}
const NOTEBOOK = { cells: [
  { cell_type: 'code', id: 'c1', metadata: {}, execution_count: null, outputs: [], source: ['print(1)\n'] },
  { cell_type: 'markdown', id: 'c2', metadata: {}, source: ['# Title\n'] }],
metadata: { kernelspec: { name: 'python3', display_name: 'Python 3', language: 'python' }, language_info: { name: 'python' } }, nbformat: 4, nbformat_minor: 5 };
// 自动模式分类器的假回答：最后一个 Bash 动作写 blocked.txt 时回 90（两阶段都 > 阈值 15/20 → 拦截），否则 0（第一阶段放行）
function autoClassifier(body) {
  const s = JSON.stringify(body.messages || '');
  if (!s.includes('<transcript>')) return 'OK';
  return s.slice(s.lastIndexOf('{\\"Bash\\"')).includes('blocked.txt') ? '<severity>90</severity><category>Verify Block</category>' : '<severity>0</severity>';
}
const SETTINGS_DENY = ['Read(./secret.txt)', 'Bash(echo denied:*)'];
const SETTINGS_RULES_SCRIPT = { steps: [
  { tools: [{ name: 'Read', input: (c) => ({ file_path: P(c, 'secret.txt') }) }] },
  { tools: [{ name: 'Read', input: (c) => ({ file_path: P(c, 'open.txt') }) }] },
  { tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'new.txt'), content: 'n\n' }) }] },
  { tools: [{ name: 'Bash', input: { command: 'echo denied now', description: 'Denied echo' } }] },
], final: 'Rules done.' };
// settings.json 命令钩子：node 脚本把每个事件的名字、工具、输入字段名追加到 <tmp>/hooks.jsonl；
// PreToolUse Write blocked.txt → 退出码 2 拦截；UserPromptSubmit → stdout 作为附加上下文。收到完整 JSON 就处理（不等 stdin end）。
function setupSettingsHooks(c) {
  const hook = path.join(c.tmp, 'hook.cjs');
  fs.writeFileSync(hook, [
    "const fs=require('fs');let s='',done=false;",
    'function go(j){done=true;fs.appendFileSync(process.argv[2],JSON.stringify({ev:j.hook_event_name,tool:j.tool_name,keys:Object.keys(j)})+String.fromCharCode(10));',
    "if(j.hook_event_name==='PreToolUse'&&j.tool_name==='Write'&&String(j.tool_input.file_path).endsWith('blocked.txt')){process.stderr.write('verify hook: blocked.txt is not allowed');process.exit(2)}",
    "if(j.hook_event_name==='UserPromptSubmit')process.stdout.write('HOOK-CONTEXT-LINE');process.exit(0)}",
    "process.stdin.on('data',d=>{s+=d;try{go(JSON.parse(s))}catch(e){if(done)throw e}}).on('end',()=>{if(!done)process.exit(1)});"].join(''));
  const cmd = `node "${fwd(hook)}" "${fwd(path.join(c.tmp, 'hooks.jsonl'))}"`;
  const h = [{ hooks: [{ type: 'command', command: cmd }] }];
  writeProjectSettings(c, { hooks: { SessionStart: h, UserPromptSubmit: h, PreToolUse: [{ matcher: 'Write', hooks: h[0].hooks }], PostToolUse: h, Stop: h, SessionEnd: h } });
}
const mcpServer = (c, extra = []) => ({ type: 'stdio', command: 'node',
  args: [path.join(c.projectRoot, 'tools', 'verify', 'fake-mcp-server.mjs'), path.join(c.tmp, 'mcp.jsonl'), ...extra] });
const mcpConfigFull = (c) => JSON.stringify({ mcpServers: { verify: mcpServer(c, ['--full']) } });
// 插件夹具：tools/verify/fixtures/verify-marketplace 复制到沙箱 tmp/（CLI 只读写沙箱里的副本，路径也按 <TMP> 归一）
const copyMarketplace = (c) => fs.cpSync(path.join(c.projectRoot, 'tools', 'verify', 'fixtures', 'verify-marketplace'), path.join(c.tmp, 'verify-marketplace'), { recursive: true });
const pluginDir = (c) => path.join(c.tmp, 'verify-marketplace', 'plugins', 'verify-plugin');
function listTree(dir) {
  const out = {};
  const walk = (d, rel) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(d, e.name), r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(p, r); else out[r] = fs.statSync(p).size; } };
  try { walk(dir, ''); } catch {}
  return out;
}
// 会话文件摘要：~/.claude/projects/*/*.jsonl。只比较对话本身：
//   messages  type 为 user/assistant 的行，按文件顺序，每行留 role 和内容块（类型 + 文本前 80 字 / 工具名）
//   types     文件里出现过的全部行类型（去重排序）
// 其余元数据行（last-prompt、atis-latch、attachment、cost-state…）由异步写入，条数和相对顺序两次运行会不同
// （实测 session-resume-id 的 last-prompt/atis-latch 行与 assistant 行先后不定），所以不比较它们的顺序和条数。
// 文件按创建时间排序（序列里各步依次创建），不按文件名：随机 uuid 的文件名排序与 UUID 编号顺序无关，会让键的顺序不稳定。
const SESSION_ID = '11111111-2222-4333-8444-555555555555';
function collectSessions(c) {
  const root = path.join(c.home, '.claude', 'projects');
  const out = {};
  let dirs = [];
  try { dirs = fs.readdirSync(root); } catch { return out; }
  for (const d of dirs.sort()) {
    let files = [];
    try { files = fs.readdirSync(path.join(root, d)).filter((f) => f.endsWith('.jsonl')); } catch { continue; }
    const born = (f) => fs.statSync(path.join(root, d, f)).birthtimeMs;
    files.sort((a, b) => born(a) - born(b) || a.localeCompare(b));
    for (const f of files) {
      const lines = readText(path.join(root, d, f)).split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return { type: 'unparsable' }; } });
      out[`${d}/${f}`] = {
        messages: lines.filter((j) => j.type === 'user' || j.type === 'assistant').map((j) => {
          const content = j.message?.content;
          return { role: j.message?.role,
            blocks: Array.isArray(content) ? content.map((b) => b.type + (b.type === 'text' ? ':' + b.text.slice(0, 80) : b.type === 'tool_use' ? ':' + b.name : '')) : typeof content === 'string' ? ['string:' + content.slice(0, 80)] : undefined };
        }),
        types: [...new Set(lines.map((j) => j.type))].sort(),
      };
    }
  }
  return out;
}
// 伪终端场景：预置配置（已完成引导、已批准假 key、已信任工作目录）+ Ink 垫片；每步先 waitFor 屏幕文字再按键
const TTY = { shimAnt: true, timeoutMs: 90000, env: { TERM: 'xterm-256color' }, setup: seedInteractiveConfig };
const TTY_PAUSE_TEXT = '@@verify-pause@@'; // 永远不会出现在屏幕上的文字：等它就等于 sleep(timeoutMs)，pty 摘要里 matched=false 是预期的；
// 停顿后拍快照的步骤要另给 idleMs（等输出静止），否则可能拍到重绘中途的屏幕
const ttyPause = (ms, send) => ({ waitFor: TTY_PAUSE_TEXT, timeoutMs: ms, idleMs: 0, ...(send !== undefined && { send }) });
const TTY_EXIT = [ttyPause(800, '/exit'), { waitFor: '❯ /exit', send: '\r' }];
// 两个随时间消失的提示：状态行末尾的 "· ← for agents"（AgentsPill，AGENTS_HINT_TIMEOUT_MS = 10 秒后 agentsHintExpired）
// 和输入框上方的 "◐ medium · /effort"（effort 通知，timeoutMs 1e4）。快照落在启动后 10 秒前后哪一边取决于机器负载
// （第一次全量对 runnable 时 tty-multi-turn 因此不一致一次）。做法：第三轮的伪终端场景在出现第一屏后先停 11 秒（HINT_SETTLE_MS），
// 等两个提示都过期再开始操作，之后的快照里都不会有它们。tty-session（第二轮）在 10 秒内拍第一张快照，仍覆盖提示本身。
const HINT_SETTLE_MS = 11000;
const TTY_WRITE = { steps: [{ tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'note.txt'), content: 'tty\n' }) }] }], final: 'Wrote it.' };
const ttyCfg = (steps) => ({ cols: 100, rows: 30, idleMs: 1500, expectExit: true, steps });
// 屏幕文字：Ink 在提示符 ❯ 后面画的是 NBSP（U+00A0），断言前换成普通空格（waitFor 本来就按 \s+ 折叠）
const screenText = (lines) => (lines || []).join('\n').replace(/\u00a0/g, ' ');
// resumeHint：/exit 后是否应出现 "Resume this session with: claude --resume <id>"（只有发生过对话的会话才打印），默认 apiRequests > 0
function ttyCheck(r, steps, { apiRequests, files, exit = 0, resumeHint = apiRequests > 0 } = {}) {
  const bad = check(r, { exit, apiRequests, external: 0, files });
  if (r.pty?.killed) bad.push('pty child killed (did not exit)');
  (r.pty?.steps || []).forEach((s, i) => { if (steps[i]?.waitFor !== TTY_PAUSE_TEXT && !s.matched) bad.push(`pty step ${i} waitFor ${JSON.stringify(steps[i]?.waitFor)} not matched`); });
  if (resumeHint && !screenText(r.screen).includes('claude --resume')) bad.push('no resume hint after /exit');
  return bad;
}
// sequence 给出时，tty 步骤作为最后一步（args 是那一步的参数），前面的步骤不在伪终端里跑
// settle（默认 true）：先等第一步的 waitFor 出现，再停 HINT_SETTLE_MS，让 10 秒提示过期后才开始按键（见 HINT_SETTLE_MS）
function ttyScenario({ name, desc, script, args = [], steps: steps0, sequence, settle = true, check: want = {}, more, ...rest }) {
  const steps = settle ? [{ waitFor: steps0[0].waitFor, timeoutMs: 30000, idleMs: 0 }, ttyPause(HINT_SETTLE_MS), ...steps0] : steps0;
  const tty = ttyCfg(steps);
  return { ...TTY, ...rest, name, desc, script,
    ...(sequence ? { sequence: [...sequence, { args, tty }] } : { args, tty }),
    expect: (r) => { const bad = ttyCheck(r, steps, want); more?.(r, bad); return bad; } };
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


  // =====================================================================================================
  // 第三轮（scenarios 成员，2026-11-04）：工具往返与错误路径、权限模式与规则、钩子、MCP 资源/提示词/失败、
  // 插件（--plugin-dir、本地市场全流程、校验）、会话恢复、伪终端交互。说明见 docs/process/scenarios.md。
  // =====================================================================================================

  // ---------- 工具：tool_use → tool_result 往返与错误路径（-p） ----------
  { name: 'tool-read-errors', desc: 'Read 的成功与错误路径：不存在的文件 → "File does not exist. Note: your current working directory is <CWD>."（is_error）；目录 → EISDIR（is_error）；缺 file_path → InputValidationError（is_error）；offset=2/limit=1 → "2\\ttwo"（只回第 2 行，带行号）；完整读取 → 带行号的全文。',
    args: ['-p', 'read things', '--allowedTools', 'Read'],
    setup: (c) => fs.writeFileSync(P(c, 'exist.txt'), 'one\ntwo\nthree\n'),
    script: { steps: [
      { tools: [{ name: 'Read', input: (c) => ({ file_path: P(c, 'missing.txt') }) }] },
      { tools: [{ name: 'Read', input: (c) => ({ file_path: c.cwd }) }] },
      { tools: [{ name: 'Read', input: {} }] },
      { tools: [{ name: 'Read', input: (c) => ({ file_path: P(c, 'exist.txt'), offset: 2, limit: 1 }) }] },
      { tools: [{ name: 'Read', input: (c) => ({ file_path: P(c, 'exist.txt') }) }] },
    ], final: 'Read checks done.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Read checks done.\n', apiRequests: 6, external: 0 });
      const tr = toolResults(r);
      wantResult(bad, tr[0], { error: true, has: 'File does not exist.' }, 'missing');
      wantResult(bad, tr[1], { error: true, has: 'EISDIR' }, 'directory');
      wantResult(bad, tr[2], { error: true, has: 'InputValidationError' }, 'no file_path');
      wantResult(bad, tr[3], { error: false, is: '2\ttwo' }, 'offset/limit');
      wantResult(bad, tr[4], { error: false, has: '1\tone\n2\ttwo\n3\tthree' }, 'full read');
      return bad;
    } },
  { name: 'tool-edit-errors', desc: 'Edit/Write 的前置条件与错误路径：没 Read 就 Edit、没 Read 就覆盖已有文件 → "File has not been read yet. Read it first before writing to it."；Read 后 old_string 不存在 → "String to replace not found in file."；多处匹配且 replace_all=false → "Found 2 matches …"；replace_all=true → 全部替换；Write 新建嵌套目录 deep/a/b.txt 再 Edit 它。检查每个 tool_result 和最终文件内容。',
    args: ['-p', 'edit things', '--allowedTools', 'Read,Write,Edit'],
    setup: (c) => fs.writeFileSync(P(c, 'exist.txt'), 'one\ntwo\nthree\n'),
    script: { steps: [
      { tools: [{ name: 'Edit', input: (c) => ({ file_path: P(c, 'exist.txt'), old_string: 'two', new_string: '2' }) }] },
      { tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'exist.txt'), content: 'x' }) }] },
      { tools: [{ name: 'Read', input: (c) => ({ file_path: P(c, 'exist.txt') }) }] },
      { tools: [{ name: 'Edit', input: (c) => ({ file_path: P(c, 'exist.txt'), old_string: 'nope', new_string: '2' }) }] },
      { tools: [{ name: 'Edit', input: (c) => ({ file_path: P(c, 'exist.txt'), old_string: 'o', new_string: '0' }) }] },
      { tools: [{ name: 'Edit', input: (c) => ({ file_path: P(c, 'exist.txt'), old_string: 'o', new_string: '0', replace_all: true }) }] },
      { tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'deep/a/b.txt'), content: 'nested\n' }) }] },
      { tools: [{ name: 'Edit', input: (c) => ({ file_path: P(c, 'deep/a/b.txt'), old_string: 'nested', new_string: 'nested-edited' }) }] },
    ], final: 'Edit checks done.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Edit checks done.\n', apiRequests: 9, external: 0, files: { 'exist.txt': '0ne\ntw0\nthree\n', 'deep/a/b.txt': 'nested-edited\n' } });
      const tr = toolResults(r);
      wantResult(bad, tr[0], { error: true, has: 'File has not been read yet' }, 'edit before read');
      wantResult(bad, tr[1], { error: true, has: 'File has not been read yet' }, 'write before read');
      wantResult(bad, tr[3], { error: true, has: 'String to replace not found in file.' }, 'old_string missing');
      wantResult(bad, tr[4], { error: true, has: 'Found 2 matches of the string to replace, but replace_all is false' }, 'ambiguous');
      wantResult(bad, tr[5], { error: false, has: 'All occurrences were successfully replaced' }, 'replace_all');
      wantResult(bad, tr[6], { error: false, has: 'File created successfully at:' }, 'nested write');
      return bad;
    } },
  { name: 'tool-unavailable', desc: '316 默认没有的工具：一次回答里并行调用 Glob、Grep、TodoWrite → 三个 tool_result 都是 "<tool_use_error>Error: No such tool available: …"，并带各自的提示（Glob/Grep 提示改用 Bash 的 find/grep，TodoWrite 说本会话禁用）；之后模型照常收尾。',
    args: ['-p', 'search'],
    script: { steps: [{ tools: [{ name: 'Glob', input: { pattern: '*' } }, { name: 'Grep', input: { pattern: 'x' } }, { name: 'TodoWrite', input: { todos: [] } }] }], final: 'No search tools.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'No search tools.\n', apiRequests: 2, external: 0 });
      const tr = toolResults(r);
      if (tr.length !== 3) bad.push(`tool_results ${tr.length} != 3`);
      for (const n of ['Glob', 'Grep', 'TodoWrite']) {
        const t = tr.find((x) => String(x.content).includes(`No such tool available: ${n}`));
        if (!t?.is_error) bad.push(`${n}: ${JSON.stringify(t).slice(0, 160)}`);
      }
      return bad;
    } },
  { name: 'tool-bash-errors', shimWinAppend: true, desc: '[垫片] Bash 的退出码与输出：exit 3 → "Exit code 3"（is_error）；echo partial; exit 4 → 内容含 "partial" 与 "Exit code 4"；cd 到不存在的目录 → 错误并带 bash 的报错；pwd → <CWD> 的 POSIX 形式；不在 PATH 上的外部命令（Git 的 usr/bin 不在沙箱 PATH 里）→ "Exit code 127"。只用 bash 内置命令，不依赖外部程序。',
    args: ['-p', 'bash errors', '--allowedTools', 'Bash'],
    script: { steps: [
      { tools: [{ name: 'Bash', input: { command: 'exit 3', description: 'Exit with 3' } }] },
      { tools: [{ name: 'Bash', input: { command: 'echo partial; exit 4', description: 'Print then exit 4' } }] },
      { tools: [{ name: 'Bash', input: { command: 'cd no-such-dir-for-verify', description: 'cd to a missing dir' } }] },
      { tools: [{ name: 'Bash', input: { command: 'pwd', description: 'Print cwd' } }] },
      { tools: [{ name: 'Bash', input: { command: 'verify-no-such-program-xyz', description: 'Missing program' } }] },
    ], final: 'Bash checks done.' }, timeoutMs: 90000,
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Bash checks done.\n', apiRequests: 6, external: 0 });
      const tr = toolResults(r);
      wantResult(bad, tr[0], { error: true, is: 'Exit code 3' }, 'exit 3');
      wantResult(bad, tr[1], { error: true, has: 'partial' }, 'exit 4');
      if (!String(tr[1]?.content).includes('Exit code 4')) bad.push('exit 4 code missing');
      wantResult(bad, tr[2], { error: true, has: 'no-such-dir-for-verify' }, 'cd');
      wantResult(bad, tr[3], { error: false }, 'pwd');
      wantResult(bad, tr[4], { error: true, has: '127' }, 'missing program');
      return bad;
    } },
  { name: 'tool-notebook', desc: '延迟工具 + NotebookEdit：ToolSearch 关键词 "notebook jupyter" 命中 NotebookEdit（tool_reference）；select:NoSuchTool → "No matching deferred tools found"；Read .ipynb → <cell id=…> 形式；NotebookEdit replace c1 → "Updated cell c1 with print(2)"；delete c2；最终 nb.ipynb 只剩改过的 c1。',
    args: ['-p', 'notebook', '--allowedTools', 'Read,NotebookEdit'],
    setup: (c) => fs.writeFileSync(P(c, 'nb.ipynb'), JSON.stringify(NOTEBOOK, null, 1)),
    script: { steps: [
      { tools: [{ name: 'ToolSearch', input: { query: 'notebook jupyter', max_results: 3 } }] },
      { tools: [{ name: 'ToolSearch', input: { query: 'select:NoSuchTool', max_results: 1 } }] },
      { tools: [{ name: 'Read', input: (c) => ({ file_path: P(c, 'nb.ipynb') }) }] },
      { tools: [{ name: 'NotebookEdit', input: (c) => ({ notebook_path: P(c, 'nb.ipynb'), cell_id: 'c1', new_source: 'print(2)', edit_mode: 'replace' }) }] },
      { tools: [{ name: 'NotebookEdit', input: (c) => ({ notebook_path: P(c, 'nb.ipynb'), cell_id: 'c2', new_source: '', edit_mode: 'delete' }) }] },
    ], final: 'Notebook done.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Notebook done.\n', apiRequests: 6, external: 0 });
      const tr = toolResults(r);
      if (!JSON.stringify(tr[0]?.content || '').includes('"tool_name":"NotebookEdit"')) bad.push(`keyword search: ${JSON.stringify(tr[0]).slice(0, 200)}`);
      wantResult(bad, tr[1], { error: false, is: 'No matching deferred tools found' }, 'select missing');
      if (!JSON.stringify(tr[2]?.content || '').includes('<cell id=\\"c1\\">print(1)')) bad.push('notebook read');
      wantResult(bad, tr[3], { error: false, is: 'Updated cell c1 with print(2)' }, 'replace');
      try { const nb = JSON.parse(r.files['nb.ipynb']); if (nb.cells.length !== 1 || nb.cells[0].source !== 'print(2)') bad.push(`notebook cells ${JSON.stringify(nb.cells).slice(0, 200)}`); } catch { bad.push('nb.ipynb not JSON'); }
      return bad;
    } },
  { name: 'tool-skill-claudemd', desc: '项目 CLAUDE.md 与项目技能：第一条 user 消息里有 "Contents of <CWD>\\CLAUDE.md (project instructions…)" 的 system-reminder；Skill 工具调用 .claude/skills/verify-skill → tool_result "Launching skill: verify-skill"，紧跟一个文本块 "Base directory for this skill: …" + 技能正文；未知技能 → 错误。',
    args: ['-p', 'use the skill'],
    setup: (c) => {
      fs.mkdirSync(P(c, '.claude/skills/verify-skill'), { recursive: true });
      fs.writeFileSync(P(c, '.claude/skills/verify-skill/SKILL.md'), '---\nname: verify-skill\ndescription: A verify skill that says VERIFY-SKILL-BODY.\n---\n\nVERIFY-SKILL-BODY: follow these steps.\n');
      fs.writeFileSync(P(c, 'CLAUDE.md'), 'VERIFY-CLAUDE-MD: project memory line.\n');
    },
    script: { steps: [{ tools: [{ name: 'Skill', input: { skill: 'verify-skill' } }] }, { tools: [{ name: 'Skill', input: { skill: 'no-such-skill-for-verify' } }] }], final: 'Skill done.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Skill done.\n', apiRequests: 3, external: 0 });
      const api = r.requests.filter((q) => q.kind === 'api');
      if (!JSON.stringify(api[0]?.body?.messages?.[0] || '').includes('VERIFY-CLAUDE-MD: project memory line.')) bad.push('CLAUDE.md not in first message');
      const u1 = lastUser(api[1])?.content || [];
      if (!JSON.stringify(u1).includes('Launching skill: verify-skill') || !JSON.stringify(u1).includes('VERIFY-SKILL-BODY: follow these steps.')) bad.push(`skill result: ${JSON.stringify(u1).slice(0, 200)}`);
      const tr = toolResults(r);
      if (!tr.at(-1)?.is_error) bad.push(`unknown skill not an error: ${JSON.stringify(tr.at(-1)).slice(0, 160)}`);
      return bad;
    } },
  { name: 'tool-agent-sync', desc: '自定义代理（--agents JSON）+ Agent 工具同步运行（run_in_background=false）：假上游按系统提示词里的 VERIFY-AGENT-PROMPT 把子代理请求路由到另一组脚本（routes）；子代理只有 Read 一个工具，读 sub.txt 后回报告；主循环的 tool_result 是 "[Subagent hand-back] …" + 报告 + agentId + usage。请求顺序：主 → 子 → 子 → 主。',
    args: ['-p', 'delegate', '--allowedTools', 'Read', '--agents', JSON.stringify({ 'verify-agent': { description: 'Verify agent', prompt: 'VERIFY-AGENT-PROMPT', tools: ['Read'] } })],
    setup: (c) => fs.writeFileSync(P(c, 'sub.txt'), 'sub content\n'), timeoutMs: 90000,
    script: { steps: [{ tools: [{ name: 'Agent', input: { subagent_type: 'verify-agent', description: 'sub task', prompt: 'read sub.txt and report', run_in_background: false } }] }], final: 'Agent done.',
      routes: [{ match: 'VERIFY-AGENT-PROMPT', steps: [{ tools: [{ name: 'Read', input: (c) => ({ file_path: P(c, 'sub.txt') }) }] }], final: 'SUBAGENT-REPORT: sub.txt says sub content' }] },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Agent done.\n', apiRequests: 4, external: 0 });
      const api = r.requests.filter((q) => q.kind === 'api');
      const routes = api.map((q) => q.response?.route ?? 'main').join(',');
      if (routes !== 'main,0,0,main') bad.push(`request order ${routes}`);
      if (api[1]?.body?.tools?.map((t) => t.name).join(',') !== 'Read') bad.push(`subagent tools ${api[1]?.body?.tools?.map((t) => t.name)}`);
      if (!String(lastUser(api[2])?.content?.[0]?.content).includes('sub content')) bad.push('subagent Read failed');
      const hand = JSON.stringify(lastUser(api[3])?.content || '');
      if (!hand.includes('[Subagent hand-back]') || !hand.includes('SUBAGENT-REPORT: sub.txt says sub content')) bad.push('hand-back missing');
      return bad;
    } },

  // ---------- 权限：--permission-mode 各模式、--allowedTools 模式、settings.json 规则 ----------
  { name: 'perm-mode-plan', desc: '--permission-mode plan：Read 照常执行；Write → "Cannot write to <CWD>\\w.txt while in plan mode."（is_error），文件不存在。',
    args: ['-p', 'plan', '--permission-mode', 'plan'], setup: (c) => fs.writeFileSync(P(c, 'r.txt'), 'readable\n'),
    script: { steps: [{ tools: [{ name: 'Read', input: (c) => ({ file_path: P(c, 'r.txt') }) }] }, { tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'w.txt'), content: 'w\n' }) }] }], final: 'Planned.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Planned.\n', apiRequests: 3, external: 0 });
      const tr = toolResults(r);
      wantResult(bad, tr[0], { error: false, has: 'readable' }, 'read in plan');
      wantResult(bad, tr[1], { error: true, has: 'while in plan mode' }, 'write in plan');
      if (r.files['w.txt'] !== undefined) bad.push('w.txt written');
      return bad;
    } },
  { name: 'perm-mode-accept-edits', desc: '--permission-mode acceptEdits：Write 仍被拒（"Claude requested permissions to write to …, but you haven\'t granted it yet."）。原因是 linux 构建在 Windows 上判断 D:\\ 路径不在工作目录内（同一现象：Bash 重定向报 "outside the working directories"），见 scenarios.md 第 4 节；两棵树行为相同即可。',
    args: ['-p', 'edit', '--permission-mode', 'acceptEdits'],
    script: { steps: [{ tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'w.txt'), content: 'w\n' }) }] }, { tools: [{ name: 'Bash', input: { command: 'echo b > b.txt', description: 'Redirect to a file' } }] }], final: 'Edits tried.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Edits tried.\n', apiRequests: 3, external: 0 });
      const tr = toolResults(r);
      wantResult(bad, tr[0], { error: true, has: "but you haven't granted it yet" }, 'write');
      wantResult(bad, tr[1], { error: true, has: 'outside the working directories' }, 'bash redirect');
      return bad;
    } },
  { name: 'perm-mode-bypass', desc: '--permission-mode bypassPermissions：Write 与 Bash（echo 重定向）都直接执行，文件内容核对；不弹框、不调用分类器。',
    args: ['-p', 'bypass', '--permission-mode', 'bypassPermissions'],
    script: { steps: [{ tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'w.txt'), content: 'w\n' }) }] }, { tools: [{ name: 'Bash', input: { command: 'echo b > b.txt', description: 'Redirect to a file' } }] }], final: 'Bypassed.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Bypassed.\n', apiRequests: 3, external: 0, files: { 'w.txt': 'w\n', 'b.txt': 'b\n' } });
      for (const t of toolResults(r)) if (t.is_error) bad.push(`tool error ${JSON.stringify(t).slice(0, 160)}`);
      return bad;
    } },
  { name: 'perm-mode-dont-ask', desc: '--permission-mode dontAsk：没有预先允许的工具一律拒绝且不询问：Write 新文件、Bash 都是 "Permission to use … has been denied because Claude Code is running in don\'t ask mode."。',
    args: ['-p', 'dont ask', '--permission-mode', 'dontAsk'],
    script: { steps: [{ tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'w.txt'), content: 'w\n' }) }] }, { tools: [{ name: 'Bash', input: { command: 'echo b > b.txt', description: 'Redirect to a file' } }] }], final: 'Not asked.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Not asked.\n', apiRequests: 3, external: 0, files: {} });
      const tr = toolResults(r);
      wantResult(bad, tr[0], { error: true }, 'write');
      wantResult(bad, tr[1], { error: true, has: "don't ask mode" }, 'bash');
      if (r.files['w.txt'] !== undefined || r.files['b.txt'] !== undefined) bad.push('files written');
      return bad;
    } },
  { name: 'perm-mode-auto', desc: '--permission-mode auto（自动模式分类器）：每个 Bash 调用前 CLI 发无工具的分类器请求（<transcript> + 两阶段 <severity>）；假上游的 side 函数对 ok.txt 回 <severity>0</severity>（第一阶段放行），对 blocked.txt 回 90（两阶段都拦）→ tool_result 是自动模式拦截说明，blocked.txt 不存在。stderr 有"分类器计费"提示（自定义 base URL）。',
    args: ['-p', 'auto', '--permission-mode', 'auto'], timeoutMs: 90000,
    script: { steps: [
      { tools: [{ name: 'Bash', input: { command: 'echo ok > ok.txt', description: 'Write ok' } }] },
      { tools: [{ name: 'Bash', input: { command: 'echo no > blocked.txt', description: 'Write blocked' } }] },
    ], final: 'Auto done.', side: autoClassifier },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Auto done.\n', external: 0, files: { 'ok.txt': 'ok\n' } });
      const side = r.requests.filter((q) => q.kind === 'api' && q.response?.step === 'side');
      if (side.length < 2) bad.push(`classifier requests ${side.length}`);
      if (!JSON.stringify(side[0]?.body?.messages || '').includes('<transcript>')) bad.push('classifier transcript missing');
      const tr = toolResults(r);
      wantResult(bad, tr[0], { error: false }, 'allowed');
      wantResult(bad, tr[1], { error: true }, 'blocked');
      if (r.files['blocked.txt'] !== undefined) bad.push('blocked.txt written');
      return bad;
    } },
  { name: 'perm-allowed-pattern', shimWinAppend: true, desc: '[垫片] --allowedTools "Bash(echo:*)" + --disallowedTools Write：echo ok 执行（tool_result "ok"）；pwd 是只读命令，不需要规则也自动放行；mkdir 不在允许模式里 → 拒绝（-p 下不询问）；Write 被从工具表删掉（11 个工具），调用它 → "No such tool available: Write. Write is disabled for this session…"。',
    args: ['-p', 'patterns', '--allowedTools', 'Bash(echo:*)', '--disallowedTools', 'Write'],
    script: { steps: [
      { tools: [{ name: 'Bash', input: { command: 'echo ok', description: 'Echo ok' } }] },
      { tools: [{ name: 'Bash', input: { command: 'pwd', description: 'Print cwd' } }] },
      { tools: [{ name: 'Bash', input: { command: 'mkdir verify-new-dir', description: 'Make a dir' } }] },
      { tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'w.txt'), content: 'w' }) }] },
    ], final: 'Patterns done.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Patterns done.\n', apiRequests: 5, external: 0, files: {} });
      const api = r.requests.filter((q) => q.kind === 'api');
      if (api[0]?.body?.tools?.some((t) => t.name === 'Write')) bad.push('Write still in tool list');
      const tr = toolResults(r);
      wantResult(bad, tr[0], { error: false, has: 'ok' }, 'echo');
      wantResult(bad, tr[1], { error: false }, 'pwd (read-only)');
      wantResult(bad, tr[2], { error: true }, 'mkdir');
      wantResult(bad, tr[3], { error: true, has: 'No such tool available: Write' }, 'write');
      return bad;
    } },
  { name: 'perm-settings-rules', desc: '项目 .claude/settings.json 的 permissions（已信任工作目录）：allow [Write, Read]、deny [Read(./secret.txt), Bash(echo denied:*), Edit]：deny 整个 Edit → Edit 从工具表删掉；Bash "echo denied now" 命中内容规则 → "Permission to use Bash with command echo denied now has been denied."；读 open.txt、Write 新文件成功。已知偏差：路径规则 Read(./secret.txt) 不生效，secret.txt 照样读出——linux 构建在 Windows 上 getPlatform() 恒为 linux，规则匹配用 posix.relative 算 D:\\ 路径，得不到工作目录内的相对路径（scenarios.md 第 4 节）；两棵树行为相同即可，这一处断言写的是现状。',
    args: ['-p', 'rules'],
    setup: (c) => { seedInteractiveConfig(c); writeProjectSettings(c, { permissions: { allow: ['Write', 'Read'], deny: [...SETTINGS_DENY, 'Edit'] } }); fs.writeFileSync(P(c, 'secret.txt'), 'top secret\n'); fs.writeFileSync(P(c, 'open.txt'), 'open\n'); },
    script: SETTINGS_RULES_SCRIPT,
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Rules done.\n', apiRequests: 5, external: 0 });
      if (r.files['new.txt'] !== 'n\n') bad.push('new.txt not written');
      if (r.requests.find((q) => q.kind === 'api')?.body?.tools?.some((t) => t.name === 'Edit')) bad.push('Edit still in tool list');
      const tr = toolResults(r);
      wantResult(bad, tr[0], { error: false, has: 'top secret' }, 'secret (path deny rule does not match on Windows, known)');
      wantResult(bad, tr[1], { error: false, has: 'open' }, 'open');
      wantResult(bad, tr[2], { error: false }, 'write');
      wantResult(bad, tr[3], { error: true, has: 'Permission to use Bash with command echo denied now has been denied.' }, 'bash deny');
      return bad;
    } },
  { name: 'perm-settings-untrusted', desc: '同 perm-settings-rules 的 allow/deny，但工作目录未信任：stderr 打印 "Ignoring 2 permissions.allow entries from .claude/settings.json: this workspace has not been trusted. …"；allow 被忽略（Read/Write 都要授权，-p 下直接拒绝），deny 规则照样生效（Bash 内容规则拒绝）。',
    args: ['-p', 'rules'],
    setup: (c) => { writeProjectSettings(c, { permissions: { allow: ['Write', 'Read'], deny: SETTINGS_DENY } }); fs.writeFileSync(P(c, 'secret.txt'), 'top secret\n'); fs.writeFileSync(P(c, 'open.txt'), 'open\n'); },
    script: SETTINGS_RULES_SCRIPT,
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Rules done.\n', apiRequests: 5, external: 0, stderrHas: ['Ignoring 2 permissions.allow entries from .claude/settings.json: this workspace has not been trusted.'] });
      if (r.files['new.txt'] !== undefined) bad.push('new.txt written');
      const tr = toolResults(r);
      wantResult(bad, tr[0], { error: true, has: "haven't granted it yet" }, 'secret');
      wantResult(bad, tr[1], { error: true, has: "haven't granted it yet" }, 'open');
      wantResult(bad, tr[2], { error: true, has: "haven't granted it yet" }, 'write');
      wantResult(bad, tr[3], { error: true, has: 'has been denied' }, 'bash deny');
      return bad;
    } },
  { name: 'perm-settings-default-mode', desc: '--settings JSON 里 permissions.defaultMode=plan：stream-json 的 system/init 报 permissionMode "plan"，Write 被 plan 模式拒绝。',
    args: ['-p', 'mode', '--settings', JSON.stringify({ permissions: { defaultMode: 'plan' } }), '--output-format', 'stream-json', '--verbose'],
    script: { steps: [{ tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'w.txt'), content: 'w\n' }) }] }], final: 'Mode checked.' },
    expect: (r) => {
      const bad = check(r, { apiRequests: 2, external: 0, files: {} });
      const init = parseJsonLines(r.stdout).find((e) => e.type === 'system' && e.subtype === 'init');
      if (init?.permissionMode !== 'plan') bad.push(`permissionMode ${init?.permissionMode}`);
      wantResult(bad, toolResults(r)[0], { error: true, has: 'while in plan mode' }, 'write');
      return bad;
    } },

  // ---------- 钩子（settings.json 命令钩子） ----------
  { name: 'hook-settings-events', shimWinHookSpawn: true, desc: '[垫片] 项目 settings.json 的命令钩子（node 脚本，已信任目录）：SessionStart → UserPromptSubmit（stdout 作为附加上下文进入请求："UserPromptSubmit hook success: HOOK-CONTEXT-LINE"）→ PreToolUse(Write blocked.txt) 以退出码 2 拦截，tool_result "PreToolUse:Write hook error: […]: verify hook: blocked.txt is not allowed" → PreToolUse/PostToolUse(Write ok.txt) → Stop → SessionEnd。检查钩子日志的事件顺序与每个事件的输入字段、拦截结果和文件。不加 win-hook-spawn-shim 时钩子收不到 stdin（scenarios.md 第 3 节）。',
    args: ['-p', 'hooks', '--allowedTools', 'Write'],
    setup: (c) => { seedInteractiveConfig(c); setupSettingsHooks(c); },
    collect: (c) => readText(path.join(c.tmp, 'hooks.jsonl')),
    script: { steps: [
      { tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'blocked.txt'), content: 'b' }) }] },
      { tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'ok.txt'), content: 'ok' }) }] },
    ], final: 'Hooks done.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Hooks done.\n', apiRequests: 3, external: 0 });
      if (r.files['blocked.txt'] !== undefined || r.files['ok.txt'] !== 'ok') bad.push(`files ${Object.keys(r.files)}`);
      const evs = parseJsonLines(r.collected || '').map((e) => e.ev + (e.tool ? ':' + e.tool : '')).join(',');
      if (evs !== 'SessionStart,UserPromptSubmit,PreToolUse:Write,PreToolUse:Write,PostToolUse:Write,Stop,SessionEnd') bad.push(`hook events ${evs}`);
      if (!JSON.stringify(r.requests[0]?.body?.messages || '').includes('UserPromptSubmit hook success: HOOK-CONTEXT-LINE')) bad.push('hook context not in request');
      wantResult(bad, toolResults(r)[0], { error: true, has: 'verify hook: blocked.txt is not allowed' }, 'pre-tool block');
      return bad;
    } },

  // ---------- MCP：资源、提示词、工具错误、连接失败、项目 .mcp.json ----------
  { name: 'mcp-resources', desc: 'MCP 资源与工具错误（fake-mcp-server --full）：ToolSearch select 三个延迟工具 → ListMcpResourcesTool 列出两个资源（带 server 字段）→ ReadMcpResourceTool 读 verify://notes/readme（contents 原样）→ 读不存在的 uri → "Resource not found: … Re-run ListMcpResourcesTool to refresh."（非 is_error）→ mcp__verify__fail（isError=true）→ tool_result is_error。服务器日志里有 resources/list、resources/read、tools/call。',
    args: (c) => ['-p', 'resources', '--strict-mcp-config', '--mcp-config', mcpConfigFull(c), '--allowedTools', 'ListMcpResourcesTool,ReadMcpResourceTool,mcp__verify__fail,mcp__verify__add'],
    collect: readMcpLog, timeoutMs: 90000,
    script: { steps: [
      { tools: [{ name: 'ToolSearch', input: { query: 'select:ListMcpResourcesTool,ReadMcpResourceTool,mcp__verify__fail,mcp__verify__add', max_results: 4 } }] },
      { tools: [{ name: 'ListMcpResourcesTool', input: { server: 'verify' } }] },
      { tools: [{ name: 'ReadMcpResourceTool', input: { server: 'verify', uri: 'verify://notes/readme' } }] },
      { tools: [{ name: 'ReadMcpResourceTool', input: { server: 'verify', uri: 'verify://nope' } }] },
      { tools: [{ name: 'mcp__verify__fail', input: {} }] },
      { tools: [{ name: 'mcp__verify__add', input: { a: 2, b: 3 } }] },
    ], final: 'Resources done.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Resources done.\n', apiRequests: 7, external: 0 });
      const tr = toolResults(r);
      wantResult(bad, tr[1], { error: false, has: 'verify://data/config.json' }, 'list');
      wantResult(bad, tr[2], { error: false, has: 'VERIFY-MCP-RESOURCE: readme body line 1' }, 'read');
      wantResult(bad, tr[3], { has: 'Resource not found: verify://nope' }, 'read missing');
      wantResult(bad, tr[4], { error: true, has: 'verify-mcp: tool failed on purpose' }, 'fail tool');
      wantResult(bad, tr[5], { error: false, has: '5' }, 'add');
      const methods = (r.collected || []).map((m) => m.method);
      for (const m of ['resources/list', 'resources/read', 'tools/call']) if (!methods.includes(m)) bad.push(`mcp lacks ${m}`);
      return bad;
    } },
  { name: 'mcp-prompt', desc: 'MCP 提示词当斜杠命令（-p "/mcp__verify__greet Alice"）：CLI 连接后发 prompts/list，执行时 prompts/get(name=greet, arguments.name=Alice)；请求里第一条 user 消息是 <command-message>/<command-name>/<command-args> 三行 + 提示词内容 "Please greet Alice warmly. VERIFY-MCP-PROMPT"。',
    args: (c) => ['-p', '/mcp__verify__greet Alice', '--strict-mcp-config', '--mcp-config', mcpConfigFull(c)],
    collect: readMcpLog, timeoutMs: 60000, script: { final: 'Greeted.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Greeted.\n', apiRequests: 1, external: 0 });
      const m0 = JSON.stringify(r.requests[0]?.body?.messages?.[0] || '');
      if (!m0.includes('<command-name>/mcp__verify__greet</command-name>') || !m0.includes('Please greet Alice warmly. VERIFY-MCP-PROMPT')) bad.push(`prompt expansion: ${m0.slice(0, 300)}`);
      const get = (r.collected || []).find((m) => m.method === 'prompts/get');
      if (get?.params?.name !== 'greet' || get?.params?.arguments?.name !== 'Alice') bad.push(`prompts/get ${JSON.stringify(get)}`);
      return bad;
    } },
  { name: 'mcp-connect-fail', desc: 'MCP 连接失败：一个服务器启动即退出（--exit-on-start，退出码 3），一个命令不存在；stream-json 的 system/init 里两个都是 status "failed"（source dynamic），工具表里没有它们的工具，请求照常发出、退出 0。',
    args: (c) => ['-p', 'hi', '--strict-mcp-config', '--mcp-config', JSON.stringify({ mcpServers: { broken: mcpServer(c, ['--exit-on-start']), missing: { type: 'stdio', command: 'verify-no-such-command-xyz', args: [] } } }), '--output-format', 'stream-json', '--verbose'],
    collect: readMcpLog, timeoutMs: 90000, script: {},
    expect: (r) => {
      const bad = check(r, { apiRequests: 1, external: 0 });
      const init = parseJsonLines(r.stdout).find((e) => e.type === 'system' && e.subtype === 'init');
      const st = JSON.stringify(init?.mcp_servers);
      if (st !== JSON.stringify([{ name: 'broken', status: 'failed', source: 'dynamic' }, { name: 'missing', status: 'failed', source: 'dynamic' }])) bad.push(`mcp_servers ${st}`);
      if (init?.tools?.some((t) => t.startsWith('mcp__'))) bad.push('mcp tools listed');
      if (!parseJsonLines(r.stdout).some((e) => e.type === 'result' && e.subtype === 'success')) bad.push('no success result');
      return bad;
    } },
  { name: 'mcp-project-config', desc: '项目 .mcp.json：.claude/settings.local.json 设 enableAllProjectMcpServers=true → stream-json init 报 proj 服务器 connected（source project），工具表含 mcp__proj__add / mcp__proj__echo；模型调用 mcp__proj__add(2,40) → "42"。',
    args: ['-p', 'project mcp', '--output-format', 'stream-json', '--verbose', '--allowedTools', 'mcp__proj__add'],
    setup: (c) => { fs.writeFileSync(P(c, '.mcp.json'), JSON.stringify({ mcpServers: { proj: mcpServer(c) } })); fs.mkdirSync(P(c, '.claude'), { recursive: true }); fs.writeFileSync(P(c, '.claude/settings.local.json'), JSON.stringify({ enableAllProjectMcpServers: true })); },
    collect: readMcpLog, timeoutMs: 90000,
    script: { steps: [{ tools: [{ name: 'ToolSearch', input: { query: 'select:mcp__proj__add', max_results: 1 } }] }, { tools: [{ name: 'mcp__proj__add', input: { a: 2, b: 40 } }] }], final: 'Project MCP done.' },
    expect: (r) => {
      const bad = check(r, { apiRequests: 3, external: 0 });
      const init = parseJsonLines(r.stdout).find((e) => e.type === 'system' && e.subtype === 'init');
      if (JSON.stringify(init?.mcp_servers) !== JSON.stringify([{ name: 'proj', status: 'connected', source: 'project' }])) bad.push(`mcp_servers ${JSON.stringify(init?.mcp_servers)}`);
      if (!init?.tools?.includes('mcp__proj__add')) bad.push('mcp__proj__add not in init tools');
      wantResult(bad, toolResults(r)[1], { error: false, has: '42' }, 'add');
      return bad;
    } },

  // ---------- 插件：--plugin-dir、本地市场全流程、校验 ----------
  { name: 'plugin-dir-command', shimWinHookSpawn: true, desc: '[垫片] --plugin-dir 加载夹具插件 verify-plugin（commands/skills/agents/hooks）：-p "/verify-plugin:hello Bob" → 请求里是 <command-name>/verify-plugin:hello</command-name> + "VERIFY-PLUGIN-COMMAND: say hello to Bob."；插件的 UserPromptSubmit 钩子运行（CLAUDE_PLUGIN_ROOT 指向插件目录），输出作为附加上下文进入请求，并在工作目录写 plugin-hook.log。',
    args: (c) => ['-p', '/verify-plugin:hello Bob', '--plugin-dir', pluginDir(c)], setup: copyMarketplace, script: { final: 'Plugin command done.' },
    expect: (r) => {
      const bad = check(r, { stdoutIs: 'Plugin command done.\n', apiRequests: 1, external: 0 });
      const b = JSON.stringify(r.requests[0]?.body?.messages || '');
      if (!b.includes('<command-name>/verify-plugin:hello</command-name>') || !b.includes('VERIFY-PLUGIN-COMMAND: say hello to Bob.')) bad.push('command expansion');
      if (!b.includes('VERIFY-PLUGIN-HOOK-CONTEXT')) bad.push('plugin hook context missing');
      if (r.files['plugin-hook.log'] !== '{"ev":"UserPromptSubmit","pluginRoot":"verify-plugin"}\n') bad.push(`hook log ${JSON.stringify(r.files['plugin-hook.log'])}`);
      return bad;
    } },
  { name: 'plugin-dir-skill-hook', shimWinHookSpawn: true, desc: '[垫片] --plugin-dir + stream-json：init 的 slash_commands 含 verify-plugin:hello / verify-plugin:verify-plugin-skill，agents 含 verify-plugin:verify-plugin-agent，plugins 列出 verify-plugin；Skill 调用插件技能 → 技能正文；Write plugin-blocked.txt 被插件的 PreToolUse 钩子（退出码 2）拦截，tool_result 注明 "This hook comes from the verify-plugin@inline plugin."。',
    args: (c) => ['-p', 'use plugin', '--plugin-dir', pluginDir(c), '--allowedTools', 'Write,Skill', '--output-format', 'stream-json', '--verbose'], setup: copyMarketplace,
    script: { steps: [
      { tools: [{ name: 'Skill', input: { skill: 'verify-plugin:verify-plugin-skill' } }] },
      { tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'plugin-blocked.txt'), content: 'x' }) }] },
    ], final: 'Plugin tools done.' },
    expect: (r) => {
      const bad = check(r, { apiRequests: 3, external: 0 });
      const init = parseJsonLines(r.stdout).find((e) => e.type === 'system' && e.subtype === 'init') || {};
      for (const s of ['verify-plugin:hello', 'verify-plugin:verify-plugin-skill']) if (!init.slash_commands?.includes(s)) bad.push(`slash_commands lacks ${s}`);
      if (!JSON.stringify(init.agents || '').includes('verify-plugin:verify-plugin-agent')) bad.push(`agents ${JSON.stringify(init.agents)}`);
      if (!JSON.stringify(init.plugins || '').includes('verify-plugin')) bad.push('plugins lacks verify-plugin');
      const api = r.requests.filter((q) => q.kind === 'api');
      if (!JSON.stringify(lastUser(api[1])?.content || '').includes('VERIFY-PLUGIN-SKILL-BODY')) bad.push('plugin skill body');
      wantResult(bad, toolResults(r)[1], { error: true, has: 'verify-plugin hook: plugin-blocked.txt is blocked' }, 'plugin pre-tool hook');
      if (r.files['plugin-blocked.txt'] !== undefined) bad.push('plugin-blocked.txt written');
      return bad;
    } },
  { name: 'plugin-marketplace-lifecycle', shimAnt: true, shimWinHookSpawn: true, timeoutMs: 90000,
    desc: '[垫片] 本地市场全流程（夹具 tools/verify/fixtures/verify-marketplace 复制到沙箱 tmp/）：marketplace add ../tmp/verify-marketplace → 再 add 一次（已存在）→ marketplace list（多出 verify-market，Source: Folder）→ install verify-plugin@verify-market（user 作用域，复制到 ~/.claude/plugins/cache）→ list --json（enabled true）→ disable → list --json（enabled false）→ enable → -p "/verify-plugin:hello Carol"（插件命令可用）→ uninstall → list --json 回到 []。检查每步退出码与输出、~/.claude/plugins 下的文件。',
    setup: copyMarketplace, collect: (c) => listTree(path.join(c.home, '.claude', 'plugins')),
    sequence: [
      { args: ['plugin', 'marketplace', 'add', '../tmp/verify-marketplace'] },
      { args: ['plugin', 'marketplace', 'add', '../tmp/verify-marketplace'] },
      { args: ['plugin', 'marketplace', 'list'] },
      { args: ['plugin', 'install', 'verify-plugin@verify-market'] },
      { args: ['plugin', 'list', '--json'] },
      { args: ['plugin', 'disable', 'verify-plugin@verify-market'] },
      { args: ['plugin', 'list', '--json'] },
      { args: ['plugin', 'enable', 'verify-plugin@verify-market'] },
      { args: ['-p', '/verify-plugin:hello Carol'] },
      { args: ['plugin', 'uninstall', 'verify-plugin@verify-market'] },
      { args: ['plugin', 'list', '--json'] },
    ], script: { final: 'Market done.' },
    expect: (r) => {
      const s = r.steps, bad = [];
      const want = (i, exit, text) => { if (s[i].exitCode !== exit || !(s[i].stdout + s[i].stderr).includes(text)) bad.push(`step ${i}: exit ${s[i].exitCode} ${JSON.stringify((s[i].stdout + s[i].stderr).slice(0, 160))}`); };
      want(0, 0, 'Successfully added marketplace: verify-market');
      want(1, 0, "Marketplace 'verify-market' already on disk");
      want(2, 0, 'verify-market');
      want(3, 0, 'Successfully installed plugin: verify-plugin@verify-market (scope: user)');
      want(4, 0, '"enabled": true');
      want(5, 0, 'Successfully disabled plugin: verify-plugin');
      want(6, 0, '"enabled": false');
      want(7, 0, 'Successfully enabled plugin: verify-plugin');
      want(8, 0, 'Market done.');
      want(9, 0, 'Successfully uninstalled plugin: verify-plugin');
      if (s[10].stdout !== '[]\n') bad.push(`final list ${JSON.stringify(s[10].stdout)}`);
      if (!JSON.stringify(r.requests.find((q) => q.kind === 'api')?.body?.messages || '').includes('VERIFY-PLUGIN-COMMAND: say hello to Carol.')) bad.push('installed plugin command not expanded');
      if (r.requests.some((q) => q.kind !== 'api')) bad.push('external requests');
      return bad;
    } },
  { name: 'plugin-disabled-command', shimAnt: true, timeoutMs: 90000,
    desc: '[垫片] 安装后禁用的插件，其命令不可用：marketplace add → install → disable → -p "/verify-plugin:hello Dan" → 请求里是 "The user\'s message starts with the slash command /verify-plugin:hello, but no command with that name is available in this session…" 的 system-reminder，插件钩子不运行（没有 plugin-hook.log）。',
    setup: copyMarketplace,
    sequence: [
      { args: ['plugin', 'marketplace', 'add', '../tmp/verify-marketplace'] },
      { args: ['plugin', 'install', 'verify-plugin@verify-market'] },
      { args: ['plugin', 'disable', 'verify-plugin@verify-market'] },
      { args: ['-p', '/verify-plugin:hello Dan'] },
    ], script: { final: 'Disabled checked.' },
    expect: (r) => {
      const bad = r.steps.map((s, i) => (s.exitCode !== 0 ? `step ${i} exit ${s.exitCode}` : null)).filter(Boolean);
      const b = JSON.stringify(r.requests.find((q) => q.kind === 'api')?.body?.messages || '');
      if (!b.includes('but no command with that name is available in this session')) bad.push('no unavailable-command reminder');
      if (b.includes('VERIFY-PLUGIN-COMMAND')) bad.push('disabled plugin command expanded');
      if (r.files['plugin-hook.log'] !== undefined) bad.push('disabled plugin hook ran');
      return bad;
    } },
  { name: 'plugin-validate', shimAnt: true, desc: '[垫片] plugin validate：夹具插件 → 退出 0，列出插件目录提交检查的问题（README missing 等）；夹具市场 → "√ Validation passed"；manifest 是坏 JSON 的插件 → "Invalid JSON syntax" + "× Validation failed"，退出 1。',
    setup: (c) => { copyMarketplace(c); fs.mkdirSync(P(c, 'bad/.claude-plugin'), { recursive: true }); fs.writeFileSync(P(c, 'bad/.claude-plugin/plugin.json'), '{"name": 42, "version": "x"'); },
    sequence: [
      { args: (c) => ['plugin', 'validate', pluginDir(c)] },
      { args: (c) => ['plugin', 'validate', path.join(c.tmp, 'verify-marketplace')] },
      { args: (c) => ['plugin', 'validate', P(c, 'bad')] },
    ],
    expect: (r) => {
      const s = r.steps, bad = [];
      if (s[0].exitCode !== 0 || !s[0].stdout.includes('Validating plugin manifest:') || !s[0].stdout.includes('README_MISSING')) bad.push(`plugin: ${s[0].exitCode} ${s[0].stdout.slice(0, 160)}`);
      if (s[1].exitCode !== 0 || !s[1].stdout.includes('Validation passed')) bad.push(`marketplace: ${s[1].exitCode} ${s[1].stdout.slice(0, 160)}`);
      if (s[2].exitCode !== 1 || !s[2].stdout.includes('Invalid JSON syntax') || !s[2].stdout.includes('Validation failed')) bad.push(`bad: ${s[2].exitCode} ${s[2].stdout.slice(0, 160)}`);
      if (r.requests.length) bad.push(`requests ${r.requests.length}`);
      return bad;
    } },

  // ---------- 会话：写入、--resume <id>、--continue、--fork-session、错误路径 ----------
  { name: 'session-resume-id', desc: '-p --session-id <固定 uuid> 写会话文件 ~/.claude/projects/<cwd 编码>/<uuid>.jsonl；-p --resume <uuid> 再问：第二个请求带上第一轮的 user/assistant（4 条消息），新提示词在最后一条 user 消息；会话文件按行摘要（type、role、文本开头）收集比较。',
    sequence: [{ args: ['-p', 'first prompt', '--session-id', SESSION_ID] }, { args: ['-p', 'second prompt', '--resume', SESSION_ID] }],
    script: { final: 'Session reply.' }, collect: collectSessions,
    expect: (r) => {
      const bad = r.steps.map((s, i) => (s.exitCode !== 0 || s.stdout !== 'Session reply.\n' ? `step ${i}: ${s.exitCode} ${JSON.stringify(s.stdout)}` : null)).filter(Boolean);
      const api = r.requests.filter((q) => q.kind === 'api');
      if (api.length !== 2) bad.push(`api requests ${api.length}`);
      const m = api[1]?.body?.messages || [];
      if (m.filter((x) => x.role !== 'system').length !== 3 || !JSON.stringify(m).includes('first prompt') || !JSON.stringify(m).includes('Session reply.')) bad.push(`resumed messages ${JSON.stringify(m.map((x) => x.role))}`);
      if (JSON.stringify(lastUser(api[1])?.content).indexOf('second prompt') < 0) bad.push('second prompt not last');
      const files = Object.keys(r.collected || {});
      if (files.length !== 1 || !files[0].endsWith(`${SESSION_ID}.jsonl`)) bad.push(`session files ${files}`);
      return bad;
    } },
  { name: 'session-continue', desc: '-p 第一轮 → -p --continue 第二轮 → -p --continue 第三轮：--continue 接上同一工作目录最近的会话，第三个请求带前两轮（6 条消息里非 system 的 5 条），只有一个会话文件。',
    sequence: [{ args: ['-p', 'turn one'] }, { args: ['-p', 'turn two', '--continue'] }, { args: ['-p', 'turn three', '--continue'] }],
    script: { final: 'Continued.' }, collect: collectSessions,
    expect: (r) => {
      const bad = r.steps.map((s, i) => (s.exitCode !== 0 ? `step ${i} exit ${s.exitCode}` : null)).filter(Boolean);
      const api = r.requests.filter((q) => q.kind === 'api');
      const m = api[2]?.body?.messages || [];
      for (const t of ['turn one', 'turn two', 'turn three']) if (!JSON.stringify(m).includes(t)) bad.push(`third request lacks ${t}`);
      if (Object.keys(r.collected || {}).length !== 1) bad.push(`session files ${Object.keys(r.collected || {})}`);
      return bad;
    } },
  { name: 'session-fork', desc: '--resume <uuid> --fork-session --output-format json：result.session_id 是新的 uuid（≠ 原 id），请求带原会话历史；会话目录里有原文件和新文件两份，原文件不被改写（行数摘要比较）。',
    sequence: [{ args: ['-p', 'origin', '--session-id', SESSION_ID] }, { args: ['-p', 'forked', '--resume', SESSION_ID, '--fork-session', '--output-format', 'json'] }],
    script: { final: 'Forked.' }, collect: collectSessions,
    expect: (r) => {
      const bad = r.steps.map((s, i) => (s.exitCode !== 0 ? `step ${i} exit ${s.exitCode}` : null)).filter(Boolean);
      let sid; try { sid = JSON.parse(r.steps[1].stdout).session_id; } catch { bad.push('json output'); }
      if (!sid || sid === SESSION_ID) bad.push(`fork session_id ${sid}`);
      if (!JSON.stringify(r.requests.filter((q) => q.kind === 'api')[1]?.body?.messages || '').includes('origin')) bad.push('fork lacks history');
      const files = Object.keys(r.collected || {});
      if (files.length !== 2 || !files.some((f) => f.endsWith(`${sid}.jsonl`))) bad.push(`session files ${files}`);
      return bad;
    } },
  { name: 'session-errors', desc: '会话错误路径：空目录 --continue（没有历史，当新会话处理、退出 0）→ --session-id 非 uuid → "Error: Invalid session ID. Must be a valid UUID."（退出 1）→ 同一 --session-id 用两次 → "Error: Session ID … is already in use."（退出 1）→ --resume 不存在的 id → "No conversation found with session ID: …"（退出 1）→ --no-session-persistence 跑一轮后 --resume 它 → 找不到（没写文件）。',
    sequence: [
      { args: ['-p', 'empty continue', '--continue'] },
      { args: ['-p', 'x', '--session-id', 'not-a-uuid'] },
      { args: ['-p', 'a', '--session-id', SESSION_ID] },
      { args: ['-p', 'b', '--session-id', SESSION_ID] },
      { args: ['-p', 'x', '--resume', '99999999-2222-4333-8444-555555555555'] },
      { args: ['-p', 'd', '--no-session-persistence', '--session-id', '33333333-2222-4333-8444-555555555555'] },
      { args: ['-p', 'e', '--resume', '33333333-2222-4333-8444-555555555555'] },
    ], script: { final: 'Reply.' }, collect: collectSessions,
    expect: (r) => {
      const s = r.steps, bad = [];
      const want = (i, exit, stream, text) => { if (s[i].exitCode !== exit || !s[i][stream].includes(text)) bad.push(`step ${i}: exit ${s[i].exitCode} ${JSON.stringify((s[i].stdout + s[i].stderr).slice(0, 160))}`); };
      want(0, 0, 'stdout', 'Reply.');
      want(1, 1, 'stderr', 'Error: Invalid session ID. Must be a valid UUID.');
      want(2, 0, 'stdout', 'Reply.');
      want(3, 1, 'stderr', `Error: Session ID ${SESSION_ID} is already in use.`);
      want(4, 1, 'stderr', 'No conversation found with session ID: 99999999-2222-4333-8444-555555555555');
      want(5, 0, 'stdout', 'Reply.');
      want(6, 1, 'stderr', 'No conversation found with session ID: 33333333-2222-4333-8444-555555555555');
      if (Object.keys(r.collected || {}).some((f) => f.includes('33333333'))) bad.push('no-persistence session written');
      return bad;
    } },
  { name: 'session-resume-tools', desc: '带工具调用的会话恢复：第一轮 Write + Read（tool_use/tool_result 写进会话文件）→ --resume 第二轮：请求里的历史按原顺序含 tool_use 与 tool_result 块（id 不变），stream-json init 的 session_id 等于原 id。',
    sequence: [
      { args: ['-p', 'write then read', '--session-id', SESSION_ID, '--allowedTools', 'Write,Read'] },
      { args: ['-p', 'what did you do', '--resume', SESSION_ID, '--output-format', 'stream-json', '--verbose'] },
    ],
    script: { steps: [
      { tools: [{ name: 'Write', input: (c) => ({ file_path: P(c, 'hist.txt'), content: 'history\n' }) }] },
      { tools: [{ name: 'Read', input: (c) => ({ file_path: P(c, 'hist.txt') }) }] },
    ], final: 'History reply.' }, collect: collectSessions,
    expect: (r) => {
      const bad = r.steps.map((s, i) => (s.exitCode !== 0 ? `step ${i} exit ${s.exitCode}` : null)).filter(Boolean);
      const api = r.requests.filter((q) => q.kind === 'api');
      const blocks = (api.at(-1)?.body?.messages || []).flatMap((m) => (Array.isArray(m.content) ? m.content.map((b) => b.type) : []));
      if (blocks.filter((b) => b === 'tool_use').length !== 2 || blocks.filter((b) => b === 'tool_result').length !== 2) bad.push(`history blocks ${blocks.join(',')}`);
      const init = parseJsonLines(r.steps[1].stdout).find((e) => e.type === 'system' && e.subtype === 'init');
      if (init?.session_id !== SESSION_ID) bad.push(`init session_id ${init?.session_id}`);
      return bad;
    } },

  // ---------- 伪终端交互（[垫片] bun-ant-shim；屏幕由 vt-screen.mjs 还原；每步等到具体文字再按键） ----------
  ttyScenario({ name: 'tty-multi-turn', desc: '[垫片+伪终端] 多轮对话：输入 first question 回车 → "● First reply." 上屏 → 输入 second question 回车 → 第二个请求带第一轮历史 → "● Second reply." 上屏 → /exit。比较两轮之后的屏幕快照。',
    script: { steps: [{ text: 'First reply.' }], final: 'Second reply.' },
    steps: [
      { waitFor: 'auto mode on', send: 'first question' }, { waitFor: '❯ first question', send: '\r' },
      { waitFor: '● First reply.', snapshot: true, send: 'second question' }, { waitFor: '❯ second question', send: '\r' },
      { waitFor: '● Second reply.', snapshot: true, send: '' }, ...TTY_EXIT],
    check: { apiRequests: 2 },
    more: (r, bad) => {
      const api = r.requests.filter((q) => q.kind === 'api');
      if (!JSON.stringify(api[1]?.body?.messages || '').includes('first question')) bad.push('second request lacks first turn');
      if (!screenText(r.snapshots?.[1]).includes('● First reply.')) bad.push('first reply scrolled away');
    } }),
  ttyScenario({ name: 'tty-permission-accept', desc: '[垫片+伪终端] 权限确认框接受：--permission-mode default，模型要 Write note.txt → 确认框（"Do you want to create note.txt?"，1. Yes / 2. … / 3. No，带文件预览，"Esc to cancel · Tab to amend"）→ 回车选 Yes → 文件写入、tool_result 成功、"● Wrote it." 上屏。比较确认框与结果两个快照。',
    script: TTY_WRITE, args: ['--permission-mode', 'default'],
    steps: [
      { waitFor: 'manual mode on', send: 'write a note' }, { waitFor: '❯ write a note', send: '\r' },
      { waitFor: 'Esc to cancel', snapshot: true, send: '\r' }, { waitFor: '● Wrote it.', snapshot: true, send: '' }, ...TTY_EXIT],
    check: { apiRequests: 2, files: { 'note.txt': 'tty\n' } },
    more: (r, bad) => {
      if (!screenText(r.snapshots?.[0]).includes('Do you want to create note.txt?')) bad.push('no permission dialog');
      wantResult(bad, toolResults(r)[0], { error: false, has: 'File created successfully' }, 'write');
    } }),
  ttyScenario({ name: 'tty-permission-reject', desc: '[垫片+伪终端] 权限确认框拒绝：同上，确认框出现后按 Esc → 屏幕显示 "User rejected write to note.txt"，文件不存在，不再发后续请求（共 1 个请求）。',
    script: TTY_WRITE, args: ['--permission-mode', 'default'],
    steps: [
      { waitFor: 'manual mode on', send: 'write a note' }, { waitFor: '❯ write a note', send: '\r' },
      { waitFor: 'Esc to cancel', send: '\x1b' }, { waitFor: 'User rejected write to note.txt', snapshot: true, send: '' }, ...TTY_EXIT],
    check: { apiRequests: 1, files: {} } }),
  ttyScenario({ name: 'tty-esc-interrupt', desc: '[垫片+伪终端] Esc 中断：假上游对这次请求等 30 秒才回答（finalDelayMs）；回车 3 秒后（请求已到达假上游）按 Esc → 请求被中止，用户消息撤回、原文回到输入框（"❯ wait please"）；Ctrl+U 清空后 /exit。比较中断后的快照；假上游只收到 1 个请求，回答没有上屏。',
    script: { final: 'Too late.', finalDelayMs: 30000 },
    steps: [
      { waitFor: 'auto mode on', send: 'wait please' }, { waitFor: '❯ wait please', send: '\r' },
      ttyPause(3000, '\x1b'), { delayMs: 1500, waitFor: '❯ wait please', snapshot: true, send: '\x15' }, ttyPause(800, '/exit'), { waitFor: '❯ /exit', send: '\r' }],
    check: { apiRequests: 1 },
    more: (r, bad) => {
      const snap = screenText(r.snapshots?.[0]);
      if (!snap.includes('❯ wait please') || snap.includes('Too late.')) bad.push('input not restored after interrupt');
    } }),
  ttyScenario({ name: 'tty-help-dialog', desc: '[垫片+伪终端] /help：输入 /help 回车 → 帮助对话框（General 页：Shortcuts 表）→ Tab 切到 Commands 页（"Browse default commands" 列表）→ Esc 关闭回到输入框 → /exit。比较三个快照；不发 API 请求。',
    script: {},
    steps: [
      { waitFor: 'auto mode on', send: '/help' }, { waitFor: '❯ /help', send: '\r' },
      { waitFor: 'For more help', snapshot: true, send: '\t' }, { waitFor: 'Browse default commands', snapshot: true, send: '\x1b' },
      { delayMs: 500, waitFor: 'auto mode on (shift+tab to cycle)', snapshot: true, send: '' }, ...TTY_EXIT],
    check: { apiRequests: 0 },
    more: (r, bad) => {
      if (!screenText(r.snapshots?.[0]).includes('Shortcuts')) bad.push('help general tab');
      if (screenText(r.snapshots?.[2]).includes('For more help')) bad.push('help not closed');
    } }),
  ttyScenario({ name: 'tty-slash-menu', desc: '[垫片+伪终端] 斜杠命令菜单：输入 / → 命令建议列表（/add-dir、/auto-mode-setup…）→ 再输入 mod → 按模糊匹配过滤（/model 在首位，说明里带当前模型）→ Ctrl+U 清空 → /exit。不发 API 请求。',
    script: {},
    steps: [
      { waitFor: 'auto mode on', send: '/' }, { waitFor: '/add-dir', snapshot: true, send: 'mod' },
      { waitFor: '❯ /mod', snapshot: true, send: '\x15' }, ttyPause(800, '/exit'), { waitFor: '❯ /exit', send: '\r' }],
    check: { apiRequests: 0 },
    more: (r, bad) => { if (!screenText(r.snapshots?.[1]).includes('/model')) bad.push('filtered menu lacks /model'); } }),
  ttyScenario({ name: 'tty-input-edit', desc: '[垫片+伪终端] 输入框编辑：输入 "helo wrld" → ←×3 插入 o → Ctrl+A 到行首、→×3 插入 l → Ctrl+E 到行尾输入 "!!" → Backspace 删一个 → 回车；请求里的提示词正好是 "hello world!"。',
    script: {},
    steps: [
      { waitFor: 'auto mode on', send: 'helo wrld' }, { waitFor: '❯ helo wrld', send: '\x1b[D\x1b[D\x1b[D' }, ttyPause(400, 'o'),
      { waitFor: '❯ helo world', send: '\x01' }, ttyPause(400, '\x1b[C\x1b[C\x1b[C'), ttyPause(400, 'l'),
      { waitFor: '❯ hello world', send: '\x05!!' }, { waitFor: '❯ hello world!!', send: '\x7f' }, ttyPause(600, '\r'),
      { waitFor: '● Hello from the fake upstream.', snapshot: true, send: '' }, ...TTY_EXIT],
    check: { apiRequests: 1 },
    more: (r, bad) => {
      const t = lastUser(r.requests[0])?.content;
      if (!Array.isArray(t) || t.at(-1)?.text !== 'hello world!') bad.push(`prompt ${JSON.stringify(Array.isArray(t) ? t.at(-1) : t)}`);
    } }),
  ttyScenario({ name: 'tty-mode-cycle', desc: '[垫片+伪终端] Shift+Tab 循环权限模式：auto mode on → manual mode on → accept edits on → plan mode on → auto mode on，每次等状态行出现对应文字再拍快照。',
    script: {},
    steps: [
      { waitFor: 'auto mode on', send: '\x1b[Z' }, { waitFor: 'manual mode on · ? for shortcuts', snapshot: true, send: '\x1b[Z' },
      { waitFor: 'accept edits on (shift+tab to cycle)', snapshot: true, send: '\x1b[Z' }, { waitFor: 'plan mode on (shift+tab to cycle)', snapshot: true, send: '\x1b[Z' },
      { waitFor: 'auto mode on (shift+tab to cycle)', snapshot: true, send: '' }, ...TTY_EXIT],
    check: { apiRequests: 0 } }),
  ttyScenario({ name: 'tty-unknown-command', desc: '[垫片+伪终端] 未知斜杠命令：/nosuchcmd 回车 → "Unknown command: /nosuchcmd"，不发 API 请求。',
    script: {},
    steps: [
      { waitFor: 'auto mode on', send: '/nosuchcmd' }, { waitFor: '❯ /nosuchcmd', send: '\r' },
      { waitFor: 'Unknown command: /nosuchcmd', snapshot: true, send: '' }, ...TTY_EXIT],
    check: { apiRequests: 0 } }),
  ttyScenario({ name: 'tty-continue', desc: '[垫片+伪终端] 两次交互会话：第一次问 earlier question 得到 "● Earlier reply." 后 /exit；第二次 --continue：屏幕上恢复出上一轮的提问和回答，再问 later question → 请求带上一轮历史，"● Later reply." 上屏。',
    script: { steps: [{ text: 'Earlier reply.' }], final: 'Later reply.' },
    sequence: [{ args: [], tty: ttyCfg([
      { waitFor: 'auto mode on', send: 'earlier question' }, { waitFor: '❯ earlier question', send: '\r' },
      { waitFor: '● Earlier reply.', send: '' }, ...TTY_EXIT]) }],
    args: ['--continue'],
    steps: [
      { waitFor: '● Earlier reply.', snapshot: true, send: 'later question' }, { waitFor: '❯ later question', send: '\r' },
      { waitFor: '● Later reply.', snapshot: true, send: '' }, ...TTY_EXIT],
    check: { apiRequests: 2 },
    more: (r, bad) => {
      if (r.steps?.[0]?.exitCode !== 0 || r.steps?.[0]?.pty?.steps?.some((s, i) => i !== 3 && !s.matched)) bad.push(`first session: exit ${r.steps?.[0]?.exitCode}`);
      if (!JSON.stringify(r.requests.filter((q) => q.kind === 'api')[1]?.body?.messages || '').includes('earlier question')) bad.push('continued request lacks history');
    } }),
  ttyScenario({ name: 'tty-resume-print-session', desc: '[垫片+伪终端] -p --session-id <uuid> 写的会话，交互模式 --resume <uuid> 打开：屏幕上显示 -p 那一轮的提问和回答，再问一句 → 请求带上历史。',
    script: { steps: [{ text: 'Printed reply.' }], final: 'Resumed reply.' },
    sequence: [{ args: ['-p', 'printed question', '--session-id', SESSION_ID] }],
    args: ['--resume', SESSION_ID],
    steps: [
      { waitFor: '● Printed reply.', snapshot: true, send: 'later question' }, { waitFor: '❯ later question', send: '\r' },
      { waitFor: '● Resumed reply.', snapshot: true, send: '' }, ...TTY_EXIT],
    check: { apiRequests: 2 },
    more: (r, bad) => {
      if (r.steps?.[0]?.exitCode !== 0) bad.push(`-p step exit ${r.steps?.[0]?.exitCode}`);
      if (!JSON.stringify(r.requests.filter((q) => q.kind === 'api')[1]?.body?.messages || '').includes('printed question')) bad.push('resumed request lacks history');
      if (!screenText(r.screen).includes(SESSION_ID)) bad.push('resume hint has a different session id');
    } }),
  ttyScenario({ name: 'tty-continue-print-only', desc: '[垫片+伪终端] 只有 -p 写过会话时，交互模式 --continue 不接 -p 的会话：打印 "No conversation found to continue"，退出 1，不发请求（-p --continue 则能接上，见 session-continue）。',
    script: {},
    sequence: [{ args: ['-p', 'printed question'] }],
    args: ['--continue'],
    steps: [{ waitFor: 'No conversation found to continue', send: '' }], settle: false,
    check: { apiRequests: 1, exit: 1, resumeHint: false } }),
  ttyScenario({ name: 'tty-bash-mode', shimWinAppend: true, desc: '[垫片+伪终端] ! 进入 bash 模式：输入 "!" 再输入 "echo tty-bang" 回车 → 在本地执行，屏幕显示 "! echo tty-bang" 和 "⎿ tty-bang"；316 随后把 <bash-input>echo tty-bang</bash-input> 与 <bash-stdout>tty-bang</bash-stdout> 作为一条 user 消息发给模型（第 1 个请求），再问一句是第 2 个请求。',
    script: { steps: [{ text: 'Bash noted.' }], final: 'Second answer.' },
    steps: [
      { waitFor: 'auto mode on', send: '!' }, ttyPause(600, 'echo tty-bang'), { waitFor: 'echo tty-bang', send: '\r' },
      { waitFor: '● Bash noted.', snapshot: true, send: 'what ran' }, { waitFor: '❯ what ran', send: '\r' },
      { waitFor: '● Second answer.', snapshot: true, send: '' }, ...TTY_EXIT],
    check: { apiRequests: 2 },
    more: (r, bad) => {
      const b = JSON.stringify(r.requests[0]?.body?.messages || '');
      if (!b.includes('<bash-input>echo tty-bang</bash-input>') || !b.includes('<bash-stdout>tty-bang</bash-stdout>')) bad.push('bash input/output not in request');
      if (!screenText(r.snapshots?.[0]).includes('⎿  tty-bang')) bad.push('bash output not on screen');
    } }),
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
