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
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-f25sswmp.js:2441-2871 placement = isToolResultBlockWithContent (0.805)
/**
 * 逐条检查 user 消息与工具结果里的图片，尺寸/大小超限时抛 ImageSizeError（发请求前）。
 */
function validateImagesInMessages(e, maxSize) {
  let oversizedImages = [];
  let s = 0;
  for (let i of e) {
    if (typeof i !== "object" || i === null) continue;
    if (!("type" in i) || i.type !== "user") continue;
    if (!("message" in i) || typeof i.message !== "object" || i.message === null) continue;
    let message = i.message;
    if (!("content" in message) || !Array.isArray(message.content)) continue;
    for (let h of message.content) {
      if (hasImageBlock(h)) {
        validateImagesForAPI(h, ++s, maxSize, oversizedImages);
        continue;
      }
      if (isToolResultWithArrayContent(h)) {
        for (let E of h.content) if (hasImageBlock(E)) validateImagesForAPI(E, ++s, maxSize, oversizedImages);
      }
    }
  }
  if (oversizedImages.length > 0) throw new ImageSizeError(oversizedImages, maxSize);
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
var ACCOUNT_MEMORY_REMOVED = "[account memory text removed from this conversation]";
var MEMORY_TOOL_FIELD_CLASSES = {
  top: {
    plain: new Set(["path", "path_prefix", "cursor", "include_preview", "if_version", "source_item", "name"]),
    text: new Set(["old_str", "new_str", "content", "instruction", "query"]),
  },
  op: {
    plain: new Set(["op", "path", "if_version"]),
    text: new Set(["old_str", "new_str", "content"]),
  },
};
var PLAIN_MEMORY_FIELDS = new Set(["path", "path_prefix", "cursor", "source_item", "name"]);
//@ chunk-f25sswmp.js:3412-3454 placement
function isMemoryToolCall(name, sinceUuid) {
  return isTrustedMemoryTool(name, sinceUuid, "history");
}
//@ chunk-f25sswmp.js:3454-3473 placement
var weakMap = new WeakMap();
//@ chunk-f25sswmp.js:3473-3618 placement
function isAccountMemoryAttachment(e) {
  return (
    e.type === "attachment" &&
    e.attachment.type === "cowork_memory_context" &&
    e.attachment.content === null &&
    e.attachment.anchor !== true
  );
}
//@ chunk-f25sswmp.js:3618-4919 placement
/**
 * 在发给模型的消息里清掉账户记忆（cowork_memory_context / account_memory_recall 工具结果）文本，替换为占位说明。
 */
function redactAccountMemory(e, n = isAccountMemoryRedactionOn(), r) {
  let lastIndex = e.findLastIndex(isAccountMemoryAttachment);
  let i = n ? e.length : lastIndex;
  if (i < 0)
    return {
      messages: e,
      epoch: undefined,
    };
  let memoryPausedToolUseIds = collectMemoryPausedToolUseIds(e);
  let h = new Set();
  let E = new Set();
  let I = [];
  let w = 0;
  let R;
  let T = (S) => {
    w++;
    R = S.uuid;
  };
  e.forEach((S, v) => {
    if (v >= i || v === lastIndex) {
      I.push(S);
      return;
    }
    if (
      S.type === "attachment" &&
      ((S.attachment.type === "cowork_memory_context" && S.attachment.anchor !== true) ||
        S.attachment.type === "account_memory_recall")
    ) {
      T(S);
      return;
    }
    if (S.type === "assistant" && Array.isArray(S.message.content)) {
      let b = new Map();
      for (let x of S.message.content) {
        if (x.type !== "tool_use" || !isMemoryToolCall(x.name, r)) continue;
        let k = redactAccountMemoryInput(x.input);
        let j = memoryPausedToolUseIds.has(x.id);
        if (j && k === x.input) continue;
        b.set(x.id, {
          input: k,
          blankResult: !j,
        });
      }
      if (b.size === 0) {
        I.push(S);
        return;
      }
      for (let [x, { blankResult: k }] of b) {
        E.add(x);
        if (k) h.add(x);
      }
      T(S);
      I.push({
        ...S,
        ...(isPlainObject(S.wireToolInputs) && {
          wireToolInputs: pickKnownKeys(S.wireToolInputs, E),
        }),
        message: {
          ...S.message,
          content: S.message.content.map((x) =>
            x.type === "tool_use" && b.has(x.id)
              ? {
                  ...x,
                  input: b.get(x.id).input,
                }
              : x,
          ),
        },
      });
      return;
    }
    if (
      S.type === "user" &&
      h.size > 0 &&
      Array.isArray(S.message.content) &&
      S.message.content.some((b) => b.type === "tool_result" && h.has(b.tool_use_id))
    ) {
      T(S);
      I.push({
        ...S,
        message: {
          ...S.message,
          content: S.message.content.map((b) =>
            b.type === "tool_result" && h.has(b.tool_use_id)
              ? {
                  ...b,
                  content: ACCOUNT_MEMORY_REMOVED,
                }
              : b,
          ),
        },
      });
      return;
    }
    I.push(S);
  });
  return w === 0
    ? {
        messages: e,
        epoch: undefined,
      }
    : {
        messages: I,
        epoch: `${w}:${R}`,
      };
}
//@ chunk-f25sswmp.js:4919-5189 placement = countToolCallsSince (1)
function countToolCallsSince(messages, sinceUuid) {
  let memoryPausedToolUseIds = collectMemoryPausedToolUseIds(messages);
  for (let j = messages.length - 1; j >= 0; j--) {
    let i = messages[j];
    if (isAccountMemoryAttachment(i)) return false;
    if (
      i.type === "assistant" &&
      Array.isArray(i.message.content) &&
      i.message.content.some(
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
function collectMemoryTextFields(e) {
  let n = [];
  let r = (s, i) => {
    if (typeof s !== "object" || s === null || isUntrustedObject(s)) return;
    for (let [key, value] of Object.entries(s))
      if (MEMORY_TOOL_FIELD_CLASSES[i].text.has(key) && typeof value === "string") n.push(value);
      else if (i === "top" && key === "ops" && Array.isArray(value)) for (let E of value) r(E, "op");
  };
  r(e, "top");
  return n;
}
//@ chunk-f25sswmp.js:5449-5971 placement = countToolCallsSince (1)
function countToolCallsSince_2(messages, sinceUuid) {
  let r = [];
  let s = new Set();
  for (let message of messages)
    if (message.type === "assistant" && Array.isArray(message.message.content)) {
      for (let y of message.message.content)
        if (y.type === "tool_use" && isMemoryToolCall(y.name, sinceUuid)) {
          s.add(y.id);
          r.push(...collectMemoryTextFields(y.input));
        }
    } else if (message.type === "user" && s.size > 0 && Array.isArray(message.message.content))
      for (let y of message.message.content) {
        if (y.type !== "tool_result" || !s.has(y.tool_use_id)) continue;
        if (typeof y.content === "string") r.push(y.content);
        else if (Array.isArray(y.content)) {
          for (let h of y.content) if (h.type === "text") r.push(h.text);
        }
      }
  return r;
}
//@ chunk-f25sswmp.js:5971-6259 placement
function collectMemoryPausedToolUseIds(e) {
  let n = new Set();
  for (let r of e) {
    if (
      r.type !== "user" ||
      r.toolDenialKind === undefined ||
      r.toolResultRemedy?.kind !== "memory_paused" ||
      !Array.isArray(r.message.content)
    )
      continue;
    let filtered = r.message.content.filter((i) => i.type === "tool_result");
    if (filtered.length === 1) n.add(filtered[0].tool_use_id);
  }
  return n;
}
//@ chunk-f25sswmp.js:6259-6306 placement
function messagesWithoutAccountMemory(messages, n, r) {
  return redactAccountMemory(messages, n, r).messages;
}
//@ chunk-f25sswmp.js:6306-6346 placement
var MAX_MEMORY_INPUT_KEYS = 32;
var Ye = Object.freeze({
  content: ACCOUNT_MEMORY_REMOVED,
});
//@ chunk-f25sswmp.js:6346-6403 placement
function placeholderBlock(placeholder) {
  return placeholder === ACCOUNT_MEMORY_REMOVED
    ? Ye
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
    let b = redactMemoryField(level, key, ownPropertyDescriptor.value, depth, placeholder, redactPaths);
    if (b === DROPPED_SYMBOL) {
      changed = true;
      continue;
    }
    if (b instanceof PreservedStrings) {
      changed ||= !b.pristine;
      entries.push([key, b.strings]);
      continue;
    }
    changed ||= b !== ownPropertyDescriptor.value;
    entries.push([key, b]);
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
  for (let [S, v] of entries)
    Object.defineProperty(result, S, {
      value: v,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  return result;
}
//@ chunk-f25sswmp.js:7462-7533 placement
var MEMORY_OPS = new Set(["append", "str_replace", "delete"]);
var DROPPED_SYMBOL = Symbol("dropped");
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
function redactMemoryField(level, key, r, depth, placeholder, redactPaths) {
  let h = MEMORY_TOOL_FIELD_CLASSES[level];
  if (h.plain.has(key)) {
    let E = redactPaths && PLAIN_MEMORY_FIELDS.has(key);
    if (
      key === "op"
        ? typeof r === "string" && MEMORY_OPS.has(r)
        : r === null ||
          typeof r === "boolean" ||
          (key !== "include_preview" && (typeof r === "string" || typeof r === "number"))
    )
      return E && (typeof r === "string" || typeof r === "number") ? placeholder : r;
    if (level === "top" && key === "path" && typeof r === "object" && r !== null)
      return redactPathArray(r, placeholder, E);
    return placeholder;
  }
  if (h.text.has(key)) return placeholder;
  if (level === "top" && key === "ops")
    return !isUntrustedObject(r) && Array.isArray(r)
      ? redactAccountMemoryInput(r, depth + 1, placeholder, redactPaths)
      : placeholder;
  return DROPPED_SYMBOL;
}
//@ chunk-f25sswmp.js:8071-8570 placement
/**
 * 对路径数组做脱敏：只有严格的普通数组（无额外属性、符号或访问器）才逐项处理，否则整体替换为占位。
 */
function redactPathArray(e, n, r) {
  if (isUntrustedObject(e)) return n;
  let ownPropertyNames = Object.getOwnPropertyNames(e);
  let i =
    Object.getPrototypeOf(e) === Array.prototype &&
    Object.getOwnPropertySymbols(e).length === 0 &&
    Array.isArray(e) &&
    ownPropertyNames.length === e.length + 1 &&
    ownPropertyNames.every((E) => {
      if (E === "length") return true;
      let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, E);
      return (
        /^(?:0|[1-9]\d*)$/u.test(E) &&
        Number(E) < e.length &&
        ownPropertyDescriptor !== undefined &&
        "value" in ownPropertyDescriptor
      );
    });
  let untrustedArray = readUntrustedArray(e);
  if (!Array.isArray(untrustedArray)) return n;
  let strings = [];
  for (let untrusted of untrustedArray) {
    if (typeof untrusted !== "string") return n;
    strings.push(r ? n : untrusted);
  }
  return new PreservedStrings(strings, i && !r);
}
//@ chunk-f25sswmp.js:8570-8761 placement
function pickKnownKeys(wireToolInputs, n) {
  let r = jsonStringify(
    Object.keys(wireToolInputs)
      .filter((key) => n.has(key))
      .sort(),
  );
  let s = weakMap.get(wireToolInputs);
  if (s === undefined) {
    s = new Map();
    weakMap.set(wireToolInputs, s);
  }
  let i = s.get(r);
  if (i === undefined) {
    i = wi(wireToolInputs, (y, h) => n.has(h));
    s.set(r, i);
  }
  return i;
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
