// 诊断用 Bun --preload：把 process.env 换成 Proxy，记录 CLI 读取过的环境变量名（含不存在的），
// 进程退出时写到 VERIFY_ENV_TRACE_OUT 指定的文件（每行一个名字，按首次读取顺序）。
// 只在 run.mjs --env-trace 时注入。
const fs = require('fs');
const out = process.env.VERIFY_ENV_TRACE_OUT;
const seen = new Map();
const real = process.env;
const note = (k) => { if (typeof k === 'string' && !seen.has(k)) seen.set(k, k in real); };
const proxy = new Proxy(real, {
  get(t, k) { note(k); return Reflect.get(t, k); },
  has(t, k) { note(k); return Reflect.has(t, k); },
  getOwnPropertyDescriptor(t, k) { note(k); return Reflect.getOwnPropertyDescriptor(t, k); },
  // 写入直接落到真实 process.env（Bun 的 process.env 只接受普通数据描述符，Reflect.set 经 Proxy 会失败）
  set(t, k, v) { t[k] = v; return true; },
  deleteProperty(t, k) { delete t[k]; return true; },
  defineProperty(t, k, d) { t[k] = d.value; return true; },
});
try { process.env = proxy; } catch (e) { process.stderr.write(`[env-trace] cannot replace process.env: ${e}\n`); }
const dump = () => {
  if (!out) return;
  try { fs.writeFileSync(out, [...seen].map(([k, set]) => `${set ? 'set  ' : 'unset'} ${k}`).join('\n') + '\n'); } catch {}
};
process.on('exit', dump);
const origExit = process.exit;
process.exit = function (c) { dump(); return origExit.call(process, c); };
