/**
 * plugins/functionHooks/hostBridge.ts
 *
 * 2.1.316 新增：函数钩子在宿主侧的桥接：classic.* 钩子适配、ui.resolve 应答校验、next.to 路由与 ui.render/press/input/select 处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1tz177x8.js (2), chunk-4121qate.js (1), chunk-pwe88xvs.js (44)
 * attribution: placement 47
 */
import { AsyncLocalStorage } from "async_hooks";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
  Y6t,
} from "./dispatch/chain.js";
import { isClockMethod } from "./api/operations.js";
import { outsideBudget, budgetPauseStorage } from "./dispatch/valueSizing.js";
import { viewportInfo } from "./surfaceBinding.js";
import { buildPluginAppendRow } from "./api/sessionAppend.js";
import { Vme } from "./ui/raster.js";

//@ chunk-pwe88xvs.js:688-720 placement
/**
 * 各 UI 元素构造器
 */
var UI_ELEMENT_BUILDERS = () => xr(UI_ELEMENT_TYPES, (e, t) => elementBuildersFor(t));
//@ chunk-pwe88xvs.js:720-748 placement
var CLASSIC_POSTTOOLUSE = "classic.PostToolUse";
//@ chunk-pwe88xvs.js:748-825 placement
/**
 * 无法交给检查钩子的说明
 */
var HOOK_NOT_GIVEN_TEXT = "this could not be given to a hook that checks it, so it was not done";
//@ chunk-pwe88xvs.js:825-918 placement
/**
 * 工具未运行的说明
 */
var TOOL_INPUT_NOT_GIVEN =
  "this tool input could not be given to a hook that checks it, so the tool was not run";
//@ chunk-pwe88xvs.js:918-1199 placement
function buildClassicDenyResult(e, t) {
  let o = {
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
  let s = e === "tool.call" || e === "tool.check";
  let f =
    e === "session.compact" || (((p) => e === "session.append")(t) && !isPluginNoteRefusal(t))
      ? undefined
      : TOOL_SITE_BY_EVENT[e];
  return Object.hasOwn(TOOL_SITE_BY_EVENT, e) ? f?.(s ? TOOL_INPUT_NOT_GIVEN : HOOK_NOT_GIVEN_TEXT) : o[e];
}
//@ chunk-pwe88xvs.js:1199-1271 placement
/**
 * 检查钩子未能交回答案
 */
var CHECKER_NO_ANSWER = "a hook that checks this result could not hand back its answer";
//@ chunk-pwe88xvs.js:1271-1383 placement
var ALWAYS_WITHHELD_EVENTS = new Set([
  "tool.check",
  "agent.offer",
  "plugin.register",
  "classic.PreToolUse",
  "classic.PermissionRequest",
]);
//@ chunk-pwe88xvs.js:1383-1589 placement
/**
 * 无法交给检查钩子时的扣留策略：PostToolUse 只记录；检查类事件以拒绝作答；tool.call 拒绝并扣留结果。
 */
function classicWithholding(e, t) {
  if (e === CLASSIC_POSTTOOLUSE)
    return {
      isNoted: true,
    };
  let classicDenyResult = buildClassicDenyResult(e, t);
  if (classicDenyResult === undefined) return;
  if (ALWAYS_WITHHELD_EVENTS.has(e))
    return {
      answer: classicDenyResult,
      afterNext: classicDenyResult,
    };
  return e === "tool.call"
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
//@ chunk-pwe88xvs.js:1589-1680 placement
/**
 * ui.input/select/press
 */
function uiEventKind(e) {
  let t = "kind" in e;
  let o = "value" in e;
  return t ? "ui.input" : o ? "ui.select" : "ui.press";
}
//@ chunk-pwe88xvs.js:1680-1846 placement
function answeringEventFor(e, t) {
  let o = e.answering.getStore();
  return o !== undefined &&
    o.isLive &&
    Date.now() < o.answersUntil &&
    (o.event === "session.start" || o.environmentId === t)
    ? o.event
    : undefined;
}
//@ chunk-pwe88xvs.js:1846-1939 placement
/**
 * 实时事件信封
 */
var liveEventEnvelope = (sent, environmentId, o) => ({
  event: uiEventKind(o),
  isLive: true,
  answersUntil: Date.now() + DEFAULT_HOOK_TIMEOUT_MS,
  environmentId,
  sent,
});
//@ chunk-pwe88xvs.js:1939-2607 placement
function cloneAnswer(bridgeState, t) {
  let weakMap = new WeakMap();
  let weakSet = new WeakSet();
  return (i) => {
    let { stamp, environments } = bridgeState;
    if (stamp === undefined) return probeHookCallback(i);
    let p = stamp;
    let l = Atomics.load(p, STAMP_ENVIRONMENT_SLOT);
    let c = new Map();
    let S = (a) => Atomics.store(p, STAMP_ENVIRONMENT_SLOT, a ?? l);
    function y(a, T) {
      S(a);
      let R = T();
      let b = a !== undefined && typeof R === "object" && R !== null;
      if (b)
        deepFreeze(
          R,
          new Set(
            (isPlainDataObject(R) ? Object.values(R) : []).filter(
              (r) => isPlainDataObject(r) && weakMap.has(r),
            ),
          ),
        );
      if (b && Object.isFrozen(R)) weakMap.set(R, a);
      return R;
    }
    function h(a, T) {
      if (!c.has(a)) {
        let filtered = [...environments].filter(([, b]) => b.name === a);
        c.set(a, filtered.length === 1 ? filtered[0]?.[0] : undefined);
      }
      return y(c.get(a), T);
    }
    try {
      return i(
        (a) => {
          S(a ? weakMap.get(a) : undefined);
          return a !== undefined && weakSet.has(a);
        },
        h,
        (a) => {
          let T = y(t, a);
          if (weakMap.has(T)) weakSet.add(T);
          return T;
        },
      );
    } finally {
      Atomics.store(p, STAMP_ENVIRONMENT_SLOT, l);
    }
  };
}
//@ chunk-pwe88xvs.js:2607-2708 placement
function servingCallers(e) {
  let t = e.serving.getStore();
  return t !== undefined && e.servingLive.has(t.callId) ? t.callers : [];
}
//@ chunk-pwe88xvs.js:2708-3246 placement
function checkResolveAnswer(e, environment, o) {
  let { result: s, resolver } = o;
  if (isUntrustedObject(s))
    throw new HooksError(
      "the ui.resolve answer is a Proxy or a vm context; a table of elements is a plain object",
    );
  if (!isPlainObject(s)) return s;
  let n = Object.create(null);
  for (let f of Reflect.ownKeys(s)) {
    if (typeof f !== "string" || f === "then" || f === "__proto__") continue;
    let ownPropertyDescriptor = Reflect.getOwnPropertyDescriptor(s, f);
    if (ownPropertyDescriptor?.enumerable !== true) continue;
    let l = ownPropertyDescriptor.value;
    let c = !isUntrustedObject(l) && typeof l === "function";
    let S = c && functionNameMarks.nameOf(l) === f;
    n[f] = !c
      ? undefined
      : S
        ? l
        : (y) =>
            runPreservingStamp(e.stamp, () =>
              runWithStackStamps(e.stamp, [...servingCallers(e), resolver], () =>
                environment.invokeSync(l, y),
              ),
            );
  }
  return n;
}
//@ chunk-pwe88xvs.js:3294-3516 placement
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
//@ chunk-pwe88xvs.js:3516-3675 placement
function argumentForEnvironment({ environment, name: t, event, e: s }) {
  try {
    return environment.argumentFor(s);
  } catch (error) {
    throw addWeakSetTag(
      new HooksError(`${t}: ${event}: could not be given its argument: ${errorMessage(error)}`),
    );
  }
}
//@ chunk-pwe88xvs.js:3675-3770 placement
/**
 * 按对象缓存参数
 */
function memoizedArgument(e) {
  let weakMap = new WeakMap();
  return (o) => {
    let s =
      weakMap.get(o) ??
      argumentForEnvironment({
        ...e,
        e: o,
      });
    weakMap.set(o, s);
    return s;
  };
}
//@ chunk-pwe88xvs.js:3770-3798 placement
/**
 * e\0t 组合键
 */
var keyOfPair = (e, t) => `${e}\x00${t}`;
//@ chunk-pwe88xvs.js:3798-4035 placement
/**
 * 一次渲染后，删除不再出现在新元素树中的按键句柄。
 */
function dropStalePresses(bridgeState, t, o) {
  let s = bridgeState.taking.get(t);
  bridgeState.taking.delete(t);
  if (s === undefined) return;
  let i = new Set();
  for (let { plugin, handle } of checkElementProps(o))
    for (let [p, l] of bridgeState.environments) if (l.name === plugin) i.add(keyOfPair(p, handle));
  for (let n of s) if (!i.has(n)) bridgeState.presses.delete(n);
}
//@ chunk-pwe88xvs.js:4035-4149 placement
function requireEnvironment(e, environmentId) {
  let o = e.environments.get(environmentId);
  if (o === undefined) throw new HooksError(`environment ${environmentId} is not loaded`);
  return o;
}
//@ chunk-pwe88xvs.js:4149-4243 placement
/**
 * 取环境的分发注册
 */
function registrationForEnv(e, t) {
  let o = e.framing.getStore();
  return o?.environmentId === t ? o.registration : undefined;
}
//@ chunk-pwe88xvs.js:4243-4323 placement
/**
 * 转发 generator
 */
var forwardedGenerator = (e, t) =>
  forwardGenerator({
    next: () => t(() => e.next()),
    return: () => t(() => e.return(undefined)),
  });
//@ chunk-pwe88xvs.js:4323-4857 placement
function checkNextToTarget(e, t, { event, raised, leftOut }) {
  let { environment, name: f, nextTo, scan } = e;
  for (let c of t) {
    if (isAbovePrepend(c) && !nextTo.has(c))
      throw new HooksError(
        `${f}: next.to("${c}") refused: its hooks module does not spell ${nextToLabel(c)} in a literal the scan reads (host rule)`,
      );
    if (
      c === "user" &&
      !(raised === undefined
        ? routesToUser(scan, event)
        : isNextToUserTarget({
            clauses: environment.activation.registrations.registered.filter(
              (h, a) => leftOut?.includes(a) !== true,
            ),
            scan,
            event,
            raised,
          }))
    )
      throw new HooksError(
        `${f}: next.to("user") refused: no hook of its module that spells it stands on this dispatch of ${event} (host rule)`,
      );
  }
}
//@ chunk-pwe88xvs.js:4857-5120 placement
function collectUiTree(e, t, o) {
  let { environmentId, name: i } = t;
  let n = checkElementList(t.result, i);
  return isPlainElement(n)
    ? validateAndStampElement({
        tree: n,
        plugin: i,
        seen: o.seen,
        groups: o.groups,
        parts: o.parts,
        take: (f, p) => {
          let l = keyOfPair(environmentId, f);
          e.presses.set(l, p);
          let c = e.dispatching.getStore();
          if (c !== undefined) e.taking.get(c)?.add(l);
        },
      })
    : n;
}
//@ chunk-pwe88xvs.js:5120-5197 placement
/**
 * 附上经典钩子的扣留标记
 */
function withClassicWithholding(event, t, error) {
  let s = hasWeakSetTag(error) ? classicWithholding(event, t) : undefined;
  return s === undefined ? error : tagWeak(error, s);
}
//@ chunk-pwe88xvs.js:5197-6796 placement
function dispatchUiHandler(bridgeState, t, hook) {
  let { environmentId, event, resolver, leftOut, ended, caughtAnswered, endedReached, withheld } = t;
  let {
    environment,
    name: h,
    tier,
    isPersons,
    answersForEngine,
  } = requireEnvironment(bridgeState, environmentId);
  let b = hook ?? environment.activation.registrations.get(event, leftOut);
  if (!b) throw new HooksError(`${h}: no ${event} handler`);
  let { run, catch: r } = b;
  function m(u, collectorState) {
    return resolver !== undefined
      ? checkResolveAnswer(bridgeState, environment, {
          result: u,
          resolver,
        })
      : event === "ui.render"
        ? collectUiTree(
            bridgeState,
            {
              environmentId,
              name: h,
              result: u,
            },
            collectorState,
          )
        : environment.leaving(u, event);
  }
  function v(u, { seen, groups, parts, counted }) {
    function j(w) {
      if (event === "ui.render" && isPlainElement(w) && !counted.has(w)) {
        counted.add(w);
        for (let O of checkElementProps(w)) seen.add(withModifiers(O.plugin, O.handle));
        for (let O of collectClientElements(w)) seen.add(clientKeyOf(O));
        for (let O of collectRasterElements(w)) seen.add(rasterKeyOf(O));
        for (let O of collectImageElements(w)) seen.add(imageKeyOf(O));
        for (let O of collectMarkdownParts(w)) seen.add(O);
        for (let O of collectHoverScopes(w)) {
          let Q = hoverScopeKey(O);
          groups.set(Q, (groups.get(Q) ?? 0) + 1);
        }
        for (let O of collectTextParts(w)) parts.set(O, (parts.get(O) ?? 0) + 1);
      }
      return w;
    }
    return environment.nextFor(
      freezeHookCall({
        call: async (w) => {
          environment.freezeForNext(requireEventArgument(w, h));
          return j(await u(w));
        },
        to: async (w, ...V) => {
          environment.freezeForNext(requireEventArgument(w, h));
          checkNextToTarget(requireEnvironment(bridgeState, environmentId), V, t);
          return j(await callNextWith(w, u, V));
        },
        signal: u.signal,
        is: u.is,
        event: u.event,
        origin: u.origin,
        trace: () => u.trace,
        budget: () => u.budget,
        caught: pickErrorState(u),
      }),
      event,
    );
  }
  let k = memoizedArgument({
    environment,
    name: h,
    event,
  });
  async function g(u, x, F) {
    let collectorState = newCollectorState();
    try {
      return m(await u(k(x), v(F, collectorState)), collectorState);
    } catch (error) {
      throw withClassicWithholding(event, x, error);
    }
  }
  async function H(ended, x, F) {
    endedReached?.(environmentId, x);
    if (ended.called)
      await F(x).then(undefined, () => {
        return;
      });
    throw new HooksError(ended.reason);
  }
  return {
    name: h,
    environmentId,
    tier,
    ...(isPersons === false && {
      isVouched: true,
    }),
    ...(answersForEngine && {
      answersForEngine,
    }),
    applied: environment.applyIn,
    ...(r && {
      catch: async (u, x) => {
        let F = await g(r, u, x);
        if (F !== undefined) caughtAnswered?.(environmentId);
        return F;
      },
    }),
    ...(withheld && {
      withheld,
    }),
    run: (u, x) => (ended === undefined ? g(run, u, x) : H(ended, u, x)),
  };
}
//@ chunk-pwe88xvs.js:6796-6906 placement
function pressSentFor(e, t) {
  let o = e.answering.getStore();
  return o?.event === "ui.press" && o.environmentId === t ? o.sent : undefined;
}
//@ chunk-pwe88xvs.js:6906-7011 placement
function servingCallId(e) {
  let t = e.serving.getStore();
  return t !== undefined && e.servingLive.has(t.callId) ? t.callId : undefined;
}
//@ chunk-pwe88xvs.js:7011-7150 placement
/**
 * 构造环境发起宿主操作时的帧：环境 id、分发 id、注册序号、服务中的调用、根事件与按键。
 */
var opFrameFor = (e, t) => ({
  environmentId: t,
  dispatchId: e.dispatching.getStore(),
  registration: registrationForEnv(e, t),
  serving: servingCallId(e),
  rootEvent: answeringEventFor(e, t),
  pressing: pressSentFor(e, t),
});
//@ chunk-pwe88xvs.js:7150-7254 placement
/**
 * 为某环境生成宿主操作调用函数（非时钟类操作在预算外执行）。
 */
var createHostOpCaller = (bridgeState, t) => (o, args, signal) => {
  let n = () =>
    bridgeState.hostOps({
      ...opFrameFor(bridgeState, t),
      op: o,
      args,
      signal,
    });
  return isClockMethod(o) ? n() : outsideBudget(n);
};
//@ chunk-pwe88xvs.js:7254-7568 placement
/**
 * 为某环境生成流式宿主操作调用函数：可被放弃时中止，结束前不计入钩子预算。
 */
var createHostStreamCaller = (bridgeState, t) => (o, args, i) => {
  let abortController = new AbortController();
  let signal = i === undefined ? abortController.signal : AbortSignal.any([i, abortController.signal]);
  let p = forwardedGenerator(
    bridgeState.hostStreamOps({
      ...opFrameFor(bridgeState, t),
      op: o,
      args,
      signal,
    }),
    outsideBudget,
  );
  async function* l() {
    try {
      return yield* p;
    } catch (error) {
      if (abortController.signal.aborted) return;
      throw error;
    }
  }
  return onGeneratorReturn(teeGeneratorResult(l), () =>
    abortController.abort(new HooksError(`${o}: the stream was let go`)),
  );
};
//@ chunk-pwe88xvs.js:7568-7774 placement
function environmentCatches(bridgeState, { event, leftOut }, [s, i]) {
  let { environment, name: f } = requireEnvironment(bridgeState, s);
  return environment.activation.registrations.catches(
    event,
    argumentForEnvironment({
      environment,
      name: f,
      event,
      e: i,
    }),
    leftOut?.find((p) => p.environmentId === s)?.registrations,
  );
}
//@ chunk-pwe88xvs.js:7774-8110 placement
/**
 * 为一个 UI 组件运行 ui.resolve 钩子链（各环境依次），底部返回核心元素表。
 */
function resolveUiTables(bridgeState, t) {
  let { environmentId, request, core } = t;
  let n = {
    surface: request.surface,
    component: request.component,
  };
  let f = requireEnvironment(bridgeState, environmentId);
  return reportChainFailure({
    e: n,
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
      plugin: f.name,
      tier: f.tier,
    },
  });
}
//@ chunk-pwe88xvs.js:8110-8138 placement
/**
 * 删除键
 */
var deleteFromMap = (e, t) => {
  e.delete(t);
};
//@ chunk-pwe88xvs.js:8138-8223 placement
/**
 * session.start 事件
 */
var SESSION_START_EVENT = () => ({
  event: "session.start",
  isLive: true,
  answersUntil: Number.POSITIVE_INFINITY,
});
//@ chunk-pwe88xvs.js:8223-8864 placement
function readValueField(e, t) {
  let { environmentId, event, leftOut } = t;
  let { environment, name: f, tier } = requireEnvironment(e, environmentId);
  let l = memoizedArgument({
    environment,
    name: f,
    event,
  });
  function c(y) {
    let h = y;
    return environment.streamNextFor(
      makeHookCall({
        ...hookCallContext(y),
        call: (a) => {
          environment.freezeForNext(requireEventArgument(a, f));
          return h(a);
        },
        to: (a, ...T) => {
          environment.freezeForNext(requireEventArgument(a, f));
          checkNextToTarget(requireEnvironment(e, environmentId), T, t);
          return forwardNext(a, h, T);
        },
      }),
    );
  }
  let S = (registration, h) =>
    forwardedGenerator(h, (a) =>
      e.framing.run(
        {
          environmentId,
          registration,
        },
        a,
      ),
    );
  return environment.activation.registrations.streamClauses(event, leftOut).map((y) => {
    if (y.kind === "value") return createStreamOperators(dispatchUiHandler(e, t, y.hook));
    let { registration } = y;
    let a = (R) => async (b, _) => S(registration, await R(l(b), c(_)));
    let T = y.catch;
    return {
      name: f,
      environmentId,
      tier,
      run: a(y.open),
      ...(T !== undefined && {
        catch: a(T),
      }),
    };
  });
}
//@ chunk-pwe88xvs.js:8864-9212 placement
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
      leftOut: leftOut?.find((S) => S.environmentId === environment)?.registrations,
    }),
  );
  let bottom = (c, S, y = Y6t) => hostNext(c, S, y);
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
//@ chunk-pwe88xvs.js:9212-12722 placement
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
  let f = createEnvironment ?? createHooksEnvironment;
  let { environments, loading, dispatching, framing, serving, answering, presses } = bridgeState;
  async function T(id, event, v) {
    if (event === "ui.render") bridgeState.taking.set(id, new Set());
    let k;
    let H = event === "session.start" ? SESSION_START_EVENT() : undefined;
    try {
      k = await dispatching.run(id, () => answering.run(H, v));
      return k;
    } finally {
      if (H !== undefined) H.isLive = false;
      dropStalePresses(bridgeState, id, k);
    }
  }
  async function R(r, m, signal) {
    let k = new Set();
    let g =
      r.event === CLASSIC_POSTTOOLUSE
        ? {
            isGiven: false,
          }
        : undefined;
    let H = new Map();
    let result;
    try {
      result = await T(r.id, r.event, () =>
        reportChainFailure({
          e: r.payload,
          handlers: r.environments.map((environment) =>
            dispatchUiHandler(bridgeState, {
              environmentId: environment,
              event: r.event,
              raised: r.payload,
              leftOut: r.leftOut?.find((N) => N.environmentId === environment)?.registrations,
              ended: r.ended,
              caughtAnswered: (N) => k.add(N),
              ...(g && {
                withheld: () => {
                  g.isGiven = true;
                },
              }),
              endedReached: (N, j) => H.set(N, j),
            }),
          ),
          site: envSiteRuleFor(r.event, r.raise),
          signal,
          isHopFold: true,
          bottom: (E, N, j = Y6t) => m(E, N, j),
          origin: r.origin,
          floors: r.floors,
          cutAt: r.cutAt,
        }),
      );
    } catch (error) {
      throw g?.isGiven === true
        ? tagWeak(error, {
            isNoted: true,
          })
        : error;
    }
    let found = [...H].find(([E]) => E === r.ended?.kept);
    let F = found !== undefined && !k.has(found[0]) && !environmentCatches(bridgeState, r, found);
    return {
      result,
      ...(r.ended !== undefined && {
        answered: [...k],
      }),
      ...(F && {
        unmatched: true,
      }),
      ...(g?.isGiven === true && {
        withheld: true,
      }),
    };
  }
  let b = (id, m) => forwardedGenerator(m, (v) => dispatching.run(id, () => answering.run(undefined, v)));
  return {
    currentDispatch: () => dispatching.getStore(),
    opFailureOf: (r) =>
      Array.from(environments.values(), (m) => m.environment.opFailureOf(r)).find((m) => m !== undefined),
    ownsValue: (r) => Array.from(environments.values()).some((m) => m.environment.ownsValue(r)),
    has: (r) => environments.has(r),
    async load(r, m) {
      let abortController = new AbortController();
      loading.set(r, abortController);
      let k;
      try {
        k = await f(createHostOpCaller(bridgeState, r), m, {
          stamp: stamp
            ? {
                view: stamp,
                environmentId: r,
              }
            : undefined,
          signal: abortController.signal,
          hostStream: createHostStreamCaller(bridgeState, r),
          framed: (registration, H) =>
            framing.run(
              {
                environmentId: r,
                registration,
              },
              H,
            ),
          blamedFor: () => servingCallers(bridgeState)[0],
          blamedWalk: cloneAnswer(bridgeState, r),
        });
      } finally {
        loading.delete(r);
      }
      environments.set(r, {
        environment: k,
        name: m.pluginName,
        tier: m.tier,
        isPersons: m.isPersons,
        nextTo: new Set(m.scan.nextTo ?? []),
        scan: m.scan,
        answersForEngine: hasRegisteredEnv(m.modulePath),
      });
      return {
        registered: k.activation.registrations.registered,
      };
    },
    unload(r) {
      loading.get(r)?.abort();
      loading.delete(r);
      let m = environments.get(r);
      if (m) {
        environments.delete(r);
        bridgeState.resolving.delete(r);
        m.environment.dispose();
      }
      for (let key of presses.keys()) if (key.startsWith(keyOfPair(r, 0).slice(0, -1))) presses.delete(key);
    },
    dispatch: R,
    dispatchStream: (r, hostNext, signal) =>
      teeGeneratorResult(
        b(
          r.id,
          reportStreamChainFailure(
            buildHopChainArgs(bridgeState, {
              request: r,
              hostNext,
              signal,
            }),
          ),
        ),
      ),
    link: (r) => dispatchUiHandler(bridgeState, r),
    linkStreams: (r) => readValueField(bridgeState, r),
    within: T,
    withinSteps: b,
    async resolveTables(r, m) {
      let { environment } = requireEnvironment(bridgeState, r);
      let k = (bridgeState.resolving.get(r) ?? 0) + 1;
      bridgeState.resolving.set(r, k);
      let g = UI_ELEMENT_BUILDERS();
      let results = await Promise.all(
        m.map(async (x) => ({
          surface: x.surface,
          component: x.component,
          answer: await resolveUiTables(bridgeState, {
            environmentId: r,
            request: x,
            core: g[x.surface],
          }),
        })),
      );
      if (environments.get(r)?.environment === environment && bridgeState.resolving.get(r) === k)
        environment.storeResolved(results);
    },
    build: (r, m, v) => {
      requireEnvironment(bridgeState, r).environment.activation.finalize(m, v);
    },
    callInterface(r, { name: m, method, args }, g) {
      let { environment } = requireEnvironment(bridgeState, r);
      if (g) bridgeState.servingLive.add(g.callId);
      let x =
        g !== undefined && servedBudgetMs !== Number.POSITIVE_INFINITY
          ? setTimeout(deleteFromMap, servedBudgetMs, bridgeState.servingLive, g.callId)
          : undefined;
      function F() {
        clearTimeout(x);
        if (g) bridgeState.servingLive.delete(g.callId);
      }
      let E = () =>
        runWithStackStamps(stamp, g?.callers ?? [], () =>
          environment.activation.callInterface(m, method, environment.cloneIn(args)),
        ).then(environment.leaving);
      try {
        return budgetPauseStorage
          .exit(() => framing.run(undefined, () => answering.run(undefined, () => serving.run(g, E))))
          .finally(F);
      } catch (error) {
        F();
        throw error;
      }
    },
    press(environmentId, { handle, sent }, k) {
      let { environment } = requireEnvironment(bridgeState, environmentId);
      let H = presses.get(keyOfPair(environmentId, handle));
      if (H === undefined)
        return Promise.reject(
          new HooksError(`ui.press/ui.input/ui.select: no handler is held under handle ${handle}`),
        );
      let u = liveEventEnvelope(sent, environmentId, k);
      return framing.run(undefined, () =>
        answering.run(u, () =>
          environment
            .invoke(H, [environment.cloneIn(k)])
            .then(() => {
              return;
            })
            .finally(() => {
              u.isLive = false;
            }),
        ),
      );
    },
    releasePresses: (r, m) => {
      for (let v of m) presses.delete(keyOfPair(r, v));
    },
  };
}
//@ chunk-pwe88xvs.js:12722-12794 placement
/**
 * 拒绝全部挂起
 */
function rejectAllPending(e, t) {
  for (let o of e.values()) o.reject(new HooksError(t));
  e.clear();
}
//@ chunk-pwe88xvs.js:12794-12847 placement
/**
 * 取出并删除挂起项
 */
function takePending(e, t) {
  let o = e.get(t);
  e.delete(t);
  return o;
}
//@ chunk-pwe88xvs.js:12847-12857 placement
/**
 * 与 worker 共享的 marks 数组里「最新分发序号」的槽位；宿主用它判断已应答的是不是当前这次分发。
 */
var MARKS_NEWEST_DISPATCH_SLOT = 0;
//@ chunk-pwe88xvs.js:12857-12867 placement
/**
 * marks 共享数组的槽位数（3 个槽：最新分发序号、已应答分发序号、已应答次数）。
 */
var MARKS_SLOT_COUNT = 3;
//@ chunk-pwe88xvs.js:12867-12877 placement
/**
 * marks 共享数组里「已应答次数」的槽位。
 */
var MARKS_ANSWERS_SENT_SLOT = 2;
//@ chunk-pwe88xvs.js:12877-12887 placement
/**
 * marks 共享数组里「已应答的分发序号」的槽位。
 */
var MARKS_ANSWERED_DISPATCH_SLOT = 1;
//@ chunk-1tz177x8.js:37817-37920 placement = isComputerUseLock (0.575)
/**
 * （误归 computerUse）会话目标：字符串原样返回，对象取 sessionId 或 agentId。
 */
function sessionTargetId(value) {
  if (typeof value === "string" || value === undefined) return value;
  return "sessionId" in value ? value.sessionId : value.agentId;
}
//@ chunk-1tz177x8.js:37920-38481 placement
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
      let m = payload;
      return {
        ...m,
        args: m.args ?? "",
        origin: m.origin ?? origin,
        presentation: m.presentation ?? viewportInfo(undefined),
      };
    }
    case "prompt.fill": {
      let m = payload;
      return {
        ...m,
        mode: m.mode ?? "replace",
        origin: m.origin ?? origin,
      };
    }
    case "prompt.suggest": {
      let m = payload;
      return {
        ...m,
        origin: m.origin ?? origin,
      };
    }
    case "prompt.submit": {
      let { asUser, ...f } = payload;
      return {
        ...f,
        wait: f.wait ?? false,
        origin:
          f.origin ??
          (asUser === true
            ? {
                ...origin,
                asUser: true,
              }
            : origin),
      };
    }
    case "session.send": {
      let m = payload;
      return {
        ...m,
        to: sessionTargetId(m.to),
        origin: m.origin ?? origin,
      };
    }
    case "session.append":
      return buildPluginAppendRow(payload, pluginName);
    default:
      return payload;
  }
}
//@ chunk-4121qate.js:180389-180428 placement = withModifiers (1)
/**
 * （误归 computerUse）按 "press"+两个参数用分隔符拼键。
 */
var withModifiers = (plugin, handle) => ["press", plugin, handle].join(Vme);
export {
  normalizePluginHostAction,
  withModifiers,
  CHECKER_NO_ANSWER,
  MARKS_SLOT_COUNT,
  takePending,
  createHookHostBridge,
  rejectAllPending,
  MARKS_ANSWERED_DISPATCH_SLOT,
  MARKS_ANSWERS_SENT_SLOT,
  MARKS_NEWEST_DISPATCH_SLOT,
  classicWithholding,
};
