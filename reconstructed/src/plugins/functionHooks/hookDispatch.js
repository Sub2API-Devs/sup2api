/**
 * plugins/functionHooks/hookDispatch.ts
 *
 * 2.1.316 新增：worker 在分发中途死亡时，用替换 worker 重试剩余插件；按调用者链与借出状态筛出某模块对事件的有效视图等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vr8smdd9.js (43)
 * attribution: placement 43
 */
import { isDeepStrictEqual } from "util";
import { AsyncLocalStorage } from "async_hooks";
import {
  pluginStorageKey,
  dkt,
  EYr,
  lentModulesByChain,
  Qo,
  registrationsOfPlugin,
  moduleCatchesEvent,
  Re,
  liveModulesForDispatch,
  reportPluginProblem,
  ye,
  moduleMatcherAdmits,
  warnMatcherMiss,
  he,
  originPlugin,
} from "./hooksWorkerClient.js";
import { marketplaceSource } from "../../utils/plugins/pluginOptionsStorage.js";
import { logForDebugging } from "../../utils/debug.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { isModuleAdmitted } from "../../utils/plugins/functionHooks/admission.js";
import { errorMessage } from "../../utils/errors.js";
import { HooksError } from "./hooksErrors.js";
import { findBypassingFloor } from "./dispatch/valueSizing.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { isNextToUserTarget, eos } from "./vm/moduleLoader.js";
import { appendNextToStep, abortErrorFor, freeze_6 } from "./dispatch/chain.js";
import { forwardGeneratorWithErrorHook } from "./dispatch/streamChain.js";
import { pushToKillRing } from "../../utils/Cursor.js";
import { gxt, isPlainDataObject, opr } from "../../utils/hooks/functionHookMatchers.js";
import { lookupPathTable } from "../../utils/pathTable.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { Teo } from "./api/operations.js";

/**
 * 生成插件的 hooks 标签（名称 + 存储 id）。
 */
//@ chunk-vr8smdd9.js:30936-30996 placement
var hookPluginLabel = (e) => pluginStorageKey({ pluginName: e.name, pluginStorageId: marketplaceSource(e) });
//@ chunk-vr8smdd9.js:30996-31055 placement
var qni = (e, r, n) => `${e}: ${r} did not answer within ${n}ms`;
//@ chunk-vr8smdd9.js:31055-31120 placement
var Yni = "the plugin is unloaded; /reload-plugins brings it back";
/**
 * 为一次事件分发组装参与插件链（嵌套检查、排除项、层级、截止）。
 */
//@ chunk-vr8smdd9.js:31120-31646 placement
function buildHookChain({
  members: members,
  event: event,
  e: n,
  hookOrigin: hookOrigin,
  origin: origin,
  raise: raise,
  floors: floors,
  cutAt: cutAt,
  gestureAt: gestureAt,
  kind: kind,
}) {
  let [x] = members;
  if (hookOrigin)
    logForDebugging(`hooks module ${dkt(members)}: ${event}${kind} nested in ${EYr(hookOrigin)}`);
  let flattened = members.flatMap((y) => {
    let S = [...(y.leftOut ?? [])],
      { environmentId: environmentId } = y;
    return S.length > 0 ? [{ environmentId: environmentId, registrations: S }] : [];
  });
  return {
    id: x ? x.hopKey.nextDispatchId() : 0,
    event: event,
    payload: n,
    environments: members.map((y) => y.environmentId),
    leftOut: flattened.length === 0 ? void 0 : flattened,
    origin: origin,
    hookOrigin: hookOrigin,
    raise: raise,
    floors: floors.length === 0 ? void 0 : floors,
    cutAt: cutAt,
    ...(gestureAt !== void 0 && { gestureAt: gestureAt }),
  };
}
/**
 * 按调用者链与借出状态筛出某模块对事件的有效视图。
 */
//@ chunk-vr8smdd9.js:31646-32524 placement
function scopeModuleForEvent(e, r, n) {
  if (!n || n.length === 0) return e;
  let s = lentModulesByChain().get(n) ?? [],
    now = Date.now(),
    f = (S) => s[S]?.isLent !== !0 || s[S].isHeld === !0,
    { caller: caller, above: above } = Qo(
      n.filter((S, b) => f(b) || now < (s[b]?.until ?? 0)),
      e.name,
    ),
    g = (S, b) => S === "every" || S.includes(b),
    h = registrationsOfPlugin(
      n.slice(0, -1).filter((S, b) => f(b)),
      e.name,
    ),
    filtered = e.registrationsFor(r).filter((S) => g(caller, S) || g(h, S));
  if (filtered.length === 0) return e;
  let y = `origin ${EYr(n)}`;
  if (!e.hooks(r, filtered)) {
    let S = caller === "every" || above === "every";
    logForDebugging(
      `hooks module ${e.label} ${r} skipped: re-entry (` +
        (S ? `the plugin's own code raised it; ${y})` : `its own frame is being dispatched; ${y})`),
    );
    return;
  }
  return (
    logForDebugging(
      `hooks module ${e.label} ${r}: hooks ${filtered.join(", ")} left out for re-entry (${y})`,
    ),
    {
      ...e,
      leftOut: filtered,
      hooks: (S, b = []) => e.hooks(S, [...filtered, ...b]),
      catches: (S, b = [], M) => e.catches(S, [...filtered, ...b], M),
      matcherFor: (S, b = []) => e.matcherFor(S, [...filtered, ...b]),
      standingFor: (S, b = []) => e.standingFor(S, [...filtered, ...b]),
    }
  );
}
/**
 * hooks worker 死亡时等待替换的 worker 后再分发。
 */
//@ chunk-vr8smdd9.js:32524-33087 placement
async function awaitWorkerReplacement({
  members: members,
  event: event,
  hookOrigin: hookOrigin,
  signal: signal,
}) {
  let a = members.find((f) => f.status().kind === "dead")?.hopKey.replaced?.();
  if (a === void 0) return members;
  return (
    logForDebugging(
      `hooks module ${members.map((f) => f.label).join(", ")}: ${event} waits for the hooks worker's replacement`,
    ),
    await new Promise((f) => {
      (signal.addEventListener("abort", () => f(), { once: !0 }), a.then(f, f));
    }),
    members.flatMap((f) => {
      let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === f.name);
      if (!(f.status().kind !== "live" && found !== void 0 && found.environmentId !== f.environmentId))
        return [f];
      let g =
        found.hooks(event) && isModuleAdmitted(found)
          ? scopeModuleForEvent(found, event, hookOrigin)
          : void 0;
      return g === void 0 ? [] : [g];
    })
  );
}
/**
 * worker 在分发中途死亡时，用替换 worker 重试剩余插件。
 */
//@ chunk-vr8smdd9.js:33087-34400 placement
async function retryAfterWorkerDeath({
  hop: hop,
  dispatchId: dispatchId,
  members: members,
  error: error,
  called: called,
  beneath: beneath,
}) {
  let { event: event, e: c, signal: signal } = hop,
    h = (b) => b.filter((M) => moduleCatchesEvent(M, event, c)),
    x = errorMessage(error),
    w = Re(h(members), x),
    y = w[0]?.hopKey,
    S = y?.kept;
  while (w.length > 0 && !signal.aborted) {
    let b = h(liveModulesForDispatch(await awaitWorkerReplacement({ ...hop, members: w }), event)),
      M = b[0]?.hopKey,
      found = b.find((O) => O.name === S?.plugin);
    if (M === void 0 || signal.aborted) break;
    logForDebugging(
      `hooks module ${dkt(b)}: .catch asked in the replacement after the hooks worker ended during ${event}`,
    );
    for (let O of b) O.enter();
    try {
      let dispatch = await M.dispatch(
          {
            ...buildHookChain({ ...hop, members: b, kind: "" }),
            ended: { reason: x, called: called(), ...(found !== void 0 && { kept: found.environmentId }) },
          },
          beneath,
          signal,
        ),
        F =
          found !== void 0 &&
          S !== void 0 &&
          y?.isKeptVerdict?.(dispatchId, dispatch.unmatched !== !0) === !0;
      for (let v of b)
        if (dispatch.answered?.includes(v.environmentId) === !0)
          reportPluginProblem(
            v.name,
            `the hooks worker was replaced during ${event}; ${v.name}'s .catch answered in place of its hook`,
          );
      if (F) M.unloadCrashed?.(found.environmentId, S);
      return dispatch;
    } catch (error) {
      ((x = errorMessage(error)),
        (w = Re(b, x)),
        logForDebugging(
          `hooks module ${dkt(b)}: .catch not heard after the hooks worker ended during ${event}: ${x}` +
            (w.length > 0 ? "; asked again of whoever stands" : ""),
          { level: "error" },
        ));
    } finally {
      for (let O of b) O.leave();
    }
  }
  if (w.length > 0)
    logForDebugging(
      `hooks module ${dkt(w)}: no .catch is asked after the hooks worker ended during ${event}: ` +
        (signal.aborted ? "its caller is gone" : "no replacement that may be waited for holds its hook"),
      { level: "error" },
    );
  return;
}
//@ chunk-vr8smdd9.js:34400-34576 placement
function invalidFloorsError(e) {
  let r = new HooksError(
    `${dkt(e)}: next refused: the floors handed back are not ones a next.to of these plugins leaves (host rule)`,
  );
  return (logForDebugging(r.message, { level: "error" }), r);
}
/**
 * 按插件声明的 nextTo 扩展分发链。
 */
//@ chunk-vr8smdd9.js:34618-35011 placement
function extendChainWithNextTo(e, r, n, s, a) {
  return r.some((m) => isDeepStrictEqual(m, n))
    ? r
    : e
        .slice(
          Math.max(
            e.findIndex((m) => m.name === r.at(-1)?.plugin),
            0,
          ),
        )
        .filter((m) => findBypassingFloor(r, m.tier, m.name) === void 0)
        .flatMap((m) =>
          (m.args.scan.nextTo ?? [])
            .filter(
              (c) =>
                c !== "user" ||
                (isPlainObject(n) &&
                  n.isPastPeers === !0 &&
                  isNextToUserTarget({ clauses: m.standingFor(s), scan: m.args.scan, event: s, raised: a })),
            )
            .map((c) => appendNextToStep(r, { from: m.tier, to: c, plugin: m.name })),
        )
        .find((m) => isDeepStrictEqual(m.at(-1), n));
}
//@ chunk-vr8smdd9.js:35011-35131 placement
function extendChainForFloors(e, r, n, s, a) {
  if (!Array.isArray(n)) return;
  let f = e;
  for (let m of n) if (((f = extendChainWithNextTo(r, f, m, s, a)), f === void 0)) return;
  return f;
}
/**
 * 跨 worker 分发一次 hook 调用（层级 floors、跳转、错误处理）。
 */
//@ chunk-vr8smdd9.js:35131-35986 placement
async function dispatchHookCall(e) {
  let { event: event, e: n, call: s, signal: signal, floors: floors } = e,
    m = ye(e.members, event, n),
    c = m[0]?.hopKey;
  if (!c) return s(n, void 0, floors);
  let g,
    h = (M, T, O) => {
      let F = extendChainForFloors(floors, m, O, event, n);
      if (F === void 0) return Promise.reject(invalidFloorsError(m));
      return ((g = s(M, T, F)), g);
    },
    x = buildHookChain({ ...e, members: m, kind: "" }),
    startTime = performance.now();
  for (let M of m) M.enter();
  let y;
  try {
    y = await c.dispatch(
      { ...x, caughtBy: m.filter((M) => moduleCatchesEvent(M, event, n)).map((M) => M.environmentId) },
      h,
      signal,
    );
  } catch (error) {
    let T = await retryAfterWorkerDeath({
      hop: e,
      dispatchId: x.id,
      members: m,
      error: error,
      called: () => g !== void 0,
      beneath: (O, F, v) => g ?? h(O, F, v),
    });
    if (T === void 0) throw error;
    y = T;
  } finally {
    for (let M of m) M.leave();
  }
  let b =
    typeof n === "object" && "requestId" in n && typeof n.requestId === "string" ? ` key=${n.requestId}` : "";
  if (
    (logForDebugging(
      `hooks module ${dkt(m)} ${event} settled in ${(performance.now() - startTime).toFixed(1)}ms (${c.kind} hop, next() included)${b}`,
    ),
    y.withheld === !0)
  )
    e.withheld?.();
  return po(y.result);
}
//@ chunk-vr8smdd9.js:35986-36129 placement
function logNativeSettled(e, r, n) {
  (e.leave(),
    logForDebugging(
      `hooks module ${e.label} ${r} settled in ${(performance.now() - n).toFixed(1)}ms (native link, next() included)`,
    ));
}
//@ chunk-vr8smdd9.js:36129-36289 placement
function isNativeLinkable({ loaded: loaded, event: event, origin: origin }, s) {
  let a = liveModulesForDispatch([loaded], event).length === 1 && moduleMatcherAdmits(loaded, event, s);
  if (a && origin)
    logForDebugging(`hooks module ${loaded.label} (native): ${event} nested in ` + EYr(origin));
  return a;
}
/**
 * 对原生（进程内）模块建立 hook 链接，非原生模块报错。
 */
//@ chunk-vr8smdd9.js:36289-36808 placement
function linkNativeHook(e) {
  let { loaded: loaded, event: event, origin: origin } = e;
  if (loaded.link === void 0)
    throw new HooksError(`${loaded.name}: ${event}: not a native module; it runs in a hop`);
  let link = loaded.link({
      event: event,
      leftOut: loaded.leftOut,
      hookOrigin: origin,
      gestureAt: e.gestureAt,
    }),
    f = link.catch;
  async function m(h) {
    let startTime = performance.now();
    loaded.enter();
    try {
      return await h();
    } finally {
      logNativeSettled(loaded, event, startTime);
    }
  }
  async function c(h, x) {
    loaded.enter();
    try {
      return await f?.(h, x);
    } finally {
      loaded.leave();
    }
  }
  let g = (h, x, w) =>
    isNativeLinkable({ loaded: loaded, event: event, origin: origin }, h) ? m(() => link.run(h, x, w)) : x(h);
  return Yt({ ...link, run: g, ...(f !== void 0 && { catch: c }) });
}
/**
 * 分发流式 hook（open），逐个插件包裹。
 */
//@ chunk-vr8smdd9.js:36808-37341 placement
function dispatchHookOpen(e) {
  let { event: event, e: n, open: open, signal: signal, floors: floors } = e,
    m = ye(e.members, event, n),
    c = m[0]?.hopKey;
  if (!c) return open(n, void 0, floors);
  let g = (w, y, S) => {
      let b = extendChainForFloors(floors, m, S, event, n);
      if (b === void 0) throw invalidFloorsError(m);
      return forwardGeneratorWithErrorHook(open(w, y, b));
    },
    startTime = performance.now();
  for (let w of m) w.enter();
  let dispatchStream = c.dispatchStream(buildHookChain({ ...e, members: m, kind: " stream" }), g, signal);
  return (async function* () {
    try {
      let w = yield* forwardGeneratorWithErrorHook(dispatchStream);
      return po(w);
    } finally {
      for (let w of m) w.leave();
      logForDebugging(
        `hooks module ${dkt(m)} ${event} stream settled in ${(performance.now() - startTime).toFixed(1)}ms (${c.kind} hop, next() included)`,
      );
    }
  })();
}
/**
 * 对原生模块建立流式 hook 链接。
 */
//@ chunk-vr8smdd9.js:37341-37836 placement
function linkNativeStreamHook(e) {
  let { loaded: loaded, event: event, origin: origin } = e;
  if (loaded.streamLinks === void 0)
    throw new HooksError(`${loaded.name}: ${event}: not a native module; it runs in a hop`);
  function a(f) {
    let startTime = performance.now();
    return (
      loaded.enter(),
      (async function* () {
        try {
          return yield* f;
        } finally {
          logNativeSettled(loaded, event, startTime);
        }
      })()
    );
  }
  return loaded.streamLinks({ event: event, leftOut: loaded.leftOut, hookOrigin: origin }).map((f) => {
    let m = f.catch;
    return {
      ...f,
      run: async (c, g, h) =>
        isNativeLinkable({ loaded: loaded, event: event, origin: origin }, c)
          ? a(await f.run(c, g, h))
          : g(c),
      ...(m !== void 0 && { catch: async (c, g, h) => a(await m(c, g, h)) }),
    };
  });
}
//@ chunk-vr8smdd9.js:37836-37968 placement
var hopMembers = (e, r, n) =>
  e.map((s) => {
    let a = r.get(s);
    if (a === void 0) throw new HooksError(`${n}: a hop member is not one of these handlers`);
    return a;
  });
/**
 * 把已加载模块包装成分发链成员（名称、层级、run）。
 */
//@ chunk-vr8smdd9.js:37968-38503 placement
var toHookMember = ({
  loaded: loaded,
  event: event,
  origin: origin,
  raise: raise,
  gestureAt: gestureAt,
  owners: owners,
  withheld: withheld,
}) => ({
  name: loaded.name,
  tier: loaded.tier,
  ...(eos(loaded.args.modulePath) && { answersForEngine: !0 }),
  ...(withheld && { withheld: withheld }),
  run: (c, g, { call: h, floors: floors, cutAt: cutAt }) =>
    dispatchHookCall({
      members: [loaded],
      event: event,
      e: c,
      call: h,
      signal: g.signal,
      hookOrigin: origin,
      raise: raise,
      gestureAt: gestureAt,
      withheld: withheld,
      origin: g.origin,
      floors: floors,
      cutAt: cutAt,
    }),
  hop: {
    key: loaded.hopKey,
    run: (c) =>
      dispatchHookCall({
        members: hopMembers(c.members, owners, event),
        event: event,
        e: c.e,
        call: c.call,
        signal: c.signal,
        hookOrigin: origin,
        raise: raise,
        gestureAt: gestureAt,
        withheld: withheld,
        origin: c.origin,
        floors: c.floors,
        cutAt: c.cutAt,
      }),
  },
});
//@ chunk-vr8smdd9.js:38503-38560 placement
function uo(e) {
  return e.loaded.link !== void 0 ? linkNativeHook(e) : toHookMember(e);
}
//@ chunk-vr8smdd9.js:38560-38670 placement
function pluginTierOf(e) {
  let { loadedModules: loadedModules, moduleSeats: moduleSeats } = getPluginRegistry();
  return loadedModules.find((s) => s.name === e)?.tier ?? moduleSeats.get(e) ?? "user";
}
/**
 * 插件层级是否属于策略层。
 */
//@ chunk-vr8smdd9.js:38670-38708 placement
var isPolicyTier = (e) => pushToKillRing.some((r) => r === pluginTierOf(e));
/**
 * 判断模块对某事件的 matcher 是否接受该载荷（无 matcher 为真；matcher 抛错时交由 hop 决定）。
 */
//@ chunk-vr8smdd9.js:38708-38937 placement
function matcherAdmits(e, r, n) {
  let matcherFor = e.matcherFor(r);
  if (matcherFor === void 0) return !0;
  try {
    if (gxt(matcherFor, n, lookupPathTable(r))) return !0;
  } catch (error) {
    return (
      logForDebugging(
        `hooks module ${e.label}: on('${r}') matcher threw on the host (${errorMessage(error)}); the hop decides`,
      ),
      !0
    );
  }
  return (warnMatcherMiss(e, r, n), !1);
}
//@ chunk-vr8smdd9.js:38937-39230 placement
function pinnedKeysRejected(e, r, { keys: keys, e: s }) {
  let matcherFor = e.matcherFor(r);
  if (matcherFor === void 0 || !isPlainDataObject(s)) return !1;
  try {
    let m = lookupPathTable(r),
      any = keys.some((g) => Object.hasOwn(s, g) && !opr(matcherFor, { [g]: s[g] }, m));
    if (any) warnMatcherMiss(e, r, s);
    return any;
  } catch (error) {
    return (
      logForDebugging(
        `hooks module ${e.label}: on('${r}') matcher threw on the host (${errorMessage(error)}); the hop decides`,
      ),
      !1
    );
  }
}
/**
 * 列出监听某事件且策略允许的已加载模块（可限定插件、范围、固定项）。
 */
//@ chunk-vr8smdd9.js:39230-39532 placement
function modulesHookingEvent(e, r, { only: n, e: s, among: a, pinned: f } = {}) {
  let flattened = (a ?? getPluginRegistry().loadedModules).flatMap((g) => {
    if (!(g.hooks(e) && g.name === (n ?? g.name) && isModuleAdmitted(g))) return [];
    let x = scopeModuleForEvent(g, e, r);
    return x === void 0 || (f !== void 0 && pinnedKeysRejected(x, e, f)) ? [] : [x];
  });
  if (s === void 0) return flattened;
  let index = flattened.findIndex((g) => matcherAdmits(g, e, s));
  return index === -1 ? [] : flattened.slice(index);
}
/**
 * hooks worker 不可用时生成拒绝错误。
 */
//@ chunk-vr8smdd9.js:39532-39875 placement
function refuseIfWorkerMissing({ event: event, e: r, origin: origin, only: only }) {
  let mapped = he(modulesHookingEvent(event, origin, { only: only }), event, r)
    .filter(
      (m) => m.link === void 0 && m.hopKey.isDeclared?.(m.name) !== !1 && moduleCatchesEvent(m, event, r),
    )
    .map((m) => m.name);
  return mapped.length === 0
    ? void 0
    : new HooksError(
        `${event} refused: the hooks worker is being replaced, and a hook on it with a .catch (${mapped.join(", ")}) cannot be asked until the reload is in`,
      );
}
//@ chunk-vr8smdd9.js:39924-39939 placement
var K_n = new AsyncLocalStorage();
//@ chunk-vr8smdd9.js:39939-40029 placement
function TYr(e, r) {
  let n = { isOver: !1 },
    run = e.run(n, r),
    a = () => {
      n.isOver = !0;
    };
  return (run.then(a, a), run);
}
//@ chunk-vr8smdd9.js:40029-40053 placement
var HFi = (e) => TYr(K_n, e);
//@ chunk-vr8smdd9.js:40053-40093 placement
var X4o = () => K_n.getStore()?.isOver === !1;
/**
 * 若有 hooks worker 正在重启，等待其全部就绪（可被中止）后再检查一次；重启进行中而 worker 缺失则拒绝。
 */
//@ chunk-vr8smdd9.js:40093-40371 placement
function waitForHooksRespawn(e, r) {
  let n = [...getPluginRegistry().hooksRespawns],
    s = n.length > 0 && X4o(),
    a = s ? refuseIfWorkerMissing(e) : void 0;
  if (a !== void 0) return (logForDebugging(a.message, { level: "error" }), Promise.reject(a));
  if (n.length === 0 || s) return;
  let f = Promise.all(n).then(() => {
    return;
  });
  return (r !== void 0 ? raceWithAbortSignal(f, r, () => Teo(r)) : f).then(() => waitForHooksRespawn(e, r));
}
/**
 * 有 worker 正在重启且模块监听该事件时等待其就绪。
 */
//@ chunk-vr8smdd9.js:40371-40508 placement
function awaitHooksRespawn(e, r) {
  let n = getPluginRegistry();
  return n.hooksRespawns.size > 0 &&
    n.loadedModules.some((loadedModule) => loadedModule.link === void 0 && loadedModule.hooks(e.event))
    ? waitForHooksRespawn(e, r)
    : void 0;
}
/**
 * 同上，但 SessionEnd 不等待；中止时改抛中止错误。
 */
//@ chunk-vr8smdd9.js:40508-40660 placement
function awaitHooksRespawnUnlessSessionEnd(e, r) {
  let s = e.event === "classic.SessionEnd" ? void 0 : awaitHooksRespawn(e, r);
  return s !== void 0 && r !== void 0 ? s.catch((f) => Promise.reject(r.aborted ? abortErrorFor(r) : f)) : s;
}
/**
 * 为事件生成分发链成员列表。
 */
//@ chunk-vr8smdd9.js:40660-40874 placement
function hookMembersFor(e, r, n = {}) {
  let s = [],
    a = new Map();
  for (let f of modulesHookingEvent(e, r, n)) {
    let m = uo({
      loaded: f,
      event: e,
      origin: r,
      raise: n.raise,
      gestureAt: n.gestureAt,
      owners: a,
      withheld: n.withheld,
    });
    (a.set(m, f), s.push(m), n.drawn?.(m, f));
  }
  return s;
}
/**
 * 列出匹配某事件和匹配器的插件名。
 */
//@ chunk-vr8smdd9.js:40874-41060 placement
function pluginsMatchingEvent(e, r, n) {
  let s = lookupPathTable(e);
  return getPluginRegistry()
    .loadedModules.filter((loadedModule) => {
      let f =
        loadedModule.hooks(e) && isModuleAdmitted(loadedModule)
          ? scopeModuleForEvent(loadedModule, e, n)
          : void 0;
      if (f === void 0) return !1;
      return opr(f.matcherFor(e), r, s);
    })
    .map((a) => a.name);
}
//@ chunk-vr8smdd9.js:41060-41074 placement
var po = (e) => e;
//@ chunk-vr8smdd9.js:41074-41088 placement
var Yt = (e) => e;
//@ chunk-vr8smdd9.js:41088-41107 placement
var ko = (e) => [...e];
/**
 * 从调用者栈取 hook 来源插件与层级。
 */
//@ chunk-vr8smdd9.js:41107-41235 placement
function hookOriginFromStack(e) {
  let r = e?.map(originPlugin).findLast((n) => n !== void 0);
  if (r === void 0) return freeze_6;
  return Object.freeze({ plugin: r, tier: pluginTierOf(r) });
}
/**
 * 登记一次 hooks 重生：返回重生 Promise 与加载完成时的回调。
 */
//@ chunk-vr8smdd9.js:41235-41357 placement
function registerRespawn(e) {
  let { promise: promise, resolve: resolve } = Promise.withResolvers();
  return (
    e.add(promise),
    {
      respawn: promise,
      loaded: () => {
        (e.delete(promise), resolve());
      },
    }
  );
}
/**
 * 把已加载模块包装成流式分发成员。
 */
//@ chunk-vr8smdd9.js:41357-41766 placement
var toStreamHookMember = (e, r) => ({
  name: e.loaded.name,
  tier: e.loaded.tier,
  run: (n, s, { open: open, floors: floors }) =>
    dispatchHookOpen({
      members: [e.loaded],
      event: e.event,
      e: n,
      open: open,
      signal: s.signal,
      hookOrigin: e.origin,
      raise: e.raise,
      origin: s.origin,
      floors: floors,
    }),
  hop: {
    key: e.loaded.hopKey,
    run: ({ members: members, e: s, open: open, signal: signal, origin: origin, floors: floors }) =>
      dispatchHookOpen({
        members: hopMembers(members, r, e.event),
        event: e.event,
        e: s,
        open: open,
        signal: signal,
        hookOrigin: e.origin,
        raise: e.raise,
        origin: origin,
        floors: floors,
      }),
  },
});
/**
 * 列出监听某流式事件的模块并转为流式链成员（原生模块直接链接）。
 */
//@ chunk-vr8smdd9.js:41766-41999 placement
function streamMembersFor(e, r, n = {}) {
  let s = new Map();
  return modulesHookingEvent(e, r, n).flatMap((a) => {
    if (a.streamLinks !== void 0) return ko(linkNativeStreamHook({ loaded: a, event: e, origin: r }));
    let f = toStreamHookMember({ loaded: a, event: e, origin: r, raise: n.raise, gestureAt: void 0 }, s);
    return (s.set(f, a), [f]);
  });
}
//@ chunk-vr8smdd9.js:41999-42009 placement
var NFi = 3;
//@ chunk-vr8smdd9.js:42009-42088 placement
var Qni = (e) => `${e}: the op was aborted: the plugin's environment was unloaded`;

export {
  hookMembersFor,
  pluginsMatchingEvent,
  isPolicyTier,
  hookOriginFromStack,
  awaitHooksRespawnUnlessSessionEnd,
  hookPluginLabel,
  waitForHooksRespawn,
  awaitHooksRespawn,
  modulesHookingEvent,
  streamMembersFor,
  dispatchHookCall,
  Yni,
  TYr,
  Qni,
  qni,
  NFi,
  registerRespawn,
  X4o,
  K_n,
  HFi,
  matcherAdmits,
};
