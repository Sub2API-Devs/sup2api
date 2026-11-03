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
  joinLabels,
  labeledOriginChain,
  lentModulesByChain,
  splitCallerChain,
  registrationsOfPlugin,
  moduleCatchesEvent,
  deadModulesFor,
  liveModulesForDispatch,
  reportPluginProblem,
  dispatchModules,
  moduleMatcherAdmits,
  warnMatcherMiss,
  modulesFromMatcher,
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
import { isNextToUserTarget, hasRegisteredEnv } from "./vm/moduleLoader.js";
import { appendNextToStep, abortErrorFor, N5e } from "./dispatch/chain.js";
import { forwardGeneratorWithErrorHook } from "./dispatch/streamChain.js";
import { pushToKillRing } from "../../utils/Cursor.js";
import {
  matchesRegExpMatcher,
  isPlainDataObject,
  matchesFields,
} from "../../utils/hooks/functionHookMatchers.js";
import { lookupPathTable } from "../../utils/pathTable.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { asHooksError } from "./api/operations.js";

//@ chunk-vr8smdd9.js:30936-30996 placement
/**
 * 生成插件的 hooks 标签（名称 + 存储 id）。
 */
var hookPluginLabel = (e) =>
  pluginStorageKey({
    pluginName: e.name,
    pluginStorageId: marketplaceSource(e),
  });
//@ chunk-vr8smdd9.js:30996-31055 placement
/**
 * 某插件在 N 毫秒内未回答
 */
var hookTimeoutText = (e, r, n) => `${e}: ${r} did not answer within ${n}ms`;
//@ chunk-vr8smdd9.js:31055-31120 placement
/**
 * 插件已卸载
 */
var PLUGIN_UNLOADED_TEXT = "the plugin is unloaded; /reload-plugins brings it back";
//@ chunk-vr8smdd9.js:31120-31646 placement
/**
 * 为一次事件分发组装参与插件链（嵌套检查、排除项、层级、截止）。
 */
function buildHookChain({ members, event, e: n, hookOrigin, origin, raise, floors, cutAt, gestureAt, kind }) {
  let [x] = members;
  if (hookOrigin)
    logForDebugging(
      `hooks module ${joinLabels(members)}: ${event}${kind} nested in ${labeledOriginChain(hookOrigin)}`,
    );
  let flattened = members.flatMap((member) => {
    let S = [...(member.leftOut ?? [])];
    let { environmentId } = member;
    return S.length > 0
      ? [
          {
            environmentId,
            registrations: S,
          },
        ]
      : [];
  });
  return {
    id: x ? x.hopKey.nextDispatchId() : 0,
    event,
    payload: n,
    environments: members.map((member) => member.environmentId),
    leftOut: flattened.length === 0 ? undefined : flattened,
    origin,
    hookOrigin,
    raise,
    floors: floors.length === 0 ? undefined : floors,
    cutAt,
    ...(gestureAt !== undefined && {
      gestureAt,
    }),
  };
}
//@ chunk-vr8smdd9.js:31646-32524 placement
/**
 * 按调用者链与借出状态筛出某模块对事件的有效视图。
 */
function scopeModuleForEvent(e, r, n) {
  if (!n || n.length === 0) return e;
  let s = lentModulesByChain().get(n) ?? [];
  let now = Date.now();
  let f = (S) => s[S]?.isLent !== true || s[S].isHeld === true;
  let { caller, above } = splitCallerChain(
    n.filter((S, b) => f(b) || now < (s[b]?.until ?? 0)),
    e.name,
  );
  let g = (S, b) => S === "every" || S.includes(b);
  let h = registrationsOfPlugin(
    n.slice(0, -1).filter((S, b) => f(b)),
    e.name,
  );
  let filtered = e.registrationsFor(r).filter((S) => g(caller, S) || g(h, S));
  if (filtered.length === 0) return e;
  let y = `origin ${labeledOriginChain(n)}`;
  if (!e.hooks(r, filtered)) {
    let S = caller === "every" || above === "every";
    logForDebugging(
      `hooks module ${e.label} ${r} skipped: re-entry (` +
        (S ? `the plugin's own code raised it; ${y})` : `its own frame is being dispatched; ${y})`),
    );
    return;
  }
  logForDebugging(`hooks module ${e.label} ${r}: hooks ${filtered.join(", ")} left out for re-entry (${y})`);
  return {
    ...e,
    leftOut: filtered,
    hooks: (S, b = []) => e.hooks(S, [...filtered, ...b]),
    catches: (S, b = [], M) => e.catches(S, [...filtered, ...b], M),
    matcherFor: (S, b = []) => e.matcherFor(S, [...filtered, ...b]),
    standingFor: (S, b = []) => e.standingFor(S, [...filtered, ...b]),
  };
}
//@ chunk-vr8smdd9.js:32524-33087 placement
/**
 * hooks worker 死亡时等待替换的 worker 后再分发。
 */
async function awaitWorkerReplacement({ members, event, hookOrigin, signal }) {
  let a = members.find((member) => member.status().kind === "dead")?.hopKey.replaced?.();
  if (a === undefined) return members;
  logForDebugging(
    `hooks module ${members.map((member) => member.label).join(", ")}: ${event} waits for the hooks worker's replacement`,
  );
  await new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(), {
      once: true,
    });
    a.then(resolve, resolve);
  });
  return members.flatMap((member) => {
    let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === member.name);
    if (!(
      member.status().kind !== "live" &&
      found !== undefined &&
      found.environmentId !== member.environmentId
    ))
      return [member];
    let g =
      found.hooks(event) && isModuleAdmitted(found)
        ? scopeModuleForEvent(found, event, hookOrigin)
        : undefined;
    return g === undefined ? [] : [g];
  });
}
//@ chunk-vr8smdd9.js:33087-34400 placement
/**
 * worker 在分发中途死亡时，用替换 worker 重试剩余插件。
 */
async function retryAfterWorkerDeath({ hop, dispatchId, members, error, called, beneath }) {
  let { event, e: c, signal } = hop;
  let h = (b) => b.filter((M) => moduleCatchesEvent(M, event, c));
  let x = errorMessage(error);
  let w = deadModulesFor(h(members), x);
  let hopKey = w[0]?.hopKey;
  let kept = hopKey?.kept;
  while (w.length > 0 && !signal.aborted) {
    let b = h(
      liveModulesForDispatch(
        await awaitWorkerReplacement({
          ...hop,
          members: w,
        }),
        event,
      ),
    );
    let hopKey_2 = b[0]?.hopKey;
    let found = b.find((O) => O.name === kept?.plugin);
    if (hopKey_2 === undefined || signal.aborted) break;
    logForDebugging(
      `hooks module ${joinLabels(b)}: .catch asked in the replacement after the hooks worker ended during ${event}`,
    );
    for (let O of b) O.enter();
    try {
      let O = await hopKey_2.dispatch(
        {
          ...buildHookChain({
            ...hop,
            members: b,
            kind: "",
          }),
          ended: {
            reason: x,
            called: called(),
            ...(found !== undefined && {
              kept: found.environmentId,
            }),
          },
        },
        beneath,
        signal,
      );
      let F =
        found !== undefined &&
        kept !== undefined &&
        hopKey?.isKeptVerdict?.(dispatchId, O.unmatched !== true) === true;
      for (let v of b)
        if (O.answered?.includes(v.environmentId) === true)
          reportPluginProblem(
            v.name,
            `the hooks worker was replaced during ${event}; ${v.name}'s .catch answered in place of its hook`,
          );
      if (F) hopKey_2.unloadCrashed?.(found.environmentId, kept);
      return O;
    } catch (error) {
      x = errorMessage(error);
      w = deadModulesFor(b, x);
      logForDebugging(
        `hooks module ${joinLabels(b)}: .catch not heard after the hooks worker ended during ${event}: ${x}` +
          (w.length > 0 ? "; asked again of whoever stands" : ""),
        {
          level: "error",
        },
      );
    } finally {
      for (let O of b) O.leave();
    }
  }
  if (w.length > 0)
    logForDebugging(
      `hooks module ${joinLabels(w)}: no .catch is asked after the hooks worker ended during ${event}: ` +
        (signal.aborted ? "its caller is gone" : "no replacement that may be waited for holds its hook"),
      {
        level: "error",
      },
    );
  return;
}
//@ chunk-vr8smdd9.js:34400-34576 placement
function invalidFloorsError(e) {
  let r = new HooksError(
    `${joinLabels(e)}: next refused: the floors handed back are not ones a next.to of these plugins leaves (host rule)`,
  );
  logForDebugging(r.message, {
    level: "error",
  });
  return r;
}
//@ chunk-vr8smdd9.js:34618-35011 placement
/**
 * 按插件声明的 nextTo 扩展分发链。
 */
function extendChainWithNextTo(e, r, n, s, raised) {
  return r.some((m) => isDeepStrictEqual(m, n))
    ? r
    : e
        .slice(
          Math.max(
            e.findIndex((m) => m.name === r.at(-1)?.plugin),
            0,
          ),
        )
        .filter((m) => findBypassingFloor(r, m.tier, m.name) === undefined)
        .flatMap((m) =>
          (m.args.scan.nextTo ?? [])
            .filter(
              (c) =>
                c !== "user" ||
                (isPlainObject(n) &&
                  n.isPastPeers === true &&
                  isNextToUserTarget({
                    clauses: m.standingFor(s),
                    scan: m.args.scan,
                    event: s,
                    raised,
                  })),
            )
            .map((to) =>
              appendNextToStep(r, {
                from: m.tier,
                to,
                plugin: m.name,
              }),
            ),
        )
        .find((m) => isDeepStrictEqual(m.at(-1), n));
}
//@ chunk-vr8smdd9.js:35011-35131 placement
function extendChainForFloors(floors, r, n, event, raised) {
  if (!Array.isArray(n)) return;
  let f = floors;
  for (let m of n) {
    f = extendChainWithNextTo(r, f, m, event, raised);
    if (f === undefined) return;
  }
  return f;
}
//@ chunk-vr8smdd9.js:35131-35986 placement
/**
 * 跨 worker 分发一次 hook 调用（层级 floors、跳转、错误处理）。
 */
async function dispatchHookCall(e) {
  let { event, e: n, call: s, signal, floors } = e;
  let m = dispatchModules(e.members, event, n);
  let hopKey = m[0]?.hopKey;
  if (!hopKey) return s(n, undefined, floors);
  let g;
  let h = (M, T, O) => {
    let F = extendChainForFloors(floors, m, O, event, n);
    if (F === undefined) return Promise.reject(invalidFloorsError(m));
    g = s(M, T, F);
    return g;
  };
  let hookChain = buildHookChain({
    ...e,
    members: m,
    kind: "",
  });
  let startTime = performance.now();
  for (let M of m) M.enter();
  let y;
  try {
    y = await hopKey.dispatch(
      {
        ...hookChain,
        caughtBy: m.filter((M) => moduleCatchesEvent(M, event, n)).map((M) => M.environmentId),
      },
      h,
      signal,
    );
  } catch (error) {
    let T = await retryAfterWorkerDeath({
      hop: e,
      dispatchId: hookChain.id,
      members: m,
      error,
      called: () => g !== undefined,
      beneath: (O, F, v) => g ?? h(O, F, v),
    });
    if (T === undefined) throw error;
    y = T;
  } finally {
    for (let M of m) M.leave();
  }
  let b =
    typeof n === "object" && "requestId" in n && typeof n.requestId === "string" ? ` key=${n.requestId}` : "";
  logForDebugging(
    `hooks module ${joinLabels(m)} ${event} settled in ${(performance.now() - startTime).toFixed(1)}ms (${hopKey.kind} hop, next() included)${b}`,
  );
  if (y.withheld === true) e.withheld?.();
  return identityPo(y.result);
}
//@ chunk-vr8smdd9.js:35986-36129 placement
function logNativeSettled(loaded, event, n) {
  loaded.leave();
  logForDebugging(
    `hooks module ${loaded.label} ${event} settled in ${(performance.now() - n).toFixed(1)}ms (native link, next() included)`,
  );
}
//@ chunk-vr8smdd9.js:36129-36289 placement
function isNativeLinkable({ loaded, event, origin }, s) {
  let a = liveModulesForDispatch([loaded], event).length === 1 && moduleMatcherAdmits(loaded, event, s);
  if (a && origin)
    logForDebugging(
      `hooks module ${loaded.label} (native): ${event} nested in ` + labeledOriginChain(origin),
    );
  return a;
}
//@ chunk-vr8smdd9.js:36289-36808 placement
/**
 * 对原生（进程内）模块建立 hook 链接，非原生模块报错。
 */
function linkNativeHook(e) {
  let { loaded, event, origin } = e;
  if (loaded.link === undefined)
    throw new HooksError(`${loaded.name}: ${event}: not a native module; it runs in a hop`);
  let a = loaded.link({
    event,
    leftOut: loaded.leftOut,
    hookOrigin: origin,
    gestureAt: e.gestureAt,
  });
  let f = a.catch;
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
  let run = (h, x, w) =>
    isNativeLinkable(
      {
        loaded,
        event,
        origin,
      },
      h,
    )
      ? m(() => a.run(h, x, w))
      : x(h);
  return identityYt({
    ...a,
    run,
    ...(f !== undefined && {
      catch: c,
    }),
  });
}
//@ chunk-vr8smdd9.js:36808-37341 placement
/**
 * 分发流式 hook（open），逐个插件包裹。
 */
function dispatchHookOpen(e) {
  let { event, e: n, open, signal, floors } = e;
  let m = dispatchModules(e.members, event, n);
  let hopKey = m[0]?.hopKey;
  if (!hopKey) return open(n, undefined, floors);
  let g = (w, y, S) => {
    let b = extendChainForFloors(floors, m, S, event, n);
    if (b === undefined) throw invalidFloorsError(m);
    return forwardGeneratorWithErrorHook(open(w, y, b));
  };
  let startTime = performance.now();
  for (let w of m) w.enter();
  let x = hopKey.dispatchStream(
    buildHookChain({
      ...e,
      members: m,
      kind: " stream",
    }),
    g,
    signal,
  );
  return (async function* () {
    try {
      let w = yield* forwardGeneratorWithErrorHook(x);
      return identityPo(w);
    } finally {
      for (let w of m) w.leave();
      logForDebugging(
        `hooks module ${joinLabels(m)} ${event} stream settled in ${(performance.now() - startTime).toFixed(1)}ms (${hopKey.kind} hop, next() included)`,
      );
    }
  })();
}
//@ chunk-vr8smdd9.js:37341-37836 placement
/**
 * 对原生模块建立流式 hook 链接。
 */
function linkNativeStreamHook(e) {
  let { loaded, event, origin } = e;
  if (loaded.streamLinks === undefined)
    throw new HooksError(`${loaded.name}: ${event}: not a native module; it runs in a hop`);
  function a(f) {
    let startTime = performance.now();
    loaded.enter();
    return (async function* () {
      try {
        return yield* f;
      } finally {
        logNativeSettled(loaded, event, startTime);
      }
    })();
  }
  return loaded
    .streamLinks({
      event,
      leftOut: loaded.leftOut,
      hookOrigin: origin,
    })
    .map((f) => {
      let m = f.catch;
      return {
        ...f,
        run: async (c, g, h) =>
          isNativeLinkable(
            {
              loaded,
              event,
              origin,
            },
            c,
          )
            ? a(await f.run(c, g, h))
            : g(c),
        ...(m !== undefined && {
          catch: async (c, g, h) => a(await m(c, g, h)),
        }),
      };
    });
}
//@ chunk-vr8smdd9.js:37836-37968 placement
var hopMembers = (members, r, event) =>
  members.map((s) => {
    let a = r.get(s);
    if (a === undefined) throw new HooksError(`${event}: a hop member is not one of these handlers`);
    return a;
  });
//@ chunk-vr8smdd9.js:37968-38503 placement
/**
 * 把已加载模块包装成分发链成员（名称、层级、run）。
 */
var toHookMember = ({ loaded, event, origin, raise, gestureAt, owners, withheld }) => ({
  name: loaded.name,
  tier: loaded.tier,
  ...(hasRegisteredEnv(loaded.args.modulePath) && {
    answersForEngine: true,
  }),
  ...(withheld && {
    withheld,
  }),
  run: (c, g, { call: h, floors, cutAt }) =>
    dispatchHookCall({
      members: [loaded],
      event,
      e: c,
      call: h,
      signal: g.signal,
      hookOrigin: origin,
      raise,
      gestureAt,
      withheld,
      origin: g.origin,
      floors,
      cutAt,
    }),
  hop: {
    key: loaded.hopKey,
    run: (c) =>
      dispatchHookCall({
        members: hopMembers(c.members, owners, event),
        event,
        e: c.e,
        call: c.call,
        signal: c.signal,
        hookOrigin: origin,
        raise,
        gestureAt,
        withheld,
        origin: c.origin,
        floors: c.floors,
        cutAt: c.cutAt,
      }),
  },
});
//@ chunk-vr8smdd9.js:38503-38560 placement
/**
 * 链接或包装成钩子成员
 */
function toHookMemberOrLink(e) {
  return e.loaded.link !== undefined ? linkNativeHook(e) : toHookMember(e);
}
//@ chunk-vr8smdd9.js:38560-38670 placement
function pluginTierOf(e) {
  let { loadedModules, moduleSeats } = getPluginRegistry();
  return loadedModules.find((loadedModule) => loadedModule.name === e)?.tier ?? moduleSeats.get(e) ?? "user";
}
//@ chunk-vr8smdd9.js:38670-38708 placement
/**
 * 插件层级是否属于策略层。
 */
var isPolicyTier = (e) => pushToKillRing.some((r) => r === pluginTierOf(e));
//@ chunk-vr8smdd9.js:38708-38937 placement
/**
 * 判断模块对某事件的 matcher 是否接受该载荷（无 matcher 为真；matcher 抛错时交由 hop 决定）。
 */
function matcherAdmits(e, r, n) {
  let s = e.matcherFor(r);
  if (s === undefined) return true;
  try {
    if (matchesRegExpMatcher(s, n, lookupPathTable(r))) return true;
  } catch (error) {
    logForDebugging(
      `hooks module ${e.label}: on('${r}') matcher threw on the host (${errorMessage(error)}); the hop decides`,
    );
    return true;
  }
  warnMatcherMiss(e, r, n);
  return false;
}
//@ chunk-vr8smdd9.js:38937-39230 placement
function pinnedKeysRejected(e, r, { keys, e: s }) {
  let a = e.matcherFor(r);
  if (a === undefined || !isPlainDataObject(s)) return false;
  try {
    let pathTable = lookupPathTable(r);
    let any = keys.some(
      (key) =>
        Object.hasOwn(s, key) &&
        !matchesFields(
          a,
          {
            [key]: s[key],
          },
          pathTable,
        ),
    );
    if (any) warnMatcherMiss(e, r, s);
    return any;
  } catch (error) {
    logForDebugging(
      `hooks module ${e.label}: on('${r}') matcher threw on the host (${errorMessage(error)}); the hop decides`,
    );
    return false;
  }
}
//@ chunk-vr8smdd9.js:39230-39532 placement
/**
 * 列出监听某事件且策略允许的已加载模块（可限定插件、范围、固定项）。
 */
function modulesHookingEvent(e, r, { only: n, e: s, among: a, pinned: f } = {}) {
  let flattened = (a ?? getPluginRegistry().loadedModules).flatMap((g) => {
    if (!(g.hooks(e) && g.name === (n ?? g.name) && isModuleAdmitted(g))) return [];
    let x = scopeModuleForEvent(g, e, r);
    return x === undefined || (f !== undefined && pinnedKeysRejected(x, e, f)) ? [] : [x];
  });
  if (s === undefined) return flattened;
  let index = flattened.findIndex((g) => matcherAdmits(g, e, s));
  return index === -1 ? [] : flattened.slice(index);
}
//@ chunk-vr8smdd9.js:39532-39875 placement
/**
 * hooks worker 不可用时生成拒绝错误。
 */
function refuseIfWorkerMissing({ event, e: r, origin, only }) {
  let mapped = modulesFromMatcher(
    modulesHookingEvent(event, origin, {
      only,
    }),
    event,
    r,
  )
    .filter(
      (m) =>
        m.link === undefined && m.hopKey.isDeclared?.(m.name) !== false && moduleCatchesEvent(m, event, r),
    )
    .map((m) => m.name);
  return mapped.length === 0
    ? undefined
    : new HooksError(
        `${event} refused: the hooks worker is being replaced, and a hook on it with a .catch (${mapped.join(", ")}) cannot be asked until the reload is in`,
      );
}
//@ chunk-vr8smdd9.js:39924-39939 placement
/**
 * 分发帧 ALS
 */
var dispatchFrameStorage = new AsyncLocalStorage();
//@ chunk-vr8smdd9.js:39939-40029 placement
/**
 * 分发帧执行
 */
function runDispatchFrame(e, r) {
  let n = {
    isOver: false,
  };
  let s = e.run(n, r);
  let a = () => {
    n.isOver = true;
  };
  s.then(a, a);
  return s;
}
//@ chunk-vr8smdd9.js:40029-40053 placement
/**
 * 在分发帧里执行
 */
var inDispatchFrame = (e) => runDispatchFrame(dispatchFrameStorage, e);
//@ chunk-vr8smdd9.js:40053-40093 placement
/**
 * 分发帧是否未结束
 */
var isDispatchFrameOpen = () => dispatchFrameStorage.getStore()?.isOver === false;
//@ chunk-vr8smdd9.js:40093-40371 placement
/**
 * 若有 hooks worker 正在重启，等待其全部就绪（可被中止）后再检查一次；重启进行中而 worker 缺失则拒绝。
 */
function waitForHooksRespawn(e, signal) {
  let n = [...getPluginRegistry().hooksRespawns];
  let s = n.length > 0 && isDispatchFrameOpen();
  let a = s ? refuseIfWorkerMissing(e) : undefined;
  if (a !== undefined) {
    logForDebugging(a.message, {
      level: "error",
    });
    return Promise.reject(a);
  }
  if (n.length === 0 || s) return;
  let f = Promise.all(n).then(() => {
    return;
  });
  return (signal !== undefined ? raceWithAbortSignal(f, signal, () => asHooksError(signal)) : f).then(() =>
    waitForHooksRespawn(e, signal),
  );
}
//@ chunk-vr8smdd9.js:40371-40508 placement
/**
 * 有 worker 正在重启且模块监听该事件时等待其就绪。
 */
function awaitHooksRespawn(e, signal) {
  let pluginRegistry = getPluginRegistry();
  return pluginRegistry.hooksRespawns.size > 0 &&
    pluginRegistry.loadedModules.some(
      (loadedModule) => loadedModule.link === undefined && loadedModule.hooks(e.event),
    )
    ? waitForHooksRespawn(e, signal)
    : undefined;
}
//@ chunk-vr8smdd9.js:40508-40660 placement
/**
 * 同上，但 SessionEnd 不等待；中止时改抛中止错误。
 */
function awaitHooksRespawnUnlessSessionEnd(e, signal) {
  let s = e.event === "classic.SessionEnd" ? undefined : awaitHooksRespawn(e, signal);
  return s !== undefined && signal !== undefined
    ? s.catch((error) => Promise.reject(signal.aborted ? abortErrorFor(signal) : error))
    : s;
}
//@ chunk-vr8smdd9.js:40660-40874 placement
/**
 * 为事件生成分发链成员列表。
 */
function hookMembersFor(e, r, n = {}) {
  let s = [];
  let a = new Map();
  for (let f of modulesHookingEvent(e, r, n)) {
    let hookMemberOrLink = toHookMemberOrLink({
      loaded: f,
      event: e,
      origin: r,
      raise: n.raise,
      gestureAt: n.gestureAt,
      owners: a,
      withheld: n.withheld,
    });
    a.set(hookMemberOrLink, f);
    s.push(hookMemberOrLink);
    n.drawn?.(hookMemberOrLink, f);
  }
  return s;
}
//@ chunk-vr8smdd9.js:40874-41060 placement
/**
 * 列出匹配某事件和匹配器的插件名。
 */
function pluginsMatchingEvent(e, r, n) {
  let pathTable = lookupPathTable(e);
  return getPluginRegistry()
    .loadedModules.filter((loadedModule) => {
      let f =
        loadedModule.hooks(e) && isModuleAdmitted(loadedModule)
          ? scopeModuleForEvent(loadedModule, e, n)
          : undefined;
      if (f === undefined) return false;
      return matchesFields(f.matcherFor(e), r, pathTable);
    })
    .map((loadedModule) => loadedModule.name);
}
//@ chunk-vr8smdd9.js:41060-41074 placement
/**
 * 原样返回
 */
var identityPo = (e) => e;
//@ chunk-vr8smdd9.js:41074-41088 placement
/**
 * 原样返回
 */
var identityYt = (e) => e;
//@ chunk-vr8smdd9.js:41088-41107 placement
/**
 * 拷贝成数组
 */
var toArray = (e) => [...e];
//@ chunk-vr8smdd9.js:41107-41235 placement
/**
 * 从调用者栈取 hook 来源插件与层级。
 */
function hookOriginFromStack(e) {
  let last = e?.map(originPlugin).findLast((n) => n !== undefined);
  if (last === undefined) return N5e;
  return Object.freeze({
    plugin: last,
    tier: pluginTierOf(last),
  });
}
//@ chunk-vr8smdd9.js:41235-41357 placement
/**
 * 登记一次 hooks 重生：返回重生 Promise 与加载完成时的回调。
 */
function registerRespawn(hooksRespawns) {
  let { promise, resolve } = Promise.withResolvers();
  hooksRespawns.add(promise);
  return {
    respawn: promise,
    loaded: () => {
      hooksRespawns.delete(promise);
      resolve();
    },
  };
}
//@ chunk-vr8smdd9.js:41357-41766 placement
/**
 * 把已加载模块包装成流式分发成员。
 */
var toStreamHookMember = (e, r) => ({
  name: e.loaded.name,
  tier: e.loaded.tier,
  run: (n, s, { open, floors }) =>
    dispatchHookOpen({
      members: [e.loaded],
      event: e.event,
      e: n,
      open,
      signal: s.signal,
      hookOrigin: e.origin,
      raise: e.raise,
      origin: s.origin,
      floors,
    }),
  hop: {
    key: e.loaded.hopKey,
    run: ({ members, e: s, open, signal, origin, floors }) =>
      dispatchHookOpen({
        members: hopMembers(members, r, e.event),
        event: e.event,
        e: s,
        open,
        signal,
        hookOrigin: e.origin,
        raise: e.raise,
        origin,
        floors,
      }),
  },
});
//@ chunk-vr8smdd9.js:41766-41999 placement
/**
 * 列出监听某流式事件的模块并转为流式链成员（原生模块直接链接）。
 */
function streamMembersFor(event, origin, n = {}) {
  let s = new Map();
  return modulesHookingEvent(event, origin, n).flatMap((a) => {
    if (a.streamLinks !== undefined)
      return toArray(
        linkNativeStreamHook({
          loaded: a,
          event,
          origin,
        }),
      );
    let streamHookMember = toStreamHookMember(
      {
        loaded: a,
        event,
        origin,
        raise: n.raise,
        gestureAt: undefined,
      },
      s,
    );
    s.set(streamHookMember, a);
    return [streamHookMember];
  });
}
//@ chunk-vr8smdd9.js:41999-42009 placement
/**
 * 无法归因到具体插件的崩溃累计 3 次后不再重启 hooks worker，改为整体报错。
 */
var MAX_UNATTRIBUTED_CRASHES = 3;
//@ chunk-vr8smdd9.js:42009-42088 placement
/**
 * 环境卸载导致中止
 */
var envUnloadedAbortText = (e) => `${e}: the op was aborted: the plugin's environment was unloaded`;
export {
  hookMembersFor,
  pluginsMatchingEvent,
  isPolicyTier,
  hookOriginFromStack,
  awaitHooksRespawnUnlessSessionEnd,
  modulesHookingEvent,
  hookPluginLabel,
  waitForHooksRespawn,
  awaitHooksRespawn,
  streamMembersFor,
  dispatchHookCall,
  PLUGIN_UNLOADED_TEXT,
  runDispatchFrame,
  envUnloadedAbortText,
  hookTimeoutText,
  MAX_UNATTRIBUTED_CRASHES,
  registerRespawn,
  isDispatchFrameOpen,
  dispatchFrameStorage,
  inDispatchFrame,
  matcherAdmits,
};
