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
import { u, A, o, pe, oe, M, U, hu } from "../../../vendor/zod/v4/classic/schemas.js";
import { asSystemPrompt } from "../systemPromptType.js";
import { isPlainToolDefinition } from "../../services/api/toolDefinitionShape.js";
import { isCliSyspromptPrefix } from "../../constants/system.js";
import { splitSystemPromptAtBoundary } from "../systemPromptBoundary.js";
import { logError } from "../log.js";
import { env } from "../env.js";
import { GFe } from "../model/promptBundles.js";
import { gn } from "../shortHash.js";
import { isPlainObject as isPlainObject_4 } from "../isPlainObject.js";

//@ chunk-e6aww6q8.js:117385-117416 placement
var _bt = ["announced", "inline"];
//@ chunk-e6aww6q8.js:117416-117443 placement
function qun() {
  return isFoamySpringEnabled();
}
/**
 * 提示词快照附件 schema：系统提示词、工具（名称、描述、schema、服务器）、CLI 前缀，以及提醒折叠、system 轮次、工具变更头、内联工具等线上形态开关。
 */
//@ chunk-e6aww6q8.js:117443-118022 placement
var promptSnapshotSchema = DoctorLazy(() =>
  u({
    systemPrompt: A(o()),
    tools: A(
      u({ name: o(), description: o(), schema: pe(o(), oe()).optional(), server: o().optional() }),
    ).optional(),
    cliPrefix: o().optional(),
    reminderFold: M()
      .optional()
      .catch(void 0),
    systemTurns: M()
      .optional()
      .catch(void 0),
    toolChangeHeader: M()
      .optional()
      .catch(void 0),
    inlineTools: M()
      .optional()
      .catch(void 0),
    keptReminders: M()
      .optional()
      .catch(void 0),
    toolResultSafeguards: M()
      .optional()
      .catch(void 0),
    systemTurnsAnsweredBy: o()
      .optional()
      .catch(void 0),
    echoWireToolInputs: M()
      .optional()
      .catch(void 0),
    contextRendering: U(_bt)
      .optional()
      .catch(void 0),
  }),
);
/**
 * 从提示词快照中挑出线上形态相关字段（systemTurns、toolChangeHeader、inlineTools、keptReminders、toolResultSafeguards、systemTurnsAnsweredBy）。
 */
//@ chunk-e6aww6q8.js:118022-118460 placement
function pickWireShape(e) {
  return {
    ...(e?.systemTurns !== void 0 && { systemTurns: e.systemTurns }),
    ...(e?.toolChangeHeader !== void 0 && { toolChangeHeader: e.toolChangeHeader }),
    ...(e?.inlineTools !== void 0 && { inlineTools: e.inlineTools }),
    ...(e?.keptReminders !== void 0 && { keptReminders: e.keptReminders }),
    ...(e?.toolResultSafeguards !== void 0 && { toolResultSafeguards: e.toolResultSafeguards }),
    ...(e?.systemTurnsAnsweredBy !== void 0 && { systemTurnsAnsweredBy: e.systemTurnsAnsweredBy }),
  };
}
//@ chunk-e6aww6q8.js:118460-118555 placement
function y$o(e) {
  return e?.systemTurnsAnsweredBy === void 0 ? e : { ...e, systemTurnsAnsweredBy: void 0 };
}
//@ chunk-e6aww6q8.js:118555-118638 placement
var Vio = new Set(["prompt_snapshot", "prompt_render_point", "deferred_tools_record"]);
//@ chunk-e6aww6q8.js:118638-118727 placement = isNullRenderingAttachment (1)
function isNullRenderingAttachment(msg) {
  return msg.filter((n) => n.type !== "attachment" || !Vio.has(n.attachment.type));
}
//@ chunk-e6aww6q8.js:118727-118811 placement
function FFe(e) {
  return e.type === "attachment" && e.attachment.type === "prompt_snapshot";
}
//@ chunk-e6aww6q8.js:118811-118899 placement
function Qio(e) {
  return e.type === "attachment" && e.attachment.type === "prompt_render_point";
}
//@ chunk-e6aww6q8.js:118899-118919 placement
var weakMap = new WeakMap();
/**
 * 取消息中最新的 prompt_snapshot 附件并解析（WeakMap 缓存）：系统提示词及哈希、工具描述/schema/所属服务器、CLI 前缀、提醒折叠与线上形状等。
 */
//@ chunk-e6aww6q8.js:118919-119597 placement
function latestPromptSnapshot(messages) {
  let record = messages.findLast(FFe)?.attachment;
  if (record === void 0) return;
  let cached = weakMap.get(record);
  if (cached) return cached;
  let snapshot = promptSnapshotSchema().safeParse(record).data;
  if (!snapshot) return;
  let tools = snapshot.tools ?? [],
    systemPrompt = asSystemPrompt(snapshot.systemPrompt),
    parsed = {
      record: record,
      systemPrompt: systemPrompt,
      systemPromptHash: t3n(systemPrompt),
      toolDescriptions: new Map(tools.map((w) => [w.name, w.description])),
      toolEntries: new Map(
        tools.flatMap((w) =>
          w.schema !== void 0 && isPlainToolDefinition(w.schema) ? [[w.name, w.schema]] : [],
        ),
      ),
      toolServers: new Map(tools.flatMap((w) => (w.server === void 0 ? [] : [[w.name, w.server]]))),
      cliPrefix:
        snapshot.cliPrefix !== void 0 && isCliSyspromptPrefix(snapshot.cliPrefix)
          ? snapshot.cliPrefix
          : void 0,
      reminderFold: snapshot.reminderFold,
      wireShape: pickWireShape(snapshot),
      echoWireToolInputs: snapshot.echoWireToolInputs,
      contextRendering: snapshot.contextRendering,
    };
  return (weakMap.set(record, parsed), parsed);
}
//@ chunk-e6aww6q8.js:119597-119651 placement
function met(e, n) {
  return shouldSnapshotSystemPrompt(n) && !e3n(e) ? latestPromptSnapshot(e) : void 0;
}
//@ chunk-e6aww6q8.js:119651-119696 placement
function j_e(e, n) {
  return shouldSnapshotSystemPrompt(n) ? latestPromptSnapshot(e) : void 0;
}
/**
 * 把提示词快照中的工具转换成条目列表（名称、描述、schema、服务器），跳过指定的工具。
 */
//@ chunk-e6aww6q8.js:119696-119910 placement
function snapshotToolEntries(e, n) {
  return [...e.toolDescriptions].flatMap(([r, s]) => {
    if (n?.has(r)) return [];
    let h = e.toolEntries.get(r),
      y = e.toolServers.get(r);
    return [{ name: r, description: s, ...(h && { schema: h }), ...(y !== void 0 && { server: y }) }];
  });
}
/**
 * 压缩后若保留的消息涉及快照中的工具，生成新的 prompt_snapshot 附件（系统提示词、仍需要的工具、CLI 前缀与线上形状）。
 */
//@ chunk-e6aww6q8.js:119910-120369 placement
function buildPromptSnapshotAttachment(e, n, r) {
  let s = j_e(e, r);
  if (s === void 0 || ![...n].some((h) => s.toolDescriptions.has(h))) return;
  return {
    type: "prompt_snapshot",
    systemPrompt: [...s.systemPrompt],
    tools: snapshotToolEntries(s, n),
    ...(s.cliPrefix !== void 0 && { cliPrefix: s.cliPrefix }),
    ...(s.reminderFold !== void 0 && { reminderFold: s.reminderFold }),
    ...pickWireShape(y$o(s.wireShape)),
    ...(s.echoWireToolInputs !== void 0 && { echoWireToolInputs: s.echoWireToolInputs }),
    ...(s.contextRendering !== void 0 && { contextRendering: s.contextRendering }),
  };
}
//@ chunk-e6aww6q8.js:120369-120451 placement
function _$o() {
  return { type: "prompt_render_point", cause: "set_model_system_prompt" };
}
//@ chunk-e6aww6q8.js:120451-120494 placement
function Tbt(e) {
  return e3n(e) ? _$o() : void 0;
}
//@ chunk-e6aww6q8.js:120494-120559 placement
function e3n(e) {
  return e.findLastIndex(Qio) > e.findLastIndex(FFe);
}
/**
 * 判断最近的提示词快照是否包含给定系统提示词的全部分段。
 */
//@ chunk-e6aww6q8.js:120559-120746 placement
function snapshotContainsPrompt(e, n) {
  try {
    let r = latestPromptSnapshot(e),
      s = typeof n === "string" ? splitSystemPromptAtBoundary(n) : n;
    if (r === void 0 || s === void 0 || s.length === 0) return !1;
    return s.every((h) => r.systemPrompt.includes(h));
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-e6aww6q8.js:120746-120800 placement
function b$o(e) {
  return e.filter(FFe).map((n) => n.uuid);
}
//@ chunk-e6aww6q8.js:120800-121010 placement
function extractTaggedBlock(e, n) {
  let r = `</${n}>`,
    filtered = [`<${n}>`, `<${n} `].map((S) => e?.indexOf(S) ?? -1).filter((S) => S !== -1),
    h = filtered.length === 0 ? -1 : Math.min(...filtered),
    y = e?.lastIndexOf(r) ?? -1;
  return h === -1 || y < h ? void 0 : e?.slice(h, y + r.length);
}
/**
 * 比较快照中最后一段系统提示词与当前提示词里各标签块的内容，返回出现、消失或变化。
 */
//@ chunk-e6aww6q8.js:121010-121244 placement
function tagBlockChange(e, n, r) {
  try {
    let s = latestPromptSnapshot(e);
    if (s === void 0 || e3n(e)) return;
    let at = s.systemPrompt.at(-1);
    for (let y of r) {
      let S = extractTaggedBlock(n, y),
        w = extractTaggedBlock(at, y);
      if (S !== w) return w === void 0 ? "appeared" : S === void 0 ? "vanished" : "changed";
    }
    return;
  } catch (error) {
    logError(error);
    return;
  }
}
/**
 * 判断是否记录系统提示词快照：显式设置优先，后台会话、远程会话或特定条件下默认记录。
 */
//@ chunk-e6aww6q8.js:121244-121400 placement
function shouldSnapshotSystemPrompt(e) {
  if (e.systemPromptSnapshot === !1) return !1;
  return (
    e.systemPromptSnapshot === !0 || env.CLAUDE_CODE_SESSION_KIND === "bg" || env.CLAUDE_CODE_REMOTE || !GFe()
  );
}
//@ chunk-e6aww6q8.js:121400-121442 placement
function t3n(e) {
  return gn(e.join("\x00"));
}
//@ chunk-e6aww6q8.js:121442-121674 placement
var deferredToolsAttachmentSchema = DoctorLazy(() =>
    u({
      entries: hu((e) => Array.isArray(e)),
      nameOnlyAnnouncements: A(o()).optional(),
      strippedReferences: A(o()).optional(),
      toolInputCopies: A(oe())
        .optional()
        .catch(void 0),
    }),
  ),
  toolInputCopySchema = DoctorLazy(() => u({ id: o(), copy: U(["wire", "displayed"]) }));
//@ chunk-e6aww6q8.js:121674-121764 placement
function tao(e) {
  return e.type === "attachment" && e.attachment.type === "deferred_tools_record";
}
/**
 * 汇总消息中延迟工具附件记录的内容：工具条目、仅名称公告、已剥离引用与工具输入副本形态；解析出错时清空并记日志。
 */
//@ chunk-e6aww6q8.js:121764-122325 placement
function recordedDeferredTools(messages) {
  let entries = new Map(),
    nameOnlyAnnouncements = new Set(),
    strippedReferences = new Set(),
    toolInputCopies = new Map();
  try {
    for (let message of messages) {
      if (!tao(message)) continue;
      let parsed = deferredToolsAttachmentSchema().safeParse(message.attachment).data;
      for (let w of parsed?.entries ?? [])
        if (isPlainObject_4(w)) {
          let L = w.name;
          if (typeof L === "string") entries.set(L, w);
        }
      for (let w of parsed?.nameOnlyAnnouncements ?? []) nameOnlyAnnouncements.add(w);
      for (let w of parsed?.strippedReferences ?? []) strippedReferences.add(w);
      for (let w of parsed?.toolInputCopies ?? []) {
        let L = toolInputCopySchema().safeParse(w).data;
        if (L !== void 0) toolInputCopies.set(L.id, L.copy);
      }
    }
  } catch (error) {
    (logError(error),
      entries.clear(),
      nameOnlyAnnouncements.clear(),
      strippedReferences.clear(),
      toolInputCopies.clear());
  }
  return {
    entries: entries,
    nameOnlyAnnouncements: nameOnlyAnnouncements,
    strippedReferences: strippedReferences,
    toolInputCopies: toolInputCopies,
  };
}

export {
  latestPromptSnapshot,
  j_e,
  recordedDeferredTools,
  met,
  b$o,
  shouldSnapshotSystemPrompt,
  snapshotContainsPrompt,
  tagBlockChange,
  buildPromptSnapshotAttachment,
  Tbt,
  isNullRenderingAttachment,
  qun,
  t3n,
  pickWireShape,
  e3n,
  snapshotToolEntries,
  y$o,
  _$o,
};
