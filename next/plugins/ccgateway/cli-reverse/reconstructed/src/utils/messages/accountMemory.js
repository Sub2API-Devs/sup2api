/**
 * utils/messages/accountMemory.ts
 *
 * 2.1.316 新增：账户记忆脱敏：在发给模型的消息中清掉 account memory 相关内容。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f25sswmp.js (24)
 * attribution: placement 24
 */
import { types } from "util";
import { hasImageBlock, isToolResultWithArrayContent } from "../toolResultStorage.js";
import { validateImagesForAPI, ImageSizeError } from "../imageValidation.js";
import { logError } from "../log.js";
import { isTrustedMemoryTool } from "../../services/mcp/memoryServerVerification.js";
import { isPlainObject } from "../objectUtils.js";
import { isUntrustedObject } from "../untrustedValues.js";
import { readUntrustedArray, UNREADABLE_ARRAY } from "../untrustedArray.js";
import { jsonStringify } from "../slowOperations.js";
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-f25sswmp.js:2441-2871 placement = isToolResultBlockWithContent (0.805)
/**
 * 逐条检查 user 消息与工具结果里的图片，尺寸/大小超限时抛 ImageSizeError（发请求前）。
 */
function validateImagesInMessages(messages, enforceLimits) {
  let violations = [];
  let imageCount = 0;
  for (let message of messages) {
    if (typeof message !== "object" || message === null) continue;
    if (!("type" in message) || message.type !== "user") continue;
    if (!("message" in message) || typeof message.message !== "object" || message.message === null) continue;
    let message_2 = message.message;
    if (!("content" in message_2) || !Array.isArray(message_2.content)) continue;
    for (let block of message_2.content) {
      if (hasImageBlock(block)) {
        validateImagesForAPI(block, ++imageCount, enforceLimits, violations);
        continue;
      }
      if (isToolResultWithArrayContent(block)) {
        for (let innerBlock of block.content)
          if (hasImageBlock(innerBlock))
            validateImagesForAPI(innerBlock, ++imageCount, enforceLimits, violations);
      }
    }
  }
  if (violations.length > 0) throw new ImageSizeError(violations, enforceLimits);
}
//@ chunk-f25sswmp.js:2901-2914 placement
var accountMemoryRedactionEnabler = () => false;
//@ chunk-f25sswmp.js:2914-2934 placement
/**
 * 安装账户记忆脱敏的启用判定函数。
 */
function setAccountMemoryRedaction(isMemoryContextOff) {
  accountMemoryRedactionEnabler = isMemoryContextOff;
}
//@ chunk-f25sswmp.js:2934-2989 placement
/**
 * 判断账户记忆脱敏是否开启（读取异常按关闭处理）。
 */
function isAccountMemoryRedactionOn() {
  try {
    return accountMemoryRedactionEnabler();
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-f25sswmp.js:2989-3015 placement
/**
 * 直接查询账户记忆脱敏开关。
 */
function accountMemoryRedactionActive() {
  return accountMemoryRedactionEnabler();
}
//@ chunk-f25sswmp.js:3015-3412 placement
/**
 * 账户记忆脱敏的占位文本，以及"可原样保留的字段"与"需要替换的文本字段"分类表。
 */
var ACCOUNT_MEMORY_REMOVED; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MEMORY_TOOL_FIELD_CLASSES;
var PLAIN_MEMORY_FIELDS;
deferInit("chunk-f25sswmp.js:3015", () => {
  ACCOUNT_MEMORY_REMOVED = "[account memory text removed from this conversation]";
  MEMORY_TOOL_FIELD_CLASSES = {
    top: {
      plain: new Set([
        "path",
        "path_prefix",
        "cursor",
        "include_preview",
        "if_version",
        "source_item",
        "name",
      ]),
      text: new Set(["old_str", "new_str", "content", "instruction", "query"]),
    },
    op: {
      plain: new Set(["op", "path", "if_version"]),
      text: new Set(["old_str", "new_str", "content"]),
    },
  };
  PLAIN_MEMORY_FIELDS = new Set(["path", "path_prefix", "cursor", "source_item", "name"]);
});
//@ chunk-f25sswmp.js:3412-3454 placement
function isMemoryToolCall(name, placementOf) {
  return isTrustedMemoryTool(name, placementOf, "history");
}
//@ chunk-f25sswmp.js:3454-3473 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-f25sswmp.js:3454", () => {
  weakMap = new WeakMap();
});
//@ chunk-f25sswmp.js:3473-3618 placement
function isAccountMemoryAttachment(message) {
  return (
    message.type === "attachment" &&
    message.attachment.type === "cowork_memory_context" &&
    message.attachment.content === null &&
    message.attachment.anchor !== true
  );
}
//@ chunk-f25sswmp.js:3618-4919 placement
/**
 * 在发给模型的消息里清掉账户记忆（cowork_memory_context / account_memory_recall 工具结果）文本，替换为占位说明。
 */
function redactAccountMemory(messages, redactAll = isAccountMemoryRedactionOn(), toolRecognizer) {
  let lastIndex = messages.findLastIndex(isAccountMemoryAttachment);
  let cutoffIndex = redactAll ? messages.length : lastIndex;
  if (cutoffIndex < 0)
    return {
      messages,
      epoch: undefined,
    };
  let memoryPausedToolUseIds = collectMemoryPausedToolUseIds(messages);
  let blankedIds = new Set();
  let redactedIds = new Set();
  let result = [];
  let redactedCount = 0;
  let lastRedactedUuid;
  let markRedacted = (redactedMessage) => {
    redactedCount++;
    lastRedactedUuid = redactedMessage.uuid;
  };
  messages.forEach((message, index) => {
    if (index >= cutoffIndex || index === lastIndex) {
      result.push(message);
      return;
    }
    if (
      message.type === "attachment" &&
      ((message.attachment.type === "cowork_memory_context" && message.attachment.anchor !== true) ||
        message.attachment.type === "account_memory_recall")
    ) {
      markRedacted(message);
      return;
    }
    if (message.type === "assistant" && Array.isArray(message.message.content)) {
      let redactionsById = new Map();
      for (let block of message.message.content) {
        if (block.type !== "tool_use" || !isMemoryToolCall(block.name, toolRecognizer)) continue;
        let redactedInput = redactAccountMemoryInput(block.input);
        let isPaused = memoryPausedToolUseIds.has(block.id);
        if (isPaused && redactedInput === block.input) continue;
        redactionsById.set(block.id, {
          input: redactedInput,
          blankResult: !isPaused,
        });
      }
      if (redactionsById.size === 0) {
        result.push(message);
        return;
      }
      for (let [toolUseId, { blankResult: shouldBlank }] of redactionsById) {
        redactedIds.add(toolUseId);
        if (shouldBlank) blankedIds.add(toolUseId);
      }
      markRedacted(message);
      result.push({
        ...message,
        ...(isPlainObject(message.wireToolInputs) && {
          wireToolInputs: pickKnownKeys(message.wireToolInputs, redactedIds),
        }),
        message: {
          ...message.message,
          content: message.message.content.map((contentBlock) =>
            contentBlock.type === "tool_use" && redactionsById.has(contentBlock.id)
              ? {
                  ...contentBlock,
                  input: redactionsById.get(contentBlock.id).input,
                }
              : contentBlock,
          ),
        },
      });
      return;
    }
    if (
      message.type === "user" &&
      blankedIds.size > 0 &&
      Array.isArray(message.message.content) &&
      message.message.content.some(
        (contentBlock) => contentBlock.type === "tool_result" && blankedIds.has(contentBlock.tool_use_id),
      )
    ) {
      markRedacted(message);
      result.push({
        ...message,
        message: {
          ...message.message,
          content: message.message.content.map((resultBlock) =>
            resultBlock.type === "tool_result" && blankedIds.has(resultBlock.tool_use_id)
              ? {
                  ...resultBlock,
                  content: ACCOUNT_MEMORY_REMOVED,
                }
              : resultBlock,
          ),
        },
      });
      return;
    }
    result.push(message);
  });
  return redactedCount === 0
    ? {
        messages,
        epoch: undefined,
      }
    : {
        messages: result,
        epoch: `${redactedCount}:${lastRedactedUuid}`,
      };
}
//@ chunk-f25sswmp.js:4919-5189 placement = countToolCallsSince (1)
function countToolCallsSince(messages, sinceUuid) {
  let memoryPausedToolUseIds = collectMemoryPausedToolUseIds(messages);
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (isAccountMemoryAttachment(message)) return false;
    if (
      message.type === "assistant" &&
      Array.isArray(message.message.content) &&
      message.message.content.some(
        (block) =>
          block.type === "tool_use" &&
          isMemoryToolCall(block.name, sinceUuid) &&
          (!memoryPausedToolUseIds.has(block.id) || redactAccountMemoryInput(block.input) !== block.input),
      )
    )
      return true;
  }
  return false;
}
//@ chunk-f25sswmp.js:5189-5449 placement
/**
 * 从账号记忆工具输入里收集需遮盖的正文字符串（顶层与 ops 里各操作的文本字段）。
 */
function collectMemoryTextFields(input) {
  let texts = [];
  let walk = (value, level) => {
    if (typeof value !== "object" || value === null || isUntrustedObject(value)) return;
    for (let [key, value_2] of Object.entries(value))
      if (MEMORY_TOOL_FIELD_CLASSES[level].text.has(key) && typeof value_2 === "string") texts.push(value_2);
      else if (level === "top" && key === "ops" && Array.isArray(value_2))
        for (let op of value_2) walk(op, "op");
  };
  walk(input, "top");
  return texts;
}
//@ chunk-f25sswmp.js:5449-5971 placement = countToolCallsSince (1)
function countToolCallsSince_2(messages, sinceUuid) {
  let texts = [];
  let memoryToolIds = new Set();
  for (let message of messages)
    if (message.type === "assistant" && Array.isArray(message.message.content)) {
      for (let block of message.message.content)
        if (block.type === "tool_use" && isMemoryToolCall(block.name, sinceUuid)) {
          memoryToolIds.add(block.id);
          texts.push(...collectMemoryTextFields(block.input));
        }
    } else if (message.type === "user" && memoryToolIds.size > 0 && Array.isArray(message.message.content))
      for (let resultBlock of message.message.content) {
        if (resultBlock.type !== "tool_result" || !memoryToolIds.has(resultBlock.tool_use_id)) continue;
        if (typeof resultBlock.content === "string") texts.push(resultBlock.content);
        else if (Array.isArray(resultBlock.content)) {
          for (let textBlock of resultBlock.content)
            if (textBlock.type === "text") texts.push(textBlock.text);
        }
      }
  return texts;
}
//@ chunk-f25sswmp.js:5971-6259 placement
function collectMemoryPausedToolUseIds(messages) {
  let pausedIds = new Set();
  for (let message of messages) {
    if (
      message.type !== "user" ||
      message.toolDenialKind === undefined ||
      message.toolResultRemedy?.kind !== "memory_paused" ||
      !Array.isArray(message.message.content)
    )
      continue;
    let filtered = message.message.content.filter((block) => block.type === "tool_result");
    if (filtered.length === 1) pausedIds.add(filtered[0].tool_use_id);
  }
  return pausedIds;
}
//@ chunk-f25sswmp.js:6259-6306 placement
function messagesWithoutAccountMemory(messages, knownKeys, redactPaths) {
  return redactAccountMemory(messages, knownKeys, redactPaths).messages;
}
//@ chunk-f25sswmp.js:6306-6346 placement
var MAX_MEMORY_INPUT_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REMOVED_MEMORY_STATE;
deferInit("chunk-f25sswmp.js:6306", () => {
  MAX_MEMORY_INPUT_KEYS = 32;
  REMOVED_MEMORY_STATE = Object.freeze({
    content: ACCOUNT_MEMORY_REMOVED,
  });
});
//@ chunk-f25sswmp.js:6346-6403 placement
function placeholderBlock(placeholder) {
  return placeholder === ACCOUNT_MEMORY_REMOVED
    ? REMOVED_MEMORY_STATE
    : Object.freeze({
        content: placeholder,
      });
}
//@ chunk-f25sswmp.js:6403-7462 placement
/**
 * 递归遮盖账号记忆工具输入：保留结构与白名单普通字段（op、路径等），文本字段替换为占位；函数、访问器、过深、过宽或代理对象整体替换；没有变化时返回原对象。
 */
function redactAccountMemoryInput(
  value,
  depth = 0,
  placeholder = ACCOUNT_MEMORY_REMOVED,
  redactPaths = false,
) {
  if (typeof value === "function") return placeholderBlock(placeholder);
  if (typeof value === "string" || types.isStringObject(value))
    return depth === 0 ? placeholderBlock(placeholder) : placeholder;
  if (typeof value !== "object" || value === null) return value;
  if (isUntrustedObject(value) || depth > 2) return placeholderBlock(placeholder);
  let arrayItems = readUntrustedArray(value);
  if (arrayItems === UNREADABLE_ARRAY) return placeholderBlock(placeholder);
  if (arrayItems !== undefined)
    return arrayItems.map((array) => redactAccountMemoryInput(array, depth + 1, placeholder, redactPaths));
  let keys;
  try {
    keys = Object.keys(value);
  } catch {
    return placeholderBlock(placeholder);
  }
  if (keys.length > MAX_MEMORY_INPUT_KEYS) return placeholderBlock(placeholder);
  let hasHidden =
    Object.getOwnPropertyNames(value).length !== keys.length ||
    Object.getOwnPropertySymbols(value).length > 0;
  let level = depth === 0 ? "top" : "op";
  let entries = [];
  let changed = false;
  for (let key of keys) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      ownPropertyDescriptor === undefined ||
      !("value" in ownPropertyDescriptor) ||
      typeof ownPropertyDescriptor.value === "function"
    ) {
      changed = true;
      continue;
    }
    let fieldValue = redactMemoryField(
      level,
      key,
      ownPropertyDescriptor.value,
      depth,
      placeholder,
      redactPaths,
    );
    if (fieldValue === DROPPED_SYMBOL) {
      changed = true;
      continue;
    }
    if (fieldValue instanceof PreservedStrings) {
      changed ||= !fieldValue.pristine;
      entries.push([key, fieldValue.strings]);
      continue;
    }
    changed ||= fieldValue !== ownPropertyDescriptor.value;
    entries.push([key, fieldValue]);
  }
  let prototypeOf = Object.getPrototypeOf(value);
  if (
    depth === 0 &&
    !changed &&
    !hasHidden &&
    (prototypeOf === Object.prototype || prototypeOf === null) &&
    Object.getOwnPropertyNames(value).length === keys.length &&
    Object.getOwnPropertySymbols(value).length === 0
  )
    return value;
  let result = {};
  for (let [key, value] of entries)
    Object.defineProperty(result, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  return result;
}
//@ chunk-f25sswmp.js:7462-7533 placement
var MEMORY_OPS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DROPPED_SYMBOL;
deferInit("chunk-f25sswmp.js:7462", () => {
  MEMORY_OPS = new Set(["append", "str_replace", "delete"]);
  DROPPED_SYMBOL = Symbol("dropped");
});
//@ chunk-f25sswmp.js:7533-7608 placement
class PreservedStrings {
  strings;
  pristine;
  constructor(strings, pristine) {
    this.strings = strings;
    this.pristine = pristine;
  }
}
//@ chunk-f25sswmp.js:7608-8071 placement
/**
 * 对账号记忆工具输入的单个字段做脱敏：允许原样保留的标量（op 只保留已知值）保留，可选敏感字段替换为占位；顶层 path 数组逐项处理；其他替换为占位。
 */
function redactMemoryField(level, key, value, depth, placeholder, redactPaths) {
  let classes = MEMORY_TOOL_FIELD_CLASSES[level];
  if (classes.plain.has(key)) {
    let shouldRedact = redactPaths && PLAIN_MEMORY_FIELDS.has(key);
    if (
      key === "op"
        ? typeof value === "string" && MEMORY_OPS.has(value)
        : value === null ||
          typeof value === "boolean" ||
          (key !== "include_preview" && (typeof value === "string" || typeof value === "number"))
    )
      return shouldRedact && (typeof value === "string" || typeof value === "number") ? placeholder : value;
    if (level === "top" && key === "path" && typeof value === "object" && value !== null)
      return redactPathArray(value, placeholder, shouldRedact);
    return placeholder;
  }
  if (classes.text.has(key)) return placeholder;
  if (level === "top" && key === "ops")
    return !isUntrustedObject(value) && Array.isArray(value)
      ? redactAccountMemoryInput(value, depth + 1, placeholder, redactPaths)
      : placeholder;
  return DROPPED_SYMBOL;
}
//@ chunk-f25sswmp.js:8071-8570 placement
/**
 * 对路径数组做脱敏：只有严格的普通数组（无额外属性、符号或访问器）才逐项处理，否则整体替换为占位。
 */
function redactPathArray(paths, placeholder, redactPaths) {
  if (isUntrustedObject(paths)) return placeholder;
  let ownPropertyNames = Object.getOwnPropertyNames(paths);
  let isPristineArray =
    Object.getPrototypeOf(paths) === Array.prototype &&
    Object.getOwnPropertySymbols(paths).length === 0 &&
    Array.isArray(paths) &&
    ownPropertyNames.length === paths.length + 1 &&
    ownPropertyNames.every((key) => {
      if (key === "length") return true;
      let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(paths, key);
      return (
        /^(?:0|[1-9]\d*)$/u.test(key) &&
        Number(key) < paths.length &&
        ownPropertyDescriptor !== undefined &&
        "value" in ownPropertyDescriptor
      );
    });
  let untrustedArray = readUntrustedArray(paths);
  if (!Array.isArray(untrustedArray)) return placeholder;
  let strings = [];
  for (let untrusted of untrustedArray) {
    if (typeof untrusted !== "string") return placeholder;
    strings.push(redactPaths ? placeholder : untrusted);
  }
  return new PreservedStrings(strings, isPristineArray && !redactPaths);
}
//@ chunk-f25sswmp.js:8570-8761 placement
function pickKnownKeys(wireToolInputs, knownKeys) {
  let cacheKey = jsonStringify(
    Object.keys(wireToolInputs)
      .filter((key) => knownKeys.has(key))
      .sort(),
  );
  let cache = weakMap.get(wireToolInputs);
  if (cache === undefined) {
    cache = new Map();
    weakMap.set(wireToolInputs, cache);
  }
  let picked = cache.get(cacheKey);
  if (picked === undefined) {
    picked = import_reject(wireToolInputs, (value, key) => knownKeys.has(key));
    cache.set(cacheKey, picked);
  }
  return picked;
}
//@ chunk-f25sswmp.js:8761-8771 placement
/**
 * 校验时可检查的图片数量上限。
 */
var MAX_VALIDATED_IMAGES = 64;
export {
  messagesWithoutAccountMemory,
  countToolCallsSince_2,
  isAccountMemoryRedactionOn,
  validateImagesInMessages,
  redactAccountMemory,
  redactAccountMemoryInput,
  collectMemoryTextFields,
  MAX_VALIDATED_IMAGES,
  accountMemoryRedactionActive,
  isAccountMemoryAttachment,
  setAccountMemoryRedaction,
  countToolCallsSince,
};
