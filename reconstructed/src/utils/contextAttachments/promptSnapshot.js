/**
 * utils/contextAttachments/promptSnapshot.ts
 *
 * 2.1.316 新增：提示快照附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (27)
 * attribution: placement 27
 */
import { isFoamySpringEnabled } from "../../services/analytics/growthbookGates.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, array, string, record, unknown, M, _enum, hu } from "../../../vendor/zod/v4/classic/schemas.js";
import { asSystemPrompt } from "../systemPromptType.js";
import { isPlainToolDefinition } from "../../services/api/toolDefinitionShape.js";
import { isCliSyspromptPrefix } from "../../constants/system.js";
import { splitSystemPromptAtBoundary } from "../systemPromptBoundary.js";
import { logError } from "../log.js";
import { env } from "../env.js";
import { simpleModeEnv } from "../model/promptBundles.js";
import { shortHash } from "../shortHash.js";
import { isPlainObject as isPlainObject_5 } from "../isPlainObject.js";

//@ chunk-e6aww6q8.js:117385-117416 placement
/**
 * 上下文渲染方式的取值（announced、inline）。
 */
var CONTEXT_RENDERING_MODES = ["announced", "inline"];
//@ chunk-e6aww6q8.js:117416-117443 placement
/**
 * 提示词快照特性开关（tengu_foamy_spring）。
 */
function isPromptSnapshotFeatureOn() {
  return isFoamySpringEnabled();
}
//@ chunk-e6aww6q8.js:117443-118022 placement
/**
 * 提示词快照附件 schema：系统提示词、工具（名称、描述、schema、服务器）、CLI 前缀，以及提醒折叠、system 轮次、工具变更头、内联工具等线上形态开关。
 */
var promptSnapshotSchema = DoctorLazy(() =>
  u({
    systemPrompt: array(string()),
    tools: array(
      u({
        name: string(),
        description: string(),
        schema: record(string(), unknown()).optional(),
        server: string().optional(),
      }),
    ).optional(),
    cliPrefix: string().optional(),
    reminderFold: M().optional().catch(undefined),
    systemTurns: M().optional().catch(undefined),
    toolChangeHeader: M().optional().catch(undefined),
    inlineTools: M().optional().catch(undefined),
    keptReminders: M().optional().catch(undefined),
    toolResultSafeguards: M().optional().catch(undefined),
    systemTurnsAnsweredBy: string().optional().catch(undefined),
    echoWireToolInputs: M().optional().catch(undefined),
    contextRendering: _enum(CONTEXT_RENDERING_MODES).optional().catch(undefined),
  }),
);
//@ chunk-e6aww6q8.js:118022-118460 placement
/**
 * 从提示词快照中挑出线上形态相关字段（systemTurns、toolChangeHeader、inlineTools、keptReminders、toolResultSafeguards、systemTurnsAnsweredBy）。
 */
function pickWireShape(e) {
  return {
    ...(e?.systemTurns !== undefined && {
      systemTurns: e.systemTurns,
    }),
    ...(e?.toolChangeHeader !== undefined && {
      toolChangeHeader: e.toolChangeHeader,
    }),
    ...(e?.inlineTools !== undefined && {
      inlineTools: e.inlineTools,
    }),
    ...(e?.keptReminders !== undefined && {
      keptReminders: e.keptReminders,
    }),
    ...(e?.toolResultSafeguards !== undefined && {
      toolResultSafeguards: e.toolResultSafeguards,
    }),
    ...(e?.systemTurnsAnsweredBy !== undefined && {
      systemTurnsAnsweredBy: e.systemTurnsAnsweredBy,
    }),
  };
}
//@ chunk-e6aww6q8.js:118460-118555 placement
/**
 * 去掉线上的 systemTurnsAnsweredBy 字段。
 */
function dropSystemTurnsAnsweredBy(e) {
  return e?.systemTurnsAnsweredBy === undefined
    ? e
    : {
        ...e,
        systemTurnsAnsweredBy: undefined,
      };
}
//@ chunk-e6aww6q8.js:118555-118638 placement
/**
 * 属于提示词记录的附件类型（快照、渲染点、延迟工具记录）。
 */
var PROMPT_RECORD_ATTACHMENT_TYPES = new Set([
  "prompt_snapshot",
  "prompt_render_point",
  "deferred_tools_record",
]);
//@ chunk-e6aww6q8.js:118638-118727 placement = isNullRenderingAttachment (1)
function isNullRenderingAttachment(msg) {
  return msg.filter((n) => n.type !== "attachment" || !PROMPT_RECORD_ATTACHMENT_TYPES.has(n.attachment.type));
}
//@ chunk-e6aww6q8.js:118727-118811 placement
/**
 * 判断消息是否为提示词快照附件。
 */
function isPromptSnapshotAttachment(e) {
  return e.type === "attachment" && e.attachment.type === "prompt_snapshot";
}
//@ chunk-e6aww6q8.js:118811-118899 placement
/**
 * 判断消息是否为提示词渲染点附件。
 */
function isPromptRenderPointAttachment(e) {
  return e.type === "attachment" && e.attachment.type === "prompt_render_point";
}
//@ chunk-e6aww6q8.js:118899-118919 placement
var weakMap = new WeakMap();
//@ chunk-e6aww6q8.js:118919-119597 placement
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
//@ chunk-e6aww6q8.js:119597-119651 placement
/**
 * 快照开启且没有更新的渲染点时，返回最新提示词快照。
 */
function promptSnapshotUnlessRenderPoint(e, options) {
  return shouldSnapshotSystemPrompt(options) && !isRenderPointNewer(e) ? latestPromptSnapshot(e) : undefined;
}
//@ chunk-e6aww6q8.js:119651-119696 placement
/**
 * 快照开启时返回最新提示词快照。
 */
function snapshotIfEnabled(e, options) {
  return shouldSnapshotSystemPrompt(options) ? latestPromptSnapshot(e) : undefined;
}
//@ chunk-e6aww6q8.js:119696-119910 placement
/**
 * 把提示词快照中的工具转换成条目列表（名称、描述、schema、服务器），跳过指定的工具。
 */
function snapshotToolEntries(e, n) {
  return [...e.toolDescriptions].flatMap(([r, s]) => {
    if (n?.has(r)) return [];
    let h = e.toolEntries.get(r);
    let y = e.toolServers.get(r);
    return [
      {
        name: r,
        description: s,
        ...(h && {
          schema: h,
        }),
        ...(y !== undefined && {
          server: y,
        }),
      },
    ];
  });
}
//@ chunk-e6aww6q8.js:119910-120369 placement
/**
 * 压缩后若保留的消息涉及快照中的工具，生成新的 prompt_snapshot 附件（系统提示词、仍需要的工具、CLI 前缀与线上形状）。
 */
function buildPromptSnapshotAttachment(messagesToKeep, n, options) {
  let s = snapshotIfEnabled(messagesToKeep, options);
  if (s === undefined || ![...n].some((h) => s.toolDescriptions.has(h))) return;
  return {
    type: "prompt_snapshot",
    systemPrompt: [...s.systemPrompt],
    tools: snapshotToolEntries(s, n),
    ...(s.cliPrefix !== undefined && {
      cliPrefix: s.cliPrefix,
    }),
    ...(s.reminderFold !== undefined && {
      reminderFold: s.reminderFold,
    }),
    ...pickWireShape(dropSystemTurnsAnsweredBy(s.wireShape)),
    ...(s.echoWireToolInputs !== undefined && {
      echoWireToolInputs: s.echoWireToolInputs,
    }),
    ...(s.contextRendering !== undefined && {
      contextRendering: s.contextRendering,
    }),
  };
}
//@ chunk-e6aww6q8.js:120369-120451 placement
/**
 * 构造“设置模型导致 system 提示变更”的渲染点。
 */
function setModelRenderPoint() {
  return {
    type: "prompt_render_point",
    cause: "set_model_system_prompt",
  };
}
//@ chunk-e6aww6q8.js:120451-120494 placement
/**
 * 渲染点晚于快照时返回该渲染点。
 */
function renderPointIfStale(messagesToKeep) {
  return isRenderPointNewer(messagesToKeep) ? setModelRenderPoint() : undefined;
}
//@ chunk-e6aww6q8.js:120494-120559 placement
/**
 * 判断最近的渲染点是否晚于最近的快照。
 */
function isRenderPointNewer(e) {
  return e.findLastIndex(isPromptRenderPointAttachment) > e.findLastIndex(isPromptSnapshotAttachment);
}
//@ chunk-e6aww6q8.js:120559-120746 placement
/**
 * 判断最近的提示词快照是否包含给定系统提示词的全部分段。
 */
function snapshotContainsPrompt(e, n) {
  try {
    let r = latestPromptSnapshot(e);
    let s = typeof n === "string" ? splitSystemPromptAtBoundary(n) : n;
    if (r === undefined || s === undefined || s.length === 0) return false;
    return s.every((h) => r.systemPrompt.includes(h));
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-e6aww6q8.js:120746-120800 placement
/**
 * 取出所有提示词快照消息的 uuid。
 */
function snapshotUuids(e) {
  return e.filter(isPromptSnapshotAttachment).map((n) => n.uuid);
}
//@ chunk-e6aww6q8.js:120800-121010 placement
function extractTaggedBlock(e, n) {
  let r = `</${n}>`;
  let filtered = [`<${n}>`, `<${n} `].map((S) => e?.indexOf(S) ?? -1).filter((S) => S !== -1);
  let h = filtered.length === 0 ? -1 : Math.min(...filtered);
  let y = e?.lastIndexOf(r) ?? -1;
  return h === -1 || y < h ? undefined : e?.slice(h, y + r.length);
}
//@ chunk-e6aww6q8.js:121010-121244 placement
/**
 * 比较快照中最后一段系统提示词与当前提示词里各标签块的内容，返回出现、消失或变化。
 */
function tagBlockChange(e, n, liveAppendSections) {
  try {
    let s = latestPromptSnapshot(e);
    if (s === undefined || isRenderPointNewer(e)) return;
    let last = s.systemPrompt.at(-1);
    for (let y of liveAppendSections) {
      let taggedBlock = extractTaggedBlock(n, y);
      let taggedBlock_2 = extractTaggedBlock(last, y);
      if (taggedBlock !== taggedBlock_2)
        return taggedBlock_2 === undefined ? "appeared" : taggedBlock === undefined ? "vanished" : "changed";
    }
    return;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:121244-121400 placement
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
//@ chunk-e6aww6q8.js:121400-121442 placement
/**
 * 计算系统提示各段以 NUL 连接后的哈希。
 */
function hashSystemPrompt(e) {
  return shortHash(e.join("\x00"));
}
//@ chunk-e6aww6q8.js:121442-121674 placement
var deferredToolsAttachmentSchema = DoctorLazy(() =>
  u({
    entries: hu((e) => Array.isArray(e)),
    nameOnlyAnnouncements: array(string()).optional(),
    strippedReferences: array(string()).optional(),
    toolInputCopies: array(unknown()).optional().catch(undefined),
  }),
);
var toolInputCopySchema = DoctorLazy(() =>
  u({
    id: string(),
    copy: _enum(["wire", "displayed"]),
  }),
);
//@ chunk-e6aww6q8.js:121674-121764 placement
/**
 * 判断消息是否为延迟工具记录附件。
 */
function isDeferredToolsRecord(message) {
  return message.type === "attachment" && message.attachment.type === "deferred_tools_record";
}
//@ chunk-e6aww6q8.js:121764-122325 placement
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
      for (let w of parsed?.entries ?? [])
        if (isPlainObject_5(w)) {
          let L = w.name;
          if (typeof L === "string") entries.set(L, w);
        }
      for (let w of parsed?.nameOnlyAnnouncements ?? []) nameOnlyAnnouncements.add(w);
      for (let w of parsed?.strippedReferences ?? []) strippedReferences.add(w);
      for (let w of parsed?.toolInputCopies ?? []) {
        let L = toolInputCopySchema().safeParse(w).data;
        if (L !== undefined) toolInputCopies.set(L.id, L.copy);
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
  snapshotIfEnabled,
  recordedDeferredTools,
  promptSnapshotUnlessRenderPoint,
  snapshotUuids,
  shouldSnapshotSystemPrompt,
  snapshotContainsPrompt,
  tagBlockChange,
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
