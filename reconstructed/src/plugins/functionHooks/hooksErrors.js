/**
 * plugins/functionHooks/hooksErrors.ts
 *
 * 2.1.316 新增：函数钩子的错误类（HooksError）与参数/应答数据校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ga3g4pve.js (27)
 * attribution: placement 27
 */
import { isPlainObject } from "../../utils/isPlainObject.js";

/**
 * AbortSignal 的中止原因文本（Error 取 message，无原因用默认）。
 */
//@ chunk-ga3g4pve.js:226-329 placement
function abortReasonText(r, o = "aborted") {
  let { reason: reason } = r;
  return reason instanceof Error ? reason.message : reason === void 0 ? o : String(reason);
}
//@ chunk-ga3g4pve.js:329-379 placement
var eBi = (r) => `the answer is not plain data: ${r}`;
//@ chunk-ga3g4pve.js:379-525 placement
class HooksError extends Error {
  name = "HooksError";
  telemetryMessage = "function hooks error (message not reported: it may contain plugin details)";
  thrownName;
}
/**
 * next() 的参数必须是普通对象，否则抛说明用法的 HooksError。
 */
//@ chunk-ga3g4pve.js:525-670 placement
function requireEventArgument(r, o) {
  if (!isPlainObject(r))
    throw new HooksError(
      `${o}: next() takes the event's argument: next(e) passes it on, next({ ...e, x }) rewrites it`,
    );
  return r;
}
//@ chunk-ga3g4pve.js:670-768 placement
function Aos(r) {
  if (!(r instanceof Error)) return;
  let cause = r.cause;
  return typeof cause === "string" ? cause : void 0;
}
/**
 * 判断值是否像 AbortSignal（有 aborted 与事件监听方法）。
 */
//@ chunk-ga3g4pve.js:768-911 placement
var isAbortSignalLike = (r) =>
  typeof r === "object" &&
  r !== null &&
  "aborted" in r &&
  typeof r.addEventListener === "function" &&
  typeof r.removeEventListener === "function";
//@ chunk-ga3g4pve.js:911-966 placement
var A3t = (r) => `next() argument is not plain data: ${r}`;
//@ chunk-ga3g4pve.js:966-1024 placement
var Xeo = (r, o) => `${r}: arguments are not plain data: ${o}`;
//@ chunk-ga3g4pve.js:1024-1046 placement
class fEe extends HooksError {}
//@ chunk-ga3g4pve.js:1046-1083 placement
var BSi = (r) => r.reason instanceof fEe;
//@ chunk-ga3g4pve.js:1083-1126 placement
var Cos = (r, o) => (o === !0 ? new fEe(r) : new HooksError(r));
//@ chunk-ga3g4pve.js:1126-1181 placement
var spr = (r) => (r.reason instanceof fEe ? { isSettled: !0 } : {});
//@ chunk-ga3g4pve.js:1181-1231 placement
var tBi = (r) => (r instanceof fEe ? new HooksError(r.message) : r);
//@ chunk-ga3g4pve.js:1231-1249 placement
var weakMap = new WeakMap();
//@ chunk-ga3g4pve.js:1249-1320 placement
function ipr(r, o) {
  if (typeof r === "object" && r !== null) weakMap.set(r, o);
  return r;
}
//@ chunk-ga3g4pve.js:1320-1379 placement
var Ros = (r) => (typeof r === "object" && r !== null ? weakMap.get(r) : void 0);
//@ chunk-ga3g4pve.js:1379-1446 placement
class Jeo extends HooksError {
  asked;
  constructor(r, o) {
    super(r);
    this.asked = o;
  }
}
//@ chunk-ga3g4pve.js:1446-1464 placement
var weakSet = new WeakSet();
//@ chunk-ga3g4pve.js:1464-1517 placement
var Qeo = (r) => typeof r === "object" && r !== null && weakSet.has(r);
//@ chunk-ga3g4pve.js:1517-1584 placement
function apr(r) {
  if (typeof r === "object" && r !== null) weakSet.add(r);
  return r;
}
//@ chunk-ga3g4pve.js:1584-1759 placement
function createWeakTagger() {
  let weakMap = new WeakMap();
  return {
    mark(o, t) {
      if (typeof o === "object" && o !== null && t !== void 0) weakMap.set(o, t);
      return o;
    },
    of(o) {
      return typeof o === "object" && o !== null ? weakMap.get(o) : void 0;
    },
  };
}
//@ chunk-ga3g4pve.js:1759-1769 placement
var s = createWeakTagger();
//@ chunk-ga3g4pve.js:1769-1796 placement
var _xt = (r, o) => s.mark(r, o);
//@ chunk-ga3g4pve.js:1796-1854 placement
var SIe = (r) => new HooksError(`${r}: its environment was unloaded`);
//@ chunk-ga3g4pve.js:1854-1899 placement
var lpr = (r, o, t) => ({ plugin: r, op: o, message: t });
//@ chunk-ga3g4pve.js:1899-1963 placement
function nBi(r, o) {
  let t = SIe(r);
  return _xt(t, lpr(r, o, t.message));
}
//@ chunk-ga3g4pve.js:1963-1984 placement
var dpr = (r) => s.of(r);

export {
  HooksError,
  apr,
  Qeo,
  ipr,
  requireEventArgument,
  abortReasonText,
  tBi,
  Ros,
  BSi,
  fEe,
  A3t,
  _xt,
  dpr,
  isAbortSignalLike,
  nBi,
  SIe,
  eBi,
  Xeo,
  lpr,
  Aos,
  Jeo,
  Cos,
  spr,
};
