/**
 * utils/stableHash.ts
 *
 * 2.1.316 新增：稳定哈希
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ay9hyszk.js (4)
 * attribution: placement 4
 */
import { createHash } from "crypto";
import { jsonStringify, jsonParse } from "./slowOperations.js";

//@ chunk-ay9hyszk.js:508-517 placement
var MAX_SORT_DEPTH = 32;
//@ chunk-ay9hyszk.js:517-608 placement
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
//@ chunk-ay9hyszk.js:608-836 placement
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
//@ chunk-ay9hyszk.js:836-884 placement
/**
 * 先 JSON 往返再计算稳定哈希。
 */
function stableHashOfJson(toolName, value) {
  let normalized = jsonParse(jsonStringify(value));
  return stableHashWithSalt(toolName, normalized);
}
export { stableHashOfJson, stableHashWithSalt };
