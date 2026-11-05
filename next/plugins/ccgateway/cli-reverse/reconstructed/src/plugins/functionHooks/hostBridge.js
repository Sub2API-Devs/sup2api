/**
 * plugins/functionHooks/hostBridge.ts
 *
 * 2.1.316 新增：函数钩子在宿主侧的桥接：classic.* 钩子适配、ui.resolve 应答校验、next.to 路由与 ui.render/press/input/select 处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7n3ata3a.js (44), chunk-f284hj51.js (2), chunk-j8f885h1.js (1)
 * attribution: placement 47
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AsyncLocalStorage } from "async_hooks";
import { KEY_SEPARATOR } from "./ui/raster.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  UI_ELEMENT_TYPES,
  elementBuildersFor,
  checkElementProps,
  checkElementList,
  isPlainElement,
  validateAndStampElement,
  collectClientElements,
  clientKeyOf,
  collectRasterElements,
  rasterKeyOf,
  collectImageElements,
  imageKeyOf,
  collectMarkdownParts,
  collectHoverScopes,
  hoverScopeKey,
  collectTextParts,
  newCollectorState,
} from "./ui/elements.js";
import { isPluginNoteRefusal } from "./sites/sessionSites.js";
import { TOOL_SITE_BY_EVENT, UI_ENV_SITE_RULES, envSiteRuleFor } from "./sites/siteRules.js";
import {
  DEFAULT_HOOK_TIMEOUT_MS,
  forwardGenerator,
  onGeneratorReturn,
  teeGeneratorResult,
  createStreamOperators,
  reportStreamChainFailure,
} from "./dispatch/streamChain.js";
import { probeHookCallback, routesToUser } from "./eventPatterns.js";
import { STAMP_ENVIRONMENT_SLOT } from "./vm/vmGlobals.js";
import { deepFreeze, isPlainDataObject } from "../../utils/hooks/functionHookMatchers.js";
import { isUntrustedObject } from "../../utils/untrustedValues.js";
import { HooksError, addWeakSetTag, hasWeakSetTag, tagWeak, requireEventArgument } from "./hooksErrors.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { functionNameMarks } from "./vm/vmBootstrapSource.js";
import {
  runPreservingStamp,
  runWithStackStamps,
  isNextToUserTarget,
  createHooksEnvironment,
  hasRegisteredEnv,
} from "./vm/moduleLoader.js";
import { errorMessage } from "../../utils/errors.js";
import { isAbovePrepend } from "./builtinHooksModule.js";
import {
  nextToLabel,
  freezeHookCall,
  callNextWith,
  pickErrorState,
  reportChainFailure,
  makeHookCall,
  hookCallContext,
  forwardNext,
  NO_FLOORS,
} from "./dispatch/chain.js";
import { isClockMethod } from "./api/operations.js";
import { outsideBudget, budgetPauseStorage } from "./dispatch/valueSizing.js";
import { viewportInfo } from "./surfaceBinding.js";
import { buildPluginAppendRow } from "./api/sessionAppend.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:161564-161603 placement (2.1.88 match: withModifiers, 1)
/**
 * （误归 computerUse）按 "press"+两个参数用分隔符拼键。
 */
var withModifiers = (plugin, handle) => ["press", plugin, handle].join(KEY_SEPARATOR);
//@ chunk-7n3ata3a.js:688-720 placement
/**
 * 各 UI 元素构造器
 */
var UI_ELEMENT_BUILDERS = () =>
  import_mapValues(UI_ELEMENT_TYPES, (type, builders) => elementBuildersFor(builders));
//@ chunk-7n3ata3a.js:720-748 placement
var CLASSIC_POSTTOOLUSE = "classic.PostToolUse";
//@ chunk-7n3ata3a.js:748-825 placement
/**
 * 无法交给检查钩子的说明
 */
var HOOK_NOT_GIVEN_TEXT = "this could not be given to a hook that checks it, so it was not done";
//@ chunk-7n3ata3a.js:825-918 placement
/**
 * 工具未运行的说明
 */
var TOOL_INPUT_NOT_GIVEN =
  "this tool input could not be given to a hook that checks it, so the tool was not run";
//@ chunk-7n3ata3a.js:918-1199 placement
function buildClassicDenyResult(hookEvent, input) {
  let denyByEvent = {
    "classic.PreToolUse": {
      deny: TOOL_INPUT_NOT_GIVEN,
    },
    "classic.PermissionRequest": {
      decision: {
        behavior: "deny",
        message: TOOL_INPUT_NOT_GIVEN,
      },
    },
  };
  let secondHookEvent = hookEvent === "tool.call" || hookEvent === "tool.check";
  let secondInput =
    hookEvent === "session.compact" ||
    (((reason) => hookEvent === "session.append")(input) && !isPluginNoteRefusal(input))
      ? undefined
      : TOOL_SITE_BY_EVENT[hookEvent];
  return Object.hasOwn(TOOL_SITE_BY_EVENT, hookEvent)
    ? secondInput?.(secondHookEvent ? TOOL_INPUT_NOT_GIVEN : HOOK_NOT_GIVEN_TEXT)
    : denyByEvent[hookEvent];
}
//@ chunk-7n3ata3a.js:1199-1271 placement
/**
 * 检查钩子未能交回答案
 */
var CHECKER_NO_ANSWER = "a hook that checks this result could not hand back its answer";
//@ chunk-7n3ata3a.js:1271-1383 placement
var ALWAYS_WITHHELD_EVENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7n3ata3a.js:1271", () => {
  ALWAYS_WITHHELD_EVENTS = new Set([
    "tool.check",
    "agent.offer",
    "plugin.register",
    "classic.PreToolUse",
    "classic.PermissionRequest",
  ]);
});
//@ chunk-7n3ata3a.js:1383-1589 placement
/**
 * 无法交给检查钩子时的扣留策略：PostToolUse 只记录；检查类事件以拒绝作答；tool.call 拒绝并扣留结果。
 */
function classicWithholding(hookEvent, input) {
  if (hookEvent === CLASSIC_POSTTOOLUSE)
    return {
      isNoted: true,
    };
  let classicDenyResult = buildClassicDenyResult(hookEvent, input);
  if (classicDenyResult === undefined) return;
  if (ALWAYS_WITHHELD_EVENTS.has(hookEvent))
    return {
      answer: classicDenyResult,
      afterNext: classicDenyResult,
    };
  return hookEvent === "tool.call"
    ? {
        answer: classicDenyResult,
        afterNext: {
          deny: CHECKER_NO_ANSWER,
        },
        isWithholding: true,
      }
    : {
        answer: classicDenyResult,
      };
}
//@ chunk-7n3ata3a.js:1589-1680 placement
/**
 * ui.input/select/press
 */
function uiEventKind(event) {
  let hasKind = "kind" in event;
  let hasValue = "value" in event;
  return hasKind ? "ui.input" : hasValue ? "ui.select" : "ui.press";
}
//@ chunk-7n3ata3a.js:1680-1846 placement
function answeringEventFor(bridgeState, environmentId) {
  let live = bridgeState.answering.getStore();
  return live !== undefined &&
    live.isLive &&
    Date.now() < live.answersUntil &&
    (live.event === "session.start" || live.environmentId === environmentId)
    ? live.event
    : undefined;
}
//@ chunk-7n3ata3a.js:1846-1939 placement
/**
 * 实时事件信封
 */
var liveEventEnvelope = (sent, environmentId, secondSent) => ({
  event: uiEventKind(secondSent),
  isLive: true,
  answersUntil: Date.now() + DEFAULT_HOOK_TIMEOUT_MS,
  environmentId,
  sent,
});
//@ chunk-7n3ata3a.js:1939-2607 placement
function cloneAnswer(bridgeState, environmentId) {
  let weakMap = new WeakMap();
  let weakSet = new WeakSet();
  return (value) => {
    let { stamp, environments } = bridgeState;
    if (stamp === undefined) return probeHookCallback(value);
    let isArray = stamp;
    let len = Atomics.load(isArray, STAMP_ENVIRONMENT_SLOT);
    let copies = new Map();
    let index = (copied) => Atomics.store(isArray, STAMP_ENVIRONMENT_SLOT, copied ?? len);
    function key(key, secondIndex) {
      index(key);
      let keys = secondIndex();
      let next = key !== undefined && typeof keys === "object" && keys !== null;
      if (next)
        deepFreeze(
          keys,
          new Set(
            (isPlainDataObject(keys) ? Object.values(keys) : []).filter(
              (element) => isPlainDataObject(element) && weakMap.has(element),
            ),
          ),
        );
      if (next && Object.isFrozen(keys)) weakMap.set(keys, key);
      return keys;
    }
    function secondKey(index, thirdIndex) {
      if (!copies.has(index)) {
        let filtered = [...environments].filter(([, secondNext]) => secondNext.name === index);
        copies.set(index, filtered.length === 1 ? filtered[0]?.[0] : undefined);
      }
      return key(copies.get(index), thirdIndex);
    }
    try {
      return value(
        (key) => {
          index(key ? weakMap.get(key) : undefined);
          return key !== undefined && weakSet.has(key);
        },
        secondKey,
        (secondValue) => {
          let thirdNext = key(environmentId, secondValue);
          if (weakMap.has(thirdNext)) weakSet.add(thirdNext);
          return thirdNext;
        },
      );
    } finally {
      Atomics.store(isArray, STAMP_ENVIRONMENT_SLOT, len);
    }
  };
}
//@ chunk-7n3ata3a.js:2607-2708 placement
function servingCallers(bridgeState) {
  let serving = bridgeState.serving.getStore();
  return serving !== undefined && bridgeState.servingLive.has(serving.callId) ? serving.callers : [];
}
//@ chunk-7n3ata3a.js:2708-3246 placement
function checkResolveAnswer(bridgeState, environment, answer) {
  let { result, resolver } = answer;
  if (isUntrustedObject(result))
    throw new HooksError(
      "the ui.resolve answer is a Proxy or a vm context; a table of elements is a plain object",
    );
  if (!isPlainObject(result)) return result;
  let copies = Object.create(null);
  for (let seen of Reflect.ownKeys(result)) {
    if (typeof seen !== "string" || seen === "then" || seen === "__proto__") continue;
    let ownPropertyDescriptor = Reflect.getOwnPropertyDescriptor(result, seen);
    if (ownPropertyDescriptor?.enumerable !== true) continue;
    let len = ownPropertyDescriptor.value;
    let secondSeen = !isUntrustedObject(len) && typeof len === "function";
    let index = secondSeen && functionNameMarks.nameOf(len) === seen;
    copies[seen] = !secondSeen
      ? undefined
      : index
        ? len
        : (value) =>
            runPreservingStamp(bridgeState.stamp, () =>
              runWithStackStamps(bridgeState.stamp, [...servingCallers(bridgeState), resolver], () =>
                environment.invokeSync(len, value),
              ),
            );
  }
  return copies;
}
//@ chunk-7n3ata3a.js:3294-3516 placement
var createBridgeState = (hostOps, hostStreamOps, stamp) => ({
  environments: new Map(),
  loading: new Map(),
  dispatching: new AsyncLocalStorage(),
  framing: new AsyncLocalStorage(),
  serving: new AsyncLocalStorage(),
  answering: new AsyncLocalStorage(),
  servingLive: new Set(),
  hostOps,
  hostStreamOps,
  presses: new Map(),
  taking: new Map(),
  resolving: new Map(),
  stamp,
});
//@ chunk-7n3ata3a.js:3516-3675 placement
function argumentForEnvironment({ environment, name, event, e }) {
  try {
    return environment.argumentFor(e);
  } catch (error) {
    throw addWeakSetTag(
      new HooksError(`${name}: ${event}: could not be given its argument: ${errorMessage(error)}`),
    );
  }
}
//@ chunk-7n3ata3a.js:3675-3770 placement
/**
 * 按对象缓存参数
 */
function memoizedArgument(options) {
  let weakMap = new WeakMap();
  return (e) => {
    let cached =
      weakMap.get(e) ??
      argumentForEnvironment({
        ...options,
        e,
      });
    weakMap.set(e, cached);
    return cached;
  };
}
//@ chunk-7n3ata3a.js:3770-3798 placement
/**
 * e\0t 组合键
 */
var keyOfPair = (a, b) => `${a}\x00${b}`;
//@ chunk-7n3ata3a.js:3798-4035 placement
/**
 * 一次渲染后，删除不再出现在新元素树中的按键句柄。
 */
function dropStalePresses(bridgeState, environmentId, handles) {
  let taking = bridgeState.taking.get(environmentId);
  bridgeState.taking.delete(environmentId);
  if (taking === undefined) return;
  let kept = new Set();
  for (let { plugin, handle } of checkElementProps(handles))
    for (let [secondHandle, secondSecondHandle] of bridgeState.environments)
      if (secondSecondHandle.name === plugin) kept.add(keyOfPair(secondHandle, handle));
  for (let secondKept of taking) if (!kept.has(secondKept)) bridgeState.presses.delete(secondKept);
}
//@ chunk-7n3ata3a.js:4035-4149 placement
function requireEnvironment(bridgeState, environmentId) {
  let entry = bridgeState.environments.get(environmentId);
  if (entry === undefined) throw new HooksError(`environment ${environmentId} is not loaded`);
  return entry;
}
//@ chunk-7n3ata3a.js:4149-4243 placement
/**
 * 取环境的分发注册
 */
function registrationForEnv(bridgeState, environmentId) {
  let frame = bridgeState.framing.getStore();
  return frame?.environmentId === environmentId ? frame.registration : undefined;
}
//@ chunk-7n3ata3a.js:4243-4323 placement
/**
 * 转发 generator
 */
var forwardedGenerator = (generator, run) =>
  forwardGenerator({
    next: () => run(() => generator.next()),
    return: () => run(() => generator.return(undefined)),
  });
//@ chunk-7n3ata3a.js:4323-4857 placement
function checkNextToTarget(handle, to, { event, raised, leftOut }) {
  let { environment, name, nextTo, scan } = handle;
  for (let tier of to) {
    if (isAbovePrepend(tier) && !nextTo.has(tier))
      throw new HooksError(
        `${name}: next.to("${tier}") refused: its hooks module does not spell ${nextToLabel(tier)} in a literal the scan reads (host rule)`,
      );
    if (
      tier === "user" &&
      !(raised === undefined
        ? routesToUser(scan, event)
        : isNextToUserTarget({
            clauses: environment.activation.registrations.registered.filter(
              (last, secondLast) => leftOut?.includes(secondLast) !== true,
            ),
            scan,
            event,
            raised,
          }))
    )
      throw new HooksError(
        `${name}: next.to("user") refused: no hook of its module that spells it stands on this dispatch of ${event} (host rule)`,
      );
  }
}
//@ chunk-7n3ata3a.js:4857-5120 placement
function collectUiTree(bridgeState, request, collector) {
  let { environmentId, name } = request;
  let list = checkElementList(request.result, name);
  return isPlainElement(list)
    ? validateAndStampElement({
        tree: list,
        plugin: name,
        seen: collector.seen,
        groups: collector.groups,
        parts: collector.parts,
        take: (element, secondElement) => {
          let key = keyOfPair(environmentId, element);
          bridgeState.presses.set(key, secondElement);
          let thirdElement = bridgeState.dispatching.getStore();
          if (thirdElement !== undefined) bridgeState.taking.get(thirdElement)?.add(key);
        },
      })
    : list;
}
//@ chunk-7n3ata3a.js:5120-5197 placement
/**
 * 附上经典钩子的扣留标记
 */
function withClassicWithholding(hookEvent, input, error) {
  let withholding = hasWeakSetTag(error) ? classicWithholding(hookEvent, input) : undefined;
  return withholding === undefined ? error : tagWeak(error, withholding);
}
//@ chunk-7n3ata3a.js:5197-6796 placement
function dispatchUiHandler(bridgeState, params, hook) {
  let { environmentId, event, resolver, leftOut, ended, caughtAnswered, endedReached, withheld } = params;
  let { environment, name, tier, isPersons, answersForEngine } = requireEnvironment(
    bridgeState,
    environmentId,
  );
  let handler = hook ?? environment.activation.registrations.get(event, leftOut);
  if (!handler) throw new HooksError(`${name}: no ${event} handler`);
  let { run, catch: catchHook } = handler;
  function settleResult(value, collector) {
    return resolver !== undefined
      ? checkResolveAnswer(bridgeState, environment, {
          result: value,
          resolver,
        })
      : event === "ui.render"
        ? collectUiTree(
            bridgeState,
            {
              environmentId,
              name,
              result: value,
            },
            collector,
          )
        : environment.leaving(value, event);
  }
  function runWithTrace(next, { seen, groups, parts, counted }) {
    function traceElement(element) {
      if (event === "ui.render" && isPlainElement(element) && !counted.has(element)) {
        counted.add(element);
        for (let prop of checkElementProps(element)) seen.add(withModifiers(prop.plugin, prop.handle));
        for (let fourthElement of collectClientElements(element)) seen.add(clientKeyOf(fourthElement));
        for (let fifthElement of collectRasterElements(element)) seen.add(rasterKeyOf(fifthElement));
        for (let n6Element of collectImageElements(element)) seen.add(imageKeyOf(n6Element));
        for (let part of collectMarkdownParts(element)) seen.add(part);
        for (let scope of collectHoverScopes(element)) {
          let key = hoverScopeKey(scope);
          groups.set(key, (groups.get(key) ?? 0) + 1);
        }
        for (let secondPart of collectTextParts(element))
          parts.set(secondPart, (parts.get(secondPart) ?? 0) + 1);
      }
      return element;
    }
    return environment.nextFor(
      freezeHookCall({
        call: async (value) => {
          environment.freezeForNext(requireEventArgument(value, name));
          return traceElement(await next(value));
        },
        to: async (value, ...rest) => {
          environment.freezeForNext(requireEventArgument(value, name));
          checkNextToTarget(requireEnvironment(bridgeState, environmentId), rest, params);
          return traceElement(await callNextWith(value, next, rest));
        },
        signal: next.signal,
        is: next.is,
        event: next.event,
        origin: next.origin,
        trace: () => next.trace,
        budget: () => next.budget,
        caught: pickErrorState(next),
      }),
      event,
    );
  }
  let argument = memoizedArgument({
    environment,
    name,
    event,
  });
  async function runHandler(impl, e, ctx) {
    let collectorState = newCollectorState();
    try {
      return settleResult(await impl(argument(e), runWithTrace(ctx, collectorState)), collectorState);
    } catch (error) {
      throw withClassicWithholding(event, e, error);
    }
  }
  async function runAfterEnded(ended, e, next) {
    endedReached?.(environmentId, e);
    if (ended.called)
      await next(e).then(undefined, () => {
        return;
      });
    throw new HooksError(ended.reason);
  }
  return {
    name,
    environmentId,
    tier,
    ...(isPersons === false && {
      isVouched: true,
    }),
    ...(answersForEngine && {
      answersForEngine,
    }),
    applied: environment.applyIn,
    ...(catchHook && {
      catch: async (e, ctx) => {
        let result = await runHandler(catchHook, e, ctx);
        if (result !== undefined) caughtAnswered?.(environmentId);
        return result;
      },
    }),
    ...(withheld && {
      withheld,
    }),
    run: (e, ctx) => (ended === undefined ? runHandler(run, e, ctx) : runAfterEnded(ended, e, ctx)),
  };
}
//@ chunk-7n3ata3a.js:6796-6906 placement
function pressSentFor(bridgeState, environmentId) {
  let live = bridgeState.answering.getStore();
  return live?.event === "ui.press" && live.environmentId === environmentId ? live.sent : undefined;
}
//@ chunk-7n3ata3a.js:6906-7011 placement
function servingCallId(bridgeState) {
  let serving = bridgeState.serving.getStore();
  return serving !== undefined && bridgeState.servingLive.has(serving.callId) ? serving.callId : undefined;
}
//@ chunk-7n3ata3a.js:7011-7150 placement
/**
 * 构造环境发起宿主操作时的帧：环境 id、分发 id、注册序号、服务中的调用、根事件与按键。
 */
var opFrameFor = (bridgeState, environmentId) => ({
  environmentId,
  dispatchId: bridgeState.dispatching.getStore(),
  registration: registrationForEnv(bridgeState, environmentId),
  serving: servingCallId(bridgeState),
  rootEvent: answeringEventFor(bridgeState, environmentId),
  pressing: pressSentFor(bridgeState, environmentId),
});
//@ chunk-7n3ata3a.js:7150-7254 placement
/**
 * 为某环境生成宿主操作调用函数（非时钟类操作在预算外执行）。
 */
var createHostOpCaller = (bridgeState, environmentId) => (op, args, signal) => {
  let call = () =>
    bridgeState.hostOps({
      ...opFrameFor(bridgeState, environmentId),
      op,
      args,
      signal,
    });
  return isClockMethod(op) ? call() : outsideBudget(call);
};
//@ chunk-7n3ata3a.js:7254-7568 placement
/**
 * 为某环境生成流式宿主操作调用函数：可被放弃时中止，结束前不计入钩子预算。
 */
var createHostStreamCaller = (bridgeState, environmentId) => (op, args, signal) => {
  let abortController = new AbortController();
  let signal_2 =
    signal === undefined ? abortController.signal : AbortSignal.any([signal, abortController.signal]);
  let generator = forwardedGenerator(
    bridgeState.hostStreamOps({
      ...opFrameFor(bridgeState, environmentId),
      op,
      args,
      signal: signal_2,
    }),
    outsideBudget,
  );
  async function* stream() {
    try {
      return yield* generator;
    } catch (error) {
      if (abortController.signal.aborted) return;
      throw error;
    }
  }
  return onGeneratorReturn(teeGeneratorResult(stream), () =>
    abortController.abort(new HooksError(`${op}: the stream was let go`)),
  );
};
//@ chunk-7n3ata3a.js:7568-7774 placement
function environmentCatches(bridgeState, { event, leftOut }, [environmentId, registration]) {
  let { environment, name } = requireEnvironment(bridgeState, environmentId);
  return environment.activation.registrations.catches(
    event,
    argumentForEnvironment({
      environment,
      name,
      event,
      e: registration,
    }),
    leftOut?.find((result) => result.environmentId === environmentId)?.registrations,
  );
}
//@ chunk-7n3ata3a.js:7774-8110 placement
/**
 * 为一个 UI 组件运行 ui.resolve 钩子链（各环境依次），底部返回核心元素表。
 */
function resolveUiTables(bridgeState, options) {
  let { environmentId, request, core } = options;
  let site = {
    surface: request.surface,
    component: request.component,
  };
  let entry = requireEnvironment(bridgeState, environmentId);
  return reportChainFailure({
    e: site,
    handlers: request.environments
      .filter((environment) => bridgeState.environments.has(environment))
      .map((environmentId_2) =>
        dispatchUiHandler(bridgeState, {
          environmentId: environmentId_2,
          event: "ui.resolve",
          resolver: environmentId,
        }),
      ),
    site: UI_ENV_SITE_RULES["ui.resolve"],
    bottom: () => Promise.resolve(core),
    origin: {
      plugin: entry.name,
      tier: entry.tier,
    },
  });
}
//@ chunk-7n3ata3a.js:8110-8138 placement
/**
 * 删除键
 */
var deleteFromMap = (map, key) => {
  map.delete(key);
};
//@ chunk-7n3ata3a.js:8138-8223 placement
/**
 * session.start 事件
 */
var SESSION_START_EVENT = () => ({
  event: "session.start",
  isLive: true,
  answersUntil: Number.POSITIVE_INFINITY,
});
//@ chunk-7n3ata3a.js:8223-8864 placement
function readValueField(bridgeState, params) {
  let { environmentId, event, leftOut } = params;
  let { environment, name, tier } = requireEnvironment(bridgeState, environmentId);
  let memoized = memoizedArgument({
    environment,
    name,
    event,
  });
  function isEnded(endsAt) {
    let ended = endsAt;
    return environment.streamNextFor(
      makeHookCall({
        ...hookCallContext(endsAt),
        call: (value) => {
          environment.freezeForNext(requireEventArgument(value, name));
          return ended(value);
        },
        to: (thirdValue, ...secondTier) => {
          environment.freezeForNext(requireEventArgument(thirdValue, name));
          checkNextToTarget(requireEnvironment(bridgeState, environmentId), secondTier, params);
          return forwardNext(thirdValue, ended, secondTier);
        },
      }),
    );
  }
  let handler = (registration, result) =>
    forwardedGenerator(result, (secondResult) =>
      bridgeState.framing.run(
        {
          environmentId,
          registration,
        },
        secondResult,
      ),
    );
  return environment.activation.registrations.streamClauses(event, leftOut).map((fourthValue) => {
    if (fourthValue.kind === "value")
      return createStreamOperators(dispatchUiHandler(bridgeState, params, fourthValue.hook));
    let { registration } = fourthValue;
    let fifthValue = (thirdResult) => async (fourthResult, fifthResult) =>
      handler(registration, await thirdResult(memoized(fourthResult), isEnded(fifthResult)));
    let n6Result = fourthValue.catch;
    return {
      name,
      environmentId,
      tier,
      run: fifthValue(fourthValue.open),
      ...(n6Result !== undefined && {
        catch: fifthValue(n6Result),
      }),
    };
  });
}
//@ chunk-7n3ata3a.js:8864-9212 placement
/**
 * 为一跳构造钩子链参数：各环境的处理器、宿主 next 与中止信号。
 */
function buildHopChainArgs(bridgeState, { request, hostNext, signal }) {
  let { event, leftOut, environments } = request;
  let handlers = environments.flatMap((environment) =>
    readValueField(bridgeState, {
      environmentId: environment,
      event,
      raised: request.payload,
      leftOut: leftOut?.find((handler) => handler.environmentId === environment)?.registrations,
    }),
  );
  let bottom = (secondHandler, thirdHandler, fourthHandler = NO_FLOORS) =>
    hostNext(secondHandler, thirdHandler, fourthHandler);
  return {
    e: request.payload,
    handlers,
    site: envSiteRuleFor(event, request.raise),
    signal,
    isHopFold: true,
    bottom,
    origin: request.origin,
    floors: request.floors,
  };
}
//@ chunk-7n3ata3a.js:9212-12689 placement
/**
 * 建立钩子运行环境与宿主操作的桥（ui.render、session.start、ui.press/input/select 句柄，约 3.5 KB）。
 */
function createHookHostBridge({
  hostOps,
  hostStreamOps,
  stamp,
  createEnvironment,
  servedBudgetMs = DEFAULT_HOOK_TIMEOUT_MS,
}) {
  let bridgeState = createBridgeState(hostOps, hostStreamOps, stamp);
  let secondCreateEnvironment = createEnvironment ?? createHooksEnvironment;
  let { environments, loading, dispatching, framing, serving, answering, presses } = bridgeState;
  async function within(environmentId, event, fn) {
    if (event === "ui.render") bridgeState.taking.set(environmentId, new Set());
    let result;
    let sessionStart = event === "session.start" ? SESSION_START_EVENT() : undefined;
    try {
      result = await dispatching.run(environmentId, () => answering.run(sessionStart, fn));
      return result;
    } finally {
      if (sessionStart !== undefined) sessionStart.isLive = false;
      dropStalePresses(bridgeState, environmentId, result);
    }
  }
  async function dispatch(request, next, signal) {
    let answered = new Set();
    let given =
      request.event === CLASSIC_POSTTOOLUSE
        ? {
            isGiven: false,
          }
        : undefined;
    let reached = new Map();
    let result;
    try {
      result = await within(request.id, request.event, () =>
        reportChainFailure({
          e: request.payload,
          handlers: request.environments.map((environment) =>
            dispatchUiHandler(bridgeState, {
              environmentId: environment,
              event: request.event,
              raised: request.payload,
              leftOut: request.leftOut?.find((leftOutEntry) => leftOutEntry.environmentId === environment)
                ?.registrations,
              ended: request.ended,
              caughtAnswered: (secondEnvironmentId) => answered.add(secondEnvironmentId),
              ...(given && {
                withheld: () => {
                  given.isGiven = true;
                },
              }),
              endedReached: (thirdEnvironmentId, fourthNext) => reached.set(thirdEnvironmentId, fourthNext),
            }),
          ),
          site: envSiteRuleFor(request.event, request.raise),
          signal,
          isHopFold: true,
          bottom: (e, ctx, floors = NO_FLOORS) => next(e, ctx, floors),
          origin: request.origin,
          floors: request.floors,
          cutAt: request.cutAt,
        }),
      );
    } catch (error) {
      throw given?.isGiven === true
        ? tagWeak(error, {
            isNoted: true,
          })
        : error;
    }
    let found = [...reached].find(([keptId]) => keptId === request.ended?.kept);
    let unmatched =
      found !== undefined && !answered.has(found[0]) && !environmentCatches(bridgeState, request, found);
    return {
      result,
      ...(request.ended !== undefined && {
        answered: [...answered],
      }),
      ...(unmatched && {
        unmatched: true,
      }),
      ...(given?.isGiven === true && {
        withheld: true,
      }),
    };
  }
  let withinSteps = (id, generator) =>
    forwardedGenerator(generator, (fn) => dispatching.run(id, () => answering.run(undefined, fn)));
  return {
    opFailureOf: (value) =>
      Array.from(environments.values(), (entry) => entry.environment.opFailureOf(value)).find(
        (failure) => failure !== undefined,
      ),
    ownsValue: (value) =>
      Array.from(environments.values()).some((entry) => entry.environment.ownsValue(value)),
    has: (id) => environments.has(id),
    async load(id, args) {
      let abortController = new AbortController();
      loading.set(id, abortController);
      let environment;
      try {
        environment = await secondCreateEnvironment(createHostOpCaller(bridgeState, id), args, {
          stamp: stamp
            ? {
                view: stamp,
                environmentId: id,
              }
            : undefined,
          signal: abortController.signal,
          hostStream: createHostStreamCaller(bridgeState, id),
          framed: (registration, fn) =>
            framing.run(
              {
                environmentId: id,
                registration,
              },
              fn,
            ),
          blamedFor: () => servingCallers(bridgeState)[0],
          blamedWalk: cloneAnswer(bridgeState, id),
        });
      } finally {
        loading.delete(id);
      }
      environments.set(id, {
        environment,
        name: args.pluginName,
        tier: args.tier,
        isPersons: args.isPersons,
        nextTo: new Set(args.scan.nextTo ?? []),
        scan: args.scan,
        answersForEngine: hasRegisteredEnv(args.modulePath),
      });
      return {
        registered: environment.activation.registrations.registered,
      };
    },
    unload(id) {
      loading.get(id)?.abort();
      loading.delete(id);
      let entry = environments.get(id);
      if (entry) {
        environments.delete(id);
        bridgeState.resolving.delete(id);
        entry.environment.dispose();
      }
      for (let key of presses.keys()) if (key.startsWith(keyOfPair(id, 0).slice(0, -1))) presses.delete(key);
    },
    dispatch,
    dispatchStream: (id, hostNext, signal) =>
      teeGeneratorResult(
        withinSteps(
          id.id,
          reportStreamChainFailure(
            buildHopChainArgs(bridgeState, {
              request: id,
              hostNext,
              signal,
            }),
          ),
        ),
      ),
    link: (params) => dispatchUiHandler(bridgeState, params),
    linkStreams: (params) => readValueField(bridgeState, params),
    within,
    withinSteps,
    async resolveTables(environmentId, requests) {
      let { environment } = requireEnvironment(bridgeState, environmentId);
      let generation = (bridgeState.resolving.get(environmentId) ?? 0) + 1;
      bridgeState.resolving.set(environmentId, generation);
      let builders = UI_ELEMENT_BUILDERS();
      let results = await Promise.all(
        requests.map(async (request) => ({
          surface: request.surface,
          component: request.component,
          answer: await resolveUiTables(bridgeState, {
            environmentId,
            request,
            core: builders[request.surface],
          }),
        })),
      );
      if (
        environments.get(environmentId)?.environment === environment &&
        bridgeState.resolving.get(environmentId) === generation
      )
        environment.storeResolved(results);
    },
    build: (environmentId, owned, beneath) => {
      requireEnvironment(bridgeState, environmentId).environment.activation.finalize(owned, beneath);
    },
    callInterface(environmentId, { name, method, args }, secondServing) {
      let { environment } = requireEnvironment(bridgeState, environmentId);
      if (secondServing) bridgeState.servingLive.add(secondServing.callId);
      let timer =
        secondServing !== undefined && servedBudgetMs !== Number.POSITIVE_INFINITY
          ? setTimeout(deleteFromMap, servedBudgetMs, bridgeState.servingLive, secondServing.callId)
          : undefined;
      function clear() {
        clearTimeout(timer);
        if (secondServing) bridgeState.servingLive.delete(secondServing.callId);
      }
      let call = () =>
        runWithStackStamps(stamp, secondServing?.callers ?? [], () =>
          environment.activation.callInterface(name, method, environment.cloneIn(args)),
        ).then(environment.leaving);
      try {
        return budgetPauseStorage
          .exit(() =>
            framing.run(undefined, () => answering.run(undefined, () => serving.run(secondServing, call))),
          )
          .finally(clear);
      } catch (error) {
        clear();
        throw error;
      }
    },
    press(environmentId, { handle, sent }, args) {
      let { environment } = requireEnvironment(bridgeState, environmentId);
      let handler = presses.get(keyOfPair(environmentId, handle));
      if (handler === undefined)
        return Promise.reject(
          new HooksError(`ui.press/ui.input/ui.select: no handler is held under handle ${handle}`),
        );
      let envelope = liveEventEnvelope(sent, environmentId, args);
      return framing.run(undefined, () =>
        answering.run(envelope, () =>
          environment
            .invoke(handler, [environment.cloneIn(args)])
            .then(() => {
              return;
            })
            .finally(() => {
              envelope.isLive = false;
            }),
        ),
      );
    },
    releasePresses: (environmentId, handles) => {
      for (let handle of handles) presses.delete(keyOfPair(environmentId, handle));
    },
  };
}
//@ chunk-7n3ata3a.js:12689-12761 placement
/**
 * 拒绝全部挂起
 */
function rejectAllPending(map, reason) {
  for (let pending of map.values()) pending.reject(new HooksError(reason));
  map.clear();
}
//@ chunk-7n3ata3a.js:12761-12814 placement
/**
 * 取出并删除挂起项
 */
function takePending(map, key) {
  let value = map.get(key);
  map.delete(key);
  return value;
}
//@ chunk-7n3ata3a.js:12814-12824 placement
/**
 * 与 worker 共享的 marks 数组里「最新分发序号」的槽位；宿主用它判断已应答的是不是当前这次分发。
 */
var MARKS_NEWEST_DISPATCH_SLOT = 0;
//@ chunk-7n3ata3a.js:12824-12834 placement
/**
 * marks 共享数组的槽位数（3 个槽：最新分发序号、已应答分发序号、已应答次数）。
 */
var MARKS_SLOT_COUNT = 3;
//@ chunk-7n3ata3a.js:12834-12844 placement
/**
 * marks 共享数组里「已应答次数」的槽位。
 */
var MARKS_ANSWERS_SENT_SLOT = 2;
//@ chunk-7n3ata3a.js:12844-12854 placement
/**
 * marks 共享数组里「已应答的分发序号」的槽位。
 */
var MARKS_ANSWERED_DISPATCH_SLOT = 1;
//@ chunk-f284hj51.js:38970-39073 placement
/**
 * （误归 computerUse）会话目标：字符串原样返回，对象取 sessionId 或 agentId。
 */
function sessionTargetId(target) {
  if (typeof target === "string" || target === undefined) return target;
  return "sessionId" in target ? target.sessionId : target.agentId;
}
//@ chunk-f284hj51.js:39073-39634 placement
/**
 * （误归 computerUse）插件宿主动作补默认值：command.run/prompt.fill/prompt.suggest/prompt.submit/session.send 补 origin={kind:"plugin",name} 等字段。
 */
function normalizePluginHostAction(payload, pluginName, handler) {
  let origin = {
    kind: "plugin",
    name: pluginName,
  };
  switch (handler) {
    case "command.run": {
      let secondPayload = payload;
      return {
        ...secondPayload,
        args: secondPayload.args ?? "",
        origin: secondPayload.origin ?? origin,
        presentation: secondPayload.presentation ?? viewportInfo(undefined),
      };
    }
    case "prompt.fill": {
      let thirdPayload = payload;
      return {
        ...thirdPayload,
        mode: thirdPayload.mode ?? "replace",
        origin: thirdPayload.origin ?? origin,
      };
    }
    case "prompt.suggest": {
      let fourthPayload = payload;
      return {
        ...fourthPayload,
        origin: fourthPayload.origin ?? origin,
      };
    }
    case "prompt.submit": {
      let { asUser, ...command } = payload;
      return {
        ...command,
        wait: command.wait ?? false,
        origin:
          command.origin ??
          (asUser === true
            ? {
                ...origin,
                asUser: true,
              }
            : origin),
      };
    }
    case "session.send": {
      let fifthPayload = payload;
      return {
        ...fifthPayload,
        to: sessionTargetId(fifthPayload.to),
        origin: fifthPayload.origin ?? origin,
      };
    }
    case "session.append":
      return buildPluginAppendRow(payload, pluginName);
    default:
      return payload;
  }
}
export {
  CHECKER_NO_ANSWER,
  MARKS_SLOT_COUNT,
  takePending,
  createHookHostBridge,
  rejectAllPending,
  MARKS_ANSWERED_DISPATCH_SLOT,
  MARKS_ANSWERS_SENT_SLOT,
  MARKS_NEWEST_DISPATCH_SLOT,
  classicWithholding,
  normalizePluginHostAction,
  withModifiers,
};
