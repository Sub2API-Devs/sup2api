/**
 * utils/hostSuppliedKey.ts
 *
 * 2.1.316 新增：宿主提供的 API key 的状态（未设置、格式错误、忽略、使用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2v5n5pp4.js (5)
 * attribution: placement 5
 */
import { chromeTabGroupKey } from "./sessionShape.js";
import { isInDiagScope } from "./diagLogs.js";
import { getSessionId } from "../bootstrap/state.js";

//@ chunk-2v5n5pp4.js:300-376 placement
var CHAT_KEY_RE = /^chat:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-2v5n5pp4.js:376-485 placement
/**
 * 宿主提供的 key 状态：未设置、格式错误、诊断范围内忽略或使用。
 */
function getHostSuppliedKeyStatus() {
  let e = chromeTabGroupKey();
  if (!e) return "unset";
  if (!CHAT_KEY_RE.test(e)) return "malformed";
  return isInDiagScope() ? "ignored" : "used";
}
//@ chunk-2v5n5pp4.js:485-533 placement
function hostSuppliedKeyIfUsed() {
  return getHostSuppliedKeyStatus() === "used" ? chromeTabGroupKey() : undefined;
}
//@ chunk-2v5n5pp4.js:533-618 placement
/**
 * 取本次会话使用的 key 及其来源（宿主提供或本地会话 id）。
 */
function keyWithOrigin() {
  let e = hostSuppliedKeyIfUsed();
  return e === undefined
    ? {
        key: getSessionId(),
        fromHost: false,
      }
    : {
        key: e,
        fromHost: true,
      };
}
//@ chunk-2v5n5pp4.js:618-650 placement
/**
 * 取会话 key（宿主 key 优先）。
 */
function sessionKeyOrHostKey() {
  return keyWithOrigin().key;
}
export { keyWithOrigin, sessionKeyOrHostKey, getHostSuppliedKeyStatus };
