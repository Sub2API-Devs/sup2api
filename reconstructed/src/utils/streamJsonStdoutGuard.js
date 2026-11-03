/**
 * utils/streamJsonStdoutGuard.ts
 *
 * stream-json 输出模式下拦截 process.stdout.write：非 JSON 行改写到 stderr 并加 [stdout-guard] 标记，保证 stdout 每行都是 JSON。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/streamJsonStdoutGuard.ts
 * pieces: chunk-tyg7f3ek.js (3)
 * attribution: fingerprint 2, file-local 1
 */
import { jsonParse } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { registerCleanup } from "./cleanupRegistry.js";

/**
 * 被拦截行在 stderr 上的前缀 "[stdout-guard]"。
 */
//@ chunk-tyg7f3ek.js:394375-394399 fingerprint = STDOUT_GUARD_MARKER (1)
var STDOUT_GUARD_MARKER = "[stdout-guard]";
/**
 * 空行或可 JSON 解析的行。
 */
//@ chunk-tyg7f3ek.js:394399-394475 file-local
function isJsonLine(line) {
  if (line.length === 0) return !0;
  try {
    return (jsonParse(line), !0);
  } catch {
    return !1;
  }
}
/**
 * StdoutGuard：按行缓冲 stdout 写入，JSON 行原样输出，其余转 stderr；可卸载并冲刷缓冲。
 */
//@ chunk-tyg7f3ek.js:394475-395444 fingerprint = installStreamJsonStdoutGuard (0.619)
class installStreamJsonStdoutGuard {
  buffer = "";
  originalWrite = null;
  install() {
    if (this.originalWrite !== null) return;
    let textDecoder = new TextDecoder("utf-8"),
      n = process.stdout.write.bind(process.stdout);
    this.originalWrite = n;
    let r = this;
    ((process.stdout.write = function (s, h, y) {
      let S = typeof s === "string" ? s : textDecoder.decode(s, { stream: !0 });
      r.buffer += S;
      let R,
        w = "";
      while (
        (R = r.buffer.indexOf(`
`)) !== -1
      ) {
        let sliced = r.buffer.slice(0, R);
        if (((r.buffer = r.buffer.slice(R + 1)), isJsonLine(sliced)))
          w +=
            sliced +
            `
`;
        else
          (process.stderr.write(`${STDOUT_GUARD_MARKER} ${sliced}
`),
            logForDebugging(`streamJsonStdoutGuard diverted non-JSON stdout line: ${sliced.slice(0, 200)}`));
      }
      let P = typeof h === "function" ? h : y;
      if (w.length > 0) return P ? n(w, P) : n(w);
      if (P) queueMicrotask(() => P());
      return !0;
    }),
      registerCleanup(async () => {
        if (((this.buffer += textDecoder.decode()), this.buffer.length > 0)) {
          if (this.originalWrite && isJsonLine(this.buffer))
            this.originalWrite(
              this.buffer +
                `
`,
            );
          else
            process.stderr.write(`${STDOUT_GUARD_MARKER} ${this.buffer}
`);
          this.buffer = "";
        }
        this.restore();
      }));
  }
  restore() {
    if (this.originalWrite) ((process.stdout.write = this.originalWrite), (this.originalWrite = null));
    this.buffer = "";
  }
}

export { installStreamJsonStdoutGuard };
