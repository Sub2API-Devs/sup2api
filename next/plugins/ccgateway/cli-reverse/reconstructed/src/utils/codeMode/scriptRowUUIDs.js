/**
 * utils/codeMode/scriptRowUUIDs.ts
 *
 * 脚本行 uuid 的登记与查询（弱映射存储）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m0cw0s4f.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-m0cw0s4f.js:191-209 placement
var weakMap = new WeakMap();
//@ chunk-m0cw0s4f.js:209-284 placement
/**
 * 登记某个会话里出现过的脚本行 uuid。
 */
function rememberScriptRowUUID(set, uuid) {
  let uuidSet = weakMap.get(set);
  if (uuidSet === undefined) {
    uuidSet = new Set();
    weakMap.set(set, uuidSet);
  }
  uuidSet.add(uuid);
}
//@ chunk-m0cw0s4f.js:284-329 placement
/**
 * 该会话是否登记过这个脚本行 uuid。
 */
function isScriptRowUUID(set, uuid) {
  return weakMap.get(set)?.has(uuid) === true;
}
export { isScriptRowUUID, rememberScriptRowUUID };
