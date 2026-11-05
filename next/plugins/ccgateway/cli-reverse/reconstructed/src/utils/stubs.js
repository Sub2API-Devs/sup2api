/**
 * utils/stubs.ts
 *
 * 2.1.316 新增：空实现桩。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zeh5h5sy.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-zeh5h5sy.js:263-282 placement
/**
 * 空实现的重启桩。
 */
function noopRelaunch(childEnv, args) {}
//@ chunk-zeh5h5sy.js:282-306 placement
/**
 * 恒 false 的准备桩。
 */
function alwaysFalse() {
  return false;
}
export { alwaysFalse, noopRelaunch };
