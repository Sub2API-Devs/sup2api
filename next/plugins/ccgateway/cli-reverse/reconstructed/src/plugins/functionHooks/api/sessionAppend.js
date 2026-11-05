/**
 * plugins/functionHooks/api/sessionAppend.ts
 *
 * $.session.append：向会话追加消息块的校验（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-aka0gnqq.js (23)
 * attribution: placement 23
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  looseObject,
  literal,
  stringSchema,
  union,
  array,
  booleanSchema,
} from "../../../../vendor/zod/v4/classic/schemas.js";
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
import { KEYLESS_BLOCK_TYPES, contentBlockStableKeys } from "../../../engine/renderedRows.js";
import { countWhere } from "../../../utils/collections.js";
import { NO_CONTENT_MESSAGE } from "../../../constants/messages.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-aka0gnqq.js:474-526 placement
/**
 * text 块 schema
 */
var TEXT_BLOCK_SCHEMA; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aka0gnqq.js:474", () => {
  TEXT_BLOCK_SCHEMA = DoctorLazy(() =>
    looseObject({
      type: literal("text"),
      text: stringSchema().min(1),
    }),
  );
});
//@ chunk-aka0gnqq.js:526-585 placement
/**
 * 插件块的名字
 */
var pluginNameOf = (origin) => (origin.kind === "plugin" && "name" in origin ? origin.name : undefined);
//@ chunk-aka0gnqq.js:585-1408 placement
function checkAppendBlock(entry, uuid) {
  let { message } = entry;
  let flattened = message.content.flatMap((block) => {
    let parsed = TEXT_BLOCK_SCHEMA().safeParse(block);
    return parsed.success ? [parsed.data.text] : [];
  });
  let found = message.content.find((block) => block.type !== "text");
  if (found !== undefined || flattened.length !== message.content.length)
    return {
      reason: `a ${found?.type ?? "text"} block the conversation does not take from a plugin (a row a plugin appends carries text blocks)`,
    };
  if (message.type === "system") {
    let [found] = flattened;
    return found !== undefined && flattened.length === 1
      ? {
          row: {
            ...createSystemMessage(found, "info"),
            uuid,
          },
        }
      : {
          reason: "a notice that is not one text block",
        };
  }
  let reason = message.type === "user" && message.isMeta === true;
  let extra = pluginNameOf(entry.origin);
  return reason
    ? {
        row: createUserMessage({
          content: flattened.map((text) => ({
            type: "text",
            text,
          })),
          isMeta: true,
          uuid,
          ...(extra !== undefined && {
            origin: {
              kind: "plugin",
              name: extra,
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
//@ chunk-aka0gnqq.js:1408-1600 placement
/**
 * $.session.append 被拒原因：会话不允许插件塑形、会话不保留对话、或指定 agent 没有运行中的循环。
 */
function describeAppendRefusal(agentId, hasMessage) {
  let label = agentId ?? "main";
  if (hasMessage) return `${label} is a conversation no plugin may shape`;
  if (agentId === undefined) return "this session keeps no conversation to append to";
  return `no running loop is ${agentId}`;
}
//@ chunk-aka0gnqq.js:1600-1669 placement
/**
 * 把附件展开为 {content} 消息列表。
 */
var attachmentToContents = (attachment) =>
  attachmentToMessages(attachment).messages.map((message) => ({
    content: message.message.content,
  }));
//@ chunk-aka0gnqq.js:1669-1777 placement
/**
 * 取消息内容中的全部文本片段。
 */
function contentTextParts(entry) {
  let { content } = entry;
  return typeof content === "string"
    ? [content]
    : content.flatMap((block) => (block.type === "text" ? [block.text] : []));
}
//@ chunk-aka0gnqq.js:1777-1874 placement
/**
 * 取系统消息的 content 文本（非空字符串时）。
 */
function systemMessageText(message) {
  let content = "content" in message ? message.content : undefined;
  return typeof content === "string" && content !== "" ? content : undefined;
}
//@ chunk-aka0gnqq.js:1874-2112 placement (2.1.88 match: sanitizeFileName, 1)
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
      let secondMessage = systemMessageText(message);
      return secondMessage === undefined
        ? []
        : [
            {
              type: "text",
              text: secondMessage,
            },
          ];
    }
  }
}
//@ chunk-aka0gnqq.js:2112-2390 placement
/**
 * 生成消息的摘要描述（type、name、role、isMeta 等），用于导出/调试。
 */
function summarizeMessageForExport(message) {
  let isAttachment = message.type === "attachment";
  let isSystem = message.type === "system";
  let subtype = isAttachment ? message.attachment.type : isSystem ? message.subtype : undefined;
  let isConversation = !isNonConversationMessage(message);
  let role = message.type === "assistant" ? "assistant" : "user";
  let isMeta = "isMeta" in message && message.isMeta === true;
  return {
    type: message.type,
    ...(subtype !== undefined && {
      name: subtype,
    }),
    ...(isConversation && {
      role,
    }),
    ...(isMeta && {
      isMeta: true,
    }),
    content: messageToTextBlocks(message),
  };
}
//@ chunk-aka0gnqq.js:2390-2501 placement
/**
 * 判断要追加的内容是否全为文本块（且该来源允许）。
 */
var isTextOnlyAppend = (type, contentBlocks) =>
  !isStreamingMetadataEvent(type) &&
  contentBlocks.length > 0 &&
  contentBlocks.every(
    ({ content }) => typeof content === "string" || content.every((block) => block.type === "text"),
  );
//@ chunk-aka0gnqq.js:2501-2887 placement
async function refuseSessionAppend(entry, info) {
  let hookable = info?.isHookable === true ? info : undefined;
  let uuid = normalizeUuidOrNull(entry.uuid);
  let refusal = describeAppendRefusal(entry.agentId, info !== undefined);
  let check =
    uuid !== null && hookable !== undefined
      ? checkAppendBlock(entry, uuid)
      : {
          reason: uuid === null ? "a uuid the engine did not mint" : refusal,
        };
  if (hookable === undefined || "reason" in check) {
    let reasonText = "reason" in check ? check.reason : refusal;
    throw new HooksError(`$.session.append: refused: ${reasonText}`);
  }
  (hookable.keepArrived ?? hookable.keep)([check.row]);
  hookable.arrived([check.row]);
  return {
    message: summarizeMessageForExport(check.row),
    uuid: check.row.uuid,
  };
}
//@ chunk-aka0gnqq.js:3238-3268 placement
/**
 * 带 type 的块 schema
 */
var TYPED_BLOCK_SCHEMA; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aka0gnqq.js:3238", () => {
  TYPED_BLOCK_SCHEMA = DoctorLazy(() =>
    looseObject({
      type: stringSchema(),
    }),
  );
});
//@ chunk-aka0gnqq.js:3268-3373 placement
/**
 * 从数组中筛出带 type 字段的块，非数组返回空数组。
 */
var parseTypedBlocks = (content) =>
  Array.isArray(content)
    ? content.flatMap((raw) => {
        let parsed = TYPED_BLOCK_SCHEMA().safeParse(raw);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
//@ chunk-aka0gnqq.js:3373-3471 placement
/**
 * 按索引取块
 */
var resolveBlocks = (content, blocks) =>
  blocks.flatMap((block) => {
    let resolved = block.kind === "text" ? block.text : content[block.index];
    return resolved === undefined ? [] : [resolved];
  });
//@ chunk-aka0gnqq.js:3471-3760 placement
/**
 * 把插件返回的内容与原块对齐：能在原内容中找到相同块的保留原块，其余只接受文本块。
 */
function reconcileAppendContent(original, next) {
  if (next === undefined || typeof next === "string") return next ?? original;
  let originalBlocks = Array.isArray(original) ? original : [];
  let usedIndices = new Set();
  return next.flatMap((block) => {
    let index = originalBlocks.findIndex(
      (candidate, candidateIndex) => !usedIndices.has(candidateIndex) && safeDeepEqual(candidate, block),
    );
    let matched = originalBlocks[index];
    let textBlock = TEXT_BLOCK_SCHEMA().safeParse(block);
    if (matched !== undefined) {
      usedIndices.add(index);
      return [matched];
    }
    return textBlock.success
      ? [
          {
            type: "text",
            text: textBlock.data.text,
          },
        ]
      : [];
  });
}
//@ chunk-aka0gnqq.js:3760-3824 placement
var THINKING_AND_RESULT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aka0gnqq.js:3760", () => {
  THINKING_AND_RESULT_TYPES = new Set(["thinking", "redacted_thinking", "tool_result"]);
});
//@ chunk-aka0gnqq.js:3824-4037 placement
/**
 * 在追加的内容块中找出与给定块对应的那一块（已匹配的跳过）；找不到时按 tool_result 形状解析。
 */
function matchAppendBlock(block, content, used) {
  let index = content.findIndex(
    (secondBlock, candidateIndex) =>
      !used.has(candidateIndex) &&
      KEYLESS_BLOCK_TYPES.has(secondBlock.type) &&
      safeDeepEqual(secondBlock, block),
  );
  if (index !== -1) {
    used.add(index);
    return {
      kind: "raised",
      index,
    };
  }
  let textBlock = TEXT_BLOCK_SCHEMA().safeParse(block);
  return textBlock.success
    ? {
        kind: "text",
        text: textBlock.data.text,
      }
    : undefined;
}
//@ chunk-aka0gnqq.js:4037-4049 placement
/**
 * 会话块排序表里表示「列表开头」的键 "^"，用于把已应答的工具结果块插到第一个不可改写块之前或消息末尾。
 */
var START_KEY = "^";
//@ chunk-aka0gnqq.js:4049-4134 placement
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
//@ chunk-aka0gnqq.js:4134-4248 placement
/**
 * session.append 中 tool_result 块的 schema（content 为字符串或块列表，is_error 可选）。
 */
var toolResultBlockSchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aka0gnqq.js:4134", () => {
  toolResultBlockSchema = DoctorLazy(() =>
    looseObject({
      type: literal("tool_result"),
      content: union([
        stringSchema(),
        array(
          looseObject({
            type: stringSchema(),
          }),
        ),
      ]).optional(),
      is_error: booleanSchema().optional(),
    }),
  );
});
//@ chunk-aka0gnqq.js:4248-4375 placement
/**
 * 把追加的 tool_result 解析为结果记录；形状不合法时视为原样引发的块。
 */
function parseAppendedToolResult(index, result, isError) {
  let parsed = toolResultBlockSchema().safeParse(result);
  return parsed.success
    ? toolResultBlock(index, parsed.data.content, parsed.data.is_error ?? isError)
    : {
        kind: "raised",
        index,
      };
}
//@ chunk-aka0gnqq.js:4375-5262 placement
function normalizeAppendedToolResult(original, typedBlocks) {
  if (original.length === 0) return [];
  let stableKeys = contentBlockStableKeys(original);
  let knownKeys = new Set(stableKeys.filter((key) => key !== undefined));
  let filtered = stableKeys.filter(
    (key, index) => key !== undefined && original[index]?.type === "tool_result",
  );
  let nextKeys = contentBlockStableKeys(typedBlocks);
  let allToolResultsKeyless =
    countWhere(
      typedBlocks,
      (block) => block.type === "tool_result" && typeof block.tool_use_id !== "string",
    ) === filtered.length;
  let raisedAfter = new Map();
  let toolResultByKey = new Map();
  let usedIndices = new Set();
  let currentKey = START_KEY;
  let keylessCount = 0;
  typedBlocks.forEach((block, index) => {
    let isKeylessResult = block.type === "tool_result" && typeof block.tool_use_id !== "string";
    let key = isKeylessResult
      ? allToolResultsKeyless
        ? filtered[keylessCount++]
        : undefined
      : nextKeys[index];
    if (key === undefined && !isKeylessResult) {
      let raised = matchAppendBlock(block, original, usedIndices);
      let existing = raisedAfter.get(currentKey) ?? [];
      if (raised !== undefined) raisedAfter.set(currentKey, [...existing, raised]);
      return;
    }
    if (key === undefined || !knownKeys.has(key)) return;
    currentKey = key;
    if (block.type === "tool_result") toolResultByKey.set(key, block);
  });
  let index = original.findIndex((block) => !THINKING_AND_RESULT_TYPES.has(block.type));
  let insertAt = index === -1 ? original.length : index;
  let out = [];
  original.forEach((block, index) => {
    if (index === insertAt) out.push(...(raisedAfter.get(START_KEY) ?? []));
    let key = stableKeys[index];
    if (key === undefined) return;
    let resultBlock = toolResultByKey.get(key);
    out.push(
      resultBlock === undefined
        ? {
            kind: "raised",
            index,
          }
        : parseAppendedToolResult(index, resultBlock, block.is_error === true),
      ...(raisedAfter.get(key) ?? []),
    );
  });
  if (insertAt === original.length) out.push(...(raisedAfter.get(START_KEY) ?? []));
  return out.length > 0
    ? out
    : [
        {
          kind: "text",
          text: NO_CONTENT_MESSAGE,
        },
      ];
}
//@ chunk-aka0gnqq.js:5299-5501 placement
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
  buildPluginAppendRow,
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
  pluginNameOf,
  contentTextParts,
  normalizeAppendedToolResult,
  matchAppendBlock,
  systemMessageText,
  reconcileAppendContent,
  parseAppendedToolResult,
  describeAppendRefusal,
};
