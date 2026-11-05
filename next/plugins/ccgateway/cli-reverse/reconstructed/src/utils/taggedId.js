/**
 * utils/taggedId.ts
 *
 * 带前缀的 ID 编码（UUID 转大整数等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/taggedId.ts
 * pieces: chunk-evj8g37g.js (8)
 * attribution: placement 7, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { truncateCodePoints } from "./stringUtils.js";

//@ chunk-evj8g37g.js:630-650 placement
/**
 * 工具名最大字符数（200）。
 */
var MAX_WIRE_TOOL_NAME_CHARS = 200;
var MAX_WIRE_TOOL_NAME_BYTES = 128;
//@ chunk-evj8g37g.js:650-746 placement
/**
 * 工具名是否超过长度上限（按码点计）。
 */
function isOverlongToolName(toolName) {
  if (toolName.length <= MAX_WIRE_TOOL_NAME_CHARS) return false;
  let length = 0;
  for (let char of toolName) {
    length++;
    if (length > MAX_WIRE_TOOL_NAME_CHARS) return true;
  }
  return false;
}
//@ chunk-evj8g37g.js:746-814 placement
/**
 * 超长工具名截断，否则返回 undefined。
 */
function clippedToolName(name) {
  return typeof name === "string" && isOverlongToolName(name)
    ? truncateCodePoints(name, MAX_WIRE_TOOL_NAME_CHARS)
    : undefined;
}
//@ chunk-evj8g37g.js:814-1017 placement
function clipOverlongToolNames(content) {
  if (!Array.isArray(content)) return content;
  let copy;
  content.forEach((item, index) => {
    if (!isObjectNonNull(item) || item.type !== "tool_use") return;
    let clippedName = clippedToolName(item.name);
    if (clippedName === undefined) return;
    copy ??= content.slice();
    copy[index] = {
      ...item,
      name: clippedName,
    };
  });
  return copy === undefined ? content : copy;
}
//@ chunk-evj8g37g.js:1017-1068 placement
function isObjectNonNull(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-evj8g37g.js:1068-1105 placement
/**
 * 记忆 id 格式。
 */
var MEMORY_ID_PATTERN = /^mem_[A-Za-z0-9_-]{1,120}$/;
//@ chunk-evj8g37g.js:1105-1294 placement
function base58Encode(n_2) {
  let base = BigInt(58);
  let result = Array(22).fill("1");
  let i_2 = 21;
  let value = n_2;
  while (value > 0n) {
    let rem = Number(value % base);
    result[i_2] = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[rem];
    value = value / base;
    i_2--;
  }
  return result.join("");
}
//@ chunk-evj8g37g.js:1294-1426 fingerprint (2.1.88 match: uuidToBigInt, 1)
function uuidToBigInt(uuid) {
  let hex = uuid.replaceAll("-", "");
  if (hex.length !== 32) throw Error(`Invalid UUID hex length: ${hex.length}`);
  return BigInt("0x" + hex);
}
export {
  MAX_WIRE_TOOL_NAME_BYTES,
  clippedToolName,
  MAX_WIRE_TOOL_NAME_CHARS,
  uuidToBigInt,
  base58Encode,
  isOverlongToolName,
  clipOverlongToolNames,
  MEMORY_ID_PATTERN,
};
