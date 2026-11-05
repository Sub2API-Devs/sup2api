/**
 * utils/codeMode/scriptErrors.ts
 *
 * Code 模式脚本报错的可读化：生成 TypeError 摘要、两连反引号/await 括号/eval 被禁等修复提示、中断与已执行工具调用说明，并给出 toolResult 上的展示标记（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-68hdkynn.js (12)
 * attribution: placement 12
 */
import { codeModeAccepted } from "./accepted.js";
import { truncateToLength, getFirstLine } from "../stringUtils.js";
import { stripControlChars } from "../settings/writeQueues.js";

//@ chunk-68hdkynn.js:301-350 placement
/**
 * “内层工具错误”分段的标题。
 */
var INNER_TOOL_ERRORS_HEADER = "Inner tool errors (likely root cause):";
//@ chunk-68hdkynn.js:350-1253 placement
/**
 * 按报错文本生成 Code 模式修复提示：两连反引号、await 缺括号、eval 被禁。
 */
function hintForError(errorText, code) {
  if (codeModeAccepted()) {
    if (/^TypeError: ".*" is not a function/s.test(errorText) && code.includes("``"))
      return "Hint: two backticks in a row end one template literal and tag the next, so a string gets called. Text that contains backticks or `${` is safer in a '\u2026' or \"\u2026\" string, or read from a file.";
    let match = /\.(text|json|lines)\(\)\.(\w+) is not a function/.exec(errorText);
    if (match !== null) {
      let [, method, target] = match;
      return `Hint: \`.${method}()\` returns a promise: \`(await file(p).${method}()).${target}(\u2026)\` \u2014 the await needs its own parentheses before the next method.`;
    }
    if (/^.*EvalError: Code generation from strings disallowed/.test(errorText))
      return "Hint: `eval` and the `Function` constructors are off in this context by design, so a script cannot run a string as code here. To reload helpers saved in a file, read it, then send its text as the code of its own call: its top-level declarations stay defined for later calls.";
  }
  return "";
}
//@ chunk-68hdkynn.js:1253-1742 placement
/**
 * 生成“某 turn 被多次停掉”的说明，解释 turn 的边界与拆小建议。
 */
function turnLimitNotice(turnLimit, count, durationText) {
  if (codeModeAccepted())
    return `[The ${turnLimit} stopped this script's code ${count} ${count === 1 ? "time" : "times"}: a turn took more than ${durationText}. A turn is the code that runs from the script's start, a tool call's result or a timer's firing until the next tool call's result or timer. If nothing awaited the stopped code (a timer's callback, an async function called without await), it ended partway with no error. Give one turn less to do, or split it with an await of a tool call or a timer.]`;
  return "";
}
//@ chunk-68hdkynn.js:1742-2193 placement
/**
 * 生成脚本中途停止/抛错的说明，并列出已完成的工具调用次数。
 */
function describeStopSummary(events, wasStopped = false) {
  if (codeModeAccepted()) {
    let completedByTool = new Map();
    for (let event of events)
      if (event.phase === "complete")
        completedByTool.set(event.toolName, (completedByTool.get(event.toolName) ?? 0) + 1);
    let cause = wasStopped
      ? "The script was stopped partway through: statements before the stop ran."
      : "The script threw partway through: statements before the failing one ran.";
    if (completedByTool.size === 0) return `${cause} No tool call had completed.`;
    let joined = [...completedByTool].map(([toolName, count]) => `${toolName} \xD7${count}`).join(", ");
    return `${cause} Tool calls that had completed: ${joined}.`;
  }
  return "";
}
//@ chunk-68hdkynn.js:2193-2492 placement
/**
 * “启动前已取消”文案与若干错误文本形态正则。
 */
var NEVER_RAN_LINE = "Cancelled before it started";
var MAX_ERROR_CHARS = 500;
var TYPE_ERROR_LOCATION_RE = /\.? \((?:evaluating|In|near) '/;
var PROPERTY_PATH_RE = /^[\w$]+(?:\??\.[\w$]+)*$/;
var IS_NOT_KIND_RE = /^is not (?:a function|a constructor|an object)$/i;
var TRAILING_IS_NOT_KIND_RE = / (is not (?:a function|a constructor|an object))\.?(?=\n|$)/i;
var DESCRIBE_NO_TOOL_PREFIX = "describeTool: no tool named";
var DESCRIBE_NO_TOOL_SENTENCE = "describeTool: no tool has that name.";
//@ chunk-68hdkynn.js:2492-2528 placement
/**
 * Code 模式下把工具结果里的错误整理成可读行。
 */
function scriptErrorLine(toolResult) {
  return codeModeAccepted() ? normalizeTypeErrorLine(toolResult) : "";
}
//@ chunk-68hdkynn.js:2528-2929 placement
/**
 * 归一化 TypeError 文本：抽出“X is not a function”形态并裁短，describeTool 缺名时改写。
 */
function normalizeTypeErrorLine(errorText) {
  let stackHeadEnd = errorText.indexOf(`

${INNER_TOOL_ERRORS_HEADER}
- `);
  let head = stackHeadEnd === -1 ? errorText : errorText.slice(0, stackHeadEnd);
  let isTypeError = head.startsWith("TypeError: ");
  let locationIndex = isTypeError ? head.search(TYPE_ERROR_LOCATION_RE) : -1;
  let line = errorText;
  if (locationIndex !== -1) {
    let withoutPrefix = head.slice(11, locationIndex);
    let isNotIndex = withoutPrefix.lastIndexOf(" is not ");
    let kindText = withoutPrefix.slice(isNotIndex + 1);
    line =
      isNotIndex === -1 || !IS_NOT_KIND_RE.test(kindText)
        ? "TypeError"
        : rebuildTypeError(withoutPrefix.slice(0, isNotIndex), kindText);
  } else if (isTypeError) {
    let match = TRAILING_IS_NOT_KIND_RE.exec(head);
    let kindText = match?.[1];
    if (match !== null && kindText !== undefined)
      line = rebuildTypeError(head.slice(11, match.index), kindText);
  }
  let firstLine = firstLineShort(line);
  let describeIndex = firstLine.indexOf(DESCRIBE_NO_TOOL_PREFIX);
  return (
    (describeIndex === -1 ? firstLine : firstLine.slice(0, describeIndex) + DESCRIBE_NO_TOOL_SENTENCE) ||
    "Error"
  );
}
//@ chunk-68hdkynn.js:2929-3004 placement
function firstLineShort(text) {
  let cut = text.length > MAX_ERROR_CHARS ? `${truncateToLength(text, MAX_ERROR_CHARS)}\u2026` : text;
  return getFirstLine(stripControlChars(cut)).trim();
}
//@ chunk-68hdkynn.js:3004-3086 placement
function rebuildTypeError(subject, kindText) {
  return PROPERTY_PATH_RE.test(subject)
    ? `TypeError: ${subject} ${kindText}`
    : `TypeError: a value ${kindText}`;
}
//@ chunk-68hdkynn.js:3086-3124 placement
/**
 * Code 模式下为结果生成展示用的错误行，否则返回 null。
 */
function scriptResultErrorLine(toolResult) {
  return codeModeAccepted() ? errorLineFor(toolResult) : null;
}
//@ chunk-68hdkynn.js:3124-3697 placement
/**
 * 由结果的 neverRan/error/plainErrorLine 决定展示行，中断时返回 Interrupted。
 */
function errorLineFor(toolResult) {
  let { drawsInterruptedRow } = require("../../tools/REPLTool/stopReport.js");
  let { REPL_TOOL_NAME } = require("../../tools/REPLTool/constants.js");
  if (drawsInterruptedRow(REPL_TOOL_NAME, toolResult)) return "Interrupted";
  if (
    typeof toolResult === "object" &&
    toolResult !== null &&
    "neverRan" in toolResult &&
    toolResult.neverRan === "other"
  )
    return NEVER_RAN_LINE;
  let error =
    toolResult === undefined
      ? "Error"
      : typeof toolResult === "object" && toolResult !== null && "error" in toolResult
        ? toolResult.error
        : undefined;
  if (typeof error !== "string" || error === "") return null;
  let line = normalizeTypeErrorLine(error);
  let plainErrorLine =
    typeof toolResult === "object" && toolResult !== null && "plainErrorLine" in toolResult
      ? toolResult.plainErrorLine
      : undefined;
  return typeof plainErrorLine === "object" &&
    plainErrorLine !== null &&
    "text" in plainErrorLine &&
    typeof plainErrorLine.text === "string" &&
    "replaces" in plainErrorLine &&
    plainErrorLine.replaces === line
    ? firstLineShort(plainErrorLine.text) || line
    : line;
}
//@ chunk-68hdkynn.js:3697-3795 placement
/**
 * 判定工具结果是否要求“调用时展示”。
 */
function isErrorRowCopy(toolResult) {
  return (
    codeModeAccepted() &&
    typeof toolResult === "object" &&
    toolResult !== null &&
    "shownOnCall" in toolResult &&
    toolResult.shownOnCall === true
  );
}
export {
  NEVER_RAN_LINE,
  scriptResultErrorLine,
  turnLimitNotice,
  hintForError,
  describeStopSummary,
  INNER_TOOL_ERRORS_HEADER,
  scriptErrorLine,
  isErrorRowCopy,
};
