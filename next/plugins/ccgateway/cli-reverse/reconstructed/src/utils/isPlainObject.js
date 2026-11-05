/**
 * utils/isPlainObject.ts
 *
 * 2.1.316 新增：是否为非数组对象。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zhh3qac9.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-zhh3qac9.js:191-261 placement
/**
 * 是否为非数组对象。
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export { isPlainObject };
