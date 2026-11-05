/**
 * plugins/functionHooks/hooksErrors.ts
 *
 * 2.1.316 新增：函数钩子的错误类（HooksError）与参数/应答数据校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hfwczcha.js (27)
 * attribution: placement 27
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPlainObject } from "../../utils/isPlainObject.js";

//@ chunk-hfwczcha.js:226-329 placement
/**
 * AbortSignal 的中止原因文本（Error 取 message，无原因用默认）。
 */
function abortReasonText(signal, fallback = "aborted") {
  let { reason } = signal;
  return reason instanceof Error ? reason.message : reason === undefined ? fallback : String(reason);
}
//@ chunk-hfwczcha.js:329-379 placement
/**
 * 答案不是纯数据
 */
var answerNotPlainData = (detail) => `the answer is not plain data: ${detail}`;
//@ chunk-hfwczcha.js:379-525 placement
class HooksError extends Error {
  name = "HooksError";
  telemetryMessage = "function hooks error (message not reported: it may contain plugin details)";
  thrownName;
}
//@ chunk-hfwczcha.js:525-670 placement
/**
 * next() 的参数必须是普通对象，否则抛说明用法的 HooksError。
 */
function requireEventArgument(value, name) {
  if (!isPlainObject(value))
    throw new HooksError(
      `${name}: next() takes the event's argument: next(e) passes it on, next({ ...e, x }) rewrites it`,
    );
  return value;
}
//@ chunk-hfwczcha.js:670-768 placement
/**
 * 取错误的字符串 cause
 */
function causeString(error) {
  if (!(error instanceof Error)) return;
  let cause = error.cause;
  return typeof cause === "string" ? cause : undefined;
}
//@ chunk-hfwczcha.js:768-911 placement
/**
 * 判断值是否像 AbortSignal（有 aborted 与事件监听方法）。
 */
var isAbortSignalLike = (value) =>
  typeof value === "object" &&
  value !== null &&
  "aborted" in value &&
  typeof value.addEventListener === "function" &&
  typeof value.removeEventListener === "function";
//@ chunk-hfwczcha.js:911-966 placement
/**
 * next() 参数不是纯数据
 */
var nextNotPlainData = (detail) => `next() argument is not plain data: ${detail}`;
//@ chunk-hfwczcha.js:966-1024 placement
/**
 * 参数不是纯数据
 */
var argsNotPlainData = (label, detail) => `${label}: arguments are not plain data: ${detail}`;
//@ chunk-hfwczcha.js:1024-1046 placement
/**
 * 纯数据校验错误类
 */
class PlainDataError extends HooksError {}
//@ chunk-hfwczcha.js:1046-1083 placement
/**
 * 是否该类错误
 */
var isPlainDataError = (signal) => signal.reason instanceof PlainDataError;
//@ chunk-hfwczcha.js:1083-1126 placement
/**
 * 按标志选错误类
 */
var makeHooksOrPlainError = (reason, isSettled) =>
  isSettled === true ? new PlainDataError(reason) : new HooksError(reason);
//@ chunk-hfwczcha.js:1126-1181 placement
/**
 * 已结算标记
 */
var settledIfPlainData = (signal) =>
  signal.reason instanceof PlainDataError
    ? {
        isSettled: true,
      }
    : {};
//@ chunk-hfwczcha.js:1181-1231 placement
/**
 * 转回 HooksError
 */
var unwrapPlainDataError = (error) =>
  error instanceof PlainDataError ? new HooksError(error.message) : error;
//@ chunk-hfwczcha.js:1231-1249 placement
var weakMap = new WeakMap();
//@ chunk-hfwczcha.js:1249-1320 placement
/**
 * 用 WeakMap 打标
 */
function tagWeak(value, tag) {
  if (typeof value === "object" && value !== null) weakMap.set(value, tag);
  return value;
}
//@ chunk-hfwczcha.js:1320-1379 placement
/**
 * 读弱标记
 */
var readWeakTag = (value) => (typeof value === "object" && value !== null ? weakMap.get(value) : undefined);
//@ chunk-hfwczcha.js:1379-1446 placement
/**
 * 询问被拒错误类
 */
class AskRefusedError extends HooksError {
  asked;
  constructor(message, asked) {
    super(message);
    this.asked = asked;
  }
}
//@ chunk-hfwczcha.js:1446-1464 placement
var weakSet = new WeakSet();
//@ chunk-hfwczcha.js:1464-1517 placement
/**
 * 是否在弱集合中
 */
var hasWeakSetTag = (value) => typeof value === "object" && value !== null && weakSet.has(value);
//@ chunk-hfwczcha.js:1517-1584 placement
/**
 * 加入弱集合
 */
function addWeakSetTag(value) {
  if (typeof value === "object" && value !== null) weakSet.add(value);
  return value;
}
//@ chunk-hfwczcha.js:1584-1759 placement
function createWeakTagger() {
  let weakMap = new WeakMap();
  return {
    mark(value, tag) {
      if (typeof value === "object" && value !== null && tag !== undefined) weakMap.set(value, tag);
      return value;
    },
    of(value) {
      return typeof value === "object" && value !== null ? weakMap.get(value) : undefined;
    },
  };
}
//@ chunk-hfwczcha.js:1759-1769 placement
/**
 * 弱标记器
 */
var weakTagger = createWeakTagger();
//@ chunk-hfwczcha.js:1769-1796 placement
/**
 * 打标
 */
var tagError = (error, tag) => weakTagger.mark(error, tag);
//@ chunk-hfwczcha.js:1796-1854 placement
/**
 * 环境已卸载错误
 */
var envUnloadedError = (pluginName) => new HooksError(`${pluginName}: its environment was unloaded`);
//@ chunk-hfwczcha.js:1854-1899 placement
/**
 * 标记载荷
 */
var tagPayload = (plugin, op, message) => ({
  plugin,
  op,
  message,
});
//@ chunk-hfwczcha.js:1899-1963 placement
/**
 * 带标记的卸载错误
 */
function envUnloadedTagged(plugin, op) {
  let error = envUnloadedError(plugin);
  return tagError(error, tagPayload(plugin, op, error.message));
}
//@ chunk-hfwczcha.js:1963-1984 placement
/**
 * 读标记
 */
var readTag = (value) => weakTagger.of(value);
export {
  HooksError,
  envUnloadedError,
  causeString,
  tagError,
  tagPayload,
  AskRefusedError,
  PlainDataError,
  tagWeak,
  makeHooksOrPlainError,
  settledIfPlainData,
  readTag,
  addWeakSetTag,
  hasWeakSetTag,
  requireEventArgument,
  abortReasonText,
  unwrapPlainDataError,
  readWeakTag,
  isPlainDataError,
  nextNotPlainData,
  isAbortSignalLike,
  envUnloadedTagged,
  answerNotPlainData,
  argsNotPlainData,
};
