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

//@ chunk-ga3g4pve.js:226-329 placement
/**
 * AbortSignal 的中止原因文本（Error 取 message，无原因用默认）。
 */
function abortReasonText(r, o = "aborted") {
  let { reason } = r;
  return reason instanceof Error ? reason.message : reason === undefined ? o : String(reason);
}
//@ chunk-ga3g4pve.js:329-379 placement
/**
 * 答案不是纯数据
 */
var answerNotPlainData = (r) => `the answer is not plain data: ${r}`;
//@ chunk-ga3g4pve.js:379-525 placement
class HooksError extends Error {
  name = "HooksError";
  telemetryMessage = "function hooks error (message not reported: it may contain plugin details)";
  thrownName;
}
//@ chunk-ga3g4pve.js:525-670 placement
/**
 * next() 的参数必须是普通对象，否则抛说明用法的 HooksError。
 */
function requireEventArgument(r, o) {
  if (!isPlainObject(r))
    throw new HooksError(
      `${o}: next() takes the event's argument: next(e) passes it on, next({ ...e, x }) rewrites it`,
    );
  return r;
}
//@ chunk-ga3g4pve.js:670-768 placement
/**
 * 取错误的字符串 cause
 */
function causeString(r) {
  if (!(r instanceof Error)) return;
  let cause = r.cause;
  return typeof cause === "string" ? cause : undefined;
}
//@ chunk-ga3g4pve.js:768-911 placement
/**
 * 判断值是否像 AbortSignal（有 aborted 与事件监听方法）。
 */
var isAbortSignalLike = (r) =>
  typeof r === "object" &&
  r !== null &&
  "aborted" in r &&
  typeof r.addEventListener === "function" &&
  typeof r.removeEventListener === "function";
//@ chunk-ga3g4pve.js:911-966 placement
/**
 * next() 参数不是纯数据
 */
var nextNotPlainData = (r) => `next() argument is not plain data: ${r}`;
//@ chunk-ga3g4pve.js:966-1024 placement
/**
 * 参数不是纯数据
 */
var argsNotPlainData = (r, o) => `${r}: arguments are not plain data: ${o}`;
//@ chunk-ga3g4pve.js:1024-1046 placement
/**
 * 纯数据校验错误类
 */
class PlainDataError extends HooksError {}
//@ chunk-ga3g4pve.js:1046-1083 placement
/**
 * 是否该类错误
 */
var isPlainDataError = (r) => r.reason instanceof PlainDataError;
//@ chunk-ga3g4pve.js:1083-1126 placement
/**
 * 按标志选错误类
 */
var makeHooksOrPlainError = (reason, isSettled) =>
  isSettled === true ? new PlainDataError(reason) : new HooksError(reason);
//@ chunk-ga3g4pve.js:1126-1181 placement
/**
 * 已结算标记
 */
var settledIfPlainData = (signal) =>
  signal.reason instanceof PlainDataError
    ? {
        isSettled: true,
      }
    : {};
//@ chunk-ga3g4pve.js:1181-1231 placement
/**
 * 转回 HooksError
 */
var unwrapPlainDataError = (r) => (r instanceof PlainDataError ? new HooksError(r.message) : r);
//@ chunk-ga3g4pve.js:1231-1249 placement
var weakMap = new WeakMap();
//@ chunk-ga3g4pve.js:1249-1320 placement
/**
 * 用 WeakMap 打标
 */
function tagWeak(r, o) {
  if (typeof r === "object" && r !== null) weakMap.set(r, o);
  return r;
}
//@ chunk-ga3g4pve.js:1320-1379 placement
/**
 * 读弱标记
 */
var readWeakTag = (r) => (typeof r === "object" && r !== null ? weakMap.get(r) : undefined);
//@ chunk-ga3g4pve.js:1379-1446 placement
/**
 * 询问被拒错误类
 */
class AskRefusedError extends HooksError {
  asked;
  constructor(r, asked) {
    super(r);
    this.asked = asked;
  }
}
//@ chunk-ga3g4pve.js:1446-1464 placement
var weakSet = new WeakSet();
//@ chunk-ga3g4pve.js:1464-1517 placement
/**
 * 是否在弱集合中
 */
var hasWeakSetTag = (r) => typeof r === "object" && r !== null && weakSet.has(r);
//@ chunk-ga3g4pve.js:1517-1584 placement
/**
 * 加入弱集合
 */
function addWeakSetTag(r) {
  if (typeof r === "object" && r !== null) weakSet.add(r);
  return r;
}
//@ chunk-ga3g4pve.js:1584-1759 placement
function createWeakTagger() {
  let weakMap = new WeakMap();
  return {
    mark(o, t) {
      if (typeof o === "object" && o !== null && t !== undefined) weakMap.set(o, t);
      return o;
    },
    of(o) {
      return typeof o === "object" && o !== null ? weakMap.get(o) : undefined;
    },
  };
}
//@ chunk-ga3g4pve.js:1759-1769 placement
/**
 * 弱标记器
 */
var weakTagger = createWeakTagger();
//@ chunk-ga3g4pve.js:1769-1796 placement
/**
 * 打标
 */
var tagError = (error, o) => weakTagger.mark(error, o);
//@ chunk-ga3g4pve.js:1796-1854 placement
/**
 * 环境已卸载错误
 */
var envUnloadedError = (pluginName) => new HooksError(`${pluginName}: its environment was unloaded`);
//@ chunk-ga3g4pve.js:1854-1899 placement
/**
 * 标记载荷
 */
var tagPayload = (plugin, op, message) => ({
  plugin,
  op,
  message,
});
//@ chunk-ga3g4pve.js:1899-1963 placement
/**
 * 带标记的卸载错误
 */
function envUnloadedTagged(plugin, o) {
  let t = envUnloadedError(plugin);
  return tagError(t, tagPayload(plugin, o, t.message));
}
//@ chunk-ga3g4pve.js:1963-1984 placement
/**
 * 读标记
 */
var readTag = (r) => weakTagger.of(r);
export {
  HooksError,
  addWeakSetTag,
  hasWeakSetTag,
  tagWeak,
  requireEventArgument,
  abortReasonText,
  unwrapPlainDataError,
  readWeakTag,
  isPlainDataError,
  PlainDataError,
  nextNotPlainData,
  tagError,
  readTag,
  isAbortSignalLike,
  envUnloadedTagged,
  envUnloadedError,
  answerNotPlainData,
  argsNotPlainData,
  tagPayload,
  causeString,
  AskRefusedError,
  makeHooksOrPlainError,
  settledIfPlainData,
};
