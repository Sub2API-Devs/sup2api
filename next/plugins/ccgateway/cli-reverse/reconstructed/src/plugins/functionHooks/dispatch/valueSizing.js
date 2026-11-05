/**
 * plugins/functionHooks/dispatch/valueSizing.ts
 *
 * 钩子传值大小度量与超限告警（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j8f885h1.js (27)
 * attribution: placement 27
 */
import { AsyncLocalStorage } from "async_hooks";
import { HooksError, nextNotPlainData, requireEventArgument } from "../hooksErrors.js";
import { MAX_NESTING_DEPTH, NESTING_TOO_DEEP_MESSAGE } from "../../../utils/structuredCloneLimits.js";
import { isPlainDataObject, matcherLog } from "../../../utils/hooks/functionHookMatchers.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { isCoreOrManaged } from "./chain.js";
import { HOOK_TIER_ORDER } from "../builtinHooksModule.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:53001-53014 placement
/**
 * 预算用尽后的宽限 5 秒：超时后仍给它这段时间结算；宽限内不结束就记 lingeredMs 并按策略处理。
 */
var LINGER_GRACE_MS = 5000;
//@ chunk-j8f885h1.js:53063-53078 placement
/**
 * 暂停计时的 ALS
 */
var budgetPauseStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:53063", () => {
  budgetPauseStorage = new AsyncLocalStorage();
});
//@ chunk-j8f885h1.js:53078-53197 placement
/**
 * 在当前钩子预算之外执行 e（暂停计时，结束后恢复）。
 */
async function outsideBudget(fn) {
  let budget = budgetPauseStorage.getStore();
  if (budget === undefined) return fn();
  budget.pause();
  try {
    return await fn();
  } finally {
    budget.resume();
  }
}
//@ chunk-j8f885h1.js:53197-53209 placement
/**
 * 1000
 */
var VALUE_NODE_SLACK = 1000;
//@ chunk-j8f885h1.js:53209-53221 placement
/**
 * 1000
 */
var MAX_TOJSON_DEPTH = 1000;
//@ chunk-j8f885h1.js:53221-53317 placement
/**
 * toJSON 循环说明
 */
var TOJSON_LOOP_TEXT = `a toJSON keeps answering with a value that holds another toJSON, more than ${MAX_TOJSON_DEPTH} times`;
//@ chunk-j8f885h1.js:53317-53335 placement
/**
 * 4294967295
 */
var MAX_UINT32 = 4294967295;
//@ chunk-j8f885h1.js:53335-53568 placement
/**
 * 读取插件给的列表长度并校验（非负整数且不超过 2^32-1），否则抛 HooksError。被各站点校验广泛使用。
 */
function checkedListLength(list) {
  let rawLength = list.length;
  let length =
    typeof rawLength !== "bigint" && typeof rawLength !== "symbol"
      ? Math.max(Math.trunc(Number(rawLength)) || 0, 0)
      : undefined;
  if (length === undefined || length > MAX_UINT32)
    throw new HooksError(
      `a plugin's list claims a length no list has (got ${length ?? `a ${typeof rawLength}`})`,
    );
  return length;
}
//@ chunk-j8f885h1.js:53568-53985 placement
/**
 * 复制值时进入一层：检查深度上限与循环，记录是否为参数自有对象。
 */
function openCopyFrame(value, copyState, parentFrame) {
  let { seen, argument } = copyState;
  if (seen.has(value)) return parentFrame;
  let depth = (parentFrame?.depth ?? 0) + 1;
  if (depth > MAX_NESTING_DEPTH) throw new HooksError(nextNotPlainData(NESTING_TOO_DEEP_MESSAGE));
  let isArray = Array.isArray(value);
  let isPlain = value === argument.own || isPlainDataObject(value);
  let isWhole = !isArray && !isPlain && argument.isWhole;
  if (isWhole && ArrayBuffer.isView(value)) {
    seen.set(value, structuredClone(value));
    return parentFrame;
  }
  if (!(isArray || isPlain || isWhole) || (!isArray && !isPlainObject(value))) return parentFrame;
  let frame = isArray ? [] : Object.keys(value);
  let into = isArray ? checkedListLength(value) : frame.length;
  let keys = isArray ? [] : {};
  seen.set(value, keys);
  return {
    source: value,
    into: keys,
    keys: frame,
    length: into,
    isTaken: isWhole,
    at: 0,
    depth,
    below: parentFrame,
  };
}
//@ chunk-j8f885h1.js:53985-54237 placement
function copyArrayFrame(frame, copyState) {
  let source = Array.isArray(frame.source) ? frame.source : [];
  let into = Array.isArray(frame.into) ? frame.into : [];
  for (let at = frame.at; at < frame.length; at += 1) {
    let item = source[at];
    let isObject = typeof item === "object" && item !== null;
    let nextFrame = isObject ? openCopyFrame(item, copyState, frame) : frame;
    into[at] = isObject ? (copyState.seen.get(item) ?? item) : item;
    if (nextFrame !== frame) {
      frame.at = at + 1;
      return nextFrame;
    }
  }
  return frame.below;
}
//@ chunk-j8f885h1.js:54237-54339 placement
function callToJsonSafely(toJSON, owner, applied) {
  try {
    return [false, applied === undefined ? Reflect.apply(toJSON, owner, [""]) : applied(owner, toJSON, "")];
  } catch (error) {
    return [true, error];
  }
}
//@ chunk-j8f885h1.js:54339-54409 placement
/**
 * 惰性抛/返回值
 */
function lazyThunk([isError, value], answered) {
  let settled = isError ? value : answered(value);
  return () => {
    if (isError) throw settled;
    return settled;
  };
}
//@ chunk-j8f885h1.js:54409-54477 placement
/**
 * 安全的 toJSON 结果
 */
function safeToJsonResult(toJSON, owner, copyState) {
  return lazyThunk(callToJsonSafely(toJSON, owner, copyState.argument.applied), copyState.answered);
}
//@ chunk-j8f885h1.js:54477-54735 placement
function finishObjectFrame(frame, copyState) {
  let { into, source } = frame;
  let { argument, seen } = copyState;
  let toJSON =
    frame.isTaken && argument.answer === undefined && !Object.hasOwn(into, "toJSON")
      ? Reflect.get(source, "toJSON")
      : undefined;
  if (typeof toJSON === "function" && !Array.isArray(into))
    into.toJSON = safeToJsonResult(toJSON, source, copyState);
  if (source === argument.answer) seen.delete(source);
  return frame.below;
}
//@ chunk-j8f885h1.js:54735-55146 placement
function measureJsonValue(frame, copyState) {
  let { into, keys } = frame;
  let source = Array.isArray(frame.source) ? {} : frame.source;
  let isAnswerSource = source === copyState.argument.answer;
  for (let at = frame.at; at < keys.length; at += 1) {
    let key = keys[at] ?? "";
    let value = source[key];
    let isToJson = key === "toJSON" && typeof value === "function";
    let isObject = !isToJson && typeof value === "object" && value !== null;
    let nextFrame = isObject ? openCopyFrame(value, copyState, frame) : frame;
    let copied = isObject ? (copyState.seen.get(value) ?? value) : value;
    if (!(isToJson && isAnswerSource))
      Object.defineProperty(into, key, {
        value: isToJson ? safeToJsonResult(value, source, copyState) : copied,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    if (nextFrame !== frame) {
      frame.at = at + 1;
      return nextFrame;
    }
  }
  return finishObjectFrame(frame, copyState);
}
//@ chunk-j8f885h1.js:55146-55493 placement
/**
 * 迭代深拷贝插件传来的值（处理循环、toJSON 链、深度上限），得到宿主可安全持有的纯数据副本。
 */
function copyPluginValue(value, seen, copyState) {
  if (typeof value !== "object" || value === null) return value;
  let nested = {
    seen,
    argument: copyState,
    answered(answer) {
      if (typeof answer === "object" && answer !== null && copyState.answers >= MAX_TOJSON_DEPTH)
        throw new HooksError(nextNotPlainData(TOJSON_LOOP_TEXT));
      let answers = copyState.answers + 1;
      return copyPluginValue(answer, seen, {
        ...copyState,
        answer,
        answers,
      });
    },
  };
  let copyFrame = openCopyFrame(value, nested, undefined);
  let frame = copyFrame;
  while (frame !== undefined)
    frame = Array.isArray(frame.source) ? copyArrayFrame(frame, nested) : measureJsonValue(frame, nested);
  return (copyFrame === undefined ? seen.get(value) : copyFrame.into) ?? value;
}
//@ chunk-j8f885h1.js:55493-55621 placement
function copyAdoptedValues(values, seen, copyState) {
  let already = new Set(seen.values());
  return values.map((value) =>
    typeof value === "object" && value !== null && !already.has(value)
      ? copyPluginValue(value, seen, {
          ...copyState,
          own: value,
        })
      : value,
  );
}
//@ chunk-j8f885h1.js:55621-55635 placement
/**
 * 原样返回
 */
var identityFn = (value) => value;
//@ chunk-j8f885h1.js:55635-55757 placement
/**
 * 结束一次下游等待：计入等待耗时，全部结束且未结算时恢复计时。
 */
function endDownstreamWait(state, budget) {
  if (--state.pendingDownstream > 0) return;
  state.beneathMs += performance.now() - state.beneathSince;
  if (!state.settled) budget.resume();
}
//@ chunk-j8f885h1.js:55757-55837 placement
/**
 * 答案状态
 */
var answerState = (own, applied, argumentCopy) => ({
  own,
  applied,
  answer: undefined,
  answers: 0,
  isWhole: argumentCopy === "whole",
});
//@ chunk-j8f885h1.js:55837-56007 placement
/**
 * 生成"钩子改写部分未生效"的 hookFailed 上报函数（效果文字固定）。
 */
var createUnappliedReporter = (effect) => (handler, event, why) =>
  matcherLog().hookFailed({
    plugin: handler.name,
    environmentId: handler.environmentId,
    event,
    reason: `${handler.name}: ${why}`,
    effect,
    hasOverrun: false,
    skip: {
      kind: "unapplied",
      why,
    },
  });
//@ chunk-j8f885h1.js:56007-56052 placement
/**
 * 其余改写仍生效
 */
var unappliedRestStands; // deferred: uses createUnappliedReporter of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:56007", () => {
  unappliedRestStands = createUnappliedReporter("the rest of its rewrite went on");
});
//@ chunk-j8f885h1.js:56052-56065 placement
/**
 * 32000
 */
var MAX_VALUE_BYTES = 32000;
//@ chunk-j8f885h1.js:56065-56220 placement
function warnOversizedPluginText(name, event, length) {
  if (length !== undefined && length > MAX_VALUE_BYTES)
    matcherLog().log(
      `${name}: wrote a text of ${length} characters (${event}; over ${MAX_VALUE_BYTES}, accepted: a plugin's text is its own to size)`,
    );
}
//@ chunk-j8f885h1.js:56220-56770 placement
/**
 * 校验并规范 next() 传入的参数：拷贝、采纳、还原与检查（站点规则），记录未生效部分与超长文本警告。
 */
function normalizeNextArgument({ handler, site, e }, value) {
  let argument = requireEventArgument(value, handler.name);
  let needsCheck =
    !isCoreOrManaged(handler) && (site.checkArgument !== undefined || site.restoreArgument !== undefined);
  let isChanged = needsCheck && !Object.is(argument, e);
  let seen = new Map();
  let copyState = answerState(argument, handler.applied, site.argumentCopy);
  let copied = isChanged ? copyPluginValue(argument, seen, copyState) : argument;
  let isPluginArg = needsCheck && handler.isHop !== true;
  let adopted = needsCheck
    ? (site.adoptArgument?.(copied, e, (values) => copyAdoptedValues(values, seen, copyState)) ?? copied)
    : copied;
  let restored = needsCheck ? (site.restoreArgument?.(adopted, e, handler) ?? adopted) : adopted;
  let problem = needsCheck ? site.checkArgument?.(restored, e) : undefined;
  if (problem !== undefined)
    throw new HooksError(`${handler.name}: next() passed an argument with ${problem}`);
  let unapplied = isPluginArg ? site.unappliedArgument?.(copied, e) : undefined;
  if (unapplied !== undefined) unappliedRestStands(handler, site.event, unapplied);
  if (isPluginArg) warnOversizedPluginText(handler.name, site.event, site.measureArgument?.(restored, e));
  return identityFn(restored);
}
//@ chunk-j8f885h1.js:56770-56798 placement
/**
 * 层级序号
 */
var tierIndex = (tier) => HOOK_TIER_ORDER.indexOf(tier);
//@ chunk-j8f885h1.js:56798-56934 placement
/**
 * 找出越过当前层级的 next.to 目标所属插件（用于拒绝绕过）。
 */
function findBypassingFloor(floors, to, name) {
  let toIndex = tierIndex(to);
  return floors.find(
    (floor) =>
      (tierIndex(floor.from) < toIndex ||
        (floor.isPastPeers === true && floor.from === to && floor.plugin !== name)) &&
      toIndex < tierIndex(floor.to),
  )?.plugin;
}
export {
  tierIndex,
  warnOversizedPluginText,
  LINGER_GRACE_MS,
  outsideBudget,
  budgetPauseStorage,
  MAX_VALUE_BYTES,
  createUnappliedReporter,
  endDownstreamWait,
  normalizeNextArgument,
  findBypassingFloor,
  VALUE_NODE_SLACK,
  checkedListLength,
};
