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
import { shellToolOrDefault, isShellToolName } from "../../../tools/shared/textSearchTools.js";
import { spillServedOutput, unreadableSpillNote } from "./outputSpill.js";
import { isPlainObject } from "./callStatusQuery.js";
import { byteLengthOf, toRemoteToolContentBlocks } from "../callResults.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../protocolConstants.js";
import { xr } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { KEPT_RESULT_FIELDS_BY_TOOL, MAX_ACCEPT_NOTES, MAX_MESSAGE_CHARS } from "../protocolSchemas.js";
import { pickByHelper } from "../../../utils/git/gitSafeEnv.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import { GREP_TOOL_NAME } from "../../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../../tools/GlobTool/prompt.js";
import { n7o, vlr } from "../../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { formatFileSize } from "../../../utils/format.js";
import { truncateToLength } from "../../../utils/stringUtils.js";

//@ chunk-ad2e1aj6.js:22511-22525 placement
var MAX_STRUCTURED_RESULT_BYTES = 262144;
//@ chunk-ad2e1aj6.js:22525-22792 placement
function resultSizeLimitsFor(arrivedOver) {
  switch (arrivedOver) {
    case "session":
    case "relay":
      return {
        imageBase64Bytes: 1572864,
        documentBase64Bytes: 3380000,
      };
    case "bridge":
    case "direct":
      return {
        imageBase64Bytes: 1048576,
        documentBase64Bytes: 0,
      };
    default: {
      let n = arrivedOver;
      return {
        imageBase64Bytes: 1048576,
        documentBase64Bytes: 0,
      };
    }
  }
}
//@ chunk-ad2e1aj6.js:22792-22812 placement
var RESULT_NOTE_MAX_CHARS = 5000;
var MAX_INLINE_OUTPUT_BYTES = 8000;
//@ chunk-ad2e1aj6.js:22812-23112 placement
function cancelledToolResult(toolUseId, content) {
  return {
    result: {
      type: "tool_result",
      tool_use_id: toolUseId,
      content,
      is_error: true,
    },
    settledBeforeStop: true,
    denialKind: undefined,
    denialRecorded: false,
    output: undefined,
    ranToEnd: false,
    extra: [],
    hookExtra: [],
    notes: [],
    heldHookNotes: 0,
    gateHookErrors: 0,
    localSpillPaths: [],
    localSpillDirs: [],
    servedShellToolName: undefined,
  };
}
//@ chunk-ad2e1aj6.js:23112-24784 placement
/**
 * 在本机执行被云会话调用的工具（构造 assistant 消息、写工具结果文件、收集进度）。
 */
async function runServedTool(e) {
  let assistantMessage = createAssistantMessage({
    content: [e.toolUse],
  });
  let originalCwd = getOriginalCwd_2(e.context.session);
  let h = [
    getToolResultFilePath(originalCwd, e.toolUse.id, false),
    getToolResultFilePath(originalCwd, e.toolUse.id, true),
  ];
  let localSpillDirs = [originalCwd, toolResultsDir()];
  let i = [];
  let y = [];
  let O = [];
  let R = 0;
  let w = 0;
  let result;
  let settledBeforeStop = false;
  let denialKind;
  let denialRecorded = false;
  let F;
  let ranToEnd = false;
  for await (let L of runToolUse(
    e.toolUse,
    assistantMessage,
    e.canUseTool,
    {
      ...e.context,
      onPermissionDenial: () => {
        denialRecorded = true;
      },
    },
    () => new Date().toISOString(),
  )) {
    if (hasTypeField(L)) continue;
    let { message } = L;
    if (message.type === "progress") {
      if (
        message.parentToolUseID === e.toolUse.id &&
        (message.data.type === "bash_progress" || message.data.type === "powershell_progress")
      )
        e.onShellProgress?.(message.data, {
          localSpillPaths: h,
          localSpillDirs,
        });
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
        if (message.attachment.heldForServedCall === true) {
          O.push(message.attachment.content);
          R++;
        }
        continue;
      }
      for (let M of normalizeAttachmentOrEmpty(message.attachment)) {
        let contentBlocks = toContentBlocks(M.message.content);
        y.push(...contentBlocks);
        O.push(
          ...contentBlocks.flatMap((contentBlock) => {
            let text = toTextBlock(contentBlock)?.text;
            return text === undefined ? [] : [unwrapSystemReminder(text)];
          }),
        );
      }
      continue;
    }
    if (message.type !== "user") continue;
    for (let M of toContentBlocks(message.message.content))
      if (M.type === "tool_result" && M.tool_use_id === e.toolUse.id) {
        result = M;
        settledBeforeStop = !e.stopSignal.aborted;
        denialKind = message.toolDenialKind;
        ranToEnd = didToolRunToCompletion(message.toolUseResult, M);
        F = pickReportedToolResultFields(e.toolUse.name, message.toolUseResult);
        let persistedOutputPath = readPersistedOutputPath(F);
        if (persistedOutputPath !== undefined) h.push(persistedOutputPath);
      } else i.push(M);
  }
  return {
    result,
    settledBeforeStop,
    denialKind,
    denialRecorded,
    output: F,
    ranToEnd,
    extra: i,
    hookExtra: y,
    notes: O,
    heldHookNotes: R,
    gateHookErrors: w,
    localSpillPaths: h,
    localSpillDirs,
    servedShellToolName: shellToolOrDefault(e.toolUse.name, e.servedShellToolName),
  };
}
//@ chunk-ad2e1aj6.js:24784-26012 placement
function shapeServedResult(e) {
  let { run } = e;
  let s = {
    targetName: e.targetName,
    shellToolName: run.servedShellToolName,
    localSpillPaths: run.localSpillPaths,
    localSpillDirs: run.localSpillDirs,
    maxImageBytes: e.budget.imageBase64Bytes,
  };
  let h = splitContentAndDocuments(
    [...toContentBlocks(run.result.content), ...run.extra],
    e.targetName,
    e.budget.documentBase64Bytes,
  );
  let output = isShellToolName(e.toolName) ? run.output : undefined;
  let i = spillServedOutput({
    content: h.content,
    output,
    ...s,
  });
  let filtered = h.documents.filter((x) =>
    isSameTextBlock(typeof i.content === "string" ? undefined : i.content[x.at], h.content[x.at]),
  );
  let O =
    run.hookExtra.length === 0
      ? i
      : spillServedOutput({
          content: splitContentAndDocuments(
            [...toContentBlocks(run.result.content), ...run.extra, ...run.hookExtra],
            e.targetName,
            e.budget.documentBase64Bytes,
          ).content,
          output: undefined,
          ...s,
        });
  let R = output === undefined ? mapStringsDeep(run.output, unreadableSpillNote(s)) : i.output;
  let w = isPlainObject(R) && byteLengthOf(R) <= MAX_STRUCTURED_RESULT_BYTES ? R : undefined;
  let C =
    h.dropped ||
    filtered.length < h.documents.length ||
    i.truncated ||
    O.truncated ||
    (isPlainObject(i.output) && w === undefined);
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "completed",
      ...(e.callId !== undefined && {
        call_id: e.callId,
      }),
      target: e.target,
      is_error: run.result.is_error === true,
      content: toRemoteToolContentBlocks(i.content),
      ...(filtered.length > 0 && {
        documents: filtered,
      }),
      ...(w !== undefined && {
        output: w,
      }),
      ...(C && {
        truncated: true,
      }),
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
  return typeof n === "string" && n.length > 0 ? n : undefined;
}
//@ chunk-ad2e1aj6.js:26158-26294 placement
function didToolRunToCompletion(toolUseResult, n) {
  let s =
    typeof toolUseResult === "object" && toolUseResult !== null
      ? Reflect.get(toolUseResult, "interrupted")
      : undefined;
  return typeof s === "boolean" ? !s : n.is_error !== true;
}
//@ chunk-ad2e1aj6.js:26294-26392 placement
function toContentBlocks(content) {
  if (content === undefined || content === "") return [];
  return typeof content === "string"
    ? [
        {
          type: "text",
          text: content,
        },
      ]
    : content;
}
//@ chunk-ad2e1aj6.js:26392-26536 placement
function mapStringsDeep(e, n) {
  if (typeof e === "string") return n(e);
  if (Array.isArray(e)) return e.map((s) => mapStringsDeep(s, n));
  if (isPlainObject(e)) return xr(e, (s) => mapStringsDeep(s, n));
  return e;
}
//@ chunk-ad2e1aj6.js:26536-26669 placement
function pickReportedToolResultFields(name, toolUseResult) {
  let s = KEPT_RESULT_FIELDS_BY_TOOL.get(name);
  if (s === undefined || toolUseResult === undefined) return;
  if (isShellToolName(name)) return toolUseResult;
  if (!isPlainObject(toolUseResult)) return;
  return pickByHelper(toolUseResult, (h, r) => s.has(r));
}
//@ chunk-ad2e1aj6.js:26669-27041 placement
function readFurtherHint(servedShellToolName) {
  let n =
    servedShellToolName === undefined
      ? ""
      : servedShellToolName === POWERSHELL_TOOL_NAME
        ? `, else Select-String through ${servedShellToolName} there`
        : `, else grep through ${servedShellToolName} there`;
  return `(on that machine: read further with offset/limit and the same machine argument; to search it there, ${GREP_TOOL_NAME} with that argument if this session's ${GREP_TOOL_NAME} accepts one${n} \u2014 without the argument ${GREP_TOOL_NAME} and ${GLOB_TOOL_NAME} search only this session's own files)`;
}
//@ chunk-ad2e1aj6.js:27041-27926 placement
function splitContentAndDocuments(e, targetName, documentRemaining) {
  return e.reduce(
    (acc, r) => {
      let i = toTextBlock(r) ?? imageBlockOf(r);
      if (i !== undefined) {
        acc.content.push(i);
        return acc;
      }
      let y = documentBlockOf(r);
      if (y !== undefined && acc.documents.length < n7o && y.data.length <= acc.documentRemaining) {
        acc.documents.push({
          at: acc.content.length,
          ...y,
        });
        acc.content.push({
          type: "text",
          text: `${vlr}${targetName}, ${formatFileSize(Math.floor((y.data.length * 3) / 4))}, came with this result but this session's Claude Code could not take it from another machine \u2014 an older version, most likely; read it by pages instead)`,
        });
        return {
          ...acc,
          documentRemaining: acc.documentRemaining - y.data.length,
        };
      }
      acc.content.push({
        type: "text",
        text:
          r.type === "image"
            ? `(an image referenced by URL was omitted on ${targetName})`
            : y !== undefined
              ? `(a PDF read on ${targetName} could not be returned with this result \u2014 read it by pages instead)`
              : `(a ${String(r.type)} block was omitted on ${targetName})`,
      });
      return {
        ...acc,
        dropped: true,
      };
    },
    {
      content: [],
      documents: [],
      dropped: false,
      documentRemaining,
    },
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
    ? {
        media_type: "application/pdf",
        data: s,
      }
    : undefined;
}
//@ chunk-ad2e1aj6.js:28326-28441 placement
function toTextBlock(e) {
  let n = Reflect.get(e, "text");
  return e.type === "text" && typeof n === "string"
    ? {
        type: "text",
        text: n,
      }
    : undefined;
}
//@ chunk-ad2e1aj6.js:28441-28813 placement
function imageBlockOf(e) {
  if (e.type !== "image") return;
  let n = Reflect.get(e, "source");
  if (typeof n !== "object" || n === null) return;
  let s = Reflect.get(n, "type");
  let h = Reflect.get(n, "media_type");
  let r = Reflect.get(n, "data");
  return s === "base64" &&
    typeof r === "string" &&
    (h === "image/jpeg" || h === "image/png" || h === "image/gif" || h === "image/webp")
    ? {
        type: "image",
        source: {
          type: "base64",
          media_type: h,
          data: r,
        },
      }
    : undefined;
}
//@ chunk-ad2e1aj6.js:28813-29072 placement
function servedDisposition(permissionOutcome, run) {
  if (permissionOutcome !== undefined) {
    if (permissionOutcome.kind === "allowed") return "ran";
    return permissionOutcome.kind === "stopped" ? "ask_expired" : permissionOutcome.kind;
  }
  if (run.denialKind !== undefined) return "hook_blocked";
  if (run.result?.is_error !== true) return "ran";
  return run.denialRecorded ? "denied_by_rule" : "validation_failed";
}
//@ chunk-ad2e1aj6.js:29072-29235 placement
function resultNotes(e, targetName) {
  return (
    buildResultNotes(e.notes, {
      targetName,
      shellToolName: e.servedShellToolName,
      localSpillPaths: e.localSpillPaths,
      localSpillDirs: e.localSpillDirs,
    }).notes ?? []
  );
}
//@ chunk-ad2e1aj6.js:29235-29436 placement
function buildResultNotes(notes, n) {
  if (notes.length === 0) return {};
  return {
    notes: notes.slice(0, MAX_ACCEPT_NOTES).map((h) => {
      let r = spillServedOutput({
        content: h,
        output: undefined,
        maxInlineBytes: MAX_INLINE_OUTPUT_BYTES,
        ...n,
      });
      let i = typeof r.content === "string" ? r.content : h;
      return truncateToLength(i, MAX_MESSAGE_CHARS);
    }),
  };
}
export {
  cancelledToolResult,
  RESULT_NOTE_MAX_CHARS,
  resultNotes,
  shapeServedResult,
  resultSizeLimitsFor,
  runServedTool,
};
