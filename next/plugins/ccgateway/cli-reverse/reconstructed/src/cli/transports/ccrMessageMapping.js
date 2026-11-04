/**
 * cli/transports/ccrMessageMapping.ts
 *
 * 2.1.316 新增：消息映射到 CCR（云端会话）格式：媒体、工具结果与转录条目。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f25sswmp.js (15)
 * attribution: placement 15
 */
import { RawJson } from "../../bridge/readReceipts.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { isToolResultBlockWithContent } from "../../utils/toolSearch.js";
import { hasImageBlock } from "../../utils/toolResultStorage.js";
import { isNonConversationMessage } from "../../bootstrap/sessionSlices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-f25sswmp.js:11201-11300 placement
var TOOL_RESULT_FIELD_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-f25sswmp.js:11201", () => {
  TOOL_RESULT_FIELD_NAMES = new Set([
    "content",
    "_meta",
    "structuredContent",
    "structuredContentOmitted",
    "resourceLinks",
  ]);
});
//@ chunk-f25sswmp.js:11300-11579 placement
function stripInlineMediaBase64(value, flags) {
  if (flags.media !== true) return value;
  if (value instanceof RawJson) {
    let json = value.toJSON();
    let stripped = stripInlineMediaBase64(json, flags);
    return stripped === json ? value : RawJson.of(stripped);
  }
  if (!isPlainObject_2(value)) return value;
  let file = value.file;
  if (
    isPlainObject_2(file) &&
    (value.type === "image" || value.type === "pdf") &&
    typeof file.base64 === "string" &&
    file.base64 !== ""
  )
    return {
      ...value,
      file: {
        ...file,
        base64: "",
      },
    };
  return value;
}
//@ chunk-f25sswmp.js:11579-11750 placement
function dedupeMcpImageData(value, message, flags) {
  if (flags.mcp_images !== true) return value;
  let map = (value) => mapToolResultImageData(value, message, (data, other) => (data === other ? "" : data));
  if (!(value instanceof RawJson)) return map(value);
  let json = value.toJSON();
  let mapped = map(json);
  return mapped === json ? value : RawJson.of(mapped);
}
//@ chunk-f25sswmp.js:11750-11801 placement
/**
 * 把工具结果里的图片数据映射成标准形状，保留已有文本、替换图片。
 */
function mapToolResultImages(toolUseResult, message) {
  return mapToolResultImageData(toolUseResult, message, (data, other) => (data === "" ? other : data));
}
//@ chunk-f25sswmp.js:11801-11941 placement
function normalizeUserToolUseResult(payload) {
  if (!isPlainObject_2(payload) || payload.type !== "user") return payload;
  let result = mapToolResultImages(payload.toolUseResult, payload.message);
  return result === payload.toolUseResult
    ? payload
    : {
        ...payload,
        toolUseResult: result,
      };
}
//@ chunk-f25sswmp.js:11941-12447 placement
/**
 * 当工具结果内容与原 tool_result 块一一对应时，用回调逐个变换其中 image 块的 base64 数据；无变化时返回原对象。
 */
function mapToolResultImageData(toolUseResult, message, choose) {
  let isWrapped =
    isPlainObject_2(toolUseResult) &&
    Object.keys(toolUseResult).every((key) => TOOL_RESULT_FIELD_NAMES.has(key));
  let content = isWrapped ? toolUseResult.content : toolUseResult;
  let content_2 = isPlainObject_2(message) ? message.content : undefined;
  if (!Array.isArray(content) || !Array.isArray(content_2)) return toolUseResult;
  let [block, ...rest] = content_2.filter((block) => isPlainObject_2(block) && block.type === "tool_result");
  if (rest.length > 0 || !isToolResultBlockWithContent(block) || block.content.length !== content.length)
    return toolUseResult;
  let changed = false;
  let mapped = content.map((resultBlock, index) => {
    let messageBlock = block.content[index];
    if (!hasImageBlock(resultBlock) || !hasImageBlock(messageBlock)) return resultBlock;
    let data = choose(resultBlock.source.data, messageBlock.source.data);
    if (data === resultBlock.source.data) return resultBlock;
    changed = true;
    return {
      ...resultBlock,
      source: {
        ...resultBlock.source,
        data,
      },
    };
  });
  if (!changed) return toolUseResult;
  return isWrapped
    ? {
        ...toolUseResult,
        content: mapped,
      }
    : mapped;
}
//@ chunk-f25sswmp.js:12447-12506 placement
var SDK_MESSAGE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-f25sswmp.js:12447", () => {
  SDK_MESSAGE_TYPES = new Set(["user", "assistant", "attachment", "system"]);
});
//@ chunk-f25sswmp.js:12506-12576 placement
function isTranscriptMessage(value) {
  return isPlainObject_2(value) && typeof value.type === "string" && SDK_MESSAGE_TYPES.has(value.type);
}
//@ chunk-f25sswmp.js:12576-12671 placement
var BASE_MESSAGE_META_FIELDS = ["cwd", "gitBranch", "version", "userType", "entrypoint", "promptId"];
var MESSAGE_META_FIELDS_WITH_REQUEST_ID = [...BASE_MESSAGE_META_FIELDS, "requestId"];
//@ chunk-f25sswmp.js:12671-12776 placement
function isAssistantWithMessageId(message) {
  let message_2 = message.message;
  return (
    message.type === "assistant" &&
    isPlainObject_2(message_2) &&
    typeof message_2.id === "string" &&
    message_2.id.length > 0
  );
}
//@ chunk-f25sswmp.js:12776-12907 placement
function stripTranscriptOnlyFields(message, keepsRequestId) {
  if (!isTranscriptMessage(message)) return message;
  let fields =
    isAssistantWithMessageId(message) && keepsRequestId?.() !== true
      ? MESSAGE_META_FIELDS_WITH_REQUEST_ID
      : BASE_MESSAGE_META_FIELDS;
  let copy;
  for (let key of fields)
    if (key in message) {
      copy ??= {
        ...message,
      };
      delete copy[key];
    }
  return copy ?? message;
}
//@ chunk-f25sswmp.js:12907-13043 placement
function fillMissingTranscriptFields(payload, fields) {
  if (!isTranscriptMessage(payload)) return payload;
  let copy;
  for (let [key, value] of Object.entries(fields))
    if (value !== undefined && payload[key] === undefined) {
      copy ??= {
        ...payload,
      };
      copy[key] = value;
    }
  return copy ?? payload;
}
//@ chunk-f25sswmp.js:13043-14106 placement
/**
 * 扫描消息数组，找出从未完成 thinking 恢复（resumedFromIncompleteThinking）的 assistant 行，向前、向后合并同一 message.id 的片段（跳过中间的无关行），返回每段的 {fromIdx, toIdx}。
 */
function findResumedThinkingRanges(messages) {
  let ranges = [];
  let index = 0;
  while (index < messages.length) {
    let message = messages[index];
    if (message.type !== "assistant" || message.resumedFromIncompleteThinking !== true) {
      index++;
      continue;
    }
    let fromIdx = index;
    let back = index - 1;
    for (;;) {
      while (back >= 0 && isNonConversationMessage(messages[back])) back--;
      let message = back >= 0 ? messages[back] : undefined;
      if (message?.type !== "assistant") break;
      let id = message.message.id;
      let start = back;
      while (back >= 0) {
        let message = messages[back];
        if (message.type === "assistant") {
          if (message.message.id === id) {
            start = back;
            back--;
          } else break;
        } else if (isNonConversationMessage(message)) back--;
        else {
          let scan = back;
          while (
            scan >= 0 &&
            (messages[scan].type !== "assistant" || isNonConversationMessage(messages[scan]))
          )
            scan--;
          let message = scan >= 0 ? messages[scan] : undefined;
          if (message?.type === "assistant" && message.message.id === id) {
            start = scan;
            back = scan - 1;
          } else break;
        }
      }
      fromIdx = start;
      let firstMessage = messages[start];
      if (firstMessage.type !== "assistant" || firstMessage.resumedFromIncompleteThinking !== true) break;
    }
    let end = index;
    let id = message.message.id;
    let next = index + 1;
    for (;;) {
      let scan = next;
      while (scan < messages.length && isNonConversationMessage(messages[scan])) scan++;
      let message = scan < messages.length ? messages[scan] : undefined;
      if (message?.type === "assistant") {
        if (message.message.id === id) {
          end = scan;
          next = scan + 1;
          continue;
        }
        if (message.resumedFromIncompleteThinking === true) {
          end = scan;
          id = message.message.id;
          next = scan + 1;
          continue;
        }
        break;
      }
      let nextScan = scan;
      while (
        nextScan < messages.length &&
        (messages[nextScan].type !== "assistant" || isNonConversationMessage(messages[nextScan]))
      )
        nextScan++;
      let nextMessage = nextScan < messages.length ? messages[nextScan] : undefined;
      if (nextMessage?.type === "assistant" && nextMessage.message.id === id) {
        end = nextScan;
        next = nextScan + 1;
        continue;
      }
      break;
    }
    ranges.push({
      fromIdx,
      toIdx: end,
    });
    index = next > index ? next : index + 1;
  }
  return ranges;
}
//@ chunk-f25sswmp.js:14106-14137 placement
var SHA256_DIGEST_SUFFIX_RE = /@sha256:[0-9a-f]{64}$/;
//@ chunk-f25sswmp.js:14137-14170 placement
function hasPinnedDigest(value) {
  return SHA256_DIGEST_SUFFIX_RE.test(value);
}
export {
  mapToolResultImages,
  isTranscriptMessage,
  fillMissingTranscriptFields,
  findResumedThinkingRanges,
  isAssistantWithMessageId,
  stripInlineMediaBase64,
  dedupeMcpImageData,
  stripTranscriptOnlyFields,
  normalizeUserToolUseResult,
  hasPinnedDigest,
  SHA256_DIGEST_SUFFIX_RE,
};
