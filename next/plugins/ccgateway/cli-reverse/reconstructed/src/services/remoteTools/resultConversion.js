/**
 * services/remoteTools/resultConversion.ts
 *
 * 2.1.316 新增：把远程机器的工具结果转为本地 tool_result：拒绝/失败处理、内容限长、文档附件放置。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5vfqv7sk.js (28), chunk-9tzb09wm.js (3)
 * attribution: placement 31
 */
import { isAwayRecheckOnCached } from "./awayRecheckFlag.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { PDF_READ_MARKER_PREFIX } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { hasBufferPrefix } from "../../utils/mcpOutputStorage.js";
import { unreachableCallMessage, notAnsweringMessage } from "./targetMessages.js";
import {
  approvalNotVerifiedMessage,
  unverifiedApprovalMessage,
  callTimedOutMessage,
  livenessCheckNotSentMessage,
  nothingRanSendTimeoutMessage,
  sendTimedOutMessage,
  interruptedCallMessage,
  unverifiedRefusalMessage,
  maybeReachedMessage,
  disconnectedDuringCallMessage,
  failedInTransitMessage,
  deliveredAfterReconnectNote,
  replayedOutcomeNote,
  displayWorkingDir,
  refusedDidNotRunLine,
  refusedByMachineLine,
  failedOnMachineLine,
  stillRunningMessage,
} from "./transportMessages.js";
import { isUnverifiedRefusal, SPILLEDOUTPUTBYTES } from "../../remote/tools/protocolConstants.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { isNonMcpShellTool } from "../../tools/shared/textSearchTools.js";
import { supportsBackgroundShells, AGENT_ID_REGEX } from "./backgroundCommands.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { getAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { KEPT_RESULT_FIELDS_BY_TOOL } from "../../remote/tools/protocolSchemas.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { countWhere } from "../../utils/collections.js";
import { leaseOfMachine } from "./lease.js";
import { normalizeMcpServerName } from "../api/deferredToolsState.js";
import {
  OPEN_BRACKETS_RE,
  CLOSE_BRACKETS_RE,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  CANCEL_MESSAGE,
  SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX,
  SUBAGENT_REJECT_MESSAGE,
  withMemoryCorrectionHint,
  REJECT_MESSAGE_WITH_REASON_PREFIX,
  REJECT_MESSAGE,
} from "../../utils/messages.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-9tzb09wm.js:22306-22331 placement
var CAP_ANNOUNCES_RETURN = "announces_return";
//@ chunk-9tzb09wm.js:22331-22422 placement
function hostAnnouncesReturnCap(host) {
  return host.source === "session" && host.description?.capabilities?.includes(CAP_ANNOUNCES_RETURN) === true;
}
//@ chunk-9tzb09wm.js:22422-22524 placement
function isHostAwayRecheckable(host) {
  return (
    isAwayRecheckOnCached() &&
    host.transport.isAway?.() === true &&
    (hostAnnouncesReturnCap(host) || host.transport.isRechecked?.() === true)
  );
}
//@ chunk-5vfqv7sk.js:19306-19352 placement
/**
 * 远程结果转本地结果时的内容上限：文本总字符、单张图片字节、内容块条数与该类的总字节。
 */
var REMOTE_RESULT_TEXT_CAP = 262144;
var MAX_REMOTE_IMAGE_BYTES = 8388608;
var MAX_PLACED_ATTACHMENT_BYTES = 8388608;
var MAX_REMOTE_CONTENT_BLOCKS = 100;
//@ chunk-5vfqv7sk.js:19352-19441 placement
function capTextContent(content) {
  let capped = capRemoteContent(content);
  return {
    content: capped.content,
    truncated: false,
    ...(capped.cut && {
      cutHere: true,
    }),
  };
}
//@ chunk-5vfqv7sk.js:19441-20166 placement
function capRemoteContent(content) {
  if (typeof content === "string")
    return content.length > REMOTE_RESULT_TEXT_CAP
      ? {
          content: truncateToLength(content, REMOTE_RESULT_TEXT_CAP),
          cut: true,
        }
      : {
          content,
          cut: false,
        };
  let { blocks, cut } = content.slice(0, MAX_REMOTE_CONTENT_BLOCKS).reduce(
    (acc, block) => {
      if (block.type === "text") {
        let text = truncateToLength(block.text, Math.max(0, acc.text));
        if (text.trim() !== "")
          acc.blocks.push({
            ...block,
            text,
          });
        return {
          ...acc,
          text: acc.text - text.length,
          cut: acc.cut || text.length < block.text.length,
        };
      }
      if (block.type === "image") {
        let dataLength = block.source.type === "base64" ? block.source.data.length : undefined;
        if (dataLength !== undefined && dataLength <= acc.image) {
          acc.blocks.push(block);
          return {
            ...acc,
            image: acc.image - dataLength,
          };
        }
        acc.blocks.push({
          type: "text",
          text: "(an image in the answer was dropped: too large, or not sent inline)",
        });
        return {
          ...acc,
          cut: true,
        };
      }
      acc.blocks.push(block);
      return acc;
    },
    {
      blocks: [],
      text: REMOTE_RESULT_TEXT_CAP,
      image: MAX_REMOTE_IMAGE_BYTES,
      cut: content.length > MAX_REMOTE_CONTENT_BLOCKS,
    },
  );
  return {
    content: cut || blocks.length !== content.length ? blocks : content,
    cut,
  };
}
//@ chunk-5vfqv7sk.js:20166-20229 placement
function isPlaceholderTextBlock(block) {
  return block?.type === "text" && block.text.startsWith(PDF_READ_MARKER_PREFIX);
}
//@ chunk-5vfqv7sk.js:20229-20291 placement (2.1.88 match: base64URLEncode, 1)
function base64URLEncode(buffer) {
  return hasBufferPrefix(Buffer.from(buffer.slice(0, 8), "base64"));
}
//@ chunk-5vfqv7sk.js:20291-20737 placement
function placeDocumentAttachments(content, documents) {
  if (documents === undefined || documents.length === 0 || typeof content === "string") return content;
  let { placed } = documents.reduce(
    (acc, docEntry) =>
      docEntry.data.length <= acc.remaining &&
      base64URLEncode(docEntry.data) &&
      isPlaceholderTextBlock(content[docEntry.at]) &&
      !acc.placed.has(docEntry.at)
        ? {
            placed: new Map([...acc.placed, [docEntry.at, docEntry]]),
            remaining: acc.remaining - docEntry.data.length,
          }
        : acc,
    {
      placed: new Map(),
      remaining: MAX_PLACED_ATTACHMENT_BYTES,
    },
  );
  if (placed.size === 0) return content;
  return content.map((block, index) => {
    let placedDocument = placed.get(index);
    return placedDocument === undefined
      ? block
      : {
          type: "document",
          source: {
            type: "base64",
            media_type: placedDocument.media_type,
            data: placedDocument.data,
          },
        };
  });
}
//@ chunk-5vfqv7sk.js:20737-21147 placement
function capStructuredOutput(output) {
  if (typeof output !== "object" || output === null)
    return {
      output,
      truncated: false,
    };
  let { entries, cut } = Object.entries(output).reduce(
    (acc, [key, value]) => {
      if (typeof value !== "string") {
        acc.entries.push([key, value]);
        return acc;
      }
      let capped = truncateToLength(value, Math.max(0, acc.remaining));
      acc.entries.push([key, capped]);
      return {
        ...acc,
        remaining: acc.remaining - capped.length,
        cut: acc.cut || capped.length < value.length,
      };
    },
    {
      entries: [],
      remaining: REMOTE_RESULT_TEXT_CAP,
      cut: false,
    },
  );
  return {
    output: cut ? Object.fromEntries(entries) : output,
    truncated: cut,
  };
}
//@ chunk-5vfqv7sk.js:21147-21218 placement
function failureSide(failure) {
  return failure.machineNotAnswering === true ? "machine" : "this_side";
}
//@ chunk-5vfqv7sk.js:21218-23375 placement
/**
 * 把远程机器返回的工具结果转为本地 tool_result：处理 refused/failed/error/transport_error/completed，截断大输出，附加"在哪台机器运行"说明。
 */
function convertRemoteToolResult(tool, host, transported, { afterReconnect = false, call } = {}) {
  let identity = machineIdentity(host);
  let hostName = host.name;
  switch (transported.kind) {
    case "result":
      if (transported.envelope !== undefined)
        return {
          outcome: convertCompletedResult(tool, host, transported.envelope, {
            afterReconnect,
            ...{},
            call,
          }),
          responseBytes: transported.responseBytes,
          metaCopy: transported.metaCopy,
          refusalCode: transported.envelope.outcome === "refused" ? transported.envelope.code : undefined,
          failureCode: transported.envelope.outcome === "failed" ? transported.envelope.code : undefined,
        };
      if (transported.isError)
        return {
          outcome: {
            kind: "error",
            code: "transport_error",
            message: answeredWithErrorMessage({
              name: hostName,
              detail: sanitizeForPrompt(contentToText(transported.content)),
            }),
            host: identity,
          },
          responseBytes: transported.responseBytes,
        };
      return {
        outcome: {
          kind: "completed",
          host: identity,
          spelledDirectory: "",
          ...capTextContent(transported.content),
          isError: false,
          output: undefined,
          patchRefused: false,
          disposition: undefined,
          notes: [],
          hostLocal: [],
          envelope: "missing",
          delivery: "fresh",
        },
        responseBytes: transported.responseBytes,
      };
    case "unreachable":
      return {
        outcome: {
          kind: "error",
          code: "unreachable",
          message:
            host.transport.kind === "session"
              ? unreachableCallMessage(
                  hostName,
                  transported.detail,
                  failureSide(transported),
                  isHostAwayRecheckable(host),
                  {
                    cause: transported.saidAsleep
                      ? "asleep"
                      : transported.signedOff
                        ? "signed_off"
                        : transported.saidBusy
                          ? "busy"
                          : transported.lastHeardAt !== undefined
                            ? "silent"
                            : undefined,
                    lastHeardAt: transported.lastHeardAt,
                    leftFor: transported.leftFor,
                  },
                )
              : notAnsweringMessage(hostName, failureSide(transported)),
          host: identity,
        },
      };
    case "approval_unverified":
      return {
        outcome: {
          kind: "error",
          code: "approval_unverified",
          message:
            host.transport.kind === "session"
              ? approvalNotVerifiedMessage(hostName)
              : unverifiedApprovalMessage(hostName),
          host: identity,
        },
      };
    case "timed_out":
      return {
        outcome: {
          kind: "error",
          code: "timed_out",
          message: callTimedOutMessage({
            name: hostName,
            capMs: transported.capMs,
          }),
          host: identity,
          open: "timed_out",
        },
      };
    case "stalled":
      return {
        outcome: {
          kind: "error",
          code: transported.takenBack ? "stalled_unsent" : "stalled",
          message:
            transported.request === "probe"
              ? livenessCheckNotSentMessage({
                  name: hostName,
                  capMs: transported.capMs,
                })
              : transported.takenBack
                ? nothingRanSendTimeoutMessage({
                    name: hostName,
                    capMs: transported.capMs,
                  })
                : sendTimedOutMessage({
                    name: hostName,
                    capMs: transported.capMs,
                  }),
          ...(transported.request !== "probe" &&
            !transported.takenBack && {
              open: "stalled",
            }),
          host: identity,
        },
      };
    case "host_gone":
      return {
        outcome: {
          kind: "error",
          code: transported.why === "withdrawn" ? "host_withdrawn" : "host_gone",
          message: interruptedCallMessage({
            name: hostName,
            why: transported.why,
            unsent: transported.unsent,
          }),
          host: identity,
        },
      };
    case "dropped":
      return {
        outcome: {
          kind: "error",
          code: "dropped",
          message: isUnverifiedRefusal(transported)
            ? unverifiedRefusalMessage(hostName)
            : transported.why === "write_unresolved"
              ? maybeReachedMessage(hostName)
              : disconnectedDuringCallMessage(hostName),
          host: identity,
          open: "delivery_unknown",
        },
      };
    case "cancelled":
      return {
        outcome: interruptedResult(identity),
      };
    case "transport_error":
      return {
        outcome: {
          kind: "error",
          code: "transport_error",
          message:
            transported.unreadableResult === true
              ? unreadableResultMessage(hostName)
              : failedInTransitMessage({
                  name: hostName,
                  detail: sanitizeForPrompt(transported.detail),
                }),
          host: identity,
          ...(transported.unreadableResult === true && {
            unreadableResult: true,
          }),
        },
      };
  }
}
//@ chunk-5vfqv7sk.js:23375-23392 placement
/**
 * 备注类文本的常量：单条备注字符上限与附带备注条数上限。
 */
var NOTE_CHAR_CAP = 2000;
var MAX_REMOTE_NOTES = 8;
//@ chunk-5vfqv7sk.js:23392-23537 placement
function formatHostNotes(notes, name) {
  let mapped = notes
    .slice(0, MAX_REMOTE_NOTES)
    .map((note) => `[note from ${name}] ${sanitizeForPrompt(note, NOTE_CHAR_CAP)}`);
  return notes.length > MAX_REMOTE_NOTES
    ? [...mapped, `(${notes.length - MAX_REMOTE_NOTES} more notes omitted)`]
    : mapped;
}
//@ chunk-5vfqv7sk.js:23537-23550 placement
/**
 * 机器消息的字符上限。
 */
var MAX_MACHINE_MESSAGE_CHARS = 2000;
//@ chunk-5vfqv7sk.js:23550-23740 placement
function unreadableResultMessage(hostName) {
  return `${hostName} answered in a result format this session cannot read (Claude Code version mismatch?); the command probably ran there \u2014 check its effect before repeating it.`;
}
//@ chunk-5vfqv7sk.js:23740-23966 placement
function answeredWithErrorMessage({ name, detail }) {
  return `The connection to ${name} answered with an error: ${detail} \u2014 ${name}'s Claude Code did not report running the call; whether it ran there is not known, so check its effect before repeating it.`;
}
//@ chunk-5vfqv7sk.js:23966-24104 placement
var REMOTE_ONLY_RESULT_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5vfqv7sk.js:23966", () => {
  REMOTE_ONLY_RESULT_KEYS = new Set([
    "backgroundTaskId",
    "backgroundedByUser",
    "persistedOutputPath",
    "persistedOutputSize",
    "rawOutputPath",
    "structuredContent",
  ]);
});
//@ chunk-5vfqv7sk.js:24104-26226 placement
function convertCompletedResult(tool, host, result, options = {}) {
  let { afterReconnect = false, call } = options;
  let unused = undefined;
  let host_2 = {
    name: host.name,
    working_dir: cleanWorkingDir(result.target.working_dir),
  };
  let withNotes = (message) =>
    (result.outcome === "refused" || result.outcome === "failed") &&
    result.notes !== undefined &&
    result.notes.length > 0
      ? [message, ...formatHostNotes(result.notes, host.name)].join(`
`)
      : message;
  let deliveryNote =
    result.outcome !== "refused" && result.outcome !== "failed"
      ? ""
      : afterReconnect
        ? ` ${deliveredAfterReconnectNote(result.outcome)}`
        : result.replayed === true
          ? ` ${replayedOutcomeNote(result.served_at, result.outcome)}`
          : "";
  switch (result.outcome) {
    case "completed": {
      let capped = capRemoteContent(
        tool.name === READ ? placeDocumentAttachments(result.content, result.documents) : result.content,
      );
      let converted = convertRemoteOutput(tool, result, call);
      let backgroundTaskId =
        isNonMcpShellTool(tool) && supportsBackgroundShells(host) && host.servedTools.has(TASKSTOP)
          ? getAlias(result.output, "backgroundTaskId")
          : undefined;
      let cappedOutput = isNonMcpShellTool(tool)
        ? capStructuredOutput(converted.output)
        : {
            output: converted.output,
            truncated: false,
          };
      return {
        kind: "completed",
        host: host_2,
        spelledDirectory: displayWorkingDir(result.target.working_dir, host.description?.home_dir),
        content: capped.content,
        truncated: result.truncated === true,
        ...((capped.cut || cappedOutput.truncated) && {
          cutHere: true,
        }),
        isError: result.is_error,
        ...(cappedOutput.output === undefined
          ? {
              output: undefined,
              patchRefused: converted.patchRefused,
            }
          : {
              output: cappedOutput.output,
            }),
        hostLocal: converted.hostLocal,
        ...(converted.spilledBytes !== undefined && {
          spilled: {
            bytes: converted.spilledBytes,
          },
        }),
        ...(typeof backgroundTaskId === "string" &&
          AGENT_ID_REGEX.test(backgroundTaskId) && {
            backgroundTaskId,
          }),
        disposition: result.disposition,
        notes: result.notes ?? [],
        envelope: "present",
        delivery: afterReconnect ? "after_reconnect" : result.replayed === true ? "replayed" : "fresh",
        ...(result.served_at !== undefined && {
          servedAt: result.served_at,
        }),
        ...{},
      };
    }
    case "refused": {
      if (result.code === "no_approval")
        return {
          kind: "error",
          code: "approval_unverified",
          message: withNotes(`${unverifiedApprovalMessage(host.name)}${deliveryNote}`),
          host: host_2,
        };
      let refusedLine = host.transport.kind === "session" ? refusedDidNotRunLine : refusedByMachineLine;
      return {
        kind: "error",
        code: "refused_by_host",
        message: withNotes(
          `${refusedLine({
            name: host.name,
            message: sanitizeForPrompt(result.message, MAX_MACHINE_MESSAGE_CHARS),
          })}${deliveryNote}`,
        ),
        host: host_2,
      };
    }
    case "failed":
      return {
        kind: "error",
        code: "failed_on_host",
        message: withNotes(
          `${failedOnMachineLine({
            name: host.name,
            message: sanitizeForPrompt(result.message, MAX_MACHINE_MESSAGE_CHARS),
          })}${deliveryNote}`,
        ),
        host: host_2,
      };
    case "in_progress":
      return {
        kind: "error",
        code: "still_running",
        message: stillRunningMessage({
          name: host.name,
          state: result.state,
          cause: "unasked",
        }),
        host: host_2,
        open: result.state === "running" ? "still_running" : "delivery_unknown",
      };
    case "needs_approval":
      return {
        kind: "error",
        code: "refused_by_host",
        message: refusedByMachineLine({
          name: host.name,
          message: sanitizeForPrompt(result.message, MAX_MACHINE_MESSAGE_CHARS),
        }),
        host: host_2,
      };
    case "acknowledged":
      return {
        kind: "error",
        code: "refused_by_host",
        message: refusedByMachineLine({
          name: host.name,
          message: "the machine acknowledged a decision for a call this session did not ask about",
        }),
        host: host_2,
      };
  }
}
//@ chunk-5vfqv7sk.js:26226-27107 placement
/**
 * 把远程机器返回的结构化输出转换为本地工具输出：只保留白名单字段，Edit/Write 用本地输入重建 patch 输出并按 schema 校验；记录只在远端存在的输出（落盘文件、后台任务）与溢出字节。
 */
function convertRemoteOutput(tool, result, call) {
  let output = result.output;
  if (output === undefined || output === null || typeof output !== "object")
    return {
      output: undefined,
      hostLocal: [],
      spilledBytes: undefined,
      patchRefused: false,
    };
  let keys = Object.keys(output);
  let spilledRaw = isNonMcpShellTool(tool) ? Reflect.get(output, SPILLEDOUTPUTBYTES) : undefined;
  let spilledBytes =
    typeof spilledRaw === "number" && Number.isSafeInteger(spilledRaw) && spilledRaw > 0
      ? spilledRaw
      : undefined;
  let hostLocal = [
    ...(keys.includes("persistedOutputPath") ? ["saved_output_file"] : []),
    ...(keys.includes("backgroundTaskId") ? ["background_task"] : []),
  ];
  if (keys.some((key) => REMOTE_ONLY_RESULT_KEYS.has(key)) || Reflect.get(output, "isImage") === true)
    return {
      output: undefined,
      hostLocal,
      spilledBytes,
      patchRefused: false,
    };
  let keptFields = KEPT_RESULT_FIELDS_BY_TOOL.get(tool.name);
  if (keptFields === undefined)
    return {
      output: undefined,
      hostLocal,
      spilledBytes,
      patchRefused: false,
    };
  let output_2 = pickByHelper(output, (value, key) => keptFields.has(key));
  let schemaInput = isNonMcpShellTool(tool)
    ? output_2
    : result.is_error || result.truncated === true
      ? undefined
      : rebuildFileToolOutput(tool.name, output_2, call);
  let parsed = schemaInput === undefined ? undefined : tool.outputSchema?.safeParse(schemaInput);
  return {
    output: parsed?.success ? parsed.data : undefined,
    hostLocal,
    spilledBytes,
    patchRefused: output_2.structuredPatch !== undefined && !isRenderablePatchList(output_2.structuredPatch),
  };
}
//@ chunk-5vfqv7sk.js:27107-27126 placement
var MAX_PATCH_FILE_ENTRIES = 200;
var MAX_PATCH_TOTAL_CHARS = 5000;
//@ chunk-5vfqv7sk.js:27126-27774 placement
/**
 * 由远程 Edit/Write 结果与本地输入重建文件工具的输出对象（含 patch 与暂存标记）。
 */
function rebuildFileToolOutput(toolName, output, call) {
  if (call === undefined || !isRenderablePatchList(output.structuredPatch)) return;
  let filePath = call.input.file_path;
  if (typeof filePath !== "string") return;
  let stagedFields = output.staged === true && {
    staged: true,
    stagedWording: output.stagedWording,
  };
  if (toolName === EDIT)
    return {
      filePath,
      oldString: call.input.old_string,
      newString: call.input.new_string,
      replaceAll: call.input.replace_all === true,
      originalFile: null,
      structuredPatch: output.structuredPatch,
      userModified: call.editedByApproval,
      ...stagedFields,
    };
  if (toolName === FILE_WRITE_TOOL_NAME) {
    let isCreate =
      output.type === "create" ||
      (Array.isArray(output.structuredPatch) && output.structuredPatch.length === 0);
    return {
      type: output.type,
      filePath,
      content: isCreate ? call.input.content : "",
      structuredPatch: output.structuredPatch,
      originalFile: null,
      userModified: call.editedByApproval,
      ...stagedFields,
    };
  }
  return;
}
//@ chunk-5vfqv7sk.js:27774-27943 placement
function isRenderablePatchList(structuredPatch) {
  if (!Array.isArray(structuredPatch) || structuredPatch.length > MAX_PATCH_FILE_ENTRIES) return false;
  if (!structuredPatch.every(isValidPatchHunk)) return false;
  let flattened = structuredPatch.flatMap((hunk) => hunk.lines);
  return (
    flattened.length <= MAX_PATCH_TOTAL_CHARS &&
    flattened.reduce((acc, line) => acc + line.length, 0) <= REMOTE_RESULT_TEXT_CAP
  );
}
//@ chunk-5vfqv7sk.js:27943-28350 placement (2.1.88 match: computeGutterWidth, 0.843)
function isValidPatchHunk(patch) {
  if (typeof patch !== "object" || patch === null) return false;
  let { oldStart, oldLines, newStart, newLines, lines } = patch;
  if (
    ![oldStart, oldLines, newStart, newLines].every(
      (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0,
    ) ||
    !Array.isArray(lines) ||
    !lines.every(
      (line) =>
        typeof line === "string" &&
        /^[ +\\-][^\x00-\x08\x0A-\x1F\x7F-\x9F\p{Cf}\p{Cs}\p{Zl}\p{Zp}]*\r?$/u.test(line),
    )
  )
    return false;
  let countLines = (prefixes) => countWhere(lines, (line) => prefixes.includes(line[0]));
  return countLines(" -") === oldLines && countLines(" +") === newLines;
}
//@ chunk-5vfqv7sk.js:28350-28429 placement
function machineIdentity(host) {
  let lease = leaseOfMachine(host);
  return {
    name: lease.name,
    working_dir: cleanWorkingDir(lease.working_dir),
  };
}
//@ chunk-5vfqv7sk.js:28429-28464 placement
function cleanWorkingDir(workingDir) {
  return sanitizeForPrompt(workingDir).trim();
}
//@ chunk-5vfqv7sk.js:28464-28530 placement
function sanitizeForPrompt(text, maxChars) {
  return normalizeMcpServerName(text, maxChars)
    .replace(OPEN_BRACKETS_RE, "(")
    .replace(CLOSE_BRACKETS_RE, ")");
}
//@ chunk-5vfqv7sk.js:28530-28696 placement
function interruptedResult(host, { askLater = false, withdrawnAtAsk = false } = {}) {
  return {
    kind: "error",
    code: "interrupted",
    message: INTERRUPT_MESSAGE_FOR_TOOL_USE,
    host,
    ...(askLater && {
      open: "interrupted",
    }),
    ...(withdrawnAtAsk && {
      withdrawnAtAsk: true,
    }),
  };
}
//@ chunk-5vfqv7sk.js:28696-28768 placement
function cancelledResult(host) {
  return {
    kind: "error",
    code: "cancelled",
    message: CANCEL_MESSAGE,
    host,
  };
}
//@ chunk-5vfqv7sk.js:28768-28901 placement
/**
 * 生成远程调用被用户拒绝时的消息（子代理与主线程措辞不同，可带拒绝原因）。
 */
function remoteRejectMessage(agentId, reason) {
  if (agentId !== undefined)
    return reason !== undefined && reason.trim() !== ""
      ? `${SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX}${reason}`
      : SUBAGENT_REJECT_MESSAGE;
  return withMemoryCorrectionHint(
    reason !== undefined && reason.trim() !== ""
      ? `${REJECT_MESSAGE_WITH_REASON_PREFIX}${reason}`
      : REJECT_MESSAGE,
  );
}
//@ chunk-5vfqv7sk.js:28901-29000 placement
function contentToText(content) {
  return typeof content === "string"
    ? content
    : content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(`
`);
}
export {
  formatHostNotes,
  REMOTE_RESULT_TEXT_CAP,
  MAX_REMOTE_IMAGE_BYTES,
  MAX_REMOTE_CONTENT_BLOCKS,
  contentToText,
  sanitizeForPrompt,
  isHostAwayRecheckable,
  machineIdentity,
  hostAnnouncesReturnCap,
  convertRemoteToolResult,
  interruptedResult,
  cancelledResult,
  remoteRejectMessage,
  MAX_MACHINE_MESSAGE_CHARS,
};
