// 在完全隔离的环境里用 Bun 1.4.4 运行 <tree>/cli.js，可选挂假上游。
//
// 用法（命令行）：
//   node tools/verify/run.mjs <tree> [选项] -- <cli 参数...>
//     <tree>             含 cli.js 的目录，例如 original、runnable
//     --first-party      额外设置 _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1
//     --no-upstream      不启动假上游（也不设 ANTHROPIC_BASE_URL / 代理）
//     --keep             保留沙箱目录（默认跑完删除）
//     --trace            预加载 trace-preload.js，打印 process.exit 调用栈与未捕获异常（诊断用）
//     --spawn-trace      预加载 spawn-trace-preload.js，记录 CLI 启动的子进程与 stdio（结果在 spawns）
//     --shim-ant         预加载 bun-ant-shim.js（验证环境补丁：用公开 API 实现 Bun.ant.CellSegmenter，让 Ink 命令能在公版 Bun 上渲染）
//     --shim-win-append  预加载 win-append-shim.js（验证环境补丁：Windows 上新建独占文件去掉 O_APPEND，让 Bash 工具能写 stdout）
//     --shim-win-hook-spawn 预加载 win-hook-spawn-shim.js（验证环境补丁：Windows 上命令钩子的 spawn 改成 Windows 构建的做法——Git Bash 当 shell、不 detached；scenarios 成员加）
//     --env-trace        预加载 env-trace-preload.js，记录 CLI 读取过的环境变量名（结果在 envReads，非 --json 时打印）
//     --json             输出完整结果 JSON（含假上游收到的请求）
//     --timeout <ms>     超时，默认 60000
//     --env K=V          追加/覆盖环境变量（--env K 表示删除 K），可重复
//   例：node tools/verify/run.mjs original -- --version
//       node tools/verify/run.mjs original --json -- -p hi
//
// 用法（库）：import { runCli, runScenario, pool } from './run.mjs'
//   const r = await runCli({ tree, args | sequence: [{args, stdin}], script, firstParty, upstream, setup, collect,
//                            timeoutMs, stdin, env, keep, trace, envTrace, spawnTrace, shimAnt, shimWinAppend, shimWinHookSpawn, tty })
//   r = { exitCode, signal, timedOut, stdout, stderr, durationMs, steps?, requests, files, collected, envReads?, spawns?,
//         screen?, snapshots?, pty?, sandbox: {root, home, work, tmp, …}, leaks, hostWarnings }
//   tty: { cols, rows, idleMs, expectExit, steps: [{ waitFor, idleMs, snapshot, send }] } 时经 pty-driver.js 在伪终端
//     （ConPTY）里运行，screen/snapshots 是 vt-screen.mjs 还原的屏幕文字。
//   runScenario(tree, scenario) 按 scenarios.mjs 的场景对象调用 runCli；pool(items, n, fn) 并发 n 路。
//   Windows 上 libuv 会给子进程补 HOMEDRIVE/HOMEPATH/USERDOMAIN/LOGONSERVER 的真实值，这里显式覆盖。
//   PATH 最前面放沙箱里的假 npm（立即失败），不运行本机真实 npm（fakeNpm，见 verify.md 第 14 节）。
//
// 隔离（详见 docs/process/verify.md）：
//   - 环境变量从白名单重建（PATH、SystemRoot 等系统必需项），父进程里的 ANTHROPIC_* / CLAUDE_* / OTEL_* /
//     代理 / 云凭证一律不继承。
//   - HOME、USERPROFILE、APPDATA、LOCALAPPDATA、CLAUDE_CONFIG_DIR、XDG_*、TMP/TEMP/TMPDIR 全部指向本次沙箱。
//   - 工作目录是沙箱里的空目录 work/。沙箱根默认在项目所在盘的 \.cc-verify（Windows），祖先目录只有盘根，
//     避免 CLI 向上查找 CLAUDE.md / .claude/ 时碰到真实用户目录。可用 VERIFY_SANDBOX_ROOT 覆盖。
//   - 关闭遥测与非必要流量（DISABLE_TELEMETRY、CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC 等）。
//   - ANTHROPIC_API_KEY 是假值；ANTHROPIC_BASE_URL 指向本地假上游；HTTP(S)_PROXY 也指向假上游，
//     它对 CONNECT / 绝对 URL 只记录并回 403，所以任何漏网的外网请求都会被拦下并出现在 requests 里。
//   - bun 以 --no-install 运行，禁止自动安装依赖。
//   - 超时用 taskkill /PID <pid> /T /F（按 PID 杀进程树，不按名字），跑完删除沙箱。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startFakeUpstream } from './fake-upstream.mjs';
import { renderScreen } from './vt-screen.mjs';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const FAKE_API_KEY = 'sk-ant-api03-verify-fake-key-not-a-real-credential-0000000000000000000000000000000000000000000000-AAAAAA';

export function bunPath() {
  if (process.env.VERIFY_BUN) return process.env.VERIFY_BUN;
  const exe = path.join(projectRoot, 'node_modules', 'bun', 'bin', process.platform === 'win32' ? 'bun.exe' : 'bun');
  if (!fs.existsSync(exe)) throw new Error(`找不到 ${exe}，请在项目根运行 npm i`);
  return exe;
}

export function bunVersion() {
  const v = spawnSync(bunPath(), ['--revision'], { encoding: 'utf8' });
  return (v.stdout || '').trim();
}

function gitBashPath() {
  if (process.env.VERIFY_GIT_BASH) return process.env.VERIFY_GIT_BASH;
  if (process.platform !== 'win32') return undefined;
  const w = spawnSync('where', ['git'], { encoding: 'utf8' });
  for (const line of (w.stdout || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const root = path.resolve(path.dirname(line.trim()), '..');
    const cand = path.join(root, 'bin', 'bash.exe');
    if (fs.existsSync(cand)) return cand;
  }
  return undefined;
}

export function sandboxRoot() {
  if (process.env.VERIFY_SANDBOX_ROOT) return process.env.VERIFY_SANDBOX_ROOT;
  if (process.platform === 'win32') return path.join(path.parse(projectRoot).root, '.cc-verify');
  return path.join(os.tmpdir(), 'cc-verify');
}

export function makeSandbox() {
  const rootDir = sandboxRoot();
  fs.mkdirSync(rootDir, { recursive: true });
  const root = fs.realpathSync.native(fs.mkdtempSync(path.join(rootDir, 'run-')));
  const sb = { root, home: path.join(root, 'home'), work: path.join(root, 'work'), tmp: path.join(root, 'tmp') };
  for (const d of [sb.home, sb.work, sb.tmp]) fs.mkdirSync(d, { recursive: true });
  return sb;
}

export function removeSandbox(sb) {
  if (!sb?.root || !sb.root.startsWith(sandboxRoot())) throw new Error(`拒绝删除沙箱外路径: ${sb?.root}`);
  for (let i = 0; i < 10; i++) {
    try { fs.rmSync(sb.root, { recursive: true, force: true }); break; } catch { spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},300)']); }
  }
  if (fs.existsSync(sb.root)) process.stderr.write(`[verify] 警告：沙箱没删干净（可能有子进程仍在写）：${sb.root}\n`);
  try { fs.rmdirSync(sandboxRoot()); } catch { /* 还有其他运行在用，或非空 */ }
}

// 系统必需、与身份/凭证无关的变量；其余一律不继承。
const INHERIT = ['PATH', 'Path', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'windir', 'WINDIR', 'ComSpec', 'COMSPEC',
  'SystemDrive', 'SYSTEMDRIVE', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'PROCESSOR_IDENTIFIER', 'OS',
  'ProgramFiles', 'ProgramFiles(x86)', 'ProgramW6432', 'CommonProgramFiles', 'ProgramData', 'LANG', 'TZ'];

export function isolatedEnv(sb, { upstreamUrl, firstParty = false, extra = {}, fakeNpm = true } = {}) {
  const env = {};
  for (const k of INHERIT) if (process.env[k] !== undefined) env[k] = process.env[k];
  const h = sb.home;
  Object.assign(env, {
    HOME: h, USERPROFILE: h,
    APPDATA: path.join(h, 'AppData', 'Roaming'), LOCALAPPDATA: path.join(h, 'AppData', 'Local'),
    CLAUDE_CONFIG_DIR: path.join(h, '.claude'),
    XDG_CONFIG_HOME: path.join(h, '.config'), XDG_DATA_HOME: path.join(h, '.local', 'share'),
    XDG_CACHE_HOME: path.join(h, '.cache'), XDG_STATE_HOME: path.join(h, '.local', 'state'),
    XDG_RUNTIME_DIR: path.join(sb.tmp, 'xdg-runtime'),
    TMP: sb.tmp, TEMP: sb.tmp, TMPDIR: sb.tmp,
    USER: 'verify', USERNAME: 'verify', LOGNAME: 'verify',
    // Windows 上 libuv 建子进程环境时，缺这几项会从父进程补上（HOMEPATH=\Users\<真实用户>），所以显式给沙箱值
    HOMEDRIVE: path.parse(h).root.replace(/\\$/, ''), HOMEPATH: h.slice(path.parse(h).root.length - 1),
    USERDOMAIN: 'VERIFY', LOGONSERVER: '\\\\VERIFY',
    // 隐私级别：r7t() 里 CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC → "essential-traffic"（最严）
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DISABLE_TELEMETRY: '1', DO_NOT_TRACK: '1',
    DISABLE_AUTOUPDATER: '1', DISABLE_ERROR_REPORTING: '1', DISABLE_GROWTHBOOK: '1',
    DISABLE_INSTALLATION_CHECKS: '1', CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: '1',
    CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL: '1',
    // 输出稳定
    NO_COLOR: '1', FORCE_COLOR: '0', TERM: 'dumb', COLUMNS: '80', LINES: '40',
    // Bun 转译缓存默认写到 XDG_CACHE_HOME（每次约 32 MB），关掉；实测对启动时间无明显影响
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: '0',
    // 子进程里的 node（假 MCP 服务器等）不往沙箱 TMP 写编译缓存（曾在删除沙箱时并发写入，留下残留目录）
    NODE_DISABLE_COMPILE_CACHE: '1',
  });
  for (const k of Object.keys(env)) if (k.startsWith('XDG_')) fs.mkdirSync(env[k], { recursive: true });
  fs.mkdirSync(env.APPDATA, { recursive: true });
  fs.mkdirSync(env.LOCALAPPDATA, { recursive: true });
  const bash = gitBashPath();
  if (bash) env.CLAUDE_CODE_GIT_BASH_PATH = bash;
  // 假 npm：CLI 的 update/doctor 会跑 npm（npm config get prefix、npm view … --prefer-online，后者带 5 秒超时）。
  // 用真实 npm 既不隔离（读本机全局 npmrc）也不稳定（机器忙时 npm 启动超过 5 秒就被中止、一个请求都发不出），
  // 所以在 PATH 最前面放一个立即失败的 npm（见 docs/process/verify.md 第 14 节）。
  if (fakeNpm) {
    const bin = path.join(sb.root, 'bin');
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(path.join(bin, 'npm.cmd'), [
      '@echo off',
      'if "%~1"=="-g" shift',
      'if "%~1"=="config" (',
      '  echo(%VERIFY_NPM_PREFIX%',
      '  exit /b 0',
      ')',
      'echo npm error code EVERIFYOFFLINE 1>&2',
      'echo npm error verify sandbox: the npm registry is not reachable 1>&2',
      'exit /b 1', ''].join(String.fromCharCode(13, 10)));
    fs.writeFileSync(path.join(bin, 'npm'), ['#!/bin/sh', '[ "$1" = "-g" ] && shift',
      'if [ "$1" = "config" ]; then echo "$VERIFY_NPM_PREFIX"; exit 0; fi',
      'echo "npm error code EVERIFYOFFLINE" >&2', 'echo "npm error verify sandbox: the npm registry is not reachable" >&2', 'exit 1', ''].join(String.fromCharCode(10)));
    try { fs.chmodSync(path.join(bin, 'npm'), 0o755); } catch {}
    env.VERIFY_NPM_PREFIX = path.join(h, 'npm-global');
    for (const k of Object.keys(env).filter((k) => k.toUpperCase() === 'PATH')) env[k] = bin + path.delimiter + env[k];
  }
  if (upstreamUrl) {
    Object.assign(env, {
      ANTHROPIC_API_KEY: FAKE_API_KEY, ANTHROPIC_BASE_URL: upstreamUrl,
      HTTP_PROXY: upstreamUrl, HTTPS_PROXY: upstreamUrl, http_proxy: upstreamUrl, https_proxy: upstreamUrl,
      NO_PROXY: '127.0.0.1,localhost,::1', no_proxy: '127.0.0.1,localhost,::1',
    });
  } else {
    // 没有假上游时也把代理指向一个必然拒绝的本地端口，任何外网请求都会失败
    Object.assign(env, { HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9',
      http_proxy: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9' });
  }
  if (firstParty) env._CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL = '1';
  for (const [k, v] of Object.entries(extra)) { if (v === undefined) delete env[k]; else env[k] = v; }
  return env;
}

function killTree(child) {
  if (!child.pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch {} } }
}

// 按场景对象运行（scenarios.mjs 的字段）
export async function runScenario(tree, s) {
  return runCli({ tree, args: s.args, sequence: s.sequence, script: s.script, upstream: s.upstream !== false,
    firstParty: !!s.firstParty, setup: s.setup, collect: s.collect, stdin: s.stdin, env: s.env, timeoutMs: s.timeoutMs || 60000,
    shimAnt: !!s.shimAnt, shimWinAppend: !!s.shimWinAppend, shimWinHookSpawn: !!s.shimWinHookSpawn, tty: s.tty });
}

export async function pool(items, n, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.max(1, n) }, async () => {
    while (queue.length) await fn(queue.shift());
  }));
}

// 一次 CLI 调用：spawn bun，收集输出，超时按 PID 杀进程树
async function spawnOnce({ entry, args, sb, env, stdin, timeoutMs, trace, envTrace, spawnTrace, shimAnt, shimWinAppend, shimWinHookSpawn, tty }) {
  const t0 = Date.now();
  const pre = [];
  if (trace) pre.push('--preload', path.join(projectRoot, 'tools', 'verify', 'trace-preload.js'));
  if (envTrace) pre.push('--preload', path.join(projectRoot, 'tools', 'verify', 'env-trace-preload.js'));
  if (spawnTrace) pre.push('--preload', path.join(projectRoot, 'tools', 'verify', 'spawn-trace-preload.js'));
  if (shimAnt) pre.push('--preload', path.join(projectRoot, 'tools', 'verify', 'bun-ant-shim.js'));
  if (shimWinAppend) pre.push('--preload', path.join(projectRoot, 'tools', 'verify', 'win-append-shim.js'));
  if (shimWinHookSpawn) pre.push('--preload', path.join(projectRoot, 'tools', 'verify', 'win-hook-spawn-shim.js'));
  const cliArgv = ['--no-install', ...pre, entry, ...args];
  // tty：经 pty-driver.js 在伪终端（Windows 上是 ConPTY）里运行，stdout 收到的是终端字节流
  let cmdArgv = cliArgv, cmdEnv = env;
  if (tty) {
    cmdArgv = [path.join(projectRoot, 'tools', 'verify', 'pty-driver.js')];
    cmdEnv = { ...env, VERIFY_PTY_CONFIG: JSON.stringify({ argv: [bunPath(), ...cliArgv], cols: tty.cols || 100, rows: tty.rows || 30,
      steps: tty.steps || [], idleMs: tty.idleMs ?? 1500, expectExit: !!tty.expectExit, exitWaitMs: tty.exitWaitMs,
      maxMs: Math.max(5000, timeoutMs - 5000) }) };
  }
  const child = spawn(bunPath(), cmdArgv, {
    cwd: sb.work, env: cmdEnv, stdio: [stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    windowsHide: true, detached: process.platform !== 'win32',
  });
  if (stdin !== undefined) { child.stdin.on('error', () => {}); child.stdin.end(stdin); }
  const out = [], err = [];
  child.stdout.on('data', (c) => out.push(c));
  child.stderr.on('data', (c) => err.push(c));
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; killTree(child); }, timeoutMs);
  const [exitCode, signal] = await new Promise((resolve) => {
    child.on('error', (e) => { err.push(Buffer.from(`spawn error: ${e.message}`)); resolve([null, null]); });
    child.on('close', (c, s) => resolve([c, s]));
  });
  clearTimeout(timer);
  killTree(child); // 收掉可能残留的孙进程（bash、MCP 服务器等）
  const res = { args, exitCode, signal, timedOut, durationMs: Date.now() - t0,
    stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') };
  if (tty) {
    const lines = res.stderr.trimEnd().split('\n');
    try { res.pty = JSON.parse(lines.at(-1)); res.stderr = lines.slice(0, -1).join('\n'); } catch { res.pty = null; }
    res.exitCode = res.pty?.ptyExit ?? null;
    res.snapshots = (res.pty?.steps || []).filter((s) => s.snapshot).map((s) => s.snapshot);
    for (const s of res.pty?.steps || []) delete s.snapshot;
    res.screen = renderScreen(res.stdout, { cols: tty.cols || 100, rows: tty.rows || 30 }).lines;
  }
  return res;
}

// sequence: [{ args, stdin }, ...] 在同一沙箱、同一假上游里依次运行（例如 mcp add → mcp remove）。
// 结果的 exitCode/stdout/stderr 取自最后一步，每一步的完整结果在 steps 里。
// collect(ctx) 在删除沙箱前调用，返回值放进 result.collected（例如读取 MCP 服务器日志）。
export async function runCli({ tree, args = [], sequence, script, upstream = true, firstParty = false, setup, collect,
  timeoutMs = 60000, stdin, env: extraEnv = {}, keep = false, trace = false, envTrace = false, spawnTrace = false, shimAnt = false, shimWinAppend = false, shimWinHookSpawn = false, tty } = {}) {
  const treeDir = path.resolve(projectRoot, tree);
  const entry = path.join(treeDir, 'cli.js');
  if (!fs.existsSync(entry)) throw new Error(`找不到 ${entry}`);
  const sb = makeSandbox();
  const ctx = { cwd: sb.work, home: sb.home, tmp: sb.tmp, projectRoot };
  let up;
  try {
    if (setup) await setup(ctx);
    if (upstream) up = await startFakeUpstream({ script: script || {}, ctx });
    const env = isolatedEnv(sb, { upstreamUrl: up?.url, firstParty, extra: extraEnv });
    if (envTrace) env.VERIFY_ENV_TRACE_OUT = path.join(sb.tmp, 'env-trace.txt');
    if (spawnTrace) env.VERIFY_SPAWN_TRACE_OUT = path.join(sb.tmp, 'spawn-trace.jsonl');
    const plan = sequence || [{ args, stdin }];
    const steps = [];
    for (const st of plan) {
      const a = typeof st.args === 'function' ? st.args(ctx) : st.args;
      steps.push(await spawnOnce({ entry, args: a, sb, env, stdin: st.stdin, timeoutMs, trace, envTrace, spawnTrace, shimAnt, shimWinAppend, shimWinHookSpawn, tty: st.tty ?? tty }));
    }
    const last = steps.at(-1);
    const result = {
      tree: path.relative(projectRoot, treeDir).replace(/\\/g, '/') || '.', firstParty,
      ...last, durationMs: steps.reduce((n, x) => n + x.durationMs, 0),
      steps: sequence ? steps : undefined,
      requests: up ? up.requests : [],
      upstreamUrl: up?.url ?? null,
      sandbox: { ...sb, sandboxRoot: sandboxRoot(), realHome: os.homedir(), projectRoot, treeDir, bun: bunPath() },
      files: snapshotFiles(sb.work),
      collected: collect ? await collect(ctx) : undefined,
      envReads: envTrace ? readEnvTrace(env.VERIFY_ENV_TRACE_OUT) : undefined,
      spawns: spawnTrace ? readJsonLines(env.VERIFY_SPAWN_TRACE_OUT) : undefined,
      hostWarnings: hostWarnings(sb),
    };
    result.leaks = auditLeaks(result);
    return result;
  } finally {
    if (up) await up.close();
    if (!keep) removeSandbox(sb);
  }
}

function readJsonLines(p) {
  try { return fs.readFileSync(p, 'utf8').split(String.fromCharCode(10)).filter((l) => l.trim()).map((l) => JSON.parse(l)); } catch { return []; }
}

function readEnvTrace(p) {
  try {
    return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => ({ name: l.slice(6), set: l.startsWith('set') }))
      .filter((e) => e.name !== 'VERIFY_ENV_TRACE_OUT');
  } catch { return null; }
}

// 316 linux 构建在 Windows 上把托管设置目录解析成 <cwd 盘>:\etc\claude-code（见 docs/process/verify.md），
// 那里若有文件会被当作托管设置读入，破坏隔离。
function hostWarnings(sb) {
  const w = [];
  const managed = path.join(path.parse(sb.work).root, 'etc', 'claude-code');
  if (fs.existsSync(managed)) w.push(`managed settings dir exists: ${managed}`);
  return w;
}

// 工作目录里的文件（场景用来检查 Write/Edit 的结果）
function snapshotFiles(dir) {
  const out = {};
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name), r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(p, r);
      else { const s = fs.statSync(p); out[r] = s.size > 65536 ? `<${s.size} bytes>` : fs.readFileSync(p, 'utf8'); }
    }
  };
  try { walk(dir, ''); } catch {}
  return out;
}

// 检查真实用户目录 / 项目路径 / 外网请求是否泄漏进输出或请求
export function auditLeaks(r) {
  const leaks = [];
  let hay = [r.stdout, r.stderr, ...(r.steps || []).flatMap((s) => [s.stdout, s.stderr]), JSON.stringify(r.requests)].join('\n');
  const variants = (p) => [p, p.replace(/\\/g, '/'), p.replace(/\\/g, '\\\\')];
  // 被测树、bun、tools/verify 自身出现在输出里是正常的（doctor 的 Invoked/Path、MCP 服务器路径等）
  const allowed = [r.sandbox.treeDir, path.dirname(r.sandbox.bun), path.join(r.sandbox.projectRoot, 'tools', 'verify')];
  for (const p of allowed) for (const v of variants(p)) hay = hay.split(v).join('<ALLOWED>');
  const homeNoDrive = r.sandbox.realHome ? r.sandbox.realHome.slice(path.parse(r.sandbox.realHome).root.length - 1) : null;
  for (const [what, p] of [['realHome', r.sandbox.realHome], ['realHome', homeNoDrive], ['projectRoot', r.sandbox.projectRoot]]) {
    if (!p) continue;
    for (const v of variants(p)) if (v && hay.toLowerCase().includes(v.toLowerCase())) { leaks.push({ what, value: v }); break; }
  }
  for (const q of r.requests) if (q.kind !== 'api') leaks.push({ what: 'external-request', value: `${q.method} ${q.url}` });
  return leaks;
}

// 命令行
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const sep = argv.indexOf('--');
  const own = sep >= 0 ? argv.slice(0, sep) : argv.slice(0, 1);
  const cliArgs = sep >= 0 ? argv.slice(sep + 1) : argv.slice(1);
  const tree = own.find((a, i) => !a.startsWith('--') && !['--env', '--timeout'].includes(own[i - 1])) || 'original';
  const flag = (f) => own.includes(f);
  const timeoutIdx = own.indexOf('--timeout');
  const env = {};
  own.forEach((a, i) => { if (a === '--env') { const [k, ...v] = own[i + 1].split('='); env[k] = v.length ? v.join('=') : undefined; } });
  const r = await runCli({ tree, args: cliArgs, firstParty: flag('--first-party'), upstream: !flag('--no-upstream'),
    keep: flag('--keep'), trace: flag('--trace'), envTrace: flag('--env-trace'), spawnTrace: flag('--spawn-trace'), shimAnt: flag('--shim-ant'), shimWinAppend: flag('--shim-win-append'), shimWinHookSpawn: flag('--shim-win-hook-spawn'), env, timeoutMs: timeoutIdx >= 0 ? Number(own[timeoutIdx + 1]) : 60000 });
  if (flag('--json')) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    process.stdout.write(r.stdout);
    process.stderr.write(r.stderr);
    console.error(`\n[verify] exit=${r.exitCode} signal=${r.signal} timedOut=${r.timedOut} ${r.durationMs}ms requests=${r.requests.length}` +
      (r.leaks.length ? ` LEAKS=${JSON.stringify(r.leaks)}` : '') + (flag('--keep') ? ` sandbox=${r.sandbox.root}` : ''));
    for (const q of r.requests) console.error(`[verify]   #${q.seq} ${q.kind} ${q.method} ${q.url} -> ${q.response?.status}`);
    if (r.envReads) console.error(`[verify] env reads (${r.envReads.length}, 按首次读取顺序):\n` + r.envReads.map((e) => `  ${e.set ? 'set  ' : 'unset'} ${e.name}`).join('\n'));
  }
  process.exitCode = r.exitCode ?? 1;
}
