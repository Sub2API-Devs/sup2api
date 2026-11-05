/**
 * utils/safeObject.ts
 *
 * 2.1.316 新增。安全对象。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gpkybrmv.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-gpkybrmv.js:191-392 placement
/**
 * 复制对象并去掉 undefined 值，__proto__ 键以自有属性写入（防原型污染）。
 */
function compactEnvObject(source) {
  let target = {};
  for (let [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    if (key === "__proto__")
      Object.defineProperty(target, key, {
        value,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    else target[key] = value;
  }
  return target;
}
export { compactEnvObject };
