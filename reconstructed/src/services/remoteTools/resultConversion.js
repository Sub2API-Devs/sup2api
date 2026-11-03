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
import { t5r } from "../../utils/mcpOutputStorage.js";
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
import { FL } from "../../tools/shared/textSearchTools.js";
import { LKt, Wti } from "./backgroundCommands.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { vMe } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { Elr } from "../../remote/tools/protocolSchemas.js";
import { Do } from "../../utils/git/gitSafeEnv.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { count } from "../../utils/collections.js";
import { Nrn } from "./lease.js";
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
  return e.source === "session" && e.description?.capabilities?.includes(CAP_ANNOUNCES_RETURN) === !0;
}
//@ chunk-qmsrnapp.js:41085-41186 placement
function isHostAwayRecheckable(e) {
  return (
    isAwayRecheckOnCached() &&
    e.transport.isAway?.() === !0 &&
    (hostAnnouncesReturnCap(e) || e.transport.isRechecked?.() === !0)
  );
}
//@ chunk-qmsrnapp.js:41186-41232 placement
var REMOTE_RESULT_TEXT_CAP = 262144,
  fgo = 8388608,
  wn = 8388608,
  CTr = 100;
//@ chunk-qmsrnapp.js:41232-41321 placement
function capTextContent(e) {
  let n = capRemoteContent(e);
  return { content: n.content, truncated: !1, ...(n.cut && { cutHere: !0 }) };
}
//@ chunk-qmsrnapp.js:41321-42048 placement
function capRemoteContent(e) {
  if (typeof e === "string")
    return e.length > REMOTE_RESULT_TEXT_CAP
      ? { content: truncateToLength(e, REMOTE_RESULT_TEXT_CAP), cut: !0 }
      : { content: e, cut: !1 };
  let { blocks: blocks, cut: cut } = e.slice(0, CTr).reduce(
    (r, s) => {
      if (s.type === "text") {
        let i = truncateToLength(s.text, Math.max(0, r.text));
        if (i.trim() !== "") r.blocks.push({ ...s, text: i });
        return { ...r, text: r.text - i.length, cut: r.cut || i.length < s.text.length };
      }
      if (s.type === "image") {
        let i = s.source.type === "base64" ? s.source.data.length : void 0;
        if (i !== void 0 && i <= r.image) return (r.blocks.push(s), { ...r, image: r.image - i });
        return (
          r.blocks.push({
            type: "text",
            text: "(an image in the answer was dropped: too large, or not sent inline)",
          }),
          { ...r, cut: !0 }
        );
      }
      return (r.blocks.push(s), r);
    },
    { blocks: [], text: REMOTE_RESULT_TEXT_CAP, image: fgo, cut: e.length > CTr },
  );
  return { content: cut || blocks.length !== e.length ? blocks : e, cut: cut };
}
//@ chunk-qmsrnapp.js:42048-42111 placement
function isPlaceholderTextBlock(e) {
  return e?.type === "text" && e.text.startsWith(vlr);
}
//@ chunk-qmsrnapp.js:42111-42173 placement = base64URLEncode (1)
function base64URLEncode(buffer) {
  return t5r(Buffer.from(buffer.slice(0, 8), "base64"));
}
//@ chunk-qmsrnapp.js:42173-42619 placement
function placeDocumentAttachments(e, n) {
  if (n === void 0 || n.length === 0 || typeof e === "string") return e;
  let { placed: placed } = n.reduce(
    (r, s) =>
      s.data.length <= r.remaining &&
      base64URLEncode(s.data) &&
      isPlaceholderTextBlock(e[s.at]) &&
      !r.placed.has(s.at)
        ? { placed: new Map([...r.placed, [s.at, s]]), remaining: r.remaining - s.data.length }
        : r,
    { placed: new Map(), remaining: wn },
  );
  if (placed.size === 0) return e;
  return e.map((r, s) => {
    let i = placed.get(s);
    return i === void 0
      ? r
      : { type: "document", source: { type: "base64", media_type: i.media_type, data: i.data } };
  });
}
//@ chunk-qmsrnapp.js:42619-43030 placement
function capStructuredOutput(e) {
  if (typeof e !== "object" || e === null) return { output: e, truncated: !1 };
  let { entries: entries, cut: cut } = Object.entries(e).reduce(
    (r, [s, i]) => {
      if (typeof i !== "string") return (r.entries.push([s, i]), r);
      let u = truncateToLength(i, Math.max(0, r.remaining));
      return (
        r.entries.push([s, u]),
        { ...r, remaining: r.remaining - u.length, cut: r.cut || u.length < i.length }
      );
    },
    { entries: [], remaining: REMOTE_RESULT_TEXT_CAP, cut: !1 },
  );
  return { output: cut ? Object.fromEntries(entries) : e, truncated: cut };
}
//@ chunk-qmsrnapp.js:43030-43101 placement
function failureSide(e) {
  return e.machineNotAnswering === !0 ? "machine" : "this_side";
}
/**
 * 把远程机器返回的工具结果转为本地 tool_result：处理 refused/failed/error/transport_error/completed，截断大输出，附加"在哪台机器运行"说明。
 */
//@ chunk-qmsrnapp.js:43101-45249 placement
function convertRemoteToolResult(e, n, o, { afterReconnect: r = !1, call: s } = {}) {
  let i = machineIdentity(n),
    u = n.name;
  switch (o.kind) {
    case "result":
      if (o.envelope !== void 0)
        return {
          outcome: convertCompletedResult(e, n, o.envelope, { afterReconnect: r, ...{}, call: s }),
          responseBytes: o.responseBytes,
          metaCopy: o.metaCopy,
          refusalCode: o.envelope.outcome === "refused" ? o.envelope.code : void 0,
          failureCode: o.envelope.outcome === "failed" ? o.envelope.code : void 0,
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
          isError: !1,
          output: void 0,
          patchRefused: !1,
          disposition: void 0,
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
            n.transport.kind === "session"
              ? unreachableCallMessage(u, o.detail, failureSide(o), isHostAwayRecheckable(n), {
                  cause: o.saidAsleep
                    ? "asleep"
                    : o.signedOff
                      ? "signed_off"
                      : o.saidBusy
                        ? "busy"
                        : o.lastHeardAt !== void 0
                          ? "silent"
                          : void 0,
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
            n.transport.kind === "session" ? approvalNotVerifiedMessage(u) : unverifiedApprovalMessage(u),
          host: i,
        },
      };
    case "timed_out":
      return {
        outcome: {
          kind: "error",
          code: "timed_out",
          message: callTimedOutMessage({ name: u, capMs: o.capMs }),
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
              ? livenessCheckNotSentMessage({ name: u, capMs: o.capMs })
              : o.takenBack
                ? nothingRanSendTimeoutMessage({ name: u, capMs: o.capMs })
                : sendTimedOutMessage({ name: u, capMs: o.capMs }),
          ...(o.request !== "probe" && !o.takenBack && { open: "stalled" }),
          host: i,
        },
      };
    case "host_gone":
      return {
        outcome: {
          kind: "error",
          code: o.why === "withdrawn" ? "host_withdrawn" : "host_gone",
          message: interruptedCallMessage({ name: u, why: o.why, unsent: o.unsent }),
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
      return { outcome: interruptedResult(i) };
    case "transport_error":
      return {
        outcome: {
          kind: "error",
          code: "transport_error",
          message:
            o.unreadableResult === !0
              ? unreadableResultMessage(u)
              : failedInTransitMessage({ name: u, detail: sanitizeForPrompt(o.detail) }),
          host: i,
          ...(o.unreadableResult === !0 && { unreadableResult: !0 }),
        },
      };
  }
}
//@ chunk-qmsrnapp.js:45249-45266 placement
var NOTE_CHAR_CAP = 2000,
  $e = 8;
//@ chunk-qmsrnapp.js:45266-45411 placement
function formatHostNotes(e, n) {
  let mapped = e.slice(0, $e).map((r) => `[note from ${n}] ${sanitizeForPrompt(r, NOTE_CHAR_CAP)}`);
  return e.length > $e ? [...mapped, `(${e.length - $e} more notes omitted)`] : mapped;
}
//@ chunk-qmsrnapp.js:45411-45424 placement
var Hen = 2000;
//@ chunk-qmsrnapp.js:45424-45614 placement
function unreadableResultMessage(e) {
  return `${e} answered in a result format this session cannot read (Claude Code version mismatch?); the command probably ran there \u2014 check its effect before repeating it.`;
}
//@ chunk-qmsrnapp.js:45614-45840 placement
function answeredWithErrorMessage({ name: e, detail: detail }) {
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
function convertCompletedResult(e, n, o, r = {}) {
  let { afterReconnect: afterReconnect = !1, call: i } = r,
    u = void 0,
    h = { name: n.name, working_dir: cleanWorkingDir(o.target.working_dir) },
    p = (_) =>
      (o.outcome === "refused" || o.outcome === "failed") && o.notes !== void 0 && o.notes.length > 0
        ? [_, ...formatHostNotes(o.notes, n.name)].join(`
`)
        : _,
    y =
      o.outcome !== "refused" && o.outcome !== "failed"
        ? ""
        : afterReconnect
          ? ` ${deliveredAfterReconnectNote(o.outcome)}`
          : o.replayed === !0
            ? ` ${replayedOutcomeNote(o.served_at, o.outcome)}`
            : "";
  switch (o.outcome) {
    case "completed": {
      let _ = capRemoteContent(
          e.name === FILE_READ_TOOL_NAME ? placeDocumentAttachments(o.content, o.documents) : o.content,
        ),
        S = convertRemoteOutput(e, o, i),
        k = FL(e) && LKt(n) && n.servedTools.has(TASKSTOP) ? vMe(o.output, "backgroundTaskId") : void 0,
        E = FL(e) ? capStructuredOutput(S.output) : { output: S.output, truncated: !1 };
      return {
        kind: "completed",
        host: h,
        spelledDirectory: displayWorkingDir(o.target.working_dir, n.description?.home_dir),
        content: _.content,
        truncated: o.truncated === !0,
        ...((_.cut || E.truncated) && { cutHere: !0 }),
        isError: o.is_error,
        ...(E.output === void 0 ? { output: void 0, patchRefused: S.patchRefused } : { output: E.output }),
        hostLocal: S.hostLocal,
        ...(S.spilledBytes !== void 0 && { spilled: { bytes: S.spilledBytes } }),
        ...(typeof k === "string" && Wti.test(k) && { backgroundTaskId: k }),
        disposition: o.disposition,
        notes: o.notes ?? [],
        envelope: "present",
        delivery: afterReconnect ? "after_reconnect" : o.replayed === !0 ? "replayed" : "fresh",
        ...(o.served_at !== void 0 && { servedAt: o.served_at }),
        ...{},
      };
    }
    case "refused": {
      if (o.code === "no_approval")
        return {
          kind: "error",
          code: "approval_unverified",
          message: p(`${unverifiedApprovalMessage(n.name)}${y}`),
          host: h,
        };
      let _ = n.transport.kind === "session" ? refusedDidNotRunLine : refusedByMachineLine;
      return {
        kind: "error",
        code: "refused_by_host",
        message: p(`${_({ name: n.name, message: sanitizeForPrompt(o.message, Hen) })}${y}`),
        host: h,
      };
    }
    case "failed":
      return {
        kind: "error",
        code: "failed_on_host",
        message: p(
          `${failedOnMachineLine({ name: n.name, message: sanitizeForPrompt(o.message, Hen) })}${y}`,
        ),
        host: h,
      };
    case "in_progress":
      return {
        kind: "error",
        code: "still_running",
        message: stillRunningMessage({ name: n.name, state: o.state, cause: "unasked" }),
        host: h,
        open: o.state === "running" ? "still_running" : "delivery_unknown",
      };
    case "needs_approval":
      return {
        kind: "error",
        code: "refused_by_host",
        message: refusedByMachineLine({ name: n.name, message: sanitizeForPrompt(o.message, Hen) }),
        host: h,
      };
    case "acknowledged":
      return {
        kind: "error",
        code: "refused_by_host",
        message: refusedByMachineLine({
          name: n.name,
          message: "the machine acknowledged a decision for a call this session did not ask about",
        }),
        host: h,
      };
  }
}
/**
 * 把远程机器返回的结构化输出转换为本地工具输出：只保留白名单字段，Edit/Write 用本地输入重建 patch 输出并按 schema 校验；记录只在远端存在的输出（落盘文件、后台任务）与溢出字节。
 */
//@ chunk-qmsrnapp.js:48097-48978 placement
function convertRemoteOutput(tool, result, call) {
  let output = result.output;
  if (output === void 0 || output === null || typeof output !== "object")
    return { output: void 0, hostLocal: [], spilledBytes: void 0, patchRefused: !1 };
  let keys = Object.keys(output),
    i = FL(tool) ? Reflect.get(output, SPILLEDOUTPUTBYTES) : void 0,
    u = typeof i === "number" && Number.isSafeInteger(i) && i > 0 ? i : void 0,
    h = [
      ...(keys.includes("persistedOutputPath") ? ["saved_output_file"] : []),
      ...(keys.includes("backgroundTaskId") ? ["background_task"] : []),
    ];
  if (keys.some((k) => REMOTE_ONLY_RESULT_KEYS.has(k)) || Reflect.get(output, "isImage") === !0)
    return { output: void 0, hostLocal: h, spilledBytes: u, patchRefused: !1 };
  let p = Elr.get(tool.name);
  if (p === void 0) return { output: void 0, hostLocal: h, spilledBytes: u, patchRefused: !1 };
  let y = Do(output, (k, E) => p.has(E)),
    _ = FL(tool)
      ? y
      : result.is_error || result.truncated === !0
        ? void 0
        : rebuildFileToolOutput(tool.name, y, call),
    S = _ === void 0 ? void 0 : tool.outputSchema?.safeParse(_);
  return {
    output: S?.success ? S.data : void 0,
    hostLocal: h,
    spilledBytes: u,
    patchRefused: y.structuredPatch !== void 0 && !isRenderablePatchList(y.structuredPatch),
  };
}
//@ chunk-qmsrnapp.js:48978-48997 placement
var Mn = 200,
  Nn = 5000;
/**
 * 由远程 Edit/Write 结果与本地输入重建文件工具的输出对象（含 patch 与暂存标记）。
 */
//@ chunk-qmsrnapp.js:48997-49645 placement
function rebuildFileToolOutput(toolName, output, call) {
  if (call === void 0 || !isRenderablePatchList(output.structuredPatch)) return;
  let file_path = call.input.file_path;
  if (typeof file_path !== "string") return;
  let stagedFields = output.staged === !0 && { staged: !0, stagedWording: output.stagedWording };
  if (toolName === FILE_EDIT_TOOL_NAME)
    return {
      filePath: file_path,
      oldString: call.input.old_string,
      newString: call.input.new_string,
      replaceAll: call.input.replace_all === !0,
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
      filePath: file_path,
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
function isRenderablePatchList(e) {
  if (!Array.isArray(e) || e.length > Mn) return !1;
  if (!e.every(isValidPatchHunk)) return !1;
  let flattened = e.flatMap((o) => o.lines);
  return flattened.length <= Nn && flattened.reduce((o, r) => o + r.length, 0) <= REMOTE_RESULT_TEXT_CAP;
}
//@ chunk-qmsrnapp.js:49814-50221 placement = computeGutterWidth (0.842)
function isValidPatchHunk(patch) {
  if (typeof patch !== "object" || patch === null) return !1;
  let {
    oldStart: oldStart,
    oldLines: oldLines,
    newStart: newStart,
    newLines: newLines,
    lines: lines,
  } = patch;
  if (
    ![oldStart, oldLines, newStart, newLines].every(
      (h) => typeof h === "number" && Number.isSafeInteger(h) && h >= 0,
    ) ||
    !Array.isArray(lines) ||
    !lines.every(
      (h) =>
        typeof h === "string" &&
        /^[ +\\-][^\x00-\x08\x0A-\x1F\x7F-\x9F\p{Cf}\p{Cs}\p{Zl}\p{Zp}]*\r?$/u.test(h),
    )
  )
    return !1;
  let u = (h) => count(lines, (p) => h.includes(p[0]));
  return u(" -") === oldLines && u(" +") === newLines;
}
//@ chunk-qmsrnapp.js:50221-50300 placement
function machineIdentity(e) {
  let n = Nrn(e);
  return { name: n.name, working_dir: cleanWorkingDir(n.working_dir) };
}
//@ chunk-qmsrnapp.js:50300-50335 placement
function cleanWorkingDir(e) {
  return sanitizeForPrompt(e).trim();
}
//@ chunk-qmsrnapp.js:50335-50401 placement
function sanitizeForPrompt(e, n) {
  return normalizeMcpServerName(e, n).replace(OPEN_BRACKETS_RE, "(").replace(CLOSE_BRACKETS_RE, ")");
}
//@ chunk-qmsrnapp.js:50401-50567 placement
function interruptedResult(e, { askLater: n = !1, withdrawnAtAsk: o = !1 } = {}) {
  return {
    kind: "error",
    code: "interrupted",
    message: INTERRUPT_MESSAGE_FOR_TOOL_USE,
    host: e,
    ...(n && { open: "interrupted" }),
    ...(o && { withdrawnAtAsk: !0 }),
  };
}
//@ chunk-qmsrnapp.js:50567-50639 placement
function cancelledResult(e) {
  return { kind: "error", code: "cancelled", message: CANCEL_MESSAGE, host: e };
}
/**
 * 生成远程调用被用户拒绝时的消息（子代理与主线程措辞不同，可带拒绝原因）。
 */
//@ chunk-qmsrnapp.js:50639-50772 placement
function remoteRejectMessage(e, n) {
  if (e !== void 0)
    return n !== void 0 && n.trim() !== ""
      ? `${SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX}${n}`
      : SUBAGENT_REJECT_MESSAGE;
  return withMemoryCorrectionHint(
    n !== void 0 && n.trim() !== "" ? `${REJECT_MESSAGE_WITH_REASON_PREFIX}${n}` : REJECT_MESSAGE,
  );
}
//@ chunk-qmsrnapp.js:50772-50871 placement
function contentToText(e) {
  return typeof e === "string"
    ? e
    : e.flatMap((n) => (n.type === "text" ? [n.text] : [])).join(`
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
  Hen,
  formatHostNotes,
  REMOTE_RESULT_TEXT_CAP,
  fgo,
  CTr,
  contentToText,
  hostAnnouncesReturnCap,
};
