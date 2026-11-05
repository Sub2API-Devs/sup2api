/**
 * plugins/functionHooks/dispatch/chain.ts
 *
 * 函数钩子按层（core/prepend/user/append）分发链（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j8f885h1.js (83)
 * attribution: placement 81, layout 2
 */
import { ALL_ELEMENT_TYPES, UI_ELEMENT_TYPES } from "../ui/elements.js";
import { matcherLog } from "../../../utils/hooks/functionHookMatchers.js";
import {
  isAbortError,
  errorMessage,
  sanitizeErrorName,
  withTelemetryMessage,
  AbortError,
} from "../../../utils/errors.js";
import {
  abortReasonText,
  HooksError,
  unwrapPlainDataError,
  readWeakTag,
  isPlainDataError,
  PlainDataError,
} from "../hooksErrors.js";
import {
  tierIndex,
  createUnappliedReporter,
  LINGER_GRACE_MS,
  endDownstreamWait,
  normalizeNextArgument,
  findBypassingFloor,
  outsideBudget,
  VALUE_NODE_SLACK,
  budgetPauseStorage,
  warnOversizedPluginText,
} from "./valueSizing.js";
import { nfcLower } from "../../../utils/stringUtils.js";
import { isBuiltinPluginId } from "../../builtinPlugins.js";
import { hasSimilarMarketplaceName } from "../../../utils/plugins/marketplaceNames.js";
import { tiersBeneath, isAbovePrepend } from "../builtinHooksModule.js";
import {
  SLOW_HOOK_REPORT_INTERVAL_MS_2,
  createSlowHookReportMap,
  reportPluginHookWithoutNext,
} from "./slowHookReports.js";
import { scrubLine } from "../ui/textScrub.js";
import { streamChainSlot, describeStreamHookOverrun, DEFAULT_HOOK_TIMEOUT_MS } from "./streamChain.js";
import { matchesEventPattern } from "../eventPatterns.js";
import { normalizeCaseForComparison_2 } from "../../../utils/permissions/filesystem.js";
import { subscribe } from "../../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { isUntrustedObject } from "../../../utils/untrustedValues.js";
import { identity } from "../../../utils/identity.js";
import { createValueSlot } from "../../../utils/valueSlot.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:51853-51895 placement
/**
 * surface:component
 */
var uiElementKey = (site) => `${site.surface}:${site.component}`;
//@ chunk-j8f885h1.js:51895-52123 placement
/**
 * 生成警告器：ui.resolve 钩子扣留某 UI 元素时，每种元素只警告一次。
 */
function createWithheldElementWarner(name) {
  let warned = new Set();
  return (kind) => {
    let types = kind === undefined ? ALL_ELEMENT_TYPES : UI_ELEMENT_TYPES[kind];
    return (element) => {
      if (!types.includes(element) || warned.has(element)) return;
      warned.add(element);
      matcherLog().log(
        `${name}: $.ui.resolve: <${element}> was withheld by a ui.resolve hook; it draws a fragment`,
        "warn",
      );
    };
  };
}
//@ chunk-j8f885h1.js:52123-52224 placement
/**
 * 钩子处理器所在层：core 为 core，托管为 prepend，其余取 tier（默认 user）。
 */
function handlerTier(handler) {
  let isCore = handler.isCore === true;
  let tier = isCore ? "core" : "prepend";
  return isCore || handler.isManaged === true ? tier : (handler.tier ?? "user");
}
//@ chunk-j8f885h1.js:52224-52271 placement
/**
 * 尝试执行，抛错返回 undefined
 */
function attempt(fn, secondFn) {
  try {
    return secondFn(fn);
  } catch {
    return;
  }
}
//@ chunk-j8f885h1.js:52271-52334 placement
/**
 * 是否因给定信号中止而抛错
 */
var isAbortOf = (error, signal) =>
  signal.aborted &&
  attempt(
    error,
    (secondError) => isAbortError(secondError) || errorMessage(secondError) === abortReasonText(signal),
  ) === true;
//@ chunk-j8f885h1.js:52334-52378 placement
/**
 * 核心或托管步骤
 */
var isCoreOrManaged = (handler) => handler.isCore === true || handler.isManaged === true;
//@ chunk-j8f885h1.js:56963-57116 placement
/**
 * 在 next.to 链上追加一步（冻结），to 取链中最远的目标。
 */
function appendNextToStep(steps, entry) {
  return Object.freeze([
    ...steps,
    Object.freeze({
      ...entry,
      ...(entry.to === "user" && {
        isPastPeers: true,
      }),
      to: steps.reduce((acc, step) => (tierIndex(step.to) > tierIndex(acc) ? step.to : acc), entry.to),
    }),
  ]);
}
//@ chunk-j8f885h1.js:57116-57144 placement
/**
 * 把层级名格式化成 next.to:<tier> 标签，作为分发链里「下一层」的键。
 */
var nextToLabel = (entry) => `next.to:${entry}`;
//@ chunk-j8f885h1.js:57144-57170 placement
var NO_FLOORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:57144", () => {
  NO_FLOORS = Object.freeze([]);
});
//@ chunk-j8f885h1.js:57170-57420 placement
/**
 * 判断插件属于哪一层：内置插件为 builtin（列在最外层时为 prepend），其他按 prepend/append 配置与是否同名市场决定。
 */
function pluginTier(pluginId, managedPluginOrder, tierLists) {
  let folded = nfcLower(pluginId);
  if (isBuiltinPluginId(pluginId)) return tierLists.outermost.includes(folded) ? "prepend" : "builtin";
  let isOutermost = hasSimilarMarketplaceName(pluginId, managedPluginOrder);
  let isManaged = (isUnknown) =>
    tierLists[isUnknown].includes(folded) &&
    (tierLists.from[isUnknown] === "user" ? !isOutermost : isOutermost);
  let tier = isOutermost ? "prepend" : "user";
  let index = isManaged("prepend") ? "prepend" : "append";
  return isManaged("prepend") || isManaged("append") ? index : tier;
}
//@ chunk-j8f885h1.js:57420-58058 placement
/**
 * 解析 next.to() 指向的层（user/append…），只允许托管插件使用
 */
function resolveNextTier(floors, to, run) {
  if (to.length === 0) throw new HooksError(`${run.plugin}: next.to() names no tier`);
  let allowed = tiersBeneath(run.tier);
  return to.toReversed().reduce((acc, tier) => {
    if (!isAbovePrepend(tier))
      throw new HooksError(
        `${run.plugin}: next.to names "${String(tier)}", which is not a tier a dispatch continues at (user, append, builtin, core)`,
      );
    if (allowed.length === 0)
      throw new HooksError(
        `${run.plugin}: next.to is available to managed plugins (prependPlugins / appendPlugins) only, not to a ${run.tier} hook`,
      );
    if (!allowed.includes(tier))
      throw new HooksError(
        `${run.plugin}: next.to("${tier}") skips nothing from ${run.tier}; a ${run.tier} hook may continue at ` +
          tiersBeneath(run.tier).join(", "),
      );
    return appendNextToStep(acc, {
      from: run.tier,
      to: tier,
      plugin: run.plugin,
    });
  }, floors);
}
//@ chunk-j8f885h1.js:58058-58116 placement
/**
 * 毫秒或秒
 */
function formatDuration(ms) {
  return ms >= SLOW_HOOK_REPORT_INTERVAL_MS_2 && ms % SLOW_HOOK_REPORT_INTERVAL_MS_2 === 0
    ? `${ms / SLOW_HOOK_REPORT_INTERVAL_MS_2}s`
    : `${ms}ms`;
}
//@ chunk-j8f885h1.js:58116-58155 placement
/**
 * 调用被替代拒绝
 */
var REFUSED_IN_PLACE = "the call refused in its place";
//@ chunk-j8f885h1.js:58155-58200 placement
/**
 * .catch 兜底后的失败
 */
var FAILED_CLOSED = "failed closed: its .catch answered";
//@ chunk-j8f885h1.js:58200-58230 placement
/**
 * 无文本的值
 */
var NO_TEXT_VALUE = "a value with no text";
//@ chunk-j8f885h1.js:58230-58270 placement
/**
 * 错误文本
 */
var errorTextOf = (error) => attempt(error, (error) => String(errorMessage(error))) ?? NO_TEXT_VALUE;
//@ chunk-j8f885h1.js:58270-58403 placement
function errorKindOf(error) {
  let kind =
    error instanceof HooksError && error.thrownName !== undefined
      ? {
          name: error.thrownName,
        }
      : error;
  return error instanceof Error ? (sanitizeErrorName(kind) ?? "Error") : "unknown";
}
//@ chunk-j8f885h1.js:58403-58477 placement
/**
 * 错误种类与长度摘要
 */
var errorSummary = (error) =>
  `errorKind=${attempt(error, errorKindOf) ?? "unknown"} errorChars=${errorTextOf(error).length}`;
//@ chunk-j8f885h1.js:58477-58567 placement
/**
 * 钩子以 .catch 兜底的失败说明
 */
function failedClosedText(name, error, event) {
  return `hook failed closed: ${name}: ${errorSummary(error)} (${event}; its .catch answered)`;
}
//@ chunk-j8f885h1.js:58567-58629 placement
/**
 * 钩子失败说明
 */
function hookFailedText(name, error, site) {
  return `hook failed: ${name}: ${errorSummary(error)} (${site})`;
}
//@ chunk-j8f885h1.js:58629-58691 placement
/**
 * 加钩子名前缀
 */
var withHookPrefix = (handler, text) =>
  text.startsWith(`${handler.name}: `) ? text : `${handler.name}: ${text}`;
//@ chunk-j8f885h1.js:58691-58760 placement
/**
 * 中断导致未执行
 */
var INTERRUPTED_LEFT_OUT = "left out; the call was interrupted, so the dispatch rejects";
//@ chunk-j8f885h1.js:58760-58893 placement
/**
 * 钩子已结算后再调用 next() 时记警告并返回错误。
 */
function nextAfterSettledError(name) {
  matcherLog().log(`hooks module ${name}: next() after it settled; refused`, "warn");
  return new HooksError(`${name}: next() after it settled`);
}
//@ chunk-j8f885h1.js:58893-58973 placement
/**
 * 中途离开流
 */
var LEFT_MID_STREAM = "left mid-stream; what it yielded stands, the rest came from beneath it";
//@ chunk-j8f885h1.js:58973-59030 placement
/**
 * 结果被扣留
 */
var RESULT_WITHHELD = "what ran beneath it stands; its result withheld";
//@ chunk-j8f885h1.js:59647-59772 placement
function errorNamePrefix(error) {
  let isHooksError = error instanceof HooksError;
  let isError = !isHooksError && error instanceof Error;
  let name = isHooksError ? error.thrownName : isError ? error.name : undefined;
  return name === undefined ? "" : `${name}: `;
}
//@ chunk-j8f885h1.js:59772-59815 placement
/**
 * 清洗后的错误文本
 */
var scrubErrorText = (error) => scrubLine(`${attempt(error, errorNamePrefix) ?? ""}${errorTextOf(error)}`);
//@ chunk-j8f885h1.js:59815-60299 placement
function describeHookOverrun(error, cause) {
  let { expiredMs, lingeredMs, shape, refusedSubject, caught } = cause;
  let secondExpiredMs = caught === undefined ? "" : `; ${caught}`;
  let secondLingeredMs =
    refusedSubject === undefined
      ? {}
      : {
          subject: refusedSubject,
        };
  if (expiredMs !== undefined)
    return {
      kind: "budget",
      why: `ran past its ${formatDuration(expiredMs)} budget${secondExpiredMs}`,
      ...secondLingeredMs,
    };
  if (lingeredMs !== undefined)
    return {
      kind: "lingered",
      why: `did not stop within ${formatDuration(lingeredMs)} of the turn being interrupted`,
      ...secondLingeredMs,
    };
  return shape !== undefined
    ? {
        kind: "shape",
        why: `returned the wrong shape (${scrubLine(shape)})`,
        ...(refusedSubject !== undefined && {
          refusedSubject,
        }),
        ...secondLingeredMs,
      }
    : {
        kind: "threw",
        why: `threw ${scrubErrorText(error)}${secondExpiredMs}`,
        ...secondLingeredMs,
      };
}
//@ chunk-j8f885h1.js:60299-60702 placement
/**
 * 记录钩子处理器失败（日志 + hookFailed 事件，含效果分类）；返回带插件名的原因文本。
 */
function reportHandlerFailure({ error, handler, site, effect, cause }) {
  let text = withHookPrefix(handler, errorTextOf(error));
  matcherLog().log(hookFailedText(handler.name, error, `${site.event}; ${effect}`), "error");
  if (!isCoreOrManaged(handler)) {
    let report = handler.isHop === true;
    let dedupe = effect === INTERRUPTED_LEFT_OUT;
    let secondReport = effect === REFUSED_IN_PLACE;
    let message = effect === RESULT_WITHHELD;
    matcherLog().hookFailed({
      plugin: handler.name,
      environmentId: handler.environmentId,
      event: site.event,
      reason: text,
      effect,
      hasOverrun: false,
      skip: report
        ? undefined
        : {
            ...describeHookOverrun(error, cause),
            ...(dedupe && {
              isCallRejected: dedupe,
            }),
            ...(secondReport && {
              isCallRefused: secondReport,
            }),
            ...(message && {
              isResultWithheld: message,
            }),
          },
    });
  }
  return text;
}
//@ chunk-j8f885h1.js:60702-60733 placement
/**
 * 其答案仍生效
 */
var unappliedAnswerStands; // deferred: uses createUnappliedReporter (./valueSizing.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:60702", () => {
  unappliedAnswerStands = createUnappliedReporter("its answer stands");
});
//@ chunk-j8f885h1.js:60733-60785 placement
/**
 * 跳过，下层代替
 */
var SKIPPED_BELOW_RAN = "skipped; what is below it ran in its place";
//@ chunk-j8f885h1.js:60785-60839 placement
/**
 * 跳过，用最后一次 next 结果
 */
var SKIPPED_LAST_NEXT = "skipped; its last next() run's result stands";
//@ chunk-j8f885h1.js:60839-61207 placement
/**
 * 钩子超出预算后仍在运行一段时间则记录"失控"错误与事件。
 */
function watchOverrun(budget, handler, site) {
  let finished = false;
  let finish = () => {
    finished = true;
  };
  budget.then(finish, finish);
  let lingerMs = streamChainSlot.get()?.lingerMs ?? LINGER_GRACE_MS;
  setTimeout(() => {
    if (finished || isCoreOrManaged(handler)) return;
    let timer = withHookPrefix(
      handler,
      `still running ${lingerMs}ms after its budget ran out; ignores its signal`,
    );
    matcherLog().log(`hook overran: ${timer} (${site.event})`, "error");
    matcherLog().hookFailed({
      plugin: handler.name,
      event: site.event,
      reason: timer,
      effect: "counted toward a runaway",
      hasOverrun: true,
    });
  }, lingerMs).unref?.();
}
//@ chunk-j8f885h1.js:61207-61250 placement
/**
 * 空的链节点状态
 */
var emptyEntryState = () => ({
  entry: undefined,
  beneath: undefined,
});
//@ chunk-j8f885h1.js:61250-61292 placement
/**
 * 冻结链节点
 */
function freezeEntry(run, entry) {
  run.entry = Object.freeze(entry);
}
//@ chunk-j8f885h1.js:61292-61381 placement
/**
 * 取错误与是否调用过
 */
function pickErrorState(state) {
  let { error } = state;
  if (error === undefined) return;
  return {
    error,
    called: state.called === true,
  };
}
//@ chunk-j8f885h1.js:61381-61398 placement
var CLIENT = "client";
//@ chunk-j8f885h1.js:61398-61424 placement
var EMPTY_TRACE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:61398", () => {
  EMPTY_TRACE = Object.freeze([]);
});
//@ chunk-j8f885h1.js:61424-61441 placement
var ENGINE = "engine";
//@ chunk-j8f885h1.js:61441-61489 placement
var ENGINE_ORIGIN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:61441", () => {
  ENGINE_ORIGIN = Object.freeze({
    plugin: ENGINE,
    tier: "core",
  });
});
//@ chunk-j8f885h1.js:61489-61643 placement
/**
 * 冻结 $ 接口对象：函数成员与对象本身的原型置为 null 后 Object.freeze。被函数钩子各处广泛使用。
 */
function freezeApiObject(object) {
  for (let value of Object.values(object))
    if (typeof value === "function") Object.setPrototypeOf(value, null);
  Object.setPrototypeOf(object, null);
  return Object.freeze(object);
}
//@ chunk-j8f885h1.js:61643-61697 placement
/**
 * 原型为 null 的函数
 */
function nullPrototypeFunction(fn) {
  Object.setPrototypeOf(fn, null);
  return fn;
}
//@ chunk-j8f885h1.js:61697-61728 placement
/**
 * 生成事件匹配器
 */
var eventPatternMatcher = (event) => nullPrototypeFunction((args, ctx) => matchesEventPattern(args, event));
//@ chunk-j8f885h1.js:61728-61794 placement
var UNLIMITED_BUDGET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:61728", () => {
  UNLIMITED_BUDGET = Object.freeze({
    ms: 0,
    remainingMs: Number.POSITIVE_INFINITY,
  });
});
//@ chunk-j8f885h1.js:61794-62127 placement (2.1.88 match: CONSOLE_STDERR_METHODS, 0.333)
function freezeHookCall(options) {
  let { call, signal, event, origin } = options;
  let fn = nullPrototypeFunction(call);
  fn.to = nullPrototypeFunction(options.to);
  fn.signal = signal;
  fn.is = options.is;
  fn.event = event;
  fn.origin = origin;
  if (options.caught !== undefined) Object.assign(fn, options.caught);
  Object.defineProperty(fn, "trace", {
    get: nullPrototypeFunction(options.trace),
    enumerable: true,
  });
  Object.defineProperty(fn, "budget", {
    get: nullPrototypeFunction(options.budget ?? (() => UNLIMITED_BUDGET)),
    enumerable: true,
  });
  return Object.freeze(fn);
}
//@ chunk-j8f885h1.js:62127-62147 placement
var makeHookCall = (options) => freezeHookCall(options);
//@ chunk-j8f885h1.js:62147-62177 placement
/**
 * 转发 next
 */
var forwardNext = (value, hookCall, rest) => hookCall.to(value, ...rest);
//@ chunk-j8f885h1.js:62177-62207 placement
/**
 * 带参数调用 next
 */
var callNextWith = (value, hookCall, rest) => hookCall.to(value, ...rest);
//@ chunk-j8f885h1.js:62207-62330 placement
/**
 * 从 hook call 中复制上下文字段（signal、is、event、origin、trace、budget、caught）。
 */
var hookCallContext = (hookCall) => ({
  signal: hookCall.signal,
  is: hookCall.is,
  event: hookCall.event,
  origin: hookCall.origin,
  trace: () => hookCall.trace,
  budget: () => hookCall.budget,
  caught: pickErrorState(hookCall),
});
//@ chunk-j8f885h1.js:62330-62466 placement
/**
 * 沿 beneath 链收集运行轨迹条目，冻结返回。
 */
function traceOfRun(beneath) {
  let entries = [];
  for (let run = beneath; run !== undefined; run = run.beneath)
    if (run.entry !== undefined) entries.push(run.entry);
  return entries.length === 0 ? EMPTY_TRACE : Object.freeze(entries);
}
//@ chunk-j8f885h1.js:62466-62727 placement
var createBottomStep =
  ({ bottom, index, event }) =>
  async (e, ctx, { run, floors }) => {
    let startTime = performance.now();
    let outcome = "rejected";
    let secondE;
    try {
      secondE = await bottom(e, ctx, floors);
      outcome = "returned";
      return secondE;
    } finally {
      freezeEntry(run, {
        index,
        plugin: ENGINE,
        tier: "core",
        event,
        outcome,
        ms: performance.now() - startTime,
        received: e,
        returned: secondE,
      });
    }
  };
//@ chunk-j8f885h1.js:62727-62928 placement (2.1.88 match: createCapacityWake, 0.798)
/**
 * 把源 AbortSignal 的中止转发到目标 controller，返回解除函数。
 */
function forwardAbort(sourceSignal, targetController) {
  if (sourceSignal === undefined) return () => {};
  if (sourceSignal.aborted) {
    targetController.abort(sourceSignal.reason);
    return () => {};
  }
  let abort = () => targetController.abort(sourceSignal.reason);
  sourceSignal.addEventListener("abort", abort, {
    once: true,
  });
  return () => sourceSignal.removeEventListener("abort", abort);
}
//@ chunk-j8f885h1.js:62928-63849 placement
/**
 * 插件调用链里"向下调用"助手（runBelow/call/to/replay），带预算暂停与中止转发。与 bridge 无关。
 */
function createBelowCaller({ handler, below, site, e, budget, downstreamSignal, state, run, floors, tier }) {
  async function runBelow(value, ctx, floors_2 = floors) {
    let raised = site.raiseArgument?.(value) ?? value;
    if (state.pendingDownstream++ === 0) {
      budget.pause();
      state.beneathSince = performance.now();
    }
    let abortController = new AbortController();
    let offDownstream = forwardAbort(downstreamSignal, abortController);
    let offCtx = forwardAbort(ctx, abortController);
    let beneathRun = emptyEntryState();
    if (!downstreamSignal.aborted) run.beneath = beneathRun;
    let pending = below(raised, abortController.signal, {
      run: beneathRun,
      floors: floors_2,
    }).then(
      (value) => {
        let carried = site.carry === undefined ? value : site.carry(value, raised, e);
        state.belowRejected = undefined;
        state.fromBelow = [...state.fromBelow, carried];
        return carried;
      },
      (error) => {
        state.belowRejected = {
          error,
        };
        throw error;
      },
    );
    state.inFlight = pending;
    try {
      return await pending;
    } finally {
      offDownstream();
      offCtx();
      endDownstreamWait(state, budget);
    }
  }
  function normalizeArg(value) {
    let normalized = normalizeNextArgument(
      {
        handler,
        site,
        e,
      },
      value,
    );
    if (state.settled) throw nextAfterSettledError(handler.name);
    return normalized;
  }
  let tierFloors = (to) =>
    resolveNextTier(floors, to, {
      plugin: handler.name,
      tier,
    });
  return {
    runBelow,
    call: async (value, ctx, secondFloors) => runBelow(normalizeArg(value), ctx, secondFloors),
    to: async (value, to) => runBelow(normalizeArg(value), undefined, tierFloors(to)),
    replay: async (value, ctx, thirdFloors) =>
      state.inFlight ??
      runBelow(
        normalizeNextArgument(
          {
            handler,
            site,
            e,
          },
          value,
        ),
        ctx,
        thirdFloors,
      ),
    replayTo: async (value, to) =>
      state.inFlight ??
      runBelow(
        normalizeNextArgument(
          {
            handler,
            site,
            e,
          },
          value,
        ),
        undefined,
        tierFloors(to),
      ),
  };
}
//@ chunk-j8f885h1.js:63849-63921 placement
/**
 * 无实现的拒绝
 */
var missingImplementation = (site) => Promise.reject(new HooksError(`no implementation for ${site.event}`));
//@ chunk-j8f885h1.js:63921-63976 placement
/**
 * 转发中止
 */
var forwardAbortWith = (signal, abortController) =>
  forwardAbort(signal, {
    abort: (reason) => abortController.abort(attempt(reason, unwrapPlainDataError) ?? reason),
  });
//@ chunk-j8f885h1.js:63976-64324 layout
/**
 * 把同一跳的多个插件处理器合并为一个链节点（名字相连、层级与插件列表）。
 */
var createHopHandler = (handler, members) => ({
  name: members.map((handler) => handler.name).join("+"),
  tier: members[0]?.tier,
  tiers: normalizeCaseForComparison_2(members.map(handlerTier)),
  plugins: members.map((tier) => tier.name),
  ...(members.at(-1)?.answersForEngine && {
    answersForEngine: true,
  }),
  budgetMs: 0,
  isHop: true,
  ...(members[0]?.withheld && {
    withheld: members[0].withheld,
  }),
  run: (hop, secondMembers, { call: secondSecondMembers, floors, cutAt }) =>
    handler.run({
      members,
      e: hop,
      call: secondSecondMembers,
      signal: secondMembers.signal,
      origin: secondMembers.origin,
      floors,
      cutAt,
    }),
});
//@ chunk-j8f885h1.js:64324-64507 placement
var groupByHop = (handlers) =>
  handlers.reduce((acc, handler) => {
    let last = acc.at(-1);
    return handler.hop !== undefined && last?.hop?.key === handler.hop.key
      ? [
          ...acc.slice(0, -1),
          {
            hop: last.hop,
            members: [...last.members, handler],
          },
        ]
      : [
          ...acc,
          {
            hop: handler.hop,
            members: [handler],
          },
        ];
  }, []);
//@ chunk-j8f885h1.js:64507-64643 layout
/**
 * 把插件钩子成员列表按 hop 合并成执行阶段（切分误归 spawnMultiAgent）。
 */
var groupIntoHops = (handlers, isUnfolded = false) =>
  (isUnfolded
    ? handlers.map((handler) => ({
        hop: handler.hop,
        members: [handler],
      }))
    : groupByHop(handlers)
  ).map((group) => {
    let hop = group.hop;
    return hop === undefined ? group.members[0] : createHopHandler(hop, group.members);
  });
//@ chunk-j8f885h1.js:64643-64654 placement
/**
 * 10000
 */
var SLOW_HOOK_REPORT_INTERVAL_MS = 1e4;
//@ chunk-j8f885h1.js:64654-64666 placement
/**
 * 慢钩子上报表
 */
var slowHookReports; // deferred: uses createSlowHookReportMap (./slowHookReports.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:64654", () => {
  slowHookReports = createSlowHookReportMap();
});
//@ chunk-j8f885h1.js:64666-64679 placement
/**
 * 钩子作用域存储
 */
var hookScopeStore; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:64666", () => {
  hookScopeStore = subscribe();
});
//@ chunk-j8f885h1.js:64679-64818 placement
function recordPassedBy(passedBy) {
  try {
    hookScopeStore.get()?.(passedBy);
  } catch (error) {
    matcherLog().log(
      `passed-by: a sighting of ${passedBy.link} on ${passedBy.event} was not recorded: ${errorMessage(error)}`,
      "error",
    );
  }
}
//@ chunk-j8f885h1.js:64818-64957 placement
function flushBypassCount(key, message, req) {
  let count = slowHookReports.get(key)?.count ?? 0;
  slowHookReports.delete(key);
  if (count > 0) {
    matcherLog().log(
      `${message} ${count} more times in the last ${SLOW_HOOK_REPORT_INTERVAL_MS / SLOW_HOOK_REPORT_INTERVAL_MS_2}s`,
    );
    recordPassedBy({
      ...req,
      count,
    });
  }
}
//@ chunk-j8f885h1.js:64957-64969 placement
/**
 * 跳过提示（skipped）跟踪表最多保留 256 个键，超过后不再新增条目，避免长会话里无限增长。
 */
var MAX_TRACKED_SKIP_KEYS = 256;
//@ chunk-j8f885h1.js:64969-65224 placement
/**
 * 记录被跳过的插件钩子（按事件/插件/原因计数，有上限），返回首次出现的插件列表。
 */
function recordSkipNotices(seen, notice) {
  let { plugins, event, by, count } = notice;
  let fresh = [];
  if (seen === undefined) return fresh;
  for (let plugin of plugins) {
    let key = `${event} ${plugin} ${by}`;
    let existing = seen.get(key);
    let shouldTrack = existing !== undefined || seen.size < MAX_TRACKED_SKIP_KEYS;
    if (shouldTrack)
      seen.set(key, {
        plugin,
        event,
        by,
        count: (existing?.count ?? 0) + count,
      });
    if (shouldTrack && existing === undefined) fresh.push(plugin);
  }
  return fresh;
}
//@ chunk-j8f885h1.js:65224-65237 placement
/**
 * 跳过钩子的上报器
 */
var skippedHookReporter; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:65224", () => {
  skippedHookReporter = subscribe();
});
//@ chunk-j8f885h1.js:65237-65296 placement
/**
 * 取跳过报告
 */
function skippedHookReport() {
  try {
    return skippedHookReporter.get()?.() ?? "";
  } catch {
    return "";
  }
}
//@ chunk-j8f885h1.js:65296-65577 placement
function noteBypass(bypass) {
  let { link, tier, event, by, session } = bypass;
  let key = `${session} ${event} ${link} ${by}`;
  let report = slowHookReports.get(key);
  if (report !== undefined) {
    report.count += 1;
    return;
  }
  let message = `${link}: ${event} bypassed by ${by} (tier ${tier})`;
  matcherLog().log(`${message}; beneath runs`);
  recordPassedBy(bypass);
  let timer = setTimeout(flushBypassCount, SLOW_HOOK_REPORT_INTERVAL_MS, key, message, bypass);
  timer.unref();
  slowHookReports.set(key, {
    count: 0,
    timer,
  });
}
//@ chunk-j8f885h1.js:65577-66092 placement
/**
 * 若该层已被更高层的 next.to 越过，记录"被绕过"并返回新的下降状态，否则 undefined。
 */
function maybeBypassHandler({ handler, tier, index, site, e, descent }) {
  let { run, floors } = descent;
  if (floors.length === 0 || isCoreOrManaged(handler)) return;
  let mapped = (handler.isHop === true ? (handler.tiers ?? []) : [tier]).map((tier) =>
    findBypassingFloor(floors, tier, handler.name),
  );
  let byFloor = mapped.length > 0 && mapped.every((floor) => floor !== undefined) ? mapped[0] : undefined;
  if (byFloor === undefined) return;
  noteBypass({
    link: handler.name,
    plugins: handler.plugins ?? [handler.name],
    tier,
    event: site.event,
    by: byFloor,
    count: 1,
    session: skippedHookReport(),
  });
  freezeEntry(run, {
    index,
    plugin: handler.name,
    tier,
    event: site.event,
    outcome: "skipped",
    reason: `bypassed by ${byFloor}`,
    ms: 0,
    received: e,
    returned: undefined,
  });
  let by = emptyEntryState();
  run.beneath = by;
  return {
    run: by,
    floors,
  };
}
//@ chunk-j8f885h1.js:66092-66143 placement
/**
 * 未冻结则冻结
 */
function freezeUnlessFrozen(value) {
  if (!isUntrustedObject(value)) Object.freeze(value);
  return value;
}
//@ chunk-j8f885h1.js:66143-66342 placement
var createChainHookCall = ({ call, to, signal, event, origin, run, budget, caught }) =>
  freezeHookCall({
    call,
    to: (value, ...rest) => to(value, rest),
    signal,
    is: eventPatternMatcher(event),
    event,
    origin,
    trace: () => traceOfRun(run.beneath),
    budget: () => budget.reading(),
    caught,
  });
//@ chunk-j8f885h1.js:66342-66465 placement
var createChainState = () => ({
  pendingDownstream: 0,
  settled: false,
  inFlight: undefined,
  fromBelow: [],
  belowRejected: undefined,
  beneathMs: 0,
  beneathSince: 0,
});
//@ chunk-j8f885h1.js:66465-66681 placement
/**
 * 为被中止的钩子调用生成 AbortError：优先使用现成的中止错误，否则包装中止原因（遥测里不带插件细节）。
 */
function abortErrorFor(signal, error) {
  return (
    [error, signal.reason].find(
      (candidate) => attempt(candidate, (value) => value instanceof Error && isAbortError(value)) === true,
    ) ??
    attempt(signal, (thirdSignal) =>
      withTelemetryMessage(
        new AbortError(abortReasonText(thirdSignal)),
        "function hooks call aborted (reason not reported: it may contain plugin details)",
      ),
    ) ??
    new AbortError(NO_TEXT_VALUE)
  );
}
//@ chunk-j8f885h1.js:66681-66989 placement
/**
 * 应用站点的 keptResult 规则：结果被部分保留时记录原因，出错时写入插件日志。
 */
function applyKeptResult({ handler, site, e, fromBelow }, answer) {
  let kept = answer;
  try {
    let keptResult = site.keptResult?.(answer, e, fromBelow);
    if (keptResult !== undefined) {
      kept = keptResult.kept;
      unappliedAnswerStands(handler, site.event, keptResult.why);
    }
  } catch (error) {
    try {
      matcherLog().log(
        `${handler.name}: what the engine keeps of its ${site.event} answer could not be settled or said (${errorTextOf(error)}); the answer stands`,
        "error",
      );
    } catch {
      return kept;
    }
  }
  return kept;
}
//@ chunk-j8f885h1.js:66989-67053 placement
/**
 * .catch 返回值说明
 */
function catchReturnedText(problem, problem_2) {
  return problem_2 !== undefined ? `its .catch returned ${problem_2}` : problem;
}
//@ chunk-j8f885h1.js:67053-67162 placement
function catchFailureText({ kind, error, rejection }) {
  let isThrow = kind === "throw";
  let rejectionText = rejection === undefined ? undefined : errorTextOf(rejection.error);
  return isThrow ? errorTextOf(error) : rejectionText;
}
//@ chunk-j8f885h1.js:67162-68201 placement
async function runHookCatch({ handler, e, signal, state, handle, site, origin, run, cutAt, kind, error }) {
  let catchHook = handler.catch;
  if (catchHook === undefined)
    return {
      answer: undefined,
      problem: undefined,
    };
  let called = state.inFlight !== undefined;
  await state.inFlight?.then(undefined, () => {
    return;
  });
  let failureText = catchFailureText({
    kind,
    error,
    rejection: state.belowRejected,
  });
  let abortController = new AbortController();
  let offAbort = forwardAbort(signal, abortController);
  let isSettled = false;
  let settledError = `${handler.name}: next() after its .catch settled`;
  let guard = (fn) => (isSettled ? Promise.reject(new HooksError(settledError)) : outsideBudget(fn));
  let grace = describeStreamHookOverrun(VALUE_NODE_SLACK, signal, cutAt);
  let chainHookCall = createChainHookCall({
    call: (value, ctx, floors) => guard(() => handle.replay(value, ctx, floors)),
    to: (value, to) => guard(() => handle.replayTo(value, to)),
    signal: abortController.signal,
    event: site.event,
    origin,
    run,
    budget: grace,
    caught: {
      error: Object.freeze({
        kind,
        ...(failureText === undefined
          ? {}
          : {
              message: failureText,
            }),
        budget: VALUE_NODE_SLACK,
      }),
      called,
    },
  });
  let answerPromise;
  try {
    answerPromise = budgetPauseStorage.run(grace, () => catchHook(e, chainHookCall));
    return {
      answer:
        grace.expired === undefined
          ? await answerPromise
          : await Promise.race([answerPromise, grace.expired]),
      problem: undefined,
    };
  } catch (error) {
    if (isAbortOf(error, signal)) throw abortErrorFor(signal, error);
    let graceText = formatDuration(VALUE_NODE_SLACK);
    let isExpired = grace.isExpired();
    let problem = isExpired
      ? `its .catch ran past its ${graceText} grace`
      : `its .catch threw ${scrubErrorText(error)}`;
    abortController.abort(new HooksError(`${handler.name}: ${problem}`));
    if (isExpired && answerPromise !== undefined) watchOverrun(answerPromise, handler, site);
    return {
      answer: undefined,
      problem,
      thrown: error,
    };
  } finally {
    isSettled = true;
    grace.clear();
    offAbort();
  }
}
//@ chunk-j8f885h1.js:68201-72010 placement
/**
 * 按层运行函数钩子链：next() 传递、拒绝向上传递、超时告警
 */
var runHookChain =
  ({ handler, index, below, site, budgetMs, cutAt, origin, nothingBelow, answersForEngine }) =>
  async (e, ctx, descent) => {
    let { run, floors } = descent;
    let tier = handlerTier(handler);
    let skipped = maybeBypassHandler({
      handler,
      tier,
      index,
      site,
      e,
      descent,
    });
    if (skipped !== undefined) return below(e, ctx, skipped);
    let startTime = performance.now();
    let chainState = createChainState();
    let abortController = new AbortController();
    let offDownstream = forwardAbort(ctx, abortController);
    let abortController_2 = new AbortController();
    let offCtx = forwardAbort(ctx, abortController_2);
    let budgetMs_2 = handler.budgetMs ?? budgetMs;
    let budget = describeStreamHookOverrun(budgetMs_2, ctx, cutAt);
    let frozen = freezeUnlessFrozen(e);
    let belowCaller = createBelowCaller({
      handler,
      below,
      site,
      e,
      budget,
      downstreamSignal: abortController.signal,
      state: chainState,
      run,
      floors,
      tier,
    });
    let { call, to, runBelow } = belowCaller;
    let chainHookCall = createChainHookCall({
      call,
      to,
      signal: abortController_2.signal,
      event: site.event,
      origin,
      run,
      budget,
    });
    function warnBelowRejected(error) {
      matcherLog().log(
        `${handler.name}: its next() rejected below it (${site.event}); the rejection passes up`,
      );
      return error;
    }
    function settleAnswer(answer) {
      let settle = site.settle;
      let isPlainSite = isCoreOrManaged(handler) || settle === undefined;
      try {
        let settled = isPlainSite ? answer : settle(answer);
        let restored = isCoreOrManaged(handler)
          ? settled
          : (site.restoreResult?.(settled, chainState.fromBelow, e, handler) ?? settled);
        let stripped =
          isCoreOrManaged(handler) || answersForEngine
            ? restored
            : (site.stripResult?.(restored, chainState.fromBelow, handler) ?? restored);
        let isHopSite = handler.isHop === true && site.checkHop !== undefined;
        let problem = isCoreOrManaged(handler)
          ? undefined
          : isHopSite
            ? site.checkHop?.(stripped, e)
            : site.check?.(stripped, e, chainState.fromBelow);
        let isPluginAnswer = problem === undefined && !isCoreOrManaged(handler) && handler.isHop !== true;
        if (isPluginAnswer)
          warnOversizedPluginText(
            handler.name,
            site.event,
            site.measure?.(stripped, e, chainState.fromBelow),
          );
        if (isPluginAnswer && site.isLateRefusal?.(stripped, chainState.fromBelow) === true)
          matcherLog().log(
            `${handler.name}: ${site.event} hook refused after its next() was answered: what ran beneath it is not undone`,
            "warn",
          );
        return {
          settled: isPluginAnswer
            ? applyKeptResult(
                {
                  handler,
                  site,
                  e,
                  fromBelow: chainState.fromBelow,
                },
                stripped,
              )
            : stripped,
          problem,
        };
      } catch (error) {
        let problem = `a result the site cannot read (${errorTextOf(error)})`;
        return {
          settled: answer,
          problem,
        };
      }
    }
    function fromError(error) {
      let weakTag = readWeakTag(error);
      let hasNext = chainState.inFlight !== undefined;
      let tagAnswer = hasNext ? weakTag?.afterNext : weakTag?.answer;
      let secondSettled = tagAnswer === undefined ? undefined : settleAnswer(tagAnswer);
      let isWithholding = hasNext && weakTag?.isWithholding === true;
      if (weakTag?.isNoted === true) handler.withheld?.();
      return secondSettled?.problem === undefined && secondSettled !== undefined
        ? {
            settled: secondSettled.settled,
            effect: isWithholding ? RESULT_WITHHELD : REFUSED_IN_PLACE,
          }
        : undefined;
    }
    let value;
    let returned;
    let outcome = "rejected";
    let noNext = false;
    let runPromise;
    let shape;
    try {
      runPromise = budgetPauseStorage.run(budget, () =>
        handler.run(frozen, chainHookCall, {
          call,
          floors,
          cutAt,
        }),
      );
      let result =
        budget.expired === undefined ? await runPromise : await Promise.race([runPromise, budget.expired]);
      if (result === undefined) {
        shape = "no result";
        throw new HooksError("returned no result");
      }
      let { settled, problem } = settleAnswer(result);
      if (problem !== undefined) {
        shape = problem;
        throw new HooksError(`returned ${problem}`);
      }
      value = settled;
      returned = settled;
      outcome = result === chainState.fromBelow.at(-1) ? "passed" : "returned";
      noNext = chainState.inFlight === undefined && !isCoreOrManaged(handler) && handler.isHop !== true;
    } catch (error) {
      if (isAbortOf(error, ctx)) throw abortErrorFor(ctx, error);
      let isExpired = budget.isExpired();
      let belowRejected = isExpired ? undefined : chainState.belowRejected;
      if (belowRejected !== undefined && handler.catch === undefined)
        throw warnBelowRejected(belowRejected.error);
      let prefix = withHookPrefix(handler, errorTextOf(error));
      chainState.settled = true;
      if (isExpired && runPromise !== undefined) {
        abortController_2.abort(new HooksError(prefix));
        watchOverrun(runPromise, handler, site);
      }
      let secondHasNext = chainState.inFlight !== undefined;
      let secondFromError = isExpired ? undefined : fromError(error);
      let caught =
        ctx.aborted || secondFromError !== undefined
          ? {
              answer: undefined,
              problem: undefined,
              thrown: undefined,
            }
          : await runHookCatch({
              handler,
              e: frozen,
              signal: ctx,
              state: chainState,
              handle: belowCaller,
              site,
              origin,
              run,
              cutAt,
              kind: isExpired ? "timeout" : "throw",
              error,
            });
      let settledAnswer = caught.answer === undefined ? undefined : settleAnswer(caught.answer);
      let caughtOk = settledAnswer !== undefined && settledAnswer.problem === undefined;
      let held = secondFromError ?? (caughtOk ? undefined : fromError(caught.thrown));
      if (held !== undefined) {
        reportHandlerFailure({
          error,
          handler,
          site,
          effect: held.effect,
          cause: {
            expiredMs: undefined,
            lingeredMs: undefined,
            shape,
            caught: catchReturnedText(caught.problem, settledAnswer?.problem),
          },
        });
        value = held.settled;
        returned = held.settled;
      } else if (caughtOk) {
        matcherLog().log(failedClosedText(handler.name, error, site.event), "warn");
        matcherLog().hookFailed({
          plugin: handler.name,
          environmentId: handler.environmentId,
          event: site.event,
          reason: prefix,
          effect: FAILED_CLOSED,
          hasOverrun: false,
        });
        value = settledAnswer.settled;
        returned = settledAnswer.settled;
        outcome = "caught";
      } else if (belowRejected === undefined) {
        let isInterrupted = secondHasNext && ctx.aborted && attempt(ctx, isPlainDataError) !== true;
        reportHandlerFailure({
          error,
          handler,
          site,
          effect: isInterrupted
            ? INTERRUPTED_LEFT_OUT
            : secondHasNext
              ? SKIPPED_LAST_NEXT
              : SKIPPED_BELOW_RAN,
          cause: {
            expiredMs: isExpired ? budgetMs_2 : undefined,
            lingeredMs: budget.hasGraceExpired() ? LINGER_GRACE_MS : undefined,
            shape,
            refusedSubject: site.refusedSubject?.(e),
            caught: catchReturnedText(caught.problem, settledAnswer?.problem),
          },
        });
        if (isInterrupted) throw abortErrorFor(ctx);
        if (chainState.inFlight === undefined && nothingBelow) throw error;
        value = await (chainState.inFlight ?? runBelow(e));
        returned = secondHasNext ? value : undefined;
        outcome = isExpired ? "expired" : secondHasNext ? "kept" : "skipped";
      } else throw warnBelowRejected(belowRejected.error);
    } finally {
      chainState.settled = true;
      budget.clear();
      offCtx();
      offDownstream();
      let startTime_2 = performance.now();
      let ms =
        startTime_2 -
        startTime -
        chainState.beneathMs -
        (chainState.pendingDownstream > 0 ? startTime_2 - chainState.beneathSince : 0);
      freezeEntry(run, {
        index,
        plugin: handler.isCore === true ? ENGINE : handler.name,
        tier,
        event: site.event,
        outcome,
        ms,
        received: e,
        returned,
      });
      if (noNext)
        reportPluginHookWithoutNext({
          plugin: handler.name,
          tier,
          event: site.event,
          ms,
        });
      if (chainState.pendingDownstream > 0)
        abortController.abort(new PlainDataError(`${handler.name} settled the call`));
    }
    return value;
  };
//@ chunk-j8f885h1.js:72010-72185 placement
/**
 * 记录钩子链各步的输入与产出：keep 追加，of/last/all/ran 查询。
 */
function createStepRecorder() {
  let entries = [];
  return {
    keep: (input, made) =>
      entries.push({
        input,
        made,
      }),
    of: (input) => (input === undefined ? undefined : entries[input - 1]),
    last: (made) => (made === undefined ? entries.at(-1) : entries.findLast(made)),
    all: () => entries,
    ran: () => entries.length > 0,
  };
}
//@ chunk-j8f885h1.js:72185-72221 placement
/**
 * 当前分发槽
 */
var currentDispatchSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:72185", () => {
  currentDispatchSlot = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-j8f885h1.js:72221-72243 placement
/**
 * 取当前分发
 */
var currentDispatch = () => currentDispatchSlot.get();
//@ chunk-j8f885h1.js:72243-72270 placement
/**
 * 是否有当前分发
 */
var hasCurrentDispatch = () => currentDispatch() !== undefined;
//@ chunk-j8f885h1.js:72270-72964 placement
async function reportChainFailure({
  e: eventInput,
  handlers,
  site,
  signal = new AbortController().signal,
  isHopFold,
  isUnfolded,
  cutAt,
  budgetMs = site.budgetMs ?? streamChainSlot.get()?.ms ?? DEFAULT_HOOK_TIMEOUT_MS,
  bottom,
  origin = ENGINE_ORIGIN,
  floors = NO_FLOORS,
  trace,
}) {
  let hops = groupIntoHops(handlers, isUnfolded);
  let bottomStep = createBottomStep({
    bottom: bottom ?? (() => missingImplementation(site)),
    index: hops.length,
    event: site.event,
  });
  let runState = emptyEntryState();
  let isDispatching = hasCurrentDispatch();
  let abortController = new AbortController();
  let offAbort = isHopFold === true ? undefined : forwardAbortWith(signal, abortController);
  return hops
    .reduceRight((below, handler, hopIndex) => {
      let isLast = hopIndex === hops.length - 1;
      return runHookChain({
        handler,
        index: hopIndex,
        below,
        site,
        budgetMs,
        cutAt,
        origin,
        nothingBelow: bottom === undefined && isLast,
        answersForEngine: isDispatching && isLast && handler.answersForEngine === true,
      });
    }, bottomStep)(eventInput, isHopFold === true ? signal : abortController.signal, {
      run: runState,
      floors,
    })
    .then((value) => {
      trace?.(traceOfRun(runState));
      return value;
    })
    .catch((error) => {
      if (!isAbortOf(error, signal)) matcherLog().log(`hooks chain failed: ${errorSummary(error)}`, "error");
      throw error;
    })
    .finally(offAbort);
}
export {
  attempt,
  isAbortOf,
  freezeApiObject,
  nullPrototypeFunction,
  reportChainFailure,
  forwardAbort,
  pluginTier,
  ENGINE_ORIGIN,
  hasCurrentDispatch,
  createWithheldElementWarner,
  NO_FLOORS,
  createStepRecorder,
  ENGINE,
  currentDispatch,
  nextToLabel,
  EMPTY_TRACE,
  skippedHookReporter,
  hookScopeStore,
  recordSkipNotices,
  MAX_TRACKED_SKIP_KEYS,
  handlerTier,
  FAILED_CLOSED,
  CLIENT,
  freezeHookCall,
  callNextWith,
  pickErrorState,
  makeHookCall,
  hookCallContext,
  forwardNext,
  missingImplementation,
  currentDispatchSlot,
  isCoreOrManaged,
  UNLIMITED_BUDGET,
  errorTextOf,
  nextAfterSettledError,
  maybeBypassHandler,
  freezeUnlessFrozen,
  emptyEntryState,
  resolveNextTier,
  eventPatternMatcher,
  traceOfRun,
  abortErrorFor,
  scrubErrorText,
  withHookPrefix,
  watchOverrun,
  failedClosedText,
  INTERRUPTED_LEFT_OUT,
  SKIPPED_LAST_NEXT,
  LEFT_MID_STREAM,
  SKIPPED_BELOW_RAN,
  reportHandlerFailure,
  freezeEntry,
  forwardAbortWith,
  errorSummary,
  uiElementKey,
  appendNextToStep,
};
