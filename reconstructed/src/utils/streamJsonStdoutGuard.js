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

//@ chunk-tyg7f3ek.js:394375-394399 fingerprint = STDOUT_GUARD_MARKER (1)
/**
 * 被拦截行在 stderr 上的前缀 "[stdout-guard]"。
 */
var STDOUT_GUARD_MARKER = "[stdout-guard]";
//@ chunk-tyg7f3ek.js:394399-394475 file-local
/**
 * 空行或可 JSON 解析的行。
 */
function isJsonLine(line) {
  if (line.length === 0) return true;
  try {
    jsonParse(line);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-tyg7f3ek.js:394475-395444 fingerprint = installStreamJsonStdoutGuard (0.619)
/**
 * StdoutGuard：按行缓冲 stdout 写入，JSON 行原样输出，其余转 stderr；可卸载并冲刷缓冲。
 */
class installStreamJsonStdoutGuard {
  buffer = "";
  originalWrite = null;
  install() {
    if (this.originalWrite !== null) return;
    let textDecoder = new TextDecoder("utf-8");
    let originalWrite = process.stdout.write.bind(process.stdout);
    this.originalWrite = originalWrite;
    let guard = this;
    process.stdout.write = function (chunk, encodingOrCb, cb) {
      let text =
        typeof chunk === "string"
          ? chunk
          : textDecoder.decode(chunk, {
              stream: true,
            });
      guard.buffer += text;
      let newlineIdx;
      let jsonText = "";
      while (
        (newlineIdx = guard.buffer.indexOf(`
`)) !== -1
      ) {
        let line = guard.buffer.slice(0, newlineIdx);
        guard.buffer = guard.buffer.slice(newlineIdx + 1);
        if (isJsonLine(line))
          jsonText +=
            line +
            `
`;
        else {
          process.stderr.write(`${STDOUT_GUARD_MARKER} ${line}
`);
          logForDebugging(`streamJsonStdoutGuard diverted non-JSON stdout line: ${line.slice(0, 200)}`);
        }
      }
      let callback = typeof encodingOrCb === "function" ? encodingOrCb : cb;
      if (jsonText.length > 0) return callback ? originalWrite(jsonText, callback) : originalWrite(jsonText);
      if (callback) queueMicrotask(() => callback());
      return true;
    };
    registerCleanup(async () => {
      this.buffer += textDecoder.decode();
      if (this.buffer.length > 0) {
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
    });
  }
  restore() {
    if (this.originalWrite) {
      process.stdout.write = this.originalWrite;
      this.originalWrite = null;
    }
    this.buffer = "";
  }
}
export { installStreamJsonStdoutGuard };
