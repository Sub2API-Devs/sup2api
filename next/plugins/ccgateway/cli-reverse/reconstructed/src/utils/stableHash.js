/**
 * utils/stableHash.ts
 *
 * 2.1.316 新增：稳定哈希
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-p68axnzw.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash } from "crypto";
import { jsonStringify, jsonParse } from "./slowOperations.js";

//@ chunk-p68axnzw.js:508-517 placement
var MAX_SORT_DEPTH = 32;
//@ chunk-p68axnzw.js:517-608 placement
/**
 * 稳定哈希：sha256(salt \0 JSON(键排序后的值))。
 */
function stableHashWithSalt(text, salt) {
  return createHash("sha256")
    .update(text)
    .update("\x00")
    .update(jsonStringify(sortKeysDeep(salt)))
    .digest("hex");
}
//@ chunk-p68axnzw.js:608-836 placement
function sortKeysDeep(value, depth = 0) {
  if (depth > MAX_SORT_DEPTH) return value;
  if (Array.isArray(value)) return value.map((item) => sortKeysDeep(item, depth + 1));
  if (typeof value === "object" && value !== null)
    return Object.fromEntries(
      Object.entries(value)
        .sort(([leftKey], [rightKey]) => (leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0))
        .map(([key, value]) => [key, sortKeysDeep(value, depth + 1)]),
    );
  return value;
}
//@ chunk-p68axnzw.js:836-884 placement
/**
 * 先 JSON 往返再计算稳定哈希。
 */
function stableHashOfJson(toolName, value) {
  let normalized = jsonParse(jsonStringify(value));
  return stableHashWithSalt(toolName, normalized);
}
export { stableHashOfJson, stableHashWithSalt };
