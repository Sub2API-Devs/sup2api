/**
 * engine/renderedRows.ts
 *
 * 2.1.316 新增：查询引擎的渲染行。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8fb5jme0.js (12), chunk-aka0gnqq.js (2)
 * attribution: placement 13, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __export } from "../../runtime/bun-runtime.js";
import {
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
} from "../plugins/functionHooks/api/sessionAppend.js";
import {
  BOUNDARY_SUFFIX,
  COMMAND_ROW_TAGS,
  DELIVERY_ATTACHMENT_TYPES,
  appendInputOf,
  appendOriginOf,
  appendedRow,
  callAppended,
  doorOf,
  isAppendable,
  lastTextOf,
  pluginAppended,
  rowsAppendedTo,
  toolNameOf,
  userDoorOf,
} from "./rowDoors.js";
import { SESSION_APPEND_EVENT } from "../plugins/functionHooks/sessionHooks.js";
import { answeredToolUseId } from "../tools/utils.js";
import { appendCoreOf } from "./sessionAppend.js";
import { matcherDoors } from "../plugins/functionHooks/sites/uiSites.js";
import { safeDeepEqual } from "../plugins/functionHooks/apiDispatch.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-aka0gnqq.js:2887-2932 affinity
/**
 * text/image/document：contentBlockStableKeys 不为这几类生成键。旧版名 isMedia 为错配。
 */
var KEYLESS_BLOCK_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aka0gnqq.js:2887", () => {
  KEYLESS_BLOCK_TYPES = new Set(["text", "image", "document"]);
});
//@ chunk-aka0gnqq.js:2932-3238 placement
/**
 * 为内容块生成稳定键：tool_use:<id>、tool_result:<tool_use_id>，其他块 type#序号；被忽略类型返回 undefined。
 */
function contentBlockStableKeys(blocks) {
  let counts = new Map();
  return blocks.map((block) => {
    if (KEYLESS_BLOCK_TYPES.has(block.type)) return;
    if (block.type === "tool_use" && typeof block.id === "string") return `tool_use:${block.id}`;
    let toolUseId = block.tool_use_id;
    if (block.type === "tool_result" && typeof toolUseId === "string") return `tool_result:${toolUseId}`;
    let count = counts.get(block.type) ?? 0;
    counts.set(block.type, count + 1);
    return `${block.type}#${count}`;
  });
}
//@ chunk-8fb5jme0.js:13226-13235 placement
/**
 * 导出值：renderedRowsCache（空对象缓存）。
 */
var renderedRowsCache = {};
//@ chunk-8fb5jme0.js:13235-14425 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8fb5jme0.js:13235", () => {
  __export(renderedRowsCache, {
    BLOCK_SCHEMA: () => TYPED_BLOCK_SCHEMA,
    BOUNDARY_SUFFIX: () => BOUNDARY_SUFFIX,
    COMMAND_ROW_TAGS: () => COMMAND_ROW_TAGS,
    DELIVERY_ATTACHMENT_TYPES: () => DELIVERY_ATTACHMENT_TYPES,
    HEAD_BLOCK_TYPES: () => THINKING_AND_RESULT_TYPES,
    REWRITABLE_BLOCK_TYPES: () => KEYLESS_BLOCK_TYPES,
    SESSION_APPEND: () => SESSION_APPEND_EVENT,
    START_KEY: () => START_KEY,
    TEXT_BLOCK_SCHEMA: () => TEXT_BLOCK_SCHEMA,
    TOOL_RESULT_ANSWER_SCHEMA: () => toolResultBlockSchema,
    anchorKeysOf: () => contentBlockStableKeys,
    answeredBlockOf: () => answeredBlockOf,
    answeredPickOf: () => toolResultBlock,
    answeredToolUseId: () => answeredToolUseId,
    appendContentOf: () => messageToTextBlocks,
    appendCoreOf: () => appendCoreOf,
    appendInputOf: () => appendInputOf,
    appendMessageOf: () => summarizeMessageForExport,
    appendOriginOf: () => appendOriginOf,
    appendedRow: () => appendedRow,
    appendedTo: () => refuseSessionAppend,
    assistantContentOf: () => assistantContentOf,
    attachmentRenderingsOf: () => attachmentToContents,
    callAppended: () => callAppended,
    candidateBlocksOf: () => parseTypedBlocks,
    default: () => renderedRowsCache,
    doorOf: () => doorOf,
    doorsHeldTo: () => matcherDoors,
    filledRow: () => filledRow,
    isAppendable: () => isAppendable,
    isRewritableAttachment: () => isTextOnlyAppend,
    lastTextOf: () => lastTextOf,
    mintedRowOf: () => checkAppendBlock,
    pickTextOf: () => pickTextOf,
    pickedTextsOf: () => resolveBlocks,
    pluginAppendInputOf: () => buildPluginAppendRow,
    pluginAppended: () => pluginAppended,
    pluginNameOf: () => pluginNameOf,
    renderedRowOf: () => renderedRowOf,
    renderingOf: () => renderingOf,
    renderingTextsOf: () => contentTextParts,
    renderingWithTexts: () => renderingWithTexts,
    restoredPicks: () => normalizeAppendedToolResult,
    rewritablePickOf: () => matchAppendBlock,
    rowWithContent: () => rowWithContent,
    rowsAppendedTo: () => rowsAppendedTo,
    systemTextOf: () => systemMessageText,
    toolNameOf: () => toolNameOf,
    toolResultContentOf: () => reconcileAppendContent,
    toolResultPickOf: () => parseAppendedToolResult,
    unboundReasonOf: () => describeAppendRefusal,
    userContentOf: () => userContentOf,
    userDoorOf: () => userDoorOf,
  });
});
//@ chunk-8fb5jme0.js:14425-14523 placement
var renderedRowOf = (row, rendered) => ({
  ...row,
  rendered,
  ...(row.attachment.type === "queued_command" && {
    renderedInHumanTurn: rendered,
  }),
});
//@ chunk-8fb5jme0.js:14523-14664 placement
var assistantContentOf = (content, parts) =>
  parts.flatMap((part) => {
    if (part.kind === "text")
      return [
        {
          type: "text",
          text: part.text,
          citations: null,
        },
      ];
    let block = content[part.index];
    return block === undefined ? [] : [block];
  });
//@ chunk-8fb5jme0.js:14664-14770 placement
function renderingOf(texts, isSingleString) {
  let [first] = texts;
  return {
    content:
      isSingleString && texts.length === 1 && first !== undefined
        ? first
        : texts.map((text) => ({
            type: "text",
            text,
          })),
  };
}
//@ chunk-8fb5jme0.js:14770-14988 placement
function renderingWithTexts(contents, texts) {
  let mapped = contents.map((content) => contentTextParts(content).length);
  if (texts.length !== mapped.reduce((acc, count) => acc + count, 0))
    return [renderingOf(texts, texts.length === 1)];
  let offset = 0;
  return contents.map((content_, index) => {
    let take = mapped[index] ?? 0;
    let texts_2 = texts.slice(offset, offset + take);
    offset += take;
    return renderingOf(texts_2, typeof content_.content === "string");
  });
}
//@ chunk-8fb5jme0.js:14988-15200 placement
function answeredBlockOf(block, part) {
  if (part.kind !== "tool-result" || block.type !== "tool_result") return block;
  let { is_error: isError, ...withoutError } = block;
  let isErrorMatches = part.isError === (block.is_error === true);
  return {
    ...(isErrorMatches ? block : withoutError),
    content: reconcileAppendContent(block.content, part.content),
    ...(!isErrorMatches &&
      part.isError && {
        is_error: true,
      }),
  };
}
//@ chunk-8fb5jme0.js:15200-15239 placement
var pickTextOf = (part, fallback) => (part?.kind === "text" ? part.text : fallback);
//@ chunk-8fb5jme0.js:15239-15498 placement
function userContentOf(fallback, parts) {
  let [first] = parts;
  let isSingleText = parts.length === 1 && first?.kind !== "tool-result";
  return typeof fallback === "string"
    ? isSingleText
      ? pickTextOf(first, fallback)
      : parts.map((part) => ({
          type: "text",
          text: pickTextOf(part, fallback),
        }))
    : parts.flatMap((part) => {
        if (part.kind === "text")
          return [
            {
              type: "text",
              text: part.text,
            },
          ];
        let block = fallback[part.index];
        return block === undefined ? [] : [answeredBlockOf(block, part)];
      });
}
//@ chunk-8fb5jme0.js:15498-15578 placement
var withRewrittenContent = (message, content) =>
  safeDeepEqual(content, message.message.content)
    ? message
    : {
        ...message,
        message: {
          ...message.message,
          content,
        },
      };
//@ chunk-8fb5jme0.js:15578-16017 placement
function rowWithContent(row, message) {
  let appended = normalizeAppendedToolResult(messageToTextBlocks(row), parseTypedBlocks(message.content));
  switch (row.type) {
    case "user":
      return withRewrittenContent(row, userContentOf(row.message.content, appended));
    case "assistant":
      return withRewrittenContent(row, assistantContentOf(row.message.content, appended));
    case "attachment": {
      let contents = attachmentToContents(row);
      let blocks = resolveBlocks(contents.flatMap(contentTextParts), appended);
      let rendering = renderingWithTexts(contents, blocks);
      return !isTextOnlyAppend(row.attachment.type, contents) ||
        blocks.length === 0 ||
        safeDeepEqual(rendering, contents)
        ? row
        : renderedRowOf(row, rendering);
    }
    case "system": {
      if (!("content" in row) || typeof row.content !== "string") return row;
      let joined = resolveBlocks([row.content], appended).join(`
`);
      return joined === row.content
        ? row
        : {
            ...row,
            content: joined,
          };
    }
  }
}
//@ chunk-8fb5jme0.js:16017-16240 placement (2.1.88 match: extractErrorDetail, 1)
/**
 * 用新消息内容覆盖旧消息（同类型时只换 content），返回旧对象。与 bridge 无关。
 */
function filledRow(target, source) {
  let sameKind =
    (target.type === "assistant" && source.type === "assistant") ||
    (target.type === "user" && source.type === "user");
  if (target === source) return target;
  if (sameKind && "message" in target && "message" in source) {
    target.message.content = source.message.content;
    return target;
  }
  return Object.assign(target, source);
}
export {
  rowWithContent,
  filledRow,
  KEYLESS_BLOCK_TYPES,
  contentBlockStableKeys,
  answeredBlockOf,
  assistantContentOf,
  renderedRowsCache,
  pickTextOf,
  renderedRowOf,
  renderingOf,
  renderingWithTexts,
  userContentOf,
};
