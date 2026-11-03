/**
 * plugins/functionHooks/apiDispatch.ts
 *
 * 2.1.316 新增：插件 $ 接口调用分发、可用性判定与拒绝原因
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (84)
 * attribution: placement 84
 */
import { isDeepStrictEqual } from "util";
import { createWorkerSlots } from "./hooksWorker.js";
import { workersLoadedReporter, HOOKS_READY_TIMEOUT_MS } from "./hooksModuleLoader.js";
import { logModLoaded } from "./modLoadTelemetry.js";
import { takePending } from "./hostBridge.js";
import { HooksError, AskRefusedError } from "./hooksErrors.js";
import { isClockMethod, asHooksError, isFiniteNonNegativeNumber } from "./api/operations.js";
import { count, uniq } from "../../utils/collections.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { isToolFromServer } from "./mcpServerHooks.js";
import { isPersonInputEvent } from "./uiHooks.js";
import {
  originKey,
  sameOrigin,
  lentModulesByChain,
  originPlugin,
  pluginStorageKey,
  originLabel,
  apiMethodLabel,
} from "./hooksWorkerClient.js";
import { pressForEnv } from "./ui/pressFill.js";
import { runOrExit, getCwd } from "../../utils/cwd.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { isModuleAdmitted } from "../../utils/plugins/functionHooks/admission.js";
import { removedByPluginText } from "./eventPatterns.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  closeGeneratorQuietly,
  forwardGeneratorWithErrorHook,
  reportStreamChainFailure,
} from "./dispatch/streamChain.js";
import { sleep } from "../../utils/sleep.js";
import {
  requireBoundSession,
  submitHoldRefusal,
  sessionAuthorizeForPlugin,
  sessionIdentity,
  identityRefusal,
} from "./sessionApi.js";
import {
  streamMembersFor,
  awaitHooksRespawn,
  hookOriginFromStack,
  pluginsMatchingEvent,
  hookMembersFor,
} from "./hookDispatch.js";
import { afterThenYield } from "./configApi.js";
import { envSiteRuleFor } from "./sites/siteRules.js";
import { httpFetchForPlugin } from "./httpApi.js";
import { isOfficialMarketplacePlugin } from "./panes.js";
import { parsePluginIdentifier_2 } from "../../utils/plugins/pluginIdentifier.js";
import {
  pluginNameFields,
  mayLogPluginName,
  getTelemetryPluginScope,
} from "../../utils/telemetry/pluginTelemetry.js";
import { policyEnabledPluginNameSet } from "../../utils/plugins/pluginPolicy.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { PROMPT_COMPOSE_EVENT, composeDetachedSections } from "./coreHandlers.js";
import { promptComposer } from "./promptComposition.js";
import { attachedSurfaces } from "./surfaceBinding.js";
import { runInScope } from "./dispatch/dispatchScope.js";
import { reportChainFailure, currentDispatch, forwardAbort } from "./dispatch/chain.js";
import { mediaHoldStore, aYr } from "../../utils/attachmentMedia.js";
import { readPromptBox, normalizePromptBox, aEt } from "./promptApi.js";
import { judgeHookInput } from "./dispatch/inputJudging.js";
import { errorMessage } from "../../utils/errors.js";
import { isPlainDataObject } from "../../utils/hooks/functionHookMatchers.js";
import { MAX_NESTING_DEPTH, NESTING_TOO_DEEP_MESSAGE } from "../../utils/structuredCloneLimits.js";
import { isVouchedPolicyPluginId } from "../../utils/plugins/managedPlugins.js";
import { defaultRoute } from "./eventPayloads.js";

//@ chunk-e6aww6q8.js:3709715-3709728 placement
/**
 * 插件 worker 槽位表
 */
var workerSlots = createWorkerSlots();
//@ chunk-e6aww6q8.js:3709728-3709819 placement
/**
 * 登记已加载的 worker 并通知
 */
function noteWorkersLoaded(loadedModules) {
  workerSlots.notifyLoaded(new Set(loadedModules.map((n) => n.name)));
  workersLoadedReporter.get()?.(loadedModules);
  loadedModules.forEach(logModLoaded);
}
//@ chunk-e6aww6q8.js:3709819-3709863 placement
/**
 * 拒绝某个挂起调用
 */
var rejectPendingCall = (pending, environmentId, r) =>
  takePending(pending, environmentId)?.reject(new HooksError(r));
//@ chunk-e6aww6q8.js:3709863-3709956 placement
/**
 * 删除挂起调用并拒绝
 */
function settleCallRejection(e) {
  if (e.pendingCalls.delete(e.callId)) {
    e.settleIdle();
    e.reject(new HooksError(e.reason));
  }
}
//@ chunk-e6aww6q8.js:3709956-3710027 placement
/**
 * 定时让调用超时
 */
function scheduleCallTimeout(pendingLoads, n, r) {
  let timer = setTimeout(rejectPendingCall, HOOKS_READY_TIMEOUT_MS, pendingLoads, n, r);
  timer.unref();
  return timer;
}
//@ chunk-e6aww6q8.js:3710027-3710055 placement
/**
 * 取消引用定时器
 */
function unrefTimer(port1) {
  port1.unref?.();
}
//@ chunk-e6aww6q8.js:3710055-3710144 placement
/**
 * 递增插件代次
 */
function bumpPluginEpochs(work, environments) {
  for (let r of environments) {
    let s = work.get(r) ?? {
      ops: 0,
      epoch: 0,
    };
    work.set(r, s);
    s.epoch += 1;
  }
}
//@ chunk-e6aww6q8.js:3710144-3710273 placement
/**
 * 为插件记一次进行中的操作（时钟类不计数）并递增 epoch，返回结束回调。
 */
function trackPluginOp(work, environmentId, r) {
  let s = isClockMethod(r) ? 0 : 1;
  let h = work.get(environmentId) ?? {
    ops: 0,
    epoch: 0,
  };
  work.set(environmentId, h);
  h.ops += s;
  h.epoch += 1;
  return () => {
    h.ops -= s;
    h.epoch += 1;
  };
}
//@ chunk-e6aww6q8.js:3710273-3710462 placement
/**
 * 统计匹配插件的进行中操作数与 epoch 总和（含进行中的非时钟分发）。
 */
function countActingOps(work, n, r) {
  let filtered = [...work].filter(([h]) => r(h));
  return {
    acting:
      filtered.reduce((acc, [, y]) => acc + y.ops, 0) +
      count([...n], (h) => !isClockMethod(h.event) && h.environments.some(r)),
    epoch: filtered.reduce((acc, [, y]) => acc + y.epoch, 0),
  };
}
//@ chunk-e6aww6q8.js:3710462-3710686 placement
/**
 * 同线程宿主的分发状态：名称表、分发、按键记录、待加载、操作控制器、服务中的调用等。
 */
var createHostDispatchState = () => ({
  names: new Map(),
  dispatches: new Map(),
  sentPresses: new Set(),
  keptPresses: new Map(),
  pressCounter: 0,
  pendingLoads: new Map(),
  dispatchCounter: 0,
  died: undefined,
  opControllers: new Map(),
  work: new Map(),
  servedCalls: new Map(),
  callCounter: 0,
});
//@ chunk-e6aww6q8.js:3710686-3710743 placement
/**
 * 该调用仍是当前挂起项
 */
var isCurrentPendingCall = (e, n, r) => () => r !== undefined && n !== undefined && e.get(n) === r;
//@ chunk-e6aww6q8.js:3710743-3710902 placement
/**
 * 判断调用是否来自模型发起的工具调用（无来源链、事件为 tool.call 且是插件工具）。
 */
function isModelOriginToolCall(e, n) {
  let r = e !== undefined && (e.origin === undefined || e.origin.length === 0);
  let tool = e?.event === "tool.call" ? e.tool : undefined;
  let h = tool === AGENT || (tool !== undefined && isToolFromServer(n, tool));
  return r && h;
}
//@ chunk-e6aww6q8.js:3710902-3710972 placement
/**
 * 按压归属是否一致
 */
var isSamePressOwner = (e, n) =>
  isPersonInputEvent(e?.event) && e?.pressOwner !== undefined && e.pressOwner === n;
//@ chunk-e6aww6q8.js:3710972-3711017 placement
/**
 * ui.render/ui.focus
 */
var isUiRenderEvent = (rootEvent) => rootEvent === "ui.render" || rootEvent === "ui.focus";
//@ chunk-e6aww6q8.js:3711017-3711220 placement
/**
 * 继承调用方的分发事实：仍在分发中时沿用，必要时去掉根事件。
 */
function inheritDispatchFacts(e, environmentId, r) {
  let facts = e?.facts;
  let h = facts?.isDispatching?.() === true;
  let y = isUiRenderEvent(facts?.rootEvent) && e?.callers.at(-1) !== environmentId;
  return h
    ? {
        ...facts,
        ...(y && {
          rootEvent: undefined,
        }),
        isDispatching: () => r() && facts?.isDispatching?.() === true,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:3711220-3711356 placement
/**
 * 取某环境最近一次用户手势的时间。
 */
function latestGestureAt(e, environmentId) {
  let flattened = [...e].filter((s) => s.environmentId === environmentId).flatMap((s) => s.gestureAt ?? []);
  return flattened.length === 0 ? undefined : Math.max(...flattened);
}
//@ chunk-e6aww6q8.js:3711356-3711430 placement
/**
 * 标记 spawn 已被处理一次
 */
var claimSpawnServed = (e) => () => {
  let n = e.isSpawnServed !== true;
  e.isSpawnServed = true;
  return n;
};
//@ chunk-e6aww6q8.js:3711430-3711759 placement
/**
 * 收集借给被调插件且尚未过期的调用帧（按帧去重）。
 */
function collectLentFrames(e, n) {
  let now = Date.now();
  let filtered = [...e]
    .filter((y) => y.callee === n)
    .flatMap((y) => y.lent)
    .filter((y) => now < y.until);
  let h = new Map();
  for (let y of filtered) {
    let S = originKey(y.frame);
    let w = h.get(S) ?? y;
    h.set(S, {
      frame: w.frame,
      until: Math.max(w.until, y.until),
      alike: uniq([...(w.alike ?? []), ...(y.alike ?? []), y.frame]),
    });
  }
  return filtered.length === 0
    ? undefined
    : {
        lent: [...h.values()],
      };
}
//@ chunk-e6aww6q8.js:3711759-3711821 placement
/**
 * 追加调用者帧（去重）
 */
function appendCallerFrame(e, n) {
  return [...(e ?? []).filter((r) => !sameOrigin(r, n)), n];
}
//@ chunk-e6aww6q8.js:3711821-3712744 placement
/**
 * 计算一次钩子调用的调用者链（借用帧、持有关系），并更新链上各模块的借用信息。
 */
function buildCallerChain(e, { dispatch, held, registration, served }) {
  let now = Date.now();
  let lent = registration === undefined ? served?.lent : undefined;
  let w = held && lentModulesByChain().get(held);
  let filtered = held?.filter((Ie, Me) => w?.[Me]?.isLent !== true || w[Me].isHeld === true);
  let G = (Ie) => now < Ie.until || filtered?.includes(Ie.frame) === true;
  let filtered_2 = lent?.filter((Ie) => G(Ie) && originPlugin(Ie.frame) !== e);
  let Z = filtered_2?.map((Ie) => Ie.frame) ?? dispatch?.origin;
  let ke = appendCallerFrame(
    Z,
    dispatch !== undefined && registration !== undefined
      ? {
          plugin: e,
          registration,
        }
      : e,
  );
  let we =
    filtered_2?.map((Ie) => ({
      until: Ie.until,
      isLent: true,
      isHeld: filtered?.includes(Ie.frame) === true,
      alike: Ie.alike,
    })) ?? (Z === undefined ? Z : lentModulesByChain().get(Z));
  let reduced = lent?.reduce((acc, Me) => Math.max(acc, Me.until), Number.NEGATIVE_INFINITY);
  let Ae = new Map(Z?.map((Ie, Me) => [Ie, we?.[Me]]));
  if (reduced !== undefined && Number.isFinite(reduced) && now < reduced)
    Ae.set(e, {
      until: reduced,
      isLent: false,
      isHeld: false,
    });
  if (we !== undefined) {
    let Ie = ke.length - 1;
    lentModulesByChain().set(
      ke,
      ke.map((Me, We) => ({
        until: Ae.get(Me)?.until ?? Number.POSITIVE_INFINITY,
        isLent: We < Ie && Ae.get(Me)?.isLent === true,
        isHeld: We < Ie && Ae.get(Me)?.isHeld === true,
        alike: Ae.get(Me)?.alike,
      })),
    );
  }
  return ke;
}
//@ chunk-e6aww6q8.js:3712744-3714060 placement
/**
 * 为一次钩子调用构造执行环境（插件身份、可用接口、取消信号）。
 */
function buildHookEnvironment({ state }, n, signal) {
  let { environmentId, dispatchId, registration, serving } = n;
  let w = serving === undefined ? undefined : state.servedCalls.get(serving);
  let L = dispatchId === undefined ? undefined : state.dispatches.get(dispatchId);
  let G = state.names.get(environmentId);
  let included = L?.environments.includes(environmentId);
  let Z = w?.callee === environmentId;
  let Se = registration === undefined;
  let ke = Se && included !== true;
  let we = Se && Z;
  let Ee = ke || we ? undefined : L;
  let Ae = we
    ? inheritDispatchFacts(w, environmentId, isCurrentPendingCall(state.servedCalls, serving, w))
    : undefined;
  let Ie = we ? Ae : Ee;
  let Me = Se && isPersonInputEvent(Ie?.rootEvent);
  let We = !Se && isSamePressOwner(Ee, G);
  let ze = !Se && Ee !== undefined;
  let listedMedia = Se ? undefined : Ee?.listedMedia;
  let Je = Se && !we;
  let nt = Je ? latestGestureAt(state.sentPresses, environmentId) : undefined;
  let pt = We ? Ee?.gestureAt : nt;
  let Et = Je ? pressForEnv(state.keptPresses, n.pressing, environmentId) : undefined;
  let yt = Ee === undefined && !Z && n.rootEvent === undefined;
  let gt = Z ? w : undefined;
  let It = !Se && included === true && G !== undefined && isModelOriginToolCall(L, G) ? L : undefined;
  return {
    plugin: G ?? `environment ${environmentId}`,
    signal,
    origin:
      G === undefined
        ? (L?.origin ?? [])
        : buildCallerChain(G, {
            dispatch: Ee,
            held: yt ? undefined : L?.origin,
            registration: yt ? undefined : registration,
            served: yt ? collectLentFrames(state.servedCalls.values(), environmentId) : gt,
          }),
    turnHeld: Ie?.turnHeld,
    rootEvent: (Me ? undefined : Ie?.rootEvent) ?? n.rootEvent,
    ownRoot: n.rootEvent,
    ...(pt !== undefined && {
      vouchedPressAt: pt,
    }),
    ...(Et !== undefined && {
      answersPress: Et,
    }),
    ...(It !== undefined && {
      isModelCallServed: true,
      takeServedSpawn: claimSpawnServed(It),
    }),
    ...(!Se &&
      Ee?.isPersonInput === true && {
        isPersonInput: true,
      }),
    ...(ze && {
      judging: Ee,
    }),
    ...(listedMedia !== undefined && {
      listedMedia,
    }),
    cwd: Ie?.cwd,
    isDispatching: we ? Ae?.isDispatching : isCurrentPendingCall(state.dispatches, dispatchId, Ee),
    scopeHolder: (included === true ? L : undefined) ?? gt,
    environmentId,
    ...(Z && {
      callers: w.callers,
    }),
  };
}
//@ chunk-e6aww6q8.js:3714060-3714110 placement
/**
 * 有 cwd 用之，否则调用
 */
function cwdFromOrCall(hookEnvironment, n) {
  return hookEnvironment.cwd === undefined ? runOrExit(n) : n();
}
//@ chunk-e6aww6q8.js:3714110-3714167 placement
/**
 * 调用者链
 */
function callerChain(e) {
  return [...(e.callers ?? []), e.environmentId];
}
//@ chunk-e6aww6q8.js:3714167-3714206 placement
/**
 * 取命名空间前缀
 */
var namespaceOf = (spelling) => spelling.slice(0, spelling.indexOf("."));
//@ chunk-e6aww6q8.js:3714206-3714476 placement
/**
 * 若插件的 hooks 模块是在已变化的策略下被评判的，返回拒绝错误。
 */
function policyChangedRefusal(e, n) {
  let r = callerChain(e);
  return getPluginRegistry().loadedModules.some(
    (loadedModule) => r.includes(loadedModule.environmentId) && !isModuleAdmitted(loadedModule),
  )
    ? new HooksError(
        `${e.plugin}: $.${n} refused: its hooks module was judged under a policy that has since changed, and is off until it is judged under the one in force`,
      )
    : undefined;
}
//@ chunk-e6aww6q8.js:3714476-3714912 placement
/**
 * 被扣留名词的调用遭拒时生成拒绝说明，并对每个插件/名词只记录一次日志。
 */
function withheldCallRefusal(state, { plugin, spelling, by }) {
  let h = removedByPluginText(spelling, by);
  let y = `${plugin}:${namespaceOf(spelling)}`;
  if (!state.refusalsLogged.has(y)) {
    state.refusalsLogged.add(y);
    let S = state.knownArgs.get(plugin);
    let w = S ? pluginStorageKey(S) : plugin;
    logForDebugging(
      `hooks module ${w}: ${h} (withheld at engine.create; the call reached the host past $'s stub: through a table a step captured from next(e), or through a $ built before the withholding); later calls on $.${namespaceOf(spelling)} are refused without a line`,
      {
        level: "warn",
      },
    );
  }
  return h;
}
//@ chunk-e6aww6q8.js:3714912-3715003 placement
/**
 * 找持有该帧的崩溃者
 */
function findCrashedWithholder(e, plugin, r) {
  for (let [s, h] of e.crashedWithholders) if (s !== plugin && h.has(r)) return s;
  return;
}
//@ chunk-e6aww6q8.js:3715003-3715272 placement
function findStagedRefusal(state, caller, r) {
  let { staged, stagedBefore, building } = state;
  let S =
    caller.environmentId !== undefined &&
    building?.some((w) => w.environmentId === caller.environmentId) === true;
  return (
    (S ? staged?.refuser(caller.plugin, r) : undefined) ??
    (S ? stagedBefore?.refuser(caller.plugin, r) : undefined) ??
    state.withheld.refuser(caller.plugin, r) ??
    findCrashedWithholder(state, caller.plugin, r)
  );
}
//@ chunk-e6aww6q8.js:3715272-3715572 placement
/**
 * 检查 hooks 模块的静态扫描是否列出了某 $ 调用；未加载或未列出时返回宿主规则说明。
 */
function scanAllowsCall(e, n) {
  if (!e) return "no hooks module of that name is loaded, so there is no scan to allow it (host rule)";
  let included = e.calls.includes(n);
  let s = e.calls.length === 0;
  return included
    ? undefined
    : "its hooks module does not call it (host rule; the scan lists " +
        (s ? "no calls" : e.calls.map((h) => `$.${h}`).join(", ")) +
        ")";
}
//@ chunk-e6aww6q8.js:3715572-3716099 placement
function refuseUnadmittedApiCall(e, { spelling, caller, isClock }) {
  let h = e.state.knownArgs.get(caller.plugin);
  let y = scanAllowsCall(h?.scan, spelling);
  if (h === undefined || y !== undefined)
    throw new HooksError(`${caller.plugin}: $.${spelling} refused: ${y}`);
  let stagedRefusal = findStagedRefusal(e.state, caller, namespaceOf(spelling));
  if (stagedRefusal !== undefined)
    throw new HooksError(
      withheldCallRefusal(e.state, {
        plugin: caller.plugin,
        spelling,
        by: stagedRefusal,
      }),
    );
  let w = policyChangedRefusal(caller, spelling);
  if (w !== undefined) throw w;
  if (callerChain(caller).some((G) => G !== undefined && e.state.unadmitted.has(G)) && !isClock)
    throw new HooksError(
      `${caller.plugin}: $.${spelling} refused: a hooks module behind the call is not admitted (ops wait for the fold and plugin.register)`,
    );
  return h;
}
//@ chunk-e6aww6q8.js:3716099-3716275 placement = returnValue (1)
async function* returnValue(e, n) {
  let r = false;
  try {
    for (;;) {
      let s = n();
      if (s !== undefined) throw s;
      let h = await e.next();
      if (h.done === true) {
        r = true;
        return h.value;
      }
      yield h.value;
    }
  } finally {
    if (!r) await closeGeneratorQuietly(e);
  }
}
//@ chunk-e6aww6q8.js:3716275-3716501 placement
/**
 * 判断正在准入的插件列表是否已过期（环境已不在已加载模块中）。
 */
function staleAdmittingList(state, n) {
  let admitting = state.admitting ?? [];
  let index = admitting.findIndex((S) => S.environmentId === n.environmentId);
  let h = new Set(getPluginRegistry().loadedModules.map((loadedModule) => loadedModule.environmentId));
  return admitting.slice(0, index + 1).some((S) => !h.has(S.environmentId)) ? state.admitting : undefined;
}
//@ chunk-e6aww6q8.js:3716501-3716552 placement = getErrnoPath (0.778)
function getErrnoPath(e) {
  return {
    field: "path",
    at: e.cwd ?? getCwd(),
  };
}
//@ chunk-e6aww6q8.js:3716552-3716604 placement
/**
 * 取已接纳的参数
 */
var admittedArgs = (e, n) => n.admitted ?? e.knownArgs.get(n.plugin);
//@ chunk-e6aww6q8.js:3716604-3716716 placement
/**
 * 取已加载插件的参数，插件未加载时抛 HooksError。
 */
function requireLoadedPluginArgs(e, n, r) {
  let s = admittedArgs(e, n);
  if (s === undefined) throw new HooksError(`${n.plugin}: ${r}: not a loaded plugin`);
  return s;
}
//@ chunk-e6aww6q8.js:3717961-3718001 placement
/**
 * 异步当前时间
 */
var nowAsync = () => Promise.resolve(Date.now());
//@ chunk-e6aww6q8.js:3718001-3718058 placement
/**
 * 带信号的可中止睡眠
 */
var sleepWithSignal = (e, signal) =>
  sleep(e.ms, signal, {
    ...(signal && {
      abortError: () => asHooksError(signal),
    }),
  });
//@ chunk-e6aww6q8.js:3718058-3718180 placement
function checkSleepArgs(e) {
  let ms = e?.ms;
  return isFiniteNonNegativeNumber(ms)
    ? undefined
    : `takes { ms }, a non-negative number of milliseconds (got ${String(ms)})`;
}
//@ chunk-e6aww6q8.js:3718180-3718227 placement
/**
 * clock 方法的 check/run
 */
var CLOCK_METHOD = {
  check: checkSleepArgs,
  run: (e, n) => sleepWithSignal(e, n.signal),
};
//@ chunk-e6aww6q8.js:3718227-3718367 placement
/**
 * 加载 /config 行句柄（按需导入），供插件读取配置行。
 */
async function loadConfigRowHandles(e, n) {
  let r = requireBoundSession(e, n);
  let { configRowHandles } = await import("./chunk-7qydycm2.js");
  return configRowHandles(r.toolContext(new AbortController()));
}
//@ chunk-e6aww6q8.js:3720668-3720787 placement
var WITHHELD_RESULT_SUFFIXES = {
  nothing: "",
  started: " started, and a plugin withheld its result",
  ran: " ran, and a plugin withheld its result",
};
//@ chunk-e6aww6q8.js:3720787-3721548 placement
/**
 * 对流式 $ 调用经过钩子链（可在钩子重启时等待），最底层调用宿主实现；被拒时按进展状态给出错误。
 */
function streamHookedApiCall({ event, args, caller, bottom }) {
  let h = streamMembersFor(event, caller.origin);
  let signal = caller.signal ?? new AbortController().signal;
  if (h.length === 0 && bottom) return bottom.stream(args, caller);
  let S = awaitHooksRespawn(
    {
      event,
      e: args,
      origin: caller.origin,
    },
    caller.signal,
  );
  if (S !== undefined)
    return afterThenYield(S, () =>
      streamHookedApiCall({
        event,
        args,
        caller,
        bottom,
      }),
    );
  let w = "nothing";
  let L = () => void (w = "started");
  function G(Se) {
    w = "ran";
    return Se;
  }
  let bottom_2 =
    bottom &&
    ((Se, signal) => {
      let we = bottom.check?.(Se, caller);
      if (we !== undefined) throw new HooksError(`${event}: ${we} (host check)`);
      let Ee = bottom.stream(Se, {
        ...caller,
        signal,
      });
      return (async function* () {
        return {
          value: G(yield* forwardGeneratorWithErrorHook(Ee, L)),
        };
      })();
    });
  let Z = reportStreamChainFailure({
    e: args,
    handlers: h,
    site: envSiteRuleFor(event),
    signal,
    origin: hookOriginFromStack(caller.origin),
    bottom: bottom_2,
  });
  return (async function* () {
    let Se = yield* forwardGeneratorWithErrorHook(Z);
    if (Se.deny !== undefined)
      throw new HooksError(`${caller.plugin}: $.${event}${WITHHELD_RESULT_SUFFIXES[w]}: ${Se.deny}`);
    return Se.value;
  })();
}
//@ chunk-e6aww6q8.js:4008720-4008893 placement
/**
 * 包装 $.agent.spawn：检查输入暂扣，服务模型发起的派生标记 servesModel。
 */
var wrapAgentSpawnOp = (e) => (n, r) => {
  let s = r.takeServedSpawn?.() === true;
  let h = s ? undefined : submitHoldRefusal(r, "$.agent.spawn");
  if (h === undefined)
    return e(
      n,
      s
        ? {
            ...r,
            servesModel: true,
          }
        : r,
    );
  return Promise.resolve({
    deny: h,
  });
};
//@ chunk-e6aww6q8.js:4008893-4009099 placement
/**
 * $.http.fetch 表项：参数为 URL，以插件身份调用 httpFetchForPlugin。
 */
var HTTP_FETCH_API = (e) => ({
  check: (n) => (typeof n?.url === "string" ? undefined : "takes a URL"),
  run: async (n, r) => {
    let { pluginName, pluginStorageId } = requireLoadedPluginArgs(e, r, "http.fetch");
    return httpFetchForPlugin(
      n,
      {
        pluginName,
        pluginStorageId,
      },
      r.signal,
    );
  },
});
//@ chunk-e6aww6q8.js:4009099-4009198 placement
/**
 * 绑定插件调用上下文
 */
var bindPluginCall = (e) => (n, r) =>
  e(n, r.plugin, {
    signal: r.signal,
    cwd: r.cwd,
    pluginId: r.admitted?.pluginStorageId,
  });
//@ chunk-e6aww6q8.js:4009198-4009271 placement
/**
 * 是否官方市场插件
 */
function isOfficialMarketplace(e, n) {
  let r = admittedArgs(e, n);
  return r !== undefined && isOfficialMarketplacePlugin(r.pluginStorageId);
}
//@ chunk-e6aww6q8.js:4009271-4009322 placement
/**
 * 是否有其他 prompt.read 插件
 */
var hasOtherPromptRead = (plugin) => pluginsMatchingEvent("prompt.read", {}).some((n) => n !== plugin);
//@ chunk-e6aww6q8.js:4009322-4009374 placement
/**
 * 插件名或兜底
 */
var pluginNameOrFallback = (e, n) => (typeof e !== "string" || e === "" ? n : undefined);
//@ chunk-e6aww6q8.js:4009374-4009489 placement
/**
 * 生成插件遥测用的名字字段（按市场判断是否可公开插件名）。
 */
function telemetryNamesForPlugin({ plugin, admitted }) {
  let { marketplace } = parsePluginIdentifier_2(admitted?.pluginStorageId ?? plugin);
  return pluginNameFields(
    plugin,
    marketplace,
    mayLogPluginName(getTelemetryPluginScope(plugin, marketplace, policyEnabledPluginNameSet())),
  );
}
//@ chunk-e6aww6q8.js:4009489-4009573 placement
/**
 * 遥测调用参数
 */
var telemetryCallArgs = (e, querySource) => [
  e.plugin,
  {
    querySource,
    names: telemetryNamesForPlugin(e),
    hookOrigin: e.origin,
  },
  e.signal,
];
//@ chunk-e6aww6q8.js:4009573-4010181 placement
/**
 * 插件 $.prompt.compose：为给定事实组装系统提示，本进程不组装时拒绝。
 */
var promptComposeForPlugin = {
  check: (e) => (isPlainObject_5(e) ? undefined : "takes the facts to compose for"),
  run: async (e, n) => {
    let { site } = PROMPT_COMPOSE_EVENT;
    let s = promptComposer();
    let h = requireBoundSession(n.plugin, "$.prompt.compose");
    let y = await s?.facts(h.tools(), h.model());
    if (y === undefined)
      throw new HooksError(`${n.plugin}: $.prompt.compose: this process composes no system prompt`);
    let S = {
      ...y,
      surfaces: attachedSurfaces(),
      ...e,
    };
    let w = site.checkArgument?.(S, S);
    if (w !== undefined) throw new HooksError(`${n.plugin}: $.prompt.compose: ${w}`);
    let pinned = {
      keys: site.pinnedKeys ?? [],
      e: S,
    };
    let handlers = hookMembersFor("prompt.compose", n.origin, {
      pinned,
    });
    return runInScope(n.scopeHolder?.scope, () =>
      reportChainFailure({
        e: S,
        handlers,
        site,
        signal: n.signal,
        origin: hookOriginFromStack(n.origin),
        bottom: (q) => composeDetachedSections(q, n.origin),
      }),
    );
  },
};
//@ chunk-e6aww6q8.js:4010181-4010254 placement
/**
 * 是否在分发中列出该附件
 */
var isListedMediaDispatching = (e, id) =>
  e.listedMedia?.includes(id) === true && e.isDispatching?.() === true;
//@ chunk-e6aww6q8.js:4010254-4010632 placement
/**
 * $.prompt.attachment.read 表项：参数 {id, offset?}，只能读当前 prompt.submit 列出的附件。
 */
var ATTACHMENT_READ_API = {
  check: (e) => {
    let offset = e?.offset;
    let r = typeof e?.id === "string" && e.id !== "";
    let s =
      offset === undefined || (typeof offset === "number" && Number.isSafeInteger(offset) && offset >= 0);
    return !r
      ? "takes { id } (an attachment's id, from the prompt.submit in flight)"
      : s
        ? undefined
        : `takes offset, a whole number of bytes from 0 (got ${String(offset)})`;
  },
  run: async (e, n) => {
    let r = isListedMediaDispatching(n, e.id) ? await mediaHoldStore.read(e) : aYr;
    return isListedMediaDispatching(n, e.id) ? r : aYr;
  },
};
//@ chunk-e6aww6q8.js:4010632-4010672 placement
/**
 * 读提示框的接口实现
 */
var PROMPT_BOX_READ = {
  run: async (e, n) => readPromptBox(n.plugin),
};
//@ chunk-e6aww6q8.js:4010672-4010724 placement
/**
 * 在后续事件提交的说明
 */
var LATER_EVENT_HINT = "submit from a later event (turn.complete)";
//@ chunk-e6aww6q8.js:4010724-4010815 placement
/**
 * 会等待本轮结束的说明
 */
var waitingOnTurnText = (e, n) =>
  `called from a ${e} hook, it would wait on the turn this hook ${n}; ${LATER_EVENT_HINT}`;
//@ chunk-e6aww6q8.js:4010815-4010981 placement
function classicHookWaitHazard(e) {
  return e !== undefined &&
    e.startsWith("classic.") &&
    e !== "classic.SessionStart" &&
    e !== "classic.Setup" &&
    e !== "classic.SessionEnd"
    ? waitingOnTurnText(e, "may be holding")
    : undefined;
}
//@ chunk-e6aww6q8.js:4010981-4011221 placement
var TURN_HOLDING_EVENTS = [
  "classic.PreToolUse",
  "tool.call",
  "agent.spawn",
  "session.send",
  "prompt.section",
  "prompt.context",
  "prompt.attachment",
  "prompt.mention",
  "prompt.compose",
  "tool.describe",
  "command.run",
  "command.describe",
  "config.describe",
  "config.set",
];
//@ chunk-e6aww6q8.js:4011221-4011456 placement
/**
 * 在会等待当前回合的钩子（prompt.submit、tool.call 等）里调用 submit 时返回说明，提示改用后续事件。
 */
function submitWaitHazard(e) {
  if (e === "prompt.submit")
    return (
      "called from a prompt.submit hook, it would wait on the turn this hook is holding; answer { text } or next(e) instead, or " +
      LATER_EVENT_HINT
    );
  return e !== undefined && TURN_HOLDING_EVENTS.includes(e)
    ? waitingOnTurnText(e, "is holding")
    : classicHookWaitHazard(e);
}
//@ chunk-e6aww6q8.js:4011456-4011804 placement
/**
 * 把输入框内容交给调用 $.prompt.read 的插件；没有插件调用时直接返回 undefined。
 */
function readPromptBoxForPlugin(e, n, r) {
  let s = scanAllowsCall(n, "prompt.read");
  if (s !== undefined) {
    logForDebugging(`${r} (${e.plugin}): the box goes to plugins that call $.prompt.read; none (${s})`);
    return Promise.resolve(undefined);
  }
  return judgeHookInput({
    event: "prompt.read",
    args: {},
    caller: e,
    ...(currentDispatch() === undefined && {
      bottom: PROMPT_BOX_READ,
    }),
  })
    .then(normalizePromptBox)
    .catch((error) => {
      logForDebugging(`${r} (${e.plugin}): the box is not answered: ` + errorMessage(error));
      return;
    });
}
//@ chunk-e6aww6q8.js:4011804-4011859 placement
/**
 * 取插件的提示框
 */
async function promptBoxForPlugin(e, scan, r) {
  return (await readPromptBoxForPlugin(e, scan, r)) ?? aEt;
}
//@ chunk-e6aww6q8.js:4011859-4012121 placement
function buildLentCallAsk({ lent, judging, signal }, callee, call) {
  let last = lent.at(-1);
  return judging !== undefined && last !== undefined
    ? {
        maker: originLabel(last.frame),
        isAgain: (judging.origin ?? []).some((w) => originLabel(w) === originLabel(last.frame)),
        judging,
        frame: last.frame,
        chain: [],
        isRepeat: false,
        callee,
        call,
        ...(signal !== undefined && {
          signal,
        }),
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:4012121-4012206 placement
/**
 * 附上提问链与是否重复
 */
function withAskChain(e, callsInChain, identicalOpenCalls) {
  return {
    ...e,
    chain: callsInChain.map((s) => s.asked.frame),
    isRepeat: identicalOpenCalls.length > 0,
  };
}
//@ chunk-e6aww6q8.js:4012206-4012457 placement
function openCallsInChain({ sentCalls, chainsAbove }, r) {
  let origin = r.judging.origin ?? [];
  let h = new Set(
    [...origin, ...(lentModulesByChain().get(origin) ?? []).flatMap((y) => y.alike ?? [])]
      .filter((y) => typeof y === "object")
      .flatMap((y) => [y, ...(chainsAbove.get(y) ?? [])]),
  );
  return [...sentCalls].filter((sentCall) => h.has(sentCall.asked.frame));
}
//@ chunk-e6aww6q8.js:4012457-4012715 placement
function sendTrackedCall({ sentCalls, chainsAbove }, r, send) {
  let promise = new Promise((resolve) => {
    resolve(send());
  });
  let y = () => void sentCalls.delete(r);
  sentCalls.add(r);
  if (typeof r.asked.frame === "object") chainsAbove.set(r.asked.frame, r.asked.chain);
  promise.then(r.waited.resolve, r.waited.reject);
  r.waited.promise.then(y, y);
  return promise;
}
//@ chunk-e6aww6q8.js:4012715-4013184 placement
/**
 * 把调用排到已打开的相同调用之后，等其完成或被要求时再继续。
 */
function queueBehindOpenCall(e, n, r) {
  let deferred = Promise.withResolvers();
  return Promise.race([n.waited.promise, deferred.promise])
    .finally(
      forwardAbort(r.asked.signal, {
        abort: deferred.reject,
      }),
    )
    .then(
      () => {
        r.asked.signal?.throwIfAborted();
        return sendTrackedCall(
          e,
          {
            asked: r.asked,
            waited: Promise.withResolvers(),
          },
          r.send,
        );
      },
      (error) => {
        if (
          (error instanceof AskRefusedError && error.asked === apiMethodLabel(n.asked.call)) ||
          r.asked.signal?.aborted === true
        )
          throw error;
        if (n.heir !== undefined) return queueBehindOpenCall(e, n.heir, r);
        n.heir = {
          asked: r.asked,
          waited: Promise.withResolvers(),
        };
        return sendTrackedCall(e, n.heir, r.send);
      },
    );
}
//@ chunk-e6aww6q8.js:4013227-4013322 placement
/**
 * 深比较（RangeError 当不等）
 */
function deepEqualSafe(e, n) {
  try {
    return isDeepStrictEqual(e, n);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return false;
  }
}
//@ chunk-e6aww6q8.js:4013365-4013458 placement
/**
 * 可枚举自有键
 */
var enumerableOwnKeys = (e) =>
  Reflect.ownKeys(e).filter((n) => Object.prototype.propertyIsEnumerable.call(e, n));
//@ chunk-e6aww6q8.js:4013458-4014051 placement
/**
 * 深比较中的一步：比较一对值并记录已比较过的对象，用于判断两次调用是否相同。
 */
function compareStep([e, n], r, s) {
  if (!(typeof e === "object" && e !== null && typeof n === "object" && n !== null)) {
    r.isSame = Object.is(e, n);
    return r.isSame ? s : undefined;
  }
  if (e === n || r.met.get(e) === n) return s;
  if (!(
    ((Array.isArray(e) && Array.isArray(n) && e.length === n.length) ||
      (isPlainDataObject(e) && isPlainDataObject(n))) &&
    Object.getPrototypeOf(e) === Object.getPrototypeOf(n)
  )) {
    r.isSame = deepEqualSafe(e, n);
    return r.isSame ? s : undefined;
  }
  let w = enumerableOwnKeys(e);
  let L =
    w.length === enumerableOwnKeys(n).length &&
    w.every((q) => Object.prototype.propertyIsEnumerable.call(n, q));
  let G = (s?.depth ?? 0) + 1;
  if (!L) {
    r.isSame = false;
    return;
  }
  if (G > MAX_NESTING_DEPTH) throw new HooksError(NESTING_TOO_DEEP_MESSAGE);
  r.met.set(e, n);
  return {
    first: e,
    second: n,
    keys: w,
    at: 0,
    depth: G,
    below: s,
  };
}
//@ chunk-e6aww6q8.js:4014051-4014288 placement
function iterativeDeepEqual(e, n) {
  let r = {
    met: new Map(),
    isSame: true,
  };
  let s = compareStep([e, n], r, undefined);
  while (s !== undefined) {
    let { keys, at } = s;
    if (at < keys.length) {
      let S = keys[at] ?? "";
      s.at = at + 1;
      s = compareStep([Reflect.get(s.first, S), Reflect.get(s.second, S)], r, s);
    } else s = s.below;
  }
  return r.isSame;
}
//@ chunk-e6aww6q8.js:4014288-4014390 placement
/**
 * 深比较两值：先用 isDeepStrictEqual，栈溢出（RangeError）时改用迭代比较。
 */
function safeDeepEqual(e, n) {
  try {
    return isDeepStrictEqual(e, n);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return iterativeDeepEqual(e, n);
  }
}
//@ chunk-e6aww6q8.js:4014390-4014807 placement
/**
 * 找出与当前调用完全相同（同发起者、被调者与事件）的仍在进行中的调用。
 */
function findIdenticalOpenCalls(callsInChain, n) {
  try {
    return callsInChain.filter(
      ({ asked }) =>
        n.isAgain &&
        asked.maker === n.maker &&
        asked.callee === n.callee &&
        asked.judging !== n.judging &&
        asked.judging.event === n.judging.event &&
        asked.call.name === n.call.name &&
        asked.call.method === n.call.method &&
        safeDeepEqual(asked.call.args, n.call.args) &&
        safeDeepEqual(asked.judging.payload, n.judging.payload),
    );
  } catch (error) {
    logForDebugging(
      `${apiMethodLabel(n.call)}: ${n.maker}'s open calls could not be compared (${errorMessage(error)}); sent at once`,
      {
        level: "error",
      },
    );
    return [];
  }
}
//@ chunk-e6aww6q8.js:4014807-4015204 placement
/**
 * 同一插件为同一事件第三次发出相同的开放调用时，让它排在第二次后面（第二次无答复则一起结束）。
 */
function dedupeRepeatedCall(e, lentCallAsk, r) {
  let callsInChain = openCallsInChain(e, lentCallAsk);
  let identicalOpenCalls = findIdenticalOpenCalls(callsInChain, lentCallAsk);
  let found = identicalOpenCalls.slice(1).find((identicalOpenCall) => identicalOpenCall.asked.isRepeat);
  let asked = withAskChain(lentCallAsk, callsInChain, identicalOpenCalls);
  if (found === undefined)
    return sendTrackedCall(
      e,
      {
        asked,
        waited: Promise.withResolvers(),
      },
      r,
    );
  logForDebugging(
    `${apiMethodLabel(lentCallAsk.call)}: ${lentCallAsk.maker} makes the same call again for the same ${lentCallAsk.judging.event}; the third identical open call waits behind the second, and ends with it if the second goes unanswered`,
  );
  return queueBehindOpenCall(e, found, {
    asked,
    send: r,
  });
}
//@ chunk-e6aww6q8.js:4015204-4016330 placement
/**
 * 说明某个 $ 接口当前不可用的原因：提供它的插件未加载、尚未被 plugin.register 接纳、或策略已变。
 */
function explainApiNotAvailable(e, { caller, ...r }, { owner, name: h, method, args }) {
  let w = apiMethodLabel({
    name: h,
    method,
  });
  let building = e.building ?? [];
  let last = r.callers.at(-1);
  let any = building.some((ze) => ze.environmentId === last);
  let loadedModules = getPluginRegistry().loadedModules;
  let found = (any ? [...building, ...loadedModules] : [...loadedModules, ...building]).find(
    (ze) => ze.name === owner,
  );
  if (found === undefined)
    return Promise.reject(new HooksError(`${w}: plugin ${owner}, which provides $.${h}, is not loaded`));
  let found_2 = loadedModules.find((loadedModule) => loadedModule.environmentId === last);
  if (!isModuleAdmitted(found) || (found_2 !== undefined && !isModuleAdmitted(found_2)))
    return Promise.reject(
      new HooksError(
        `$.${h}.${method}: plugin ${owner}, which provides $.${h}, or its caller ${caller} was judged under a policy that has since changed, and is off until judged under the one in force`,
      ),
    );
  if (e.unadmitted.has(found.environmentId))
    return Promise.reject(
      new HooksError(
        `${w}: plugin ${owner}, which provides $.${h}, is not admitted yet (plugin.register decides it after its caller)`,
      ),
    );
  let startTime = performance.now();
  let Ae = {
    owner,
    name: h,
    method,
    args,
  };
  let Ie = () => found.callInterface(Ae, r);
  let lentCallAsk = buildLentCallAsk(r, found.environmentId, Ae);
  return (lentCallAsk !== undefined ? dedupeRepeatedCall(e, lentCallAsk, Ie) : Ie()).then(
    (ze) => {
      logForDebugging(
        `${w} (${caller} -> ${owner}) answered in ${(performance.now() - startTime).toFixed(1)}ms`,
      );
      return ze;
    },
    (error) => {
      logForDebugging(`${w} (${caller} -> ${owner}) failed: ${errorMessage(error)}`, {
        level: "error",
      });
      throw error;
    },
  );
}
//@ chunk-e6aww6q8.js:4016330-4016365 placement
/**
 * 会话授权接口
 */
var SESSION_AUTHORIZE = {
  run: (e, n) => sessionAuthorizeForPlugin(n.plugin),
};
//@ chunk-e6aww6q8.js:4016365-4016439 placement
/**
 * 是否可读会话身份
 */
function canReadSessionIdentity(e, n) {
  let r = admittedArgs(e, n);
  return r !== undefined && isVouchedPolicyPluginId(r.pluginStorageId);
}
//@ chunk-e6aww6q8.js:4016439-4016501 placement
/**
 * $.session.identity 实现
 */
var sessionIdentityApi = (e) => ({
  run: async (n, r) => (canReadSessionIdentity(e, r) ? sessionIdentity() : identityRefusal(r.plugin)),
});
//@ chunk-e6aww6q8.js:4016501-4016554 placement
/**
 * 取插件存储 id
 */
var storageIdOf = (e, plugin) => e.knownArgs.get(plugin)?.pluginStorageId ?? plugin;
//@ chunk-e6aww6q8.js:4016554-4016646 placement
/**
 * 有 deny 即抛 HooksError
 */
async function throwIfDenied(e, n, r) {
  if (r.deny !== undefined) throw new HooksError(`${e.plugin}: $.${n}: ${r.deny}`);
}
//@ chunk-e6aww6q8.js:4016646-4016942 placement
var createTelemetryOp = (e, defaultRoute) => async (r, s) => {
  let h = defaultRoute(r);
  let y = envSiteRuleFor(e);
  let S = hookMembersFor(e, s.origin, {
    ...(y.pinnedKeys !== undefined && {
      pinned: {
        keys: y.pinnedKeys,
        e: h,
      },
    }),
  });
  return S.length === 0
    ? undefined
    : throwIfDenied(
        s,
        e,
        await runInScope(s.scopeHolder?.scope, () =>
          reportChainFailure({
            e: h,
            handlers: S,
            site: y,
            signal: s.signal,
            origin: hookOriginFromStack(s.origin),
            bottom: async () => ({
              value: undefined,
            }),
          }),
        ),
      );
};
//@ chunk-e6aww6q8.js:4016942-4017154 placement
/**
 * $.telemetry.log 表项：校验 to（anthropic 或 collector）并经钩子链记录。
 */
var TELEMETRY_LOG_API = {
  check: (e) => {
    let to = isPlainObject_5(e) ? e.to : undefined;
    return isPlainObject_5(e) && (to === undefined || to === "anthropic" || to === "collector")
      ? undefined
      : 'takes an entry ({ to?, event, ... }, to "anthropic" or "collector")';
  },
  run: createTelemetryOp("telemetry.log", defaultRoute),
};
//@ chunk-e6aww6q8.js:4017154-4017274 placement
/**
 * $.telemetry.mark 表项：校验条目并经钩子链记录特性标记。
 */
var TELEMETRY_MARK_API = {
  check: (e) => (isPlainObject_5(e) ? undefined : "takes an entry ({ feature, kind, reason?, props? })"),
  run: createTelemetryOp("telemetry.mark", (e) => e),
};
//@ chunk-e6aww6q8.js:4017274-4017288 placement
/**
 * 60000
 */
var CALL_TIMEOUT_MS = 60000;
//@ chunk-e6aww6q8.js:4017288-4017450 placement
/**
 * 生成并记录"$.方法: 某文本（N 字符）保留规则"的说明文本。
 */
function describeTruncation({ plugin, spelling, what, name: s, length: h, kept }) {
  let S = `$.${spelling}: ${what}${s === undefined ? "" : ` of ${s}`} (${h} characters) ${kept}`;
  logForDebugging(`${plugin}: ${S}`);
  return S;
}
export {
  safeDeepEqual,
  throwIfDenied,
  promptBoxForPlugin,
  noteWorkersLoaded,
  workerSlots,
  storageIdOf,
  requireLoadedPluginArgs,
  loadConfigRowHandles,
  admittedArgs,
  getErrnoPath,
  appendCallerFrame,
  isUiRenderEvent,
  describeTruncation,
  telemetryCallArgs,
  telemetryNamesForPlugin,
  pluginNameOrFallback,
  explainApiNotAvailable,
  SESSION_AUTHORIZE,
  sessionIdentityApi,
  submitWaitHazard,
  PROMPT_BOX_READ,
  ATTACHMENT_READ_API,
  readPromptBoxForPlugin,
  hasOtherPromptRead,
  promptComposeForPlugin,
  wrapAgentSpawnOp,
  isOfficialMarketplace,
  TELEMETRY_LOG_API,
  TELEMETRY_MARK_API,
  CALL_TIMEOUT_MS,
  nowAsync,
  CLOCK_METHOD,
  HTTP_FETCH_API,
  bindPluginCall,
  refuseUnadmittedApiCall,
  staleAdmittingList,
  returnValue,
  streamHookedApiCall,
  policyChangedRefusal,
  trackPluginOp,
  buildHookEnvironment,
  cwdFromOrCall,
  createHostDispatchState,
  bumpPluginEpochs,
  countActingOps,
  scheduleCallTimeout,
  rejectPendingCall,
  settleCallRejection,
  buildCallerChain,
  collectLentFrames,
  inheritDispatchFacts,
  isCurrentPendingCall,
  isSamePressOwner,
  latestGestureAt,
  isModelOriginToolCall,
  claimSpawnServed,
  unrefTimer,
};
