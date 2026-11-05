/**
 * utils/stableEmptyObject.ts
 *
 * 2.1.316 新增：稳定空对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3ptskxnf.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-3ptskxnf.js:191-204 placement
var EMPTY_FROZEN_OBJECT = {};
var EMPTY_FROZEN_OBJECT_ALT = EMPTY_FROZEN_OBJECT;
//@ chunk-3ptskxnf.js:204-232 placement
/**
 * 返回共享的冻结空对象（真值/假值两个别名）。
 */
function stableEmptyObject(alternate) {
  return alternate ? EMPTY_FROZEN_OBJECT_ALT : EMPTY_FROZEN_OBJECT;
}
export { stableEmptyObject };
