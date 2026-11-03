/**
 * services/remoteTools/resultConversion.ts
 *
 * 2.1.316 新增：把远程机器的工具结果转为本地 tool_result：拒绝/失败处理、内容限长、文档附件放置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qmsrnapp.js (31)
 * attribution: placement 31
 */
import { isAwayRecheckOnCached } from "./awayRecheckFlag.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { vlr } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
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
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { isNonMcpShellTool } from "../../tools/shared/textSearchTools.js";
import { supportsBackgroundShells, AGENT_ID_REGEX } from "./backgroundCommands.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { vMe } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { KEPT_RESULT_FIELDS_BY_TOOL } from "../../remote/tools/protocolSchemas.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { count } from "../../utils/collections.js";
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

//@ chunk-qmsrnapp.js:40968-40994 placement
var CAP_ANNOUNCES_RETURN = "announces_return";
//@ chunk-qmsrnapp.js:40994-41085 placement
function hostAnnouncesReturnCap(e) {
  return e.source === "session" && e.description?.capabilities?.includes(CAP_ANNOUNCES_RETURN) === true;
}
//@ chunk-qmsrnapp.js:41085-41186 placement
function isHostAwayRecheckable(host) {
  return (
    isAwayRecheckOnCached() &&
    host.transport.isAway?.() === true &&
    (hostAnnouncesReturnCap(host) || host.transport.isRechecked?.() === true)
  );
}
//@ chunk-qmsrnapp.js:41186-41232 placement
/**
 * 远程结果转本地结果时的内容上限：文本总字符、单张图片字节、内容块条数与该类的总字节。
 */
var REMOTE_RESULT_TEXT_CAP = 262144;
var MAX_REMOTE_IMAGE_BYTES = 8388608;
var MAX_PLACED_ATTACHMENT_BYTES = 8388608;
var MAX_REMOTE_CONTENT_BLOCKS = 100;
//@ chunk-qmsrnapp.js:41232-41321 placement
function capTextContent(content) {
  let n = capRemoteContent(content);
  return {
    content: n.content,
    truncated: false,
    ...(n.cut && {
      cutHere: true,
    }),
  };
}
//@ chunk-qmsrnapp.js:41321-42048 placement
function capRemoteContent(e) {
  if (typeof e === "string")
    return e.length > REMOTE_RESULT_TEXT_CAP
      ? {
          content: truncateToLength(e, REMOTE_RESULT_TEXT_CAP),
          cut: true,
        }
      : {
          content: e,
          cut: false,
        };
  let { blocks, cut } = e.slice(0, MAX_REMOTE_CONTENT_BLOCKS).reduce(
    (acc, s) => {
      if (s.type === "text") {
        let i = truncateToLength(s.text, Math.max(0, acc.text));
        if (i.trim() !== "")
          acc.blocks.push({
            ...s,
            text: i,
          });
        return {
          ...acc,
          text: acc.text - i.length,
          cut: acc.cut || i.length < s.text.length,
        };
      }
      if (s.type === "image") {
        let i = s.source.type === "base64" ? s.source.data.length : undefined;
        if (i !== undefined && i <= acc.image) {
          acc.blocks.push(s);
          return {
            ...acc,
            image: acc.image - i,
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
      acc.blocks.push(s);
      return acc;
    },
    {
      blocks: [],
      text: REMOTE_RESULT_TEXT_CAP,
      image: MAX_REMOTE_IMAGE_BYTES,
      cut: e.length > MAX_REMOTE_CONTENT_BLOCKS,
    },
  );
  return {
    content: cut || blocks.length !== e.length ? blocks : e,
    cut,
  };
}
//@ chunk-qmsrnapp.js:42048-42111 placement
function isPlaceholderTextBlock(e) {
  return e?.type === "text" && e.text.startsWith(vlr);
}
//@ chunk-qmsrnapp.js:42111-42173 placement = base64URLEncode (1)
function base64URLEncode(buffer) {
  return hasBufferPrefix(Buffer.from(buffer.slice(0, 8), "base64"));
}
//@ chunk-qmsrnapp.js:42173-42619 placement
function placeDocumentAttachments(content, documents) {
  if (documents === undefined || documents.length === 0 || typeof content === "string") return content;
  let { placed } = documents.reduce(
    (acc, s) =>
      s.data.length <= acc.remaining &&
      base64URLEncode(s.data) &&
      isPlaceholderTextBlock(content[s.at]) &&
      !acc.placed.has(s.at)
        ? {
            placed: new Map([...acc.placed, [s.at, s]]),
            remaining: acc.remaining - s.data.length,
          }
        : acc,
    {
      placed: new Map(),
      remaining: MAX_PLACED_ATTACHMENT_BYTES,
    },
  );
  if (placed.size === 0) return content;
  return content.map((r, s) => {
    let i = placed.get(s);
    return i === undefined
      ? r
      : {
          type: "document",
          source: {
            type: "base64",
            media_type: i.media_type,
            data: i.data,
          },
        };
  });
}
//@ chunk-qmsrnapp.js:42619-43030 placement
function capStructuredOutput(output) {
  if (typeof output !== "object" || output === null)
    return {
      output,
      truncated: false,
    };
  let { entries, cut } = Object.entries(output).reduce(
    (acc, [s, i]) => {
      if (typeof i !== "string") {
        acc.entries.push([s, i]);
        return acc;
      }
      let u = truncateToLength(i, Math.max(0, acc.remaining));
      acc.entries.push([s, u]);
      return {
        ...acc,
        remaining: acc.remaining - u.length,
        cut: acc.cut || u.length < i.length,
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
//@ chunk-qmsrnapp.js:43030-43101 placement
function failureSide(e) {
  return e.machineNotAnswering === true ? "machine" : "this_side";
}
//@ chunk-qmsrnapp.js:43101-45249 placement
/**
 * 把远程机器返回的工具结果转为本地 tool_result：处理 refused/failed/error/transport_error/completed，截断大输出，附加"在哪台机器运行"说明。
 */
function convertRemoteToolResult(tool, host, o, { afterReconnect: r = false, call: s } = {}) {
  let i = machineIdentity(host);
  let u = host.name;
  switch (o.kind) {
    case "result":
      if (o.envelope !== undefined)
        return {
          outcome: convertCompletedResult(tool, host, o.envelope, {
            afterReconnect: r,
            ...{},
            call: s,
          }),
          responseBytes: o.responseBytes,
          metaCopy: o.metaCopy,
          refusalCode: o.envelope.outcome === "refused" ? o.envelope.code : undefined,
          failureCode: o.envelope.outcome === "failed" ? o.envelope.code : undefined,
        };
      if (o.isError)
        return {
          outcome: {
            kind: "error",
            code: "transport_error",
            message: answeredWithErrorMessage({
              name: u,
              detail: sanitizeForPrompt(contentToText(o.content)),
            }),
            host: i,
          },
          responseBytes: o.responseBytes,
        };
      return {
        outcome: {
          kind: "completed",
          host: i,
          spelledDirectory: "",
          ...capTextContent(o.content),
          isError: false,
          output: undefined,
          patchRefused: false,
          disposition: undefined,
          notes: [],
          hostLocal: [],
          envelope: "missing",
          delivery: "fresh",
        },
        responseBytes: o.responseBytes,
      };
    case "unreachable":
      return {
        outcome: {
          kind: "error",
          code: "unreachable",
          message:
            host.transport.kind === "session"
              ? unreachableCallMessage(u, o.detail, failureSide(o), isHostAwayRecheckable(host), {
                  cause: o.saidAsleep
                    ? "asleep"
                    : o.signedOff
                      ? "signed_off"
                      : o.saidBusy
                        ? "busy"
                        : o.lastHeardAt !== undefined
                          ? "silent"
                          : undefined,
                  lastHeardAt: o.lastHeardAt,
                  leftFor: o.leftFor,
                })
              : notAnsweringMessage(u, failureSide(o)),
          host: i,
        },
      };
    case "approval_unverified":
      return {
        outcome: {
          kind: "error",
          code: "approval_unverified",
          message:
            host.transport.kind === "session" ? approvalNotVerifiedMessage(u) : unverifiedApprovalMessage(u),
          host: i,
        },
      };
    case "timed_out":
      return {
        outcome: {
          kind: "error",
          code: "timed_out",
          message: callTimedOutMessage({
            name: u,
            capMs: o.capMs,
          }),
          host: i,
          open: "timed_out",
        },
      };
    case "stalled":
      return {
        outcome: {
          kind: "error",
          code: o.takenBack ? "stalled_unsent" : "stalled",
          message:
            o.request === "probe"
              ? livenessCheckNotSentMessage({
                  name: u,
                  capMs: o.capMs,
                })
              : o.takenBack
                ? nothingRanSendTimeoutMessage({
                    name: u,
                    capMs: o.capMs,
                  })
                : sendTimedOutMessage({
                    name: u,
                    capMs: o.capMs,
                  }),
          ...(o.request !== "probe" &&
            !o.takenBack && {
              open: "stalled",
            }),
          host: i,
        },
      };
    case "host_gone":
      return {
        outcome: {
          kind: "error",
          code: o.why === "withdrawn" ? "host_withdrawn" : "host_gone",
          message: interruptedCallMessage({
            name: u,
            why: o.why,
            unsent: o.unsent,
          }),
          host: i,
        },
      };
    case "dropped":
      return {
        outcome: {
          kind: "error",
          code: "dropped",
          message: isUnverifiedRefusal(o)
            ? unverifiedRefusalMessage(u)
            : o.why === "write_unresolved"
              ? maybeReachedMessage(u)
              : disconnectedDuringCallMessage(u),
          host: i,
          open: "delivery_unknown",
        },
      };
    case "cancelled":
      return {
        outcome: interruptedResult(i),
      };
    case "transport_error":
      return {
        outcome: {
          kind: "error",
          code: "transport_error",
          message:
            o.unreadableResult === true
              ? unreadableResultMessage(u)
              : failedInTransitMessage({
                  name: u,
                  detail: sanitizeForPrompt(o.detail),
                }),
          host: i,
          ...(o.unreadableResult === true && {
            unreadableResult: true,
          }),
        },
      };
  }
}
//@ chunk-qmsrnapp.js:45249-45266 placement
/**
 * 备注类文本的常量：单条备注字符上限与附带备注条数上限。
 */
var NOTE_CHAR_CAP = 2000;
var MAX_REMOTE_NOTES = 8;
//@ chunk-qmsrnapp.js:45266-45411 placement
function formatHostNotes(notes, name) {
  let mapped = notes
    .slice(0, MAX_REMOTE_NOTES)
    .map((r) => `[note from ${name}] ${sanitizeForPrompt(r, NOTE_CHAR_CAP)}`);
  return notes.length > MAX_REMOTE_NOTES
    ? [...mapped, `(${notes.length - MAX_REMOTE_NOTES} more notes omitted)`]
    : mapped;
}
//@ chunk-qmsrnapp.js:45411-45424 placement
/**
 * 机器消息的字符上限。
 */
var MAX_MACHINE_MESSAGE_CHARS = 2000;
//@ chunk-qmsrnapp.js:45424-45614 placement
function unreadableResultMessage(e) {
  return `${e} answered in a result format this session cannot read (Claude Code version mismatch?); the command probably ran there \u2014 check its effect before repeating it.`;
}
//@ chunk-qmsrnapp.js:45614-45840 placement
function answeredWithErrorMessage({ name: e, detail }) {
  return `The connection to ${e} answered with an error: ${detail} \u2014 ${e}'s Claude Code did not report running the call; whether it ran there is not known, so check its effect before repeating it.`;
}
//@ chunk-qmsrnapp.js:45840-45978 placement
var REMOTE_ONLY_RESULT_KEYS = new Set([
  "backgroundTaskId",
  "backgroundedByUser",
  "persistedOutputPath",
  "persistedOutputSize",
  "rawOutputPath",
  "structuredContent",
]);
//@ chunk-qmsrnapp.js:45978-48097 placement
function convertCompletedResult(tool, n, result, r = {}) {
  let { afterReconnect = false, call: i } = r;
  let u = undefined;
  let host = {
    name: n.name,
    working_dir: cleanWorkingDir(result.target.working_dir),
  };
  let p = (_) =>
    (result.outcome === "refused" || result.outcome === "failed") &&
    result.notes !== undefined &&
    result.notes.length > 0
      ? [_, ...formatHostNotes(result.notes, n.name)].join(`
`)
      : _;
  let y =
    result.outcome !== "refused" && result.outcome !== "failed"
      ? ""
      : afterReconnect
        ? ` ${deliveredAfterReconnectNote(result.outcome)}`
        : result.replayed === true
          ? ` ${replayedOutcomeNote(result.served_at, result.outcome)}`
          : "";
  switch (result.outcome) {
    case "completed": {
      let _ = capRemoteContent(
        tool.name === FILE_READ_TOOL_NAME
          ? placeDocumentAttachments(result.content, result.documents)
          : result.content,
      );
      let S = convertRemoteOutput(tool, result, i);
      let k =
        isNonMcpShellTool(tool) && supportsBackgroundShells(n) && n.servedTools.has(TASKSTOP)
          ? vMe(result.output, "backgroundTaskId")
          : undefined;
      let E = isNonMcpShellTool(tool)
        ? capStructuredOutput(S.output)
        : {
            output: S.output,
            truncated: false,
          };
      return {
        kind: "completed",
        host,
        spelledDirectory: displayWorkingDir(result.target.working_dir, n.description?.home_dir),
        content: _.content,
        truncated: result.truncated === true,
        ...((_.cut || E.truncated) && {
          cutHere: true,
        }),
        isError: result.is_error,
        ...(E.output === undefined
          ? {
              output: undefined,
              patchRefused: S.patchRefused,
            }
          : {
              output: E.output,
            }),
        hostLocal: S.hostLocal,
        ...(S.spilledBytes !== undefined && {
          spilled: {
            bytes: S.spilledBytes,
          },
        }),
        ...(typeof k === "string" &&
          AGENT_ID_REGEX.test(k) && {
            backgroundTaskId: k,
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
          message: p(`${unverifiedApprovalMessage(n.name)}${y}`),
          host,
        };
      let _ = n.transport.kind === "session" ? refusedDidNotRunLine : refusedByMachineLine;
      return {
        kind: "error",
        code: "refused_by_host",
        message: p(
          `${_({
            name: n.name,
            message: sanitizeForPrompt(result.message, MAX_MACHINE_MESSAGE_CHARS),
          })}${y}`,
        ),
        host,
      };
    }
    case "failed":
      return {
        kind: "error",
        code: "failed_on_host",
        message: p(
          `${failedOnMachineLine({
            name: n.name,
            message: sanitizeForPrompt(result.message, MAX_MACHINE_MESSAGE_CHARS),
          })}${y}`,
        ),
        host,
      };
    case "in_progress":
      return {
        kind: "error",
        code: "still_running",
        message: stillRunningMessage({
          name: n.name,
          state: result.state,
          cause: "unasked",
        }),
        host,
        open: result.state === "running" ? "still_running" : "delivery_unknown",
      };
    case "needs_approval":
      return {
        kind: "error",
        code: "refused_by_host",
        message: refusedByMachineLine({
          name: n.name,
          message: sanitizeForPrompt(result.message, MAX_MACHINE_MESSAGE_CHARS),
        }),
        host,
      };
    case "acknowledged":
      return {
        kind: "error",
        code: "refused_by_host",
        message: refusedByMachineLine({
          name: n.name,
          message: "the machine acknowledged a decision for a call this session did not ask about",
        }),
        host,
      };
  }
}
//@ chunk-qmsrnapp.js:48097-48978 placement
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
  let i = isNonMcpShellTool(tool) ? Reflect.get(output, SPILLEDOUTPUTBYTES) : undefined;
  let spilledBytes = typeof i === "number" && Number.isSafeInteger(i) && i > 0 ? i : undefined;
  let hostLocal = [
    ...(keys.includes("persistedOutputPath") ? ["saved_output_file"] : []),
    ...(keys.includes("backgroundTaskId") ? ["background_task"] : []),
  ];
  if (keys.some((k) => REMOTE_ONLY_RESULT_KEYS.has(k)) || Reflect.get(output, "isImage") === true)
    return {
      output: undefined,
      hostLocal,
      spilledBytes,
      patchRefused: false,
    };
  let p = KEPT_RESULT_FIELDS_BY_TOOL.get(tool.name);
  if (p === undefined)
    return {
      output: undefined,
      hostLocal,
      spilledBytes,
      patchRefused: false,
    };
  let output_2 = pickByHelper(output, (k, E) => p.has(E));
  let _ = isNonMcpShellTool(tool)
    ? output_2
    : result.is_error || result.truncated === true
      ? undefined
      : rebuildFileToolOutput(tool.name, output_2, call);
  let S = _ === undefined ? undefined : tool.outputSchema?.safeParse(_);
  return {
    output: S?.success ? S.data : undefined,
    hostLocal,
    spilledBytes,
    patchRefused: output_2.structuredPatch !== undefined && !isRenderablePatchList(output_2.structuredPatch),
  };
}
//@ chunk-qmsrnapp.js:48978-48997 placement
var MAX_PATCH_FILE_ENTRIES = 200;
var MAX_PATCH_TOTAL_CHARS = 5000;
//@ chunk-qmsrnapp.js:48997-49645 placement
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
  if (toolName === FILE_EDIT_TOOL_NAME)
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
//@ chunk-qmsrnapp.js:49645-49814 placement
function isRenderablePatchList(structuredPatch) {
  if (!Array.isArray(structuredPatch) || structuredPatch.length > MAX_PATCH_FILE_ENTRIES) return false;
  if (!structuredPatch.every(isValidPatchHunk)) return false;
  let flattened = structuredPatch.flatMap((o) => o.lines);
  return (
    flattened.length <= MAX_PATCH_TOTAL_CHARS &&
    flattened.reduce((acc, r) => acc + r.length, 0) <= REMOTE_RESULT_TEXT_CAP
  );
}
//@ chunk-qmsrnapp.js:49814-50221 placement = computeGutterWidth (0.842)
function isValidPatchHunk(patch) {
  if (typeof patch !== "object" || patch === null) return false;
  let { oldStart, oldLines, newStart, newLines, lines } = patch;
  if (
    ![oldStart, oldLines, newStart, newLines].every(
      (h) => typeof h === "number" && Number.isSafeInteger(h) && h >= 0,
    ) ||
    !Array.isArray(lines) ||
    !lines.every(
      (line) =>
        typeof line === "string" &&
        /^[ +\\-][^\x00-\x08\x0A-\x1F\x7F-\x9F\p{Cf}\p{Cs}\p{Zl}\p{Zp}]*\r?$/u.test(line),
    )
  )
    return false;
  let u = (h) => count(lines, (p) => h.includes(p[0]));
  return u(" -") === oldLines && u(" +") === newLines;
}
//@ chunk-qmsrnapp.js:50221-50300 placement
function machineIdentity(host) {
  let n = leaseOfMachine(host);
  return {
    name: n.name,
    working_dir: cleanWorkingDir(n.working_dir),
  };
}
//@ chunk-qmsrnapp.js:50300-50335 placement
function cleanWorkingDir(workingDir) {
  return sanitizeForPrompt(workingDir).trim();
}
//@ chunk-qmsrnapp.js:50335-50401 placement
function sanitizeForPrompt(e, n) {
  return normalizeMcpServerName(e, n).replace(OPEN_BRACKETS_RE, "(").replace(CLOSE_BRACKETS_RE, ")");
}
//@ chunk-qmsrnapp.js:50401-50567 placement
function interruptedResult(host, { askLater: n = false, withdrawnAtAsk: o = false } = {}) {
  return {
    kind: "error",
    code: "interrupted",
    message: INTERRUPT_MESSAGE_FOR_TOOL_USE,
    host,
    ...(n && {
      open: "interrupted",
    }),
    ...(o && {
      withdrawnAtAsk: true,
    }),
  };
}
//@ chunk-qmsrnapp.js:50567-50639 placement
function cancelledResult(host) {
  return {
    kind: "error",
    code: "cancelled",
    message: CANCEL_MESSAGE,
    host,
  };
}
//@ chunk-qmsrnapp.js:50639-50772 placement
/**
 * 生成远程调用被用户拒绝时的消息（子代理与主线程措辞不同，可带拒绝原因）。
 */
function remoteRejectMessage(agentId, n) {
  if (agentId !== undefined)
    return n !== undefined && n.trim() !== ""
      ? `${SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX}${n}`
      : SUBAGENT_REJECT_MESSAGE;
  return withMemoryCorrectionHint(
    n !== undefined && n.trim() !== "" ? `${REJECT_MESSAGE_WITH_REASON_PREFIX}${n}` : REJECT_MESSAGE,
  );
}
//@ chunk-qmsrnapp.js:50772-50871 placement
function contentToText(content) {
  return typeof content === "string"
    ? content
    : content.flatMap((n) => (n.type === "text" ? [n.text] : [])).join(`
`);
}
export {
  sanitizeForPrompt,
  convertRemoteToolResult,
  machineIdentity,
  isHostAwayRecheckable,
  interruptedResult,
  cancelledResult,
  remoteRejectMessage,
  MAX_MACHINE_MESSAGE_CHARS,
  formatHostNotes,
  REMOTE_RESULT_TEXT_CAP,
  MAX_REMOTE_IMAGE_BYTES,
  MAX_REMOTE_CONTENT_BLOCKS,
  contentToText,
  hostAnnouncesReturnCap,
};
