// 诊断用 Bun --preload：记录 CLI 通过 child_process.spawn / Bun.spawn 启动的每个子进程
// （命令、参数、cwd、stdio 每一项的类型与值、detached、环境变量名），追加写到 VERIFY_SPAWN_TRACE_OUT（JSON Lines）。
// 对数字 fd 还会用 fs.fstatSync 检查它在父进程里是否有效。
// 只在 run.mjs --spawn-trace（库：runCli({ spawnTrace: true })）时注入，不影响对拍。
const fs = require('fs');
const cp = require('child_process');
const out = process.env.VERIFY_SPAWN_TRACE_OUT;
const describeStdio = (s) => (Array.isArray(s) ? s : [s]).map((x) => {
  if (typeof x === 'number') {
    let valid = true, err;
    try { fs.fstatSync(x); } catch (e) { valid = false; err = e.code; }
    return { fd: x, validInParent: valid, err };
  }
  if (x && typeof x === 'object') return { object: x.constructor?.name, fd: x.fd };
  return x;
});
const log = (rec) => { if (out) try { fs.appendFileSync(out, JSON.stringify(rec) + '\n'); } catch {} };
for (const name of ['spawn', 'spawnSync', 'execFile', 'execFileSync']) {
  const orig = cp[name];
  cp[name] = function (file, args, opts) {
    const o = Array.isArray(args) ? opts : args;
    log({ api: `child_process.${name}`, file, args: Array.isArray(args) ? args : undefined, cwd: o?.cwd,
      stdio: o?.stdio === undefined ? undefined : describeStdio(o.stdio), detached: o?.detached, shell: o?.shell,
      envKeys: o?.env ? Object.keys(o.env).length : undefined });
    return orig.apply(this, arguments);
  };
}
if (typeof Bun !== 'undefined') {
  const orig = Bun.spawn;
  Bun.spawn = function (a, b) {
    const o = Array.isArray(a) ? b : a;
    log({ api: 'Bun.spawn', cmd: Array.isArray(a) ? a : o?.cmd, cwd: o?.cwd, stdio: o?.stdio && describeStdio(o.stdio),
      stdin: typeof o?.stdin === 'number' ? describeStdio(o.stdin) : o?.stdin, stdout: typeof o?.stdout === 'number' ? describeStdio(o.stdout) : o?.stdout,
      stderr: typeof o?.stderr === 'number' ? describeStdio(o.stderr) : o?.stderr });
    return orig.apply(this, arguments);
  };
}
