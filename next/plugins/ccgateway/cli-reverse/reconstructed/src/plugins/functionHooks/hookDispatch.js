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
import { appendNextToStep, abortErrorFor, ENGINE_ORIGIN } from "./dispatch/chain.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vr8smdd9.js:30936-30996 placement
/**
 * 生成插件的 hooks 标签（名称 + 存储 id）。
 */
var hookPluginLabel = (loadedModule) =>
  pluginStorageKey({
    pluginName: loadedModule.name,
    pluginStorageId: marketplaceSource(loadedModule),
  });
//@ chunk-vr8smdd9.js:30996-31055 placement
/**
 * 某插件在 N 毫秒内未回答
 */
var hookTimeoutText = (event, plugin, ms) => `${event}: ${plugin} did not answer within ${ms}ms`;
//@ chunk-vr8smdd9.js:31055-31120 placement
/**
 * 插件已卸载
 */
var PLUGIN_UNLOADED_TEXT = "the plugin is unloaded; /reload-plugins brings it back";
//@ chunk-vr8smdd9.js:31120-31646 placement
/**
 * 为一次事件分发组装参与插件链（嵌套检查、排除项、层级、截止）。
 */
function buildHookChain({ members, event, e, hookOrigin, origin, raise, floors, cutAt, gestureAt, kind }) {
  let [secondKind] = members;
  if (hookOrigin)
    logForDebugging(
      `hooks module ${joinLabels(members)}: ${event}${kind} nested in ${labeledOriginChain(hookOrigin)}`,
    );
  let flattened = members.flatMap((member) => {
    let hop = [...(member.leftOut ?? [])];
    let { environmentId } = member;
    return hop.length > 0
      ? [
          {
            environmentId,
            registrations: hop,
          },
        ]
      : [];
  });
  return {
    id: secondKind ? secondKind.hopKey.nextDispatchId() : 0,
    event,
    payload: e,
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
function scopeModuleForEvent(loadedModule, event, chain) {
  if (!chain || chain.length === 0) return loadedModule;
  let lent = lentModulesByChain().get(chain) ?? [];
  let now = Date.now();
  let isLive = (index) => lent[index]?.isLent !== true || lent[index].isHeld === true;
  let { caller, above } = splitCallerChain(
    chain.filter((frame, index) => isLive(index) || now < (lent[index]?.until ?? 0)),
    loadedModule.name,
  );
  let admits = (scope, registration) => scope === "every" || scope.includes(registration);
  let aboveRegistrations = registrationsOfPlugin(
    chain.slice(0, -1).filter((frame, index) => isLive(index)),
    loadedModule.name,
  );
  let filtered = loadedModule
    .registrationsFor(event)
    .filter((registration) => admits(caller, registration) || admits(aboveRegistrations, registration));
  if (filtered.length === 0) return loadedModule;
  let where = `origin ${labeledOriginChain(chain)}`;
  if (!loadedModule.hooks(event, filtered)) {
    let isReentry = caller === "every" || above === "every";
    logForDebugging(
      `hooks module ${loadedModule.label} ${event} skipped: re-entry (` +
        (isReentry
          ? `the plugin's own code raised it; ${where})`
          : `its own frame is being dispatched; ${where})`),
    );
    return;
  }
  logForDebugging(
    `hooks module ${loadedModule.label} ${event}: hooks ${filtered.join(", ")} left out for re-entry (${where})`,
  );
  return {
    ...loadedModule,
    leftOut: filtered,
    hooks: (event, extra = []) => loadedModule.hooks(event, [...filtered, ...extra]),
    catches: (event, extra = [], payload) => loadedModule.catches(event, [...filtered, ...extra], payload),
    matcherFor: (event, extra = []) => loadedModule.matcherFor(event, [...filtered, ...extra]),
    standingFor: (event, extra = []) => loadedModule.standingFor(event, [...filtered, ...extra]),
  };
}
//@ chunk-vr8smdd9.js:32524-33087 placement
/**
 * hooks worker 死亡时等待替换的 worker 后再分发。
 */
async function awaitWorkerReplacement({ members, event, hookOrigin, signal }) {
  let args = members.find((member) => member.status().kind === "dead")?.hopKey.replaced?.();
  if (args === undefined) return members;
  logForDebugging(
    `hooks module ${members.map((member) => member.label).join(", ")}: ${event} waits for the hooks worker's replacement`,
  );
  await new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(), {
      once: true,
    });
    args.then(resolve, resolve);
  });
  return members.flatMap((member) => {
    let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === member.name);
    if (!(
      member.status().kind !== "live" &&
      found !== undefined &&
      found.environmentId !== member.environmentId
    ))
      return [member];
    let replacement =
      found.hooks(event) && isModuleAdmitted(found)
        ? scopeModuleForEvent(found, event, hookOrigin)
        : undefined;
    return replacement === undefined ? [] : [replacement];
  });
}
//@ chunk-vr8smdd9.js:33087-34400 placement
/**
 * worker 在分发中途死亡时，用替换 worker 重试剩余插件。
 */
async function retryAfterWorkerDeath({ hop, dispatchId, members, error, called, beneath }) {
  let { event, e, signal } = hop;
  let catching = (handlers) => handlers.filter((handler) => moduleCatchesEvent(handler, event, e));
  let message = errorMessage(error);
  let dead = deadModulesFor(catching(members), message);
  let hopKey = dead[0]?.hopKey;
  let kept = hopKey?.kept;
  while (dead.length > 0 && !signal.aborted) {
    let live = catching(
      liveModulesForDispatch(
        await awaitWorkerReplacement({
          ...hop,
          members: dead,
        }),
        event,
      ),
    );
    let hopKey_2 = live[0]?.hopKey;
    let found = live.find((secondKept) => secondKept.name === kept?.plugin);
    if (hopKey_2 === undefined || signal.aborted) break;
    logForDebugging(
      `hooks module ${joinLabels(live)}: .catch asked in the replacement after the hooks worker ended during ${event}`,
    );
    for (let hookModule of live) hookModule.enter();
    try {
      let result = await hopKey_2.dispatch(
        {
          ...buildHookChain({
            ...hop,
            members: live,
            kind: "",
          }),
          ended: {
            reason: message,
            called: called(),
            ...(found !== undefined && {
              kept: found.environmentId,
            }),
          },
        },
        beneath,
        signal,
      );
      let isKeptVerdict =
        found !== undefined &&
        kept !== undefined &&
        hopKey?.isKeptVerdict?.(dispatchId, result.unmatched !== true) === true;
      for (let hookModule of live)
        if (result.answered?.includes(hookModule.environmentId) === true)
          reportPluginProblem(
            hookModule.name,
            `the hooks worker was replaced during ${event}; ${hookModule.name}'s .catch answered in place of its hook`,
          );
      if (isKeptVerdict) hopKey_2.unloadCrashed?.(found.environmentId, kept);
      return result;
    } catch (error) {
      message = errorMessage(error);
      dead = deadModulesFor(live, message);
      logForDebugging(
        `hooks module ${joinLabels(live)}: .catch not heard after the hooks worker ended during ${event}: ${message}` +
          (dead.length > 0 ? "; asked again of whoever stands" : ""),
        {
          level: "error",
        },
      );
    } finally {
      for (let hookModule of live) hookModule.leave();
    }
  }
  if (dead.length > 0)
    logForDebugging(
      `hooks module ${joinLabels(dead)}: no .catch is asked after the hooks worker ended during ${event}: ` +
        (signal.aborted ? "its caller is gone" : "no replacement that may be waited for holds its hook"),
      {
        level: "error",
      },
    );
  return;
}
//@ chunk-vr8smdd9.js:34400-34576 placement
function invalidFloorsError(hops) {
  let error = new HooksError(
    `${joinLabels(hops)}: next refused: the floors handed back are not ones a next.to of these plugins leaves (host rule)`,
  );
  logForDebugging(error.message, {
    level: "error",
  });
  return error;
}
//@ chunk-vr8smdd9.js:34618-35011 placement
/**
 * 按插件声明的 nextTo 扩展分发链。
 */
function extendChainWithNextTo(chain, floors, to, payload, raised) {
  return floors.some((floor) => isDeepStrictEqual(floor, to))
    ? floors
    : chain
        .slice(
          Math.max(
            chain.findIndex((floor) => floor.name === floors.at(-1)?.plugin),
            0,
          ),
        )
        .filter((floor) => findBypassingFloor(floors, floor.tier, floor.name) === undefined)
        .flatMap((floor) =>
          (floor.args.scan.nextTo ?? [])
            .filter(
              (extended) =>
                extended !== "user" ||
                (isPlainObject(to) &&
                  to.isPastPeers === true &&
                  isNextToUserTarget({
                    clauses: floor.standingFor(payload),
                    scan: floor.args.scan,
                    event: payload,
                    raised,
                  })),
            )
            .map((to) =>
              appendNextToStep(floors, {
                from: floor.tier,
                to,
                plugin: floor.name,
              }),
            ),
        )
        .find((floor) => isDeepStrictEqual(floor.at(-1), to));
}
//@ chunk-vr8smdd9.js:35011-35131 placement
function extendChainForFloors(floors, chain, nextFloors, payload, raised) {
  if (!Array.isArray(nextFloors)) return;
  let current = floors;
  for (let floor of nextFloors) {
    current = extendChainWithNextTo(chain, current, floor, payload, raised);
    if (current === undefined) return;
  }
  return current;
}
//@ chunk-vr8smdd9.js:35131-35986 placement
/**
 * 跨 worker 分发一次 hook 调用（层级 floors、跳转、错误处理）。
 */
async function dispatchHookCall(options) {
  let { event, e, call, signal, floors } = options;
  let modules = dispatchModules(options.members, event, e);
  let hopKey = modules[0]?.hopKey;
  if (!hopKey) return call(e, undefined, floors);
  let claimed;
  let nextWithFloors = (value, ctx, secondFloors) => {
    let validated = extendChainForFloors(floors, modules, secondFloors, event, e);
    if (validated === undefined) return Promise.reject(invalidFloorsError(modules));
    claimed = call(value, ctx, validated);
    return claimed;
  };
  let hookChain = buildHookChain({
    ...options,
    members: modules,
    kind: "",
  });
  let startTime = performance.now();
  for (let hookModule of modules) hookModule.enter();
  let result;
  try {
    result = await hopKey.dispatch(
      {
        ...hookChain,
        caughtBy: modules
          .filter((hookModule) => moduleCatchesEvent(hookModule, event, e))
          .map((hookModule) => hookModule.environmentId),
      },
      nextWithFloors,
      signal,
    );
  } catch (error) {
    let retried = await retryAfterWorkerDeath({
      hop: options,
      dispatchId: hookChain.id,
      members: modules,
      error,
      called: () => claimed !== undefined,
      beneath: (value, ctx, floors) => claimed ?? nextWithFloors(value, ctx, floors),
    });
    if (retried === undefined) throw error;
    result = retried;
  } finally {
    for (let hookModule of modules) hookModule.leave();
  }
  let keySuffix =
    typeof e === "object" && "requestId" in e && typeof e.requestId === "string" ? ` key=${e.requestId}` : "";
  logForDebugging(
    `hooks module ${joinLabels(modules)} ${event} settled in ${(performance.now() - startTime).toFixed(1)}ms (${hopKey.kind} hop, next() included)${keySuffix}`,
  );
  if (result.withheld === true) options.withheld?.();
  return identityPo(result.result);
}
//@ chunk-vr8smdd9.js:35986-36129 placement
function logNativeSettled(loaded, event, startTime) {
  loaded.leave();
  logForDebugging(
    `hooks module ${loaded.label} ${event} settled in ${(performance.now() - startTime).toFixed(1)}ms (native link, next() included)`,
  );
}
//@ chunk-vr8smdd9.js:36129-36289 placement
function isNativeLinkable({ loaded, event, origin }, payload) {
  let canLink =
    liveModulesForDispatch([loaded], event).length === 1 && moduleMatcherAdmits(loaded, event, payload);
  if (canLink && origin)
    logForDebugging(
      `hooks module ${loaded.label} (native): ${event} nested in ` + labeledOriginChain(origin),
    );
  return canLink;
}
//@ chunk-vr8smdd9.js:36289-36808 placement
/**
 * 对原生（进程内）模块建立 hook 链接，非原生模块报错。
 */
function linkNativeHook(options) {
  let { loaded, event, origin } = options;
  if (loaded.link === undefined)
    throw new HooksError(`${loaded.name}: ${event}: not a native module; it runs in a hop`);
  let linked = loaded.link({
    event,
    leftOut: loaded.leftOut,
    hookOrigin: origin,
    gestureAt: options.gestureAt,
  });
  let args = linked.catch;
  async function value(ctx) {
    let startTime = performance.now();
    loaded.enter();
    try {
      return await ctx();
    } finally {
      logNativeSettled(loaded, event, startTime);
    }
  }
  async function secondValue(ctx, floors) {
    loaded.enter();
    try {
      return await args?.(ctx, floors);
    } finally {
      loaded.leave();
    }
  }
  let run = (thirdValue, to, floors) =>
    isNativeLinkable(
      {
        loaded,
        event,
        origin,
      },
      thirdValue,
    )
      ? value(() => linked.run(thirdValue, to, floors))
      : to(thirdValue);
  return identityYt({
    ...linked,
    run,
    ...(args !== undefined && {
      catch: secondValue,
    }),
  });
}
//@ chunk-vr8smdd9.js:36808-37341 placement
/**
 * 分发流式 hook（open），逐个插件包裹。
 */
function dispatchHookOpen(options) {
  let { event, e, open, signal, floors } = options;
  let modules = dispatchModules(options.members, event, e);
  let hopKey = modules[0]?.hopKey;
  if (!hopKey) return open(e, undefined, floors);
  let claimed = (nextWithFloors, value, ctx) => {
    let thirdFloors = extendChainForFloors(floors, modules, ctx, event, e);
    if (thirdFloors === undefined) throw invalidFloorsError(modules);
    return forwardGeneratorWithErrorHook(open(nextWithFloors, value, thirdFloors));
  };
  let startTime = performance.now();
  for (let value of modules) value.enter();
  let to = hopKey.dispatchStream(
    buildHookChain({
      ...options,
      members: modules,
      kind: " stream",
    }),
    claimed,
    signal,
  );
  return (async function* () {
    try {
      let value = yield* forwardGeneratorWithErrorHook(to);
      return identityPo(value);
    } finally {
      for (let floors of modules) floors.leave();
      logForDebugging(
        `hooks module ${joinLabels(modules)} ${event} stream settled in ${(performance.now() - startTime).toFixed(1)}ms (${hopKey.kind} hop, next() included)`,
      );
    }
  })();
}
//@ chunk-vr8smdd9.js:37341-37836 placement
/**
 * 对原生模块建立流式 hook 链接。
 */
function linkNativeStreamHook(options) {
  let { loaded, event, origin } = options;
  if (loaded.streamLinks === undefined)
    throw new HooksError(`${loaded.name}: ${event}: not a native module; it runs in a hop`);
  function readOn(reader) {
    let startTime = performance.now();
    loaded.enter();
    return (async function* () {
      try {
        return yield* reader;
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
    .map((args) => {
      let value = args.catch;
      return {
        ...args,
        run: async (value, to, floors) =>
          isNativeLinkable(
            {
              loaded,
              event,
              origin,
            },
            value,
          )
            ? readOn(await args.run(value, to, floors))
            : to(value),
        ...(value !== undefined && {
          catch: async (fourthValue, to, floors) => readOn(await value(fourthValue, to, floors)),
        }),
      };
    });
}
//@ chunk-vr8smdd9.js:37836-37968 placement
var hopMembers = (members, byName, event) =>
  members.map((member) => {
    let found = byName.get(member);
    if (found === undefined) throw new HooksError(`${event}: a hop member is not one of these handlers`);
    return found;
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
  run: (link, secondRaise, { call: member, floors, cutAt }) =>
    dispatchHookCall({
      members: [loaded],
      event,
      e: link,
      call: member,
      signal: secondRaise.signal,
      hookOrigin: origin,
      raise,
      gestureAt,
      withheld,
      origin: secondRaise.origin,
      floors,
      cutAt,
    }),
  hop: {
    key: loaded.hopKey,
    run: (member) =>
      dispatchHookCall({
        members: hopMembers(member.members, owners, event),
        event,
        e: member.e,
        call: member.call,
        signal: member.signal,
        hookOrigin: origin,
        raise,
        gestureAt,
        withheld,
        origin: member.origin,
        floors: member.floors,
        cutAt: member.cutAt,
      }),
  },
});
//@ chunk-vr8smdd9.js:38503-38560 placement
/**
 * 链接或包装成钩子成员
 */
function toHookMemberOrLink(options) {
  return options.loaded.link !== undefined ? linkNativeHook(options) : toHookMember(options);
}
//@ chunk-vr8smdd9.js:38560-38670 placement
function pluginTierOf(pluginName) {
  let { loadedModules, moduleSeats } = getPluginRegistry();
  return (
    loadedModules.find((loadedModule) => loadedModule.name === pluginName)?.tier ??
    moduleSeats.get(pluginName) ??
    "user"
  );
}
//@ chunk-vr8smdd9.js:38670-38708 placement
/**
 * 插件层级是否属于策略层。
 */
var isPolicyTier = (pluginName) => pushToKillRing.some((tier) => tier === pluginTierOf(pluginName));
//@ chunk-vr8smdd9.js:38708-38937 placement
/**
 * 判断模块对某事件的 matcher 是否接受该载荷（无 matcher 为真；matcher 抛错时交由 hop 决定）。
 */
function matcherAdmits(hookModule, event, e) {
  let matcher = hookModule.matcherFor(event);
  if (matcher === undefined) return true;
  try {
    if (matchesRegExpMatcher(matcher, e, lookupPathTable(event))) return true;
  } catch (error) {
    logForDebugging(
      `hooks module ${hookModule.label}: on('${event}') matcher threw on the host (${errorMessage(error)}); the hop decides`,
    );
    return true;
  }
  warnMatcherMiss(hookModule, event, e);
  return false;
}
//@ chunk-vr8smdd9.js:38937-39230 placement
function pinnedKeysRejected(hookModule, event, { keys, e }) {
  let matcher = hookModule.matcherFor(event);
  if (matcher === undefined || !isPlainDataObject(e)) return false;
  try {
    let pathTable = lookupPathTable(event);
    let any = keys.some(
      (key) =>
        Object.hasOwn(e, key) &&
        !matchesFields(
          matcher,
          {
            [key]: e[key],
          },
          pathTable,
        ),
    );
    if (any) warnMatcherMiss(hookModule, event, e);
    return any;
  } catch (error) {
    logForDebugging(
      `hooks module ${hookModule.label}: on('${event}') matcher threw on the host (${errorMessage(error)}); the hop decides`,
    );
    return false;
  }
}
//@ chunk-vr8smdd9.js:39230-39532 placement
/**
 * 列出监听某事件且策略允许的已加载模块（可限定插件、范围、固定项）。
 */
function modulesHookingEvent(event, origin, { only, e, among, pinned } = {}) {
  let flattened = (among ?? getPluginRegistry().loadedModules).flatMap((loadedModule) => {
    if (!(
      loadedModule.hooks(event) &&
      loadedModule.name === (only ?? loadedModule.name) &&
      isModuleAdmitted(loadedModule)
    ))
      return [];
    let key = scopeModuleForEvent(loadedModule, event, origin);
    return key === undefined || (pinned !== undefined && pinnedKeysRejected(key, event, pinned)) ? [] : [key];
  });
  if (e === undefined) return flattened;
  let index = flattened.findIndex((key) => matcherAdmits(key, event, e));
  return index === -1 ? [] : flattened.slice(index);
}
//@ chunk-vr8smdd9.js:39532-39875 placement
/**
 * hooks worker 不可用时生成拒绝错误。
 */
function refuseIfWorkerMissing({ event, e, origin, only }) {
  let mapped = modulesFromMatcher(
    modulesHookingEvent(event, origin, {
      only,
    }),
    event,
    e,
  )
    .filter(
      (loadedModule) =>
        loadedModule.link === undefined &&
        loadedModule.hopKey.isDeclared?.(loadedModule.name) !== false &&
        moduleCatchesEvent(loadedModule, event, e),
    )
    .map((loadedModule) => loadedModule.name);
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
var dispatchFrameStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vr8smdd9.js:39924", () => {
  dispatchFrameStorage = new AsyncLocalStorage();
});
//@ chunk-vr8smdd9.js:39939-40029 placement
/**
 * 分发帧执行
 */
function runDispatchFrame(store, fn) {
  let frame = {
    isOver: false,
  };
  let running = store.run(frame, fn);
  let finish = () => {
    frame.isOver = true;
  };
  running.then(finish, finish);
  return running;
}
//@ chunk-vr8smdd9.js:40029-40053 placement
/**
 * 在分发帧里执行
 */
var inDispatchFrame = (fn) => runDispatchFrame(dispatchFrameStorage, fn);
//@ chunk-vr8smdd9.js:40053-40093 placement
/**
 * 分发帧是否未结束
 */
var isDispatchFrameOpen = () => dispatchFrameStorage.getStore()?.isOver === false;
//@ chunk-vr8smdd9.js:40093-40371 placement
/**
 * 若有 hooks worker 正在重启，等待其全部就绪（可被中止）后再检查一次；重启进行中而 worker 缺失则拒绝。
 */
function waitForHooksRespawn(options, reason) {
  let respawns = [...getPluginRegistry().hooksRespawns];
  let isFrameOpen = respawns.length > 0 && isDispatchFrameOpen();
  let refusal = isFrameOpen ? refuseIfWorkerMissing(options) : undefined;
  if (refusal !== undefined) {
    logForDebugging(refusal.message, {
      level: "error",
    });
    return Promise.reject(refusal);
  }
  if (respawns.length === 0 || isFrameOpen) return;
  let respawn = Promise.all(respawns).then(() => {
    return;
  });
  return (
    reason !== undefined ? raceWithAbortSignal(respawn, reason, () => asHooksError(reason)) : respawn
  ).then(() => waitForHooksRespawn(options, reason));
}
//@ chunk-vr8smdd9.js:40371-40508 placement
/**
 * 有 worker 正在重启且模块监听该事件时等待其就绪。
 */
function awaitHooksRespawn(options, signal) {
  let pluginRegistry = getPluginRegistry();
  return pluginRegistry.hooksRespawns.size > 0 &&
    pluginRegistry.loadedModules.some(
      (loadedModule) => loadedModule.link === undefined && loadedModule.hooks(options.event),
    )
    ? waitForHooksRespawn(options, signal)
    : undefined;
}
//@ chunk-vr8smdd9.js:40508-40660 placement
/**
 * 同上，但 SessionEnd 不等待；中止时改抛中止错误。
 */
function awaitHooksRespawnUnlessSessionEnd(options, signal) {
  let respawn = options.event === "classic.SessionEnd" ? undefined : awaitHooksRespawn(options, signal);
  return respawn !== undefined && signal !== undefined
    ? respawn.catch((error) => Promise.reject(signal.aborted ? abortErrorFor(signal) : error))
    : respawn;
}
//@ chunk-vr8smdd9.js:40660-40874 placement
/**
 * 为事件生成分发链成员列表。
 */
function hookMembersFor(event, origin, options = {}) {
  let members = [];
  let byEnvironment = new Map();
  for (let loadedModule of modulesHookingEvent(event, origin, options)) {
    let hookMemberOrLink = toHookMemberOrLink({
      loaded: loadedModule,
      event,
      origin,
      raise: options.raise,
      gestureAt: options.gestureAt,
      owners: byEnvironment,
      withheld: options.withheld,
    });
    byEnvironment.set(hookMemberOrLink, loadedModule);
    members.push(hookMemberOrLink);
    options.drawn?.(hookMemberOrLink, loadedModule);
  }
  return members;
}
//@ chunk-vr8smdd9.js:40874-41060 placement
/**
 * 列出匹配某事件和匹配器的插件名。
 */
function pluginsMatchingEvent(event, payload, origin) {
  let pathTable = lookupPathTable(event);
  return getPluginRegistry()
    .loadedModules.filter((loadedModule) => {
      let scopedModule =
        loadedModule.hooks(event) && isModuleAdmitted(loadedModule)
          ? scopeModuleForEvent(loadedModule, event, origin)
          : undefined;
      if (scopedModule === undefined) return false;
      return matchesFields(scopedModule.matcherFor(event), payload, pathTable);
    })
    .map((loadedModule) => loadedModule.name);
}
//@ chunk-vr8smdd9.js:41060-41074 placement
/**
 * 原样返回
 */
var identityPo = (value) => value;
//@ chunk-vr8smdd9.js:41074-41088 placement
/**
 * 原样返回
 */
var identityYt = (value) => value;
//@ chunk-vr8smdd9.js:41088-41107 placement
/**
 * 拷贝成数组
 */
var toArray = (value) => [...value];
//@ chunk-vr8smdd9.js:41107-41235 placement
/**
 * 从调用者栈取 hook 来源插件与层级。
 */
function hookOriginFromStack(frames) {
  let pluginName = frames?.map(originPlugin).findLast((plugin) => plugin !== undefined);
  if (pluginName === undefined) return ENGINE_ORIGIN;
  return Object.freeze({
    plugin: pluginName,
    tier: pluginTierOf(pluginName),
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
var toStreamHookMember = (member, readOn) => ({
  name: member.loaded.name,
  tier: member.loaded.tier,
  run: (e, ctx, { open, floors }) =>
    dispatchHookOpen({
      members: [member.loaded],
      event: member.event,
      e,
      open,
      signal: ctx.signal,
      hookOrigin: member.origin,
      raise: member.raise,
      origin: ctx.origin,
      floors,
    }),
  hop: {
    key: member.loaded.hopKey,
    run: ({ members, e: stream, open, signal, origin, floors }) =>
      dispatchHookOpen({
        members: hopMembers(members, readOn, member.event),
        event: member.event,
        e: stream,
        open,
        signal,
        hookOrigin: member.origin,
        raise: member.raise,
        origin,
        floors,
      }),
  },
});
//@ chunk-vr8smdd9.js:41766-41999 placement
/**
 * 列出监听某流式事件的模块并转为流式链成员（原生模块直接链接）。
 */
function streamMembersFor(event, origin, options = {}) {
  let byKey = new Map();
  return modulesHookingEvent(event, origin, options).flatMap((loadedModule) => {
    if (loadedModule.streamLinks !== undefined)
      return toArray(
        linkNativeStreamHook({
          loaded: loadedModule,
          event,
          origin,
        }),
      );
    let streamHookMember = toStreamHookMember(
      {
        loaded: loadedModule,
        event,
        origin,
        raise: options.raise,
        gestureAt: undefined,
      },
      byKey,
    );
    byKey.set(streamHookMember, loadedModule);
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
var envUnloadedAbortText = (name) => `${name}: the op was aborted: the plugin's environment was unloaded`;
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
