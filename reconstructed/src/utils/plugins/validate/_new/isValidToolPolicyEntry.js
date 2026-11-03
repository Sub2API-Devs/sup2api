/**
 * utils/plugins/validate/_new/isValidToolPolicyEntry.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5aas12zq.js (1)
 * attribution: sole-consumer-new 1
 */
import { isPlainObject } from "../../../isPlainObject.js";

/**
 * isValidToolPolicyEntry：{name, permission_policy?: always_allow|always_ask|always_deny}。
 */
//@ chunk-5aas12zq.js:41940-42139 sole-consumer-new
function isValidToolPolicyEntry(e) {
  return (
    isPlainObject(e) &&
    typeof e.name === "string" &&
    (e.permission_policy === void 0 ||
      (typeof e.permission_policy === "string" &&
        ["always_allow", "always_ask", "always_deny"].includes(e.permission_policy)))
  );
}

export { isValidToolPolicyEntry };
