/**
 * tools/REPLTool/outputBudget.ts
 *
 * 异步 settle 输出的字节预算、按标记比例裁剪与 UTF-8 边界截断，以及日志行缓冲（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (5)
 * attribution: placement 5
 */
import {
  pollEventMaxEnvelopeBytes,
  EVAL_SETTLE_EVENT_KIND,
  escapedEventText,
  escapeXmlText,
} from "../../utils/pollEvents.js";

//@ chunk-n51jggtb.js:21243-21430 placement
/**
 * 异步 settle 单次输出预算：按结果上限算出字节额度并预留截断说明的长度，超出时追加“输出被截断”提示。
 */
var SETTLE_TEXT_BYTE_BUDGET = pollEventMaxEnvelopeBytes(EVAL_SETTLE_EVENT_KIND) - 2048;
var TRUNCATION_RESERVE_BYTES = 256;
var TRUNCATION_NOTICE = `
[\u2026 output truncated \u2014 this settle exceeded the async REPL byte budget; print less, or write large output to a file and read it in a later eval]`;
//@ chunk-n51jggtb.js:21430-21806 placement
/**
 * 按标记分配预算，把 settle 的日志行与其他部分按比例裁剪到总预算内。
 */
function fitSettleParts(parts, budget, escapedEventJsonBody = escapedEventText) {
  let sizeOf = (text) => Buffer.byteLength(escapedEventJsonBody(text), "utf8") + ESCAPE_BYTES_ALLOWANCE;
  if (parts.reduce((acc, part) => acc + sizeOf(part.text), 0) <= budget) return [...parts];
  let filtered = parts.filter((part) => part.tag === "log");
  let logBytes = filtered.reduce((acc, part) => acc + sizeOf(part.text), 0);
  let logBudget = Math.min(logBytes, Math.floor(budget / 4));
  let logShare = Math.floor(logBudget / Math.max(1, filtered.length));
  let otherCount = parts.length - filtered.length;
  let otherShare = Math.floor((budget - logBudget) / Math.max(1, otherCount));
  return parts.map((part) => ({
    tag: part.tag,
    text: truncateToBytes(part.text, part.tag === "log" ? logShare : otherShare, escapedEventJsonBody),
  }));
}
//@ chunk-n51jggtb.js:21806-22171 placement
/**
 * 按 UTF-8 边界二分截断单个文本片段到给定字节数，并拼接截断说明。
 */
function truncateToBytes(text, budget, escapedEventJsonBody = escapeXmlText) {
  if (Buffer.byteLength(escapedEventJsonBody(text), "utf8") <= budget) return text;
  let buffer = Buffer.from(text, "utf8");
  let max = Math.max(0, budget - TRUNCATION_RESERVE_BYTES);
  let backToCharBoundary = (position) => {
    while (position > 0 && (buffer[position] & 192) === 128) position--;
    return position;
  };
  let fits = (position) =>
    Buffer.byteLength(escapedEventJsonBody(buffer.toString("utf8", 0, position)), "utf8") <= max;
  let keptBytes = 0;
  let byteLength = buffer.byteLength;
  while (byteLength - keptBytes > 1) {
    let candidate = backToCharBoundary(keptBytes + Math.floor((byteLength - keptBytes) / 2));
    if (candidate <= keptBytes) break;
    if (fits(candidate)) keptBytes = candidate;
    else byteLength = candidate;
  }
  return `${buffer.toString("utf8", 0, keptBytes)}${TRUNCATION_NOTICE}`;
}
//@ chunk-n51jggtb.js:25895-25936 placement
/**
 * 日志批量刷出与 settle 预算的数值常量（250 ms 间隔、2000 ms 窗口、200 行、32768 字节）。
 */
var LOG_FLUSH_INTERVAL_CAP_MS = 250;
var LOG_FLUSH_WINDOW_MS = 2000;
var LOG_FLUSH_MAX_LINES = 200;
var LOG_FLUSH_MAX_BYTES = 32768;
var ESCAPE_BYTES_ALLOWANCE = 20;
//@ chunk-n51jggtb.js:25936-26410 placement
/**
 * 日志行缓冲：按行数与字节数聚合后一次性提交，带最短间隔与最大等待窗口。
 */
function createLogBatcher(onFlush) {
  let pendingLines = [];
  let pendingBytes = 0;
  let firstPendingAt = 0;
  let timer;
  let discarded = false;
  let flush = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    let lines = pendingLines;
    pendingLines = [];
    pendingBytes = 0;
    if (lines.length === 0) return;
    let joined = lines.join(`
`);
    onFlush(
      [
        {
          tag: "log",
          text: joined,
        },
      ],
      joined,
    );
  };
  return {
    push: (line) => {
      if (discarded) return;
      if (pendingLines.length === 0) firstPendingAt = Date.now();
      pendingLines.push(line);
      pendingBytes += line.length + 1;
      if (pendingLines.length >= LOG_FLUSH_MAX_LINES || pendingBytes >= LOG_FLUSH_MAX_BYTES) {
        flush();
        return;
      }
      if (timer !== undefined) clearTimeout(timer);
      let waitMs = Math.min(
        LOG_FLUSH_INTERVAL_CAP_MS,
        Math.max(0, LOG_FLUSH_WINDOW_MS - (Date.now() - firstPendingAt)),
      );
      timer = setTimeout(flush, waitMs);
      timer.unref?.();
    },
    flush,
    discard: () => {
      discarded = true;
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      pendingLines = [];
      pendingBytes = 0;
    },
  };
}
export { SETTLE_TEXT_BYTE_BUDGET, fitSettleParts, truncateToBytes, createLogBatcher };
