/**
 * plugins/functionHooks/hooksWorkerHost.ts
 *
 * 2.1.316 新增：hooks worker 宿主：启动、心跳、卡死判定、重生与消息收发
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (83)
 * attribution: placement 83
 */
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import {
  MAX_UNATTRIBUTED_CRASHES,
  PLUGIN_UNLOADED_TEXT,
  registerRespawn,
  hookTimeoutText,
  isDispatchFrameOpen,
  dispatchFrameStorage,
  inDispatchFrame,
} from "./hookDispatch.js";
import {
  knownArgList,
  withheldNounsOf,
  forgetPlugin,
  reportWorkerCrashWithholdings,
  bumpGeneration,
  foldBaseForRespawn,
  liftWithholdings,
  publishRenderPlugins,
  invalidateAllHookedCaches,
  stackedPluginOf,
  catchingDispatchesOf,
  workerCrashTelemetry,
  markWorkerDead,
  addWaitedTime,
  isHostIdle,
  stopHeartbeat,
  catchUpHeartbeat,
  postToWorker,
  closeEnvironmentPort,
  abortEnvironmentOps,
  createSameThreadEnvironmentHost,
  createSameThreadHost,
  createWithholdingTable,
} from "./sameThreadHost.js";
import {
  builtinModuleOf,
  logModsTurnedOff,
  isModuleUnchanged,
  loadAndRegisterHooksModule,
  admissionTextFor,
  errorWithCause,
  forgetRegisteredAgent,
  resolveElementTables,
  reportWorkerCrash,
  HOOKS_READY_TIMEOUT_MS,
  bindAsyncResource,
  toolNameOfCall,
  notLoadedWithinText,
  unloadHooksModules,
  hookHostKind,
  assembleHooksModuleRuntime,
  withInFlightDispatches,
  waitForModuleReads,
  isLoadingAnyCommandRun,
  startLoadingModules,
  isLoadingCommandRun,
  unloadDisabledPlugins,
  queueReload,
  HOOKS_OPTIONS_STATUS_TEXT,
  wrapReloadError,
  reloadHooksModuleByName,
  retargetKnownPlugin,
  hooksModuleFilesOf,
} from "./hooksModuleLoader.js";
import {
  uiLog,
  pluginStorageKey,
  reportPluginProblem,
  WORKER_REPLACED_TEXT,
  apiMethodLabel,
} from "./hooksWorkerClient.js";
import { logForDebugging } from "../../utils/debug.js";
import { shownPluginInfo, admitBuiltModules, applyPendingUiInvalidations } from "./pluginRegister.js";
import { abandonIfWorkerDied, buildEngineApi } from "./engineCreate.js";
import { forgetMcpServerFor } from "./mcpServerHooks.js";
import { forgetMcpConnectsFor } from "./mcpApi.js";
import { forgetCachedDescribe } from "./commandApi.js";
import { emit } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { errorMessage } from "../../utils/errors.js";
import {
  noteWorkersLoaded,
  rejectPendingCall,
  workerSlots,
  settleCallRejection,
  bumpPluginEpochs,
  buildCallerChain,
  collectLentFrames,
  inheritDispatchFacts,
  isCurrentPendingCall,
  isSamePressOwner,
  latestGestureAt,
  isModelOriginToolCall,
  claimSpawnServed,
  trackPluginOp,
  unrefTimer,
  countActingOps,
  explainApiNotAvailable,
} from "./apiDispatch.js";
import { invalidateAll, createRenderInvalidator } from "./ui/renderInstances.js";
import { uniq } from "../../utils/collections.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { STAMP_CURRENT_CALL_SLOT } from "./vm/vmGlobals.js";
import {
  MARKS_ANSWERED_DISPATCH_SLOT,
  MARKS_ANSWERS_SENT_SLOT,
  MARKS_NEWEST_DISPATCH_SLOT,
  takePending,
  classicWithholding,
} from "./hostBridge.js";
import { runInScope, currentScope, endScope, getAsyncStoreS61 } from "./dispatch/dispatchScope.js";
import { isHookEvent, isPluginDefinedEvent } from "./hookApiSurface.js";
import { loadedModuleArgs } from "../hooksModules/loadedModuleFilters.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { mainAgentId, getSessionId } from "../../bootstrap/state.js";
import { toApprovalLabel } from "../../utils/permissions/approvalPayloadSerialization.js";
import {
  settlePendingLoad,
  toHookFailedEvent,
  reportHookSkip,
  markInFlightFailed,
  acceptWorkerPassedBy,
  takeAnsweredCall,
  handleWorkerStreamPull,
  handleWorkerNext,
  handleWorkerStreamNext,
  recordPassedBySighting,
} from "./hookSkipNotices.js";
import {
  HooksError,
  tagWeak,
  makeHooksOrPlainError,
  AskRefusedError,
  settledIfPlainData,
  readTag,
} from "./hooksErrors.js";
import { logFunctionHooksRun } from "./telemetry/runTelemetry.js";
import { DEFAULT_HOOK_TIMEOUT_MS, teeGeneratorResult } from "./dispatch/streamChain.js";
import { LINGER_GRACE_MS } from "./dispatch/valueSizing.js";
import { parseAskUserQuestionRenderRequest, surfaceRowLedger } from "./ui/treeConstants.js";
import {
  isInterfaceCallOpen,
  streamOpForPlugin,
  runInterfaceCall,
  interfaceCallForPlugin,
  rootEventForOrigin,
  turnHeldEventFor,
} from "./interfaceCalls.js";
import { surfaceBudgetKey } from "./sites/index.js";
import { getCwd } from "../../utils/cwd.js";
import { getEventPathNames } from "../../utils/pathTable.js";
import { forwardAbort, skippedHookReporter, hookScopeStore } from "./dispatch/chain.js";
import { isPersonInputEvent } from "./uiHooks.js";
import { pressForEnv, notePressDispatch, markPressAnswered, dropEnvPresses } from "./ui/pressFill.js";
import { submitMarksSlot, isSubmittableEvent } from "./promptSubmit.js";
import { isUiEventName } from "./api/agentToolOps.js";
import { isHumanInitiatedSite, MODEL_API_CATALOG, PROCESS_SPAWN_API } from "./apiCatalog.js";
import { isClockMethod } from "./api/operations.js";
import { claimPendingWriteLine, isUntrustedObject } from "../../utils/shutdown/pendingWrites.js";
import { unawaitedOpMessage, rejectionText } from "./vm/moduleLoader.js";
import { clone } from "../../utils/slowOperations.js";
import { createAudioPlayer } from "./audioApi.js";
import { createAgentSpawner } from "./agentApi.js";
import { createSerialQueue } from "./panes.js";
import { createSignal } from "../../utils/signal.js";
import { setMatcherLog } from "../../utils/hooks/functionHookMatchers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:4080272-4082548 placement
/**
 * worker 重生后的重载流程：多次无归属崩溃时关闭 worker 内 mod；逐个重新描述模块、重建 $（engine.create），处理拒绝与再次折叠，最后替换已加载模块列表并退役旧模块。
 */
var reloadAfterRespawn = (host, reason, info) =>
  host.state.queue(async () => {
    clearDeadEnvironmentHost(host);
    host.state.isSetRecord = false;
    let pluginRegistry = getPluginRegistry();
    if (!info.isAttributed && ++host.state.unattributedCrashes >= MAX_UNATTRIBUTED_CRASHES) {
      let knownArgs = knownArgList(host.state);
      let mapped = knownArgs.filter((arg) => builtinModuleOf(arg) === undefined).map((arg) => arg.pluginName);
      let all = mapped.every((name) => withheldNounsOf(host.state, name).length === 0);
      for (let name of mapped) forgetPlugin(name, host);
      reportWorkerCrashWithholdings(host.state, new Set(mapped));
      uiLog(
        "hooks",
        `mods that run in the hooks worker are off for this session: it crashed ${host.state.unattributedCrashes} times` +
          (all ? "" : "; what they withheld stays withheld until they reload or are disabled"),
      );
      logModsTurnedOff(host, knownArgs);
    }
    logForDebugging(
      `hooks worker: respawning for ${[...host.state.knownArgs.keys()].join(", ") || "nobody"} (${reason})`,
    );
    let admitted;
    let loads = new Map();
    let failedNames = new Set();
    let seated = new Set();
    try {
      for (;;) {
        let filtered = knownArgList(host.state).filter((args) => {
          let plugin = host.state.knownPlugins.get(args.pluginName);
          let step = host.state.unloadedSteps.get(args.pluginName);
          let unchanged = step !== undefined && isModuleUnchanged(step, args, plugin);
          return !failedNames.has(args.pluginName) && !unchanged;
        });
        let built = [];
        for (let args of filtered)
          try {
            let n28Module = await loadAndRegisterHooksModule(host, args);
            n28Module.shown = shownPluginInfo(args, host.state.knownPlugins.get(args.pluginName));
            n28Module.judgedUnder = admissionTextFor(
              pluginRegistry.loadedModules.find((loadedModule) => loadedModule.name === args.pluginName),
            );
            built.push(n28Module);
            host.state.unadmitted.add(n28Module.environmentId);
            loads.set(n28Module.environmentId, n28Module);
            bumpGeneration(args.pluginName, host);
          } catch (error) {
            failedNames.add(args.pluginName);
            logForDebugging(
              `hooks module ${pluginStorageKey(args)} failed to load after the respawn: ${errorWithCause(error)}`,
              {
                level: "error",
              },
            );
            if (abandonIfWorkerDied(host, built, "the respawn")) return;
            forgetMcpServerFor(args.pluginName);
            forgetMcpConnectsFor(args.pluginName);
            forgetCachedDescribe(args.pluginName);
            forgetRegisteredAgent(args.pluginName);
            emit({
              plugin: args.pluginName,
              event: "*",
              reason: errorMessage(error),
              effect: PLUGIN_UNLOADED_TEXT,
              hasOverrun: false,
            });
          }
        let built_2 = await buildEngineApi(host, built, {
          ...foldBaseForRespawn(
            host,
            built.map((n29Module) => n29Module.name),
          ),
          carried: host.state.lastTable,
        });
        if (filtered.length > 0 && host.state.environmentHost?.died !== undefined) return;
        let { admitted: admitted_2, refused } = await admitBuiltModules(host, {
          built: built_2,
          plugins: host.state.knownPlugins,
          seated,
        });
        if (filtered.length > 0 && host.state.environmentHost?.died !== undefined) {
          for (let n30Module of admitted_2) n30Module.discard();
          return;
        }
        for (let n31Module of refused) forgetPlugin(n31Module.name, host);
        if (refused.length > 0)
          liftWithholdings(host.state, new Set(refused.map((n32Module) => n32Module.name)));
        if (!refused.some((n33Module) => n33Module.hooks("engine.create"))) {
          admitted = admitted_2;
          break;
        }
        for (let n34Module of admitted_2) {
          seated.add(n34Module.name);
          n34Module.discard();
        }
      }
    } finally {
      host.state.admitting = undefined;
      for (let [envId, n35Module] of loads) if (host.state.unadmitted.has(envId)) n35Module.discard();
    }
    let loadedModules = pluginRegistry.loadedModules;
    pluginRegistry.loadedModules = admitted;
    host.state.isSetRecord = true;
    info.loaded();
    let names = new Set(admitted.map((n36Module) => n36Module.name));
    for (let loadedModule of loadedModules)
      if (!names.has(loadedModule.name)) {
        forgetMcpServerFor(loadedModule.name);
        forgetMcpConnectsFor(loadedModule.name);
      }
    for (let loadedModule of loadedModules) loadedModule.retire();
    publishRenderPlugins(host);
    invalidateAllHookedCaches();
    noteWorkersLoaded(admitted);
    await resolveElementTables(admitted);
    invalidateAll();
  });
//@ chunk-e6aww6q8.js:4082548-4083726 placement
/**
 * hooks worker 失去心跳时重生 worker 并重载声明集，记录遥测。
 */
function respawnHooksWorker(host, crash) {
  if (host.died !== undefined) return;
  let { reason, culprit } = crash;
  let stacked = crash.cause !== "heartbeat_waited" ? stackedPluginOf(host) : undefined;
  let plugin = culprit?.plugin ?? stacked;
  let dispatches = plugin === undefined ? [] : catchingDispatchesOf(host, plugin);
  let keptPlugin = dispatches.length > 0 ? plugin : undefined;
  let events = uniq(dispatches.map(([, hop]) => hop.event));
  let names = new Set(keptPlugin === undefined ? [plugin].filter((name) => name !== undefined) : []);
  let isAttributed = plugin !== undefined;
  let evidence = (plugin === culprit?.plugin ? culprit?.evidence : undefined) ?? "stack";
  host.host.state.workerDeaths += 1;
  let fields = workerCrashTelemetry(host, crash.cause, isAttributed ? evidence : "none");
  logFeatureSad("plugin_function_hooks_worker", "respawned", fields);
  logForDebugging(`hooks worker: ${reason}; respawning`, {
    level: "error",
  });
  if (keptPlugin !== undefined) {
    host.kept = {
      crash: {
        plugin: keptPlugin,
        reason,
        fields,
      },
      hops: new Set(dispatches.map(([hop]) => hop)),
    };
    reportPluginProblem(
      keptPlugin,
      `the hooks worker was lost with ${keptPlugin}'s ${events.join(", ")} hook in flight; it is replaced, and ${keptPlugin} stays loaded for the hook's .catch`,
    );
    for (let event of events)
      emit({
        plugin: keptPlugin,
        event,
        reason,
        effect: WORKER_REPLACED_TEXT,
        hasOverrun: false,
      });
  }
  for (let hop of names)
    if (host.host.state.knownArgs.has(hop)) {
      reportWorkerCrash(host.host, hop, {
        reason,
        fields,
      });
      forgetPlugin(hop, host.host);
    }
  reportWorkerCrashWithholdings(host.host.state, names);
  markWorkerDead(host, reason);
  host.worker.terminate();
  host.spawned.release?.();
  let { hooksRespawns } = getPluginRegistry();
  let { respawn, loaded } = registerRespawn(hooksRespawns);
  reloadAfterRespawn(host.host, reason, {
    isAttributed,
    loaded,
  })
    .catch((error) => {
      logError(error);
      return hooksRespawns.has(respawn)
        ? reloadAfterRespawn(host.host, `${reason}; tried again`, {
            isAttributed: true,
            loaded,
          })
        : undefined;
    })
    .catch(logError)
    .then(loaded);
}
//@ chunk-e6aww6q8.js:4083726-4083748 placement
/**
 * 空回调
 */
var noopCallback = (stuckCulprit) => {
  return;
};
//@ chunk-e6aww6q8.js:4083748-4083784 placement
/**
 * worker 时序槽
 */
var workerTimingSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:4083748", () => {
  workerTimingSlot = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-e6aww6q8.js:4083784-4083797 placement
/**
 * 1000
 */
var HEARTBEAT_POLL_MS = 1000;
//@ chunk-e6aww6q8.js:4083797-4083810 placement
/**
 * 5000
 */
var WORKER_START_TIMEOUT_MS = 5000;
//@ chunk-e6aww6q8.js:4083810-4083846 placement
/**
 * worker 宿主槽
 */
var workerHostSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:4083810", () => {
  workerHostSlot = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-e6aww6q8.js:4083846-4083856 placement
/**
 * 2
 */
var MAX_STUCK_RETRIES = 2;
//@ chunk-e6aww6q8.js:4083856-4083867 placement
/**
 * 12
 */
var MAX_HEARTBEAT_MISSES = 12;
//@ chunk-e6aww6q8.js:4083867-4084043 placement
function readWorkerCpu(worker) {
  try {
    let cpu = worker.spawned.thread?.();
    return cpu !== undefined && Number.isFinite(cpu.usedMs)
      ? {
          at: performance.now(),
          usedMs: cpu.usedMs,
          isAsleep: cpu.isAsleep === true,
        }
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:4084043-4084061 placement
/**
 * 恒 false
 */
var never = (a, b) => false;
//@ chunk-e6aww6q8.js:4084061-4084214 placement
function cpuUsedSince(read, workerCpu, heartbeatMs) {
  let used = (workerCpu?.usedMs ?? Number.NaN) - (read?.usedMs ?? Number.NaN);
  let isValid = read !== undefined && workerCpu !== undefined && used >= 0;
  let usedMs = isValid && never(read, workerCpu) ? heartbeatMs : Math.min(used, heartbeatMs);
  return isValid ? usedMs : undefined;
}
//@ chunk-e6aww6q8.js:4084214-4084264 placement
/**
 * worker 的 ready/timeout 参数
 */
var getWorkerTiming = () =>
  workerTimingSlot.get() ?? {
    readyMs: HOOKS_READY_TIMEOUT_MS,
    timeoutMs: WORKER_START_TIMEOUT_MS,
  };
//@ chunk-e6aww6q8.js:4084264-4084316 placement
/**
 * 当前心跳标记名
 */
var currentMarkName = (probe) => probe.names.get(Atomics.load(probe.stamp, STAMP_CURRENT_CALL_SLOT));
//@ chunk-e6aww6q8.js:4084316-4084924 placement
/**
 * 心跳超时时，若只有一个进行中的单模块分发且已收到心跳之后的标记，判定该模块为卡住 worker 的元凶。
 */
function loneDispatchCulprit(state) {
  if (!(
    state.inFlight.size === 1 &&
    state.pendingCalls.size === 0 &&
    state.pendingLoads.size === 0 &&
    state.pendingBuilds.size === 0 &&
    state.pendingPresses.size === 0 &&
    state.pendingResolves.size === 0
  ))
    return;
  let [entry] = state.inFlight;
  let [dispatchId, dispatch] = entry ?? [];
  let pongSeq = state.awaitingPong?.n;
  if (!(dispatchId !== undefined && dispatch !== undefined && pongSeq !== undefined)) return;
  let [onlyEnv, ...otherEnvs] = dispatch.environments;
  let envPrefix = `${onlyEnv}:`;
  let { marks } = state;
  let isSingleEnv =
    onlyEnv !== undefined &&
    otherEnvs.length === 0 &&
    dispatch.stream === undefined &&
    dispatch.calls.size === 0 &&
    ![...state.opControllers.keys()].some((key) => key.startsWith(envPrefix));
  let marksUnchanged =
    dispatch.answersSent === 0 ||
    (Atomics.load(marks, MARKS_ANSWERED_DISPATCH_SLOT) === dispatchId &&
      Atomics.load(marks, MARKS_ANSWERS_SENT_SLOT) === dispatch.answersSent);
  return isSingleEnv &&
    pongSeq > dispatch.sentAtPing &&
    Atomics.load(marks, MARKS_NEWEST_DISPATCH_SLOT) >= dispatchId &&
    marksUnchanged
    ? state.names.get(onlyEnv)
    : undefined;
}
//@ chunk-e6aww6q8.js:4084924-4085133 placement
/**
 * 依次从调用栈、恢复标记、单一分发推断卡住 hooks worker 的插件。
 */
function findStuckCulprit(host) {
  let stacked = stackedPluginOf(host);
  if (stacked !== undefined)
    return {
      plugin: stacked,
      evidence: "stack",
    };
  let markName = currentMarkName(host);
  if (markName !== undefined)
    return {
      plugin: markName,
      evidence: "resumed",
    };
  let culprit = loneDispatchCulprit(host);
  return culprit === undefined
    ? undefined
    : {
        plugin: culprit,
        evidence: "dispatch",
      };
}
//@ chunk-e6aww6q8.js:4085133-4085546 placement
/**
 * 描述心跳超时的判定（卡住的插件、未应答的分发等）。
 */
function describeHeartbeatVerdict(stuckCulprit, culprit) {
  if (stuckCulprit === undefined)
    return "hooks worker: the heartbeat verdict names nobody (no plugin on the stack, none resumed in the stuck turn, no lone begun hop)";
  return culprit
    ? `hooks worker: the heartbeat verdict names ${stuckCulprit.plugin} (evidence: ${stuckCulprit.evidence})`
    : `hooks worker: the heartbeat verdict names nobody (the thread stopped in ${stuckCulprit.plugin}, evidence: ${stuckCulprit.evidence}, and had not used a window of processor time)`;
}
//@ chunk-e6aww6q8.js:4085546-4085596 placement
/**
 * 未知卡住原因
 */
var UNKNOWN_STUCK_REASON = "what held the hooks worker is not known";
//@ chunk-e6aww6q8.js:4085596-4086616 placement
/**
 * hooks worker 心跳检查：启动超时或心跳无应答时判定 worker 卡死。
 */
function checkHooksWorkerHeartbeat(host, awaitingPong, pong) {
  let read = awaitingPong.read;
  let workerCpu = readWorkerCpu(host);
  let usedMs = cpuUsedSince(read, workerCpu, host.heartbeatMs);
  let isStuck = host.isStarting && read?.isAsleep === true && workerCpu?.isAsleep === true;
  let verdict =
    host.pendingLoads.size > 0 || host.pendingBuilds.size > 0
      ? getWorkerTiming().timeoutMs
      : (workerHostSlot.get()?.timeoutMs ?? WORKER_START_TIMEOUT_MS);
  let culprit = verdict * MAX_HEARTBEAT_MISSES;
  awaitingPong.read = workerCpu;
  awaitingPong.beats += 1;
  awaitingPong.usedMs += isStuck ? host.heartbeatMs : (usedMs ?? host.heartbeatMs);
  awaitingPong.unansweredBeats = Math.min(
    awaitingPong.beats,
    Math.ceil(verdict / host.heartbeatMs),
    Math.round(awaitingPong.usedMs / host.heartbeatMs),
  );
  if (host.isStarting) addWaitedTime(host, host.beatAt, pong);
  else if (usedMs !== undefined) addWaitedTime(host, (read?.at ?? pong) + usedMs, pong);
  let now = culprit / 2;
  let reason = host.isStarting && awaitingPong.usedMs >= now;
  let fields = !host.isStarting && awaitingPong.unansweredBeats * host.heartbeatMs >= verdict;
  if (!(reason || fields || awaitingPong.beats * host.heartbeatMs >= culprit)) return;
  let stuckCulprit = findStuckCulprit(host);
  let beat = fields ? stuckCulprit : noopCallback(stuckCulprit);
  logForDebugging(describeHeartbeatVerdict(stuckCulprit, beat !== undefined), {
    level: "warn",
  });
  if (reason)
    return {
      reason: `the hooks worker did not come online within ${now}ms of time its thread had: its start hung`,
      cause: "heartbeat",
      culprit: undefined,
    };
  return {
    reason: fields
      ? `no answer to a heartbeat within ${verdict}ms: the hooks worker is wedged (a hook spinning without yielding)`
      : `no answer to a heartbeat within ${culprit}ms: ` + UNKNOWN_STUCK_REASON,
    cause: fields ? "heartbeat" : "heartbeat_waited",
    culprit: beat,
  };
}
//@ chunk-e6aww6q8.js:4086616-4086934 placement
/**
 * 心跳定时器：空闲时停止；有未回的 ping 时判断是否卡死（卡死则重生 worker），否则发新 ping。
 */
function heartbeatTick(host) {
  if (isHostIdle(host)) {
    stopHeartbeat(host);
    return;
  }
  let { awaitingPong } = host;
  let startTime = performance.now();
  let stopped = awaitingPong !== undefined;
  let timer = stopped ? checkHooksWorkerHeartbeat(host, awaitingPong, startTime) : undefined;
  catchUpHeartbeat(host, startTime);
  host.beatAt = startTime;
  if (timer !== undefined) respawnHooksWorker(host, timer);
  if (stopped) return;
  host.awaitingPong = {
    n: ++host.pingCounter,
    unansweredBeats: 0,
    usedMs: 0,
    beats: 0,
    isOwed: false,
    sentAt: Date.now(),
    read: readWorkerCpu(host),
  };
  postToWorker(host, {
    type: "ping",
    n: host.awaitingPong.n,
  });
}
//@ chunk-e6aww6q8.js:4086934-4087120 placement
/**
 * 若未启动心跳则启动（间隔可配置），定时器 unref。
 */
function ensureHeartbeat(host) {
  if (host.heartbeat === undefined) {
    host.awaitingPong = undefined;
    host.beatAt = performance.now();
    host.heartbeatMs = workerHostSlot.get()?.ms ?? HEARTBEAT_POLL_MS;
    host.heartbeat = setInterval(heartbeatTick, host.heartbeatMs, host);
    host.heartbeat.unref();
  }
}
//@ chunk-e6aww6q8.js:4087120-4087314 placement
/**
 * 向某环境的消息端口请求 flush，完成时 resolve；端口不存在立即 resolve。
 */
function flushEnvironmentPort(host, envId, result) {
  let port = host.ports.get(envId);
  if (port === undefined) {
    result.resolve();
    return;
  }
  host.flushCounter += 1;
  host.pendingFlushes.set(`${envId}:${host.flushCounter}`, result);
  port.postMessage({
    type: "flush",
    flushId: host.flushCounter,
  });
}
//@ chunk-e6aww6q8.js:4087314-4087438 placement
function settleWorkerIdle(host) {
  if (host.inFlight.size === 0 && host.pendingCalls.size === 0 && host.pendingPresses.size === 0)
    host.worker.unref?.();
  if (isHostIdle(host)) stopHeartbeat(host);
}
//@ chunk-e6aww6q8.js:4087438-4087511 placement
/**
 * 记录空闲
 */
function markWorkerIdle(host) {
  if (host.awaitingPong !== undefined) host.awaitingPong.isOwed = true;
  settleWorkerIdle(host);
}
//@ chunk-e6aww6q8.js:4087511-4087896 placement
/**
 * 检查环境加载是否超时，超时则终止并报告。
 */
function checkLoadTimeout(host, n6Load) {
  let pending = n6Load.pending.get(n6Load.environmentId);
  if (!(pending !== undefined && (n6Load.waiter === undefined || n6Load.waiter === pending))) return;
  let startTime = performance.now();
  catchUpHeartbeat(host, startTime);
  let { readyMs, timeoutMs } = getWorkerTiming();
  let message = readyMs + timeoutMs * MAX_HEARTBEAT_MISSES;
  let floored = Math.floor(n6Load.since + message - startTime);
  let min = Math.min(host.waitedMs - n6Load.waitedMs, floored);
  if (min > 0) {
    setTimeout(checkLoadTimeout, min, host, {
      ...n6Load,
      waitedMs: host.waitedMs,
      waiter: pending,
    }).unref();
    return;
  }
  rejectPendingCall(n6Load.pending, n6Load.environmentId, n6Load.reason(floored > 0 ? readyMs : message));
  markWorkerIdle(host);
}
//@ chunk-e6aww6q8.js:4087896-4088035 placement
function armLoadTimeout(host, n7Load) {
  let timer = setTimeout(checkLoadTimeout, getWorkerTiming().readyMs, host, {
    ...n7Load,
    waitedMs: host.waitedMs,
    since: performance.now(),
    waiter: undefined,
  });
  timer.unref();
  return timer;
}
//@ chunk-e6aww6q8.js:4088035-4088088 placement
/**
 * 在调用者上下文执行
 */
var runInCallerScope = (holder, fn) => holder.inCallerContext(() => runInScope(holder.scope, fn));
//@ chunk-e6aww6q8.js:4088088-4088192 placement
function callersOfServing(host, environmentId, serving) {
  let call = serving === undefined ? undefined : host.pendingCalls.get(serving);
  return call?.callee === environmentId ? call.callers : undefined;
}
//@ chunk-e6aww6q8.js:4088192-4088314 placement
function clearOverruns(host, dispatch) {
  for (let environment of dispatch.environments) {
    let name = host.names.get(environment);
    if (name !== undefined && !dispatch.failed.has(name)) host.overruns.delete(name);
  }
}
//@ chunk-e6aww6q8.js:4088314-4088405 placement
/**
 * 清定时器后 resolve/reject
 */
var withClearedTimeout = (timer, resolve, reject) => ({
  resolve: (value) => {
    clearTimeout(timer);
    resolve(value);
  },
  reject: (error) => {
    clearTimeout(timer);
    reject(error);
  },
});
//@ chunk-e6aww6q8.js:4088405-4089233 placement
/**
 * 启动 hooks worker（所有插件共用一个）并记录遥测。
 */
function spawnHooksWorker(host) {
  let spawned = workerSlots.spawnWorker();
  let { worker, stamp, marks } = spawned;
  host.state.workerSpawns += 1;
  logFeatureOk("plugin_function_hooks_worker", {
    spawns: host.state.workerSpawns,
  });
  logForDebugging("hooks worker spawned (one for every plugin)");
  return {
    host,
    spawned,
    spawnedAt: Date.now(),
    worker,
    stamp,
    marks,
    names: new Map(),
    ports: new Map(),
    inFlight: new Map(),
    opControllers: new Map(),
    opStreams: new Map(),
    work: new Map(),
    pendingLoads: new Map(),
    pendingBuilds: new Map(),
    pendingCalls: new Map(),
    answeredCalls: new Map(),
    pendingPresses: new Map(),
    sentPresses: new Map(),
    keptPresses: new Map(),
    pendingResolves: new Map(),
    dispatchCounter: 0,
    callCounter: 0,
    pressCounter: 0,
    resolveCounter: 0,
    flushCounter: 0,
    died: undefined,
    isStarting: true,
    pendingFlushes: new Map(),
    runningOps: new Map(),
    startOps: new Set(),
    overruns: new Map(),
    heartbeat: undefined,
    heartbeatMs: 0,
    pingCounter: 0,
    awaitingPong: undefined,
    beatAt: 0,
    waitedMs: 0,
    waitedUntil: 0,
  };
}
//@ chunk-e6aww6q8.js:4089233-4089379 placement
function releaseKeptHop(hooksWorker, hop, name) {
  let { kept } = hooksWorker;
  let released = kept?.hops.delete(hop) === true;
  if (kept === undefined || !released) return false;
  if (name) {
    kept.hops.clear();
    hooksWorker.kept = undefined;
  }
  return !name && kept.hops.size === 0;
}
//@ chunk-e6aww6q8.js:4089379-4089749 placement
/**
 * worker 结束（close）或出错（error 事件）时以相应原因重生 worker。
 */
function respawnOnWorkerEnd(hooksWorker, event) {
  if (event.type === "close") {
    let hasCode = "code" in event && typeof event.code === "number";
    respawnHooksWorker(hooksWorker, {
      reason: "the hooks worker ended" + (hasCode ? ` (close code ${event.code})` : ""),
      cause: "close_event",
      culprit: undefined,
    });
    return;
  }
  let reason = event instanceof ErrorEvent;
  respawnHooksWorker(hooksWorker, {
    reason: "the hooks worker died: " + (reason ? event.message : `'${event.type}' event without a message`),
    cause: reason ? "error_event" : "bare_event",
    culprit: undefined,
  });
}
//@ chunk-e6aww6q8.js:4089749-4090395 placement
function validatePassedBySighting(sighting, fields) {
  let { link, plugins, event, by, count } = fields;
  if (!Number.isSafeInteger(count) || count < 1) return "its count is not a whole number of dispatches";
  if (!(isHookEvent(event) || isPluginDefinedEvent(event))) return "its event is not one the host knows";
  if (!sighting.state.knownPlugins.has(by))
    return "the plugin it says continued past is not one the host knows";
  if (plugins.length === 0 || plugins.length > sighting.state.knownPlugins.size)
    return "it names no plugin, or more than the host knows";
  let problem = new Set(plugins);
  if (problem.size !== plugins.length) return "it names a plugin twice";
  if (link !== plugins.join("+")) return "its link is not the plugins it names";
  return [...problem].every((secondProblem) => loadedModuleArgs(secondProblem) !== undefined)
    ? undefined
    : "it names a plugin with no module loaded";
}
//@ chunk-e6aww6q8.js:4090395-4090406 placement
/**
 * 把插件钩子的提示作为 meta 任务通知投递（isMeta: true），主代理下一轮才会看到。
 */
var TASK_NOTICE_IS_META = true;
//@ chunk-e6aww6q8.js:4090406-4090452 placement
/**
 * 生成钩子提示任务
 */
function hookNoticeTask(text) {
  return formatTaskNotification({
    body: `
${escapeXml(text)}`,
  });
}
//@ chunk-e6aww6q8.js:4090452-4090684 placement
/**
 * 先排队、待有处理器入座后再执行的队列（seat/queue/reset）。
 */
function createDeferredQueue() {
  let valueSlot = createValueSlot();
  let valueSlot_2 = createValueSlot();
  return {
    seat: (push) => {
      valueSlot.set(push);
      for (let shift of valueSlot_2.get() ?? []) push(shift);
      valueSlot_2.set(undefined);
    },
    queue: (value) => {
      let waiter = valueSlot.get();
      if (waiter === undefined) return valueSlot_2.set([...(valueSlot_2.get() ?? []), value]);
      return waiter(value);
    },
    reset: () => {
      valueSlot.set(undefined);
      valueSlot_2.set(undefined);
    },
  };
}
//@ chunk-e6aww6q8.js:4090684-4090717 placement
/**
 * 延迟通知队列
 */
var noticeQueue; // deferred: uses createDeferredQueue of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:4090684", () => {
  noticeQueue = identity_2(createDeferredQueue(), (queue) => queue.reset());
});
//@ chunk-e6aww6q8.js:4090717-4090854 placement
/**
 * 把一条关于插件钩子的提示作为 meta 任务通知排入主代理下一轮（被动、跳过附件）。
 */
function queueModelNotice(text) {
  noticeQueue.queue({
    agentId: mainAgentId(),
    value: hookNoticeTask(text),
    mode: "task-notification",
    skipAttachments: true,
    isMeta: TASK_NOTICE_IS_META,
    passive: true,
    priority: "next",
  });
}
//@ chunk-e6aww6q8.js:4090854-4090917 placement
/**
 * 审批标签或 unnamed
 */
function approvalLabelOrUnnamed(name) {
  let approvalLabel = toApprovalLabel(name);
  return approvalLabel === null ? "unnamed" : String(approvalLabel);
}
//@ chunk-e6aww6q8.js:4096791-4099085 placement
/**
 * 处理 hooks worker 发来的消息（online、pong、loaded、load_error、日志等），并识别失控插件。
 */
function handleHooksWorkerMessage(state, msg) {
  switch (msg.type) {
    case "online": {
      let { awaitingPong, isStarting } = state;
      state.isStarting = false;
      if (isStarting && awaitingPong !== undefined) {
        awaitingPong.beats = 0;
        awaitingPong.usedMs = 0;
        awaitingPong.unansweredBeats = 0;
        awaitingPong.read = readWorkerCpu(state);
      }
      return;
    }
    case "pong":
      if (state.awaitingPong?.n === msg.n) state.awaitingPong = undefined;
      return;
    case "loaded":
      settlePendingLoad(state, msg);
      return;
    case "load_error":
      takePending(state.pendingLoads, msg.environmentId)?.reject(
        new HooksError(msg.error, {
          cause: msg.cause,
        }),
      );
      return;
    case "log":
      logForDebugging(msg.text, {
        level: msg.level ?? "debug",
      });
      return;
    case "hook_failed": {
      let hookFailedEvent = toHookFailedEvent(msg);
      emit(hookFailedEvent);
      reportHookSkip(hookFailedEvent);
      markInFlightFailed(state, hookFailedEvent);
      if (msg.hasOverrun) {
        let overruns = (state.overruns.get(msg.plugin) ?? 0) + 1;
        state.overruns.set(msg.plugin, overruns);
        if (overruns >= MAX_STUCK_RETRIES)
          respawnHooksWorker(state, {
            reason: `${msg.plugin} ignored its signal ${overruns} times in a row: a runaway plugin in the hooks worker`,
            cause: "runaway",
            culprit: {
              plugin: msg.plugin,
              evidence: "trigger",
            },
          });
      }
      logFunctionHooksRun(hookFailedEvent);
      return;
    }
    case "passed_by":
      acceptWorkerPassedBy(state.host, msg.sighting);
      return;
    case "unhandled":
      logForDebugging(`hooks worker: a promise a plugin did not await rejected: ${msg.error}`);
      return;
    case "built":
    case "built_error": {
      let plugin = takePending(state.pendingBuilds, msg.environmentId);
      if (msg.type === "built") plugin?.resolve();
      else plugin?.reject(new HooksError(msg.error));
      return;
    }
    case "call_result":
    case "call_error": {
      let plugin = takeAnsweredCall(state, msg.callId);
      settleWorkerIdle(state);
      if (msg.type === "call_result") plugin?.resolve(msg.value);
      else plugin?.reject(new HooksError(msg.error));
      return;
    }
    case "resolved":
    case "resolve_error": {
      let plugin = takePending(state.pendingResolves, msg.resolveId);
      settleWorkerIdle(state);
      if (msg.type === "resolved") plugin?.resolve();
      else plugin?.reject(new HooksError(msg.error));
      return;
    }
    case "press_result":
    case "press_error": {
      let plugin = takePending(state.pendingPresses, msg.pressId);
      settleWorkerIdle(state);
      if (msg.type === "press_result") plugin?.resolve();
      else plugin?.reject(new HooksError(msg.error));
      return;
    }
    case "result":
    case "error": {
      let plugin = takePending(state.inFlight, msg.id);
      plugin?.unlink();
      if (msg.type === "result" && plugin !== undefined) clearOverruns(state, plugin);
      if (msg.type === "result")
        plugin?.resolve({
          result: msg.result,
          ...(Array.isArray(msg.answered) && {
            answered: msg.answered,
          }),
          ...(msg.unmatched === true && {
            unmatched: true,
          }),
          ...(msg.withheld === true && {
            withheld: true,
          }),
        });
      else
        plugin?.reject(
          msg.withheld === true
            ? tagWeak(new HooksError(msg.error), {
                isNoted: true,
              })
            : new HooksError(msg.error),
        );
      return;
    }
    case "stream_step":
      handleWorkerStreamPull(state, msg);
      return;
    case "next":
      handleWorkerNext(state, msg);
      return;
    case "next_pull":
      handleWorkerStreamNext(state, msg);
      return;
    case "next_close": {
      let stream = state.inFlight.get(msg.id)?.stream;
      let plugin = stream?.opened.get(msg.nextId);
      stream?.opened.delete(msg.nextId);
      Promise.resolve(plugin?.return(undefined)).catch(() => {
        return;
      });
      return;
    }
    case "next_abort":
      state.inFlight
        .get(msg.id)
        ?.calls.get(msg.nextId)
        ?.abort(makeHooksOrPlainError(msg.reason, msg.isSettled));
      return;
    default:
      logForDebugging(`hooks worker: a "${String(msg.type)}" frame on the main channel; refused`, {
        level: "warn",
      });
  }
}
//@ chunk-e6aww6q8.js:4099085-4099214 placement
async function waitForDeathsSettled(host) {
  let before;
  do {
    before = host.state.workerDeaths;
    await host.state.queue(() => Promise.resolve());
  } while (before !== host.state.workerDeaths);
}
//@ chunk-e6aww6q8.js:4099214-4099986 placement
/**
 * 向 worker 内另一插件发起接口调用：分配 callId、设超时、记录调用者与借用信息，序列化失败时拒绝。
 */
function callInterfaceInWorker(hooksWorker, { environmentId, call, behind }) {
  if (hooksWorker.died !== undefined) return Promise.reject(new HooksError(hooksWorker.died));
  let setup = ++hooksWorker.callCounter;
  let callers = behind?.callers ?? [];
  let methodLabel = apiMethodLabel(call);
  let teardown = hookTimeoutText(
    methodLabel,
    hooksWorker.names.get(environmentId) ?? call.owner,
    DEFAULT_HOOK_TIMEOUT_MS,
  );
  hooksWorker.worker.ref?.();
  let pending;
  return new Promise((resolve, reject) => {
    let timer = setTimeout(settleCallRejection, DEFAULT_HOOK_TIMEOUT_MS, {
      pendingCalls: hooksWorker.pendingCalls,
      callId: setup,
      settleIdle: () => markWorkerIdle(hooksWorker),
      reject: () => reject(new AskRefusedError(teardown, methodLabel)),
      reason: teardown,
    });
    timer.unref();
    hooksWorker.pendingCalls.set(setup, {
      resolve: (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      reject: (thirdResult) => {
        clearTimeout(timer);
        reject(thirdResult);
      },
      callee: environmentId,
      callers,
      lent: behind?.lent ?? [],
      facts: behind?.facts,
      scope: currentScope(),
    });
    pending = hooksWorker.pendingCalls.get(setup);
    try {
      postToWorker(hooksWorker, {
        type: "call",
        callId: setup,
        environmentId,
        call,
        callers,
      });
    } catch (error) {
      clearTimeout(timer);
      hooksWorker.pendingCalls.delete(setup);
      reject(new HooksError(`${methodLabel}: arguments are not plain data: ${errorMessage(error)}`));
      return;
    }
    ensureHeartbeat(hooksWorker);
  }).finally(() => {
    endScope(pending);
  });
}
//@ chunk-e6aww6q8.js:4099986-4100139 placement
function rejectAbandonedDispatch(host, id) {
  let pending = takePending(host.inFlight, id);
  if (pending === undefined) return;
  pending.unlink();
  pending.reject(new HooksError(`did not settle within ${LINGER_GRACE_MS}ms of its signal aborting`));
  markWorkerIdle(host);
}
//@ chunk-e6aww6q8.js:4100139-4101943 placement
/**
 * 向 hooks worker 分发一次事件：序列化参数、处理中止和 DataCloneError。
 */
function dispatchToHooksWorker(hooksWorker, { request, next, signal }) {
  if (hooksWorker.died !== undefined) return Promise.reject(new HooksError(hooksWorker.died));
  let {
    id,
    event,
    payload,
    environments,
    leftOut,
    origin,
    hookOrigin,
    raise,
    floors,
    cutAt,
    ended,
    caughtBy,
  } = request;
  function onAbort() {
    if (hooksWorker.inFlight.has(id)) {
      postToWorker(hooksWorker, {
        type: "abort",
        id,
        reason: errorMessage(signal.reason),
        ...settledIfPlainData(signal),
      });
      setTimeout(rejectAbandonedDispatch, LINGER_GRACE_MS, hooksWorker, id).unref();
    }
  }
  hooksWorker.worker.ref?.();
  let dialog;
  let askUserQuestionRenderRequest = parseAskUserQuestionRenderRequest(event, payload);
  let unsubscribe = () => {};
  let rootEvent = rootEventDispatches(hooksWorker.host, request);
  let isTopLevel =
    ended === undefined && !isDispatchFrameOpen() && !isInterfaceCallOpen() && rootEvent !== "session.start";
  return new Promise((resolve, reject) => {
    if (askUserQuestionRenderRequest !== undefined)
      unsubscribe = surfaceRowLedger.onFreed((budgetKey) => {
        if (surfaceBudgetKey(budgetKey) === surfaceBudgetKey(askUserQuestionRenderRequest))
          postToWorker(hooksWorker, {
            type: "dialog_clients",
            site: askUserQuestionRenderRequest,
            clients: surfaceRowLedger.clientsOf(askUserQuestionRenderRequest),
          });
      });
    let output = passthroughOutput({
      resolve,
      reject,
      cwd: getCwd(),
      inCallerContext: bindAsyncResource(),
      event,
      payload,
      origin: hookOrigin,
      signal,
      sentAtPing: hooksWorker.pingCounter,
      answersSent: 0,
      environments,
      turnHeld: turnHeldDispatches(hooksWorker.host, request),
      rootEvent,
      isPersonInput: isPersonGestureEvent(event, payload),
      gestureAt: request.gestureAt,
      pressOwner: callerPluginOf(event, payload),
      listedMedia: submittedAttachmentIds(event, payload),
      tool: toolNameOfCall(event, payload),
      scope: currentScope(),
      next,
      calls: new Map(),
      caughtBy: isTopLevel ? (caughtBy ?? []) : [],
      failed: new Set(),
      unlink: () => {},
    });
    dialog = output;
    bumpPluginEpochs(hooksWorker.work, environments);
    hooksWorker.inFlight.set(id, output);
    try {
      postToWorker(hooksWorker, {
        type: "dispatch",
        id,
        event,
        payload,
        environments: [...environments],
        leftOut: leftOut?.map((secondOutput) => ({
          environmentId: secondOutput.environmentId,
          registrations: [...secondOutput.registrations],
        })),
        origin,
        raise,
        floors: floors === undefined ? undefined : [...floors],
        cutAt,
        names: getEventPathNames(event),
        dialogClients:
          askUserQuestionRenderRequest === undefined
            ? []
            : surfaceRowLedger.clientsOf(askUserQuestionRenderRequest),
        ...(ended !== undefined && {
          ended,
        }),
      });
    } catch (error) {
      hooksWorker.inFlight.delete(id);
      let value = errorMessage(error);
      let joined = environments
        .map((environment) => hooksWorker.names.get(environment) ?? environment)
        .join(", ");
      let fifthValue =
        error instanceof RangeError || (error instanceof DOMException && error.name === "DataCloneError");
      let n6Value = fifthValue ? classicWithholding(event, payload) : undefined;
      let n7Value = fifthValue ? "is not plain data" : "could not be posted to the hooks worker";
      reject(
        n6Value === undefined
          ? new HooksError(`${event} event ${n7Value}: ${value}`)
          : tagWeak(
              new HooksError(`${joined}: ${event}: could not be given its argument: ` + value),
              n6Value,
            ),
      );
      return;
    }
    ensureHeartbeat(hooksWorker);
    output.unlink = forwardAbort(signal, {
      abort: onAbort,
    });
  }).finally(() => {
    unsubscribe();
    endScope(dialog);
    settleWorkerIdle(hooksWorker);
  });
}
//@ chunk-e6aww6q8.js:4101943-4103654 placement
/**
 * 把流式事件分发给 hooks worker（stream_pull/stream_close），检查参数是否为纯数据。
 */
function dispatchStreamToHooksWorker(host, { request, next, signal }) {
  let { id, event, payload, environments, leftOut, origin, hookOrigin } = request;
  return teeGeneratorResult(async function* () {
    if (host.died !== undefined) throw new HooksError(host.died);
    let stream;
    let pending = false;
    let secondId = {
      open: next,
      opened: new Map(),
      pull: undefined,
    };
    let value = passthroughOutput({
      resolve: () => {},
      reject: (n8Value) => {
        stream = n8Value;
        secondId.pull?.reject(n8Value);
        secondId.pull = undefined;
      },
      cwd: getCwd(),
      inCallerContext: bindAsyncResource(),
      event,
      payload,
      origin: hookOrigin,
      signal,
      sentAtPing: host.pingCounter,
      answersSent: 0,
      environments,
      turnHeld: turnHeldDispatches(host.host, request),
      rootEvent: rootEventDispatches(host.host, request),
      isPersonInput: isPersonGestureEvent(event, payload),
      gestureAt: request.gestureAt,
      pressOwner: callerPluginOf(event, payload),
      listedMedia: submittedAttachmentIds(event, payload),
      scope: currentScope(),
      next: () => Promise.reject(new HooksError(`${event}: a streaming hop takes next_pull`)),
      calls: new Map(),
      caughtBy: [],
      failed: new Set(),
      unlink: () => {},
      stream: secondId,
    });
    function n9Value() {
      if (host.inFlight.has(id)) {
        postToWorker(host, {
          type: "abort",
          id,
          reason: errorMessage(signal.reason),
          ...settledIfPlainData(signal),
        });
        setTimeout(rejectAbandonedDispatch, LINGER_GRACE_MS, host, id).unref();
      }
    }
    host.worker.ref?.();
    bumpPluginEpochs(host.work, environments);
    host.inFlight.set(id, value);
    try {
      postToWorker(host, {
        type: "dispatch_stream",
        id,
        event,
        payload,
        environments: [...environments],
        leftOut: leftOut?.map((n10Value) => ({
          environmentId: n10Value.environmentId,
          registrations: [...n10Value.registrations],
        })),
        origin,
        raise: request.raise,
        floors: request.floors === undefined ? undefined : [...request.floors],
        dialogClients: [],
      });
    } catch (error) {
      host.inFlight.delete(id);
      settleWorkerIdle(host);
      throw new HooksError(`${event} event is not plain data: ${errorMessage(error)}`);
    }
    ensureHeartbeat(host);
    value.unlink = forwardAbort(signal, {
      abort: n9Value,
    });
    try {
      while (true) {
        if (stream !== undefined) throw stream;
        let promise = await new Promise((resolve, reject) => {
          secondId.pull = {
            resolve,
            reject,
          };
          postToWorker(host, {
            type: "stream_pull",
            id,
          });
        });
        secondId.pull = undefined;
        if (promise.done) {
          pending = true;
          clearOverruns(host, value);
          return promise.value;
        }
        yield promise.value;
      }
    } finally {
      endScope(value);
      host.inFlight.delete(id);
      value.unlink();
      if (!pending && host.died === undefined)
        postToWorker(host, {
          type: "stream_close",
          id,
        });
      for (let n11Value of secondId.opened.values())
        Promise.resolve(n11Value.return(undefined)).catch(() => {
          return;
        });
      secondId.opened.clear();
      settleWorkerIdle(host);
    }
  });
}
//@ chunk-e6aww6q8.js:4103654-4103758 placement
function runAsLoadedModule(environmentId, isLive, fn) {
  let any = getPluginRegistry().loadedModules.some(
    (loadedModule) => loadedModule.environmentId === environmentId,
  );
  return dispatchFrameStorage.run(any ? undefined : isLive, fn);
}
//@ chunk-e6aww6q8.js:4103758-4104203 placement
/**
 * 求插件调用的来源链（分发、注册、服务与根事件）。
 */
function callOriginFor(host, callee, { dispatchId, registration, serving, rootEvent }) {
  let secondDispatchId = host.names.get(callee);
  let secondRegistration = dispatchId === undefined ? undefined : host.inFlight.get(dispatchId);
  let secondServing =
    secondRegistration?.environments.includes(callee) === true ? secondRegistration : undefined;
  let secondRootEvent =
    serving === undefined ? undefined : (host.pendingCalls.get(serving) ?? host.answeredCalls.get(serving));
  if (secondDispatchId === undefined) return secondServing?.origin ?? [];
  let registered = secondRootEvent?.callee === callee ? secondRootEvent : undefined;
  let origin = secondServing === undefined && registered === undefined && rootEvent === undefined;
  return buildCallerChain(secondDispatchId, {
    dispatch: secondServing,
    held: undefined,
    registration: origin ? undefined : registration,
    served: origin ? collectLentFrames(host.pendingCalls.values(), callee) : registered,
  });
}
//@ chunk-e6aww6q8.js:4104203-4105332 placement
/**
 * 为 worker 发起的宿主操作构造调用者上下文：插件、信号、来源链、cwd、根事件、按键担保、是否服务模型调用等。
 */
function buildOpCaller(host, { environmentId, plugin, frame, signal }) {
  let { dispatchId, serving } = frame;
  let dispatch = dispatchId === undefined ? undefined : host.inFlight.get(dispatchId);
  let memberDispatch = dispatch?.environments.includes(environmentId) === true ? dispatch : undefined;
  let hasServing = serving !== undefined;
  let pendingCall = hasServing ? host.pendingCalls.get(serving) : undefined;
  let call = pendingCall ?? (hasServing ? host.answeredCalls.get(serving) : undefined);
  let isUnregistered = frame.registration === undefined;
  let isServedByCallee = isUnregistered && call?.callee === environmentId;
  let inheritedFacts = isServedByCallee
    ? inheritDispatchFacts(call, environmentId, isCurrentPendingCall(host.pendingCalls, serving, call))
    : undefined;
  let facts = isServedByCallee ? inheritedFacts : memberDispatch;
  let isPersonInput = isUnregistered && isPersonInputEvent(facts?.rootEvent);
  let isSamePress = !isUnregistered && isSamePressOwner(memberDispatch, host.names.get(environmentId));
  let hasDispatch = !isUnregistered && memberDispatch !== undefined;
  let listedMedia = isUnregistered ? undefined : memberDispatch?.listedMedia;
  let isStandalone = isUnregistered && !isServedByCallee;
  let gestureAt = isStandalone ? latestGestureAt(host.sentPresses.values(), environmentId) : undefined;
  let effectiveGestureAt = isSamePress ? memberDispatch?.gestureAt : gestureAt;
  let keptPress = isStandalone ? pressForEnv(host.keptPresses, frame.pressing, environmentId) : undefined;
  let modelCall =
    !isUnregistered && isModelOriginToolCall(memberDispatch, plugin) ? memberDispatch : undefined;
  return {
    plugin,
    signal,
    origin: callOriginFor(host, environmentId, frame),
    cwd: facts?.cwd,
    scopeHolder: memberDispatch ?? (pendingCall?.callee === environmentId ? pendingCall : undefined),
    turnHeld: facts?.turnHeld,
    rootEvent: (isPersonInput ? undefined : facts?.rootEvent) ?? frame.rootEvent,
    ownRoot: frame.rootEvent,
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
      memberDispatch?.isPersonInput === true && {
        isPersonInput: true,
      }),
    ...(hasDispatch && {
      judging: memberDispatch,
    }),
    ...(listedMedia !== undefined && {
      listedMedia,
    }),
    isDispatching: isServedByCallee
      ? inheritedFacts?.isDispatching
      : isCurrentPendingCall(host.inFlight, dispatchId, memberDispatch),
    environmentId,
    callers: callersOfServing(host, environmentId, frame.serving),
  };
}
//@ chunk-e6aww6q8.js:4105332-4106035 placement
/**
 * 为 worker 的流式宿主操作打开流：绑定中止、经 qMe 调用宿主，失败时返回 HooksError。
 */
function openOpStream(host, { environmentId, key, frame }) {
  let { open } = frame;
  let pluginName = host.names.get(environmentId);
  if (open === undefined) return new HooksError("no stream is open for this op");
  if (pluginName === undefined) return new HooksError(`${open.op}: the plugin's environment is unloaded`);
  let abortController = new AbortController();
  let { dispatchId } = open;
  let secondFrame = dispatchId === undefined ? undefined : host.inFlight.get(dispatchId);
  let entry = forwardAbort(secondFrame?.signal, abortController);
  let stream = {
    isOver: false,
  };
  function pull() {
    stream.isOver = true;
    entry();
    host.opControllers.delete(key);
    host.opStreams.delete(key);
  }
  try {
    let stream_2 = runAsLoadedModule(environmentId, stream, () =>
      streamOpForPlugin(host.host, {
        op: open.op,
        args: open.args,
        caller: buildOpCaller(host, {
          environmentId,
          plugin: pluginName,
          frame: open,
          signal: abortController.signal,
        }),
      }),
    );
    let secondStream = {
      op: open.op,
      stream: stream_2,
      dispatchId,
      mark: stream,
      end: pull,
    };
    host.opControllers.set(key, abortController);
    host.opStreams.set(key, secondStream);
    return secondStream;
  } catch (error) {
    stream.isOver = true;
    entry();
    return error instanceof HooksError ? error : new HooksError(errorMessage(error));
  }
}
//@ chunk-e6aww6q8.js:4106035-4106933 placement
/**
 * 处理 worker 的 op_pull/op_close：拉取下一块并回传 op_result/op_error，关闭时中止并回收。
 */
function pumpOpStream(host, { environmentId, port, frame }) {
  let { opId } = frame;
  let key = `${environmentId}:${opId}`;
  let entry = host.opStreams.get(key);
  if (frame.type === "op_close") {
    host.opControllers.get(key)?.abort(new HooksError("the stream was let go"));
    entry?.end();
    entry?.stream.return(undefined).catch(() => {
      return;
    });
    return;
  }
  function pendingPull(isAbort, isClose) {
    if (host.ports.get(environmentId) !== port) return;
    port.postMessage(isAbort);
    let { dispatchId } = isClose ?? {};
    let step = dispatchId === undefined ? undefined : host.inFlight.get(dispatchId);
    if (step !== undefined) step.answersSent += 1;
  }
  let result =
    entry ??
    openOpStream(host, {
      environmentId,
      key,
      frame,
    });
  if (result instanceof HooksError) {
    pendingPull({
      type: "op_error",
      opId,
      error: result.message,
    });
    return;
  }
  let value = trackPluginOp(host.work, environmentId, result.op);
  runAsLoadedModule(environmentId, result.mark, () => result.stream.next()).then(
    (n12Value) => {
      value();
      if (n12Value.done === true) result.end();
      try {
        pendingPull(
          {
            type: "op_result",
            opId,
            value: {
              done: n12Value.done === true,
              value: n12Value.value,
            },
          },
          result,
        );
      } catch (error) {
        result.end();
        result.stream.return(undefined).catch(() => {
          return;
        });
        pendingPull(
          {
            type: "op_error",
            opId,
            error: `a chunk that is not plain data: ${errorMessage(error)}`,
          },
          result,
        );
      }
    },
    (error) => {
      value();
      result.end();
      pendingPull(
        {
          type: "op_error",
          opId,
          error: errorMessage(error),
        },
        result,
      );
    },
  );
}
//@ chunk-e6aww6q8.js:4106933-4108452 placement
/**
 * 处理 worker 侧操作流（op_pull/op_close/op_abort/op_result），环境已卸载时报错。
 */
function handleWorkerOpStream(host, { environmentId, port, frame }) {
  if (frame.type === "flushed") {
    let flush = takePending(host.pendingFlushes, `${environmentId}:${frame.flushId}`);
    if (flush)
      Promise.allSettled(
        [...(host.runningOps.get(environmentId) ?? [])].filter(
          (opId) => !submitMarksSlot.get() || !host.startOps.has(opId),
        ),
      ).then(() => {
        flush.resolve();
        settleWorkerIdle(host);
      });
    return;
  }
  if (frame.type === "op_pull" || frame.type === "op_close") {
    pumpOpStream(host, {
      environmentId,
      port,
      frame,
    });
    return;
  }
  let opKey = `${environmentId}:${frame.opId}`;
  if (frame.type === "op_abort") {
    host.opControllers.get(opKey)?.abort(new HooksError(frame.reason));
    host.opControllers.delete(opKey);
    return;
  }
  let { opId, op, dispatchId } = frame;
  let pluginName = host.names.get(environmentId);
  let isDispatchOp = dispatchId !== undefined && !isUiEventName(op);
  function post(reply) {
    if (host.ports.get(environmentId) !== port) return;
    port.postMessage(reply);
    let dispatch = isDispatchOp ? host.inFlight.get(dispatchId) : undefined;
    if (dispatch !== undefined) dispatch.answersSent += 1;
  }
  if (pluginName === undefined) {
    post({
      type: "op_error",
      opId,
      error: `${frame.op}: the plugin's environment is unloaded`,
    });
    return;
  }
  let abortController = new AbortController();
  host.opControllers.set(opKey, abortController);
  let envId = trackPluginOp(host.work, environmentId, frame.op);
  let secondFrame = host.runningOps.get(environmentId) ?? new Set();
  host.runningOps.set(environmentId, secondFrame);
  let thirdFrame = dispatchId === undefined ? undefined : host.inFlight.get(dispatchId);
  let fourthFrame = forwardAbort(thirdFrame?.signal, abortController);
  let fifthFrame = {
    isOver: false,
  };
  let n6Frame = runAsLoadedModule(environmentId, fifthFrame, () =>
    runInterfaceCall(() =>
      interfaceCallForPlugin(host.host, {
        op: frame.op,
        args: frame.args,
        caller: buildOpCaller(host, {
          environmentId,
          plugin: pluginName,
          frame,
          signal: abortController.signal,
        }),
      }),
    ),
  ).finally(() => {
    fifthFrame.isOver = true;
    fourthFrame();
    host.opControllers.delete(opKey);
    envId();
    secondFrame.delete(n6Frame);
    host.startOps.delete(n6Frame);
  });
  let n7Frame = !isHumanInitiatedSite(frame.op) && !isClockMethod(frame.op);
  let n8Frame = Boolean(submitMarksSlot.get() && isSubmittableEvent(thirdFrame?.rootEvent));
  if (n7Frame) {
    secondFrame.add(n6Frame);
    if (n8Frame) host.startOps.add(n6Frame);
  }
  n6Frame.then(
    (value) => {
      try {
        post({
          type: "op_result",
          opId,
          value,
        });
      } catch (error) {
        post({
          type: "op_error",
          opId,
          error: `${frame.op}: result is not plain data: ` + errorMessage(error),
        });
      }
    },
    (error) =>
      post({
        type: "op_error",
        opId,
        error: errorMessage(error),
      }),
  );
}
//@ chunk-e6aww6q8.js:4108452-4109085 placement
/**
 * 在 worker 中加载一个插件环境：建立专用消息端口、设置加载超时，发送 load 消息并等待注册结果。
 */
function loadEnvironmentInWorker(hooksWorker, envId, n8Load) {
  if (hooksWorker.died !== undefined) return Promise.reject(new HooksError(hooksWorker.died));
  hooksWorker.names.set(envId, n8Load.pluginName);
  let messageChannel = new MessageChannel();
  let port1 = messageChannel.port1;
  hooksWorker.ports.set(envId, port1);
  port1.onmessage = (channel) =>
    handleWorkerOpStream(hooksWorker, {
      environmentId: envId,
      port: port1,
      frame: channel.data,
    });
  unrefTimer(port1);
  let port = armLoadTimeout(hooksWorker, {
    pending: hooksWorker.pendingLoads,
    environmentId: envId,
    reason: (load) => notLoadedWithinText(n8Load.pluginName, load),
  });
  return new Promise((resolve, reject) => {
    hooksWorker.pendingLoads.set(envId, {
      resolve: (n9Load) => {
        clearTimeout(port);
        resolve(n9Load);
      },
      reject: (n10Load) => {
        clearTimeout(port);
        hooksWorker.names.delete(envId);
        closeEnvironmentPort(hooksWorker, envId);
        postToWorker(hooksWorker, {
          type: "unload",
          environmentId: envId,
        });
        reject(n10Load);
      },
    });
    if (hooksWorker.died !== undefined) {
      reject(new HooksError(hooksWorker.died));
      return;
    }
    hooksWorker.worker.postMessage(
      {
        type: "load",
        environmentId: envId,
        args: n8Load,
        port: messageChannel.port2,
      },
      [messageChannel.port2],
    );
    ensureHeartbeat(hooksWorker);
  });
}
//@ chunk-e6aww6q8.js:4109085-4109861 placement
function uiPressInWorker(host, { environmentId, handle, e }) {
  if (host.died !== undefined) return Promise.reject(new HooksError(host.died));
  let pressId = ++host.pressCounter;
  host.worker.ref?.();
  host.sentPresses.set(pressId, {
    environmentId,
    gestureAt: getAsyncStoreS61(),
  });
  notePressDispatch(host.keptPresses, pressId, environmentId);
  return new Promise((resolve, reject) => {
    let timer = setTimeout(settleCallRejection, DEFAULT_HOOK_TIMEOUT_MS, {
      pendingCalls: host.pendingPresses,
      callId: pressId,
      settleIdle: () => markWorkerIdle(host),
      reject,
      reason: `ui.press: ${host.names.get(environmentId) ?? environmentId} did not answer within ${DEFAULT_HOOK_TIMEOUT_MS}ms`,
    });
    timer.unref();
    host.pendingPresses.set(pressId, withClearedTimeout(timer, resolve, reject));
    try {
      postToWorker(host, {
        type: "press",
        pressId,
        environmentId,
        handle,
        e,
      });
    } catch (error) {
      clearTimeout(timer);
      host.pendingPresses.delete(pressId);
      reject(new HooksError(`ui.press: the press is not plain data: ${errorMessage(error)}`));
      return;
    }
    ensureHeartbeat(host);
  }).finally(() => {
    let press = () => {
      host.sentPresses.delete(pressId);
      markPressAnswered(host.keptPresses, pressId);
    };
    try {
      flushEnvironmentPort(host, environmentId, {
        resolve: press,
        reject: press,
      });
    } catch (error) {
      logError(error);
      press();
    }
  });
}
//@ chunk-e6aww6q8.js:4109861-4110304 placement
/**
 * 请求 worker 解析某环境的 UI 元素表（带超时）。
 */
function resolveTablesInWorker(hooksWorker, environmentId, requests) {
  if (hooksWorker.died !== undefined) return Promise.reject(new HooksError(hooksWorker.died));
  let resolveId = ++hooksWorker.resolveCounter;
  return new Promise((resolve, reject) => {
    let timer = setTimeout(settleCallRejection, HOOKS_READY_TIMEOUT_MS + DEFAULT_HOOK_TIMEOUT_MS, {
      pendingCalls: hooksWorker.pendingResolves,
      callId: resolveId,
      settleIdle: () => markWorkerIdle(hooksWorker),
      reject,
      reason: `ui.resolve: ${hooksWorker.names.get(environmentId) ?? environmentId}'s element tables were not resolved within ${HOOKS_READY_TIMEOUT_MS + DEFAULT_HOOK_TIMEOUT_MS}ms`,
    });
    timer.unref();
    hooksWorker.pendingResolves.set(resolveId, withClearedTimeout(timer, resolve, reject));
    postToWorker(hooksWorker, {
      type: "resolve",
      resolveId,
      environmentId,
      requests,
    });
    ensureHeartbeat(hooksWorker);
  });
}
//@ chunk-e6aww6q8.js:4110304-4110491 placement
/**
 * 卸载 worker 中的一个环境：清理名字、工作计数、按键记录与端口，并发送 unload。
 */
function unloadEnvironmentInWorker(state, envId) {
  let pluginName = state.names.get(envId);
  if (pluginName !== undefined) state.overruns.delete(pluginName);
  state.names.delete(envId);
  state.work.delete(envId);
  dropEnvPresses(state.keptPresses, envId);
  abortEnvironmentOps(state, envId, pluginName);
  closeEnvironmentPort(state, envId);
  postToWorker(state, {
    type: "unload",
    environmentId: envId,
  });
}
//@ chunk-e6aww6q8.js:4110491-4112415 placement
/**
 * 终止 hooks worker 并卸载各插件环境，记录未能完成的卸载。
 */
function terminateHooksWorker(host) {
  let hooksWorker = spawnHooksWorker(host);
  let input = passthroughInput({
    kind: "worker",
    get died() {
      return hooksWorker.died;
    },
    get kept() {
      return hooksWorker.kept?.crash;
    },
    isKeptVerdict: (dispatchId, answered) => releaseKeptHop(hooksWorker, dispatchId, answered),
    unloadCrashed(envId, pluginName) {
      host.state
        .queue(async () => {
          let found = getPluginRegistry().loadedModules.find(
            (loadedModule) => loadedModule.environmentId === envId,
          );
          if (found !== undefined) await unloadHooksModules(host, new Set([found.name]), pluginName);
        })
        .catch((error) =>
          logForDebugging(
            `hooks worker: the unload of environment ${envId}, kept for a .catch that matched nothing, failed: ` +
              errorMessage(error),
            {
              level: "error",
            },
          ),
        );
    },
    replaced() {
      return hooksWorker.died !== undefined && !isDispatchFrameOpen()
        ? waitForDeathsSettled(host)
        : undefined;
    },
    isDeclared: (name) => host.state.knownArgs.has(name),
    nextDispatchId: () => ++hooksWorker.dispatchCounter,
    inFlight: () => hooksWorker.inFlight.values(),
    workInFlight: (key) => countActingOps(hooksWorker.work, hooksWorker.inFlight.values(), key),
    nameOf: (envId) => hooksWorker.names.get(envId),
    load: (envId, n11Load) => loadEnvironmentInWorker(hooksWorker, envId, n11Load),
    unload: (envId) => unloadEnvironmentInWorker(hooksWorker, envId),
    dispatch: (request, next, signal) =>
      dispatchToHooksWorker(hooksWorker, {
        request,
        next,
        signal,
      }),
    dispatchStream: (request, next, signal) =>
      dispatchStreamToHooksWorker(hooksWorker, {
        request,
        next,
        signal,
      }),
    build(pluginName, table, suppressed) {
      if (hooksWorker.died !== undefined) return Promise.reject(new HooksError(hooksWorker.died));
      let deferred = Promise.withResolvers();
      hooksWorker.pendingBuilds.set(
        pluginName,
        withClearedTimeout(
          armLoadTimeout(hooksWorker, {
            pending: hooksWorker.pendingBuilds,
            environmentId: pluginName,
            reason: (request) =>
              `${hooksWorker.names.get(pluginName) ?? pluginName}: $ not built within ${request}ms`,
          }),
          deferred.resolve,
          deferred.reject,
        ),
      );
      postToWorker(hooksWorker, {
        type: "build",
        environmentId: pluginName,
        table,
        suppressed,
      });
      ensureHeartbeat(hooksWorker);
      return deferred.promise;
    },
    resolveTables: (request, requests) => resolveTablesInWorker(hooksWorker, request, requests),
    callInterface: (environmentId, call, behind) =>
      callInterfaceInWorker(hooksWorker, {
        environmentId,
        call,
        behind,
      }),
    press: (environmentId, handle, caller) =>
      uiPressInWorker(hooksWorker, {
        environmentId,
        handle,
        e: caller,
      }),
    releasePresses(environmentId, call) {
      if (call.length > 0 && hooksWorker.died === undefined)
        postToWorker(hooksWorker, {
          type: "press_release",
          environmentId,
          handles: call,
        });
    },
    opsDelivered() {
      if (hooksWorker.died !== undefined) return Promise.reject(new HooksError(hooksWorker.died));
      let mapped = [...hooksWorker.ports.keys()].map(
        (key) =>
          new Promise((resolve, reject) => {
            flushEnvironmentPort(hooksWorker, key, {
              resolve,
              reject,
            });
          }),
      );
      if (mapped.length > 0) ensureHeartbeat(hooksWorker);
      return Promise.all(mapped).then(() => {
        return;
      });
    },
    terminate() {
      markWorkerDead(hooksWorker, "the hooks worker was terminated");
      hooksWorker.worker.terminate();
      hooksWorker.spawned.release?.();
    },
  });
  hooksWorker.worker.addEventListener("message", (n9Frame) =>
    handleHooksWorkerMessage(hooksWorker, n9Frame.data),
  );
  hooksWorker.worker.addEventListener("error", (n10Frame) => respawnOnWorkerEnd(hooksWorker, n10Frame));
  hooksWorker.worker.addEventListener("close", (n11Frame) => respawnOnWorkerEnd(hooksWorker, n11Frame));
  hooksWorker.worker.unref?.();
  return input;
}
//@ chunk-e6aww6q8.js:4112415-4112612 placement
/**
 * 取得当前可用的环境宿主（worker 或同线程，按 CLAUDE_CODE_HOOKS_SAME_THREAD），宿主已死或类型变化时重建。
 */
function ensureEnvironmentHost(host) {
  {
    let kind = hookHostKind();
    let environmentHost = host.state.environmentHost;
    if (
      environmentHost === undefined ||
      environmentHost.died !== undefined ||
      environmentHost.kind !== kind
    ) {
      environmentHost?.terminate();
      let secondHost =
        kind === "same-thread" ? createSameThreadEnvironmentHost(host) : terminateHooksWorker(host);
      host.state.environmentHost = secondHost;
      return secondHost;
    }
    return environmentHost;
  }
}
//@ chunk-e6aww6q8.js:4112612-4112726 placement
async function waitOpsDelivered(hooksHost) {
  await Promise.all(
    [hooksHost.state.environmentHost, hooksHost.state.nativeHost].map((host) => host?.opsDelivered()),
  );
}
//@ chunk-e6aww6q8.js:4112726-4112741 placement
/**
 * 原样返回
 */
var passthroughInput = (value) => value;
//@ chunk-e6aww6q8.js:4112741-4112830 placement
/**
 * 清掉死掉的宿主
 */
function clearDeadEnvironmentHost(host) {
  if (host.state.environmentHost?.died !== undefined) host.state.environmentHost = undefined;
}
//@ chunk-e6aww6q8.js:4112830-4112845 placement
/**
 * 原样返回
 */
var passthroughOutput = (value) => value;
//@ chunk-e6aww6q8.js:4112845-4113140 placement
/**
 * 判断事件是否由人的操作触发：ui.press/input/select 总是；prompt.submit/command.run/ui.scroll 看 origin 是否来自输入框、桥接或人。
 */
function isPersonGestureEvent(event, payload) {
  switch (event) {
    case "ui.press":
    case "ui.input":
    case "ui.select":
      return true;
    case "prompt.submit":
    case "command.run":
    case "ui.scroll": {
      let origin = "origin" in payload ? payload.origin : null;
      let kind = typeof origin === "object" && origin !== null && "kind" in origin ? origin.kind : null;
      return kind === "composer" || kind === "bridge" || kind === "person";
    }
    default:
      return false;
  }
}
//@ chunk-e6aww6q8.js:4113140-4113371 placement
/**
 * prompt.submit 载荷里的附件 id 列表。
 */
function submittedAttachmentIds(event, payload) {
  if (event !== "prompt.submit") return;
  let attachments = "attachments" in payload ? payload.attachments : undefined;
  return (Array.isArray(attachments) ? attachments : []).flatMap((entry) => {
    let id = typeof entry === "object" && entry !== null && "id" in entry ? entry.id : undefined;
    return typeof id === "string" ? [id] : [];
  });
}
//@ chunk-e6aww6q8.js:4113371-4113524 placement
var createNativeHost = (host) => {
  logForDebugging("hooks native host made (for the plugins the binary carries)");
  return createSameThreadHost(host, {
    kind: "native",
    copy: (n12Load) => n12Load,
    answer: (n13Load, n14Load) => n14Load,
    createEnvironment: assembleHooksModuleRuntime,
  });
};
//@ chunk-e6aww6q8.js:4113524-4113650 placement
/**
 * 取得原生（进程内、二进制自带插件）宿主，不存在或已死时创建。
 */
function ensureNativeHost(host) {
  {
    let nativeHost = host.state.nativeHost;
    if (nativeHost !== undefined && nativeHost.died === undefined) return nativeHost;
    let nativeHost_2 = createNativeHost(host);
    host.state.nativeHost = nativeHost_2;
    return nativeHost_2;
  }
}
//@ chunk-e6aww6q8.js:4113650-4113746 placement = _temp0 (1)
/**
 * 取事件来源插件
 */
function callerPluginOf(event, payload) {
  let plugin = "plugin" in payload ? payload.plugin : undefined;
  return isPersonInputEvent(event) && typeof plugin === "string" ? plugin : undefined;
}
//@ chunk-e6aww6q8.js:4113746-4113888 placement
function retireHosts(hooksHost) {
  hooksHost.state.environmentHost?.terminate();
  hooksHost.state.environmentHost = undefined;
  hooksHost.state.nativeHost?.terminate();
  hooksHost.state.nativeHost = undefined;
}
//@ chunk-e6aww6q8.js:4113888-4113926 placement
/**
 * 根事件分发
 */
function rootEventDispatches(host, request) {
  return withInFlightDispatches(host, request, rootEventForOrigin);
}
//@ chunk-e6aww6q8.js:4113926-4114008 placement
/**
 * 未等待的 Promise 被拒
 */
var UNAWAITED_REJECTION = (message) =>
  "hooks (same thread): a promise a plugin did not await rejected: " + message;
//@ chunk-e6aww6q8.js:4114008-4114157 placement
/**
 * 同线程宿主的拒绝处理：把宿主操作失败与环境内值转换为对应错误。
 */
var createSameThreadRejectionHandler = (hookHostBridge) =>
  claimPendingWriteLine((op, level) => {
    let failure = hookHostBridge.opFailureOf(op);
    if (failure !== undefined) return UNAWAITED_REJECTION(unawaitedOpMessage(failure));
    let text = isUntrustedObject(op) ? level : op;
    return !isUntrustedObject(text) && hookHostBridge.ownsValue(text)
      ? UNAWAITED_REJECTION(rejectionText(op))
      : undefined;
  });
//@ chunk-e6aww6q8.js:4114157-4114226 placement
/**
 * 未等待拒绝的说明
 */
function unawaitedRejectionText(error) {
  let payload = readTag(error);
  if (payload === undefined) return;
  return UNAWAITED_REJECTION(unawaitedOpMessage(payload));
}
//@ chunk-e6aww6q8.js:4114226-4114247 placement
/**
 * 未处理拒绝处理器
 */
var unhandledRejectionHandler = () => claimPendingWriteLine(unawaitedRejectionText);
//@ chunk-e6aww6q8.js:4114247-4114285 placement
/**
 * 回合内分发
 */
function turnHeldDispatches(host, request) {
  return withInFlightDispatches(host, request, turnHeldEventFor);
}
//@ chunk-e6aww6q8.js:4114285-4114329 placement
/**
 * 不是纯数据
 */
var notPlainDataText = (label, detail) => `${label}: not plain data: ${detail}`;
//@ chunk-e6aww6q8.js:4114329-4114400 placement
/**
 * 克隆失败转 HooksError
 */
function cloneOrThrow(value, message) {
  try {
    return clone(value);
  } catch (error) {
    throw new HooksError(notPlainDataText(message, errorMessage(error)));
  }
}
//@ chunk-e6aww6q8.js:4114400-4114510 placement
/**
 * tool.call 的 next 结果无法回传时，若带 ref 则改成只带 ref 的空结果。
 */
function emptyToolCallResult(event, result) {
  return event === "tool.call" && "ref" in result && typeof result.ref === "number"
    ? {
        ref: result.ref,
        result: undefined,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:4114510-4114711 placement
function workInFlightAcrossHosts(hooksHost, key) {
  let mapped = [hooksHost.state.environmentHost, hooksHost.state.nativeHost]
    .filter((host) => host !== undefined)
    .map((thirdHost) => thirdHost.workInFlight(key));
  return {
    acting: mapped.reduce((acc, work) => acc + work.acting, 0),
    epoch: mapped.reduce((acc, secondWork) => acc + secondWork.epoch, 0),
  };
}
//@ chunk-e6aww6q8.js:4114711-4114766 placement
/**
 * 音频/派生/渲染宿主操作
 */
var createHostOps = () => ({
  plays: createAudioPlayer(),
  spawns: createAgentSpawner(),
  renders: createRenderInvalidator(),
});
//@ chunk-e6aww6q8.js:4114766-4115500 placement
/**
 * 函数钩子宿主的全部状态：已知插件与参数、环境映射、崩溃计数、扣留记录、加载/折叠中的集合、环境宿主、调用链与预算等。
 */
var createHooksHostState = (queue = createSerialQueue()) => ({
  knownArgs: new Map(),
  environmentArgs: new Map(),
  knownPlugins: new Map(),
  buildFailures: new Map(),
  unloadedSteps: new Map(),
  unattributedCrashes: 0,
  workerSpawns: 0,
  workerDeaths: 0,
  modsOffAt: undefined,
  crashedWithholders: new Map(),
  withholdings: new Map(),
  generations: new Map(),
  optionsReloadFailures: new Map(),
  queue: (state) => queue(() => inDispatchFrame(state)),
  loading: new Set(),
  loadingRead: createSignal(),
  building: undefined,
  admitting: undefined,
  lastTable: {},
  lastEndedBy: undefined,
  isSetRecord: false,
  lastOwners: {},
  withheld: createWithholdingTable({
    table: {},
    order: [],
  }),
  staged: undefined,
  stagedBefore: undefined,
  refusalsLogged: new Set(),
  environmentHost: undefined,
  nativeHost: undefined,
  environmentCounter: 0,
  unadmitted: new Set(),
  replacedEnvironments: new Set(),
  pendingInvalidations: new Set(),
  sentCalls: new Set(),
  chainsAbove: new WeakMap(),
  budgets: createHostOps(),
});
//@ chunk-e6aww6q8.js:4115500-4115673 placement
function createHooksHost() {
  let state = identity_2(createHooksHostState(), (secondState) => {
    secondState.budgets.renders.drop();
    secondState.budgets = createHostOps();
    secondState.workerSpawns = 0;
    secondState.workerDeaths = 0;
    secondState.modsOffAt = undefined;
  });
  return {
    state,
    ops: MODEL_API_CATALOG(state),
    streamOps: PROCESS_SPAWN_API,
  };
}
//@ chunk-e6aww6q8.js:4115673-4115686 placement
/**
 * 宿主操作根
 */
var hostOpsRoot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:4115673", () => {
  hostOpsRoot = createValueSlot();
});
//@ chunk-e6aww6q8.js:4115686-4116682 placement
/**
 * 初始化函数钩子宿主：注册日志与 hookFailed 处理、越过记录，返回加载/重载/卸载、接口调用、宿主操作、退役等方法的门面。
 */
function initHooksHost() {
  let hooksHost = createHooksHost();
  hostOpsRoot.set({
    read: () => waitForModuleReads(hooksHost),
    mayRegisterCommands: () => isLoadingAnyCommandRun(hooksHost),
  });
  skippedHookReporter.set(() => String(getSessionId()));
  hookScopeStore.set((sighting) => recordPassedBySighting(hooksHost, sighting));
  setMatcherLog({
    log: (message, level) =>
      logForDebugging(message, {
        level: level ?? "debug",
      }),
    hookFailed(failure) {
      if (
        failure.environmentId !== undefined &&
        hooksHost.state.replacedEnvironments.has(failure.environmentId)
      )
        return;
      emit(failure);
      reportHookSkip(failure);
      logFunctionHooksRun(failure);
    },
  });
  return {
    loadHooksModules: (plugins, judgedUnder) => startLoadingModules(hooksHost, plugins, judgedUnder),
    mayHookCommand: (command) => isLoadingCommandRun(hooksHost, command),
    mayRegisterCommands: () => isLoadingAnyCommandRun(hooksHost),
    loadingScansRead: () => waitForModuleReads(hooksHost),
    onLoadingScansRead: (listener) => hooksHost.state.loadingRead.subscribe(listener),
    pruneHooksModules: (names) => unloadDisabledPlugins(hooksHost, names),
    reloadHooksModule: (name) => queueReload(name, hooksHost),
    retryUnloadedModules: () => hooksHost.state.unloadedSteps.clear(),
    refreshOptions: () =>
      HOOKS_OPTIONS_STATUS_TEXT(hooksHost, (name) =>
        wrapReloadError(name, () => reloadHooksModuleByName(name, hooksHost)),
      ),
    retargetHooksModule: (name, fn) => retargetKnownPlugin(name, hooksHost, fn),
    loadedFilesOf: (name) => hooksModuleFilesOf(name, hooksHost),
    buildInterfaces: (modules, options) => buildEngineApi(hooksHost, modules, options),
    routeInterfaceCall: (caller, request) =>
      explainApiNotAvailable(
        hooksHost.state,
        {
          caller,
          callers: [],
          lent: [],
        },
        request,
      ),
    runHostOp: (op, args, caller) =>
      interfaceCallForPlugin(hooksHost, {
        op,
        args,
        caller,
      }),
    retireEnvironmentHost: () => retireHosts(hooksHost),
    opsDelivered: () => waitOpsDelivered(hooksHost),
    workInFlight: (key) => workInFlightAcrossHosts(hooksHost, key),
    applyPendingInvalidations: () => applyPendingUiInvalidations(hooksHost),
  };
}
export {
  notPlainDataText,
  cloneOrThrow,
  hostOpsRoot,
  noticeQueue,
  ensureNativeHost,
  ensureEnvironmentHost,
  initHooksHost,
  createSameThreadRejectionHandler,
  unhandledRejectionHandler,
  turnHeldDispatches,
  rootEventDispatches,
  isPersonGestureEvent,
  callerPluginOf,
  submittedAttachmentIds,
  emptyToolCallResult,
  approvalLabelOrUnnamed,
  queueModelNotice,
  validatePassedBySighting,
  runInCallerScope,
  flushEnvironmentPort,
  hookNoticeTask,
  TASK_NOTICE_IS_META,
};
