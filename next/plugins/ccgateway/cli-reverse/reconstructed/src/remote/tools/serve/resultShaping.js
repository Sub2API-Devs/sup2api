/**
 * remote/tools/serve/resultShaping.ts
 *
 * 2.1.316 新增：服务端工具运行与结果整形（内容/文档拆分、图片块）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nvm0wye1.js (20)
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
import { import_mapValues } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { KEPT_RESULT_FIELDS_BY_TOOL, MAX_ACCEPT_NOTES, MAX_MESSAGE_CHARS } from "../protocolSchemas.js";
import { pickByHelper } from "../../../utils/git/gitSafeEnv.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import { GREP_TOOL_NAME } from "../../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../../tools/GlobTool/prompt.js";
import {
  MAX_PDF_PAGES_PER_READ,
  PDF_READ_MARKER_PREFIX,
} from "../../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { formatFileSize } from "../../../utils/format.js";
import { truncateToLength } from "../../../utils/stringUtils.js";

//@ chunk-nvm0wye1.js:22856-22870 placement
var MAX_STRUCTURED_RESULT_BYTES = 262144;
//@ chunk-nvm0wye1.js:22870-23137 placement
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
      let transport = arrivedOver;
      return {
        imageBase64Bytes: 1048576,
        documentBase64Bytes: 0,
      };
    }
  }
}
//@ chunk-nvm0wye1.js:23137-23157 placement
var RESULT_NOTE_MAX_CHARS = 5000;
var MAX_INLINE_OUTPUT_BYTES = 8000;
//@ chunk-nvm0wye1.js:23157-23457 placement
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
//@ chunk-nvm0wye1.js:23457-25127 placement
/**
 * 在本机执行被云会话调用的工具（构造 assistant 消息、写工具结果文件、收集进度）。
 */
async function runServedTool(call) {
  let assistantMessage = createAssistantMessage({
    content: [call.toolUse],
  });
  let originalCwd = getOriginalCwd_2(call.context.session);
  let localSpillPaths = [
    getToolResultFilePath(originalCwd, call.toolUse.id, false),
    getToolResultFilePath(originalCwd, call.toolUse.id, true),
  ];
  let localSpillDirs = [originalCwd, toolResultsDir()];
  let extra = [];
  let hookExtra = [];
  let notes = [];
  let heldHookNotes = 0;
  let gateHookErrors = 0;
  let result;
  let settledBeforeStop = false;
  let denialKind;
  let denialRecorded = false;
  let output;
  let ranToEnd = false;
  for await (let update of runToolUse(
    call.toolUse,
    assistantMessage,
    call.canUseTool,
    {
      ...call.context,
      onPermissionDenial: () => {
        denialRecorded = true;
      },
    },
    () => new Date().toISOString(),
  )) {
    if (hasTypeField(update)) continue;
    let { message } = update;
    if (message.type === "progress") {
      if (
        message.parentToolUseID === call.toolUse.id &&
        (message.data.type === "bash_progress" || message.data.type === "powershell_progress")
      )
        call.onShellProgress?.(message.data, {
          localSpillPaths,
          localSpillDirs,
        });
      continue;
    }
    if (message.type === "attachment") {
      if (message.attachment.type === "read_truncation_notice") {
        let truncationNote = {
          type: "text",
          text: `${message.attachment.banner} ${readFurtherHint(call.servedShellToolName)}`,
        };
        extra.push(truncationNote);
        continue;
      }
      if (!message.attachment.type.startsWith("hook_")) continue;
      if (
        message.attachment.type === "hook_non_blocking_error" &&
        message.attachment.hookEvent === "PreToolUse"
      )
        gateHookErrors++;
      if (message.attachment.type === "hook_system_message") {
        if (message.attachment.heldForServedCall === true) {
          notes.push(message.attachment.content);
          heldHookNotes++;
        }
        continue;
      }
      for (let attachment of normalizeAttachmentOrEmpty(message.attachment)) {
        let contentBlocks = toContentBlocks(attachment.message.content);
        hookExtra.push(...contentBlocks);
        notes.push(
          ...contentBlocks.flatMap((contentBlock) => {
            let text = toTextBlock(contentBlock)?.text;
            return text === undefined ? [] : [unwrapSystemReminder(text)];
          }),
        );
      }
      continue;
    }
    if (message.type !== "user") continue;
    for (let block of toContentBlocks(message.message.content))
      if (block.type === "tool_result" && block.tool_use_id === call.toolUse.id) {
        result = block;
        settledBeforeStop = !call.stopSignal.aborted;
        denialKind = message.toolDenialKind;
        ranToEnd = didToolRunToCompletion(message.toolUseResult, block);
        output = pickReportedToolResultFields(call.toolUse.name, message.toolUseResult);
        let persistedOutputPath = readPersistedOutputPath(output);
        if (persistedOutputPath !== undefined) localSpillPaths.push(persistedOutputPath);
      } else extra.push(block);
  }
  return {
    result,
    settledBeforeStop,
    denialKind,
    denialRecorded,
    output,
    ranToEnd,
    extra,
    hookExtra,
    notes,
    heldHookNotes,
    gateHookErrors,
    localSpillPaths,
    localSpillDirs,
    servedShellToolName: shellToolOrDefault(call.toolUse.name, call.servedShellToolName),
  };
}
//@ chunk-nvm0wye1.js:25127-26355 placement
function shapeServedResult(input) {
  let { run } = input;
  let spillOptions = {
    targetName: input.targetName,
    shellToolName: run.servedShellToolName,
    localSpillPaths: run.localSpillPaths,
    localSpillDirs: run.localSpillDirs,
    maxImageBytes: input.budget.imageBase64Bytes,
  };
  let split = splitContentAndDocuments(
    [...toContentBlocks(run.result.content), ...run.extra],
    input.targetName,
    input.budget.documentBase64Bytes,
  );
  let output = isShellToolName(input.toolName) ? run.output : undefined;
  let spilled = spillServedOutput({
    content: split.content,
    output,
    ...spillOptions,
  });
  let filtered = split.documents.filter((doc) =>
    isSameTextBlock(
      typeof spilled.content === "string" ? undefined : spilled.content[doc.at],
      split.content[doc.at],
    ),
  );
  let withHooks =
    run.hookExtra.length === 0
      ? spilled
      : spillServedOutput({
          content: splitContentAndDocuments(
            [...toContentBlocks(run.result.content), ...run.extra, ...run.hookExtra],
            input.targetName,
            input.budget.documentBase64Bytes,
          ).content,
          output: undefined,
          ...spillOptions,
        });
  let mappedOutput =
    output === undefined ? mapStringsDeep(run.output, unreadableSpillNote(spillOptions)) : spilled.output;
  let keptOutput =
    isPlainObject(mappedOutput) && byteLengthOf(mappedOutput) <= MAX_STRUCTURED_RESULT_BYTES
      ? mappedOutput
      : undefined;
  let truncated =
    split.dropped ||
    filtered.length < split.documents.length ||
    spilled.truncated ||
    withHooks.truncated ||
    (isPlainObject(spilled.output) && keptOutput === undefined);
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "completed",
      ...(input.callId !== undefined && {
        call_id: input.callId,
      }),
      target: input.target,
      is_error: run.result.is_error === true,
      content: toRemoteToolContentBlocks(spilled.content),
      ...(filtered.length > 0 && {
        documents: filtered,
      }),
      ...(keptOutput !== undefined && {
        output: keptOutput,
      }),
      ...(truncated && {
        truncated: true,
      }),
      disposition: servedDisposition(input.permissionOutcome, run),
      ...buildResultNotes(run.notes, {
        targetName: input.targetName,
        shellToolName: run.servedShellToolName,
        localSpillPaths: run.localSpillPaths,
        localSpillDirs: run.localSpillDirs,
      }),
    },
    content: withHooks.content,
    truncated,
  };
}
//@ chunk-nvm0wye1.js:26355-26501 placement
function readPersistedOutputPath(toolUseResult) {
  if (typeof toolUseResult !== "object" || toolUseResult === null) return;
  let path = Reflect.get(toolUseResult, "persistedOutputPath");
  return typeof path === "string" && path.length > 0 ? path : undefined;
}
//@ chunk-nvm0wye1.js:26501-26637 placement
function didToolRunToCompletion(toolUseResult, block) {
  let interrupted =
    typeof toolUseResult === "object" && toolUseResult !== null
      ? Reflect.get(toolUseResult, "interrupted")
      : undefined;
  return typeof interrupted === "boolean" ? !interrupted : block.is_error !== true;
}
//@ chunk-nvm0wye1.js:26637-26735 placement
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
//@ chunk-nvm0wye1.js:26735-26879 placement
function mapStringsDeep(value, mapString) {
  if (typeof value === "string") return mapString(value);
  if (Array.isArray(value)) return value.map((item) => mapStringsDeep(item, mapString));
  if (isPlainObject(value)) return import_mapValues(value, (item) => mapStringsDeep(item, mapString));
  return value;
}
//@ chunk-nvm0wye1.js:26879-27012 placement
function pickReportedToolResultFields(name, toolUseResult) {
  let keptFields = KEPT_RESULT_FIELDS_BY_TOOL.get(name);
  if (keptFields === undefined || toolUseResult === undefined) return;
  if (isShellToolName(name)) return toolUseResult;
  if (!isPlainObject(toolUseResult)) return;
  return pickByHelper(toolUseResult, (value, key) => keptFields.has(key));
}
//@ chunk-nvm0wye1.js:27012-27384 placement
function readFurtherHint(servedShellToolName) {
  let searchHint =
    servedShellToolName === undefined
      ? ""
      : servedShellToolName === POWERSHELL_TOOL_NAME
        ? `, else Select-String through ${servedShellToolName} there`
        : `, else grep through ${servedShellToolName} there`;
  return `(on that machine: read further with offset/limit and the same machine argument; to search it there, ${GREP_TOOL_NAME} with that argument if this session's ${GREP_TOOL_NAME} accepts one${searchHint} \u2014 without the argument ${GREP_TOOL_NAME} and ${GLOB_TOOL_NAME} search only this session's own files)`;
}
//@ chunk-nvm0wye1.js:27384-28269 placement
function splitContentAndDocuments(blocks, targetName, documentRemaining) {
  return blocks.reduce(
    (acc, block) => {
      let contentBlock = toTextBlock(block) ?? imageBlockOf(block);
      if (contentBlock !== undefined) {
        acc.content.push(contentBlock);
        return acc;
      }
      let documentBlock = documentBlockOf(block);
      if (
        documentBlock !== undefined &&
        acc.documents.length < MAX_PDF_PAGES_PER_READ &&
        documentBlock.data.length <= acc.documentRemaining
      ) {
        acc.documents.push({
          at: acc.content.length,
          ...documentBlock,
        });
        acc.content.push({
          type: "text",
          text: `${PDF_READ_MARKER_PREFIX}${targetName}, ${formatFileSize(Math.floor((documentBlock.data.length * 3) / 4))}, came with this result but this session's Claude Code could not take it from another machine \u2014 an older version, most likely; read it by pages instead)`,
        });
        return {
          ...acc,
          documentRemaining: acc.documentRemaining - documentBlock.data.length,
        };
      }
      acc.content.push({
        type: "text",
        text:
          block.type === "image"
            ? `(an image referenced by URL was omitted on ${targetName})`
            : documentBlock !== undefined
              ? `(a PDF read on ${targetName} could not be returned with this result \u2014 read it by pages instead)`
              : `(a ${String(block.type)} block was omitted on ${targetName})`,
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
//@ chunk-nvm0wye1.js:28269-28371 placement
function isSameTextBlock(left, right) {
  return (
    left?.type === "text" &&
    right?.type === "text" &&
    typeof left.text === "string" &&
    left.text === right.text
  );
}
//@ chunk-nvm0wye1.js:28371-28669 placement
function documentBlockOf(block) {
  if (block.type !== "document") return;
  let source = Reflect.get(block, "source");
  if (typeof source !== "object" || source === null) return;
  let data = Reflect.get(source, "data");
  return Reflect.get(source, "type") === "base64" &&
    Reflect.get(source, "media_type") === "application/pdf" &&
    typeof data === "string"
    ? {
        media_type: "application/pdf",
        data,
      }
    : undefined;
}
//@ chunk-nvm0wye1.js:28669-28784 placement
function toTextBlock(block) {
  let text = Reflect.get(block, "text");
  return block.type === "text" && typeof text === "string"
    ? {
        type: "text",
        text,
      }
    : undefined;
}
//@ chunk-nvm0wye1.js:28784-29156 placement
function imageBlockOf(block) {
  if (block.type !== "image") return;
  let source = Reflect.get(block, "source");
  if (typeof source !== "object" || source === null) return;
  let sourceType = Reflect.get(source, "type");
  let mediaType = Reflect.get(source, "media_type");
  let data = Reflect.get(source, "data");
  return sourceType === "base64" &&
    typeof data === "string" &&
    (mediaType === "image/jpeg" ||
      mediaType === "image/png" ||
      mediaType === "image/gif" ||
      mediaType === "image/webp")
    ? {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data,
        },
      }
    : undefined;
}
//@ chunk-nvm0wye1.js:29156-29415 placement
function servedDisposition(permissionOutcome, run) {
  if (permissionOutcome !== undefined) {
    if (permissionOutcome.kind === "allowed") return "ran";
    return permissionOutcome.kind === "stopped" ? "ask_expired" : permissionOutcome.kind;
  }
  if (run.denialKind !== undefined) return "hook_blocked";
  if (run.result?.is_error !== true) return "ran";
  return run.denialRecorded ? "denied_by_rule" : "validation_failed";
}
//@ chunk-nvm0wye1.js:29415-29578 placement
function resultNotes(run, targetName) {
  return (
    buildResultNotes(run.notes, {
      targetName,
      shellToolName: run.servedShellToolName,
      localSpillPaths: run.localSpillPaths,
      localSpillDirs: run.localSpillDirs,
    }).notes ?? []
  );
}
//@ chunk-nvm0wye1.js:29578-29778 placement
function buildResultNotes(notes, spillOptions) {
  if (notes.length === 0) return {};
  return {
    notes: notes.slice(0, MAX_ACCEPT_NOTES).map((note) => {
      let spilled = spillServedOutput({
        content: note,
        output: undefined,
        maxInlineBytes: MAX_INLINE_OUTPUT_BYTES,
        ...spillOptions,
      });
      let text = typeof spilled.content === "string" ? spilled.content : note;
      return truncateToLength(text, MAX_MESSAGE_CHARS);
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
