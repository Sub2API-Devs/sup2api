/**
 * services/remoteTools/remoteToolResult.ts
 *
 * 2.1.316 新增：远程工具结果的呈现：完成标注、截断说明、未验证结果、输出落盘位置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dtv8x2hx.js (23)
 * attribution: placement 23
 */
import { isRanOutcome, REMOTE_TOOL_SERVING_LIMITS } from "../../remote/tools/protocolConstants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { formatFileSize } from "../../utils/format.js";
import { outputFilterHint, isNonMcpShellTool } from "../../tools/shared/textSearchTools.js";
import {
  formatHostNotes,
  REMOTE_RESULT_TEXT_CAP,
  MAX_REMOTE_IMAGE_BYTES,
  MAX_REMOTE_CONTENT_BLOCKS,
  contentToText,
  sanitizeForPrompt,
} from "./resultConversion.js";
import { replayedOutcomeNote, deliveredAfterReconnectNote, ranOnHeader } from "./transportMessages.js";
import { HOST_TOOL_INPUT_FIELD } from "../../bridge/deviceRegistration.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";

//@ chunk-dtv8x2hx.js:62603-62895 placement
function buildRemoteToolResultBlock(tool, outcome, toolUseId) {
  let r = isRanOutcome(outcome.disposition);
  let s = r && outcome.envelope === "present";
  let u = outcome.isError || !r;
  let p = structuredOutputIfStructured(tool, outcome);
  let i =
    p === undefined
      ? {
          type: "tool_result",
          tool_use_id: toolUseId,
          content: s ? outcome.content : remoteResultText_2(outcome),
          ...(u && {
            is_error: true,
          }),
        }
      : {
          ...tool.mapToolResultToToolResultBlockParam(p, toolUseId),
          ...(u && {
            is_error: true,
          }),
        };
  return appendResultLines(
    prependResultLine(i, unverifiedAnswerWithOutput(tool, outcome)),
    formatTruncatedResult(tool, outcome),
  );
}
//@ chunk-dtv8x2hx.js:62895-62939 placement
/**
 * 未验证答复 + 原始 shell 输出的组合文本。
 */
function unverifiedAnswerWithOutput(tool, n) {
  return `${formatUnverifiedAnswer(n)}${shellOutputFollowing(tool, n)}`;
}
//@ chunk-dtv8x2hx.js:62939-62987 placement
function shellOutputFollowing(e, n) {
  return extractShellOutput(e, n, "which follows");
}
//@ chunk-dtv8x2hx.js:62987-63040 placement
/**
 * 取「如上所示」的 shell 输出（去首尾空白）。
 */
function shellOutputShownAbove(tool, remoteOrigin) {
  return extractShellOutput(tool, remoteOrigin, "shown above").trim();
}
//@ chunk-dtv8x2hx.js:63040-63229 placement
function formatCompletedOnHost(tool, remoteOrigin) {
  return (tool.name === FILE_EDIT_TOOL_NAME || tool.name === FILE_WRITE_TOOL_NAME) &&
    remoteOrigin.envelope === "present" &&
    isRanOutcome(remoteOrigin.disposition) &&
    !remoteOrigin.isError &&
    !remoteOrigin.truncated &&
    remoteOrigin.output === undefined
    ? `(completed on ${remoteOrigin.host.name}; diff not shown)`
    : "";
}
//@ chunk-dtv8x2hx.js:63229-63664 placement
function extractShellOutput(e, n, o) {
  if (n.spilled === undefined || !isRanOutcome(n.disposition)) return "";
  let r = remoteStructuredOutput(e, n);
  let s = typeof r === "object" && r !== null ? Reflect.get(r, "stdout") : undefined;
  let u = typeof s === "string" ? s.replace(REMOTE_TOOL_SERVING_LIMITS, "") : "";
  let p = Buffer.byteLength(u);
  if (p === 0 || n.spilled.bytes <= p) return "";
  let i = n.host.name;
  return ` Output was ${formatFileSize(n.spilled.bytes)}; ${i} sent the first ${formatFileSize(p)}, ${o}; the rest exists only on ${i} \u2014 re-run there with ${outputFilterHint(e.name)} if that is safe.`;
}
//@ chunk-dtv8x2hx.js:63664-64272 placement
function formatTruncatedResult(tool, n) {
  let o = isRanOutcome(n.disposition) && n.envelope === "present";
  let r = !o && exceedsAnswerCharLimit(n);
  return [
    ...formatHostNotes(n.notes, n.host.name),
    ...(n.truncated
      ? [(o ? formatLineCutNote(tool, n) : undefined) ?? `(${n.host.name} truncated this result)`]
      : []),
    ...(n.cutHere && o
      ? [
          `(this session cut ${n.host.name}'s result to its own limits: ${REMOTE_RESULT_TEXT_CAP.toLocaleString("en-US")} characters of text, inline images up to ${MAX_REMOTE_IMAGE_BYTES / 1048576} MiB, ${MAX_REMOTE_CONTENT_BLOCKS} blocks)`,
        ]
      : []),
    ...(r || (n.cutHere === true && !o)
      ? [
          `(this session kept only the first ${MAX_KEPT_ANSWER_CHARS.toLocaleString("en-US")} characters of ${n.host.name}'s answer)`,
        ]
      : []),
    ...(isRanOutcome(n.disposition) ? formatSavedOutputNote(n, tool) : []),
    ...describeDuplicateCall(n),
    ...(n.sessionNotes ?? []).map((s) => `(${s.text})`),
  ];
}
//@ chunk-dtv8x2hx.js:64272-64519 placement
function describeDuplicateCall(e) {
  if (e.delivery === "fresh" || e.disposition === "duplicate_call") return [];
  let n = isRanOutcome(e.disposition)
    ? e.isError
      ? "failed"
      : "completed"
    : e.disposition === "unrecognized"
      ? "failed"
      : "refused";
  return e.delivery === "replayed" ? [replayedOutcomeNote(e.servedAt, n)] : [deliveredAfterReconnectNote(n)];
}
//@ chunk-dtv8x2hx.js:64519-65593 placement
/**
 * 标注"由某机器回答但无运行细节、未验证"。
 */
function formatUnverifiedAnswer(e) {
  let n = e.host.name;
  if (e.envelope !== "present")
    return `[answered by ${n} without run details \u2014 unverified; whether the command ran there is unknown, so check before re-running it]`;
  switch (e.disposition) {
    case undefined:
    case "ran":
    case "approved_by_session":
      return ranOnHeader(n, e.spelledDirectory, e.permittedBy, e.isError);
    case "hook_blocked":
      return `[blocked on ${n} before it ran (hook or deny rule) \u2014 not run]`;
    case "denied_by_rule":
    case "denied_by_user":
    case "ask_refused_no_surface":
      return `[refused on ${n} \u2014 not run]`;
    case "validation_failed":
      return `[rejected on ${n} \u2014 not run]`;
    case "duplicate_call":
      return `[not re-run on ${n}]`;
    case "denied_by_session":
      return `[refused on ${n} \u2014 not run]`;
    case "asked_in_session":
      return `[waiting on a permission decision for ${n} \u2014 not run]`;
    case "ask_expired":
      return `[permission ask for ${n} ended unanswered \u2014 not run]`;
    case "unrecognized":
      return `[answered by ${n} with an outcome this version of Claude Code does not recognise \u2014 whether the command ran there is unknown, so check before re-running it]`;
  }
}
//@ chunk-dtv8x2hx.js:65593-65870 placement
function remoteStructuredOutput(e, n) {
  if (!isRanOutcome(n.disposition)) return;
  if (n.output !== undefined) return n.output;
  if (n.isError || !isNonMcpShellTool(e) || !isTextOrTextBlocks(n.content)) return;
  let o = contentToText(n.content);
  let r = e.outputSchema?.safeParse({
    stdout: n.envelope === "present" ? o : sanitizeForPrompt(o, MAX_KEPT_ANSWER_CHARS),
    stderr: "",
    interrupted: false,
  });
  return r?.success ? r.data : undefined;
}
//@ chunk-dtv8x2hx.js:65870-65915 placement
/**
 * 工具声明支持结构化输出时返回结构化结果，否则 undefined。
 */
function structuredOutputIfStructured(tool, n) {
  return isNonMcpShellTool(tool) ? remoteStructuredOutput(tool, n) : undefined;
}
//@ chunk-dtv8x2hx.js:65915-65988 placement
function isTextOrTextBlocks(content) {
  return typeof content === "string" || content.every((n) => n.type === "text");
}
//@ chunk-dtv8x2hx.js:65988-66106 placement
function toolUseErrorResult(e, toolUseId) {
  return {
    type: "tool_result",
    tool_use_id: toolUseId,
    content: `<tool_use_error>${e}</tool_use_error>`,
    is_error: true,
  };
}
//@ chunk-dtv8x2hx.js:66106-66322 placement
function appendResultLines(e, n) {
  if (n.length === 0) return e;
  let joined = n.join(`
`);
  let { content } = e;
  if (content === undefined || content === "")
    return {
      ...e,
      content: joined,
    };
  return typeof content === "string"
    ? {
        ...e,
        content: `${content}
${joined}`,
      }
    : {
        ...e,
        content: [
          ...content,
          {
            type: "text",
            text: joined,
          },
        ],
      };
}
//@ chunk-dtv8x2hx.js:66322-66498 placement
function prependResultLine(e, n) {
  let { content } = e;
  if (content === undefined || content === "")
    return {
      ...e,
      content: n,
    };
  return typeof content === "string"
    ? {
        ...e,
        content: `${n}
${content}`,
      }
    : {
        ...e,
        content: [
          {
            type: "text",
            text: n,
          },
          ...content,
        ],
      };
}
//@ chunk-dtv8x2hx.js:66498-66547 placement
var TOOL_USE_ERROR_OPEN_TAG = "<tool_use_error>";
var TOOL_USE_ERROR_CLOSE_TAG = "</tool_use_error>";
//@ chunk-dtv8x2hx.js:66547-66703 placement
function remoteResultText_2(e, n = MAX_KEPT_ANSWER_CHARS) {
  let o = contentToText(e.content);
  let r =
    (e.isError || !isRanOutcome(e.disposition)) &&
    o.startsWith(TOOL_USE_ERROR_OPEN_TAG) &&
    o.endsWith(TOOL_USE_ERROR_CLOSE_TAG);
  return sanitizeForPrompt(
    r ? o.slice(TOOL_USE_ERROR_OPEN_TAG.length, -TOOL_USE_ERROR_CLOSE_TAG.length) : o,
    n,
  );
}
//@ chunk-dtv8x2hx.js:66703-66765 placement
/**
 * 判断远程结果文本是否超过要保留的字符上限（超出则应把全文写到文件）。
 */
function exceedsAnswerCharLimit(e) {
  return remoteResultText_2(e, Number.MAX_SAFE_INTEGER).length > MAX_KEPT_ANSWER_CHARS;
}
//@ chunk-dtv8x2hx.js:66765-66777 placement
var MAX_KEPT_ANSWER_CHARS = 2000;
//@ chunk-dtv8x2hx.js:66777-67941 placement
function formatSavedOutputNote(e, n) {
  let o = e.host.name;
  let r = `e.g. ${n.name} with ${HOST_TOOL_INPUT_FIELD}: "${o}"`;
  return e.hostLocal.map((s) => {
    switch (s) {
      case "saved_output_file":
        return `(the full output was saved to a file on ${o} that was not sent and cannot be read from here \u2014 re-run the command there with ${outputFilterHint(n.name)} if that is safe, ${r})`;
      case "background_task": {
        if (e.backgroundTaskId === undefined)
          return `(that command keeps running as a background task ON ${o}: its task id and output file exist there, not here, and this session is not notified when it finishes \u2014 check on it there, ${r})`;
        return `(that command keeps running as a background task ON ${o}: its ID and output file exist there, not here, and this session is not notified when it finishes. Its output file there (${FILE_READ_TOOL_NAME} with ${HOST_TOOL_INPUT_FIELD}: "${o}") shows what it has printed, not whether it is still running. To stop it, call ${TASKSTOP} with that ID and ${HOST_TOOL_INPUT_FIELD}: "${o}". Never check on it or stop it with pgrep, pkill or kill: with the sandbox on there, a later command cannot see or reach this process, or a server it started. To test such a server, do it inside the same command, or ask the user to turn the sandbox off for that folder.)`;
      }
    }
  });
}
//@ chunk-dtv8x2hx.js:67941-67971 placement
var NUMBERED_LINE_REGEX = /^\s*(\d+)[\t:\u2192]/;
//@ chunk-dtv8x2hx.js:67971-68583 placement
function formatLineCutNote(e, n) {
  if (e.name !== FILE_READ_TOOL_NAME) return;
  let o = contentToText(n.content);
  let match = REMOTE_TOOL_SERVING_LIMITS.exec(o);
  if (match === null) return;
  let s;
  let u = 0;
  let p;
  let i = 0;
  for (let line of o.slice(0, match.index).split(`
`)) {
    let match = NUMBERED_LINE_REGEX.exec(line);
    if (match === null) continue;
    let S = Number(match[1]);
    if (p !== undefined && S === i + 1) i = S;
    else {
      p = S;
      i = S;
    }
    if (s === undefined || i - p > u - s) {
      s = p;
      u = i;
    }
  }
  if (s === undefined || u <= s) return;
  let h = n.host.name;
  return `(${h} cut this result at the most it sends in one answer: lines ${s}-${u - 1} arrived whole, line ${u} may be cut short, and the rest of the file is not in this result. The next page is ${FILE_READ_TOOL_NAME} with offset=${u} limit=${u - s} and ${HOST_TOOL_INPUT_FIELD}: "${h}"; ${GREP_TOOL_NAME} there finds a specific section.)`;
}
//@ chunk-dtv8x2hx.js:68583-68603 placement
var RECONNECT_STATUS_SETTLE_MS = 3000;
var RECONNECT_STATUS_LEAD_MS = 2000;
export {
  RECONNECT_STATUS_LEAD_MS,
  RECONNECT_STATUS_SETTLE_MS,
  remoteStructuredOutput,
  toolUseErrorResult,
  shellOutputShownAbove,
  formatCompletedOnHost,
  formatTruncatedResult,
  unverifiedAnswerWithOutput,
  buildRemoteToolResultBlock,
  structuredOutputIfStructured,
  remoteResultText_2,
  exceedsAnswerCharLimit,
};
