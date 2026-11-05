/**
 * tools/ReadWidgetContextTool/widgetState.ts
 *
 * 按会话保存 view 状态的槽位：解析、去重、按内容变更记序号（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  array,
  unknown,
  union,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  MAX_SECRET_REDACT_CHARS,
  ENTRY_THREAD,
  TOOL_USE_ID_PATTERN,
  MAX_SECRET_LENGTH,
  TRANSCRIPT_PAGE_BYTES,
} from "../../constants/buildInfo.js";
import { hyphenateUltraKeyword } from "../../utils/ultraplan/keyword.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:126133-126234 placement
function isPlainAscii(text) {
  for (let index = 0; index < text.length; index++) {
    let code = text.charCodeAt(index);
    if (code < 32 || code === 127) return false;
  }
  return true;
}
//@ chunk-5xgkngpb.js:126234-126476 placement
var widgetStateSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var widgetStateContentSchema;
deferInit("chunk-5xgkngpb.js:126234", () => {
  widgetStateSchema = DoctorLazy(() =>
    objectSchema({
      tool_name: stringSchema().min(1).max(256).refine(isPlainAscii),
      content: array(unknown()).max(MAX_SECRET_REDACT_CHARS),
      view: stringSchema().max(256).nullish(),
      omitted: unknown().optional(),
    }),
  );
  widgetStateContentSchema = DoctorLazy(() =>
    array(
      union([
        objectSchema({
          type: literal("text"),
          text: stringSchema(),
        }),
        objectSchema({
          type: literal("image"),
          data: stringSchema(),
          media_type: stringSchema().max(255),
        }),
      ]),
    ),
  );
});
//@ chunk-5xgkngpb.js:126476-126534 placement
/**
 * 判断一个 view 标识是否可用：等于内置的 ENTRY_THREAD 常量，或匹配合法 view id 的正则。
 */
function isKnownViewId(view) {
  return view !== undefined && (view === ENTRY_THREAD || TOOL_USE_ID_PATTERN.test(view));
}
//@ chunk-5xgkngpb.js:126534-126564 placement
/**
 * 把 view id 去掉空白后的简写（内部直接调用 trim 工具函数）。
 */
function canonicalViewId(view) {
  return hyphenateUltraKeyword(view);
}
//@ chunk-5xgkngpb.js:126564-126848 placement
function parseWidgetState(raw) {
  let parsed = widgetStateSchema().safeParse(raw);
  if (!parsed.success) return null;
  let { tool_name: toolName, view, omitted } = parsed.data;
  let state = {
    tool_name: toolName,
    ...(view && {
      view,
    }),
  };
  if (omitted === "too_large")
    return {
      ...state,
      content: [],
      omitted: "too_large",
    };
  let content = widgetStateContentSchema().safeParse(parsed.data.content);
  return content.success
    ? {
        ...state,
        content: content.data,
      }
    : null;
}
//@ chunk-5xgkngpb.js:126848-126904 placement
/**
 * 生成 view 状态表的去重键：tool_name 与 view（无 view 时为空）用 NUL 连接。
 */
function widgetStateKey(state) {
  return `${state.tool_name}\x00${state.view ?? ""}`;
}
//@ chunk-5xgkngpb.js:126904-127256 placement
/**
 * 解析控制消息里的 tool_states：超 256 条或超 1 MiB 时整体丢弃并标记 overBounds，逐条校验后去重，返回状态与丢弃数。
 */
function parseWidgetStates(toolStates) {
  if (typeof toolStates !== "object" || toolStates === null) return;
  let list = Reflect.get(toolStates, "tool_states");
  if (!Array.isArray(list)) return;
  if (
    list.length > MAX_SECRET_LENGTH ||
    Buffer.byteLength(jsonStringify(list), "utf8") > TRANSCRIPT_PAGE_BYTES
  )
    return {
      states: [],
      overBounds: true,
      dropped: 0,
    };
  let byKey = new Map();
  let invalidCount = 0;
  for (let raw of list) {
    let state = parseWidgetState(raw);
    if (state === null) invalidCount++;
    else byKey.set(widgetStateKey(state), state);
  }
  return {
    states: [...byKey.values()],
    overBounds: false,
    dropped: invalidCount,
  };
}
//@ chunk-5xgkngpb.js:127256-127315 placement
/**
 * 把 tool_name 规整成安全的符号名（去掉非 [\w.-] 字符）并截断到 64 字符。
 */
function shortViewId(view) {
  return truncateToLength(hyphenateUltraKeyword(view.replace(/[^\w.-]/g, "")), 64);
}
//@ chunk-5xgkngpb.js:975277-975339 placement
/**
 * 按会话保存 view 状态与变更序号的槽位工厂。
 */
var sessionRootStatesSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:975277", () => {
  sessionRootStatesSlot = new SessionRootSlot(() => ({
    states: undefined,
    changedAt: new Map(),
    seq: 0,
  }));
});
//@ chunk-5xgkngpb.js:975339-975571 placement
/**
 * 用新状态替换会话里的 view 状态，内容未变的条目沿用旧变更序号，变更的取新序号。
 */
function setWidgetStates(sessionRoot, states) {
  let rootEntry = sessionRootStatesSlot.of(sessionRoot);
  let previousStatesById = new Map(
    (rootEntry.states ?? []).map((prevState) => [widgetStateKey(prevState), jsonStringify(prevState)]),
  );
  let nextChangedAt = new Map();
  for (let state of states) {
    let stateId = widgetStateKey(state);
    let previousChangedAt = rootEntry.changedAt.get(stateId);
    nextChangedAt.set(
      stateId,
      previousChangedAt !== undefined && previousStatesById.get(stateId) === jsonStringify(state)
        ? previousChangedAt
        : ++rootEntry.seq,
    );
  }
  rootEntry.changedAt = nextChangedAt;
  rootEntry.states = states.length ? states : undefined;
}
//@ chunk-5xgkngpb.js:975571-975687 placement
/**
 * 取会话中保存的 view 状态（只输出 view 字段），无状态时返回 undefined。
 */
function getWidgetStates(sessionRoot) {
  let states = sessionRootStatesSlot.peek(sessionRoot)?.states;
  return states?.length
    ? states.map((state) => ({
        ...(state.view !== undefined && {
          view: state.view,
        }),
      }))
    : undefined;
}
export {
  getWidgetStates,
  parseWidgetStates,
  setWidgetStates,
  isKnownViewId,
  canonicalViewId,
  sessionRootStatesSlot,
  widgetStateKey,
  shortViewId,
};
