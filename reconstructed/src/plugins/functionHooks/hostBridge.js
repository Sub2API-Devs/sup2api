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
  Gbi,
  checkElementProps,
  checkElementList,
  Qbi,
  DUi,
  collectClientElements,
  Lrs,
  collectRasterElements,
  $rs,
  collectImageElements,
  Hrs,
  collectMarkdownParts,
  collectHoverScopes,
  Ifr,
  collectTextParts,
  IUi,
} from "./ui/elements.js";
import { rxt } from "./sites/sessionSites.js";
import { bUe, UI_ENV_SITE_RULES, Nae } from "./sites/siteRules.js";
import {
  cEe,
  forwardGenerator,
  onGeneratorReturn,
  teeGeneratorResult,
  createStreamOperators,
  reportStreamChainFailure,
} from "./dispatch/streamChain.js";
import { probeHookCallback, mos } from "./eventPatterns.js";
import { axt } from "./vm/vmGlobals.js";
import { deepFreeze, isPlainDataObject } from "../../utils/hooks/functionHookMatchers.js";
import { Pf } from "../../utils/untrustedValues.js";
import { HooksError, apr, Qeo, ipr, requireEventArgument } from "./hooksErrors.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { dfr } from "./vm/vmBootstrapSource.js";
import {
  runPreservingStamp,
  runWithStackStamps,
  isNextToUserTarget,
  createHooksEnvironment,
  eos,
} from "./vm/moduleLoader.js";
import { errorMessage } from "../../utils/errors.js";
import { Jfr } from "./builtinHooksModule.js";
import {
  frs,
  freezeHookCall,
  CAn,
  nfr,
  reportChainFailure,
  makeHookCall,
  hookCallContext,
  mrs,
  freeze_4,
} from "./dispatch/chain.js";
import { xUe } from "./api/operations.js";
import { outsideBudget, TAn } from "./dispatch/valueSizing.js";
import { viewportInfo } from "./surfaceBinding.js";
import { buildPluginAppendRow } from "./api/sessionAppend.js";
import { fromCharCode } from "./ui/raster.js";

//@ chunk-pwe88xvs.js:688-720 placement
var X = () => xr(UI_ELEMENT_TYPES, (e, t) => Gbi(t));
//@ chunk-pwe88xvs.js:720-748 placement
var CLASSIC_POSTTOOLUSE = "classic.PostToolUse";
//@ chunk-pwe88xvs.js:748-825 placement
var Z = "this could not be given to a hook that checks it, so it was not done";
//@ chunk-pwe88xvs.js:825-918 placement
var L = "this tool input could not be given to a hook that checks it, so the tool was not run";
//@ chunk-pwe88xvs.js:918-1199 placement
function buildClassicDenyResult(e, t) {
  let o = {
      "classic.PreToolUse": { deny: L },
      "classic.PermissionRequest": { decision: { behavior: "deny", message: L } },
    },
    s = e === "tool.call" || e === "tool.check",
    f = e === "session.compact" || (((p) => e === "session.append")(t) && !rxt(t)) ? void 0 : bUe[e];
  return Object.hasOwn(bUe, e) ? f?.(s ? L : Z) : o[e];
}
//@ chunk-pwe88xvs.js:1199-1271 placement
var wAn = "a hook that checks this result could not hand back its answer";
//@ chunk-pwe88xvs.js:1271-1383 placement
var ALWAYS_WITHHELD_EVENTS = new Set([
  "tool.check",
  "agent.offer",
  "plugin.register",
  "classic.PreToolUse",
  "classic.PermissionRequest",
]);
/**
 * 无法交给检查钩子时的扣留策略：PostToolUse 只记录；检查类事件以拒绝作答；tool.call 拒绝并扣留结果。
 */
//@ chunk-pwe88xvs.js:1383-1589 placement
function classicWithholding(e, t) {
  if (e === CLASSIC_POSTTOOLUSE) return { isNoted: !0 };
  let o = buildClassicDenyResult(e, t);
  if (o === void 0) return;
  if (ALWAYS_WITHHELD_EVENTS.has(e)) return { answer: o, afterNext: o };
  return e === "tool.call" ? { answer: o, afterNext: { deny: wAn }, isWithholding: !0 } : { answer: o };
}
//@ chunk-pwe88xvs.js:1589-1680 placement
function oe(e) {
  let t = "kind" in e,
    o = "value" in e;
  return t ? "ui.input" : o ? "ui.select" : "ui.press";
}
//@ chunk-pwe88xvs.js:1680-1846 placement
function answeringEventFor(e, t) {
  let store = e.answering.getStore();
  return store !== void 0 &&
    store.isLive &&
    Date.now() < store.answersUntil &&
    (store.event === "session.start" || store.environmentId === t)
    ? store.event
    : void 0;
}
//@ chunk-pwe88xvs.js:1846-1939 placement
var Ne = (e, t, o) => ({
  event: oe(o),
  isLive: !0,
  answersUntil: Date.now() + cEe,
  environmentId: t,
  sent: e,
});
//@ chunk-pwe88xvs.js:1939-2607 placement
function cloneAnswer(e, t) {
  let weakMap = new WeakMap(),
    weakSet = new WeakSet();
  return (i) => {
    let { stamp: stamp, environments: environments } = e;
    if (stamp === void 0) return probeHookCallback(i);
    let p = stamp,
      load = Atomics.load(p, axt),
      c = new Map(),
      S = (a) => Atomics.store(p, axt, a ?? load);
    function y(a, T) {
      S(a);
      let R = T(),
        b = a !== void 0 && typeof R === "object" && R !== null;
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
        c.set(a, filtered.length === 1 ? filtered[0]?.[0] : void 0);
      }
      return y(c.get(a), T);
    }
    try {
      return i(
        (a) => (S(a ? weakMap.get(a) : void 0), a !== void 0 && weakSet.has(a)),
        h,
        (a) => {
          let T = y(t, a);
          if (weakMap.has(T)) weakSet.add(T);
          return T;
        },
      );
    } finally {
      Atomics.store(p, axt, load);
    }
  };
}
//@ chunk-pwe88xvs.js:2607-2708 placement
function servingCallers(e) {
  let store = e.serving.getStore();
  return store !== void 0 && e.servingLive.has(store.callId) ? store.callers : [];
}
//@ chunk-pwe88xvs.js:2708-3246 placement
function checkResolveAnswer(e, t, o) {
  let { result: s, resolver: resolver } = o;
  if (Pf(s))
    throw new HooksError(
      "the ui.resolve answer is a Proxy or a vm context; a table of elements is a plain object",
    );
  if (!isPlainObject(s)) return s;
  let create = Object.create(null);
  for (let f of Reflect.ownKeys(s)) {
    if (typeof f !== "string" || f === "then" || f === "__proto__") continue;
    let ownPropertyDescriptor = Reflect.getOwnPropertyDescriptor(s, f);
    if (ownPropertyDescriptor?.enumerable !== !0) continue;
    let l = ownPropertyDescriptor.value,
      c = !Pf(l) && typeof l === "function",
      S = c && dfr.nameOf(l) === f;
    create[f] = !c
      ? void 0
      : S
        ? l
        : (y) =>
            runPreservingStamp(e.stamp, () =>
              runWithStackStamps(e.stamp, [...servingCallers(e), resolver], () => t.invokeSync(l, y)),
            );
  }
  return create;
}
//@ chunk-pwe88xvs.js:3294-3516 placement
var createBridgeState = (e, t, o) => ({
  environments: new Map(),
  loading: new Map(),
  dispatching: new AsyncLocalStorage(),
  framing: new AsyncLocalStorage(),
  serving: new AsyncLocalStorage(),
  answering: new AsyncLocalStorage(),
  servingLive: new Set(),
  hostOps: e,
  hostStreamOps: t,
  presses: new Map(),
  taking: new Map(),
  resolving: new Map(),
  stamp: o,
});
//@ chunk-pwe88xvs.js:3516-3675 placement
function argumentForEnvironment({ environment: environment, name: t, event: event, e: s }) {
  try {
    return environment.argumentFor(s);
  } catch (error) {
    throw apr(new HooksError(`${t}: ${event}: could not be given its argument: ${errorMessage(error)}`));
  }
}
//@ chunk-pwe88xvs.js:3675-3770 placement
function G(e) {
  let weakMap = new WeakMap();
  return (o) => {
    let s = weakMap.get(o) ?? argumentForEnvironment({ ...e, e: o });
    return (weakMap.set(o, s), s);
  };
}
//@ chunk-pwe88xvs.js:3770-3798 placement
var P = (e, t) => `${e}\x00${t}`;
/**
 * 一次渲染后，删除不再出现在新元素树中的按键句柄。
 */
//@ chunk-pwe88xvs.js:3798-4035 placement
function dropStalePresses(e, t, o) {
  let s = e.taking.get(t);
  if ((e.taking.delete(t), s === void 0)) return;
  let i = new Set();
  for (let { plugin: plugin, handle: handle } of checkElementProps(o))
    for (let [p, l] of e.environments) if (l.name === plugin) i.add(P(p, handle));
  for (let n of s) if (!i.has(n)) e.presses.delete(n);
}
//@ chunk-pwe88xvs.js:4035-4149 placement
function requireEnvironment(e, t) {
  let o = e.environments.get(t);
  if (o === void 0) throw new HooksError(`environment ${t} is not loaded`);
  return o;
}
//@ chunk-pwe88xvs.js:4149-4243 placement
function ie(e, t) {
  let store = e.framing.getStore();
  return store?.environmentId === t ? store.registration : void 0;
}
//@ chunk-pwe88xvs.js:4243-4323 placement
var U = (e, t) =>
  forwardGenerator({ next: () => t(() => e.next()), return: () => t(() => e.return(void 0)) });
//@ chunk-pwe88xvs.js:4323-4857 placement
function checkNextToTarget(e, t, { event: event, raised: raised, leftOut: leftOut }) {
  let { environment: environment, name: f, nextTo: nextTo, scan: scan } = e;
  for (let c of t) {
    if (Jfr(c) && !nextTo.has(c))
      throw new HooksError(
        `${f}: next.to("${c}") refused: its hooks module does not spell ${frs(c)} in a literal the scan reads (host rule)`,
      );
    if (
      c === "user" &&
      !(raised === void 0
        ? mos(scan, event)
        : isNextToUserTarget({
            clauses: environment.activation.registrations.registered.filter(
              (h, a) => leftOut?.includes(a) !== !0,
            ),
            scan: scan,
            event: event,
            raised: raised,
          }))
    )
      throw new HooksError(
        `${f}: next.to("user") refused: no hook of its module that spells it stands on this dispatch of ${event} (host rule)`,
      );
  }
}
//@ chunk-pwe88xvs.js:4857-5120 placement
function collectUiTree(e, t, o) {
  let { environmentId: environmentId, name: i } = t,
    n = checkElementList(t.result, i);
  return Qbi(n)
    ? DUi({
        tree: n,
        plugin: i,
        seen: o.seen,
        groups: o.groups,
        parts: o.parts,
        take: (f, p) => {
          let l = P(environmentId, f);
          e.presses.set(l, p);
          let store = e.dispatching.getStore();
          if (store !== void 0) e.taking.get(store)?.add(l);
        },
      })
    : n;
}
//@ chunk-pwe88xvs.js:5120-5197 placement
function fe(e, t, o) {
  let s = Qeo(o) ? classicWithholding(e, t) : void 0;
  return s === void 0 ? o : ipr(o, s);
}
//@ chunk-pwe88xvs.js:5197-6796 placement
function dispatchUiHandler(e, t, o) {
  let {
      environmentId: environmentId,
      event: event,
      resolver: resolver,
      leftOut: leftOut,
      ended: ended,
      caughtAnswered: caughtAnswered,
      endedReached: endedReached,
      withheld: withheld,
    } = t,
    {
      environment: environment,
      name: h,
      tier: tier,
      isPersons: isPersons,
      answersForEngine: answersForEngine,
    } = requireEnvironment(e, environmentId),
    b = o ?? environment.activation.registrations.get(event, leftOut);
  if (!b) throw new HooksError(`${h}: no ${event} handler`);
  let { run: run, catch: r } = b;
  function m(u, x) {
    return resolver !== void 0
      ? checkResolveAnswer(e, environment, { result: u, resolver: resolver })
      : event === "ui.render"
        ? collectUiTree(e, { environmentId: environmentId, name: h, result: u }, x)
        : environment.leaving(u, event);
  }
  function v(u, { seen: seen, groups: groups, parts: parts, counted: counted }) {
    function j(w) {
      if (event === "ui.render" && Qbi(w) && !counted.has(w)) {
        counted.add(w);
        for (let O of checkElementProps(w)) seen.add(withModifiers(O.plugin, O.handle));
        for (let O of collectClientElements(w)) seen.add(Lrs(O));
        for (let O of collectRasterElements(w)) seen.add($rs(O));
        for (let O of collectImageElements(w)) seen.add(Hrs(O));
        for (let O of collectMarkdownParts(w)) seen.add(O);
        for (let O of collectHoverScopes(w)) {
          let Q = Ifr(O);
          groups.set(Q, (groups.get(Q) ?? 0) + 1);
        }
        for (let O of collectTextParts(w)) parts.set(O, (parts.get(O) ?? 0) + 1);
      }
      return w;
    }
    return environment.nextFor(
      freezeHookCall({
        call: async (w) => (environment.freezeForNext(requireEventArgument(w, h)), j(await u(w))),
        to: async (w, ...V) => (
          environment.freezeForNext(requireEventArgument(w, h)),
          checkNextToTarget(requireEnvironment(e, environmentId), V, t),
          j(await CAn(w, u, V))
        ),
        signal: u.signal,
        is: u.is,
        event: u.event,
        origin: u.origin,
        trace: () => u.trace,
        budget: () => u.budget,
        caught: nfr(u),
      }),
      event,
    );
  }
  let k = G({ environment: environment, name: h, event: event });
  async function g(u, x, F) {
    let E = IUi();
    try {
      return m(await u(k(x), v(F, E)), E);
    } catch (error) {
      throw fe(event, x, error);
    }
  }
  async function H(u, x, F) {
    if ((endedReached?.(environmentId, x), u.called))
      await F(x).then(void 0, () => {
        return;
      });
    throw new HooksError(u.reason);
  }
  return {
    name: h,
    environmentId: environmentId,
    tier: tier,
    ...(isPersons === !1 && { isVouched: !0 }),
    ...(answersForEngine && { answersForEngine: answersForEngine }),
    applied: environment.applyIn,
    ...(r && {
      catch: async (u, x) => {
        let F = await g(r, u, x);
        if (F !== void 0) caughtAnswered?.(environmentId);
        return F;
      },
    }),
    ...(withheld && { withheld: withheld }),
    run: (u, x) => (ended === void 0 ? g(run, u, x) : H(ended, u, x)),
  };
}
//@ chunk-pwe88xvs.js:6796-6906 placement
function pressSentFor(e, t) {
  let store = e.answering.getStore();
  return store?.event === "ui.press" && store.environmentId === t ? store.sent : void 0;
}
//@ chunk-pwe88xvs.js:6906-7011 placement
function servingCallId(e) {
  let store = e.serving.getStore();
  return store !== void 0 && e.servingLive.has(store.callId) ? store.callId : void 0;
}
/**
 * 构造环境发起宿主操作时的帧：环境 id、分发 id、注册序号、服务中的调用、根事件与按键。
 */
//@ chunk-pwe88xvs.js:7011-7150 placement
var opFrameFor = (e, t) => ({
  environmentId: t,
  dispatchId: e.dispatching.getStore(),
  registration: ie(e, t),
  serving: servingCallId(e),
  rootEvent: answeringEventFor(e, t),
  pressing: pressSentFor(e, t),
});
/**
 * 为某环境生成宿主操作调用函数（非时钟类操作在预算外执行）。
 */
//@ chunk-pwe88xvs.js:7150-7254 placement
var createHostOpCaller = (e, t) => (o, s, i) => {
  let n = () => e.hostOps({ ...opFrameFor(e, t), op: o, args: s, signal: i });
  return xUe(o) ? n() : outsideBudget(n);
};
/**
 * 为某环境生成流式宿主操作调用函数：可被放弃时中止，结束前不计入钩子预算。
 */
//@ chunk-pwe88xvs.js:7254-7568 placement
var createHostStreamCaller = (e, t) => (o, s, i) => {
  let abortController = new AbortController(),
    f = i === void 0 ? abortController.signal : AbortSignal.any([i, abortController.signal]),
    p = U(e.hostStreamOps({ ...opFrameFor(e, t), op: o, args: s, signal: f }), outsideBudget);
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
function environmentCatches(e, { event: event, leftOut: leftOut }, [s, i]) {
  let { environment: environment, name: f } = requireEnvironment(e, s);
  return environment.activation.registrations.catches(
    event,
    argumentForEnvironment({ environment: environment, name: f, event: event, e: i }),
    leftOut?.find((p) => p.environmentId === s)?.registrations,
  );
}
/**
 * 为一个 UI 组件运行 ui.resolve 钩子链（各环境依次），底部返回核心元素表。
 */
//@ chunk-pwe88xvs.js:7774-8110 placement
function resolveUiTables(e, t) {
  let { environmentId: environmentId, request: request, core: core } = t,
    n = { surface: request.surface, component: request.component },
    f = requireEnvironment(e, environmentId);
  return reportChainFailure({
    e: n,
    handlers: request.environments
      .filter((environment) => e.environments.has(environment))
      .map((p) => dispatchUiHandler(e, { environmentId: p, event: "ui.resolve", resolver: environmentId })),
    site: UI_ENV_SITE_RULES["ui.resolve"],
    bottom: () => Promise.resolve(core),
    origin: { plugin: f.name, tier: f.tier },
  });
}
//@ chunk-pwe88xvs.js:8110-8138 placement
var gt = (e, t) => {
  e.delete(t);
};
//@ chunk-pwe88xvs.js:8138-8223 placement
var kt = () => ({ event: "session.start", isLive: !0, answersUntil: Number.POSITIVE_INFINITY });
//@ chunk-pwe88xvs.js:8223-8864 placement
function readValueField(e, t) {
  let { environmentId: environmentId, event: event, leftOut: leftOut } = t,
    { environment: environment, name: f, tier: tier } = requireEnvironment(e, environmentId),
    l = G({ environment: environment, name: f, event: event });
  function c(y) {
    let h = y;
    return environment.streamNextFor(
      makeHookCall({
        ...hookCallContext(y),
        call: (a) => (environment.freezeForNext(requireEventArgument(a, f)), h(a)),
        to: (a, ...T) => (
          environment.freezeForNext(requireEventArgument(a, f)),
          checkNextToTarget(requireEnvironment(e, environmentId), T, t),
          mrs(a, h, T)
        ),
      }),
    );
  }
  let S = (y, h) => U(h, (a) => e.framing.run({ environmentId: environmentId, registration: y }, a));
  return environment.activation.registrations.streamClauses(event, leftOut).map((y) => {
    if (y.kind === "value") return createStreamOperators(dispatchUiHandler(e, t, y.hook));
    let { registration: registration } = y,
      a = (R) => async (b, _) => S(registration, await R(l(b), c(_))),
      T = y.catch;
    return {
      name: f,
      environmentId: environmentId,
      tier: tier,
      run: a(y.open),
      ...(T !== void 0 && { catch: a(T) }),
    };
  });
}
/**
 * 为一跳构造钩子链参数：各环境的处理器、宿主 next 与中止信号。
 */
//@ chunk-pwe88xvs.js:8864-9212 placement
function buildHopChainArgs(e, { request: request, hostNext: hostNext, signal: signal }) {
  let { event: event, leftOut: leftOut, environments: environments } = request,
    flattened = environments.flatMap((c) =>
      readValueField(e, {
        environmentId: c,
        event: event,
        raised: request.payload,
        leftOut: leftOut?.find((S) => S.environmentId === c)?.registrations,
      }),
    ),
    l = (c, S, y = freeze_4) => hostNext(c, S, y);
  return {
    e: request.payload,
    handlers: flattened,
    site: Nae(event, request.raise),
    signal: signal,
    isHopFold: !0,
    bottom: l,
    origin: request.origin,
    floors: request.floors,
  };
}
/**
 * 建立钩子运行环境与宿主操作的桥（ui.render、session.start、ui.press/input/select 句柄，约 3.5 KB）。
 */
//@ chunk-pwe88xvs.js:9212-12722 placement
function createHookHostBridge({
  hostOps: hostOps,
  hostStreamOps: hostStreamOps,
  stamp: stamp,
  createEnvironment: createEnvironment,
  servedBudgetMs: servedBudgetMs = cEe,
}) {
  let n = createBridgeState(hostOps, hostStreamOps, stamp),
    f = createEnvironment ?? createHooksEnvironment,
    {
      environments: environments,
      loading: loading,
      dispatching: dispatching,
      framing: framing,
      serving: serving,
      answering: answering,
      presses: presses,
    } = n;
  async function T(r, m, v) {
    if (m === "ui.render") n.taking.set(r, new Set());
    let k,
      H = m === "session.start" ? kt() : void 0;
    try {
      return ((k = await dispatching.run(r, () => answering.run(H, v))), k);
    } finally {
      if (H !== void 0) H.isLive = !1;
      dropStalePresses(n, r, k);
    }
  }
  async function R(r, m, v) {
    let k = new Set(),
      g = r.event === CLASSIC_POSTTOOLUSE ? { isGiven: !1 } : void 0,
      H = new Map(),
      u;
    try {
      u = await T(r.id, r.event, () =>
        reportChainFailure({
          e: r.payload,
          handlers: r.environments.map((environment) =>
            dispatchUiHandler(n, {
              environmentId: environment,
              event: r.event,
              raised: r.payload,
              leftOut: r.leftOut?.find((N) => N.environmentId === environment)?.registrations,
              ended: r.ended,
              caughtAnswered: (N) => k.add(N),
              ...(g && {
                withheld: () => {
                  g.isGiven = !0;
                },
              }),
              endedReached: (N, j) => H.set(N, j),
            }),
          ),
          site: Nae(r.event, r.raise),
          signal: v,
          isHopFold: !0,
          bottom: (E, N, j = freeze_4) => m(E, N, j),
          origin: r.origin,
          floors: r.floors,
          cutAt: r.cutAt,
        }),
      );
    } catch (error) {
      throw g?.isGiven === !0 ? ipr(error, { isNoted: !0 }) : error;
    }
    let found = [...H].find(([E]) => E === r.ended?.kept),
      F = found !== void 0 && !k.has(found[0]) && !environmentCatches(n, r, found);
    return {
      result: u,
      ...(r.ended !== void 0 && { answered: [...k] }),
      ...(F && { unmatched: !0 }),
      ...(g?.isGiven === !0 && { withheld: !0 }),
    };
  }
  let b = (r, m) => U(m, (v) => dispatching.run(r, () => answering.run(void 0, v)));
  return {
    currentDispatch: () => dispatching.getStore(),
    opFailureOf: (r) =>
      Array.from(environments.values(), (m) => m.environment.opFailureOf(r)).find((m) => m !== void 0),
    ownsValue: (r) => Array.from(environments.values()).some((m) => m.environment.ownsValue(r)),
    has: (r) => environments.has(r),
    async load(r, m) {
      let abortController = new AbortController();
      loading.set(r, abortController);
      let k;
      try {
        k = await f(createHostOpCaller(n, r), m, {
          stamp: stamp ? { view: stamp, environmentId: r } : void 0,
          signal: abortController.signal,
          hostStream: createHostStreamCaller(n, r),
          framed: (g, H) => framing.run({ environmentId: r, registration: g }, H),
          blamedFor: () => servingCallers(n)[0],
          blamedWalk: cloneAnswer(n, r),
        });
      } finally {
        loading.delete(r);
      }
      return (
        environments.set(r, {
          environment: k,
          name: m.pluginName,
          tier: m.tier,
          isPersons: m.isPersons,
          nextTo: new Set(m.scan.nextTo ?? []),
          scan: m.scan,
          answersForEngine: eos(m.modulePath),
        }),
        { registered: k.activation.registrations.registered }
      );
    },
    unload(r) {
      (loading.get(r)?.abort(), loading.delete(r));
      let m = environments.get(r);
      if (m) (environments.delete(r), n.resolving.delete(r), m.environment.dispose());
      for (let v of presses.keys()) if (v.startsWith(P(r, 0).slice(0, -1))) presses.delete(v);
    },
    dispatch: R,
    dispatchStream: (r, m, v) =>
      teeGeneratorResult(
        b(r.id, reportStreamChainFailure(buildHopChainArgs(n, { request: r, hostNext: m, signal: v }))),
      ),
    link: (r) => dispatchUiHandler(n, r),
    linkStreams: (r) => readValueField(n, r),
    within: T,
    withinSteps: b,
    async resolveTables(r, m) {
      let { environment: environment } = requireEnvironment(n, r),
        k = (n.resolving.get(r) ?? 0) + 1;
      n.resolving.set(r, k);
      let g = X(),
        results = await Promise.all(
          m.map(async (x) => ({
            surface: x.surface,
            component: x.component,
            answer: await resolveUiTables(n, { environmentId: r, request: x, core: g[x.surface] }),
          })),
        );
      if (environments.get(r)?.environment === environment && n.resolving.get(r) === k)
        environment.storeResolved(results);
    },
    build: (r, m, v) => {
      requireEnvironment(n, r).environment.activation.finalize(m, v);
    },
    callInterface(r, { name: m, method: v, args: k }, g) {
      let { environment: environment } = requireEnvironment(n, r);
      if (g) n.servingLive.add(g.callId);
      let x =
        g !== void 0 && servedBudgetMs !== Number.POSITIVE_INFINITY
          ? setTimeout(gt, servedBudgetMs, n.servingLive, g.callId)
          : void 0;
      function F() {
        if ((clearTimeout(x), g)) n.servingLive.delete(g.callId);
      }
      let E = () =>
        runWithStackStamps(stamp, g?.callers ?? [], () =>
          environment.activation.callInterface(m, v, environment.cloneIn(k)),
        ).then(environment.leaving);
      try {
        return TAn.exit(() =>
          framing.run(void 0, () => answering.run(void 0, () => serving.run(g, E))),
        ).finally(F);
      } catch (error) {
        throw (F(), error);
      }
    },
    press(r, { handle: m, sent: v }, k) {
      let { environment: environment } = requireEnvironment(n, r),
        H = presses.get(P(r, m));
      if (H === void 0)
        return Promise.reject(
          new HooksError(`ui.press/ui.input/ui.select: no handler is held under handle ${m}`),
        );
      let u = Ne(v, r, k);
      return framing.run(void 0, () =>
        answering.run(u, () =>
          environment
            .invoke(H, [environment.cloneIn(k)])
            .then(() => {
              return;
            })
            .finally(() => {
              u.isLive = !1;
            }),
        ),
      );
    },
    releasePresses: (r, m) => {
      for (let v of m) presses.delete(P(r, v));
    },
  };
}
//@ chunk-pwe88xvs.js:12722-12794 placement
function EAn(e, t) {
  for (let o of e.values()) o.reject(new HooksError(t));
  e.clear();
}
//@ chunk-pwe88xvs.js:12794-12847 placement
function XJ(e, t) {
  let o = e.get(t);
  return (e.delete(t), o);
}
//@ chunk-pwe88xvs.js:12847-12857 placement
var uZr = 0;
//@ chunk-pwe88xvs.js:12857-12867 placement
var wUi = 3;
//@ chunk-pwe88xvs.js:12867-12877 placement
var drs = 2;
//@ chunk-pwe88xvs.js:12877-12887 placement
var crs = 1;
/**
 * （误归 computerUse）会话目标：字符串原样返回，对象取 sessionId 或 agentId。
 */
//@ chunk-1tz177x8.js:37817-37920 placement = isComputerUseLock (0.575)
function sessionTargetId(value) {
  if (typeof value === "string" || value === void 0) return value;
  return "sessionId" in value ? value.sessionId : value.agentId;
}
/**
 * （误归 computerUse）插件宿主动作补默认值：command.run/prompt.fill/prompt.suggest/prompt.submit/session.send 补 origin={kind:"plugin",name} 等字段。
 */
//@ chunk-1tz177x8.js:37920-38481 placement
function normalizePluginHostAction(payload, pluginName, n) {
  let origin = { kind: "plugin", name: pluginName };
  switch (n) {
    case "command.run": {
      let m = payload;
      return {
        ...m,
        args: m.args ?? "",
        origin: m.origin ?? origin,
        presentation: m.presentation ?? viewportInfo(void 0),
      };
    }
    case "prompt.fill": {
      let m = payload;
      return { ...m, mode: m.mode ?? "replace", origin: m.origin ?? origin };
    }
    case "prompt.suggest": {
      let m = payload;
      return { ...m, origin: m.origin ?? origin };
    }
    case "prompt.submit": {
      let { asUser: asUser, ...f } = payload;
      return {
        ...f,
        wait: f.wait ?? !1,
        origin: f.origin ?? (asUser === !0 ? { ...origin, asUser: !0 } : origin),
      };
    }
    case "session.send": {
      let m = payload;
      return { ...m, to: sessionTargetId(m.to), origin: m.origin ?? origin };
    }
    case "session.append":
      return buildPluginAppendRow(payload, pluginName);
    default:
      return payload;
  }
}
/**
 * （误归 computerUse）按 "press"+两个参数用分隔符拼键。
 */
//@ chunk-4121qate.js:180389-180428 placement = withModifiers (1)
var withModifiers = (e, o) => ["press", e, o].join(fromCharCode);

export {
  normalizePluginHostAction,
  withModifiers,
  wAn,
  wUi,
  XJ,
  createHookHostBridge,
  EAn,
  crs,
  drs,
  uZr,
  classicWithholding,
};
