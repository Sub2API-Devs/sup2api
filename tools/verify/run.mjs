// 在完全隔离的环境里用 Bun 1.4.4 运行 <tree>/cli.js，可选挂假上游。
//
// 用法（命令行）：
//   node tools/verify/run.mjs <tree> [选项] -- <cli 参数...>
//     <tree>             含 cli.js 的目录，例如 original、runnable
//     --first-party      额外设置 _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1
//     --no-upstream      不启动假上游（也不设 ANTHROPIC_BASE_URL / 代理）
//     --keep             保留沙箱目录（默认跑完删除）
//     --json             输出完整结果 JSON（含假上游收到的请求）
//     --timeout <ms>     超时，默认 60000
//   例：node tools/verify/run.mjs original -- --version
//       node tools/verify/run.mjs original --json -- -p hi
//
// 用法（库）：import { runCli } from './run.mjs'
//   const r = await runCli({ tree, args, script, firstParty, setup, timeoutMs, stdin, env })
//   r = { exitCode, signal, timedOut, stdout, stderr, durationMs, requests, sandbox: {root, home, work, tmp}, leaks }
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
  try { fs.rmdirSync(sandboxRoot()); } catch { /* 还有其他运行在用，或非空 */ }
}

// 系统必需、与身份/凭证无关的变量；其余一律不继承。
const INHERIT = ['PATH', 'Path', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'windir', 'WINDIR', 'ComSpec', 'COMSPEC',
  'SystemDrive', 'SYSTEMDRIVE', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'PROCESSOR_IDENTIFIER', 'OS',
  'ProgramFiles', 'ProgramFiles(x86)', 'ProgramW6432', 'CommonProgramFiles', 'ProgramData', 'LANG', 'TZ'];

export function isolatedEnv(sb, { upstreamUrl, firstParty = false, extra = {} } = {}) {
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
    // 隐私级别：r7t() 里 CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC → "essential-traffic"（最严）
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DISABLE_TELEMETRY: '1', DO_NOT_TRACK: '1',
    DISABLE_AUTOUPDATER: '1', DISABLE_ERROR_REPORTING: '1', DISABLE_GROWTHBOOK: '1',
    DISABLE_INSTALLATION_CHECKS: '1', CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: '1',
    CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL: '1',
    // 输出稳定
    NO_COLOR: '1', FORCE_COLOR: '0', TERM: 'dumb', COLUMNS: '80', LINES: '40',
  });
  for (const k of Object.keys(env)) if (k.startsWith('XDG_')) fs.mkdirSync(env[k], { recursive: true });
  fs.mkdirSync(env.APPDATA, { recursive: true });
  fs.mkdirSync(env.LOCALAPPDATA, { recursive: true });
  const bash = gitBashPath();
  if (bash) env.CLAUDE_CODE_GIT_BASH_PATH = bash;
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

export async function runCli({ tree, args = [], script, upstream = true, firstParty = false, setup, timeoutMs = 60000,
  stdin, env: extraEnv = {}, keep = false } = {}) {
  const treeDir = path.resolve(projectRoot, tree);
  const entry = path.join(treeDir, 'cli.js');
  if (!fs.existsSync(entry)) throw new Error(`找不到 ${entry}`);
  const sb = makeSandbox();
  const ctx = { cwd: sb.work, home: sb.home, tmp: sb.tmp };
  let up;
  try {
    if (setup) await setup(ctx);
    if (upstream) up = await startFakeUpstream({ script: script || {}, ctx });
    const env = isolatedEnv(sb, { upstreamUrl: up?.url, firstParty, extra: extraEnv });
    const t0 = Date.now();
    const child = spawn(bunPath(), ['--no-install', entry, ...args], {
      cwd: sb.work, env, stdio: [stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
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
    killTree(child); // 收掉可能残留的孙进程（bash 等）
    const result = {
      tree: path.relative(projectRoot, treeDir).replace(/\\/g, '/') || '.', args, firstParty,
      exitCode, signal, timedOut, durationMs: Date.now() - t0,
      stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8'),
      requests: up ? up.requests : [],
      upstreamUrl: up?.url ?? null,
      sandbox: { ...sb, sandboxRoot: sandboxRoot(), realHome: os.homedir(), projectRoot },
      files: snapshotFiles(sb.work),
    };
    result.leaks = auditLeaks(result);
    return result;
  } finally {
    if (up) await up.close();
    if (!keep) removeSandbox(sb);
  }
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
  const hay = r.stdout + '\n' + r.stderr + '\n' + JSON.stringify(r.requests);
  const variants = (p) => [p, p.replace(/\\/g, '/'), p.replace(/\\/g, '\\\\')];
  for (const [what, p] of [['realHome', r.sandbox.realHome], ['projectRoot', r.sandbox.projectRoot]]) {
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
  const tree = own.find((a) => !a.startsWith('--')) || 'original';
  const flag = (f) => own.includes(f);
  const timeoutIdx = own.indexOf('--timeout');
  const r = await runCli({ tree, args: cliArgs, firstParty: flag('--first-party'), upstream: !flag('--no-upstream'),
    keep: flag('--keep'), timeoutMs: timeoutIdx >= 0 ? Number(own[timeoutIdx + 1]) : 60000 });
  if (flag('--json')) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    process.stdout.write(r.stdout);
    process.stderr.write(r.stderr);
    console.error(`\n[verify] exit=${r.exitCode} signal=${r.signal} timedOut=${r.timedOut} ${r.durationMs}ms requests=${r.requests.length}` +
      (r.leaks.length ? ` LEAKS=${JSON.stringify(r.leaks)}` : '') + (flag('--keep') ? ` sandbox=${r.sandbox.root}` : ''));
    for (const q of r.requests) console.error(`[verify]   #${q.seq} ${q.kind} ${q.method} ${q.url} -> ${q.response?.status}`);
  }
  process.exitCode = r.exitCode ?? 1;
}
