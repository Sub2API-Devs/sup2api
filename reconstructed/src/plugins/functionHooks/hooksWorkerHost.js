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
  describeHooksModuleState,
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
  validateHooksModuleExports,
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
import { isHumanInitiatedSite, MODEL_API_CATALOG, vZr } from "./apiCatalog.js";
import { isClockMethod } from "./api/operations.js";
import { claimPendingWriteLine, isUntrustedObject } from "../../utils/shutdown/pendingWrites.js";
import { unawaitedOpMessage, rejectionText } from "./vm/moduleLoader.js";
import { clone } from "../../utils/slowOperations.js";
import { createAudioPlayer } from "./audioApi.js";
import { createAgentSpawner } from "./agentApi.js";
import { createSerialQueue } from "./panes.js";
import { createSignal } from "../../utils/signal.js";
import { setMatcherLog } from "../../utils/hooks/functionHookMatchers.js";

//@ chunk-e6aww6q8.js:4080272-4082548 placement
/**
 * worker 重生后的重载流程：多次无归属崩溃时关闭 worker 内 mod；逐个重新描述模块、重建 $（engine.create），处理拒绝与再次折叠，最后替换已加载模块列表并退役旧模块。
 */
var reloadAfterRespawn = (host, n, r) =>
  host.state.queue(async () => {
    clearDeadEnvironmentHost(host);
    host.state.isSetRecord = false;
    let pluginRegistry = getPluginRegistry();
    if (!r.isAttributed && ++host.state.unattributedCrashes >= MAX_UNATTRIBUTED_CRASHES) {
      let Z = knownArgList(host.state);
      let mapped = Z.filter((we) => builtinModuleOf(we) === undefined).map((we) => we.pluginName);
      let all = mapped.every((we) => withheldNounsOf(host.state, we).length === 0);
      for (let we of mapped) forgetPlugin(we, host);
      reportWorkerCrashWithholdings(host.state, new Set(mapped));
      uiLog(
        "hooks",
        `mods that run in the hooks worker are off for this session: it crashed ${host.state.unattributedCrashes} times` +
          (all ? "" : "; what they withheld stays withheld until they reload or are disabled"),
      );
      logModsTurnedOff(host, Z);
    }
    logForDebugging(
      `hooks worker: respawning for ${[...host.state.knownArgs.keys()].join(", ") || "nobody"} (${n})`,
    );
    let y;
    let S = new Map();
    let w = new Set();
    let L = new Set();
    try {
      for (;;) {
        let filtered = knownArgList(host.state).filter((Ie) => {
          let Me = host.state.knownPlugins.get(Ie.pluginName);
          let We = host.state.unloadedSteps.get(Ie.pluginName);
          let ze = We !== undefined && isModuleUnchanged(We, Ie, Me);
          return !w.has(Ie.pluginName) && !ze;
        });
        let Se = [];
        for (let Ie of filtered)
          try {
            let Me = await describeHooksModuleState(host, Ie);
            Me.shown = shownPluginInfo(Ie, host.state.knownPlugins.get(Ie.pluginName));
            Me.judgedUnder = admissionTextFor(
              pluginRegistry.loadedModules.find((loadedModule) => loadedModule.name === Ie.pluginName),
            );
            Se.push(Me);
            host.state.unadmitted.add(Me.environmentId);
            S.set(Me.environmentId, Me);
            bumpGeneration(Ie.pluginName, host);
          } catch (error) {
            w.add(Ie.pluginName);
            logForDebugging(
              `hooks module ${pluginStorageKey(Ie)} failed to load after the respawn: ${errorWithCause(error)}`,
              {
                level: "error",
              },
            );
            if (abandonIfWorkerDied(host, Se, "the respawn")) return;
            forgetMcpServerFor(Ie.pluginName);
            forgetMcpConnectsFor(Ie.pluginName);
            forgetCachedDescribe(Ie.pluginName);
            forgetRegisteredAgent(Ie.pluginName);
            emit({
              plugin: Ie.pluginName,
              event: "*",
              reason: errorMessage(error),
              effect: PLUGIN_UNLOADED_TEXT,
              hasOverrun: false,
            });
          }
        let built = await buildEngineApi(host, Se, {
          ...foldBaseForRespawn(
            host,
            Se.map((Ie) => Ie.name),
          ),
          carried: host.state.lastTable,
        });
        if (filtered.length > 0 && host.state.environmentHost?.died !== undefined) return;
        let { admitted, refused } = await admitBuiltModules(host, {
          built,
          plugins: host.state.knownPlugins,
          seated: L,
        });
        if (filtered.length > 0 && host.state.environmentHost?.died !== undefined) {
          for (let Ie of admitted) Ie.discard();
          return;
        }
        for (let Ie of refused) forgetPlugin(Ie.name, host);
        if (refused.length > 0) liftWithholdings(host.state, new Set(refused.map((Ie) => Ie.name)));
        if (!refused.some((Ie) => Ie.hooks("engine.create"))) {
          y = admitted;
          break;
        }
        for (let Ie of admitted) {
          L.add(Ie.name);
          Ie.discard();
        }
      }
    } finally {
      host.state.admitting = undefined;
      for (let [Z, Se] of S) if (host.state.unadmitted.has(Z)) Se.discard();
    }
    let loadedModules = pluginRegistry.loadedModules;
    pluginRegistry.loadedModules = y;
    host.state.isSetRecord = true;
    r.loaded();
    let q = new Set(y.map((Z) => Z.name));
    for (let loadedModule of loadedModules)
      if (!q.has(loadedModule.name)) {
        forgetMcpServerFor(loadedModule.name);
        forgetMcpConnectsFor(loadedModule.name);
      }
    for (let loadedModule of loadedModules) loadedModule.retire();
    publishRenderPlugins(host);
    invalidateAllHookedCaches();
    noteWorkersLoaded(y);
    await resolveElementTables(y);
    invalidateAll();
  });
//@ chunk-e6aww6q8.js:4082548-4083726 placement
/**
 * hooks worker 失去心跳时重生 worker 并重载声明集，记录遥测。
 */
function respawnHooksWorker(e, n) {
  if (e.died !== undefined) return;
  let { reason, culprit } = n;
  let y = n.cause !== "heartbeat_waited" ? stackedPluginOf(e) : undefined;
  let plugin = culprit?.plugin ?? y;
  let w = plugin === undefined ? [] : catchingDispatchesOf(e, plugin);
  let L = w.length > 0 ? plugin : undefined;
  let G = uniq(w.map(([, Me]) => Me.event));
  let q = new Set(L === undefined ? [plugin].filter((Me) => Me !== undefined) : []);
  let Z = plugin !== undefined;
  let ke = (plugin === culprit?.plugin ? culprit?.evidence : undefined) ?? "stack";
  e.host.state.workerDeaths += 1;
  let we = workerCrashTelemetry(e, n.cause, Z ? ke : "none");
  logFeatureSad("plugin_function_hooks_worker", "respawned", we);
  logForDebugging(`hooks worker: ${reason}; respawning`, {
    level: "error",
  });
  if (L !== undefined) {
    e.kept = {
      crash: {
        plugin: L,
        reason,
        fields: we,
      },
      hops: new Set(w.map(([Me]) => Me)),
    };
    reportPluginProblem(
      L,
      `the hooks worker was lost with ${L}'s ${G.join(", ")} hook in flight; it is replaced, and ${L} stays loaded for the hook's .catch`,
    );
    for (let event of G)
      emit({
        plugin: L,
        event,
        reason,
        effect: WORKER_REPLACED_TEXT,
        hasOverrun: false,
      });
  }
  for (let Me of q)
    if (e.host.state.knownArgs.has(Me)) {
      reportWorkerCrash(e.host, Me, {
        reason,
        fields: we,
      });
      forgetPlugin(Me, e.host);
    }
  reportWorkerCrashWithholdings(e.host.state, q);
  markWorkerDead(e, reason);
  e.worker.terminate();
  e.spawned.release?.();
  let { hooksRespawns } = getPluginRegistry();
  let { respawn, loaded } = registerRespawn(hooksRespawns);
  reloadAfterRespawn(e.host, reason, {
    isAttributed: Z,
    loaded,
  })
    .catch((error) => {
      logError(error);
      return hooksRespawns.has(respawn)
        ? reloadAfterRespawn(e.host, `${reason}; tried again`, {
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
var workerTimingSlot = identity_2(createValueSlot(), (e) => e.set(undefined));
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
var workerHostSlot = identity_2(createValueSlot(), (e) => e.set(undefined));
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
function readWorkerCpu(e) {
  try {
    let n = e.spawned.thread?.();
    return n !== undefined && Number.isFinite(n.usedMs)
      ? {
          at: performance.now(),
          usedMs: n.usedMs,
          isAsleep: n.isAsleep === true,
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
var never = (e, n) => false;
//@ chunk-e6aww6q8.js:4084061-4084214 placement
function cpuUsedSince(read, workerCpu, heartbeatMs) {
  let s = (workerCpu?.usedMs ?? Number.NaN) - (read?.usedMs ?? Number.NaN);
  let h = read !== undefined && workerCpu !== undefined && s >= 0;
  let S = h && never(read, workerCpu) ? heartbeatMs : Math.min(s, heartbeatMs);
  return h ? S : undefined;
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
var currentMarkName = (e) => e.names.get(Atomics.load(e.stamp, STAMP_CURRENT_CALL_SLOT));
//@ chunk-e6aww6q8.js:4084316-4084924 placement
/**
 * 心跳超时时，若只有一个进行中的单模块分发且已收到心跳之后的标记，判定该模块为卡住 worker 的元凶。
 */
function loneDispatchCulprit(e) {
  if (!(
    e.inFlight.size === 1 &&
    e.pendingCalls.size === 0 &&
    e.pendingLoads.size === 0 &&
    e.pendingBuilds.size === 0 &&
    e.pendingPresses.size === 0 &&
    e.pendingResolves.size === 0
  ))
    return;
  let [r] = e.inFlight;
  let [s, h] = r ?? [];
  let y = e.awaitingPong?.n;
  if (!(s !== undefined && h !== undefined && y !== undefined)) return;
  let [w, ...L] = h.environments;
  let G = `${w}:`;
  let { marks } = e;
  let Z =
    w !== undefined &&
    L.length === 0 &&
    h.stream === undefined &&
    h.calls.size === 0 &&
    ![...e.opControllers.keys()].some((key) => key.startsWith(G));
  let Se =
    h.answersSent === 0 ||
    (Atomics.load(marks, MARKS_ANSWERED_DISPATCH_SLOT) === s &&
      Atomics.load(marks, MARKS_ANSWERS_SENT_SLOT) === h.answersSent);
  return Z && y > h.sentAtPing && Atomics.load(marks, MARKS_NEWEST_DISPATCH_SLOT) >= s && Se
    ? e.names.get(w)
    : undefined;
}
//@ chunk-e6aww6q8.js:4084924-4085133 placement
/**
 * 依次从调用栈、恢复标记、单一分发推断卡住 hooks worker 的插件。
 */
function findStuckCulprit(e) {
  let n = stackedPluginOf(e);
  if (n !== undefined)
    return {
      plugin: n,
      evidence: "stack",
    };
  let r = currentMarkName(e);
  if (r !== undefined)
    return {
      plugin: r,
      evidence: "resumed",
    };
  let s = loneDispatchCulprit(e);
  return s === undefined
    ? undefined
    : {
        plugin: s,
        evidence: "dispatch",
      };
}
//@ chunk-e6aww6q8.js:4085133-4085546 placement
/**
 * 描述心跳超时的判定（卡住的插件、未应答的分发等）。
 */
function describeHeartbeatVerdict(stuckCulprit, n) {
  if (stuckCulprit === undefined)
    return "hooks worker: the heartbeat verdict names nobody (no plugin on the stack, none resumed in the stuck turn, no lone begun hop)";
  return n
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
function checkHooksWorkerHeartbeat(e, awaitingPong, r) {
  let read = awaitingPong.read;
  let workerCpu = readWorkerCpu(e);
  let y = cpuUsedSince(read, workerCpu, e.heartbeatMs);
  let S = e.isStarting && read?.isAsleep === true && workerCpu?.isAsleep === true;
  let L =
    e.pendingLoads.size > 0 || e.pendingBuilds.size > 0
      ? getWorkerTiming().timeoutMs
      : (workerHostSlot.get()?.timeoutMs ?? WORKER_START_TIMEOUT_MS);
  let G = L * MAX_HEARTBEAT_MISSES;
  awaitingPong.read = workerCpu;
  awaitingPong.beats += 1;
  awaitingPong.usedMs += S ? e.heartbeatMs : (y ?? e.heartbeatMs);
  awaitingPong.unansweredBeats = Math.min(
    awaitingPong.beats,
    Math.ceil(L / e.heartbeatMs),
    Math.round(awaitingPong.usedMs / e.heartbeatMs),
  );
  if (e.isStarting) addWaitedTime(e, e.beatAt, r);
  else if (y !== undefined) addWaitedTime(e, (read?.at ?? r) + y, r);
  let q = G / 2;
  let Z = e.isStarting && awaitingPong.usedMs >= q;
  let Se = !e.isStarting && awaitingPong.unansweredBeats * e.heartbeatMs >= L;
  if (!(Z || Se || awaitingPong.beats * e.heartbeatMs >= G)) return;
  let stuckCulprit = findStuckCulprit(e);
  let Ee = Se ? stuckCulprit : noopCallback(stuckCulprit);
  logForDebugging(describeHeartbeatVerdict(stuckCulprit, Ee !== undefined), {
    level: "warn",
  });
  if (Z)
    return {
      reason: `the hooks worker did not come online within ${q}ms of time its thread had: its start hung`,
      cause: "heartbeat",
      culprit: undefined,
    };
  return {
    reason: Se
      ? `no answer to a heartbeat within ${L}ms: the hooks worker is wedged (a hook spinning without yielding)`
      : `no answer to a heartbeat within ${G}ms: ` + UNKNOWN_STUCK_REASON,
    cause: Se ? "heartbeat" : "heartbeat_waited",
    culprit: Ee,
  };
}
//@ chunk-e6aww6q8.js:4086616-4086934 placement
/**
 * 心跳定时器：空闲时停止；有未回的 ping 时判断是否卡死（卡死则重生 worker），否则发新 ping。
 */
function heartbeatTick(e) {
  if (isHostIdle(e)) {
    stopHeartbeat(e);
    return;
  }
  let { awaitingPong } = e;
  let startTime = performance.now();
  let s = awaitingPong !== undefined;
  let h = s ? checkHooksWorkerHeartbeat(e, awaitingPong, startTime) : undefined;
  catchUpHeartbeat(e, startTime);
  e.beatAt = startTime;
  if (h !== undefined) respawnHooksWorker(e, h);
  if (s) return;
  e.awaitingPong = {
    n: ++e.pingCounter,
    unansweredBeats: 0,
    usedMs: 0,
    beats: 0,
    isOwed: false,
    sentAt: Date.now(),
    read: readWorkerCpu(e),
  };
  postToWorker(e, {
    type: "ping",
    n: e.awaitingPong.n,
  });
}
//@ chunk-e6aww6q8.js:4086934-4087120 placement
/**
 * 若未启动心跳则启动（间隔可配置），定时器 unref。
 */
function ensureHeartbeat(e) {
  if (e.heartbeat === undefined) {
    e.awaitingPong = undefined;
    e.beatAt = performance.now();
    e.heartbeatMs = workerHostSlot.get()?.ms ?? HEARTBEAT_POLL_MS;
    e.heartbeat = setInterval(heartbeatTick, e.heartbeatMs, e);
    e.heartbeat.unref();
  }
}
//@ chunk-e6aww6q8.js:4087120-4087314 placement
/**
 * 向某环境的消息端口请求 flush，完成时 resolve；端口不存在立即 resolve。
 */
function flushEnvironmentPort(e, n, r) {
  let s = e.ports.get(n);
  if (s === undefined) {
    r.resolve();
    return;
  }
  e.flushCounter += 1;
  e.pendingFlushes.set(`${n}:${e.flushCounter}`, r);
  s.postMessage({
    type: "flush",
    flushId: e.flushCounter,
  });
}
//@ chunk-e6aww6q8.js:4087314-4087438 placement
function settleWorkerIdle(e) {
  if (e.inFlight.size === 0 && e.pendingCalls.size === 0 && e.pendingPresses.size === 0) e.worker.unref?.();
  if (isHostIdle(e)) stopHeartbeat(e);
}
//@ chunk-e6aww6q8.js:4087438-4087511 placement
/**
 * 记录空闲
 */
function markWorkerIdle(e) {
  if (e.awaitingPong !== undefined) e.awaitingPong.isOwed = true;
  settleWorkerIdle(e);
}
//@ chunk-e6aww6q8.js:4087511-4087896 placement
/**
 * 检查环境加载是否超时，超时则终止并报告。
 */
function checkLoadTimeout(e, n) {
  let r = n.pending.get(n.environmentId);
  if (!(r !== undefined && (n.waiter === undefined || n.waiter === r))) return;
  let startTime = performance.now();
  catchUpHeartbeat(e, startTime);
  let { readyMs, timeoutMs } = getWorkerTiming();
  let w = readyMs + timeoutMs * MAX_HEARTBEAT_MISSES;
  let floored = Math.floor(n.since + w - startTime);
  let min = Math.min(e.waitedMs - n.waitedMs, floored);
  if (min > 0) {
    setTimeout(checkLoadTimeout, min, e, {
      ...n,
      waitedMs: e.waitedMs,
      waiter: r,
    }).unref();
    return;
  }
  rejectPendingCall(n.pending, n.environmentId, n.reason(floored > 0 ? readyMs : w));
  markWorkerIdle(e);
}
//@ chunk-e6aww6q8.js:4087896-4088035 placement
function armLoadTimeout(e, n) {
  let timer = setTimeout(checkLoadTimeout, getWorkerTiming().readyMs, e, {
    ...n,
    waitedMs: e.waitedMs,
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
var runInCallerScope = (e, n) => e.inCallerContext(() => runInScope(e.scope, n));
//@ chunk-e6aww6q8.js:4088088-4088192 placement
function callersOfServing(e, environmentId, serving) {
  let s = serving === undefined ? undefined : e.pendingCalls.get(serving);
  return s?.callee === environmentId ? s.callers : undefined;
}
//@ chunk-e6aww6q8.js:4088192-4088314 placement
function clearOverruns(e, n) {
  for (let environment of n.environments) {
    let s = e.names.get(environment);
    if (s !== undefined && !n.failed.has(s)) e.overruns.delete(s);
  }
}
//@ chunk-e6aww6q8.js:4088314-4088405 placement
/**
 * 清定时器后 resolve/reject
 */
var withClearedTimeout = (e, resolve, reject) => ({
  resolve: (s) => {
    clearTimeout(e);
    resolve(s);
  },
  reject: (s) => {
    clearTimeout(e);
    reject(s);
  },
});
//@ chunk-e6aww6q8.js:4088405-4089233 placement
/**
 * 启动 hooks worker（所有插件共用一个）并记录遥测。
 */
function spawnHooksWorker(e) {
  let n = workerSlots.spawnWorker();
  let { worker, stamp, marks } = n;
  e.state.workerSpawns += 1;
  logFeatureOk("plugin_function_hooks_worker", {
    spawns: e.state.workerSpawns,
  });
  logForDebugging("hooks worker spawned (one for every plugin)");
  return {
    host: e,
    spawned: n,
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
function releaseKeptHop(hooksWorker, n, r) {
  let { kept } = hooksWorker;
  let h = kept?.hops.delete(n) === true;
  if (kept === undefined || !h) return false;
  if (r) {
    kept.hops.clear();
    hooksWorker.kept = undefined;
  }
  return !r && kept.hops.size === 0;
}
//@ chunk-e6aww6q8.js:4089379-4089749 placement
/**
 * worker 结束（close）或出错（error 事件）时以相应原因重生 worker。
 */
function respawnOnWorkerEnd(hooksWorker, n) {
  if (n.type === "close") {
    let s = "code" in n && typeof n.code === "number";
    respawnHooksWorker(hooksWorker, {
      reason: "the hooks worker ended" + (s ? ` (close code ${n.code})` : ""),
      cause: "close_event",
      culprit: undefined,
    });
    return;
  }
  let r = n instanceof ErrorEvent;
  respawnHooksWorker(hooksWorker, {
    reason: "the hooks worker died: " + (r ? n.message : `'${n.type}' event without a message`),
    cause: r ? "error_event" : "bare_event",
    culprit: undefined,
  });
}
//@ chunk-e6aww6q8.js:4089749-4090395 placement
function validatePassedBySighting(e, n) {
  let { link, plugins, event, by, count } = n;
  if (!Number.isSafeInteger(count) || count < 1) return "its count is not a whole number of dispatches";
  if (!(isHookEvent(event) || isPluginDefinedEvent(event))) return "its event is not one the host knows";
  if (!e.state.knownPlugins.has(by)) return "the plugin it says continued past is not one the host knows";
  if (plugins.length === 0 || plugins.length > e.state.knownPlugins.size)
    return "it names no plugin, or more than the host knows";
  let L = new Set(plugins);
  if (L.size !== plugins.length) return "it names a plugin twice";
  if (link !== plugins.join("+")) return "its link is not the plugins it names";
  return [...L].every((q) => loadedModuleArgs(q) !== undefined)
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
function hookNoticeTask(e) {
  return formatTaskNotification({
    body: `
${escapeXml(e)}`,
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
    seat: (r) => {
      valueSlot.set(r);
      for (let s of valueSlot_2.get() ?? []) r(s);
      valueSlot_2.set(undefined);
    },
    queue: (r) => {
      let s = valueSlot.get();
      if (s === undefined) return valueSlot_2.set([...(valueSlot_2.get() ?? []), r]);
      return s(r);
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
var noticeQueue = identity_2(createDeferredQueue(), (e) => e.reset());
//@ chunk-e6aww6q8.js:4090717-4090854 placement
/**
 * 把一条关于插件钩子的提示作为 meta 任务通知排入主代理下一轮（被动、跳过附件）。
 */
function queueModelNotice(e) {
  noticeQueue.queue({
    agentId: mainAgentId(),
    value: hookNoticeTask(e),
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
function approvalLabelOrUnnamed(e) {
  let approvalLabel = toApprovalLabel(e);
  return approvalLabel === null ? "unnamed" : String(approvalLabel);
}
//@ chunk-e6aww6q8.js:4096791-4099085 placement
/**
 * 处理 hooks worker 发来的消息（online、pong、loaded、load_error、日志等），并识别失控插件。
 */
function handleHooksWorkerMessage(hooksWorker, n) {
  switch (n.type) {
    case "online": {
      let { awaitingPong, isStarting } = hooksWorker;
      hooksWorker.isStarting = false;
      if (isStarting && awaitingPong !== undefined) {
        awaitingPong.beats = 0;
        awaitingPong.usedMs = 0;
        awaitingPong.unansweredBeats = 0;
        awaitingPong.read = readWorkerCpu(hooksWorker);
      }
      return;
    }
    case "pong":
      if (hooksWorker.awaitingPong?.n === n.n) hooksWorker.awaitingPong = undefined;
      return;
    case "loaded":
      settlePendingLoad(hooksWorker, n);
      return;
    case "load_error":
      takePending(hooksWorker.pendingLoads, n.environmentId)?.reject(
        new HooksError(n.error, {
          cause: n.cause,
        }),
      );
      return;
    case "log":
      logForDebugging(n.text, {
        level: n.level ?? "debug",
      });
      return;
    case "hook_failed": {
      let hookFailedEvent = toHookFailedEvent(n);
      emit(hookFailedEvent);
      reportHookSkip(hookFailedEvent);
      markInFlightFailed(hooksWorker, hookFailedEvent);
      if (n.hasOverrun) {
        let s = (hooksWorker.overruns.get(n.plugin) ?? 0) + 1;
        hooksWorker.overruns.set(n.plugin, s);
        if (s >= MAX_STUCK_RETRIES)
          respawnHooksWorker(hooksWorker, {
            reason: `${n.plugin} ignored its signal ${s} times in a row: a runaway plugin in the hooks worker`,
            cause: "runaway",
            culprit: {
              plugin: n.plugin,
              evidence: "trigger",
            },
          });
      }
      logFunctionHooksRun(hookFailedEvent);
      return;
    }
    case "passed_by":
      acceptWorkerPassedBy(hooksWorker.host, n.sighting);
      return;
    case "unhandled":
      logForDebugging(`hooks worker: a promise a plugin did not await rejected: ${n.error}`);
      return;
    case "built":
    case "built_error": {
      let r = takePending(hooksWorker.pendingBuilds, n.environmentId);
      if (n.type === "built") r?.resolve();
      else r?.reject(new HooksError(n.error));
      return;
    }
    case "call_result":
    case "call_error": {
      let r = takeAnsweredCall(hooksWorker, n.callId);
      settleWorkerIdle(hooksWorker);
      if (n.type === "call_result") r?.resolve(n.value);
      else r?.reject(new HooksError(n.error));
      return;
    }
    case "resolved":
    case "resolve_error": {
      let r = takePending(hooksWorker.pendingResolves, n.resolveId);
      settleWorkerIdle(hooksWorker);
      if (n.type === "resolved") r?.resolve();
      else r?.reject(new HooksError(n.error));
      return;
    }
    case "press_result":
    case "press_error": {
      let r = takePending(hooksWorker.pendingPresses, n.pressId);
      settleWorkerIdle(hooksWorker);
      if (n.type === "press_result") r?.resolve();
      else r?.reject(new HooksError(n.error));
      return;
    }
    case "result":
    case "error": {
      let r = takePending(hooksWorker.inFlight, n.id);
      r?.unlink();
      if (n.type === "result" && r !== undefined) clearOverruns(hooksWorker, r);
      if (n.type === "result")
        r?.resolve({
          result: n.result,
          ...(Array.isArray(n.answered) && {
            answered: n.answered,
          }),
          ...(n.unmatched === true && {
            unmatched: true,
          }),
          ...(n.withheld === true && {
            withheld: true,
          }),
        });
      else
        r?.reject(
          n.withheld === true
            ? tagWeak(new HooksError(n.error), {
                isNoted: true,
              })
            : new HooksError(n.error),
        );
      return;
    }
    case "stream_step":
      handleWorkerStreamPull(hooksWorker, n);
      return;
    case "next":
      handleWorkerNext(hooksWorker, n);
      return;
    case "next_pull":
      handleWorkerStreamNext(hooksWorker, n);
      return;
    case "next_close": {
      let stream = hooksWorker.inFlight.get(n.id)?.stream;
      let s = stream?.opened.get(n.nextId);
      stream?.opened.delete(n.nextId);
      Promise.resolve(s?.return(undefined)).catch(() => {
        return;
      });
      return;
    }
    case "next_abort":
      hooksWorker.inFlight
        .get(n.id)
        ?.calls.get(n.nextId)
        ?.abort(makeHooksOrPlainError(n.reason, n.isSettled));
      return;
    default:
      logForDebugging(`hooks worker: a "${String(n.type)}" frame on the main channel; refused`, {
        level: "warn",
      });
  }
}
//@ chunk-e6aww6q8.js:4099085-4099214 placement
async function waitForDeathsSettled(e) {
  let n;
  do {
    n = e.state.workerDeaths;
    await e.state.queue(() => Promise.resolve());
  } while (n !== e.state.workerDeaths);
}
//@ chunk-e6aww6q8.js:4099214-4099986 placement
/**
 * 向 worker 内另一插件发起接口调用：分配 callId、设超时、记录调用者与借用信息，序列化失败时拒绝。
 */
function callInterfaceInWorker(hooksWorker, { environmentId, call: r, behind }) {
  if (hooksWorker.died !== undefined) return Promise.reject(new HooksError(hooksWorker.died));
  let h = ++hooksWorker.callCounter;
  let callers = behind?.callers ?? [];
  let asked = apiMethodLabel(r);
  let w = hookTimeoutText(asked, hooksWorker.names.get(environmentId) ?? r.owner, DEFAULT_HOOK_TIMEOUT_MS);
  hooksWorker.worker.ref?.();
  let L;
  return new Promise((resolve, reject) => {
    let timer = setTimeout(settleCallRejection, DEFAULT_HOOK_TIMEOUT_MS, {
      pendingCalls: hooksWorker.pendingCalls,
      callId: h,
      settleIdle: () => markWorkerIdle(hooksWorker),
      reject: () => reject(new AskRefusedError(w, asked)),
      reason: w,
    });
    timer.unref();
    hooksWorker.pendingCalls.set(h, {
      resolve: (Se) => {
        clearTimeout(timer);
        resolve(Se);
      },
      reject: (Se) => {
        clearTimeout(timer);
        reject(Se);
      },
      callee: environmentId,
      callers,
      lent: behind?.lent ?? [],
      facts: behind?.facts,
      scope: currentScope(),
    });
    L = hooksWorker.pendingCalls.get(h);
    try {
      postToWorker(hooksWorker, {
        type: "call",
        callId: h,
        environmentId,
        call: r,
        callers,
      });
    } catch (error) {
      clearTimeout(timer);
      hooksWorker.pendingCalls.delete(h);
      reject(new HooksError(`${asked}: arguments are not plain data: ${errorMessage(error)}`));
      return;
    }
    ensureHeartbeat(hooksWorker);
  }).finally(() => {
    endScope(L);
  });
}
//@ chunk-e6aww6q8.js:4099986-4100139 placement
function rejectAbandonedDispatch(e, n) {
  let r = takePending(e.inFlight, n);
  if (r === undefined) return;
  r.unlink();
  r.reject(new HooksError(`did not settle within ${LINGER_GRACE_MS}ms of its signal aborting`));
  markWorkerIdle(e);
}
//@ chunk-e6aww6q8.js:4100139-4101943 placement
/**
 * 向 hooks worker 分发一次事件：序列化参数、处理中止和 DataCloneError。
 */
function dispatchToHooksWorker(hooksWorker, { request, next: r, signal }) {
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
  function Ae() {
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
  let Ie;
  let askUserQuestionRenderRequest = parseAskUserQuestionRenderRequest(event, payload);
  let We = () => {};
  let ze = rootEventDispatches(hooksWorker.host, request);
  let lt = ended === undefined && !isDispatchFrameOpen() && !isInterfaceCallOpen() && ze !== "session.start";
  return new Promise((resolve, reject) => {
    if (askUserQuestionRenderRequest !== undefined)
      We = surfaceRowLedger.onFreed((Et) => {
        if (surfaceBudgetKey(Et) === surfaceBudgetKey(askUserQuestionRenderRequest))
          postToWorker(hooksWorker, {
            type: "dialog_clients",
            site: askUserQuestionRenderRequest,
            clients: surfaceRowLedger.clientsOf(askUserQuestionRenderRequest),
          });
      });
    let pt = passthroughOutput({
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
      rootEvent: ze,
      isPersonInput: isPersonGestureEvent(event, payload),
      gestureAt: request.gestureAt,
      pressOwner: callerPluginOf(event, payload),
      listedMedia: submittedAttachmentIds(event, payload),
      tool: toolNameOfCall(event, payload),
      scope: currentScope(),
      next: r,
      calls: new Map(),
      caughtBy: lt ? (caughtBy ?? []) : [],
      failed: new Set(),
      unlink: () => {},
    });
    Ie = pt;
    bumpPluginEpochs(hooksWorker.work, environments);
    hooksWorker.inFlight.set(id, pt);
    try {
      postToWorker(hooksWorker, {
        type: "dispatch",
        id,
        event,
        payload,
        environments: [...environments],
        leftOut: leftOut?.map((Et) => ({
          environmentId: Et.environmentId,
          registrations: [...Et.registrations],
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
      let yt = errorMessage(error);
      let joined = environments
        .map((environment) => hooksWorker.names.get(environment) ?? environment)
        .join(", ");
      let At =
        error instanceof RangeError || (error instanceof DOMException && error.name === "DataCloneError");
      let It = At ? classicWithholding(event, payload) : undefined;
      let Yt = At ? "is not plain data" : "could not be posted to the hooks worker";
      reject(
        It === undefined
          ? new HooksError(`${event} event ${Yt}: ${yt}`)
          : tagWeak(new HooksError(`${joined}: ${event}: could not be given its argument: ` + yt), It),
      );
      return;
    }
    ensureHeartbeat(hooksWorker);
    pt.unlink = forwardAbort(signal, {
      abort: Ae,
    });
  }).finally(() => {
    We();
    endScope(Ie);
    settleWorkerIdle(hooksWorker);
  });
}
//@ chunk-e6aww6q8.js:4101943-4103654 placement
/**
 * 把流式事件分发给 hooks worker（stream_pull/stream_close），检查参数是否为纯数据。
 */
function dispatchStreamToHooksWorker(hooksWorker, { request, next: r, signal }) {
  let { id, event, payload, environments, leftOut, origin, hookOrigin } = request;
  return teeGeneratorResult(async function* () {
    if (hooksWorker.died !== undefined) throw new HooksError(hooksWorker.died);
    let Z;
    let Se = false;
    let ke = {
      open: r,
      opened: new Map(),
      pull: undefined,
    };
    let we = passthroughOutput({
      resolve: () => {},
      reject: (Ae) => {
        Z = Ae;
        ke.pull?.reject(Ae);
        ke.pull = undefined;
      },
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
      rootEvent: rootEventDispatches(hooksWorker.host, request),
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
      stream: ke,
    });
    function Ee() {
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
    bumpPluginEpochs(hooksWorker.work, environments);
    hooksWorker.inFlight.set(id, we);
    try {
      postToWorker(hooksWorker, {
        type: "dispatch_stream",
        id,
        event,
        payload,
        environments: [...environments],
        leftOut: leftOut?.map((Ae) => ({
          environmentId: Ae.environmentId,
          registrations: [...Ae.registrations],
        })),
        origin,
        raise: request.raise,
        floors: request.floors === undefined ? undefined : [...request.floors],
        dialogClients: [],
      });
    } catch (error) {
      hooksWorker.inFlight.delete(id);
      settleWorkerIdle(hooksWorker);
      throw new HooksError(`${event} event is not plain data: ${errorMessage(error)}`);
    }
    ensureHeartbeat(hooksWorker);
    we.unlink = forwardAbort(signal, {
      abort: Ee,
    });
    try {
      while (true) {
        if (Z !== undefined) throw Z;
        let promise = await new Promise((resolve, reject) => {
          ke.pull = {
            resolve,
            reject,
          };
          postToWorker(hooksWorker, {
            type: "stream_pull",
            id,
          });
        });
        ke.pull = undefined;
        if (promise.done) {
          Se = true;
          clearOverruns(hooksWorker, we);
          return promise.value;
        }
        yield promise.value;
      }
    } finally {
      endScope(we);
      hooksWorker.inFlight.delete(id);
      we.unlink();
      if (!Se && hooksWorker.died === undefined)
        postToWorker(hooksWorker, {
          type: "stream_close",
          id,
        });
      for (let Ae of ke.opened.values())
        Promise.resolve(Ae.return(undefined)).catch(() => {
          return;
        });
      ke.opened.clear();
      settleWorkerIdle(hooksWorker);
    }
  });
}
//@ chunk-e6aww6q8.js:4103654-4103758 placement
function runAsLoadedModule(environmentId, n, r) {
  let any = getPluginRegistry().loadedModules.some(
    (loadedModule) => loadedModule.environmentId === environmentId,
  );
  return dispatchFrameStorage.run(any ? undefined : n, r);
}
//@ chunk-e6aww6q8.js:4103758-4104203 placement
/**
 * 求插件调用的来源链（分发、注册、服务与根事件）。
 */
function callOriginFor(e, environmentId, { dispatchId, registration, serving, rootEvent }) {
  let S = e.names.get(environmentId);
  let w = dispatchId === undefined ? undefined : e.inFlight.get(dispatchId);
  let L = w?.environments.includes(environmentId) === true ? w : undefined;
  let G = serving === undefined ? undefined : (e.pendingCalls.get(serving) ?? e.answeredCalls.get(serving));
  if (S === undefined) return L?.origin ?? [];
  let q = G?.callee === environmentId ? G : undefined;
  let Z = L === undefined && q === undefined && rootEvent === undefined;
  return buildCallerChain(S, {
    dispatch: L,
    held: undefined,
    registration: Z ? undefined : registration,
    served: Z ? collectLentFrames(e.pendingCalls.values(), environmentId) : q,
  });
}
//@ chunk-e6aww6q8.js:4104203-4105332 placement
/**
 * 为 worker 发起的宿主操作构造调用者上下文：插件、信号、来源链、cwd、根事件、按键担保、是否服务模型调用等。
 */
function buildOpCaller(e, { environmentId, plugin, frame, signal }) {
  let { dispatchId, serving } = frame;
  let w = dispatchId === undefined ? undefined : e.inFlight.get(dispatchId);
  let L = w?.environments.includes(environmentId) === true ? w : undefined;
  let G = serving !== undefined;
  let q = G ? e.pendingCalls.get(serving) : undefined;
  let Z = q ?? (G ? e.answeredCalls.get(serving) : undefined);
  let Se = frame.registration === undefined;
  let ke = Se && Z?.callee === environmentId;
  let we = ke
    ? inheritDispatchFacts(Z, environmentId, isCurrentPendingCall(e.pendingCalls, serving, Z))
    : undefined;
  let Ee = ke ? we : L;
  let Ae = Se && isPersonInputEvent(Ee?.rootEvent);
  let Ie = !Se && isSamePressOwner(L, e.names.get(environmentId));
  let Me = !Se && L !== undefined;
  let listedMedia = Se ? undefined : L?.listedMedia;
  let ze = Se && !ke;
  let lt = ze ? latestGestureAt(e.sentPresses.values(), environmentId) : undefined;
  let Je = Ie ? L?.gestureAt : lt;
  let nt = ze ? pressForEnv(e.keptPresses, frame.pressing, environmentId) : undefined;
  let Et = !Se && isModelOriginToolCall(L, plugin) ? L : undefined;
  return {
    plugin,
    signal,
    origin: callOriginFor(e, environmentId, frame),
    cwd: Ee?.cwd,
    scopeHolder: L ?? (q?.callee === environmentId ? q : undefined),
    turnHeld: Ee?.turnHeld,
    rootEvent: (Ae ? undefined : Ee?.rootEvent) ?? frame.rootEvent,
    ownRoot: frame.rootEvent,
    ...(Je !== undefined && {
      vouchedPressAt: Je,
    }),
    ...(nt !== undefined && {
      answersPress: nt,
    }),
    ...(Et !== undefined && {
      isModelCallServed: true,
      takeServedSpawn: claimSpawnServed(Et),
    }),
    ...(!Se &&
      L?.isPersonInput === true && {
        isPersonInput: true,
      }),
    ...(Me && {
      judging: L,
    }),
    ...(listedMedia !== undefined && {
      listedMedia,
    }),
    isDispatching: ke ? we?.isDispatching : isCurrentPendingCall(e.inFlight, dispatchId, L),
    environmentId,
    callers: callersOfServing(e, environmentId, frame.serving),
  };
}
//@ chunk-e6aww6q8.js:4105332-4106035 placement
/**
 * 为 worker 的流式宿主操作打开流：绑定中止、经 qMe 调用宿主，失败时返回 HooksError。
 */
function openOpStream(e, { environmentId, key, frame }) {
  let { open } = frame;
  let y = e.names.get(environmentId);
  if (open === undefined) return new HooksError("no stream is open for this op");
  if (y === undefined) return new HooksError(`${open.op}: the plugin's environment is unloaded`);
  let abortController = new AbortController();
  let { dispatchId } = open;
  let L = dispatchId === undefined ? undefined : e.inFlight.get(dispatchId);
  let G = forwardAbort(L?.signal, abortController);
  let q = {
    isOver: false,
  };
  function Z() {
    q.isOver = true;
    G();
    e.opControllers.delete(key);
    e.opStreams.delete(key);
  }
  try {
    let stream = runAsLoadedModule(environmentId, q, () =>
      streamOpForPlugin(e.host, {
        op: open.op,
        args: open.args,
        caller: buildOpCaller(e, {
          environmentId,
          plugin: y,
          frame: open,
          signal: abortController.signal,
        }),
      }),
    );
    let ke = {
      op: open.op,
      stream,
      dispatchId,
      mark: q,
      end: Z,
    };
    e.opControllers.set(key, abortController);
    e.opStreams.set(key, ke);
    return ke;
  } catch (error) {
    q.isOver = true;
    G();
    return error instanceof HooksError ? error : new HooksError(errorMessage(error));
  }
}
//@ chunk-e6aww6q8.js:4106035-4106933 placement
/**
 * 处理 worker 的 op_pull/op_close：拉取下一块并回传 op_result/op_error，关闭时中止并回收。
 */
function pumpOpStream(e, { environmentId, port, frame }) {
  let { opId } = frame;
  let y = `${environmentId}:${opId}`;
  let S = e.opStreams.get(y);
  if (frame.type === "op_close") {
    e.opControllers.get(y)?.abort(new HooksError("the stream was let go"));
    S?.end();
    S?.stream.return(undefined).catch(() => {
      return;
    });
    return;
  }
  function w(q, Z) {
    if (e.ports.get(environmentId) !== port) return;
    port.postMessage(q);
    let { dispatchId } = Z ?? {};
    let ke = dispatchId === undefined ? undefined : e.inFlight.get(dispatchId);
    if (ke !== undefined) ke.answersSent += 1;
  }
  let L =
    S ??
    openOpStream(e, {
      environmentId,
      key: y,
      frame,
    });
  if (L instanceof HooksError) {
    w({
      type: "op_error",
      opId,
      error: L.message,
    });
    return;
  }
  let G = trackPluginOp(e.work, environmentId, L.op);
  runAsLoadedModule(environmentId, L.mark, () => L.stream.next()).then(
    (q) => {
      G();
      if (q.done === true) L.end();
      try {
        w(
          {
            type: "op_result",
            opId,
            value: {
              done: q.done === true,
              value: q.value,
            },
          },
          L,
        );
      } catch (error) {
        L.end();
        L.stream.return(undefined).catch(() => {
          return;
        });
        w(
          {
            type: "op_error",
            opId,
            error: `a chunk that is not plain data: ${errorMessage(error)}`,
          },
          L,
        );
      }
    },
    (error) => {
      G();
      L.end();
      w(
        {
          type: "op_error",
          opId,
          error: errorMessage(error),
        },
        L,
      );
    },
  );
}
//@ chunk-e6aww6q8.js:4106933-4108452 placement
/**
 * 处理 worker 侧操作流（op_pull/op_close/op_abort/op_result），环境已卸载时报错。
 */
function handleWorkerOpStream(e, { environmentId, port, frame }) {
  if (frame.type === "flushed") {
    let ze = takePending(e.pendingFlushes, `${environmentId}:${frame.flushId}`);
    if (ze)
      Promise.allSettled(
        [...(e.runningOps.get(environmentId) ?? [])].filter(
          (lt) => !submitMarksSlot.get() || !e.startOps.has(lt),
        ),
      ).then(() => {
        ze.resolve();
        settleWorkerIdle(e);
      });
    return;
  }
  if (frame.type === "op_pull" || frame.type === "op_close") {
    pumpOpStream(e, {
      environmentId,
      port,
      frame,
    });
    return;
  }
  let h = `${environmentId}:${frame.opId}`;
  if (frame.type === "op_abort") {
    e.opControllers.get(h)?.abort(new HooksError(frame.reason));
    e.opControllers.delete(h);
    return;
  }
  let { opId, op, dispatchId } = frame;
  let L = e.names.get(environmentId);
  let G = dispatchId !== undefined && !isUiEventName(op);
  function q(ze) {
    if (e.ports.get(environmentId) !== port) return;
    port.postMessage(ze);
    let lt = G ? e.inFlight.get(dispatchId) : undefined;
    if (lt !== undefined) lt.answersSent += 1;
  }
  if (L === undefined) {
    q({
      type: "op_error",
      opId,
      error: `${frame.op}: the plugin's environment is unloaded`,
    });
    return;
  }
  let abortController = new AbortController();
  e.opControllers.set(h, abortController);
  let Se = trackPluginOp(e.work, environmentId, frame.op);
  let ke = e.runningOps.get(environmentId) ?? new Set();
  e.runningOps.set(environmentId, ke);
  let we = dispatchId === undefined ? undefined : e.inFlight.get(dispatchId);
  let Ee = forwardAbort(we?.signal, abortController);
  let Ae = {
    isOver: false,
  };
  let Ie = runAsLoadedModule(environmentId, Ae, () =>
    runInterfaceCall(() =>
      interfaceCallForPlugin(e.host, {
        op: frame.op,
        args: frame.args,
        caller: buildOpCaller(e, {
          environmentId,
          plugin: L,
          frame,
          signal: abortController.signal,
        }),
      }),
    ),
  ).finally(() => {
    Ae.isOver = true;
    Ee();
    e.opControllers.delete(h);
    Se();
    ke.delete(Ie);
    e.startOps.delete(Ie);
  });
  let Me = !isHumanInitiatedSite(frame.op) && !isClockMethod(frame.op);
  let We = Boolean(submitMarksSlot.get() && isSubmittableEvent(we?.rootEvent));
  if (Me) {
    ke.add(Ie);
    if (We) e.startOps.add(Ie);
  }
  Ie.then(
    (value) => {
      try {
        q({
          type: "op_result",
          opId,
          value,
        });
      } catch (error) {
        q({
          type: "op_error",
          opId,
          error: `${frame.op}: result is not plain data: ` + errorMessage(error),
        });
      }
    },
    (error) =>
      q({
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
function loadEnvironmentInWorker(hooksWorker, n, r) {
  if (hooksWorker.died !== undefined) return Promise.reject(new HooksError(hooksWorker.died));
  hooksWorker.names.set(n, r.pluginName);
  let messageChannel = new MessageChannel();
  let port1 = messageChannel.port1;
  hooksWorker.ports.set(n, port1);
  port1.onmessage = (S) =>
    handleWorkerOpStream(hooksWorker, {
      environmentId: n,
      port: port1,
      frame: S.data,
    });
  unrefTimer(port1);
  let y = armLoadTimeout(hooksWorker, {
    pending: hooksWorker.pendingLoads,
    environmentId: n,
    reason: (S) => notLoadedWithinText(r.pluginName, S),
  });
  return new Promise((resolve, reject) => {
    hooksWorker.pendingLoads.set(n, {
      resolve: (L) => {
        clearTimeout(y);
        resolve(L);
      },
      reject: (L) => {
        clearTimeout(y);
        hooksWorker.names.delete(n);
        closeEnvironmentPort(hooksWorker, n);
        postToWorker(hooksWorker, {
          type: "unload",
          environmentId: n,
        });
        reject(L);
      },
    });
    if (hooksWorker.died !== undefined) {
      reject(new HooksError(hooksWorker.died));
      return;
    }
    hooksWorker.worker.postMessage(
      {
        type: "load",
        environmentId: n,
        args: r,
        port: messageChannel.port2,
      },
      [messageChannel.port2],
    );
    ensureHeartbeat(hooksWorker);
  });
}
//@ chunk-e6aww6q8.js:4109085-4109861 placement
function uiPressInWorker(hooksWorker, { environmentId, handle, e: s }) {
  if (hooksWorker.died !== undefined) return Promise.reject(new HooksError(hooksWorker.died));
  let h = ++hooksWorker.pressCounter;
  hooksWorker.worker.ref?.();
  hooksWorker.sentPresses.set(h, {
    environmentId,
    gestureAt: getAsyncStoreS61(),
  });
  notePressDispatch(hooksWorker.keptPresses, h, environmentId);
  return new Promise((resolve, reject) => {
    let timer = setTimeout(settleCallRejection, DEFAULT_HOOK_TIMEOUT_MS, {
      pendingCalls: hooksWorker.pendingPresses,
      callId: h,
      settleIdle: () => markWorkerIdle(hooksWorker),
      reject,
      reason: `ui.press: ${hooksWorker.names.get(environmentId) ?? environmentId} did not answer within ${DEFAULT_HOOK_TIMEOUT_MS}ms`,
    });
    timer.unref();
    hooksWorker.pendingPresses.set(h, withClearedTimeout(timer, resolve, reject));
    try {
      postToWorker(hooksWorker, {
        type: "press",
        pressId: h,
        environmentId,
        handle,
        e: s,
      });
    } catch (error) {
      clearTimeout(timer);
      hooksWorker.pendingPresses.delete(h);
      reject(new HooksError(`ui.press: the press is not plain data: ${errorMessage(error)}`));
      return;
    }
    ensureHeartbeat(hooksWorker);
  }).finally(() => {
    let y = () => {
      hooksWorker.sentPresses.delete(h);
      markPressAnswered(hooksWorker.keptPresses, h);
    };
    try {
      flushEnvironmentPort(hooksWorker, environmentId, {
        resolve: y,
        reject: y,
      });
    } catch (error) {
      logError(error);
      y();
    }
  });
}
//@ chunk-e6aww6q8.js:4109861-4110304 placement
/**
 * 请求 worker 解析某环境的 UI 元素表（带超时）。
 */
function resolveTablesInWorker(hooksWorker, n, requests) {
  if (hooksWorker.died !== undefined) return Promise.reject(new HooksError(hooksWorker.died));
  let s = ++hooksWorker.resolveCounter;
  return new Promise((resolve, reject) => {
    let timer = setTimeout(settleCallRejection, HOOKS_READY_TIMEOUT_MS + DEFAULT_HOOK_TIMEOUT_MS, {
      pendingCalls: hooksWorker.pendingResolves,
      callId: s,
      settleIdle: () => markWorkerIdle(hooksWorker),
      reject,
      reason: `ui.resolve: ${hooksWorker.names.get(n) ?? n}'s element tables were not resolved within ${HOOKS_READY_TIMEOUT_MS + DEFAULT_HOOK_TIMEOUT_MS}ms`,
    });
    timer.unref();
    hooksWorker.pendingResolves.set(s, withClearedTimeout(timer, resolve, reject));
    postToWorker(hooksWorker, {
      type: "resolve",
      resolveId: s,
      environmentId: n,
      requests,
    });
    ensureHeartbeat(hooksWorker);
  });
}
//@ chunk-e6aww6q8.js:4110304-4110491 placement
/**
 * 卸载 worker 中的一个环境：清理名字、工作计数、按键记录与端口，并发送 unload。
 */
function unloadEnvironmentInWorker(hooksWorker, n) {
  let r = hooksWorker.names.get(n);
  if (r !== undefined) hooksWorker.overruns.delete(r);
  hooksWorker.names.delete(n);
  hooksWorker.work.delete(n);
  dropEnvPresses(hooksWorker.keptPresses, n);
  abortEnvironmentOps(hooksWorker, n, r);
  closeEnvironmentPort(hooksWorker, n);
  postToWorker(hooksWorker, {
    type: "unload",
    environmentId: n,
  });
}
//@ chunk-e6aww6q8.js:4110491-4112415 placement
/**
 * 终止 hooks worker 并卸载各插件环境，记录未能完成的卸载。
 */
function terminateHooksWorker(e) {
  let hooksWorker = spawnHooksWorker(e);
  let r = passthroughInput({
    kind: "worker",
    get died() {
      return hooksWorker.died;
    },
    get kept() {
      return hooksWorker.kept?.crash;
    },
    isKeptVerdict: (s, h) => releaseKeptHop(hooksWorker, s, h),
    unloadCrashed(s, h) {
      e.state
        .queue(async () => {
          let found = getPluginRegistry().loadedModules.find(
            (loadedModule) => loadedModule.environmentId === s,
          );
          if (found !== undefined) await unloadHooksModules(e, new Set([found.name]), h);
        })
        .catch((error) =>
          logForDebugging(
            `hooks worker: the unload of environment ${s}, kept for a .catch that matched nothing, failed: ` +
              errorMessage(error),
            {
              level: "error",
            },
          ),
        );
    },
    replaced() {
      return hooksWorker.died !== undefined && !isDispatchFrameOpen() ? waitForDeathsSettled(e) : undefined;
    },
    isDeclared: (s) => e.state.knownArgs.has(s),
    nextDispatchId: () => ++hooksWorker.dispatchCounter,
    inFlight: () => hooksWorker.inFlight.values(),
    workInFlight: (s) => countActingOps(hooksWorker.work, hooksWorker.inFlight.values(), s),
    nameOf: (s) => hooksWorker.names.get(s),
    load: (s, h) => loadEnvironmentInWorker(hooksWorker, s, h),
    unload: (s) => unloadEnvironmentInWorker(hooksWorker, s),
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
    build(s, table, suppressed) {
      if (hooksWorker.died !== undefined) return Promise.reject(new HooksError(hooksWorker.died));
      let deferred = Promise.withResolvers();
      hooksWorker.pendingBuilds.set(
        s,
        withClearedTimeout(
          armLoadTimeout(hooksWorker, {
            pending: hooksWorker.pendingBuilds,
            environmentId: s,
            reason: (w) => `${hooksWorker.names.get(s) ?? s}: $ not built within ${w}ms`,
          }),
          deferred.resolve,
          deferred.reject,
        ),
      );
      postToWorker(hooksWorker, {
        type: "build",
        environmentId: s,
        table,
        suppressed,
      });
      ensureHeartbeat(hooksWorker);
      return deferred.promise;
    },
    resolveTables: (s, requests) => resolveTablesInWorker(hooksWorker, s, requests),
    callInterface: (environmentId, call, behind) =>
      callInterfaceInWorker(hooksWorker, {
        environmentId,
        call,
        behind,
      }),
    press: (environmentId, handle, y) =>
      uiPressInWorker(hooksWorker, {
        environmentId,
        handle,
        e: y,
      }),
    releasePresses(environmentId, h) {
      if (h.length > 0 && hooksWorker.died === undefined)
        postToWorker(hooksWorker, {
          type: "press_release",
          environmentId,
          handles: h,
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
  hooksWorker.worker.addEventListener("message", (s) => handleHooksWorkerMessage(hooksWorker, s.data));
  hooksWorker.worker.addEventListener("error", (s) => respawnOnWorkerEnd(hooksWorker, s));
  hooksWorker.worker.addEventListener("close", (s) => respawnOnWorkerEnd(hooksWorker, s));
  hooksWorker.worker.unref?.();
  return r;
}
//@ chunk-e6aww6q8.js:4112415-4112612 placement
/**
 * 取得当前可用的环境宿主（worker 或同线程，按 CLAUDE_CODE_HOOKS_SAME_THREAD），宿主已死或类型变化时重建。
 */
function ensureEnvironmentHost(e) {
  {
    let n = hookHostKind();
    let environmentHost = e.state.environmentHost;
    if (environmentHost === undefined || environmentHost.died !== undefined || environmentHost.kind !== n) {
      environmentHost?.terminate();
      let y = n === "same-thread" ? createSameThreadEnvironmentHost(e) : terminateHooksWorker(e);
      e.state.environmentHost = y;
      return y;
    }
    return environmentHost;
  }
}
//@ chunk-e6aww6q8.js:4112612-4112726 placement
async function waitOpsDelivered(hooksHost) {
  await Promise.all(
    [hooksHost.state.environmentHost, hooksHost.state.nativeHost].map((n) => n?.opsDelivered()),
  );
}
//@ chunk-e6aww6q8.js:4112726-4112741 placement
/**
 * 原样返回
 */
var passthroughInput = (e) => e;
//@ chunk-e6aww6q8.js:4112741-4112830 placement
/**
 * 清掉死掉的宿主
 */
function clearDeadEnvironmentHost(e) {
  if (e.state.environmentHost?.died !== undefined) e.state.environmentHost = undefined;
}
//@ chunk-e6aww6q8.js:4112830-4112845 placement
/**
 * 原样返回
 */
var passthroughOutput = (e) => e;
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
  return (Array.isArray(attachments) ? attachments : []).flatMap((s) => {
    let id = typeof s === "object" && s !== null && "id" in s ? s.id : undefined;
    return typeof id === "string" ? [id] : [];
  });
}
//@ chunk-e6aww6q8.js:4113371-4113524 placement
var createNativeHost = (e) => {
  logForDebugging("hooks native host made (for the plugins the binary carries)");
  return createSameThreadHost(e, {
    kind: "native",
    copy: (n) => n,
    answer: (n, r) => r,
    createEnvironment: validateHooksModuleExports,
  });
};
//@ chunk-e6aww6q8.js:4113524-4113650 placement
/**
 * 取得原生（进程内、二进制自带插件）宿主，不存在或已死时创建。
 */
function ensureNativeHost(e) {
  {
    let nativeHost = e.state.nativeHost;
    if (nativeHost !== undefined && nativeHost.died === undefined) return nativeHost;
    let nativeHost_2 = createNativeHost(e);
    e.state.nativeHost = nativeHost_2;
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
var UNAWAITED_REJECTION = (e) => "hooks (same thread): a promise a plugin did not await rejected: " + e;
//@ chunk-e6aww6q8.js:4114008-4114157 placement
/**
 * 同线程宿主的拒绝处理：把宿主操作失败与环境内值转换为对应错误。
 */
var createSameThreadRejectionHandler = (hookHostBridge) =>
  claimPendingWriteLine((n, r) => {
    let s = hookHostBridge.opFailureOf(n);
    if (s !== undefined) return UNAWAITED_REJECTION(unawaitedOpMessage(s));
    let h = isUntrustedObject(n) ? r : n;
    return !isUntrustedObject(h) && hookHostBridge.ownsValue(h)
      ? UNAWAITED_REJECTION(rejectionText(n))
      : undefined;
  });
//@ chunk-e6aww6q8.js:4114157-4114226 placement
/**
 * 未等待拒绝的说明
 */
function unawaitedRejectionText(e) {
  let tag = readTag(e);
  if (tag === undefined) return;
  return UNAWAITED_REJECTION(unawaitedOpMessage(tag));
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
var notPlainDataText = (e, n) => `${e}: not plain data: ${n}`;
//@ chunk-e6aww6q8.js:4114329-4114400 placement
/**
 * 克隆失败转 HooksError
 */
function cloneOrThrow(e, n) {
  try {
    return clone(e);
  } catch (error) {
    throw new HooksError(notPlainDataText(n, errorMessage(error)));
  }
}
//@ chunk-e6aww6q8.js:4114400-4114510 placement
/**
 * tool.call 的 next 结果无法回传时，若带 ref 则改成只带 ref 的空结果。
 */
function emptyToolCallResult(e, n) {
  return e === "tool.call" && "ref" in n && typeof n.ref === "number"
    ? {
        ref: n.ref,
        result: undefined,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:4114510-4114711 placement
function workInFlightAcrossHosts(hooksHost, n) {
  let mapped = [hooksHost.state.environmentHost, hooksHost.state.nativeHost]
    .filter((s) => s !== undefined)
    .map((s) => s.workInFlight(n));
  return {
    acting: mapped.reduce((acc, h) => acc + h.acting, 0),
    epoch: mapped.reduce((acc, h) => acc + h.epoch, 0),
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
var createHooksHostState = (e = createSerialQueue()) => ({
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
  queue: (n) => e(() => inDispatchFrame(n)),
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
  let e = identity_2(createHooksHostState(), (n) => {
    n.budgets.renders.drop();
    n.budgets = createHostOps();
    n.workerSpawns = 0;
    n.workerDeaths = 0;
    n.modsOffAt = undefined;
  });
  return {
    state: e,
    ops: MODEL_API_CATALOG(e),
    streamOps: vZr,
  };
}
//@ chunk-e6aww6q8.js:4115673-4115686 placement
/**
 * 宿主操作根
 */
var hostOpsRoot = createValueSlot();
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
  hookScopeStore.set((n) => recordPassedBySighting(hooksHost, n));
  setMatcherLog({
    log: (n, r) =>
      logForDebugging(n, {
        level: r ?? "debug",
      }),
    hookFailed(n) {
      if (n.environmentId !== undefined && hooksHost.state.replacedEnvironments.has(n.environmentId)) return;
      emit(n);
      reportHookSkip(n);
      logFunctionHooksRun(n);
    },
  });
  return {
    loadHooksModules: (n, judgedUnder) => startLoadingModules(hooksHost, n, judgedUnder),
    mayHookCommand: (n) => isLoadingCommandRun(hooksHost, n),
    mayRegisterCommands: () => isLoadingAnyCommandRun(hooksHost),
    loadingScansRead: () => waitForModuleReads(hooksHost),
    onLoadingScansRead: (n) => hooksHost.state.loadingRead.subscribe(n),
    pruneHooksModules: (n) => unloadDisabledPlugins(hooksHost, n),
    reloadHooksModule: (n) => queueReload(n, hooksHost),
    retryUnloadedModules: () => hooksHost.state.unloadedSteps.clear(),
    refreshOptions: () =>
      HOOKS_OPTIONS_STATUS_TEXT(hooksHost, (n) =>
        wrapReloadError(n, () => reloadHooksModuleByName(n, hooksHost)),
      ),
    retargetHooksModule: (n, r) => retargetKnownPlugin(n, hooksHost, r),
    loadedFilesOf: (n) => hooksModuleFilesOf(n, hooksHost),
    buildInterfaces: (n, r) => buildEngineApi(hooksHost, n, r),
    routeInterfaceCall: (caller, r) =>
      explainApiNotAvailable(
        hooksHost.state,
        {
          caller,
          callers: [],
          lent: [],
        },
        r,
      ),
    runHostOp: (op, args, caller) =>
      interfaceCallForPlugin(hooksHost, {
        op,
        args,
        caller,
      }),
    retireEnvironmentHost: () => retireHosts(hooksHost),
    opsDelivered: () => waitOpsDelivered(hooksHost),
    workInFlight: (n) => workInFlightAcrossHosts(hooksHost, n),
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
