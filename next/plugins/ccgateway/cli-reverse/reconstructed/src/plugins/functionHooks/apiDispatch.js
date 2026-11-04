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
import { mediaHoldStore, NO_INFLIGHT_ATTACHMENT } from "../../utils/attachmentMedia.js";
import { readPromptBox, normalizePromptBox, EMPTY_PROMPT_DRAFT } from "./promptApi.js";
import { judgeHookInput } from "./dispatch/inputJudging.js";
import { errorMessage } from "../../utils/errors.js";
import { isPlainDataObject } from "../../utils/hooks/functionHookMatchers.js";
import { MAX_NESTING_DEPTH, NESTING_TOO_DEEP_MESSAGE } from "../../utils/structuredCloneLimits.js";
import { isVouchedPolicyPluginId } from "../../utils/plugins/managedPlugins.js";
import { defaultRoute } from "./eventPayloads.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3709715-3709728 placement
/**
 * 插件 worker 槽位表
 */
var workerSlots; // deferred: uses createWorkerSlots (./hooksWorker.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3709715", () => {
  workerSlots = createWorkerSlots();
});
//@ chunk-e6aww6q8.js:3709728-3709819 placement
/**
 * 登记已加载的 worker 并通知
 */
function noteWorkersLoaded(loadedModules) {
  workerSlots.notifyLoaded(new Set(loadedModules.map((loadedModule) => loadedModule.name)));
  workersLoadedReporter.get()?.(loadedModules);
  loadedModules.forEach(logModLoaded);
}
//@ chunk-e6aww6q8.js:3709819-3709863 placement
/**
 * 拒绝某个挂起调用
 */
var rejectPendingCall = (pending, environmentId, reason) =>
  takePending(pending, environmentId)?.reject(new HooksError(reason));
//@ chunk-e6aww6q8.js:3709863-3709956 placement
/**
 * 删除挂起调用并拒绝
 */
function settleCallRejection(pending) {
  if (pending.pendingCalls.delete(pending.callId)) {
    pending.settleIdle();
    pending.reject(new HooksError(pending.reason));
  }
}
//@ chunk-e6aww6q8.js:3709956-3710027 placement
/**
 * 定时让调用超时
 */
function scheduleCallTimeout(pendingLoads, environmentId, reason) {
  let timer = setTimeout(rejectPendingCall, HOOKS_READY_TIMEOUT_MS, pendingLoads, environmentId, reason);
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
  for (let environmentId of environments) {
    let entry = work.get(environmentId) ?? {
      ops: 0,
      epoch: 0,
    };
    work.set(environmentId, entry);
    entry.epoch += 1;
  }
}
//@ chunk-e6aww6q8.js:3710144-3710273 placement
/**
 * 为插件记一次进行中的操作（时钟类不计数）并递增 epoch，返回结束回调。
 */
function trackPluginOp(work, environmentId, method) {
  let weight = isClockMethod(method) ? 0 : 1;
  let entry = work.get(environmentId) ?? {
    ops: 0,
    epoch: 0,
  };
  work.set(environmentId, entry);
  entry.ops += weight;
  entry.epoch += 1;
  return () => {
    entry.ops -= weight;
    entry.epoch += 1;
  };
}
//@ chunk-e6aww6q8.js:3710273-3710462 placement
/**
 * 统计匹配插件的进行中操作数与 epoch 总和（含进行中的非时钟分发）。
 */
function countActingOps(work, envs, predicate) {
  let filtered = [...work].filter(([env]) => predicate(env));
  return {
    acting:
      filtered.reduce((acc, [, domainOf]) => acc + domainOf.ops, 0) +
      count([...envs], (env) => !isClockMethod(env.event) && env.environments.some(predicate)),
    epoch: filtered.reduce((acc, [, entry]) => acc + entry.epoch, 0),
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
var isCurrentPendingCall = (pending, key, call) => () =>
  call !== undefined && key !== undefined && pending.get(key) === call;
//@ chunk-e6aww6q8.js:3710743-3710902 placement
/**
 * 判断调用是否来自模型发起的工具调用（无来源链、事件为 tool.call 且是插件工具）。
 */
function isModelOriginToolCall(dispatch, environmentId) {
  let hasNoOrigin = dispatch !== undefined && (dispatch.origin === undefined || dispatch.origin.length === 0);
  let tool = dispatch?.event === "tool.call" ? dispatch.tool : undefined;
  let isModelTool = tool === AGENT || (tool !== undefined && isToolFromServer(environmentId, tool));
  return hasNoOrigin && isModelTool;
}
//@ chunk-e6aww6q8.js:3710902-3710972 placement
/**
 * 按压归属是否一致
 */
var isSamePressOwner = (call, environmentId) =>
  isPersonInputEvent(call?.event) && call?.pressOwner !== undefined && call.pressOwner === environmentId;
//@ chunk-e6aww6q8.js:3710972-3711017 placement
/**
 * ui.render/ui.focus
 */
var isUiRenderEvent = (rootEvent) => rootEvent === "ui.render" || rootEvent === "ui.focus";
//@ chunk-e6aww6q8.js:3711017-3711220 placement
/**
 * 继承调用方的分发事实：仍在分发中时沿用，必要时去掉根事件。
 */
function inheritDispatchFacts(servedCall, environmentId, secondEnvironmentId) {
  let facts = servedCall?.facts;
  let isDispatching = facts?.isDispatching?.() === true;
  let isUiRenderFromOther = isUiRenderEvent(facts?.rootEvent) && servedCall?.callers.at(-1) !== environmentId;
  return isDispatching
    ? {
        ...facts,
        ...(isUiRenderFromOther && {
          rootEvent: undefined,
        }),
        isDispatching: () => secondEnvironmentId() && facts?.isDispatching?.() === true,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:3711220-3711356 placement
/**
 * 取某环境最近一次用户手势的时间。
 */
function latestGestureAt(presses, environmentId) {
  let flattened = [...presses]
    .filter((press) => press.environmentId === environmentId)
    .flatMap((at) => at.gestureAt ?? []);
  return flattened.length === 0 ? undefined : Math.max(...flattened);
}
//@ chunk-e6aww6q8.js:3711356-3711430 placement
/**
 * 标记 spawn 已被处理一次
 */
var claimSpawnServed = (record) => () => {
  let isFirst = record.isSpawnServed !== true;
  record.isSpawnServed = true;
  return isFirst;
};
//@ chunk-e6aww6q8.js:3711430-3711759 placement
/**
 * 收集借给被调插件且尚未过期的调用帧（按帧去重）。
 */
function collectLentFrames(records, callee) {
  let now = Date.now();
  let filtered = [...records]
    .filter((record) => record.callee === callee)
    .flatMap((lent) => lent.lent)
    .filter((frame) => now < frame.until);
  let byOrigin = new Map();
  for (let next of filtered) {
    let key = originKey(next.frame);
    let previous = byOrigin.get(key) ?? next;
    byOrigin.set(key, {
      frame: previous.frame,
      until: Math.max(previous.until, next.until),
      alike: uniq([...(previous.alike ?? []), ...(next.alike ?? []), next.frame]),
    });
  }
  return filtered.length === 0
    ? undefined
    : {
        lent: [...byOrigin.values()],
      };
}
//@ chunk-e6aww6q8.js:3711759-3711821 placement
/**
 * 追加调用者帧（去重）
 */
function appendCallerFrame(chain, frame) {
  return [...(chain ?? []).filter((entry) => !sameOrigin(entry, frame)), frame];
}
//@ chunk-e6aww6q8.js:3711821-3712744 placement
/**
 * 计算一次钩子调用的调用者链（借用帧、持有关系），并更新链上各模块的借用信息。
 */
function buildCallerChain(pluginId, { dispatch, held, registration, served }) {
  let now = Date.now();
  let lent = registration === undefined ? served?.lent : undefined;
  let lentModules = held && lentModulesByChain().get(held);
  let filtered = held?.filter(
    (handler, index) => lentModules?.[index]?.isLent !== true || lentModules[index].isHeld === true,
  );
  let isLive = (entry) => now < entry.until || filtered?.includes(entry.frame) === true;
  let filtered_2 = lent?.filter((entry) => isLive(entry) && originPlugin(entry.frame) !== pluginId);
  let frames = filtered_2?.map((entry) => entry.frame) ?? dispatch?.origin;
  let chain = appendCallerFrame(
    frames,
    dispatch !== undefined && registration !== undefined
      ? {
          plugin: pluginId,
          registration,
        }
      : pluginId,
  );
  let moduleStates =
    filtered_2?.map((entry) => ({
      until: entry.until,
      isLent: true,
      isHeld: filtered?.includes(entry.frame) === true,
      alike: entry.alike,
    })) ?? (frames === undefined ? frames : lentModulesByChain().get(frames));
  let reduced = lent?.reduce((acc, entry) => Math.max(acc, entry.until), Number.NEGATIVE_INFINITY);
  let pendingByFrame = new Map(frames?.map((frame, index) => [frame, moduleStates?.[index]]));
  if (reduced !== undefined && Number.isFinite(reduced) && now < reduced)
    pendingByFrame.set(pluginId, {
      until: reduced,
      isLent: false,
      isHeld: false,
    });
  if (moduleStates !== undefined) {
    let lastIndex = chain.length - 1;
    lentModulesByChain().set(
      chain,
      chain.map((frame, index) => ({
        until: pendingByFrame.get(frame)?.until ?? Number.POSITIVE_INFINITY,
        isLent: index < lastIndex && pendingByFrame.get(frame)?.isLent === true,
        isHeld: index < lastIndex && pendingByFrame.get(frame)?.isHeld === true,
        alike: pendingByFrame.get(frame)?.alike,
      })),
    );
  }
  return chain;
}
//@ chunk-e6aww6q8.js:3712744-3714060 placement
/**
 * 为一次钩子调用构造执行环境（插件身份、可用接口、取消信号）。
 */
function buildHookEnvironment({ state }, env, signal) {
  let { environmentId, dispatchId, registration, serving } = env;
  let servedCall = serving === undefined ? undefined : state.servedCalls.get(serving);
  let dispatch = dispatchId === undefined ? undefined : state.dispatches.get(dispatchId);
  let envName = state.names.get(environmentId);
  let included = dispatch?.environments.includes(environmentId);
  let isCallee = servedCall?.callee === environmentId;
  let isUnregistered = registration === undefined;
  let isOutsideDispatch = isUnregistered && included !== true;
  let isServedByCallee = isUnregistered && isCallee;
  let inheritedDispatch = isOutsideDispatch || isServedByCallee ? undefined : dispatch;
  let inheritedFacts = isServedByCallee
    ? inheritDispatchFacts(
        servedCall,
        environmentId,
        isCurrentPendingCall(state.servedCalls, serving, servedCall),
      )
    : undefined;
  let effectiveDispatch = isServedByCallee ? inheritedFacts : inheritedDispatch;
  let isPersonInput = isUnregistered && isPersonInputEvent(effectiveDispatch?.rootEvent);
  let isSamePress = !isUnregistered && isSamePressOwner(inheritedDispatch, envName);
  let hasDispatch = !isUnregistered && inheritedDispatch !== undefined;
  let listedMedia = isUnregistered ? undefined : inheritedDispatch?.listedMedia;
  let isStandalone = isUnregistered && !isServedByCallee;
  let gestureAt = isStandalone ? latestGestureAt(state.sentPresses, environmentId) : undefined;
  let effectiveGestureAt = isSamePress ? inheritedDispatch?.gestureAt : gestureAt;
  let keptPress = isStandalone ? pressForEnv(state.keptPresses, env.pressing, environmentId) : undefined;
  let needsRootEvent = inheritedDispatch === undefined && !isCallee && env.rootEvent === undefined;
  let calleeCall = isCallee ? servedCall : undefined;
  let modelCall =
    !isUnregistered && included === true && envName !== undefined && isModelOriginToolCall(dispatch, envName)
      ? dispatch
      : undefined;
  return {
    plugin: envName ?? `environment ${environmentId}`,
    signal,
    origin:
      envName === undefined
        ? (dispatch?.origin ?? [])
        : buildCallerChain(envName, {
            dispatch: inheritedDispatch,
            held: needsRootEvent ? undefined : dispatch?.origin,
            registration: needsRootEvent ? undefined : registration,
            served: needsRootEvent
              ? collectLentFrames(state.servedCalls.values(), environmentId)
              : calleeCall,
          }),
    turnHeld: effectiveDispatch?.turnHeld,
    rootEvent: (isPersonInput ? undefined : effectiveDispatch?.rootEvent) ?? env.rootEvent,
    ownRoot: env.rootEvent,
    ...(effectiveGestureAt !== undefined && {
      vouchedPressAt: effectiveGestureAt,
    }),
    ...(keptPress !== undefined && {
      answersPress: keptPress,
    }),
    ...(modelCall !== undefined && {
      isModelCallServed: true,
      takeServedSpawn: claimSpawnServed(modelCall),
    }),
    ...(!isUnregistered &&
      inheritedDispatch?.isPersonInput === true && {
        isPersonInput: true,
      }),
    ...(hasDispatch && {
      judging: inheritedDispatch,
    }),
    ...(listedMedia !== undefined && {
      listedMedia,
    }),
    cwd: effectiveDispatch?.cwd,
    isDispatching: isServedByCallee
      ? inheritedFacts?.isDispatching
      : isCurrentPendingCall(state.dispatches, dispatchId, inheritedDispatch),
    scopeHolder: (included === true ? dispatch : undefined) ?? calleeCall,
    environmentId,
    ...(isCallee && {
      callers: servedCall.callers,
    }),
  };
}
//@ chunk-e6aww6q8.js:3714060-3714110 placement
/**
 * 有 cwd 用之，否则调用
 */
function cwdFromOrCall(hookEnvironment, ctx) {
  return hookEnvironment.cwd === undefined ? runOrExit(ctx) : ctx();
}
//@ chunk-e6aww6q8.js:3714110-3714167 placement
/**
 * 调用者链
 */
function callerChain(env) {
  return [...(env.callers ?? []), env.environmentId];
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
function policyChangedRefusal(env, reason) {
  let chain = callerChain(env);
  return getPluginRegistry().loadedModules.some(
    (loadedModule) => chain.includes(loadedModule.environmentId) && !isModuleAdmitted(loadedModule),
  )
    ? new HooksError(
        `${env.plugin}: $.${reason} refused: its hooks module was judged under a policy that has since changed, and is off until it is judged under the one in force`,
      )
    : undefined;
}
//@ chunk-e6aww6q8.js:3714476-3714912 placement
/**
 * 被扣留名词的调用遭拒时生成拒绝说明，并对每个插件/名词只记录一次日志。
 */
function withheldCallRefusal(state, { plugin, spelling, by }) {
  let message = removedByPluginText(spelling, by);
  let logKey = `${plugin}:${namespaceOf(spelling)}`;
  if (!state.refusalsLogged.has(logKey)) {
    state.refusalsLogged.add(logKey);
    let refuse = state.knownArgs.get(plugin);
    let secondMessage = refuse ? pluginStorageKey(refuse) : plugin;
    logForDebugging(
      `hooks module ${secondMessage}: ${message} (withheld at engine.create; the call reached the host past $'s stub: through a table a step captured from next(e), or through a $ built before the withholding); later calls on $.${namespaceOf(spelling)} are refused without a line`,
      {
        level: "warn",
      },
    );
  }
  return message;
}
//@ chunk-e6aww6q8.js:3714912-3715003 placement
/**
 * 找持有该帧的崩溃者
 */
function findCrashedWithholder(state, plugin, spelling) {
  for (let [withholder, spellings] of state.crashedWithholders)
    if (withholder !== plugin && spellings.has(spelling)) return withholder;
  return;
}
//@ chunk-e6aww6q8.js:3715003-3715272 placement
function findStagedRefusal(state, caller, secondCaller) {
  let { staged, stagedBefore, building } = state;
  let isStaged =
    caller.environmentId !== undefined &&
    building?.some((refusal) => refusal.environmentId === caller.environmentId) === true;
  return (
    (isStaged ? staged?.refuser(caller.plugin, secondCaller) : undefined) ??
    (isStaged ? stagedBefore?.refuser(caller.plugin, secondCaller) : undefined) ??
    state.withheld.refuser(caller.plugin, secondCaller) ??
    findCrashedWithholder(state, caller.plugin, secondCaller)
  );
}
//@ chunk-e6aww6q8.js:3715272-3715572 placement
/**
 * 检查 hooks 模块的静态扫描是否列出了某 $ 调用；未加载或未列出时返回宿主规则说明。
 */
function scanAllowsCall(scan, spelling) {
  if (!scan) return "no hooks module of that name is loaded, so there is no scan to allow it (host rule)";
  let included = scan.calls.includes(spelling);
  let reason = scan.calls.length === 0;
  return included
    ? undefined
    : "its hooks module does not call it (host rule; the scan lists " +
        (reason ? "no calls" : scan.calls.map((missing) => `$.${missing}`).join(", ")) +
        ")";
}
//@ chunk-e6aww6q8.js:3715572-3716099 placement
function refuseUnadmittedApiCall(runtime, { spelling, caller, isClock }) {
  let known = runtime.state.knownArgs.get(caller.plugin);
  let refusal = scanAllowsCall(known?.scan, spelling);
  if (known === undefined || refusal !== undefined)
    throw new HooksError(`${caller.plugin}: $.${spelling} refused: ${refusal}`);
  let stagedRefusal = findStagedRefusal(runtime.state, caller, namespaceOf(spelling));
  if (stagedRefusal !== undefined)
    throw new HooksError(
      withheldCallRefusal(runtime.state, {
        plugin: caller.plugin,
        spelling,
        by: stagedRefusal,
      }),
    );
  let reason = policyChangedRefusal(caller, spelling);
  if (reason !== undefined) throw reason;
  if (
    callerChain(caller).some((message) => message !== undefined && runtime.state.unadmitted.has(message)) &&
    !isClock
  )
    throw new HooksError(
      `${caller.plugin}: $.${spelling} refused: a hooks module behind the call is not admitted (ops wait for the fold and plugin.register)`,
    );
  return known;
}
//@ chunk-e6aww6q8.js:3716099-3716275 placement (2.1.88 match: returnValue, 1)
async function* returnValue(args, ctx) {
  let done = false;
  try {
    for (;;) {
      let value = ctx();
      if (value !== undefined) throw value;
      let next = await args.next();
      if (next.done === true) {
        done = true;
        return next.value;
      }
      yield next.value;
    }
  } finally {
    if (!done) await closeGeneratorQuietly(args);
  }
}
//@ chunk-e6aww6q8.js:3716275-3716501 placement
/**
 * 判断正在准入的插件列表是否已过期（环境已不在已加载模块中）。
 */
function staleAdmittingList(state, env) {
  let admitting = state.admitting ?? [];
  let index = admitting.findIndex((entry) => entry.environmentId === env.environmentId);
  let liveIds = new Set(getPluginRegistry().loadedModules.map((loadedModule) => loadedModule.environmentId));
  return admitting.slice(0, index + 1).some((index) => !liveIds.has(index.environmentId))
    ? state.admitting
    : undefined;
}
//@ chunk-e6aww6q8.js:3716501-3716552 placement (2.1.88 match: getErrnoPath, 0.778)
function getErrnoPath(hookContext) {
  return {
    field: "path",
    at: hookContext.cwd ?? getCwd(),
  };
}
//@ chunk-e6aww6q8.js:3716552-3716604 placement
/**
 * 取已接纳的参数
 */
var admittedArgs = (runtime, caller) => caller.admitted ?? runtime.knownArgs.get(caller.plugin);
//@ chunk-e6aww6q8.js:3716604-3716716 placement
/**
 * 取已加载插件的参数，插件未加载时抛 HooksError。
 */
function requireLoadedPluginArgs(runtime, caller, spelling) {
  let admitted = admittedArgs(runtime, caller);
  if (admitted === undefined) throw new HooksError(`${caller.plugin}: ${spelling}: not a loaded plugin`);
  return admitted;
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
var sleepWithSignal = (args, reason) =>
  sleep(args.ms, reason, {
    ...(reason && {
      abortError: () => asHooksError(reason),
    }),
  });
//@ chunk-e6aww6q8.js:3718058-3718180 placement
function checkSleepArgs(args) {
  let ms = args?.ms;
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
  run: (args, ctx) => sleepWithSignal(args, ctx.signal),
};
//@ chunk-e6aww6q8.js:3718227-3718367 placement
/**
 * 加载 /config 行句柄（按需导入），供插件读取配置行。
 */
async function loadConfigRowHandles(pluginName, arg) {
  let bound = requireBoundSession(pluginName, arg);
  let { configRowHandles } = await import("../../commands/config/configShorthand.js");
  return configRowHandles(bound.toolContext(new AbortController()));
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
  let members = streamMembersFor(event, caller.origin);
  let signal = caller.signal ?? new AbortController().signal;
  if (members.length === 0 && bottom) return bottom.stream(args, caller);
  let streamResult = awaitHooksRespawn(
    {
      event,
      e: args,
      origin: caller.origin,
    },
    caller.signal,
  );
  if (streamResult !== undefined)
    return afterThenYield(streamResult, () =>
      streamHookedApiCall({
        event,
        args,
        caller,
        bottom,
      }),
    );
  let stream = "nothing";
  let blocked = () => void (stream = "started");
  function index(member) {
    stream = "ran";
    return member;
  }
  let bottom_2 =
    bottom &&
    ((secondIndex, signal) => {
      let member = bottom.check?.(secondIndex, caller);
      if (member !== undefined) throw new HooksError(`${event}: ${member} (host check)`);
      let result = bottom.stream(secondIndex, {
        ...caller,
        signal,
      });
      return (async function* () {
        return {
          value: index(yield* forwardGeneratorWithErrorHook(result, blocked)),
        };
      })();
    });
  let thirdIndex = reportStreamChainFailure({
    e: args,
    handlers: members,
    site: envSiteRuleFor(event),
    signal,
    origin: hookOriginFromStack(caller.origin),
    bottom: bottom_2,
  });
  return (async function* () {
    let index = yield* forwardGeneratorWithErrorHook(thirdIndex);
    if (index.deny !== undefined)
      throw new HooksError(`${caller.plugin}: $.${event}${WITHHELD_RESULT_SUFFIXES[stream]}: ${index.deny}`);
    return index.value;
  })();
}
//@ chunk-e6aww6q8.js:4008720-4008893 placement
/**
 * 包装 $.agent.spawn：检查输入暂扣，服务模型发起的派生标记 servesModel。
 */
var wrapAgentSpawnOp = (spawn) => (args, ctx) => {
  let isServed = ctx.takeServedSpawn?.() === true;
  let refusal = isServed ? undefined : submitHoldRefusal(ctx, "$.agent.spawn");
  if (refusal === undefined)
    return spawn(
      args,
      isServed
        ? {
            ...ctx,
            servesModel: true,
          }
        : ctx,
    );
  return Promise.resolve({
    deny: refusal,
  });
};
//@ chunk-e6aww6q8.js:4008893-4009099 placement
/**
 * $.http.fetch 表项：参数为 URL，以插件身份调用 httpFetchForPlugin。
 */
var HTTP_FETCH_API = (runtime) => ({
  check: (args) => (typeof args?.url === "string" ? undefined : "takes a URL"),
  run: async (args, ctx) => {
    let { pluginName, pluginStorageId } = requireLoadedPluginArgs(runtime, ctx, "http.fetch");
    return httpFetchForPlugin(
      args,
      {
        pluginName,
        pluginStorageId,
      },
      ctx.signal,
    );
  },
});
//@ chunk-e6aww6q8.js:4009099-4009198 placement
/**
 * 绑定插件调用上下文
 */
var bindPluginCall = (run) => (args, ctx) =>
  run(args, ctx.plugin, {
    signal: ctx.signal,
    cwd: ctx.cwd,
    pluginId: ctx.admitted?.pluginStorageId,
  });
//@ chunk-e6aww6q8.js:4009198-4009271 placement
/**
 * 是否官方市场插件
 */
function isOfficialMarketplace(runtime, caller) {
  let admitted = admittedArgs(runtime, caller);
  return admitted !== undefined && isOfficialMarketplacePlugin(admitted.pluginStorageId);
}
//@ chunk-e6aww6q8.js:4009271-4009322 placement
/**
 * 是否有其他 prompt.read 插件
 */
var hasOtherPromptRead = (plugin) =>
  pluginsMatchingEvent("prompt.read", {}).some((thirdPlugin) => thirdPlugin !== plugin);
//@ chunk-e6aww6q8.js:4009322-4009374 placement
/**
 * 插件名或兜底
 */
var pluginNameOrFallback = (value, problem) =>
  typeof value !== "string" || value === "" ? problem : undefined;
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
var telemetryCallArgs = (telemetry, querySource) => [
  telemetry.plugin,
  {
    querySource,
    names: telemetryNamesForPlugin(telemetry),
    hookOrigin: telemetry.origin,
  },
  telemetry.signal,
];
//@ chunk-e6aww6q8.js:4009573-4010181 placement
/**
 * 插件 $.prompt.compose：为给定事实组装系统提示，本进程不组装时拒绝。
 */
var promptComposeForPlugin = {
  check: (args) => (isPlainObject_5(args) ? undefined : "takes the facts to compose for"),
  run: async (args, ctx) => {
    let { site } = PROMPT_COMPOSE_EVENT;
    let composer = promptComposer();
    let bound = requireBoundSession(ctx.plugin, "$.prompt.compose");
    let facts = await composer?.facts(bound.tools(), bound.model());
    if (facts === undefined)
      throw new HooksError(`${ctx.plugin}: $.prompt.compose: this process composes no system prompt`);
    let result = {
      ...facts,
      surfaces: attachedSurfaces(),
      ...args,
    };
    let composed = site.checkArgument?.(result, result);
    if (composed !== undefined) throw new HooksError(`${ctx.plugin}: $.prompt.compose: ${composed}`);
    let pinned = {
      keys: site.pinnedKeys ?? [],
      e: result,
    };
    let handlers = hookMembersFor("prompt.compose", ctx.origin, {
      pinned,
    });
    return runInScope(ctx.scopeHolder?.scope, () =>
      reportChainFailure({
        e: result,
        handlers,
        site,
        signal: ctx.signal,
        origin: hookOriginFromStack(ctx.origin),
        bottom: (output) => composeDetachedSections(output, ctx.origin),
      }),
    );
  },
};
//@ chunk-e6aww6q8.js:4010181-4010254 placement
/**
 * 是否在分发中列出该附件
 */
var isListedMediaDispatching = (env, id) =>
  env.listedMedia?.includes(id) === true && env.isDispatching?.() === true;
//@ chunk-e6aww6q8.js:4010254-4010632 placement
/**
 * $.prompt.attachment.read 表项：参数 {id, offset?}，只能读当前 prompt.submit 列出的附件。
 */
var ATTACHMENT_READ_API = {
  check: (args) => {
    let offset = args?.offset;
    let hasId = typeof args?.id === "string" && args.id !== "";
    let isValidOffset =
      offset === undefined || (typeof offset === "number" && Number.isSafeInteger(offset) && offset >= 0);
    return !hasId
      ? "takes { id } (an attachment's id, from the prompt.submit in flight)"
      : isValidOffset
        ? undefined
        : `takes offset, a whole number of bytes from 0 (got ${String(offset)})`;
  },
  run: async (args, ctx) => {
    let media = isListedMediaDispatching(ctx, args.id)
      ? await mediaHoldStore.read(args)
      : NO_INFLIGHT_ATTACHMENT;
    return isListedMediaDispatching(ctx, args.id) ? media : NO_INFLIGHT_ATTACHMENT;
  },
};
//@ chunk-e6aww6q8.js:4010632-4010672 placement
/**
 * 读提示框的接口实现
 */
var PROMPT_BOX_READ = {
  run: async (args, ctx) => readPromptBox(ctx.plugin),
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
var waitingOnTurnText = (hookEvent, verbPhrase) =>
  `called from a ${hookEvent} hook, it would wait on the turn this hook ${verbPhrase}; ${LATER_EVENT_HINT}`;
//@ chunk-e6aww6q8.js:4010815-4010981 placement
function classicHookWaitHazard(hookName) {
  return hookName !== undefined &&
    hookName.startsWith("classic.") &&
    hookName !== "classic.SessionStart" &&
    hookName !== "classic.Setup" &&
    hookName !== "classic.SessionEnd"
    ? waitingOnTurnText(hookName, "may be holding")
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
function submitWaitHazard(turnHeld) {
  if (turnHeld === "prompt.submit")
    return (
      "called from a prompt.submit hook, it would wait on the turn this hook is holding; answer { text } or next(e) instead, or " +
      LATER_EVENT_HINT
    );
  return turnHeld !== undefined && TURN_HOLDING_EVENTS.includes(turnHeld)
    ? waitingOnTurnText(turnHeld, "is holding")
    : classicHookWaitHazard(turnHeld);
}
//@ chunk-e6aww6q8.js:4011456-4011804 placement
/**
 * 把输入框内容交给调用 $.prompt.read 的插件；没有插件调用时直接返回 undefined。
 */
function readPromptBoxForPlugin(ctx, scan, spelling) {
  let refusal = scanAllowsCall(scan, "prompt.read");
  if (refusal !== undefined) {
    logForDebugging(
      `${spelling} (${ctx.plugin}): the box goes to plugins that call $.prompt.read; none (${refusal})`,
    );
    return Promise.resolve(undefined);
  }
  return judgeHookInput({
    event: "prompt.read",
    args: {},
    caller: ctx,
    ...(currentDispatch() === undefined && {
      bottom: PROMPT_BOX_READ,
    }),
  })
    .then(normalizePromptBox)
    .catch((error) => {
      logForDebugging(`${spelling} (${ctx.plugin}): the box is not answered: ` + errorMessage(error));
      return;
    });
}
//@ chunk-e6aww6q8.js:4011804-4011859 placement
/**
 * 取插件的提示框
 */
async function promptBoxForPlugin(ctx, scan, spelling) {
  return (await readPromptBoxForPlugin(ctx, scan, spelling)) ?? EMPTY_PROMPT_DRAFT;
}
//@ chunk-e6aww6q8.js:4011859-4012121 placement
function buildLentCallAsk({ lent, judging, signal }, callee, call) {
  let last = lent.at(-1);
  return judging !== undefined && last !== undefined
    ? {
        maker: originLabel(last.frame),
        isAgain: (judging.origin ?? []).some((origin) => originLabel(origin) === originLabel(last.frame)),
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
function withAskChain(ask, callsInChain, identicalOpenCalls) {
  return {
    ...ask,
    chain: callsInChain.map((call) => call.asked.frame),
    isRepeat: identicalOpenCalls.length > 0,
  };
}
//@ chunk-e6aww6q8.js:4012206-4012457 placement
function openCallsInChain({ sentCalls, chainsAbove }, call) {
  let origin = call.judging.origin ?? [];
  let frames = new Set(
    [...origin, ...(lentModulesByChain().get(origin) ?? []).flatMap((entry) => entry.alike ?? [])]
      .filter((frame) => typeof frame === "object")
      .flatMap((frame) => [frame, ...(chainsAbove.get(frame) ?? [])]),
  );
  return [...sentCalls].filter((sentCall) => frames.has(sentCall.asked.frame));
}
//@ chunk-e6aww6q8.js:4012457-4012715 placement
function sendTrackedCall({ sentCalls, chainsAbove }, call, send) {
  let promise = new Promise((resolve) => {
    resolve(send());
  });
  let remove = () => void sentCalls.delete(call);
  sentCalls.add(call);
  if (typeof call.asked.frame === "object") chainsAbove.set(call.asked.frame, call.asked.chain);
  promise.then(call.waited.resolve, call.waited.reject);
  call.waited.promise.then(remove, remove);
  return promise;
}
//@ chunk-e6aww6q8.js:4012715-4013184 placement
/**
 * 把调用排到已打开的相同调用之后，等其完成或被要求时再继续。
 */
function queueBehindOpenCall(state, openCall, call) {
  let deferred = Promise.withResolvers();
  return Promise.race([openCall.waited.promise, deferred.promise])
    .finally(
      forwardAbort(call.asked.signal, {
        abort: deferred.reject,
      }),
    )
    .then(
      () => {
        call.asked.signal?.throwIfAborted();
        return sendTrackedCall(
          state,
          {
            asked: call.asked,
            waited: Promise.withResolvers(),
          },
          call.send,
        );
      },
      (error) => {
        if (
          (error instanceof AskRefusedError && error.asked === apiMethodLabel(openCall.asked.call)) ||
          call.asked.signal?.aborted === true
        )
          throw error;
        if (openCall.heir !== undefined) return queueBehindOpenCall(state, openCall.heir, call);
        openCall.heir = {
          asked: call.asked,
          waited: Promise.withResolvers(),
        };
        return sendTrackedCall(state, openCall.heir, call.send);
      },
    );
}
//@ chunk-e6aww6q8.js:4013227-4013322 placement
/**
 * 深比较（RangeError 当不等）
 */
function deepEqualSafe(a, b) {
  try {
    return isDeepStrictEqual(a, b);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return false;
  }
}
//@ chunk-e6aww6q8.js:4013365-4013458 placement
/**
 * 可枚举自有键
 */
var enumerableOwnKeys = (value) =>
  Reflect.ownKeys(value).filter((key) => Object.prototype.propertyIsEnumerable.call(value, key));
//@ chunk-e6aww6q8.js:4013458-4014051 placement
/**
 * 深比较中的一步：比较一对值并记录已比较过的对象，用于判断两次调用是否相同。
 */
function compareStep([a, b], state, step) {
  if (!(typeof a === "object" && a !== null && typeof b === "object" && b !== null)) {
    state.isSame = Object.is(a, b);
    return state.isSame ? step : undefined;
  }
  if (a === b || state.met.get(a) === b) return step;
  if (!(
    ((Array.isArray(a) && Array.isArray(b) && a.length === b.length) ||
      (isPlainDataObject(a) && isPlainDataObject(b))) &&
    Object.getPrototypeOf(a) === Object.getPrototypeOf(b)
  )) {
    state.isSame = deepEqualSafe(a, b);
    return state.isSame ? step : undefined;
  }
  let key = enumerableOwnKeys(a);
  let left =
    key.length === enumerableOwnKeys(b).length &&
    key.every((right) => Object.prototype.propertyIsEnumerable.call(b, right));
  let seen = (step?.depth ?? 0) + 1;
  if (!left) {
    state.isSame = false;
    return;
  }
  if (seen > MAX_NESTING_DEPTH) throw new HooksError(NESTING_TOO_DEEP_MESSAGE);
  state.met.set(a, b);
  return {
    first: a,
    second: b,
    keys: key,
    at: 0,
    depth: seen,
    below: step,
  };
}
//@ chunk-e6aww6q8.js:4014051-4014288 placement
function iterativeDeepEqual(a, b) {
  let state = {
    met: new Map(),
    isSame: true,
  };
  let step = compareStep([a, b], state, undefined);
  while (step !== undefined) {
    let { keys, at } = step;
    if (at < keys.length) {
      let key = keys[at] ?? "";
      step.at = at + 1;
      step = compareStep([Reflect.get(step.first, key), Reflect.get(step.second, key)], state, step);
    } else step = step.below;
  }
  return state.isSame;
}
//@ chunk-e6aww6q8.js:4014288-4014390 placement
/**
 * 深比较两值：先用 isDeepStrictEqual，栈溢出（RangeError）时改用迭代比较。
 */
function safeDeepEqual(a, b) {
  try {
    return isDeepStrictEqual(a, b);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return iterativeDeepEqual(a, b);
  }
}
//@ chunk-e6aww6q8.js:4014390-4014807 placement
/**
 * 找出与当前调用完全相同（同发起者、被调者与事件）的仍在进行中的调用。
 */
function findIdenticalOpenCalls(callsInChain, ask) {
  try {
    return callsInChain.filter(
      ({ asked }) =>
        ask.isAgain &&
        asked.maker === ask.maker &&
        asked.callee === ask.callee &&
        asked.judging !== ask.judging &&
        asked.judging.event === ask.judging.event &&
        asked.call.name === ask.call.name &&
        asked.call.method === ask.call.method &&
        safeDeepEqual(asked.call.args, ask.call.args) &&
        safeDeepEqual(asked.judging.payload, ask.judging.payload),
    );
  } catch (error) {
    logForDebugging(
      `${apiMethodLabel(ask.call)}: ${ask.maker}'s open calls could not be compared (${errorMessage(error)}); sent at once`,
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
function dedupeRepeatedCall(state, lentCallAsk, send) {
  let callsInChain = openCallsInChain(state, lentCallAsk);
  let identicalOpenCalls = findIdenticalOpenCalls(callsInChain, lentCallAsk);
  let openCall = identicalOpenCalls.slice(1).find((identicalOpenCall) => identicalOpenCall.asked.isRepeat);
  let asked = withAskChain(lentCallAsk, callsInChain, identicalOpenCalls);
  if (openCall === undefined)
    return sendTrackedCall(
      state,
      {
        asked,
        waited: Promise.withResolvers(),
      },
      send,
    );
  logForDebugging(
    `${apiMethodLabel(lentCallAsk.call)}: ${lentCallAsk.maker} makes the same call again for the same ${lentCallAsk.judging.event}; the third identical open call waits behind the second, and ends with it if the second goes unanswered`,
  );
  return queueBehindOpenCall(state, openCall, {
    asked,
    send,
  });
}
//@ chunk-e6aww6q8.js:4015204-4016330 placement
/**
 * 说明某个 $ 接口当前不可用的原因：提供它的插件未加载、尚未被 plugin.register 接纳、或策略已变。
 */
function explainApiNotAvailable(state, { caller, ...ctx }, { owner, name: interfaceName, method, args }) {
  let label = apiMethodLabel({
    name: interfaceName,
    method,
  });
  let building = state.building ?? [];
  let last = ctx.callers.at(-1);
  let any = building.some((entry) => entry.environmentId === last);
  let loadedModules = getPluginRegistry().loadedModules;
  let found = (any ? [...building, ...loadedModules] : [...loadedModules, ...building]).find(
    (entry) => entry.name === owner,
  );
  if (found === undefined)
    return Promise.reject(
      new HooksError(`${label}: plugin ${owner}, which provides $.${interfaceName}, is not loaded`),
    );
  let found_2 = loadedModules.find((loadedModule) => loadedModule.environmentId === last);
  if (!isModuleAdmitted(found) || (found_2 !== undefined && !isModuleAdmitted(found_2)))
    return Promise.reject(
      new HooksError(
        `$.${interfaceName}.${method}: plugin ${owner}, which provides $.${interfaceName}, or its caller ${caller} was judged under a policy that has since changed, and is off until judged under the one in force`,
      ),
    );
  if (state.unadmitted.has(found.environmentId))
    return Promise.reject(
      new HooksError(
        `${label}: plugin ${owner}, which provides $.${interfaceName}, is not admitted yet (plugin.register decides it after its caller)`,
      ),
    );
  let startTime = performance.now();
  let provider = {
    owner,
    name: interfaceName,
    method,
    args,
  };
  let callerModule = () => found.callInterface(provider, ctx);
  let lentCallAsk = buildLentCallAsk(ctx, found.environmentId, provider);
  return (
    lentCallAsk !== undefined ? dedupeRepeatedCall(state, lentCallAsk, callerModule) : callerModule()
  ).then(
    (loadedModule) => {
      logForDebugging(
        `${label} (${caller} -> ${owner}) answered in ${(performance.now() - startTime).toFixed(1)}ms`,
      );
      return loadedModule;
    },
    (error) => {
      logForDebugging(`${label} (${caller} -> ${owner}) failed: ${errorMessage(error)}`, {
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
  run: (args, ctx) => sessionAuthorizeForPlugin(ctx.plugin),
};
//@ chunk-e6aww6q8.js:4016365-4016439 placement
/**
 * 是否可读会话身份
 */
function canReadSessionIdentity(runtime, caller) {
  let admitted = admittedArgs(runtime, caller);
  return admitted !== undefined && isVouchedPolicyPluginId(admitted.pluginStorageId);
}
//@ chunk-e6aww6q8.js:4016439-4016501 placement
/**
 * $.session.identity 实现
 */
var sessionIdentityApi = (runtime) => ({
  run: async (args, ctx) =>
    canReadSessionIdentity(runtime, ctx) ? sessionIdentity() : identityRefusal(ctx.plugin),
});
//@ chunk-e6aww6q8.js:4016501-4016554 placement
/**
 * 取插件存储 id
 */
var storageIdOf = (runtime, plugin) => runtime.knownArgs.get(plugin)?.pluginStorageId ?? plugin;
//@ chunk-e6aww6q8.js:4016554-4016646 placement
/**
 * 有 deny 即抛 HooksError
 */
async function throwIfDenied(ctx, spelling, result) {
  if (result.deny !== undefined) throw new HooksError(`${ctx.plugin}: $.${spelling}: ${result.deny}`);
}
//@ chunk-e6aww6q8.js:4016646-4016942 placement
var createTelemetryOp = (spelling, defaultRoute) => async (entry, ctx) => {
  let route = defaultRoute(entry);
  let site = envSiteRuleFor(spelling);
  let handlers = hookMembersFor(spelling, ctx.origin, {
    ...(site.pinnedKeys !== undefined && {
      pinned: {
        keys: site.pinnedKeys,
        e: route,
      },
    }),
  });
  return handlers.length === 0
    ? undefined
    : throwIfDenied(
        ctx,
        spelling,
        await runInScope(ctx.scopeHolder?.scope, () =>
          reportChainFailure({
            e: route,
            handlers,
            site,
            signal: ctx.signal,
            origin: hookOriginFromStack(ctx.origin),
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
var TELEMETRY_LOG_API; // deferred: uses createTelemetryOp of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:4016942", () => {
  TELEMETRY_LOG_API = {
    check: (entry) => {
      let to = isPlainObject_5(entry) ? entry.to : undefined;
      return isPlainObject_5(entry) && (to === undefined || to === "anthropic" || to === "collector")
        ? undefined
        : 'takes an entry ({ to?, event, ... }, to "anthropic" or "collector")';
    },
    run: createTelemetryOp("telemetry.log", defaultRoute),
  };
});
//@ chunk-e6aww6q8.js:4017154-4017274 placement
/**
 * $.telemetry.mark 表项：校验条目并经钩子链记录特性标记。
 */
var TELEMETRY_MARK_API; // deferred: uses createTelemetryOp of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:4017154", () => {
  TELEMETRY_MARK_API = {
    check: (entry) =>
      isPlainObject_5(entry) ? undefined : "takes an entry ({ feature, kind, reason?, props? })",
    run: createTelemetryOp("telemetry.mark", (entry) => entry),
  };
});
//@ chunk-e6aww6q8.js:4017274-4017288 placement
/**
 * 60000
 */
var CALL_TIMEOUT_MS = 60000;
//@ chunk-e6aww6q8.js:4017288-4017450 placement
/**
 * 生成并记录"$.方法: 某文本（N 字符）保留规则"的说明文本。
 */
function describeTruncation({ plugin, spelling, what, name, length, kept }) {
  let message = `$.${spelling}: ${what}${name === undefined ? "" : ` of ${name}`} (${length} characters) ${kept}`;
  logForDebugging(`${plugin}: ${message}`);
  return message;
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
