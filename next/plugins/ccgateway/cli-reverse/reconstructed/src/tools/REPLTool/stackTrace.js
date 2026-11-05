/**
 * tools/REPLTool/stackTrace.ts
 *
 * 把错误栈映射回脚本源码行，给出“抛出于此”的语句引用（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (4)
 * attribution: placement 4
 */
import { createHash } from "crypto";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { REPL_SCRIPT_FILENAME } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { truncateToLength } from "../../utils/stringUtils.js";

//@ chunk-n51jggtb.js:59303-59349 placement
/**
 * 栈帧引用的限额常量。
 */
var ERROR_TEXT_SCAN_LIMIT = 1e5;
var STACK_LINES_SCAN_LIMIT = 20000;
var MAX_THROWN_AT_LINES = 4;
var STATEMENT_QUOTE_MAX_CHARS = 200;
var CALLEE_QUOTE_MAX_CHARS = 80;
var STACK_SCAN_MAX_CHARS = 4000;
//@ chunk-n51jggtb.js:59349-59428 placement (2.1.88 match: generateCodeChallenge, 0.845)
/**
 * 按脚本源码指纹算出虚拟行号偏移。
 */
function generateCodeChallenge(verifier) {
  return (
    ((createHash("sha256").update(verifier).digest().readUInt32BE(0) % STACK_LINES_SCAN_LIMIT) + 1) *
    ERROR_TEXT_SCAN_LIMIT
  );
}
//@ chunk-n51jggtb.js:59428-60146 placement
/**
 * 从错误栈里找出指向脚本源码的行，摘出对应语句作为“抛出于此”的说明。
 */
function describeThrownAt(message, verifier) {
  if (codeModeAccepted()) {
    let index = message.indexOf(`
    at `);
    if (index === -1) return "";
    let lines = verifier.split(`
`);
    let lineOffset = generateCodeChallenge(verifier) + 1;
    let quoted = [];
    for (let stackLine of message.slice(index + 1, index + 1 + STACK_SCAN_MAX_CHARS).split(`
`)) {
      if (quoted.length === MAX_THROWN_AT_LINES) break;
      let match = /^\s*at (?:async )?(?:(\S[^()]*?) \()?([^\s():]+):(\d+):\d+\)?$/.exec(stackLine);
      if (match === null || match[2] !== REPL_SCRIPT_FILENAME) continue;
      let scriptLine = Number(match[3]) - lineOffset;
      if (!(scriptLine >= 0 && scriptLine < lines.length)) continue;
      let statement = (lines[scriptLine] ?? "").replaceAll(/__replStep\(\)[;,]/g, "").trim();
      if (statement === "" || statement === "})();") continue;
      let quotedStatement =
        lines[scriptLine - 1]?.trim() === "__proto__: null," ? statement.replace(/^value: /, "") : statement;
      let entry = `  in ${ellipsize(match[1] ?? "<anonymous>", CALLEE_QUOTE_MAX_CHARS)}: ${ellipsize(quotedStatement, STATEMENT_QUOTE_MAX_CHARS)}`;
      if (entry !== quoted.at(-1)) quoted.push(entry);
    }
    if (quoted.length === 0) return "";
    return ["Thrown at (statements quoted from the script as it ran, which is reformatted):", ...quoted]
      .join(`
`);
  }
  return "";
}
//@ chunk-n51jggtb.js:60146-60201 placement
/**
 * 把字符串截断到给定长度并加省略号。
 */
function ellipsize(text, maxChars) {
  return text.length > maxChars ? `${truncateToLength(text, maxChars)}\u2026` : text;
}
export { generateCodeChallenge, describeThrownAt };
