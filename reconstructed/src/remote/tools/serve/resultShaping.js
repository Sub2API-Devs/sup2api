/**
 * remote/tools/serve/resultShaping.ts
 *
 * 2.1.316 新增：服务端工具运行与结果整形（内容/文档拆分、图片块）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ad2e1aj6.js (20)
 * attribution: placement 20
 */
import {
  createAssistantMessage,
  normalizeAttachmentOrEmpty,
  unwrapSystemReminder,
} from "../../../utils/messages.js";
import {
  getOriginalCwd as getOriginalCwd_2,
  getToolResultFilePath,
  toolResultsDir,
} from "../../../utils/toolResultStorage.js";
import { runToolUse, hasTypeField } from "../../../services/tools/toolExecution.js";
import { QOs, xTe } from "../../../tools/shared/textSearchTools.js";
import { spillServedOutput, unreadableSpillNote } from "./outputSpill.js";
import { isPlainObject } from "./callStatusQuery.js";
import { iv, toRemoteToolContentBlocks } from "../callResults.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../protocolConstants.js";
import { xr } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { Elr, HXr, NPe } from "../protocolSchemas.js";
import { Do } from "../../../utils/git/gitSafeEnv.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import { GREP_TOOL_NAME } from "../../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../../tools/GlobTool/prompt.js";
import { n7o, vlr } from "../../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { formatFileSize } from "../../../utils/format.js";
import { truncateToLength } from "../../../utils/stringUtils.js";

//@ chunk-ad2e1aj6.js:22511-22525 placement
var Lr = 262144;
//@ chunk-ad2e1aj6.js:22525-22792 placement
function resultSizeLimitsFor(e) {
  switch (e) {
    case "session":
    case "relay":
      return { imageBase64Bytes: 1572864, documentBase64Bytes: 3380000 };
    case "bridge":
    case "direct":
      return { imageBase64Bytes: 1048576, documentBase64Bytes: 0 };
    default: {
      let n = e;
      return { imageBase64Bytes: 1048576, documentBase64Bytes: 0 };
    }
  }
}
//@ chunk-ad2e1aj6.js:22792-22812 placement
var Mr = 5000,
  Hr = 8000;
//@ chunk-ad2e1aj6.js:22812-23112 placement
function cancelledToolResult(e, n) {
  return {
    result: { type: "tool_result", tool_use_id: e, content: n, is_error: !0 },
    settledBeforeStop: !0,
    denialKind: void 0,
    denialRecorded: !1,
    output: void 0,
    ranToEnd: !1,
    extra: [],
    hookExtra: [],
    notes: [],
    heldHookNotes: 0,
    gateHookErrors: 0,
    localSpillPaths: [],
    localSpillDirs: [],
    servedShellToolName: void 0,
  };
}
/**
 * 在本机执行被云会话调用的工具（构造 assistant 消息、写工具结果文件、收集进度）。
 */
//@ chunk-ad2e1aj6.js:23112-24784 placement
async function runServedTool(e) {
  let n = createAssistantMessage({ content: [e.toolUse] }),
    s = getOriginalCwd_2(e.context.session),
    h = [getToolResultFilePath(s, e.toolUse.id, !1), getToolResultFilePath(s, e.toolUse.id, !0)],
    r = [s, toolResultsDir()],
    i = [],
    y = [],
    O = [],
    R = 0,
    w = 0,
    C,
    P = !1,
    x,
    Y = !1,
    F,
    D = !1;
  for await (let L of runToolUse(
    e.toolUse,
    n,
    e.canUseTool,
    {
      ...e.context,
      onPermissionDenial: () => {
        Y = !0;
      },
    },
    () => new Date().toISOString(),
  )) {
    if (hasTypeField(L)) continue;
    let { message: message } = L;
    if (message.type === "progress") {
      if (
        message.parentToolUseID === e.toolUse.id &&
        (message.data.type === "bash_progress" || message.data.type === "powershell_progress")
      )
        e.onShellProgress?.(message.data, { localSpillPaths: h, localSpillDirs: r });
      continue;
    }
    if (message.type === "attachment") {
      if (message.attachment.type === "read_truncation_notice") {
        let M = {
          type: "text",
          text: `${message.attachment.banner} ${readFurtherHint(e.servedShellToolName)}`,
        };
        i.push(M);
        continue;
      }
      if (!message.attachment.type.startsWith("hook_")) continue;
      if (
        message.attachment.type === "hook_non_blocking_error" &&
        message.attachment.hookEvent === "PreToolUse"
      )
        w++;
      if (message.attachment.type === "hook_system_message") {
        if (message.attachment.heldForServedCall === !0) (O.push(message.attachment.content), R++);
        continue;
      }
      for (let M of normalizeAttachmentOrEmpty(message.attachment)) {
        let Q = gt(M.message.content);
        (y.push(...Q),
          O.push(
            ...Q.flatMap((ee) => {
              let q = toTextBlock(ee)?.text;
              return q === void 0 ? [] : [unwrapSystemReminder(q)];
            }),
          ));
      }
      continue;
    }
    if (message.type !== "user") continue;
    for (let M of gt(message.message.content))
      if (M.type === "tool_result" && M.tool_use_id === e.toolUse.id) {
        ((C = M),
          (P = !e.stopSignal.aborted),
          (x = message.toolDenialKind),
          (D = didToolRunToCompletion(message.toolUseResult, M)),
          (F = pickReportedToolResultFields(e.toolUse.name, message.toolUseResult)));
        let Q = readPersistedOutputPath(F);
        if (Q !== void 0) h.push(Q);
      } else i.push(M);
  }
  return {
    result: C,
    settledBeforeStop: P,
    denialKind: x,
    denialRecorded: Y,
    output: F,
    ranToEnd: D,
    extra: i,
    hookExtra: y,
    notes: O,
    heldHookNotes: R,
    gateHookErrors: w,
    localSpillPaths: h,
    localSpillDirs: r,
    servedShellToolName: QOs(e.toolUse.name, e.servedShellToolName),
  };
}
//@ chunk-ad2e1aj6.js:24784-26012 placement
function shapeServedResult(e) {
  let { run: run } = e,
    s = {
      targetName: e.targetName,
      shellToolName: run.servedShellToolName,
      localSpillPaths: run.localSpillPaths,
      localSpillDirs: run.localSpillDirs,
      maxImageBytes: e.budget.imageBase64Bytes,
    },
    h = splitContentAndDocuments(
      [...gt(run.result.content), ...run.extra],
      e.targetName,
      e.budget.documentBase64Bytes,
    ),
    r = xTe(e.toolName) ? run.output : void 0,
    i = spillServedOutput({ content: h.content, output: r, ...s }),
    filtered = h.documents.filter((x) =>
      isSameTextBlock(typeof i.content === "string" ? void 0 : i.content[x.at], h.content[x.at]),
    ),
    O =
      run.hookExtra.length === 0
        ? i
        : spillServedOutput({
            content: splitContentAndDocuments(
              [...gt(run.result.content), ...run.extra, ...run.hookExtra],
              e.targetName,
              e.budget.documentBase64Bytes,
            ).content,
            output: void 0,
            ...s,
          }),
    R = r === void 0 ? mapStringsDeep(run.output, unreadableSpillNote(s)) : i.output,
    w = isPlainObject(R) && iv(R) <= Lr ? R : void 0,
    C =
      h.dropped ||
      filtered.length < h.documents.length ||
      i.truncated ||
      O.truncated ||
      (isPlainObject(i.output) && w === void 0);
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "completed",
      ...(e.callId !== void 0 && { call_id: e.callId }),
      target: e.target,
      is_error: run.result.is_error === !0,
      content: toRemoteToolContentBlocks(i.content),
      ...(filtered.length > 0 && { documents: filtered }),
      ...(w !== void 0 && { output: w }),
      ...(C && { truncated: !0 }),
      disposition: servedDisposition(e.permissionOutcome, run),
      ...buildResultNotes(run.notes, {
        targetName: e.targetName,
        shellToolName: run.servedShellToolName,
        localSpillPaths: run.localSpillPaths,
        localSpillDirs: run.localSpillDirs,
      }),
    },
    content: O.content,
    truncated: C,
  };
}
//@ chunk-ad2e1aj6.js:26012-26158 placement
function readPersistedOutputPath(e) {
  if (typeof e !== "object" || e === null) return;
  let n = Reflect.get(e, "persistedOutputPath");
  return typeof n === "string" && n.length > 0 ? n : void 0;
}
//@ chunk-ad2e1aj6.js:26158-26294 placement
function didToolRunToCompletion(e, n) {
  let s = typeof e === "object" && e !== null ? Reflect.get(e, "interrupted") : void 0;
  return typeof s === "boolean" ? !s : n.is_error !== !0;
}
//@ chunk-ad2e1aj6.js:26294-26392 placement
function gt(e) {
  if (e === void 0 || e === "") return [];
  return typeof e === "string" ? [{ type: "text", text: e }] : e;
}
//@ chunk-ad2e1aj6.js:26392-26536 placement
function mapStringsDeep(e, n) {
  if (typeof e === "string") return n(e);
  if (Array.isArray(e)) return e.map((s) => mapStringsDeep(s, n));
  if (isPlainObject(e)) return xr(e, (s) => mapStringsDeep(s, n));
  return e;
}
//@ chunk-ad2e1aj6.js:26536-26669 placement
function pickReportedToolResultFields(e, n) {
  let s = Elr.get(e);
  if (s === void 0 || n === void 0) return;
  if (xTe(e)) return n;
  if (!isPlainObject(n)) return;
  return Do(n, (h, r) => s.has(r));
}
//@ chunk-ad2e1aj6.js:26669-27041 placement
function readFurtherHint(e) {
  let n =
    e === void 0
      ? ""
      : e === POWERSHELL_TOOL_NAME
        ? `, else Select-String through ${e} there`
        : `, else grep through ${e} there`;
  return `(on that machine: read further with offset/limit and the same machine argument; to search it there, ${GREP_TOOL_NAME} with that argument if this session's ${GREP_TOOL_NAME} accepts one${n} \u2014 without the argument ${GREP_TOOL_NAME} and ${GLOB_TOOL_NAME} search only this session's own files)`;
}
//@ chunk-ad2e1aj6.js:27041-27926 placement
function splitContentAndDocuments(e, n, s) {
  return e.reduce(
    (h, r) => {
      let i = toTextBlock(r) ?? imageBlockOf(r);
      if (i !== void 0) return (h.content.push(i), h);
      let y = documentBlockOf(r);
      if (y !== void 0 && h.documents.length < n7o && y.data.length <= h.documentRemaining)
        return (
          h.documents.push({ at: h.content.length, ...y }),
          h.content.push({
            type: "text",
            text: `${vlr}${n}, ${formatFileSize(Math.floor((y.data.length * 3) / 4))}, came with this result but this session's Claude Code could not take it from another machine \u2014 an older version, most likely; read it by pages instead)`,
          }),
          { ...h, documentRemaining: h.documentRemaining - y.data.length }
        );
      return (
        h.content.push({
          type: "text",
          text:
            r.type === "image"
              ? `(an image referenced by URL was omitted on ${n})`
              : y !== void 0
                ? `(a PDF read on ${n} could not be returned with this result \u2014 read it by pages instead)`
                : `(a ${String(r.type)} block was omitted on ${n})`,
        }),
        { ...h, dropped: !0 }
      );
    },
    { content: [], documents: [], dropped: !1, documentRemaining: s },
  );
}
//@ chunk-ad2e1aj6.js:27926-28028 placement
function isSameTextBlock(e, n) {
  return e?.type === "text" && n?.type === "text" && typeof e.text === "string" && e.text === n.text;
}
//@ chunk-ad2e1aj6.js:28028-28326 placement
function documentBlockOf(e) {
  if (e.type !== "document") return;
  let n = Reflect.get(e, "source");
  if (typeof n !== "object" || n === null) return;
  let s = Reflect.get(n, "data");
  return Reflect.get(n, "type") === "base64" &&
    Reflect.get(n, "media_type") === "application/pdf" &&
    typeof s === "string"
    ? { media_type: "application/pdf", data: s }
    : void 0;
}
//@ chunk-ad2e1aj6.js:28326-28441 placement
function toTextBlock(e) {
  let n = Reflect.get(e, "text");
  return e.type === "text" && typeof n === "string" ? { type: "text", text: n } : void 0;
}
//@ chunk-ad2e1aj6.js:28441-28813 placement
function imageBlockOf(e) {
  if (e.type !== "image") return;
  let n = Reflect.get(e, "source");
  if (typeof n !== "object" || n === null) return;
  let s = Reflect.get(n, "type"),
    h = Reflect.get(n, "media_type"),
    r = Reflect.get(n, "data");
  return s === "base64" &&
    typeof r === "string" &&
    (h === "image/jpeg" || h === "image/png" || h === "image/gif" || h === "image/webp")
    ? { type: "image", source: { type: "base64", media_type: h, data: r } }
    : void 0;
}
//@ chunk-ad2e1aj6.js:28813-29072 placement
function servedDisposition(e, n) {
  if (e !== void 0) {
    if (e.kind === "allowed") return "ran";
    return e.kind === "stopped" ? "ask_expired" : e.kind;
  }
  if (n.denialKind !== void 0) return "hook_blocked";
  if (n.result?.is_error !== !0) return "ran";
  return n.denialRecorded ? "denied_by_rule" : "validation_failed";
}
//@ chunk-ad2e1aj6.js:29072-29235 placement
function resultNotes(e, n) {
  return (
    buildResultNotes(e.notes, {
      targetName: n,
      shellToolName: e.servedShellToolName,
      localSpillPaths: e.localSpillPaths,
      localSpillDirs: e.localSpillDirs,
    }).notes ?? []
  );
}
//@ chunk-ad2e1aj6.js:29235-29436 placement
function buildResultNotes(e, n) {
  if (e.length === 0) return {};
  return {
    notes: e.slice(0, HXr).map((h) => {
      let r = spillServedOutput({ content: h, output: void 0, maxInlineBytes: Hr, ...n }),
        i = typeof r.content === "string" ? r.content : h;
      return truncateToLength(i, NPe);
    }),
  };
}

export { cancelledToolResult, Mr, resultNotes, shapeServedResult, resultSizeLimitsFor, runServedTool };
