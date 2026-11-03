/**
 * bridge/sessionIdCompat.ts
 *
 * 并入旧版已有路径（门面模块 toCompatSessionId）：cse_/session_ 两种会话 ID 互转与兼容。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/sessionIdCompat.ts
 * pieces: chunk-s7k22nbx.js (11)
 * attribution: placement 11
 */
import { ao, toCompatSessionId_2 } from "./bridgeHostState.js";

//@ chunk-s7k22nbx.js:4004-4029 placement
var d = /^[a-zA-Z0-9_-]+$/;
/**
 * 校验 ID 只含安全字符，否则抛 "Invalid <名称>: contains unsafe characters"。
 */
//@ chunk-s7k22nbx.js:4029-4121 placement = validateBridgeId (1)
function validateBridgeId(id, label) {
  if (!isSafeBridgeId(id)) throw Error(`Invalid ${label}: contains unsafe characters`);
  return id;
}
//@ chunk-s7k22nbx.js:4121-4161 placement
function isSafeBridgeId(e) {
  return e !== "" && d.test(e);
}
//@ chunk-s7k22nbx.js:4161-4210 placement
function isUsableCreatedSessionId(e) {
  return isSafeBridgeId(e) && !e.startsWith("-");
}
//@ chunk-s7k22nbx.js:4210-4245 placement
function setCseShimGate(e) {
  ao().cseShimGate = e;
}
//@ chunk-s7k22nbx.js:4245-4351 placement
function toCompatSessionId(e) {
  if (!e.startsWith("cse_")) return e;
  let cseShimGate = ao().cseShimGate;
  if (cseShimGate && !cseShimGate()) return e;
  return toCompatSessionId_2(e);
}
//@ chunk-s7k22nbx.js:4351-4397 placement
function remoteRowId(e) {
  return `remote-${e.slice(-8)}`;
}
/**
 * session_xxx → cse_xxx（其它原样）。
 */
//@ chunk-s7k22nbx.js:4397-4474 placement = toCompatSessionId (1)
function toInfraSessionId(id) {
  if (!id.startsWith("session_")) return id;
  return "cse_" + id.slice(8);
}
/**
 * 把 ID 转成与参考 ID 相同的前缀形式。
 */
//@ chunk-s7k22nbx.js:4474-4532 placement
function inSessionIdCostumeOf(reference, id) {
  return reference.startsWith("cse_") ? toInfraSessionId(id) : toCompatSessionId(id);
}
/**
 * 去掉会话 ID 的 session_ / cse_ 前缀。
 */
//@ chunk-s7k22nbx.js:4532-4588 placement
function sessionIdBody(id) {
  return id.replace(/^(?:session|cse)_/, "");
}
/**
 * 是否是带前缀（session_ / cse_）且字符安全的会话 ID。
 */
//@ chunk-s7k22nbx.js:4588-4677 placement = toCompatSessionId (1)
function isSelfAddressableSessionId(id) {
  return (
    (id.startsWith("session_") || id.startsWith("cse_")) && isSafeBridgeId(id) && sessionIdBody(id) !== ""
  );
}

export {
  toInfraSessionId,
  toCompatSessionId,
  sessionIdBody,
  validateBridgeId,
  isSelfAddressableSessionId,
  remoteRowId,
  inSessionIdCostumeOf,
  isSafeBridgeId,
  setCseShimGate,
  isUsableCreatedSessionId,
};
