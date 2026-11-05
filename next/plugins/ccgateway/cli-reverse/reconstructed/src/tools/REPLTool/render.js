/**
 * tools/REPLTool/render.ts
 *
 * REPL 结果的文本/XML 渲染与按预算截断（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (11)
 * attribution: placement 11
 */
import { randomUUID } from "crypto";
import { STOP_REPORT_LIMITS, cutValue } from "./stopReport.js";
import { formatResultValue, formatFlatObject } from "./resultValue.js";
import { shrinkInlineBase64 } from "./resultContent.js";
import { TOOLS_USED_BEFORE_SUMMARY_TAG } from "../../bootstrap/stateSlices.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { isCodeModeExperimentEnabled } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { toolsUsedManifestText } from "../../utils/messages/untrustedArtifactContent.js";
import { getReplPartCap } from "../../utils/codeMode.js";
import { truncateToLength, takeLastChars } from "../../utils/stringUtils.js";

//@ chunk-n51jggtb.js:194878-195333 placement
/**
 * 把内层调用状态列表化成可展示的 stoppedBy 明细。
 */
function describeCallsForStopReport(calls, isRunning, ranBefore, rerunByHook) {
  return calls.map((call, index) => {
    let base = {
      toolName: call.toolName,
      toolInput: call.toolInput,
    };
    let withText = index < STOP_REPORT_LIMITS.entries;
    switch (call.phase) {
      case "complete":
        return {
          ...base,
          state: "finished",
          ...(withText && {
            text: formatResultValue(shrinkInlineBase64(call, call.result), 10),
          }),
        };
      case "error":
        return call.declined === true
          ? {
              ...base,
              state: "declined",
              ranBefore: ranBefore(call),
              ...(rerunByHook(call) && {
                rerunByHook: true,
              }),
            }
          : {
              ...base,
              state: "failed",
              ...(withText && {
                text: call.error ?? "",
              }),
            };
      case "start":
        return {
          ...base,
          state: isRunning(call) ? "running" : "waiting",
        };
      case "executing":
        return {
          ...base,
          state: "running",
        };
    }
  });
}
//@ chunk-n51jggtb.js:195333-196385 placement
/**
 * 生成脚本结束但仍有未 await 调用的说明。
 */
function unawaitedCallWarnings(partitioned, summaryMode) {
  let calls = partitioned.notStarted.filter((call) =>
    summaryMode ? call.phase === "start" : call.phase !== "complete",
  );
  let calls_2 = partitioned.running.filter((call) => call.phase === "error");
  let calls_3 = partitioned.running.filter((call) => call.phase !== "error");
  let describeByTool = (calls) => {
    let counts = new Map();
    for (let call of calls) counts.set(call.toolName, (counts.get(call.toolName) ?? 0) + 1);
    return [...counts]
      .map(([toolName, count]) => (count > 1 ? `${toolName} \xD7${count}` : toolName))
      .join(", ");
  };
  return [
    ...(calls.length > 0
      ? [
          `\u26A0 ${calls.length} tool call(s) had not started when the script ended, and did not run: ${describeByTool(calls)}. Add 'await'.`,
        ]
      : []),
    ...(calls_3.length > 0
      ? [
          `\u26A0 ${calls_3.length} tool call(s) were still running when the script ended. They ran to their end, but the script ended before their results came: ${describeByTool(calls_3)}. Do not make them again. Add 'await' next time.`,
        ]
      : []),
    ...(!summaryMode
      ? calls_2.map(
          (
            call,
          ) => `\u26A0 ${call.toolName} was still running when the script ended, and then failed. Add 'await' next time. Its error:
${cutValue(call.error ?? "", 2000)}`,
        )
      : calls_2.length > 0
        ? [
            `\u26A0 ${calls_2.length} tool call(s) were still running when the script ended, and then failed: ${describeByTool(calls_2)}. Their errors are listed with the script's error, which they did not cause. Add 'await' next time.`,
          ]
        : []),
  ];
}
//@ chunk-n51jggtb.js:196385-196455 placement
/**
 * 统计满足条件的调用数量。
 */
function countMatching(items, predicate) {
  let count = 0;
  for (let item of items.values()) if (predicate(item)) count++;
  return count;
}
//@ chunk-n51jggtb.js:207437-207829 placement
/**
 * 把结果整理成 log/stderr/error/result 的分段。
 */
function parts(output) {
  let parts = [];
  if (output.toolsUsed?.length)
    parts.push({
      tag: TOOLS_USED_BEFORE_SUMMARY_TAG,
      text: output.toolsUsed.join(", "),
    });
  for (let text of output.notifications ?? [])
    parts.push({
      tag: "log",
      text,
    });
  if (output.stdout)
    parts.push({
      tag: "log",
      text: elideWithMarker(output.stdout),
    });
  if (output.stderr)
    parts.push({
      tag: "log",
      text: `[stderr] ${elideWithMarker(output.stderr)}`,
    });
  if (output.error)
    parts.push({
      tag: "error",
      text: elideWithMarker(output.error),
    });
  else
    parts.push({
      tag: "result",
      text: output.result === undefined ? "" : resultText(output.result),
    });
  return parts;
}
//@ chunk-n51jggtb.js:207829-208189 placement
/**
 * 把结果渲染成 <repl-output> 元素（Code Mode 下）。
 */
function outputText(output) {
  if (codeModeAccepted() && isCodeModeExperimentEnabled() && output.asyncDispatched !== true) {
    let joined = parts(output).map(({ tag, text }) => {
      let replaced = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      return replaced === "" ? `<${tag}/>` : `<${tag}>${replaced}</${tag}>`;
    }).join(`
`);
    return `<repl-output${(output.evalId === undefined ? "" : ` eval="${output.evalId}"`) + (output.ms === undefined ? "" : ` ms="${output.ms}"`)}>
${joined}
</repl-output>`;
  }
  return plainOutputText(output);
}
//@ chunk-n51jggtb.js:208189-208614 placement
/**
 * 把结果渲染成 stdout:/stderr:/error:/result: 文本（非 Code Mode）。
 */
function plainOutputText(output) {
  let toolsUsedText = output.toolsUsed?.length
    ? `${toolsUsedManifestText(output.toolsUsed)}
`
    : "";
  if (
    !output.notifications?.length &&
    !output.stdout &&
    !output.stderr &&
    !output.error &&
    output.result !== undefined
  )
    return toolsUsedText + resultText(output.result);
  let sections = [];
  sections.push(...(output.notifications ?? []));
  if (output.stdout)
    sections.push(`stdout:
${elideWithMarker(output.stdout)}`);
  if (output.stderr)
    sections.push(`stderr:
${elideWithMarker(output.stderr)}`);
  if (output.error) sections.push(`error: ${elideWithMarker(output.error)}`);
  if (output.result !== undefined) sections.push(`result: ${resultText(output.result)}`);
  return (
    toolsUsedText +
    (sections.join(`

`) || "")
  );
}
//@ chunk-n51jggtb.js:208614-208789 placement
/**
 * 把值渲染成展示文本，Code Mode 下带脱敏。
 */
function formatResultValueForDisplay(formatValue) {
  let flat = formatFlatObject(formatValue, true);
  if (flat !== undefined) return flat;
  let cap = codeModeAccepted() ? getReplPartCap() : undefined;
  if (cap === undefined) return formatResultValue(formatValue, 10);
  let capInfo = {
    max: cap,
    token: randomUUID().replaceAll("-", ""),
  };
  return elideWithMarker(formatResultValue(formatValue, 10, capInfo), capInfo);
}
//@ chunk-n51jggtb.js:208789-208839 placement
/**
 * 字符串原样否则走渲染。
 */
function resultText(result) {
  return typeof result === "string" ? result : formatResultValueForDisplay(result);
}
//@ chunk-n51jggtb.js:208839-209119 placement
/**
 * 长值按预算截断并注明原值仍在 REPL 里。
 */
function truncatePart(key, text) {
  if (codeModeAccepted()) {
    let replPartCap = getReplPartCap();
    if (replPartCap !== undefined && text.length > replPartCap) {
      let markerLength = getMarkerLength(replPartCap);
      return `${truncateToLength(text, markerLength)}
... [${key}: ${replPartCap} of ${text.length} chars shown. The whole value is still in the REPL under this key \u2014 slice or search it there; do not re-read or re-run it] ...
${takeLastChars(text, replPartCap - markerLength)}`;
    }
  }
  return text;
}
//@ chunk-n51jggtb.js:209119-209472 placement
/**
 * 按 token 预算截断并统计已省略字数。
 */
function elideWithMarker(text, cap) {
  if (codeModeAccepted()) {
    let max = cap !== undefined ? cap.max : getReplPartCap();
    if (max !== undefined && text.length > max) {
      let head = truncateToLength(text, getMarkerLength(max));
      let tail = takeLastChars(text, max - getMarkerLength(max));
      let elided = text.length - head.length - tail.length;
      if (cap !== undefined) {
        let regExp = new RegExp(` \\.\\.\\. \\[(\\d+) chars elided ${cap.token}\\] \\.\\.\\. `, "g");
        for (let match of text.matchAll(regExp)) elided += Number(match[1]) - match[0].length;
      }
      return `${head}
... [${elided} chars elided] ...
${tail}`;
    }
  }
  return text;
}
//@ chunk-n51jggtb.js:209472-209512 placement
/**
 * 按 0.6 比例算头部保留长度。
 */
function getMarkerLength(cap) {
  return Math.floor(cap * 0.6);
}
export {
  outputText,
  parts,
  truncatePart,
  getMarkerLength,
  unawaitedCallWarnings,
  formatResultValueForDisplay,
  describeCallsForStopReport,
  countMatching,
};
