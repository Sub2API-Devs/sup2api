/**
 * utils/errors/hostError.ts
 *
 * 宿主错误的原型链判定与安全字符串化（记录被宿主对象包住时用）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-35jvkmb5.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isUntrustedObject } from "../untrustedValues.js";

//@ chunk-35jvkmb5.js:227-473 placement
/**
 * 沿原型链判定错误是否是宿主（vm 之外）产生的错误对象，最多 64 层，遇到 Fd 标记即否。
 */
function isHostError(error) {
  try {
    let current = error;
    if (current === null || (typeof current !== "object" && typeof current !== "function")) return false;
    for (let depth = 0; depth < 64; depth++) {
      if (isUntrustedObject(current)) return false;
      let prototype = Reflect.getPrototypeOf(current);
      if (prototype === null) return false;
      if (prototype === Error.prototype) return true;
      current = prototype;
    }
    return false;
  } catch {
    return false;
  }
}
//@ chunk-35jvkmb5.js:473-539 placement
/**
 * 把任意值交给虚拟机安全转成字符串，转失败时退回 errMsg。
 */
function vmThrowToString(error, sealers) {
  try {
    return sealers.toStr(error);
  } catch {
    return sealers.errMsg(error);
  }
}
export { isHostError, vmThrowToString };
