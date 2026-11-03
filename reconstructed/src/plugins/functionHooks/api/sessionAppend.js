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
import { looseObject, literal, string, union, array, M } from "../../../../vendor/zod/v4/classic/schemas.js";
import {
  createSystemMessage,
  createUserMessage,
  attachmentToMessages,
  isStreamingMetadataEvent,
} from "../../../utils/messages.js";
import { normalizeContentBlocks_2 } from "../sessionApi.js";
import { isNonConversationMessage } from "../../../bootstrap/sessionSlices.js";
import { normalizeUuidOrNull } from "../../../utils/agentId.js";
import { HooksError } from "../hooksErrors.js";
import { safeDeepEqual } from "../apiDispatch.js";
import { KEYLESS_BLOCK_TYPES } from "../../../services/api/claude.js";
import { contentBlockStableKeys } from "../../../engine/renderedRows.js";
import { count } from "../../../utils/collections.js";
import { NO_CONTENT_MESSAGE } from "../../../constants/messages.js";

//@ chunk-3xb70ww4.js:474-526 placement
/**
 * text 块 schema
 */
var TEXT_BLOCK_SCHEMA = DoctorLazy(() =>
  looseObject({
    type: literal("text"),
    text: string().min(1),
  }),
);
//@ chunk-3xb70ww4.js:526-585 placement
/**
 * 插件块的名字
 */
var pluginNameOf = (origin) => (origin.kind === "plugin" && "name" in origin ? origin.name : undefined);
//@ chunk-3xb70ww4.js:585-1408 placement
function checkAppendBlock(t, uuid) {
  let { message } = t;
  let flattened = message.content.flatMap((s) => {
    let u = TEXT_BLOCK_SCHEMA().safeParse(s);
    return u.success ? [u.data.text] : [];
  });
  let found = message.content.find((s) => s.type !== "text");
  if (found !== undefined || flattened.length !== message.content.length)
    return {
      reason: `a ${found?.type ?? "text"} block the conversation does not take from a plugin (a row a plugin appends carries text blocks)`,
    };
  if (message.type === "system") {
    let [s] = flattened;
    return s !== undefined && flattened.length === 1
      ? {
          row: {
            ...createSystemMessage(s, "info"),
            uuid,
          },
        }
      : {
          reason: "a notice that is not one text block",
        };
  }
  let f = message.type === "user" && message.isMeta === true;
  let m = pluginNameOf(t.origin);
  return f
    ? {
        row: createUserMessage({
          content: flattened.map((text) => ({
            type: "text",
            text,
          })),
          isMeta: true,
          uuid,
          ...(m !== undefined && {
            origin: {
              kind: "plugin",
              name: m,
            },
          }),
        }),
      }
    : {
        reason:
          `a ${message.type} row` +
          (message.type === "user" ? " that is not isMeta" : "") +
          " (a plugin appends a user-role isMeta row or a system notice; a prompt is $.prompt.submit)",
      };
}
//@ chunk-3xb70ww4.js:1408-1600 placement
/**
 * $.session.append 被拒原因：会话不允许插件塑形、会话不保留对话、或指定 agent 没有运行中的循环。
 */
function describeAppendRefusal(agentId, e) {
  let n = agentId ?? "main";
  if (e) return `${n} is a conversation no plugin may shape`;
  if (agentId === undefined) return "this session keeps no conversation to append to";
  return `no running loop is ${agentId}`;
}
//@ chunk-3xb70ww4.js:1600-1669 placement
/**
 * 把附件展开为 {content} 消息列表。
 */
var attachmentToContents = (t) =>
  attachmentToMessages(t).messages.map((message) => ({
    content: message.message.content,
  }));
//@ chunk-3xb70ww4.js:1669-1777 placement
/**
 * 取消息内容中的全部文本片段。
 */
function contentTextParts(t) {
  let { content } = t;
  return typeof content === "string"
    ? [content]
    : content.flatMap((r) => (r.type === "text" ? [r.text] : []));
}
//@ chunk-3xb70ww4.js:1777-1874 placement
/**
 * 取系统消息的 content 文本（非空字符串时）。
 */
function systemMessageText(message) {
  let content = "content" in message ? message.content : undefined;
  return typeof content === "string" && content !== "" ? content : undefined;
}
//@ chunk-3xb70ww4.js:1874-2112 placement = sanitizeFileName (1)
/**
 * 把各类消息（user/assistant/attachment/system）转成纯文本块列表。
 */
function messageToTextBlocks(message) {
  switch (message.type) {
    case "user":
    case "assistant":
      return normalizeContentBlocks_2(message.message.content);
    case "attachment":
      return attachmentToContents(message)
        .flatMap(contentTextParts)
        .map((text) => ({
          type: "text",
          text,
        }));
    case "system": {
      let e = systemMessageText(message);
      return e === undefined
        ? []
        : [
            {
              type: "text",
              text: e,
            },
          ];
    }
  }
}
//@ chunk-3xb70ww4.js:2112-2390 placement
/**
 * 生成消息的摘要描述（type、name、role、isMeta 等），用于导出/调试。
 */
function summarizeMessageForExport(message) {
  let e = message.type === "attachment";
  let n = message.type === "system";
  let r = e ? message.attachment.type : n ? message.subtype : undefined;
  let i = !isNonConversationMessage(message);
  let role = message.type === "assistant" ? "assistant" : "user";
  let m = "isMeta" in message && message.isMeta === true;
  return {
    type: message.type,
    ...(r !== undefined && {
      name: r,
    }),
    ...(i && {
      role,
    }),
    ...(m && {
      isMeta: true,
    }),
    content: messageToTextBlocks(message),
  };
}
//@ chunk-3xb70ww4.js:2390-2501 placement
/**
 * 判断要追加的内容是否全为文本块（且该来源允许）。
 */
var isTextOnlyAppend = (type, e) =>
  !isStreamingMetadataEvent(type) &&
  e.length > 0 &&
  e.every(({ content }) => typeof content === "string" || content.every((r) => r.type === "text"));
//@ chunk-3xb70ww4.js:2501-2887 placement
async function refuseSessionAppend(t, e) {
  let r = e?.isHookable === true ? e : undefined;
  let uuid = normalizeUuidOrNull(t.uuid);
  let f = describeAppendRefusal(t.agentId, e !== undefined);
  let s =
    uuid !== null && r !== undefined
      ? checkAppendBlock(t, uuid)
      : {
          reason: uuid === null ? "a uuid the engine did not mint" : f,
        };
  if (r === undefined || "reason" in s) {
    let u = "reason" in s ? s.reason : f;
    throw new HooksError(`$.session.append: refused: ${u}`);
  }
  (r.keepArrived ?? r.keep)([s.row]);
  r.arrived([s.row]);
  return {
    message: summarizeMessageForExport(s.row),
    uuid: s.row.uuid,
  };
}
//@ chunk-3xb70ww4.js:3238-3268 placement
/**
 * 带 type 的块 schema
 */
var TYPED_BLOCK_SCHEMA = DoctorLazy(() =>
  looseObject({
    type: string(),
  }),
);
//@ chunk-3xb70ww4.js:3268-3373 placement
/**
 * 从数组中筛出带 type 字段的块，非数组返回空数组。
 */
var parseTypedBlocks = (content) =>
  Array.isArray(content)
    ? content.flatMap((e) => {
        let n = TYPED_BLOCK_SCHEMA().safeParse(e);
        return n.success ? [n.data] : [];
      })
    : [];
//@ chunk-3xb70ww4.js:3373-3471 placement
/**
 * 按索引取块
 */
var resolveBlocks = (t, e) =>
  e.flatMap((n) => {
    let r = n.kind === "text" ? n.text : t[n.index];
    return r === undefined ? [] : [r];
  });
//@ chunk-3xb70ww4.js:3471-3760 placement
/**
 * 把插件返回的内容与原块对齐：能在原内容中找到相同块的保留原块，其余只接受文本块。
 */
function reconcileAppendContent(t, e) {
  if (e === undefined || typeof e === "string") return e ?? t;
  let n = Array.isArray(t) ? t : [];
  let r = new Set();
  return e.flatMap((i) => {
    let index = n.findIndex((u, x) => !r.has(x) && safeDeepEqual(u, i));
    let m = n[index];
    let s = TEXT_BLOCK_SCHEMA().safeParse(i);
    if (m !== undefined) {
      r.add(index);
      return [m];
    }
    return s.success
      ? [
          {
            type: "text",
            text: s.data.text,
          },
        ]
      : [];
  });
}
//@ chunk-3xb70ww4.js:3760-3824 placement = hasThinkingContent (1)
var THINKING_AND_RESULT_TYPES = new Set(["thinking", "redacted_thinking", "tool_result"]);
//@ chunk-3xb70ww4.js:3824-4037 placement
/**
 * 在追加的内容块中找出与给定块对应的那一块（已匹配的跳过）；找不到时按 tool_result 形状解析。
 */
function matchAppendBlock(t, e, n) {
  let index = e.findIndex((f, m) => !n.has(m) && KEYLESS_BLOCK_TYPES.has(f.type) && safeDeepEqual(f, t));
  if (index !== -1) {
    n.add(index);
    return {
      kind: "raised",
      index,
    };
  }
  let i = TEXT_BLOCK_SCHEMA().safeParse(t);
  return i.success
    ? {
        kind: "text",
        text: i.data.text,
      }
    : undefined;
}
//@ chunk-3xb70ww4.js:4037-4049 placement
/**
 * 会话块排序表里表示「列表开头」的键 "^"，用于把已应答的工具结果块插到第一个不可改写块之前或消息末尾。
 */
var START_KEY = "^";
//@ chunk-3xb70ww4.js:4049-4134 placement
/**
 * 构造 tool-result 块
 */
var toolResultBlock = (index, content, isError) => ({
  kind: "tool-result",
  index,
  ...(content !== undefined && {
    content,
  }),
  isError,
});
//@ chunk-3xb70ww4.js:4134-4248 placement
/**
 * session.append 中 tool_result 块的 schema（content 为字符串或块列表，is_error 可选）。
 */
var toolResultBlockSchema = DoctorLazy(() =>
  looseObject({
    type: literal("tool_result"),
    content: union([
      string(),
      array(
        looseObject({
          type: string(),
        }),
      ),
    ]).optional(),
    is_error: M().optional(),
  }),
);
//@ chunk-3xb70ww4.js:4248-4375 placement
/**
 * 把追加的 tool_result 解析为结果记录；形状不合法时视为原样引发的块。
 */
function parseAppendedToolResult(index, e, n) {
  let r = toolResultBlockSchema().safeParse(e);
  return r.success
    ? toolResultBlock(index, r.data.content, r.data.is_error ?? n)
    : {
        kind: "raised",
        index,
      };
}
//@ chunk-3xb70ww4.js:4375-5262 placement
function normalizeAppendedToolResult(t, typedBlocks) {
  if (t.length === 0) return [];
  let n = contentBlockStableKeys(t);
  let r = new Set(n.filter((a) => a !== undefined));
  let filtered = n.filter((a, c) => a !== undefined && t[c]?.type === "tool_result");
  let f = contentBlockStableKeys(typedBlocks);
  let m =
    count(typedBlocks, (a) => a.type === "tool_result" && typeof a.tool_use_id !== "string") ===
    filtered.length;
  let s = new Map();
  let u = new Map();
  let x = new Set();
  let g = START_KEY;
  let C = 0;
  typedBlocks.forEach((a, c) => {
    let y = a.type === "tool_result" && typeof a.tool_use_id !== "string";
    let d = y ? (m ? filtered[C++] : undefined) : f[c];
    if (d === undefined && !y) {
      let O = matchAppendBlock(a, t, x);
      let H = s.get(g) ?? [];
      if (O !== undefined) s.set(g, [...H, O]);
      return;
    }
    if (d === undefined || !r.has(d)) return;
    g = d;
    if (a.type === "tool_result") u.set(d, a);
  });
  let index = t.findIndex((a) => !THINKING_AND_RESULT_TYPES.has(a.type));
  let h = index === -1 ? t.length : index;
  let l = [];
  t.forEach((a, c) => {
    if (c === h) l.push(...(s.get(START_KEY) ?? []));
    let y = n[c];
    if (y === undefined) return;
    let d = u.get(y);
    l.push(
      d === undefined
        ? {
            kind: "raised",
            index: c,
          }
        : parseAppendedToolResult(c, d, a.is_error === true),
      ...(s.get(y) ?? []),
    );
  });
  if (h === t.length) l.push(...(s.get(START_KEY) ?? []));
  return l.length > 0
    ? l
    : [
        {
          kind: "text",
          text: NO_CONTENT_MESSAGE,
        },
      ];
}
//@ chunk-3xb70ww4.js:5299-5501 placement
/**
 * 把插件追加的消息构造成会话行：user 消息标为 meta，door=note，来源为插件，附 uuid 与可选 agentId。
 */
var buildPluginAppendRow = ({ message, agentId }, name) => ({
  message: {
    type: message.type,
    ...(message.type === "user" && {
      role: "user",
      isMeta: true,
    }),
    content: message.content,
  },
  door: "note",
  origin: {
    kind: "plugin",
    name,
  },
  uuid: randomUUID(),
  ...(agentId !== undefined && {
    agentId,
  }),
});
export {
  TYPED_BLOCK_SCHEMA,
  THINKING_AND_RESULT_TYPES,
  START_KEY,
  TEXT_BLOCK_SCHEMA,
  toolResultBlockSchema,
  toolResultBlock,
  messageToTextBlocks,
  summarizeMessageForExport,
  refuseSessionAppend,
  attachmentToContents,
  parseTypedBlocks,
  isTextOnlyAppend,
  checkAppendBlock,
  resolveBlocks,
  buildPluginAppendRow,
  pluginNameOf,
  contentTextParts,
  normalizeAppendedToolResult,
  matchAppendBlock,
  systemMessageText,
  reconcileAppendContent,
  parseAppendedToolResult,
  describeAppendRefusal,
};
