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
import { Pf } from "../untrustedValues.js";
import { readUntrustedArray, Uf } from "../untrustedArray.js";
import { jsonStringify } from "../slowOperations.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";

/**
 * 逐条检查 user 消息与工具结果里的图片，尺寸/大小超限时抛 ImageSizeError（发请求前）。
 */
//@ chunk-f25sswmp.js:2441-2871 placement = isToolResultBlockWithContent (0.805)
function validateImagesInMessages(e, n) {
  let r = [],
    s = 0;
  for (let i of e) {
    if (typeof i !== "object" || i === null) continue;
    if (!("type" in i) || i.type !== "user") continue;
    if (!("message" in i) || typeof i.message !== "object" || i.message === null) continue;
    let message = i.message;
    if (!("content" in message) || !Array.isArray(message.content)) continue;
    for (let h of message.content) {
      if (hasImageBlock(h)) {
        validateImagesForAPI(h, ++s, n, r);
        continue;
      }
      if (isToolResultWithArrayContent(h)) {
        for (let E of h.content) if (hasImageBlock(E)) validateImagesForAPI(E, ++s, n, r);
      }
    }
  }
  if (r.length > 0) throw new ImageSizeError(r, n);
}
//@ chunk-f25sswmp.js:2901-2914 placement
var Q = () => !1;
//@ chunk-f25sswmp.js:2914-2934 placement
function $li(e) {
  Q = e;
}
//@ chunk-f25sswmp.js:2934-2989 placement
function wsr() {
  try {
    return Q();
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-f25sswmp.js:2989-3015 placement
function Fli() {
  return Q();
}
//@ chunk-f25sswmp.js:3015-3412 placement
var ACCOUNT_MEMORY_REMOVED = "[account memory text removed from this conversation]",
  he = {
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
    op: { plain: new Set(["op", "path", "if_version"]), text: new Set(["old_str", "new_str", "content"]) },
  },
  Ke = new Set(["path", "path_prefix", "cursor", "source_item", "name"]);
//@ chunk-f25sswmp.js:3412-3454 placement
function Z(e, n) {
  return isTrustedMemoryTool(e, n, "history");
}
//@ chunk-f25sswmp.js:3454-3473 placement
var weakMap = new WeakMap();
//@ chunk-f25sswmp.js:3473-3618 placement
function isAccountMemoryAttachment(e) {
  return (
    e.type === "attachment" &&
    e.attachment.type === "cowork_memory_context" &&
    e.attachment.content === null &&
    e.attachment.anchor !== !0
  );
}
/**
 * 在发给模型的消息里清掉账户记忆（cowork_memory_context / account_memory_recall 工具结果）文本，替换为占位说明。
 */
//@ chunk-f25sswmp.js:3618-4919 placement
function redactAccountMemory(e, n = wsr(), r) {
  let lastIndex = e.findLastIndex(isAccountMemoryAttachment),
    i = n ? e.length : lastIndex;
  if (i < 0) return { messages: e, epoch: void 0 };
  let y = collectMemoryPausedToolUseIds(e),
    h = new Set(),
    E = new Set(),
    I = [],
    w = 0,
    R,
    T = (S) => {
      (w++, (R = S.uuid));
    };
  return (
    e.forEach((S, v) => {
      if (v >= i || v === lastIndex) {
        I.push(S);
        return;
      }
      if (
        S.type === "attachment" &&
        ((S.attachment.type === "cowork_memory_context" && S.attachment.anchor !== !0) ||
          S.attachment.type === "account_memory_recall")
      ) {
        T(S);
        return;
      }
      if (S.type === "assistant" && Array.isArray(S.message.content)) {
        let b = new Map();
        for (let x of S.message.content) {
          if (x.type !== "tool_use" || !Z(x.name, r)) continue;
          let k = redactAccountMemoryInput(x.input),
            j = y.has(x.id);
          if (j && k === x.input) continue;
          b.set(x.id, { input: k, blankResult: !j });
        }
        if (b.size === 0) {
          I.push(S);
          return;
        }
        for (let [x, { blankResult: k }] of b) if ((E.add(x), k)) h.add(x);
        (T(S),
          I.push({
            ...S,
            ...(isPlainObject(S.wireToolInputs) && { wireToolInputs: pickKnownKeys(S.wireToolInputs, E) }),
            message: {
              ...S.message,
              content: S.message.content.map((x) =>
                x.type === "tool_use" && b.has(x.id) ? { ...x, input: b.get(x.id).input } : x,
              ),
            },
          }));
        return;
      }
      if (
        S.type === "user" &&
        h.size > 0 &&
        Array.isArray(S.message.content) &&
        S.message.content.some((b) => b.type === "tool_result" && h.has(b.tool_use_id))
      ) {
        (T(S),
          I.push({
            ...S,
            message: {
              ...S.message,
              content: S.message.content.map((b) =>
                b.type === "tool_result" && h.has(b.tool_use_id)
                  ? { ...b, content: ACCOUNT_MEMORY_REMOVED }
                  : b,
              ),
            },
          }));
        return;
      }
      I.push(S);
    }),
    w === 0 ? { messages: e, epoch: void 0 } : { messages: I, epoch: `${w}:${R}` }
  );
}
//@ chunk-f25sswmp.js:4919-5189 placement = countToolCallsSince (1)
function countToolCallsSince(messages, sinceUuid) {
  let r = collectMemoryPausedToolUseIds(messages);
  for (let s = messages.length - 1; s >= 0; s--) {
    let i = messages[s];
    if (isAccountMemoryAttachment(i)) return !1;
    if (
      i.type === "assistant" &&
      Array.isArray(i.message.content) &&
      i.message.content.some(
        (block) =>
          block.type === "tool_use" &&
          Z(block.name, sinceUuid) &&
          (!r.has(block.id) || redactAccountMemoryInput(block.input) !== block.input),
      )
    )
      return !0;
  }
  return !1;
}
/**
 * 从账号记忆工具输入里收集需遮盖的正文字符串（顶层与 ops 里各操作的文本字段）。
 */
//@ chunk-f25sswmp.js:5189-5449 placement
function collectMemoryTextFields(e) {
  let n = [],
    r = (s, i) => {
      if (typeof s !== "object" || s === null || Pf(s)) return;
      for (let [y, h] of Object.entries(s))
        if (he[i].text.has(y) && typeof h === "string") n.push(h);
        else if (i === "top" && y === "ops" && Array.isArray(h)) for (let E of h) r(E, "op");
    };
  return (r(e, "top"), n);
}
//@ chunk-f25sswmp.js:5449-5971 placement = countToolCallsSince (1)
function countToolCallsSince_2(messages, sinceUuid) {
  let r = [],
    s = new Set();
  for (let message of messages)
    if (message.type === "assistant" && Array.isArray(message.message.content)) {
      for (let y of message.message.content)
        if (y.type === "tool_use" && Z(y.name, sinceUuid))
          (s.add(y.id), r.push(...collectMemoryTextFields(y.input)));
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
      r.toolDenialKind === void 0 ||
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
function messagesWithoutAccountMemory(e, n, r) {
  return redactAccountMemory(e, n, r).messages;
}
//@ chunk-f25sswmp.js:6306-6346 placement
var qe = 32,
  freeze = Object.freeze({ content: ACCOUNT_MEMORY_REMOVED });
//@ chunk-f25sswmp.js:6346-6403 placement
function G(e) {
  return e === ACCOUNT_MEMORY_REMOVED ? freeze : Object.freeze({ content: e });
}
/**
 * 递归遮盖账号记忆工具输入：保留结构与白名单普通字段（op、路径等），文本字段替换为占位；函数、访问器、过深、过宽或代理对象整体替换；没有变化时返回原对象。
 */
//@ chunk-f25sswmp.js:6403-7462 placement
function redactAccountMemoryInput(value, depth = 0, placeholder = ACCOUNT_MEMORY_REMOVED, redactPaths = !1) {
  if (typeof value === "function") return G(placeholder);
  if (typeof value === "string" || types.isStringObject(value))
    return depth === 0 ? G(placeholder) : placeholder;
  if (typeof value !== "object" || value === null) return value;
  if (Pf(value) || depth > 2) return G(placeholder);
  let arrayItems = readUntrustedArray(value);
  if (arrayItems === Uf) return G(placeholder);
  if (arrayItems !== void 0)
    return arrayItems.map((S) => redactAccountMemoryInput(S, depth + 1, placeholder, redactPaths));
  let keys;
  try {
    keys = Object.keys(value);
  } catch {
    return G(placeholder);
  }
  if (keys.length > qe) return G(placeholder);
  let hasHidden =
      Object.getOwnPropertyNames(value).length !== keys.length ||
      Object.getOwnPropertySymbols(value).length > 0,
    level = depth === 0 ? "top" : "op",
    entries = [],
    changed = !1;
  for (let S of keys) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(value, S);
    if (
      ownPropertyDescriptor === void 0 ||
      !("value" in ownPropertyDescriptor) ||
      typeof ownPropertyDescriptor.value === "function"
    ) {
      changed = !0;
      continue;
    }
    let b = redactMemoryField(level, S, ownPropertyDescriptor.value, depth, placeholder, redactPaths);
    if (b === Ee) {
      changed = !0;
      continue;
    }
    if (b instanceof ee) {
      ((changed ||= !b.pristine), entries.push([S, b.strings]));
      continue;
    }
    ((changed ||= b !== ownPropertyDescriptor.value), entries.push([S, b]));
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
    Object.defineProperty(result, S, { value: v, enumerable: !0, writable: !0, configurable: !0 });
  return result;
}
//@ chunk-f25sswmp.js:7462-7533 placement
var Je = new Set(["append", "str_replace", "delete"]),
  Ee = Symbol("dropped");
//@ chunk-f25sswmp.js:7533-7608 placement
class ee {
  strings;
  pristine;
  constructor(e, n) {
    this.strings = e;
    this.pristine = n;
  }
}
/**
 * 对账号记忆工具输入的单个字段做脱敏：允许原样保留的标量（op 只保留已知值）保留，可选敏感字段替换为占位；顶层 path 数组逐项处理；其他替换为占位。
 */
//@ chunk-f25sswmp.js:7608-8071 placement
function redactMemoryField(e, n, r, s, i, y) {
  let h = he[e];
  if (h.plain.has(n)) {
    let E = y && Ke.has(n);
    if (
      n === "op"
        ? typeof r === "string" && Je.has(r)
        : r === null ||
          typeof r === "boolean" ||
          (n !== "include_preview" && (typeof r === "string" || typeof r === "number"))
    )
      return E && (typeof r === "string" || typeof r === "number") ? i : r;
    if (e === "top" && n === "path" && typeof r === "object" && r !== null) return redactPathArray(r, i, E);
    return i;
  }
  if (h.text.has(n)) return i;
  if (e === "top" && n === "ops")
    return !Pf(r) && Array.isArray(r) ? redactAccountMemoryInput(r, s + 1, i, y) : i;
  return Ee;
}
/**
 * 对路径数组做脱敏：只有严格的普通数组（无额外属性、符号或访问器）才逐项处理，否则整体替换为占位。
 */
//@ chunk-f25sswmp.js:8071-8570 placement
function redactPathArray(e, n, r) {
  if (Pf(e)) return n;
  let ownPropertyNames = Object.getOwnPropertyNames(e),
    i =
      Object.getPrototypeOf(e) === Array.prototype &&
      Object.getOwnPropertySymbols(e).length === 0 &&
      Array.isArray(e) &&
      ownPropertyNames.length === e.length + 1 &&
      ownPropertyNames.every((E) => {
        if (E === "length") return !0;
        let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, E);
        return (
          /^(?:0|[1-9]\d*)$/u.test(E) &&
          Number(E) < e.length &&
          ownPropertyDescriptor !== void 0 &&
          "value" in ownPropertyDescriptor
        );
      }),
    y = readUntrustedArray(e);
  if (!Array.isArray(y)) return n;
  let h = [];
  for (let E of y) {
    if (typeof E !== "string") return n;
    h.push(r ? n : E);
  }
  return new ee(h, i && !r);
}
//@ chunk-f25sswmp.js:8570-8761 placement
function pickKnownKeys(e, n) {
  let r = jsonStringify(
      Object.keys(e)
        .filter((y) => n.has(y))
        .sort(),
    ),
    s = weakMap.get(e);
  if (s === void 0) ((s = new Map()), weakMap.set(e, s));
  let i = s.get(r);
  if (i === void 0) ((i = wi(e, (y, h) => n.has(h))), s.set(r, i));
  return i;
}
//@ chunk-f25sswmp.js:8761-8771 placement
var et = 64;

export {
  messagesWithoutAccountMemory,
  countToolCallsSince_2,
  wsr,
  validateImagesInMessages,
  redactAccountMemory,
  redactAccountMemoryInput,
  collectMemoryTextFields,
  et,
  Fli,
  isAccountMemoryAttachment,
  $li,
  countToolCallsSince,
};
