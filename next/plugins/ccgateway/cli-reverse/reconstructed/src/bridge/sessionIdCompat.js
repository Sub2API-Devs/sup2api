/**
 * bridge/sessionIdCompat.ts
 *
 * 并入旧版已有路径（门面模块 toCompatSessionId）：cse_/session_ 两种会话 ID 互转与兼容。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/sessionIdCompat.ts
 * pieces: chunk-ye9b0w2w.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { bridgeHostState, toCompatSessionId_2 } from "./bridgeHostState.js";

//@ chunk-ye9b0w2w.js:4006-4031 placement
var SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
//@ chunk-ye9b0w2w.js:4031-4123 placement (2.1.88 match: validateBridgeId, 1)
/**
 * 校验 ID 只含安全字符，否则抛 "Invalid <名称>: contains unsafe characters"。
 */
function validateBridgeId(id, label) {
  if (!isSafeBridgeId(id)) throw Error(`Invalid ${label}: contains unsafe characters`);
  return id;
}
//@ chunk-ye9b0w2w.js:4123-4163 placement
function isSafeBridgeId(id) {
  return id !== "" && SAFE_ID_PATTERN.test(id);
}
//@ chunk-ye9b0w2w.js:4163-4212 placement
function isUsableCreatedSessionId(id) {
  return isSafeBridgeId(id) && !id.startsWith("-");
}
//@ chunk-ye9b0w2w.js:4212-4247 placement
function setCseShimGate(cseShimGate) {
  bridgeHostState().cseShimGate = cseShimGate;
}
//@ chunk-ye9b0w2w.js:4247-4353 placement
function toCompatSessionId(sessionId) {
  if (!sessionId.startsWith("cse_")) return sessionId;
  let cseShimGate = bridgeHostState().cseShimGate;
  if (cseShimGate && !cseShimGate()) return sessionId;
  return toCompatSessionId_2(sessionId);
}
//@ chunk-ye9b0w2w.js:4353-4399 placement
function remoteRowId(sessionId) {
  return `remote-${sessionId.slice(-8)}`;
}
//@ chunk-ye9b0w2w.js:4399-4476 placement (2.1.88 match: toCompatSessionId, 1)
/**
 * session_xxx → cse_xxx（其它原样）。
 */
function toInfraSessionId(id) {
  if (!id.startsWith("session_")) return id;
  return "cse_" + id.slice(8);
}
//@ chunk-ye9b0w2w.js:4476-4534 placement
/**
 * 把 ID 转成与参考 ID 相同的前缀形式。
 */
function inSessionIdCostumeOf(reference, id) {
  return reference.startsWith("cse_") ? toInfraSessionId(id) : toCompatSessionId(id);
}
//@ chunk-ye9b0w2w.js:4534-4590 placement
/**
 * 去掉会话 ID 的 session_ / cse_ 前缀。
 */
function sessionIdBody(id) {
  return id.replace(/^(?:session|cse)_/, "");
}
//@ chunk-ye9b0w2w.js:4590-4679 placement (2.1.88 match: toCompatSessionId, 1)
/**
 * 是否是带前缀（session_ / cse_）且字符安全的会话 ID。
 */
function isSelfAddressableSessionId(id) {
  return (
    (id.startsWith("session_") || id.startsWith("cse_")) && isSafeBridgeId(id) && sessionIdBody(id) !== ""
  );
}
export {
  toInfraSessionId,
  sessionIdBody,
  isSafeBridgeId,
  validateBridgeId,
  toCompatSessionId,
  inSessionIdCostumeOf,
  remoteRowId,
  isSelfAddressableSessionId,
  setCseShimGate,
  isUsableCreatedSessionId,
};
