/**
 * plugins/functionHooks/api/sessionAppend.ts
 *
 * $.session.append：向会话追加消息块的校验（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3xb70ww4.js (23)
 * attribution: placement 23
 */
import { randomUUID } from "crypto";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { kt, T, o, Ue, A, M } from "../../../../vendor/zod/v4/classic/schemas.js";
import {
  createSystemMessage,
  createUserMessage,
  attachmentToMessages,
  DKr,
} from "../../../utils/messages.js";
import { vBr } from "../sessionApi.js";
import { isNonConversationMessage } from "../../../bootstrap/sessionSlices.js";
import { Vt } from "../../../utils/agentId.js";
import { HooksError } from "../hooksErrors.js";
import { safeDeepEqual } from "../apiDispatch.js";
import { KEYLESS_BLOCK_TYPES } from "../../../services/api/claude.js";
import { contentBlockStableKeys } from "../../../engine/renderedRows.js";
import { count } from "../../../utils/collections.js";
import { NO_CONTENT_MESSAGE } from "../../../constants/messages.js";

//@ chunk-3xb70ww4.js:474-526 placement
var NNt = DoctorLazy(() => kt({ type: T("text"), text: o().min(1) }));
//@ chunk-3xb70ww4.js:526-585 placement
var Two = (t) => (t.kind === "plugin" && "name" in t ? t.name : void 0);
//@ chunk-3xb70ww4.js:585-1408 placement
function checkAppendBlock(t, e) {
  let { message: message } = t,
    flattened = message.content.flatMap((s) => {
      let safeParse = NNt().safeParse(s);
      return safeParse.success ? [safeParse.data.text] : [];
    }),
    found = message.content.find((s) => s.type !== "text");
  if (found !== void 0 || flattened.length !== message.content.length)
    return {
      reason: `a ${found?.type ?? "text"} block the conversation does not take from a plugin (a row a plugin appends carries text blocks)`,
    };
  if (message.type === "system") {
    let [s] = flattened;
    return s !== void 0 && flattened.length === 1
      ? { row: { ...createSystemMessage(s, "info"), uuid: e } }
      : { reason: "a notice that is not one text block" };
  }
  let f = message.type === "user" && message.isMeta === !0,
    m = Two(t.origin);
  return f
    ? {
        row: createUserMessage({
          content: flattened.map((s) => ({ type: "text", text: s })),
          isMeta: !0,
          uuid: e,
          ...(m !== void 0 && { origin: { kind: "plugin", name: m } }),
        }),
      }
    : {
        reason:
          `a ${message.type} row` +
          (message.type === "user" ? " that is not isMeta" : "") +
          " (a plugin appends a user-role isMeta row or a system notice; a prompt is $.prompt.submit)",
      };
}
/**
 * $.session.append 被拒原因：会话不允许插件塑形、会话不保留对话、或指定 agent 没有运行中的循环。
 */
//@ chunk-3xb70ww4.js:1408-1600 placement
function describeAppendRefusal(t, e) {
  let n = t ?? "main";
  if (e) return `${n} is a conversation no plugin may shape`;
  if (t === void 0) return "this session keeps no conversation to append to";
  return `no running loop is ${t}`;
}
/**
 * 把附件展开为 {content} 消息列表。
 */
//@ chunk-3xb70ww4.js:1600-1669 placement
var attachmentToContents = (t) =>
  attachmentToMessages(t).messages.map((message) => ({ content: message.message.content }));
/**
 * 取消息内容中的全部文本片段。
 */
//@ chunk-3xb70ww4.js:1669-1777 placement
function contentTextParts(t) {
  let { content: content } = t;
  return typeof content === "string"
    ? [content]
    : content.flatMap((r) => (r.type === "text" ? [r.text] : []));
}
/**
 * 取系统消息的 content 文本（非空字符串时）。
 */
//@ chunk-3xb70ww4.js:1777-1874 placement
function systemMessageText(t) {
  let e = "content" in t ? t.content : void 0;
  return typeof e === "string" && e !== "" ? e : void 0;
}
/**
 * 把各类消息（user/assistant/attachment/system）转成纯文本块列表。
 */
//@ chunk-3xb70ww4.js:1874-2112 placement = sanitizeFileName (1)
function messageToTextBlocks(message) {
  switch (message.type) {
    case "user":
    case "assistant":
      return vBr(message.message.content);
    case "attachment":
      return attachmentToContents(message)
        .flatMap(contentTextParts)
        .map((e) => ({ type: "text", text: e }));
    case "system": {
      let e = systemMessageText(message);
      return e === void 0 ? [] : [{ type: "text", text: e }];
    }
  }
}
/**
 * 生成消息的摘要描述（type、name、role、isMeta 等），用于导出/调试。
 */
//@ chunk-3xb70ww4.js:2112-2390 placement
function summarizeMessageForExport(message) {
  let e = message.type === "attachment",
    n = message.type === "system",
    r = e ? message.attachment.type : n ? message.subtype : void 0,
    i = !isNonConversationMessage(message),
    f = message.type === "assistant" ? "assistant" : "user",
    m = "isMeta" in message && message.isMeta === !0;
  return {
    type: message.type,
    ...(r !== void 0 && { name: r }),
    ...(i && { role: f }),
    ...(m && { isMeta: !0 }),
    content: messageToTextBlocks(message),
  };
}
/**
 * 判断要追加的内容是否全为文本块（且该来源允许）。
 */
//@ chunk-3xb70ww4.js:2390-2501 placement
var isTextOnlyAppend = (t, e) =>
  !DKr(t) &&
  e.length > 0 &&
  e.every(({ content: content }) => typeof content === "string" || content.every((r) => r.type === "text"));
//@ chunk-3xb70ww4.js:2501-2887 placement
async function refuseSessionAppend(t, e) {
  let r = e?.isHookable === !0 ? e : void 0,
    i = Vt(t.uuid),
    f = describeAppendRefusal(t.agentId, e !== void 0),
    s =
      i !== null && r !== void 0
        ? checkAppendBlock(t, i)
        : { reason: i === null ? "a uuid the engine did not mint" : f };
  if (r === void 0 || "reason" in s) {
    let u = "reason" in s ? s.reason : f;
    throw new HooksError(`$.session.append: refused: ${u}`);
  }
  return (
    (r.keepArrived ?? r.keep)([s.row]),
    r.arrived([s.row]),
    { message: summarizeMessageForExport(s.row), uuid: s.row.uuid }
  );
}
//@ chunk-3xb70ww4.js:3238-3268 placement
var Pwo = DoctorLazy(() => kt({ type: o() }));
/**
 * 从数组中筛出带 type 字段的块，非数组返回空数组。
 */
//@ chunk-3xb70ww4.js:3268-3373 placement
var parseTypedBlocks = (t) =>
  Array.isArray(t)
    ? t.flatMap((e) => {
        let safeParse = Pwo().safeParse(e);
        return safeParse.success ? [safeParse.data] : [];
      })
    : [];
//@ chunk-3xb70ww4.js:3373-3471 placement
var rQe = (t, e) =>
  e.flatMap((n) => {
    let r = n.kind === "text" ? n.text : t[n.index];
    return r === void 0 ? [] : [r];
  });
/**
 * 把插件返回的内容与原块对齐：能在原内容中找到相同块的保留原块，其余只接受文本块。
 */
//@ chunk-3xb70ww4.js:3471-3760 placement
function reconcileAppendContent(t, e) {
  if (e === void 0 || typeof e === "string") return e ?? t;
  let n = Array.isArray(t) ? t : [],
    r = new Set();
  return e.flatMap((i) => {
    let index = n.findIndex((u, x) => !r.has(x) && safeDeepEqual(u, i)),
      m = n[index],
      safeParse = NNt().safeParse(i);
    if (m !== void 0) return (r.add(index), [m]);
    return safeParse.success ? [{ type: "text", text: safeParse.data.text }] : [];
  });
}
//@ chunk-3xb70ww4.js:3760-3824 placement = hasThinkingContent (1)
var THINKING_AND_RESULT_TYPES = new Set(["thinking", "redacted_thinking", "tool_result"]);
/**
 * 在追加的内容块中找出与给定块对应的那一块（已匹配的跳过）；找不到时按 tool_result 形状解析。
 */
//@ chunk-3xb70ww4.js:3824-4037 placement
function matchAppendBlock(t, e, n) {
  let index = e.findIndex((f, m) => !n.has(m) && KEYLESS_BLOCK_TYPES.has(f.type) && safeDeepEqual(f, t));
  if (index !== -1) return (n.add(index), { kind: "raised", index: index });
  let safeParse = NNt().safeParse(t);
  return safeParse.success ? { kind: "text", text: safeParse.data.text } : void 0;
}
//@ chunk-3xb70ww4.js:4037-4049 placement
var A1n = "^";
//@ chunk-3xb70ww4.js:4049-4134 placement
var Mwo = (t, e, n) => ({ kind: "tool-result", index: t, ...(e !== void 0 && { content: e }), isError: n });
/**
 * session.append 中 tool_result 块的 schema（content 为字符串或块列表，is_error 可选）。
 */
//@ chunk-3xb70ww4.js:4134-4248 placement
var toolResultBlockSchema = DoctorLazy(() =>
  kt({
    type: T("tool_result"),
    content: Ue([o(), A(kt({ type: o() }))]).optional(),
    is_error: M().optional(),
  }),
);
/**
 * 把追加的 tool_result 解析为结果记录；形状不合法时视为原样引发的块。
 */
//@ chunk-3xb70ww4.js:4248-4375 placement
function parseAppendedToolResult(t, e, n) {
  let safeParse = toolResultBlockSchema().safeParse(e);
  return safeParse.success
    ? Mwo(t, safeParse.data.content, safeParse.data.is_error ?? n)
    : { kind: "raised", index: t };
}
//@ chunk-3xb70ww4.js:4375-5262 placement
function normalizeAppendedToolResult(t, e) {
  if (t.length === 0) return [];
  let n = contentBlockStableKeys(t),
    r = new Set(n.filter((a) => a !== void 0)),
    filtered = n.filter((a, c) => a !== void 0 && t[c]?.type === "tool_result"),
    f = contentBlockStableKeys(e),
    m = count(e, (a) => a.type === "tool_result" && typeof a.tool_use_id !== "string") === filtered.length,
    s = new Map(),
    u = new Map(),
    x = new Set(),
    g = A1n,
    C = 0;
  e.forEach((a, c) => {
    let y = a.type === "tool_result" && typeof a.tool_use_id !== "string",
      d = y ? (m ? filtered[C++] : void 0) : f[c];
    if (d === void 0 && !y) {
      let O = matchAppendBlock(a, t, x),
        H = s.get(g) ?? [];
      if (O !== void 0) s.set(g, [...H, O]);
      return;
    }
    if (d === void 0 || !r.has(d)) return;
    if (((g = d), a.type === "tool_result")) u.set(d, a);
  });
  let index = t.findIndex((a) => !THINKING_AND_RESULT_TYPES.has(a.type)),
    h = index === -1 ? t.length : index,
    l = [];
  if (
    (t.forEach((a, c) => {
      if (c === h) l.push(...(s.get(A1n) ?? []));
      let y = n[c];
      if (y === void 0) return;
      let d = u.get(y);
      l.push(
        d === void 0 ? { kind: "raised", index: c } : parseAppendedToolResult(c, d, a.is_error === !0),
        ...(s.get(y) ?? []),
      );
    }),
    h === t.length)
  )
    l.push(...(s.get(A1n) ?? []));
  return l.length > 0 ? l : [{ kind: "text", text: NO_CONTENT_MESSAGE }];
}
/**
 * 把插件追加的消息构造成会话行：user 消息标为 meta，door=note，来源为插件，附 uuid 与可选 agentId。
 */
//@ chunk-3xb70ww4.js:5299-5501 placement
var buildPluginAppendRow = ({ message: message, agentId: agentId }, n) => ({
  message: {
    type: message.type,
    ...(message.type === "user" && { role: "user", isMeta: !0 }),
    content: message.content,
  },
  door: "note",
  origin: { kind: "plugin", name: n },
  uuid: randomUUID(),
  ...(agentId !== void 0 && { agentId: agentId }),
});

export {
  Pwo,
  THINKING_AND_RESULT_TYPES,
  A1n,
  NNt,
  toolResultBlockSchema,
  Mwo,
  messageToTextBlocks,
  summarizeMessageForExport,
  refuseSessionAppend,
  attachmentToContents,
  parseTypedBlocks,
  isTextOnlyAppend,
  checkAppendBlock,
  rQe,
  buildPluginAppendRow,
  Two,
  contentTextParts,
  normalizeAppendedToolResult,
  matchAppendBlock,
  systemMessageText,
  reconcileAppendContent,
  parseAppendedToolResult,
  describeAppendRefusal,
};
