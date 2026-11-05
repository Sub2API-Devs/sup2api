/**
 * utils/contextAttachments/promptSnapshot.ts
 *
 * 2.1.316 新增：提示快照附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (27)
 * attribution: placement 27
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isFoamySpringEnabled } from "../../services/analytics/growthbookGates.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  array,
  stringSchema,
  record,
  unknown,
  booleanSchema,
  _enum,
  custom as custom_2,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { asSystemPrompt } from "../systemPromptType.js";
import { isPlainToolDefinition } from "../../services/api/toolDefinitionShape.js";
import { isCliSyspromptPrefix } from "../../constants/system.js";
import { splitSystemPromptAtBoundary } from "../systemPromptBoundary.js";
import { logError } from "../log.js";
import { env } from "../env.js";
import { simpleModeEnv } from "../model/promptBundles.js";
import { shortHash } from "../shortHash.js";
import { isPlainObject as isPlainObject_6 } from "../isPlainObject.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:120159-120190 placement
/**
 * 上下文渲染方式的取值（announced、inline）。
 */
var CONTEXT_RENDERING_MODES = ["announced", "inline"];
//@ chunk-5xgkngpb.js:120190-120217 placement
/**
 * 提示词快照特性开关（tengu_foamy_spring）。
 */
function isPromptSnapshotFeatureOn() {
  return isFoamySpringEnabled();
}
//@ chunk-5xgkngpb.js:120217-120796 placement
/**
 * 提示词快照附件 schema：系统提示词、工具（名称、描述、schema、服务器）、CLI 前缀，以及提醒折叠、system 轮次、工具变更头、内联工具等线上形态开关。
 */
var promptSnapshotSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:120217", () => {
  promptSnapshotSchema = DoctorLazy(() =>
    objectSchema({
      systemPrompt: array(stringSchema()),
      tools: array(
        objectSchema({
          name: stringSchema(),
          description: stringSchema(),
          schema: record(stringSchema(), unknown()).optional(),
          server: stringSchema().optional(),
        }),
      ).optional(),
      cliPrefix: stringSchema().optional(),
      reminderFold: booleanSchema().optional().catch(undefined),
      systemTurns: booleanSchema().optional().catch(undefined),
      toolChangeHeader: booleanSchema().optional().catch(undefined),
      inlineTools: booleanSchema().optional().catch(undefined),
      keptReminders: booleanSchema().optional().catch(undefined),
      toolResultSafeguards: booleanSchema().optional().catch(undefined),
      systemTurnsAnsweredBy: stringSchema().optional().catch(undefined),
      echoWireToolInputs: booleanSchema().optional().catch(undefined),
      contextRendering: _enum(CONTEXT_RENDERING_MODES).optional().catch(undefined),
    }),
  );
});
//@ chunk-5xgkngpb.js:120796-121234 placement
/**
 * 从提示词快照中挑出线上形态相关字段（systemTurns、toolChangeHeader、inlineTools、keptReminders、toolResultSafeguards、systemTurnsAnsweredBy）。
 */
function pickWireShape(shape) {
  return {
    ...(shape?.systemTurns !== undefined && {
      systemTurns: shape.systemTurns,
    }),
    ...(shape?.toolChangeHeader !== undefined && {
      toolChangeHeader: shape.toolChangeHeader,
    }),
    ...(shape?.inlineTools !== undefined && {
      inlineTools: shape.inlineTools,
    }),
    ...(shape?.keptReminders !== undefined && {
      keptReminders: shape.keptReminders,
    }),
    ...(shape?.toolResultSafeguards !== undefined && {
      toolResultSafeguards: shape.toolResultSafeguards,
    }),
    ...(shape?.systemTurnsAnsweredBy !== undefined && {
      systemTurnsAnsweredBy: shape.systemTurnsAnsweredBy,
    }),
  };
}
//@ chunk-5xgkngpb.js:121234-121329 placement
/**
 * 去掉线上的 systemTurnsAnsweredBy 字段。
 */
function dropSystemTurnsAnsweredBy(messages) {
  return messages?.systemTurnsAnsweredBy === undefined
    ? messages
    : {
        ...messages,
        systemTurnsAnsweredBy: undefined,
      };
}
//@ chunk-5xgkngpb.js:121329-121412 placement
/**
 * 属于提示词记录的附件类型（快照、渲染点、延迟工具记录）。
 */
var PROMPT_RECORD_ATTACHMENT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:121329", () => {
  PROMPT_RECORD_ATTACHMENT_TYPES = new Set([
    "prompt_snapshot",
    "prompt_render_point",
    "deferred_tools_record",
  ]);
});
//@ chunk-5xgkngpb.js:121412-121501 placement (2.1.88 match: isNullRenderingAttachment, 1)
function isNullRenderingAttachment(msg) {
  return msg.filter(
    (message) =>
      message.type !== "attachment" || !PROMPT_RECORD_ATTACHMENT_TYPES.has(message.attachment.type),
  );
}
//@ chunk-5xgkngpb.js:121501-121585 placement
/**
 * 判断消息是否为提示词快照附件。
 */
function isPromptSnapshotAttachment(attachment) {
  return attachment.type === "attachment" && attachment.attachment.type === "prompt_snapshot";
}
//@ chunk-5xgkngpb.js:121585-121673 placement
/**
 * 判断消息是否为提示词渲染点附件。
 */
function isPromptRenderPointAttachment(attachment) {
  return attachment.type === "attachment" && attachment.attachment.type === "prompt_render_point";
}
//@ chunk-5xgkngpb.js:121673-121693 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:121673", () => {
  weakMap = new WeakMap();
});
//@ chunk-5xgkngpb.js:121693-122371 placement
/**
 * 取消息中最新的 prompt_snapshot 附件并解析（WeakMap 缓存）：系统提示词及哈希、工具描述/schema/所属服务器、CLI 前缀、提醒折叠与线上形状等。
 */
function latestPromptSnapshot(messages) {
  let record = messages.findLast(isPromptSnapshotAttachment)?.attachment;
  if (record === undefined) return;
  let cached = weakMap.get(record);
  if (cached) return cached;
  let snapshot = promptSnapshotSchema().safeParse(record).data;
  if (!snapshot) return;
  let tools = snapshot.tools ?? [];
  let systemPrompt = asSystemPrompt(snapshot.systemPrompt);
  let parsed = {
    record,
    systemPrompt,
    systemPromptHash: hashSystemPrompt(systemPrompt),
    toolDescriptions: new Map(tools.map((tool) => [tool.name, tool.description])),
    toolEntries: new Map(
      tools.flatMap((tool) =>
        tool.schema !== undefined && isPlainToolDefinition(tool.schema) ? [[tool.name, tool.schema]] : [],
      ),
    ),
    toolServers: new Map(
      tools.flatMap((tool) => (tool.server === undefined ? [] : [[tool.name, tool.server]])),
    ),
    cliPrefix:
      snapshot.cliPrefix !== undefined && isCliSyspromptPrefix(snapshot.cliPrefix)
        ? snapshot.cliPrefix
        : undefined,
    reminderFold: snapshot.reminderFold,
    wireShape: pickWireShape(snapshot),
    echoWireToolInputs: snapshot.echoWireToolInputs,
    contextRendering: snapshot.contextRendering,
  };
  weakMap.set(record, parsed);
  return parsed;
}
//@ chunk-5xgkngpb.js:122371-122425 placement
/**
 * 快照开启且没有更新的渲染点时，返回最新提示词快照。
 */
function promptSnapshotUnlessRenderPoint(messages, options) {
  return shouldSnapshotSystemPrompt(options) && !isRenderPointNewer(messages)
    ? latestPromptSnapshot(messages)
    : undefined;
}
//@ chunk-5xgkngpb.js:122425-122470 placement
/**
 * 快照开启时返回最新提示词快照。
 */
function snapshotIfEnabled(messages, options) {
  return shouldSnapshotSystemPrompt(options) ? latestPromptSnapshot(messages) : undefined;
}
//@ chunk-5xgkngpb.js:122470-122684 placement
/**
 * 把提示词快照中的工具转换成条目列表（名称、描述、schema、服务器），跳过指定的工具。
 */
function snapshotToolEntries(snapshot, toolNames) {
  return [...snapshot.toolDescriptions].flatMap(([toolName, description]) => {
    if (toolNames?.has(toolName)) return [];
    let entry = snapshot.toolEntries.get(toolName);
    let server = snapshot.toolServers.get(toolName);
    return [
      {
        name: toolName,
        description,
        ...(entry && {
          schema: entry,
        }),
        ...(server !== undefined && {
          server,
        }),
      },
    ];
  });
}
//@ chunk-5xgkngpb.js:122684-123143 placement
/**
 * 压缩后若保留的消息涉及快照中的工具，生成新的 prompt_snapshot 附件（系统提示词、仍需要的工具、CLI 前缀与线上形状）。
 */
function buildPromptSnapshotAttachment(messagesToKeep, toolNames, options) {
  let snapshot = snapshotIfEnabled(messagesToKeep, options);
  if (snapshot === undefined || ![...toolNames].some((toolName) => snapshot.toolDescriptions.has(toolName)))
    return;
  return {
    type: "prompt_snapshot",
    systemPrompt: [...snapshot.systemPrompt],
    tools: snapshotToolEntries(snapshot, toolNames),
    ...(snapshot.cliPrefix !== undefined && {
      cliPrefix: snapshot.cliPrefix,
    }),
    ...(snapshot.reminderFold !== undefined && {
      reminderFold: snapshot.reminderFold,
    }),
    ...pickWireShape(dropSystemTurnsAnsweredBy(snapshot.wireShape)),
    ...(snapshot.echoWireToolInputs !== undefined && {
      echoWireToolInputs: snapshot.echoWireToolInputs,
    }),
    ...(snapshot.contextRendering !== undefined && {
      contextRendering: snapshot.contextRendering,
    }),
  };
}
//@ chunk-5xgkngpb.js:123143-123225 placement
/**
 * 构造“设置模型导致 system 提示变更”的渲染点。
 */
function setModelRenderPoint() {
  return {
    type: "prompt_render_point",
    cause: "set_model_system_prompt",
  };
}
//@ chunk-5xgkngpb.js:123225-123268 placement
/**
 * 渲染点晚于快照时返回该渲染点。
 */
function renderPointIfStale(messagesToKeep) {
  return isRenderPointNewer(messagesToKeep) ? setModelRenderPoint() : undefined;
}
//@ chunk-5xgkngpb.js:123268-123333 placement
/**
 * 判断最近的渲染点是否晚于最近的快照。
 */
function isRenderPointNewer(attachment) {
  return (
    attachment.findLastIndex(isPromptRenderPointAttachment) >
    attachment.findLastIndex(isPromptSnapshotAttachment)
  );
}
//@ chunk-5xgkngpb.js:123333-123520 placement
/**
 * 判断最近的提示词快照是否包含给定系统提示词的全部分段。
 */
function snapshotContainsPrompt(messages, prompt) {
  try {
    let snapshot = latestPromptSnapshot(messages);
    let parts = typeof prompt === "string" ? splitSystemPromptAtBoundary(prompt) : prompt;
    if (snapshot === undefined || parts === undefined || parts.length === 0) return false;
    return parts.every((part) => snapshot.systemPrompt.includes(part));
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-5xgkngpb.js:123520-123574 placement
/**
 * 取出所有提示词快照消息的 uuid。
 */
function snapshotUuids(messages) {
  return messages.filter(isPromptSnapshotAttachment).map((attachment) => attachment.uuid);
}
//@ chunk-5xgkngpb.js:123574-123784 placement
function extractTaggedBlock(text, tagName) {
  let closingTag = `</${tagName}>`;
  let filtered = [`<${tagName}>`, `<${tagName} `]
    .map((openingTag) => text?.indexOf(openingTag) ?? -1)
    .filter((foundIndex) => foundIndex !== -1);
  let startIndex = filtered.length === 0 ? -1 : Math.min(...filtered);
  let endIndex = text?.lastIndexOf(closingTag) ?? -1;
  return startIndex === -1 || endIndex < startIndex
    ? undefined
    : text?.slice(startIndex, endIndex + closingTag.length);
}
//@ chunk-5xgkngpb.js:123784-124018 placement
/**
 * 比较快照中最后一段系统提示词与当前提示词里各标签块的内容，返回出现、消失或变化。
 */
function tagBlockChange(messages, prompt, liveAppendSections) {
  try {
    let snapshot = latestPromptSnapshot(messages);
    if (snapshot === undefined || isRenderPointNewer(messages)) return;
    let text = snapshot.systemPrompt.at(-1);
    for (let section of liveAppendSections) {
      let taggedBlock = extractTaggedBlock(prompt, section);
      let taggedBlock_2 = extractTaggedBlock(text, section);
      if (taggedBlock !== taggedBlock_2)
        return taggedBlock_2 === undefined ? "appeared" : taggedBlock === undefined ? "vanished" : "changed";
    }
    return;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-5xgkngpb.js:124018-124174 placement
/**
 * 判断是否记录系统提示词快照：显式设置优先，后台会话、远程会话或特定条件下默认记录。
 */
function shouldSnapshotSystemPrompt(options) {
  if (options.systemPromptSnapshot === false) return false;
  return (
    options.systemPromptSnapshot === true ||
    env.CLAUDE_CODE_SESSION_KIND === "bg" ||
    env.CLAUDE_CODE_REMOTE ||
    !simpleModeEnv()
  );
}
//@ chunk-5xgkngpb.js:124174-124216 placement
/**
 * 计算系统提示各段以 NUL 连接后的哈希。
 */
function hashSystemPrompt(systemPrompt) {
  return shortHash(systemPrompt.join("\x00"));
}
//@ chunk-5xgkngpb.js:124216-124448 placement
var deferredToolsAttachmentSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var toolInputCopySchema;
deferInit("chunk-5xgkngpb.js:124216", () => {
  deferredToolsAttachmentSchema = DoctorLazy(() =>
    objectSchema({
      entries: custom_2((value) => Array.isArray(value)),
      nameOnlyAnnouncements: array(stringSchema()).optional(),
      strippedReferences: array(stringSchema()).optional(),
      toolInputCopies: array(unknown()).optional().catch(undefined),
    }),
  );
  toolInputCopySchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema(),
      copy: _enum(["wire", "displayed"]),
    }),
  );
});
//@ chunk-5xgkngpb.js:124448-124538 placement
/**
 * 判断消息是否为延迟工具记录附件。
 */
function isDeferredToolsRecord(message) {
  return message.type === "attachment" && message.attachment.type === "deferred_tools_record";
}
//@ chunk-5xgkngpb.js:124538-125099 placement
/**
 * 汇总消息中延迟工具附件记录的内容：工具条目、仅名称公告、已剥离引用与工具输入副本形态；解析出错时清空并记日志。
 */
function recordedDeferredTools(messages) {
  let entries = new Map();
  let nameOnlyAnnouncements = new Set();
  let strippedReferences = new Set();
  let toolInputCopies = new Map();
  try {
    for (let message of messages) {
      if (!isDeferredToolsRecord(message)) continue;
      let parsed = deferredToolsAttachmentSchema().safeParse(message.attachment).data;
      for (let entry of parsed?.entries ?? [])
        if (isPlainObject_6(entry)) {
          let toolName = entry.name;
          if (typeof toolName === "string") entries.set(toolName, entry);
        }
      for (let toolName of parsed?.nameOnlyAnnouncements ?? []) nameOnlyAnnouncements.add(toolName);
      for (let toolName of parsed?.strippedReferences ?? []) strippedReferences.add(toolName);
      for (let copyEntry of parsed?.toolInputCopies ?? []) {
        let copy = toolInputCopySchema().safeParse(copyEntry).data;
        if (copy !== undefined) toolInputCopies.set(copy.id, copy.copy);
      }
    }
  } catch (error) {
    logError(error);
    entries.clear();
    nameOnlyAnnouncements.clear();
    strippedReferences.clear();
    toolInputCopies.clear();
  }
  return {
    entries,
    nameOnlyAnnouncements,
    strippedReferences,
    toolInputCopies,
  };
}
export {
  latestPromptSnapshot,
  recordedDeferredTools,
  snapshotUuids,
  shouldSnapshotSystemPrompt,
  snapshotContainsPrompt,
  tagBlockChange,
  promptSnapshotUnlessRenderPoint,
  snapshotIfEnabled,
  buildPromptSnapshotAttachment,
  renderPointIfStale,
  isNullRenderingAttachment,
  isPromptSnapshotFeatureOn,
  hashSystemPrompt,
  pickWireShape,
  isRenderPointNewer,
  snapshotToolEntries,
  dropSystemTurnsAnsweredBy,
  setModelRenderPoint,
};
