/**
 * cli/transports/ccrMessageMapping.ts
 *
 * 2.1.316 新增：消息映射到 CCR（云端会话）格式：媒体、工具结果与转录条目。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vr5v4gzz.js (16)
 * attribution: placement 14, layout 2
 */
import { RawJson } from "../../bridge/readReceipts.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { isToolResultBlockWithContent } from "../../utils/toolSearch.js";
import { hasImageBlock } from "../../utils/toolResultStorage.js";
import { isNonConversationMessage } from "../../bootstrap/sessionSlices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vr5v4gzz.js:11234-11333 placement
var TOOL_RESULT_FIELD_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vr5v4gzz.js:11234", () => {
  TOOL_RESULT_FIELD_NAMES = new Set([
    "content",
    "_meta",
    "structuredContent",
    "structuredContentOmitted",
    "resourceLinks",
  ]);
});
//@ chunk-vr5v4gzz.js:11333-11612 placement
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
//@ chunk-vr5v4gzz.js:11612-11834 layout
function withholdFileBodiesDeep(input) {
  if (input instanceof RawJson) {
    let json = input.toJSON();
    let mapped = withholdFileBodiesDeep(json);
    return mapped === json ? input : RawJson.of(mapped);
  }
  if (!isPlainObject_2(input)) return input;
  let next = withholdFileBodies(input);
  for (let key of ["content", "structuredContent"]) {
    let value = next[key];
    let mappedValue = isPlainObject_2(value) ? withholdFileBodies(value) : value;
    if (mappedValue !== value)
      next = {
        ...next,
        [key]: mappedValue,
      };
  }
  return next;
}
//@ chunk-vr5v4gzz.js:11834-12202 layout
function withholdFileBodies(payload) {
  let withheld = {};
  if (
    typeof payload.originalFile === "string" &&
    payload.originalFile !== "" &&
    payload.originalFile !== payload.content
  )
    withheld.originalFile = null;
  if (
    payload.type === "update" &&
    Array.isArray(payload.structuredPatch) &&
    payload.structuredPatch.length > 0
  )
    withheld.structuredPatch = [];
  for (let key of ["original_file", "updated_file"])
    if (typeof payload[key] === "string" && payload[key] !== "") withheld[key] = "";
  return Object.keys(withheld).length > 0
    ? {
        ...payload,
        ...withheld,
      }
    : payload;
}
//@ chunk-vr5v4gzz.js:12202-12373 placement
function dedupeMcpImageData(value, message, flags) {
  if (flags.mcp_images !== true) return value;
  let map = (value) => mapToolResultImageData(value, message, (data, other) => (data === other ? "" : data));
  if (!(value instanceof RawJson)) return map(value);
  let json = value.toJSON();
  let mapped = map(json);
  return mapped === json ? value : RawJson.of(mapped);
}
//@ chunk-vr5v4gzz.js:12373-12424 placement
/**
 * 把工具结果里的图片数据映射成标准形状，保留已有文本、替换图片。
 */
function mapToolResultImages(toolUseResult, message) {
  return mapToolResultImageData(toolUseResult, message, (data, other) => (data === "" ? other : data));
}
//@ chunk-vr5v4gzz.js:12424-12564 placement
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
//@ chunk-vr5v4gzz.js:12564-13070 placement
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
//@ chunk-vr5v4gzz.js:13070-13129 placement
var SDK_MESSAGE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vr5v4gzz.js:13070", () => {
  SDK_MESSAGE_TYPES = new Set(["user", "assistant", "attachment", "system"]);
});
//@ chunk-vr5v4gzz.js:13129-13199 placement
function isTranscriptMessage(value) {
  return isPlainObject_2(value) && typeof value.type === "string" && SDK_MESSAGE_TYPES.has(value.type);
}
//@ chunk-vr5v4gzz.js:13199-13294 placement
var BASE_MESSAGE_META_FIELDS = ["cwd", "gitBranch", "version", "userType", "entrypoint", "promptId"];
var MESSAGE_META_FIELDS_WITH_REQUEST_ID = [...BASE_MESSAGE_META_FIELDS, "requestId"];
//@ chunk-vr5v4gzz.js:13294-13399 placement
function isAssistantWithMessageId(message) {
  let message_2 = message.message;
  return (
    message.type === "assistant" &&
    isPlainObject_2(message_2) &&
    typeof message_2.id === "string" &&
    message_2.id.length > 0
  );
}
//@ chunk-vr5v4gzz.js:13399-13530 placement
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
//@ chunk-vr5v4gzz.js:13530-13666 placement
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
//@ chunk-vr5v4gzz.js:13666-14729 placement
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
//@ chunk-vr5v4gzz.js:14729-14760 placement
var SHA256_DIGEST_SUFFIX_RE = /@sha256:[0-9a-f]{64}$/;
export {
  isTranscriptMessage,
  fillMissingTranscriptFields,
  findResumedThinkingRanges,
  mapToolResultImages,
  normalizeUserToolUseResult,
  isAssistantWithMessageId,
  withholdFileBodiesDeep,
  stripInlineMediaBase64,
  dedupeMcpImageData,
  stripTranscriptOnlyFields,
  SHA256_DIGEST_SUFFIX_RE,
};
