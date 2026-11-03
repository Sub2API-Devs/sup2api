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
var t = /^chat:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/**
 * 宿主提供的 key 状态：未设置、格式错误、诊断范围内忽略或使用。
 */
//@ chunk-2v5n5pp4.js:376-485 placement
function getHostSuppliedKeyStatus() {
  let e = chromeTabGroupKey();
  if (!e) return "unset";
  if (!t.test(e)) return "malformed";
  return isInDiagScope() ? "ignored" : "used";
}
//@ chunk-2v5n5pp4.js:485-533 placement
function o() {
  return getHostSuppliedKeyStatus() === "used" ? chromeTabGroupKey() : void 0;
}
//@ chunk-2v5n5pp4.js:533-618 placement
function dHo() {
  let e = o();
  return e === void 0 ? { key: getSessionId(), fromHost: !1 } : { key: e, fromHost: !0 };
}
//@ chunk-2v5n5pp4.js:618-650 placement
function ycn() {
  return dHo().key;
}

export { dHo, ycn, getHostSuppliedKeyStatus };
