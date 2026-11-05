/**
 * services/remoteTools/remoteToolResult.ts
 *
 * 2.1.316 新增：远程工具结果的呈现：完成标注、截断说明、未验证结果、输出落盘位置
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3tymqgex.js (1), chunk-yvhjwwtt.js (22)
 * attribution: placement 23
 */
import { isRanOutcome, REMOTE_TOOL_SERVING_LIMITS } from "../../remote/tools/protocolConstants.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
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
import { READ } from "../../tools/FileReadTool/constants.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";

//@ chunk-3tymqgex.js:858-876 placement
var RECONNECT_STATUS_SETTLE_MS = 3000;
var RECONNECT_STATUS_LEAD_MS = 2000;
//@ chunk-yvhjwwtt.js:63860-64152 placement
function buildRemoteToolResultBlock(tool, outcome, toolUseId) {
  let ran = isRanOutcome(outcome.disposition);
  let hasEnvelope = ran && outcome.envelope === "present";
  let isError = outcome.isError || !ran;
  let structured = structuredOutputIfStructured(tool, outcome);
  let block =
    structured === undefined
      ? {
          type: "tool_result",
          tool_use_id: toolUseId,
          content: hasEnvelope ? outcome.content : remoteResultText_2(outcome),
          ...(isError && {
            is_error: true,
          }),
        }
      : {
          ...tool.mapToolResultToToolResultBlockParam(structured, toolUseId),
          ...(isError && {
            is_error: true,
          }),
        };
  return appendResultLines(
    prependResultLine(block, unverifiedAnswerWithOutput(tool, outcome)),
    formatTruncatedResult(tool, outcome),
  );
}
//@ chunk-yvhjwwtt.js:64152-64196 placement
/**
 * 未验证答复 + 原始 shell 输出的组合文本。
 */
function unverifiedAnswerWithOutput(tool, outcome) {
  return `${formatUnverifiedAnswer(outcome)}${shellOutputFollowing(tool, outcome)}`;
}
//@ chunk-yvhjwwtt.js:64196-64244 placement
function shellOutputFollowing(tool, outcome) {
  return extractShellOutput(tool, outcome, "which follows");
}
//@ chunk-yvhjwwtt.js:64244-64297 placement
/**
 * 取「如上所示」的 shell 输出（去首尾空白）。
 */
function shellOutputShownAbove(tool, outcome) {
  return extractShellOutput(tool, outcome, "shown above").trim();
}
//@ chunk-yvhjwwtt.js:64297-64486 placement
function formatCompletedOnHost(tool, remoteOrigin) {
  return (tool.name === EDIT || tool.name === FILE_WRITE_TOOL_NAME) &&
    remoteOrigin.envelope === "present" &&
    isRanOutcome(remoteOrigin.disposition) &&
    !remoteOrigin.isError &&
    !remoteOrigin.truncated &&
    remoteOrigin.output === undefined
    ? `(completed on ${remoteOrigin.host.name}; diff not shown)`
    : "";
}
//@ chunk-yvhjwwtt.js:64486-64921 placement
function extractShellOutput(tool, outcome, whichWord) {
  if (outcome.spilled === undefined || !isRanOutcome(outcome.disposition)) return "";
  let structured = remoteStructuredOutput(tool, outcome);
  let stdout =
    typeof structured === "object" && structured !== null ? Reflect.get(structured, "stdout") : undefined;
  let inlineText = typeof stdout === "string" ? stdout.replace(REMOTE_TOOL_SERVING_LIMITS, "") : "";
  let inlineBytes = Buffer.byteLength(inlineText);
  if (inlineBytes === 0 || outcome.spilled.bytes <= inlineBytes) return "";
  let hostName = outcome.host.name;
  return ` Output was ${formatFileSize(outcome.spilled.bytes)}; ${hostName} sent the first ${formatFileSize(inlineBytes)}, ${whichWord}; the rest exists only on ${hostName} \u2014 re-run there with ${outputFilterHint(tool.name)} if that is safe.`;
}
//@ chunk-yvhjwwtt.js:64921-65529 placement
function formatTruncatedResult(tool, outcome) {
  let hasEnvelope = isRanOutcome(outcome.disposition) && outcome.envelope === "present";
  let answerTooLong = !hasEnvelope && exceedsAnswerCharLimit(outcome);
  return [
    ...formatHostNotes(outcome.notes, outcome.host.name),
    ...(outcome.truncated
      ? [
          (hasEnvelope ? formatLineCutNote(tool, outcome) : undefined) ??
            `(${outcome.host.name} truncated this result)`,
        ]
      : []),
    ...(outcome.cutHere && hasEnvelope
      ? [
          `(this session cut ${outcome.host.name}'s result to its own limits: ${REMOTE_RESULT_TEXT_CAP.toLocaleString("en-US")} characters of text, inline images up to ${MAX_REMOTE_IMAGE_BYTES / 1048576} MiB, ${MAX_REMOTE_CONTENT_BLOCKS} blocks)`,
        ]
      : []),
    ...(answerTooLong || (outcome.cutHere === true && !hasEnvelope)
      ? [
          `(this session kept only the first ${MAX_KEPT_ANSWER_CHARS.toLocaleString("en-US")} characters of ${outcome.host.name}'s answer)`,
        ]
      : []),
    ...(isRanOutcome(outcome.disposition) ? formatSavedOutputNote(outcome, tool) : []),
    ...describeDuplicateCall(outcome),
    ...(outcome.sessionNotes ?? []).map((note) => `(${note.text})`),
  ];
}
//@ chunk-yvhjwwtt.js:65529-65776 placement
function describeDuplicateCall(outcome) {
  if (outcome.delivery === "fresh" || outcome.disposition === "duplicate_call") return [];
  let whatHappened = isRanOutcome(outcome.disposition)
    ? outcome.isError
      ? "failed"
      : "completed"
    : outcome.disposition === "unrecognized"
      ? "failed"
      : "refused";
  return outcome.delivery === "replayed"
    ? [replayedOutcomeNote(outcome.servedAt, whatHappened)]
    : [deliveredAfterReconnectNote(whatHappened)];
}
//@ chunk-yvhjwwtt.js:65776-66850 placement
/**
 * 标注"由某机器回答但无运行细节、未验证"。
 */
function formatUnverifiedAnswer(outcome) {
  let hostName = outcome.host.name;
  if (outcome.envelope !== "present")
    return `[answered by ${hostName} without run details \u2014 unverified; whether the command ran there is unknown, so check before re-running it]`;
  switch (outcome.disposition) {
    case undefined:
    case "ran":
    case "approved_by_session":
      return ranOnHeader(hostName, outcome.spelledDirectory, outcome.permittedBy, outcome.isError);
    case "hook_blocked":
      return `[blocked on ${hostName} before it ran (hook or deny rule) \u2014 not run]`;
    case "denied_by_rule":
    case "denied_by_user":
    case "ask_refused_no_surface":
      return `[refused on ${hostName} \u2014 not run]`;
    case "validation_failed":
      return `[rejected on ${hostName} \u2014 not run]`;
    case "duplicate_call":
      return `[not re-run on ${hostName}]`;
    case "denied_by_session":
      return `[refused on ${hostName} \u2014 not run]`;
    case "asked_in_session":
      return `[waiting on a permission decision for ${hostName} \u2014 not run]`;
    case "ask_expired":
      return `[permission ask for ${hostName} ended unanswered \u2014 not run]`;
    case "unrecognized":
      return `[answered by ${hostName} with an outcome this version of Claude Code does not recognise \u2014 whether the command ran there is unknown, so check before re-running it]`;
  }
}
//@ chunk-yvhjwwtt.js:66850-67127 placement
function remoteStructuredOutput(tool, outcome) {
  if (!isRanOutcome(outcome.disposition)) return;
  if (outcome.output !== undefined) return outcome.output;
  if (outcome.isError || !isNonMcpShellTool(tool) || !isTextOrTextBlocks(outcome.content)) return;
  let text = contentToText(outcome.content);
  let parsed = tool.outputSchema?.safeParse({
    stdout: outcome.envelope === "present" ? text : sanitizeForPrompt(text, MAX_KEPT_ANSWER_CHARS),
    stderr: "",
    interrupted: false,
  });
  return parsed?.success ? parsed.data : undefined;
}
//@ chunk-yvhjwwtt.js:67127-67172 placement
/**
 * 工具声明支持结构化输出时返回结构化结果，否则 undefined。
 */
function structuredOutputIfStructured(tool, outcome) {
  return isNonMcpShellTool(tool) ? remoteStructuredOutput(tool, outcome) : undefined;
}
//@ chunk-yvhjwwtt.js:67172-67245 placement
function isTextOrTextBlocks(content) {
  return typeof content === "string" || content.every((block) => block.type === "text");
}
//@ chunk-yvhjwwtt.js:67245-67363 placement
function toolUseErrorResult(message, toolUseId) {
  return {
    type: "tool_result",
    tool_use_id: toolUseId,
    content: `<tool_use_error>${message}</tool_use_error>`,
    is_error: true,
  };
}
//@ chunk-yvhjwwtt.js:67363-67579 placement
function appendResultLines(block, lines) {
  if (lines.length === 0) return block;
  let joined = lines.join(`
`);
  let { content } = block;
  if (content === undefined || content === "")
    return {
      ...block,
      content: joined,
    };
  return typeof content === "string"
    ? {
        ...block,
        content: `${content}
${joined}`,
      }
    : {
        ...block,
        content: [
          ...content,
          {
            type: "text",
            text: joined,
          },
        ],
      };
}
//@ chunk-yvhjwwtt.js:67579-67755 placement
function prependResultLine(block, line) {
  let { content } = block;
  if (content === undefined || content === "")
    return {
      ...block,
      content: line,
    };
  return typeof content === "string"
    ? {
        ...block,
        content: `${line}
${content}`,
      }
    : {
        ...block,
        content: [
          {
            type: "text",
            text: line,
          },
          ...content,
        ],
      };
}
//@ chunk-yvhjwwtt.js:67755-67804 placement
var TOOL_USE_ERROR_OPEN_TAG = "<tool_use_error>";
var TOOL_USE_ERROR_CLOSE_TAG = "</tool_use_error>";
//@ chunk-yvhjwwtt.js:67804-67960 placement
function remoteResultText_2(outcome, maxChars = MAX_KEPT_ANSWER_CHARS) {
  let text = contentToText(outcome.content);
  let isWrappedError =
    (outcome.isError || !isRanOutcome(outcome.disposition)) &&
    text.startsWith(TOOL_USE_ERROR_OPEN_TAG) &&
    text.endsWith(TOOL_USE_ERROR_CLOSE_TAG);
  return sanitizeForPrompt(
    isWrappedError ? text.slice(TOOL_USE_ERROR_OPEN_TAG.length, -TOOL_USE_ERROR_CLOSE_TAG.length) : text,
    maxChars,
  );
}
//@ chunk-yvhjwwtt.js:67960-68022 placement
/**
 * 判断远程结果文本是否超过要保留的字符上限（超出则应把全文写到文件）。
 */
function exceedsAnswerCharLimit(outcome) {
  return remoteResultText_2(outcome, Number.MAX_SAFE_INTEGER).length > MAX_KEPT_ANSWER_CHARS;
}
//@ chunk-yvhjwwtt.js:68022-68034 placement
var MAX_KEPT_ANSWER_CHARS = 2000;
//@ chunk-yvhjwwtt.js:68034-69198 placement
function formatSavedOutputNote(outcome, tool) {
  let hostName = outcome.host.name;
  let rerunHint = `e.g. ${tool.name} with ${HOST_TOOL_INPUT_FIELD}: "${hostName}"`;
  return outcome.hostLocal.map((reason) => {
    switch (reason) {
      case "saved_output_file":
        return `(the full output was saved to a file on ${hostName} that was not sent and cannot be read from here \u2014 re-run the command there with ${outputFilterHint(tool.name)} if that is safe, ${rerunHint})`;
      case "background_task": {
        if (outcome.backgroundTaskId === undefined)
          return `(that command keeps running as a background task ON ${hostName}: its task id and output file exist there, not here, and this session is not notified when it finishes \u2014 check on it there, ${rerunHint})`;
        return `(that command keeps running as a background task ON ${hostName}: its ID and output file exist there, not here, and this session is not notified when it finishes. Its output file there (${READ} with ${HOST_TOOL_INPUT_FIELD}: "${hostName}") shows what it has printed, not whether it is still running. To stop it, call ${TASKSTOP} with that ID and ${HOST_TOOL_INPUT_FIELD}: "${hostName}". Never check on it or stop it with pgrep, pkill or kill: with the sandbox on there, a later command cannot see or reach this process, or a server it started. To test such a server, do it inside the same command, or ask the user to turn the sandbox off for that folder.)`;
      }
    }
  });
}
//@ chunk-yvhjwwtt.js:69198-69228 placement
var NUMBERED_LINE_REGEX = /^\s*(\d+)[\t:\u2192]/;
//@ chunk-yvhjwwtt.js:69228-69840 placement
function formatLineCutNote(tool, outcome) {
  if (tool.name !== READ) return;
  let text = contentToText(outcome.content);
  let match = REMOTE_TOOL_SERVING_LIMITS.exec(text);
  if (match === null) return;
  let runStart;
  let longestEnd = 0;
  let currentStart;
  let currentEnd = 0;
  for (let line of text.slice(0, match.index).split(`
`)) {
    let match = NUMBERED_LINE_REGEX.exec(line);
    if (match === null) continue;
    let lineNumber = Number(match[1]);
    if (currentStart !== undefined && lineNumber === currentEnd + 1) currentEnd = lineNumber;
    else {
      currentStart = lineNumber;
      currentEnd = lineNumber;
    }
    if (runStart === undefined || currentEnd - currentStart > longestEnd - runStart) {
      runStart = currentStart;
      longestEnd = currentEnd;
    }
  }
  if (runStart === undefined || longestEnd <= runStart) return;
  let hostName = outcome.host.name;
  return `(${hostName} cut this result at the most it sends in one answer: lines ${runStart}-${longestEnd - 1} arrived whole, line ${longestEnd} may be cut short, and the rest of the file is not in this result. The next page is ${READ} with offset=${longestEnd} limit=${longestEnd - runStart} and ${HOST_TOOL_INPUT_FIELD}: "${hostName}"; ${GREP_TOOL_NAME} there finds a specific section.)`;
}
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
