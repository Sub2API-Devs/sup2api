/**
 * tools/REPLTool/stopReport.ts
 *
 * REPL 脚本被打断/拒绝时的停止报告：逐个工具调用写结局、按预算裁剪（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gv3r3pqa.js (22)
 * attribution: placement 22
 */
import { isEvalToolName } from "./constants.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { STOP_INSTRUCTION } from "../../services/tools/streamingStopNotice.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-gv3r3pqa.js:335-436 placement
/**
 * 判断一个 REPL 脚本结果是否带 stoppedBy（即脚本被停止而不是正常结束）。
 */
function isStoppedReplResult(toolName, toolResult) {
  return (
    isEvalToolName(toolName) &&
    typeof toolResult === "object" &&
    toolResult !== null &&
    "stoppedBy" in toolResult &&
    toolResult.stoppedBy !== undefined
  );
}
//@ chunk-gv3r3pqa.js:436-547 placement
/**
 * 判断结果是否为停止结果，或标记了 neverRan=person（人没让它跑）。
 */
function drawsInterruptedRow(toolName, toolResult) {
  return (
    isStoppedReplResult(toolName, toolResult) ||
    (isEvalToolName(toolName) &&
      typeof toolResult === "object" &&
      toolResult !== null &&
      "neverRan" in toolResult &&
      toolResult.neverRan === "person")
  );
}
//@ chunk-gv3r3pqa.js:547-681 placement
var STOP_REPORT_LIMITS = {
  nameChars: 80,
  inputChars: 200,
  valueChars: 2000,
  valuesChars: 8000,
  valueMinChars: 200,
  entries: 30,
  namesPerCount: 5,
  reportChars: 24000,
};
//@ chunk-gv3r3pqa.js:681-833 placement
var REFUSAL_SENTENCE = "The user doesn't want to proceed with this tool use.";
var REPORT_INDENT = "  ";
var LINE_BREAK = /\r\n?|[\v\f\u0085\u2028\u2029]/g;
var ESCAPE_LINE_BREAK = /\r\n?|[\n\v\f\u0085\u2028\u2029]/g;
var MIN_KEPT_CHARS = 100;
//@ chunk-gv3r3pqa.js:833-881 placement
/**
 * 停止报告的入口：在 REPL 模式下生成完整报告，否则退回简短提示。
 */
function stopReport(stopKind, calls, hint = "") {
  return codeModeAccepted() ? stopReportText(stopKind, calls, hint) : STOP_INSTRUCTION;
}
//@ chunk-gv3r3pqa.js:881-2779 placement
/**
 * 生成脚本停止报告的主体：被拒/被打断的开场句、逐步列出每个工具调用的结局（含结果或错误文本，超预算则写字符数），最后补一句未列出数量与总预算裁剪。
 */
function stopReportText(stopKind, calls, hint) {
  let declinedCall = calls.find((call) => call.state === "declined");
  let headline =
    stopKind === "refusal" && declinedCall !== undefined
      ? `${REFUSAL_SENTENCE} ${STOP_INSTRUCTION} The user declined the permission prompt for ${describeCall(declinedCall)}, so the script stopped.`
      : `The user interrupted this script, so it stopped. ${STOP_INSTRUCTION}`;
  if (calls.length === 0)
    return fitHintIntoReport(
      `${headline}
The script had not started any tool calls.`,
      hint,
    );
  let lines = [headline, "Tool calls the script started, in order:"];
  let remainingChars = STOP_REPORT_LIMITS.valuesChars;
  calls.slice(0, STOP_REPORT_LIMITS.entries).forEach((call, callIndex) => {
    let label = `${callIndex + 1}. ${describeCall(call)}`;
    switch (call.state) {
      case "running":
        lines.push(
          `${label} was still running when the script stopped. The script got no result, and the call may have run in part or in full.`,
        );
        return;
      case "waiting":
        lines.push(
          `${label} was waiting to run when the script stopped. The script got no result, and the call may still have run afterwards.`,
        );
        return;
      case "declined":
        lines.push(
          call.ranBefore === true
            ? `${label} ran once in the sandbox, which reported a violation. The user declined to run it again outside the sandbox.`
            : call.rerunByHook === true
              ? `${label} ran, and a plugin's hook then started it again. The user declined that run.`
              : `${label} did not run. The user declined it.`,
        );
        return;
      case "finished":
      case "failed": {
        let text = (call.text ?? "").replace(
          LINE_BREAK,
          `
`,
        );
        if (text === "") {
          lines.push(
            call.state === "failed"
              ? `${label} failed with no error message.`
              : `${label} finished. Its result is empty.`,
          );
          return;
        }
        let valueLabel = call.state === "finished" ? "result" : "error";
        let stateLabel = call.state === "finished" ? "finished" : "failed";
        if (remainingChars < STOP_REPORT_LIMITS.valueMinChars && indent(text).length > remainingChars) {
          lines.push(
            `${label} ${stateLabel}. Its ${valueLabel} (${formatCount(text.length)} characters) is not shown, to keep this report short.`,
          );
          return;
        }
        let shownText = cutValue(text, Math.min(STOP_REPORT_LIMITS.valueChars, remainingChars));
        remainingChars -= shownText.length;
        lines.push(
          call.state === "finished"
            ? `${label} finished. It returned:
${shownText}`
            : `${label} failed with this error:
${shownText}`,
        );
      }
    }
  });
  let unlisted = calls.slice(STOP_REPORT_LIMITS.entries);
  if (unlisted.length === 1) lines.push(`1 more tool call is not listed: ${countCallsByState(unlisted)}.`);
  else if (unlisted.length > 1)
    lines.push(`${unlisted.length} more tool calls are not listed: ${countCallsByState(unlisted)}.`);
  lines.push("That is every tool call the script started.");
  return fitHintIntoReport(
    lines.join(`
`),
    hint,
  );
}
//@ chunk-gv3r3pqa.js:2779-3034 placement
function fitHintIntoReport(lines, hint) {
  let reportChars = STOP_REPORT_LIMITS.reportChars;
  if (lines.length + hint.length <= reportChars) return lines + hint;
  let cutNotice = `
... [this report was cut at ${formatCount(reportChars)} characters, so its list is incomplete] ...`;
  let keptHint = sliceWholeCodePoints(hint, Math.floor(reportChars / 4));
  if (lines.length + keptHint.length <= reportChars) return lines + keptHint;
  return sliceWholeCodePoints(lines, reportChars - cutNotice.length - keptHint.length) + cutNotice + keptHint;
}
//@ chunk-gv3r3pqa.js:3034-3118 placement
function sliceWholeCodePoints(text, limit) {
  let sliced = text.slice(0, limit);
  return /[\uD800-\uDBFF]$/.test(sliced) ? sliced.slice(0, -1) : sliced;
}
//@ chunk-gv3r3pqa.js:3118-3205 placement
function sliceTailWholeCodePoints(text, limit) {
  let tail = limit > 0 ? text.slice(-limit) : "";
  return /^[\uDC00-\uDFFF]/.test(tail) ? tail.slice(1) : tail;
}
//@ chunk-gv3r3pqa.js:3205-3259 placement
function truncateWithEllipsis(text, limit) {
  return text.length > limit ? `${sliceWholeCodePoints(text, limit)}\u2026` : text;
}
//@ chunk-gv3r3pqa.js:3259-3370 placement
function describeCall(call) {
  let inputText = truncateWithEllipsis(
    escapeLineBreaks(jsonStringify(printableInput(call.toolInput)) ?? ""),
    STOP_REPORT_LIMITS.inputChars,
  );
  return `${truncateWithEllipsis(escapeLineBreaks(call.toolName), STOP_REPORT_LIMITS.nameChars)}(${inputText})`;
}
//@ chunk-gv3r3pqa.js:3370-3395 placement
var MAX_INPUT_KEYS = 20;
var NOT_SHOWN = "(not shown)";
//@ chunk-gv3r3pqa.js:3395-3655 placement
function printableInput(input) {
  if (typeof input !== "object" || input === null) return printableValue(input);
  if (Array.isArray(input)) return [NOT_SHOWN];
  let printed = {};
  let keyCount = 0;
  for (let key in input) {
    if (keyCount === MAX_INPUT_KEYS) break;
    let descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined) continue;
    keyCount++;
    printed[truncateWithEllipsis(key, STOP_REPORT_LIMITS.inputChars)] =
      "value" in descriptor ? printableValue(descriptor.value) : NOT_SHOWN;
  }
  return printed;
}
//@ chunk-gv3r3pqa.js:3655-3804 placement
function printableValue(value) {
  if (typeof value === "string") return truncateWithEllipsis(value, STOP_REPORT_LIMITS.inputChars);
  if (value === undefined || value === null || typeof value === "number" || typeof value === "boolean")
    return value;
  return NOT_SHOWN;
}
//@ chunk-gv3r3pqa.js:3804-3922 placement
function escapeLineBreaks(text) {
  return text.replace(ESCAPE_LINE_BREAK, (run) =>
    [...run].map((char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`).join(""),
  );
}
//@ chunk-gv3r3pqa.js:3922-3971 placement
function indent(text) {
  return (
    REPORT_INDENT +
    text.replaceAll(
      `
`,
      `
${REPORT_INDENT}`,
    )
  );
}
//@ chunk-gv3r3pqa.js:3971-4219 placement
/**
 * 把超长文本从中间挖掉，保留首尾并插入“中间 N 个字符未显示”的标记。
 */
function cutValue(text, limit) {
  let indented = indent(text);
  if (indented.length <= limit) return indented;
  let keepChars = Math.max(0, limit - MIN_KEPT_CHARS);
  let headChars = Math.floor(keepChars * 0.6);
  let head = takeHead(text, headChars);
  let tail = takeTail(text, keepChars - headChars);
  let omittedChars = text.length - head.length - tail.length;
  return `${indent(head)}
${REPORT_INDENT}... [the middle ${formatCount(omittedChars)} of its ${formatCount(text.length)} characters are not shown] ...
${indent(tail)}`;
}
//@ chunk-gv3r3pqa.js:4219-4261 placement
function lineWidth(char) {
  return char ===
    `
`
    ? 1 + REPORT_INDENT.length
    : 1;
}
//@ chunk-gv3r3pqa.js:4261-4356 placement
function takeHead(text, limit) {
  let width = REPORT_INDENT.length;
  let count = 0;
  while (count < text.length && width + lineWidth(text[count]) <= limit) {
    width += lineWidth(text[count]);
    count++;
  }
  return sliceWholeCodePoints(text, count);
}
//@ chunk-gv3r3pqa.js:4356-4464 placement
function takeTail(text, limit) {
  let width = REPORT_INDENT.length;
  let index = text.length;
  while (index > 0 && width + lineWidth(text[index - 1]) <= limit) {
    width += lineWidth(text[index - 1]);
    index--;
  }
  return sliceTailWholeCodePoints(text, text.length - index);
}
//@ chunk-gv3r3pqa.js:4464-5109 placement
/**
 * 按状态把脚本留下的工具调用汇总成一行人话：正在运行、等待、被拒绝、完成、失败、被 hook 重跑，按名字去重并截断。
 */
function countCallsByState(calls) {
  let stateWording = [
    ["finished", "finished", "finished"],
    ["failed", "failed", "failed"],
    ["running", "was still running", "were still running"],
    ["waiting", "was waiting to run", "were waiting to run"],
    ["declined", "was declined", "were declined"],
  ];
  let parts = [];
  for (let [state, oneWord, manyWord] of stateWording) {
    let countsByTool = new Map();
    for (let call of calls)
      if (call.state === state) {
        let shownName = truncateWithEllipsis(escapeLineBreaks(call.toolName), STOP_REPORT_LIMITS.nameChars);
        countsByTool.set(shownName, (countsByTool.get(shownName) ?? 0) + 1);
      }
    let total = [...countsByTool.values()].reduce((accumulator, count) => accumulator + count, 0);
    if (total > 0) {
      let shownEntries = [...countsByTool].slice(0, STOP_REPORT_LIMITS.namesPerCount);
      let otherCount = countsByTool.size - shownEntries.length;
      let summary = [
        ...shownEntries.map(([name, count]) => `${name} \xD7${count}`),
        ...(otherCount === 1 ? ["1 other tool"] : []),
        ...(otherCount > 1 ? [`${otherCount} other tools`] : []),
      ].join(", ");
      parts.push(`${total} ${total === 1 ? oneWord : manyWord} (${summary})`);
    }
  }
  return parts.join(", ");
}
//@ chunk-gv3r3pqa.js:5109-5156 placement
function formatCount(value) {
  return value.toLocaleString("en-US");
}
export {
  isStoppedReplResult,
  STOP_REPORT_LIMITS,
  cutValue,
  LINE_BREAK,
  stopReport,
  REFUSAL_SENTENCE,
  drawsInterruptedRow,
};
