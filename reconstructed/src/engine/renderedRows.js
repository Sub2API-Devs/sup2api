/**
 * engine/renderedRows.ts
 *
 * 2.1.316 新增：查询引擎的渲染行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1nk4j4sn.js (12), chunk-3xb70ww4.js (1)
 * attribution: placement 13
 */
import { Ar } from "../../runtime/bun-runtime.js";
import {
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
} from "../plugins/functionHooks/api/sessionAppend.js";
import {
  BOUNDARY_SUFFIX,
  COMMAND_ROW_TAGS,
  DELIVERY_ATTACHMENT_TYPES,
  appendInputOf,
  classifyMessageAuthor,
  appendedRow,
  callAppended,
  doorOf,
  isAppendable,
  lastTextOf,
  pluginAppended,
  rowsAppendedTo,
  countToolCallsSince,
  userDoorOf,
} from "./rowDoors.js";
import { KEYLESS_BLOCK_TYPES } from "../services/api/claude.js";
import { SESSION_APPEND_EVENT } from "../plugins/functionHooks/sessionHooks.js";
import { getToolUseIdOfMessage } from "../tools/utils.js";
import { appendCoreOf } from "./sessionAppend.js";
import { matcherDoors } from "../plugins/functionHooks/sites/uiSites.js";
import { safeDeepEqual } from "../plugins/functionHooks/apiDispatch.js";

//@ chunk-1nk4j4sn.js:12078-12087 placement
var U = {};
//@ chunk-1nk4j4sn.js:12087-13277 placement
Ar(U, {
  BLOCK_SCHEMA: () => Pwo,
  BOUNDARY_SUFFIX: () => BOUNDARY_SUFFIX,
  COMMAND_ROW_TAGS: () => COMMAND_ROW_TAGS,
  DELIVERY_ATTACHMENT_TYPES: () => DELIVERY_ATTACHMENT_TYPES,
  HEAD_BLOCK_TYPES: () => THINKING_AND_RESULT_TYPES,
  REWRITABLE_BLOCK_TYPES: () => KEYLESS_BLOCK_TYPES,
  SESSION_APPEND: () => SESSION_APPEND_EVENT,
  START_KEY: () => A1n,
  TEXT_BLOCK_SCHEMA: () => NNt,
  TOOL_RESULT_ANSWER_SCHEMA: () => toolResultBlockSchema,
  anchorKeysOf: () => contentBlockStableKeys,
  answeredBlockOf: () => answeredBlockOf,
  answeredPickOf: () => Mwo,
  answeredToolUseId: () => getToolUseIdOfMessage,
  appendContentOf: () => messageToTextBlocks,
  appendCoreOf: () => appendCoreOf,
  appendInputOf: () => appendInputOf,
  appendMessageOf: () => summarizeMessageForExport,
  appendOriginOf: () => classifyMessageAuthor,
  appendedRow: () => appendedRow,
  appendedTo: () => refuseSessionAppend,
  assistantContentOf: () => assistantContentOf,
  attachmentRenderingsOf: () => attachmentToContents,
  callAppended: () => callAppended,
  candidateBlocksOf: () => parseTypedBlocks,
  default: () => U,
  doorOf: () => doorOf,
  doorsHeldTo: () => matcherDoors,
  filledRow: () => mergeMessageInPlace,
  isAppendable: () => isAppendable,
  isRewritableAttachment: () => isTextOnlyAppend,
  lastTextOf: () => lastTextOf,
  mintedRowOf: () => checkAppendBlock,
  pickTextOf: () => pickTextOf,
  pickedTextsOf: () => rQe,
  pluginAppendInputOf: () => buildPluginAppendRow,
  pluginAppended: () => pluginAppended,
  pluginNameOf: () => Two,
  renderedRowOf: () => renderedRowOf,
  renderingOf: () => renderingOf,
  renderingTextsOf: () => contentTextParts,
  renderingWithTexts: () => renderingWithTexts,
  restoredPicks: () => normalizeAppendedToolResult,
  rewritablePickOf: () => matchAppendBlock,
  rowWithContent: () => rowWithContent,
  rowsAppendedTo: () => rowsAppendedTo,
  systemTextOf: () => systemMessageText,
  toolNameOf: () => countToolCallsSince,
  toolResultContentOf: () => reconcileAppendContent,
  toolResultPickOf: () => parseAppendedToolResult,
  unboundReasonOf: () => describeAppendRefusal,
  userContentOf: () => userContentOf,
  userDoorOf: () => userDoorOf,
});
//@ chunk-1nk4j4sn.js:13277-13375 placement
var renderedRowOf = (e, o) => ({
  ...e,
  rendered: o,
  ...(e.attachment.type === "queued_command" && { renderedInHumanTurn: o }),
});
//@ chunk-1nk4j4sn.js:13375-13516 placement
var assistantContentOf = (e, o) =>
  o.flatMap((r) => {
    if (r.kind === "text") return [{ type: "text", text: r.text, citations: null }];
    let n = e[r.index];
    return n === void 0 ? [] : [n];
  });
//@ chunk-1nk4j4sn.js:13516-13622 placement
function renderingOf(e, o) {
  let [r] = e;
  return { content: o && e.length === 1 && r !== void 0 ? r : e.map((p) => ({ type: "text", text: p })) };
}
//@ chunk-1nk4j4sn.js:13622-13840 placement
function renderingWithTexts(e, o) {
  let mapped = e.map((s) => contentTextParts(s).length);
  if (o.length !== mapped.reduce((s, i) => s + i, 0)) return [renderingOf(o, o.length === 1)];
  let p = 0;
  return e.map((s, i) => {
    let a = mapped[i] ?? 0,
      sliced = o.slice(p, p + a);
    return ((p += a), renderingOf(sliced, typeof s.content === "string"));
  });
}
//@ chunk-1nk4j4sn.js:13840-14052 placement
function answeredBlockOf(e, o) {
  if (o.kind !== "tool-result" || e.type !== "tool_result") return e;
  let { is_error: is_error, ...p } = e,
    s = o.isError === (e.is_error === !0);
  return {
    ...(s ? e : p),
    content: reconcileAppendContent(e.content, o.content),
    ...(!s && o.isError && { is_error: !0 }),
  };
}
//@ chunk-1nk4j4sn.js:14052-14091 placement
var pickTextOf = (e, o) => (e?.kind === "text" ? e.text : o);
//@ chunk-1nk4j4sn.js:14091-14350 placement
function userContentOf(e, o) {
  let [r] = o,
    n = o.length === 1 && r?.kind !== "tool-result";
  return typeof e === "string"
    ? n
      ? pickTextOf(r, e)
      : o.map((s) => ({ type: "text", text: pickTextOf(s, e) }))
    : o.flatMap((s) => {
        if (s.kind === "text") return [{ type: "text", text: s.text }];
        let a = e[s.index];
        return a === void 0 ? [] : [answeredBlockOf(a, s)];
      });
}
//@ chunk-1nk4j4sn.js:14350-14430 placement
var k = (e, o) => (safeDeepEqual(o, e.message.content) ? e : { ...e, message: { ...e.message, content: o } });
//@ chunk-1nk4j4sn.js:14430-14869 placement
function rowWithContent(e, o) {
  let r = normalizeAppendedToolResult(messageToTextBlocks(e), parseTypedBlocks(o.content));
  switch (e.type) {
    case "user":
      return k(e, userContentOf(e.message.content, r));
    case "assistant":
      return k(e, assistantContentOf(e.message.content, r));
    case "attachment": {
      let n = attachmentToContents(e),
        p = rQe(n.flatMap(contentTextParts), r),
        s = renderingWithTexts(n, p);
      return !isTextOnlyAppend(e.attachment.type, n) || p.length === 0 || safeDeepEqual(s, n)
        ? e
        : renderedRowOf(e, s);
    }
    case "system": {
      if (!("content" in e) || typeof e.content !== "string") return e;
      let joined = rQe([e.content], r).join(`
`);
      return joined === e.content ? e : { ...e, content: joined };
    }
  }
}
/**
 * 用新消息内容覆盖旧消息（同类型时只换 content），返回旧对象。与 bridge 无关。
 */
//@ chunk-1nk4j4sn.js:14869-15092 placement = extractErrorDetail (1)
function mergeMessageInPlace(e, o) {
  let r = (e.type === "assistant" && o.type === "assistant") || (e.type === "user" && o.type === "user");
  if (e === o) return e;
  if (r && "message" in e && "message" in o) return ((e.message.content = o.message.content), e);
  return Object.assign(e, o);
}
/**
 * 为内容块生成稳定键：tool_use:<id>、tool_result:<tool_use_id>，其他块 type#序号；被忽略类型返回 undefined。
 */
//@ chunk-3xb70ww4.js:2932-3238 placement
function contentBlockStableKeys(t) {
  let e = new Map();
  return t.map((n) => {
    if (KEYLESS_BLOCK_TYPES.has(n.type)) return;
    if (n.type === "tool_use" && typeof n.id === "string") return `tool_use:${n.id}`;
    let tool_use_id = n.tool_use_id;
    if (n.type === "tool_result" && typeof tool_use_id === "string") return `tool_result:${tool_use_id}`;
    let i = e.get(n.type) ?? 0;
    return (e.set(n.type, i + 1), `${n.type}#${i}`);
  });
}

export { rowWithContent, mergeMessageInPlace, contentBlockStableKeys };
