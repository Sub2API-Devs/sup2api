/**
 * tools/REPLTool/consoleRing.ts
 *
 * VM 内的 console 环：stdout/stderr 分流、截断与 tail 读取（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { truncateToLength, takeLastChars } from "../../utils/stringUtils.js";

//@ chunk-n51jggtb.js:114237-114437 placement
/**
 * 把父消息裁成只剩本次 tool_use 块。
 */
function sliceAssistantToToolUse(message, toolUseId) {
  let content = message.message.content;
  if (!Array.isArray(content)) return message;
  let filtered = message.message.content.filter(
    (block) => block.type === "tool_use" && block.id === toolUseId,
  );
  return filtered.length === 0
    ? message
    : {
        ...message,
        message: {
          ...message.message,
          content: filtered,
        },
      };
}
//@ chunk-n51jggtb.js:114437-114483 placement
/**
 * 控制台环的限额常量（2000 行、1 MiB、1 MiB 单行截断）。
 */
var MAX_CONSOLE_LINES = 2000;
var MAX_CONSOLE_BYTES = 1048576;
var STACK_LINES_MAX = 20;
var SOURCE_CONTEXT_CHARS = 80;
var MAX_SINGLE_CONSOLE_LINE = 1048576;
//@ chunk-n51jggtb.js:114483-114665 placement
/**
 * 把超长文本按头尾保留方式截断并标注省略字数。
 */
function elideConsoleLine(line, kindLabel) {
  if (line.length <= MAX_SINGLE_CONSOLE_LINE) return line;
  let half = MAX_SINGLE_CONSOLE_LINE / 2 - 256;
  let head = truncateToLength(line, half);
  let tail = takeLastChars(line, half);
  let omittedChars = line.length - head.length - tail.length;
  return `${head}
\u2026 [${omittedChars} characters of this ${kindLabel} were not kept] \u2026
${tail}`;
}
//@ chunk-n51jggtb.js:114665-114875 placement
/**
 * 把一条 console 输出压进环形缓冲，超出容量时从头丢弃。
 */
function pushConsoleLine(ring, line) {
  ring.total++;
  ring.lines.push(elideConsoleLine(line, "console line"));
  ring.sizes.push(line.length);
  ring.bytes += line.length;
  while (ring.lines.length > MAX_CONSOLE_LINES || (ring.bytes > MAX_CONSOLE_BYTES && ring.lines.length > 1)) {
    ring.lines.shift();
    ring.bytes -= ring.sizes.shift();
    ring.dropped++;
  }
}
//@ chunk-n51jggtb.js:114875-114992 placement
/**
 * 取环里最后 n 行，前部省略时标注行数。
 */
function tailConsoleLines(ring, count) {
  let sliced = ring.lines.slice(-count);
  let omitted = ring.lines.length - sliced.length;
  return (
    (omitted > 0
      ? `\u2026[+${omitted} lines]
`
      : "") +
    sliced.join(`
`)
  );
}
//@ chunk-n51jggtb.js:114992-115022 placement
/**
 * 控制台总字节上限与 VM 上下文 id 基数。
 */
var VM_HEAP_LIMIT_BYTES = 1073741824;
var MAX_CONSOLE_OUTPUT_BYTES = 52428800;
//@ chunk-n51jggtb.js:115022-115601 placement
/**
 * 构造 VM 内的 console 对象（stdout/stderr 分流、迟到输出旁路、50 MB 截断）。
 */
function createConsoleCapture(createConsoleCapture) {
  let stdoutLines = [];
  let stderrLines = [];
  let byteCount = 0;
  function push(target, text) {
    if (consoleApi.late !== undefined) {
      consoleApi.late(target === stderrLines ? `[stderr] ${text}` : text);
      return;
    }
    if (byteCount >= MAX_CONSOLE_OUTPUT_BYTES) return;
    byteCount += text.length;
    target.push(text);
    if (byteCount >= MAX_CONSOLE_OUTPUT_BYTES) target.push("[console output truncated at 50MB]");
  }
  function formatArgs(args) {
    return args
      .map((arg) => {
        if (typeof arg === "string") return arg;
        try {
          return createConsoleCapture.stringify(arg, null, 2);
        } catch {
          return createConsoleCapture.toStr(arg);
        }
      })
      .join(" ");
  }
  let consoleApi = {
    format: formatArgs,
    late: undefined,
    log: (...args) => push(stdoutLines, formatArgs(args)),
    info: (...args) => push(stdoutLines, formatArgs(args)),
    debug: (...args) => push(stdoutLines, formatArgs(args)),
    error: (...args) => push(stderrLines, formatArgs(args)),
    warn: (...args) => push(stderrLines, formatArgs(args)),
    getStdout: () =>
      stdoutLines.join(`
`),
    getStderr: () =>
      stderrLines.join(`
`),
    clear: () => {
      stdoutLines.length = 0;
      stderrLines.length = 0;
      byteCount = 0;
    },
  };
  return consoleApi;
}
export {
  elideConsoleLine,
  createConsoleCapture,
  sliceAssistantToToolUse,
  pushConsoleLine,
  tailConsoleLines,
  STACK_LINES_MAX,
  SOURCE_CONTEXT_CHARS,
  VM_HEAP_LIMIT_BYTES,
};
