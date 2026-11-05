/**
 * utils/objectUtils.ts
 *
 * 2.1.316 新增：对象小工具
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rqh4xyxp.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-rqh4xyxp.js:191-250 placement
/**
 * 归一化查找键（去连字符/下划线并转小写）。
 */
function normalizeKey(key) {
  return key.replace(/[-_]/g, "").toLowerCase();
}
//@ chunk-rqh4xyxp.js:250-305 placement
/**
 * 生成"归一化键 → 原名"的索引 Map。
 */
function normalizeKeyIndex(keys) {
  return new Map(keys.map((key) => [normalizeKey(key), key]));
}
//@ chunk-rqh4xyxp.js:305-431 placement
function isPlainObject(value) {
  if (typeof value !== "object" || value === null) return false;
  let prototypeOf = Object.getPrototypeOf(value);
  return prototypeOf === Object.prototype || prototypeOf === null;
}
export { isPlainObject, normalizeKey, normalizeKeyIndex };
