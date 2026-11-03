// 伪终端驱动（用 Bun 运行，不是 Node）：在 ConPTY / PTY 里启动 CLI，按脚本等待与按键，输出终端字节流。
//
// 用法（一般由 run.mjs 的 tty 选项调用，不直接用）：
//   VERIFY_PTY_CONFIG='{"argv":[...],"cols":100,"rows":30,"steps":[...],"idleMs":1500,"maxMs":40000}' \
//     bun tools/verify/pty-driver.js
//   argv   子进程命令行（例如 [bun.exe, --no-install, --preload, shim, <tree>/cli.js, ...]）
//   steps  [{ waitFor?: "屏幕上要出现的文字", timeoutMs?: 等 waitFor 的上限（默认 20000）,
//             idleMs?: 无输出多久算稳定, snapshot?: true 时在发送按键前记下当前屏幕, send?: "按键（\r 回车、\x03 Ctrl+C…）" }, ...]
//          每步先等 waitFor 出现（在 vt-screen.mjs 模拟出的屏幕文字里找，空白折叠），再等输出静止 idleMs，然后发送 send。
//          （scenarios 成员加，向后兼容）waitFor 也可以是字符串数组：全部出现才算匹配，用来等"回答已上屏且状态行已恢复"；
//          delayMs：先等这么久再开始 waitFor（按键后旧画面还在屏幕上时，避免 waitFor 立刻匹配到旧画面）。
//   全部步骤结束后再等一次静止（若子进程已退出则不等），然后关闭终端、结束子进程。
// 输出：stdout 是终端原始字节流（UTF-8）；stderr 最后一行是 JSON 摘要
//   {"ptyExit":退出码|null,"killed":是否被我们结束,"ms":总耗时,"steps":[{"step":i,"matched":bool,"ms":..}]}
// 依赖：Bun.Terminal（公版 Bun 1.4.4 在 Windows 上走 ConPTY，已实测可用）。
import { renderScreen } from './vt-screen.mjs';

const cfg = JSON.parse(process.env.VERIFY_PTY_CONFIG || '{}');
delete process.env.VERIFY_PTY_CONFIG;
const cols = cfg.cols || 100, rows = cfg.rows || 30;
const maxMs = cfg.maxMs || 40000;
const t0 = Date.now();
let raw = '';
let lastData = Date.now();
const screenText = () => renderScreen(raw, { cols, rows }).lines.join('\n').replace(/\s+/g, ' ');

const proc = Bun.spawn(cfg.argv, {
  cwd: process.cwd(),
  env: process.env,
  terminal: { cols, rows, data(_t, d) { raw += Buffer.from(d).toString('utf8'); lastData = Date.now(); } },
});
let exited = null;
proc.exited.then((c) => { exited = c; });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const left = () => maxMs - (Date.now() - t0);
async function waitIdle(ms) {
  while (left() > 0 && exited === null) {
    if (Date.now() - lastData >= ms) return true;
    await sleep(50);
  }
  return exited !== null;
}
async function waitFor(text, timeoutMs) {
  const until = Date.now() + Math.min(timeoutMs, Math.max(0, left()));
  const all = Array.isArray(text) ? text : [text];
  const seen = () => { const t = screenText(); return all.every((x) => t.includes(x)); };
  while (Date.now() < until && exited === null) {
    if (seen()) return true;
    await sleep(100);
  }
  return seen();
}

const report = [];
for (const [i, st] of (cfg.steps || []).entries()) {
  const s0 = Date.now();
  if (st.delayMs) await sleep(Math.min(st.delayMs, Math.max(0, left())));
  const matched = st.waitFor ? await waitFor(st.waitFor, st.timeoutMs ?? 20000) : true;
  await waitIdle(st.idleMs ?? cfg.idleMs ?? 1500);
  const snap = st.snapshot ? renderScreen(raw, { cols, rows }).screen : undefined;
  if (st.send !== undefined && exited === null) proc.terminal.write(st.send);
  report.push({ step: i, matched, ms: Date.now() - s0, ...(snap && { snapshot: snap }) });
}
// 最后一步之后：等子进程自己退出或输出静止
const end = Date.now() + Math.min(left(), cfg.exitWaitMs ?? 8000);
while (exited === null && Date.now() < end) {
  if (Date.now() - lastData >= (cfg.idleMs ?? 1500) && !cfg.expectExit) break;
  await sleep(50);
}
const killed = exited === null;
if (killed) {
  try { proc.kill(); } catch {}
  await Promise.race([proc.exited, sleep(2000)]);
}
try { proc.terminal.close(); } catch {}
process.stdout.write(raw);
process.stderr.write('\n' + JSON.stringify({ ptyExit: killed ? null : exited, killed, ms: Date.now() - t0, steps: report }) + '\n');
process.exit(0);
