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
import { NFi, Yni, registerRespawn, qni, X4o, K_n, HFi } from "./hookDispatch.js";
import {
  dBn,
  withheldNounsOf,
  forgetPlugin,
  reportWorkerCrashWithholdings,
  mlt,
  foldBaseForRespawn,
  liftWithholdings,
  publishRenderPlugins,
  Woe,
  stackedPluginOf,
  catchingDispatchesOf,
  workerCrashTelemetry,
  markWorkerDead,
  Hoe,
  isHostIdle,
  p4,
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
  Fme,
  ID,
  resolveElementTables,
  reportWorkerCrash,
  iEt,
  wFt,
  toolNameOfCall,
  N$t,
  unloadHooksModules,
  pOe,
  validateHooksModuleExports,
  withInFlightDispatches,
  WBn,
  isLoadingAnyCommandRun,
  startLoadingModules,
  isLoadingCommandRun,
  unloadDisabledPlugins,
  Flt,
  HOOKS_OPTIONS_STATUS_TEXT,
  wrapReloadError,
  reloadHooksModuleByName,
  retargetKnownPlugin,
  hooksModuleFilesOf,
} from "./hooksModuleLoader.js";
import { uiLog, pluginStorageKey, reportPluginProblem, LFi, apiMethodLabel } from "./hooksWorkerClient.js";
import { logForDebugging } from "../../utils/debug.js";
import { shownPluginInfo, admitBuiltModules, applyPendingUiInvalidations } from "./pluginRegister.js";
import { abandonIfWorkerDied, buildEngineApi } from "./engineCreate.js";
import { Y3 } from "./mcpServerHooks.js";
import { qY } from "./mcpApi.js";
import { GAe } from "./commandApi.js";
import { emit } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { errorMessage } from "../../utils/errors.js";
import {
  XAe,
  QAe,
  ZV,
  srt,
  irt,
  buildCallerChain,
  collectLentFrames,
  inheritDispatchFacts,
  iY,
  txe,
  latestGestureAt,
  isModelOriginToolCall,
  dxe,
  trackPluginOp,
  yNr,
  countActingOps,
  explainApiNotAvailable,
} from "./apiDispatch.js";
import { ser, createRenderInvalidator } from "./ui/renderInstances.js";
import { uniq } from "../../utils/collections.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { ge } from "../../utils/identity.js";
import { to } from "../../utils/valueSlot.js";
import { ixt } from "./vm/vmGlobals.js";
import { crs, drs, uZr, XJ, classicWithholding } from "./hostBridge.js";
import { Ayn, KZn, zZn, getAsyncStoreS61 } from "./dispatch/dispatchScope.js";
import { isHookEvent, isPluginDefinedEvent } from "./hookApiSurface.js";
import { IT } from "../hooksModules/loadedModuleFilters.js";
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
import { HooksError, ipr, Cos, Jeo, spr, dpr } from "./hooksErrors.js";
import { logFunctionHooksRun } from "./telemetry/runTelemetry.js";
import { cEe, teeGeneratorResult } from "./dispatch/streamChain.js";
import { H5e } from "./dispatch/valueSizing.js";
import { parseAskUserQuestionRenderRequest, zte } from "./ui/treeConstants.js";
import {
  NZr,
  streamOpForPlugin,
  VHn,
  interfaceCallForPlugin,
  rootEventForOrigin,
  turnHeldEventFor,
} from "./interfaceCalls.js";
import { qRt } from "./sites/index.js";
import { getCwd } from "../../utils/cwd.js";
import { qUi } from "../../utils/pathTable.js";
import { forwardAbort, yrs, rfr } from "./dispatch/chain.js";
import { iv } from "./uiHooks.js";
import { Pei, notePressDispatch, markPressAnswered, Iei } from "./ui/pressFill.js";
import { oX, Wme } from "./promptSubmit.js";
import { y3t } from "./api/agentToolOps.js";
import { RZr, MODEL_API_CATALOG, freeze_21 } from "./apiCatalog.js";
import { xUe } from "./api/operations.js";
import { Jun, n0e } from "../../utils/shutdown/pendingWrites.js";
import { unawaitedOpMessage, jfr } from "./vm/moduleLoader.js";
import { clone } from "../../utils/slowOperations.js";
import { createAudioPlayer } from "./audioApi.js";
import { createAgentSpawner } from "./agentApi.js";
import { bqe } from "./panes.js";
import { createSignal } from "../../utils/signal.js";
import { dCn } from "../../utils/hooks/functionHookMatchers.js";

/**
 * worker 重生后的重载流程：多次无归属崩溃时关闭 worker 内 mod；逐个重新描述模块、重建 $（engine.create），处理拒绝与再次折叠，最后替换已加载模块列表并退役旧模块。
 */
//@ chunk-e6aww6q8.js:4080272-4082548 placement
var reloadAfterRespawn = (e, n, r) =>
  e.state.queue(async () => {
    (Xns(e), (e.state.isSetRecord = !1));
    let s = getPluginRegistry();
    if (!r.isAttributed && ++e.state.unattributedCrashes >= NFi) {
      let Z = dBn(e.state),
        mapped = Z.filter((we) => builtinModuleOf(we) === void 0).map((we) => we.pluginName),
        all = mapped.every((we) => withheldNounsOf(e.state, we).length === 0);
      for (let we of mapped) forgetPlugin(we, e);
      (reportWorkerCrashWithholdings(e.state, new Set(mapped)),
        uiLog(
          "hooks",
          `mods that run in the hooks worker are off for this session: it crashed ${e.state.unattributedCrashes} times` +
            (all ? "" : "; what they withheld stays withheld until they reload or are disabled"),
        ),
        logModsTurnedOff(e, Z));
    }
    logForDebugging(
      `hooks worker: respawning for ${[...e.state.knownArgs.keys()].join(", ") || "nobody"} (${n})`,
    );
    let y,
      S = new Map(),
      w = new Set(),
      L = new Set();
    try {
      for (;;) {
        let filtered = dBn(e.state).filter((Ie) => {
            let Me = e.state.knownPlugins.get(Ie.pluginName),
              We = e.state.unloadedSteps.get(Ie.pluginName),
              ze = We !== void 0 && isModuleUnchanged(We, Ie, Me);
            return !w.has(Ie.pluginName) && !ze;
          }),
          Se = [];
        for (let Ie of filtered)
          try {
            let Me = await describeHooksModuleState(e, Ie);
            ((Me.shown = shownPluginInfo(Ie, e.state.knownPlugins.get(Ie.pluginName))),
              (Me.judgedUnder = admissionTextFor(
                s.loadedModules.find((loadedModule) => loadedModule.name === Ie.pluginName),
              )),
              Se.push(Me),
              e.state.unadmitted.add(Me.environmentId),
              S.set(Me.environmentId, Me),
              mlt(Ie.pluginName, e));
          } catch (error) {
            if (
              (w.add(Ie.pluginName),
              logForDebugging(
                `hooks module ${pluginStorageKey(Ie)} failed to load after the respawn: ${Fme(error)}`,
                { level: "error" },
              ),
              abandonIfWorkerDied(e, Se, "the respawn"))
            )
              return;
            (Y3(Ie.pluginName),
              qY(Ie.pluginName),
              GAe(Ie.pluginName),
              ID(Ie.pluginName),
              emit({
                plugin: Ie.pluginName,
                event: "*",
                reason: errorMessage(error),
                effect: Yni,
                hasOverrun: !1,
              }));
          }
        let ke = await buildEngineApi(e, Se, {
          ...foldBaseForRespawn(
            e,
            Se.map((Ie) => Ie.name),
          ),
          carried: e.state.lastTable,
        });
        if (filtered.length > 0 && e.state.environmentHost?.died !== void 0) return;
        let { admitted: admitted, refused: refused } = await admitBuiltModules(e, {
          built: ke,
          plugins: e.state.knownPlugins,
          seated: L,
        });
        if (filtered.length > 0 && e.state.environmentHost?.died !== void 0) {
          for (let Ie of admitted) Ie.discard();
          return;
        }
        for (let Ie of refused) forgetPlugin(Ie.name, e);
        if (refused.length > 0) liftWithholdings(e.state, new Set(refused.map((Ie) => Ie.name)));
        if (!refused.some((Ie) => Ie.hooks("engine.create"))) {
          y = admitted;
          break;
        }
        for (let Ie of admitted) (L.add(Ie.name), Ie.discard());
      }
    } finally {
      e.state.admitting = void 0;
      for (let [Z, Se] of S) if (e.state.unadmitted.has(Z)) Se.discard();
    }
    let loadedModules = s.loadedModules;
    ((s.loadedModules = y), (e.state.isSetRecord = !0), r.loaded());
    let q = new Set(y.map((Z) => Z.name));
    for (let Z of loadedModules) if (!q.has(Z.name)) (Y3(Z.name), qY(Z.name));
    for (let Z of loadedModules) Z.retire();
    (publishRenderPlugins(e), Woe(), XAe(y), await resolveElementTables(y), ser());
  });
/**
 * hooks worker 失去心跳时重生 worker 并重载声明集，记录遥测。
 */
//@ chunk-e6aww6q8.js:4082548-4083726 placement
function respawnHooksWorker(e, n) {
  if (e.died !== void 0) return;
  let { reason: reason, culprit: culprit } = n,
    y = n.cause !== "heartbeat_waited" ? stackedPluginOf(e) : void 0,
    S = culprit?.plugin ?? y,
    w = S === void 0 ? [] : catchingDispatchesOf(e, S),
    L = w.length > 0 ? S : void 0,
    G = uniq(w.map(([, Me]) => Me.event)),
    q = new Set(L === void 0 ? [S].filter((Me) => Me !== void 0) : []),
    Z = S !== void 0,
    ke = (S === culprit?.plugin ? culprit?.evidence : void 0) ?? "stack";
  e.host.state.workerDeaths += 1;
  let we = workerCrashTelemetry(e, n.cause, Z ? ke : "none");
  if (
    (logFeatureSad("plugin_function_hooks_worker", "respawned", we),
    logForDebugging(`hooks worker: ${reason}; respawning`, { level: "error" }),
    L !== void 0)
  ) {
    ((e.kept = { crash: { plugin: L, reason: reason, fields: we }, hops: new Set(w.map(([Me]) => Me)) }),
      reportPluginProblem(
        L,
        `the hooks worker was lost with ${L}'s ${G.join(", ")} hook in flight; it is replaced, and ${L} stays loaded for the hook's .catch`,
      ));
    for (let Me of G) emit({ plugin: L, event: Me, reason: reason, effect: LFi, hasOverrun: !1 });
  }
  for (let Me of q)
    if (e.host.state.knownArgs.has(Me))
      (reportWorkerCrash(e.host, Me, { reason: reason, fields: we }), forgetPlugin(Me, e.host));
  (reportWorkerCrashWithholdings(e.host.state, q),
    markWorkerDead(e, reason),
    e.worker.terminate(),
    e.spawned.release?.());
  let { hooksRespawns: hooksRespawns } = getPluginRegistry(),
    { respawn: respawn, loaded: loaded } = registerRespawn(hooksRespawns);
  reloadAfterRespawn(e.host, reason, { isAttributed: Z, loaded: loaded })
    .catch(
      (Me) => (
        logError(Me),
        hooksRespawns.has(respawn)
          ? reloadAfterRespawn(e.host, `${reason}; tried again`, { isAttributed: !0, loaded: loaded })
          : void 0
      ),
    )
    .catch(logError)
    .then(loaded);
}
//@ chunk-e6aww6q8.js:4083726-4083748 placement
var KBn = (e) => {
  return;
};
//@ chunk-e6aww6q8.js:4083748-4083784 placement
var eos = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:4083784-4083797 placement
var ros = 1000;
//@ chunk-e6aww6q8.js:4083797-4083810 placement
var VBn = 5000;
//@ chunk-e6aww6q8.js:4083810-4083846 placement
var YBn = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:4083846-4083856 placement
var _os = 2;
//@ chunk-e6aww6q8.js:4083856-4083867 placement
var XBn = 12;
//@ chunk-e6aww6q8.js:4083867-4084043 placement
function readWorkerCpu(e) {
  try {
    let n = e.spawned.thread?.();
    return n !== void 0 && Number.isFinite(n.usedMs)
      ? { at: performance.now(), usedMs: n.usedMs, isAsleep: n.isAsleep === !0 }
      : void 0;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:4084043-4084061 placement
var QBn = (e, n) => !1;
//@ chunk-e6aww6q8.js:4084061-4084214 placement
function cpuUsedSince(e, n, r) {
  let s = (n?.usedMs ?? Number.NaN) - (e?.usedMs ?? Number.NaN),
    h = e !== void 0 && n !== void 0 && s >= 0,
    S = h && QBn(e, n) ? r : Math.min(s, r);
  return h ? S : void 0;
}
//@ chunk-e6aww6q8.js:4084214-4084264 placement
var K4 = () => eos.get() ?? { readyMs: iEt, timeoutMs: VBn };
//@ chunk-e6aww6q8.js:4084264-4084316 placement
var ZBn = (e) => e.names.get(Atomics.load(e.stamp, ixt));
/**
 * 心跳超时时，若只有一个进行中的单模块分发且已收到心跳之后的标记，判定该模块为卡住 worker 的元凶。
 */
//@ chunk-e6aww6q8.js:4084316-4084924 placement
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
  let [r] = e.inFlight,
    [s, h] = r ?? [],
    y = e.awaitingPong?.n;
  if (!(s !== void 0 && h !== void 0 && y !== void 0)) return;
  let [w, ...L] = h.environments,
    G = `${w}:`,
    { marks: marks } = e,
    Z =
      w !== void 0 &&
      L.length === 0 &&
      h.stream === void 0 &&
      h.calls.size === 0 &&
      ![...e.opControllers.keys()].some((we) => we.startsWith(G)),
    Se =
      h.answersSent === 0 || (Atomics.load(marks, crs) === s && Atomics.load(marks, drs) === h.answersSent);
  return Z && y > h.sentAtPing && Atomics.load(marks, uZr) >= s && Se ? e.names.get(w) : void 0;
}
/**
 * 依次从调用栈、恢复标记、单一分发推断卡住 hooks worker 的插件。
 */
//@ chunk-e6aww6q8.js:4084924-4085133 placement
function findStuckCulprit(e) {
  let n = stackedPluginOf(e);
  if (n !== void 0) return { plugin: n, evidence: "stack" };
  let r = ZBn(e);
  if (r !== void 0) return { plugin: r, evidence: "resumed" };
  let s = loneDispatchCulprit(e);
  return s === void 0 ? void 0 : { plugin: s, evidence: "dispatch" };
}
/**
 * 描述心跳超时的判定（卡住的插件、未应答的分发等）。
 */
//@ chunk-e6aww6q8.js:4085133-4085546 placement
function describeHeartbeatVerdict(e, n) {
  if (e === void 0)
    return "hooks worker: the heartbeat verdict names nobody (no plugin on the stack, none resumed in the stuck turn, no lone begun hop)";
  return n
    ? `hooks worker: the heartbeat verdict names ${e.plugin} (evidence: ${e.evidence})`
    : `hooks worker: the heartbeat verdict names nobody (the thread stopped in ${e.plugin}, evidence: ${e.evidence}, and had not used a window of processor time)`;
}
//@ chunk-e6aww6q8.js:4085546-4085596 placement
var oUn = "what held the hooks worker is not known";
/**
 * hooks worker 心跳检查：启动超时或心跳无应答时判定 worker 卡死。
 */
//@ chunk-e6aww6q8.js:4085596-4086616 placement
function checkHooksWorkerHeartbeat(e, n, r) {
  let read = n.read,
    h = readWorkerCpu(e),
    y = cpuUsedSince(read, h, e.heartbeatMs),
    S = e.isStarting && read?.isAsleep === !0 && h?.isAsleep === !0,
    L = e.pendingLoads.size > 0 || e.pendingBuilds.size > 0 ? K4().timeoutMs : (YBn.get()?.timeoutMs ?? VBn),
    G = L * XBn;
  if (
    ((n.read = h),
    (n.beats += 1),
    (n.usedMs += S ? e.heartbeatMs : (y ?? e.heartbeatMs)),
    (n.unansweredBeats = Math.min(
      n.beats,
      Math.ceil(L / e.heartbeatMs),
      Math.round(n.usedMs / e.heartbeatMs),
    )),
    e.isStarting)
  )
    Hoe(e, e.beatAt, r);
  else if (y !== void 0) Hoe(e, (read?.at ?? r) + y, r);
  let q = G / 2,
    Z = e.isStarting && n.usedMs >= q,
    Se = !e.isStarting && n.unansweredBeats * e.heartbeatMs >= L;
  if (!(Z || Se || n.beats * e.heartbeatMs >= G)) return;
  let we = findStuckCulprit(e),
    Ee = Se ? we : KBn(we);
  if ((logForDebugging(describeHeartbeatVerdict(we, Ee !== void 0), { level: "warn" }), Z))
    return {
      reason: `the hooks worker did not come online within ${q}ms of time its thread had: its start hung`,
      cause: "heartbeat",
      culprit: void 0,
    };
  return {
    reason: Se
      ? `no answer to a heartbeat within ${L}ms: the hooks worker is wedged (a hook spinning without yielding)`
      : `no answer to a heartbeat within ${G}ms: ` + oUn,
    cause: Se ? "heartbeat" : "heartbeat_waited",
    culprit: Ee,
  };
}
/**
 * 心跳定时器：空闲时停止；有未回的 ping 时判断是否卡死（卡死则重生 worker），否则发新 ping。
 */
//@ chunk-e6aww6q8.js:4086616-4086934 placement
function heartbeatTick(e) {
  if (isHostIdle(e)) {
    p4(e);
    return;
  }
  let { awaitingPong: awaitingPong } = e,
    startTime = performance.now(),
    s = awaitingPong !== void 0,
    h = s ? checkHooksWorkerHeartbeat(e, awaitingPong, startTime) : void 0;
  if ((catchUpHeartbeat(e, startTime), (e.beatAt = startTime), h !== void 0)) respawnHooksWorker(e, h);
  if (s) return;
  ((e.awaitingPong = {
    n: ++e.pingCounter,
    unansweredBeats: 0,
    usedMs: 0,
    beats: 0,
    isOwed: !1,
    sentAt: Date.now(),
    read: readWorkerCpu(e),
  }),
    postToWorker(e, { type: "ping", n: e.awaitingPong.n }));
}
/**
 * 若未启动心跳则启动（间隔可配置），定时器 unref。
 */
//@ chunk-e6aww6q8.js:4086934-4087120 placement
function ensureHeartbeat(e) {
  if (e.heartbeat === void 0)
    ((e.awaitingPong = void 0),
      (e.beatAt = performance.now()),
      (e.heartbeatMs = YBn.get()?.ms ?? ros),
      (e.heartbeat = setInterval(heartbeatTick, e.heartbeatMs, e)),
      e.heartbeat.unref());
}
/**
 * 向某环境的消息端口请求 flush，完成时 resolve；端口不存在立即 resolve。
 */
//@ chunk-e6aww6q8.js:4087120-4087314 placement
function flushEnvironmentPort(e, n, r) {
  let s = e.ports.get(n);
  if (s === void 0) {
    r.resolve();
    return;
  }
  ((e.flushCounter += 1),
    e.pendingFlushes.set(`${n}:${e.flushCounter}`, r),
    s.postMessage({ type: "flush", flushId: e.flushCounter }));
}
//@ chunk-e6aww6q8.js:4087314-4087438 placement
function settleWorkerIdle(e) {
  if (e.inFlight.size === 0 && e.pendingCalls.size === 0 && e.pendingPresses.size === 0) e.worker.unref?.();
  if (isHostIdle(e)) p4(e);
}
//@ chunk-e6aww6q8.js:4087438-4087511 placement
function Cx(e) {
  if (e.awaitingPong !== void 0) e.awaitingPong.isOwed = !0;
  settleWorkerIdle(e);
}
/**
 * 检查环境加载是否超时，超时则终止并报告。
 */
//@ chunk-e6aww6q8.js:4087511-4087896 placement
function checkLoadTimeout(e, n) {
  let r = n.pending.get(n.environmentId);
  if (!(r !== void 0 && (n.waiter === void 0 || n.waiter === r))) return;
  let startTime = performance.now();
  catchUpHeartbeat(e, startTime);
  let { readyMs: readyMs, timeoutMs: timeoutMs } = K4(),
    w = readyMs + timeoutMs * XBn,
    floored = Math.floor(n.since + w - startTime),
    min = Math.min(e.waitedMs - n.waitedMs, floored);
  if (min > 0) {
    setTimeout(checkLoadTimeout, min, e, { ...n, waitedMs: e.waitedMs, waiter: r }).unref();
    return;
  }
  (QAe(n.pending, n.environmentId, n.reason(floored > 0 ? readyMs : w)), Cx(e));
}
//@ chunk-e6aww6q8.js:4087896-4088035 placement
function armLoadTimeout(e, n) {
  let r = setTimeout(checkLoadTimeout, K4().readyMs, e, {
    ...n,
    waitedMs: e.waitedMs,
    since: performance.now(),
    waiter: void 0,
  });
  return (r.unref(), r);
}
//@ chunk-e6aww6q8.js:4088035-4088088 placement
var ore = (e, n) => e.inCallerContext(() => Ayn(e.scope, n));
//@ chunk-e6aww6q8.js:4088088-4088192 placement
function callersOfServing(e, n, r) {
  let s = r === void 0 ? void 0 : e.pendingCalls.get(r);
  return s?.callee === n ? s.callers : void 0;
}
//@ chunk-e6aww6q8.js:4088192-4088314 placement
function clearOverruns(e, n) {
  for (let environment of n.environments) {
    let s = e.names.get(environment);
    if (s !== void 0 && !n.failed.has(s)) e.overruns.delete(s);
  }
}
//@ chunk-e6aww6q8.js:4088314-4088405 placement
var X4 = (e, n, r) => ({
  resolve: (s) => {
    (clearTimeout(e), n(s));
  },
  reject: (s) => {
    (clearTimeout(e), r(s));
  },
});
/**
 * 启动 hooks worker（所有插件共用一个）并记录遥测。
 */
//@ chunk-e6aww6q8.js:4088405-4089233 placement
function spawnHooksWorker(e) {
  let spawnWorker = ZV.spawnWorker(),
    { worker: worker, stamp: stamp, marks: marks } = spawnWorker;
  return (
    (e.state.workerSpawns += 1),
    logFeatureOk("plugin_function_hooks_worker", { spawns: e.state.workerSpawns }),
    logForDebugging("hooks worker spawned (one for every plugin)"),
    {
      host: e,
      spawned: spawnWorker,
      spawnedAt: Date.now(),
      worker: worker,
      stamp: stamp,
      marks: marks,
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
      died: void 0,
      isStarting: !0,
      pendingFlushes: new Map(),
      runningOps: new Map(),
      startOps: new Set(),
      overruns: new Map(),
      heartbeat: void 0,
      heartbeatMs: 0,
      pingCounter: 0,
      awaitingPong: void 0,
      beatAt: 0,
      waitedMs: 0,
      waitedUntil: 0,
    }
  );
}
//@ chunk-e6aww6q8.js:4089233-4089379 placement
function releaseKeptHop(e, n, r) {
  let { kept: kept } = e,
    h = kept?.hops.delete(n) === !0;
  if (kept === void 0 || !h) return !1;
  if (r) (kept.hops.clear(), (e.kept = void 0));
  return !r && kept.hops.size === 0;
}
/**
 * worker 结束（close）或出错（error 事件）时以相应原因重生 worker。
 */
//@ chunk-e6aww6q8.js:4089379-4089749 placement
function respawnOnWorkerEnd(e, n) {
  if (n.type === "close") {
    let s = "code" in n && typeof n.code === "number";
    respawnHooksWorker(e, {
      reason: "the hooks worker ended" + (s ? ` (close code ${n.code})` : ""),
      cause: "close_event",
      culprit: void 0,
    });
    return;
  }
  let r = n instanceof ErrorEvent;
  respawnHooksWorker(e, {
    reason: "the hooks worker died: " + (r ? n.message : `'${n.type}' event without a message`),
    cause: r ? "error_event" : "bare_event",
    culprit: void 0,
  });
}
//@ chunk-e6aww6q8.js:4089749-4090395 placement
function validatePassedBySighting(e, n) {
  let { link: link, plugins: plugins, event: event, by: by, count: count } = n;
  if (!Number.isSafeInteger(count) || count < 1) return "its count is not a whole number of dispatches";
  if (!(isHookEvent(event) || isPluginDefinedEvent(event))) return "its event is not one the host knows";
  if (!e.state.knownPlugins.has(by)) return "the plugin it says continued past is not one the host knows";
  if (plugins.length === 0 || plugins.length > e.state.knownPlugins.size)
    return "it names no plugin, or more than the host knows";
  let L = new Set(plugins);
  if (L.size !== plugins.length) return "it names a plugin twice";
  if (link !== plugins.join("+")) return "its link is not the plugins it names";
  return [...L].every((q) => IT(q) !== void 0) ? void 0 : "it names a plugin with no module loaded";
}
//@ chunk-e6aww6q8.js:4090395-4090406 placement
var f2r = !0;
//@ chunk-e6aww6q8.js:4090406-4090452 placement
function p2r(e) {
  return formatTaskNotification({
    body: `
${escapeXml(e)}`,
  });
}
/**
 * 先排队、待有处理器入座后再执行的队列（seat/queue/reset）。
 */
//@ chunk-e6aww6q8.js:4090452-4090684 placement
function createDeferredQueue() {
  let e = to(),
    n = to();
  return {
    seat: (r) => {
      e.set(r);
      for (let s of n.get() ?? []) r(s);
      n.set(void 0);
    },
    queue: (r) => {
      let s = e.get();
      if (s === void 0) return n.set([...(n.get() ?? []), r]);
      return s(r);
    },
    reset: () => {
      (e.set(void 0), n.set(void 0));
    },
  };
}
//@ chunk-e6aww6q8.js:4090684-4090717 placement
var m2r = ge(createDeferredQueue(), (e) => e.reset());
/**
 * 把一条关于插件钩子的提示作为 meta 任务通知排入主代理下一轮（被动、跳过附件）。
 */
//@ chunk-e6aww6q8.js:4090717-4090854 placement
function queueModelNotice(e) {
  m2r.queue({
    agentId: mainAgentId(),
    value: p2r(e),
    mode: "task-notification",
    skipAttachments: !0,
    isMeta: f2r,
    passive: !0,
    priority: "next",
  });
}
//@ chunk-e6aww6q8.js:4090854-4090917 placement
function oF(e) {
  let n = toApprovalLabel(e);
  return n === null ? "unnamed" : String(n);
}
/**
 * 处理 hooks worker 发来的消息（online、pong、loaded、load_error、日志等），并识别失控插件。
 */
//@ chunk-e6aww6q8.js:4096791-4099085 placement
function handleHooksWorkerMessage(e, n) {
  switch (n.type) {
    case "online": {
      let { awaitingPong: awaitingPong, isStarting: isStarting } = e;
      if (((e.isStarting = !1), isStarting && awaitingPong !== void 0))
        ((awaitingPong.beats = 0),
          (awaitingPong.usedMs = 0),
          (awaitingPong.unansweredBeats = 0),
          (awaitingPong.read = readWorkerCpu(e)));
      return;
    }
    case "pong":
      if (e.awaitingPong?.n === n.n) e.awaitingPong = void 0;
      return;
    case "loaded":
      settlePendingLoad(e, n);
      return;
    case "load_error":
      XJ(e.pendingLoads, n.environmentId)?.reject(new HooksError(n.error, { cause: n.cause }));
      return;
    case "log":
      logForDebugging(n.text, { level: n.level ?? "debug" });
      return;
    case "hook_failed": {
      let r = toHookFailedEvent(n);
      if ((emit(r), reportHookSkip(r), markInFlightFailed(e, r), n.hasOverrun)) {
        let s = (e.overruns.get(n.plugin) ?? 0) + 1;
        if ((e.overruns.set(n.plugin, s), s >= _os))
          respawnHooksWorker(e, {
            reason: `${n.plugin} ignored its signal ${s} times in a row: a runaway plugin in the hooks worker`,
            cause: "runaway",
            culprit: { plugin: n.plugin, evidence: "trigger" },
          });
      }
      logFunctionHooksRun(r);
      return;
    }
    case "passed_by":
      acceptWorkerPassedBy(e.host, n.sighting);
      return;
    case "unhandled":
      logForDebugging(`hooks worker: a promise a plugin did not await rejected: ${n.error}`);
      return;
    case "built":
    case "built_error": {
      let r = XJ(e.pendingBuilds, n.environmentId);
      n.type === "built" ? r?.resolve() : r?.reject(new HooksError(n.error));
      return;
    }
    case "call_result":
    case "call_error": {
      let r = takeAnsweredCall(e, n.callId);
      (settleWorkerIdle(e),
        n.type === "call_result" ? r?.resolve(n.value) : r?.reject(new HooksError(n.error)));
      return;
    }
    case "resolved":
    case "resolve_error": {
      let r = XJ(e.pendingResolves, n.resolveId);
      (settleWorkerIdle(e), n.type === "resolved" ? r?.resolve() : r?.reject(new HooksError(n.error)));
      return;
    }
    case "press_result":
    case "press_error": {
      let r = XJ(e.pendingPresses, n.pressId);
      (settleWorkerIdle(e), n.type === "press_result" ? r?.resolve() : r?.reject(new HooksError(n.error)));
      return;
    }
    case "result":
    case "error": {
      let r = XJ(e.inFlight, n.id);
      if ((r?.unlink(), n.type === "result" && r !== void 0)) clearOverruns(e, r);
      n.type === "result"
        ? r?.resolve({
            result: n.result,
            ...(Array.isArray(n.answered) && { answered: n.answered }),
            ...(n.unmatched === !0 && { unmatched: !0 }),
            ...(n.withheld === !0 && { withheld: !0 }),
          })
        : r?.reject(
            n.withheld === !0 ? ipr(new HooksError(n.error), { isNoted: !0 }) : new HooksError(n.error),
          );
      return;
    }
    case "stream_step":
      handleWorkerStreamPull(e, n);
      return;
    case "next":
      handleWorkerNext(e, n);
      return;
    case "next_pull":
      handleWorkerStreamNext(e, n);
      return;
    case "next_close": {
      let r = e.inFlight.get(n.id)?.stream,
        s = r?.opened.get(n.nextId);
      (r?.opened.delete(n.nextId),
        Promise.resolve(s?.return(void 0)).catch(() => {
          return;
        }));
      return;
    }
    case "next_abort":
      e.inFlight.get(n.id)?.calls.get(n.nextId)?.abort(Cos(n.reason, n.isSettled));
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
  do ((n = e.state.workerDeaths), await e.state.queue(() => Promise.resolve()));
  while (n !== e.state.workerDeaths);
}
/**
 * 向 worker 内另一插件发起接口调用：分配 callId、设超时、记录调用者与借用信息，序列化失败时拒绝。
 */
//@ chunk-e6aww6q8.js:4099214-4099986 placement
function callInterfaceInWorker(e, { environmentId: environmentId, call: r, behind: behind }) {
  if (e.died !== void 0) return Promise.reject(new HooksError(e.died));
  let h = ++e.callCounter,
    y = behind?.callers ?? [],
    S = apiMethodLabel(r),
    w = qni(S, e.names.get(environmentId) ?? r.owner, cEe);
  e.worker.ref?.();
  let L;
  return new Promise((G, q) => {
    let Z = setTimeout(srt, cEe, {
      pendingCalls: e.pendingCalls,
      callId: h,
      settleIdle: () => Cx(e),
      reject: () => q(new Jeo(w, S)),
      reason: w,
    });
    (Z.unref(),
      e.pendingCalls.set(h, {
        resolve: (Se) => {
          (clearTimeout(Z), G(Se));
        },
        reject: (Se) => {
          (clearTimeout(Z), q(Se));
        },
        callee: environmentId,
        callers: y,
        lent: behind?.lent ?? [],
        facts: behind?.facts,
        scope: KZn(),
      }),
      (L = e.pendingCalls.get(h)));
    try {
      postToWorker(e, { type: "call", callId: h, environmentId: environmentId, call: r, callers: y });
    } catch (error) {
      (clearTimeout(Z),
        e.pendingCalls.delete(h),
        q(new HooksError(`${S}: arguments are not plain data: ${errorMessage(error)}`)));
      return;
    }
    ensureHeartbeat(e);
  }).finally(() => {
    zZn(L);
  });
}
//@ chunk-e6aww6q8.js:4099986-4100139 placement
function rejectAbandonedDispatch(e, n) {
  let r = XJ(e.inFlight, n);
  if (r === void 0) return;
  (r.unlink(), r.reject(new HooksError(`did not settle within ${H5e}ms of its signal aborting`)), Cx(e));
}
/**
 * 向 hooks worker 分发一次事件：序列化参数、处理中止和 DataCloneError。
 */
//@ chunk-e6aww6q8.js:4100139-4101943 placement
function dispatchToHooksWorker(e, { request: request, next: r, signal: signal }) {
  if (e.died !== void 0) return Promise.reject(new HooksError(e.died));
  let {
    id: id,
    event: event,
    payload: payload,
    environments: environments,
    leftOut: leftOut,
    origin: origin,
    hookOrigin: hookOrigin,
    raise: raise,
    floors: floors,
    cutAt: cutAt,
    ended: ended,
    caughtBy: caughtBy,
  } = request;
  function Ae() {
    if (e.inFlight.has(id))
      (postToWorker(e, { type: "abort", id: id, reason: errorMessage(signal.reason), ...spr(signal) }),
        setTimeout(rejectAbandonedDispatch, H5e, e, id).unref());
  }
  e.worker.ref?.();
  let Ie,
    Me = parseAskUserQuestionRenderRequest(event, payload),
    We = () => {},
    ze = olt(e.host, request),
    lt = ended === void 0 && !X4o() && !NZr() && ze !== "session.start";
  return new Promise((Je, nt) => {
    if (Me !== void 0)
      We = zte.onFreed((Et) => {
        if (qRt(Et) === qRt(Me))
          postToWorker(e, { type: "dialog_clients", site: Me, clients: zte.clientsOf(Me) });
      });
    let pt = NUn({
      resolve: Je,
      reject: nt,
      cwd: getCwd(),
      inCallerContext: wFt(),
      event: event,
      payload: payload,
      origin: hookOrigin,
      signal: signal,
      sentAtPing: e.pingCounter,
      answersSent: 0,
      environments: environments,
      turnHeld: ilt(e.host, request),
      rootEvent: ze,
      isPersonInput: isPersonGestureEvent(event, payload),
      gestureAt: request.gestureAt,
      pressOwner: nlt(event, payload),
      listedMedia: submittedAttachmentIds(event, payload),
      tool: toolNameOfCall(event, payload),
      scope: KZn(),
      next: r,
      calls: new Map(),
      caughtBy: lt ? (caughtBy ?? []) : [],
      failed: new Set(),
      unlink: () => {},
    });
    ((Ie = pt), irt(e.work, environments), e.inFlight.set(id, pt));
    try {
      postToWorker(e, {
        type: "dispatch",
        id: id,
        event: event,
        payload: payload,
        environments: [...environments],
        leftOut: leftOut?.map((Et) => ({
          environmentId: Et.environmentId,
          registrations: [...Et.registrations],
        })),
        origin: origin,
        raise: raise,
        floors: floors === void 0 ? void 0 : [...floors],
        cutAt: cutAt,
        names: qUi(event),
        dialogClients: Me === void 0 ? [] : zte.clientsOf(Me),
        ...(ended !== void 0 && { ended: ended }),
      });
    } catch (error) {
      e.inFlight.delete(id);
      let yt = errorMessage(error),
        joined = environments.map((qt) => e.names.get(qt) ?? qt).join(", "),
        At =
          error instanceof RangeError || (error instanceof DOMException && error.name === "DataCloneError"),
        It = At ? classicWithholding(event, payload) : void 0,
        Yt = At ? "is not plain data" : "could not be posted to the hooks worker";
      nt(
        It === void 0
          ? new HooksError(`${event} event ${Yt}: ${yt}`)
          : ipr(new HooksError(`${joined}: ${event}: could not be given its argument: ` + yt), It),
      );
      return;
    }
    (ensureHeartbeat(e), (pt.unlink = forwardAbort(signal, { abort: Ae })));
  }).finally(() => {
    (We(), zZn(Ie), settleWorkerIdle(e));
  });
}
/**
 * 把流式事件分发给 hooks worker（stream_pull/stream_close），检查参数是否为纯数据。
 */
//@ chunk-e6aww6q8.js:4101943-4103654 placement
function dispatchStreamToHooksWorker(e, { request: request, next: r, signal: signal }) {
  let {
    id: id,
    event: event,
    payload: payload,
    environments: environments,
    leftOut: leftOut,
    origin: origin,
    hookOrigin: hookOrigin,
  } = request;
  return teeGeneratorResult(async function* () {
    if (e.died !== void 0) throw new HooksError(e.died);
    let Z,
      Se = !1,
      ke = { open: r, opened: new Map(), pull: void 0 },
      we = NUn({
        resolve: () => {},
        reject: (Ae) => {
          ((Z = Ae), ke.pull?.reject(Ae), (ke.pull = void 0));
        },
        cwd: getCwd(),
        inCallerContext: wFt(),
        event: event,
        payload: payload,
        origin: hookOrigin,
        signal: signal,
        sentAtPing: e.pingCounter,
        answersSent: 0,
        environments: environments,
        turnHeld: ilt(e.host, request),
        rootEvent: olt(e.host, request),
        isPersonInput: isPersonGestureEvent(event, payload),
        gestureAt: request.gestureAt,
        pressOwner: nlt(event, payload),
        listedMedia: submittedAttachmentIds(event, payload),
        scope: KZn(),
        next: () => Promise.reject(new HooksError(`${event}: a streaming hop takes next_pull`)),
        calls: new Map(),
        caughtBy: [],
        failed: new Set(),
        unlink: () => {},
        stream: ke,
      });
    function Ee() {
      if (e.inFlight.has(id))
        (postToWorker(e, { type: "abort", id: id, reason: errorMessage(signal.reason), ...spr(signal) }),
          setTimeout(rejectAbandonedDispatch, H5e, e, id).unref());
    }
    (e.worker.ref?.(), irt(e.work, environments), e.inFlight.set(id, we));
    try {
      postToWorker(e, {
        type: "dispatch_stream",
        id: id,
        event: event,
        payload: payload,
        environments: [...environments],
        leftOut: leftOut?.map((Ae) => ({
          environmentId: Ae.environmentId,
          registrations: [...Ae.registrations],
        })),
        origin: origin,
        raise: request.raise,
        floors: request.floors === void 0 ? void 0 : [...request.floors],
        dialogClients: [],
      });
    } catch (error) {
      throw (
        e.inFlight.delete(id),
        settleWorkerIdle(e),
        new HooksError(`${event} event is not plain data: ${errorMessage(error)}`)
      );
    }
    (ensureHeartbeat(e), (we.unlink = forwardAbort(signal, { abort: Ee })));
    try {
      while (!0) {
        if (Z !== void 0) throw Z;
        let promise = await new Promise((Ie, Me) => {
          ((ke.pull = { resolve: Ie, reject: Me }), postToWorker(e, { type: "stream_pull", id: id }));
        });
        if (((ke.pull = void 0), promise.done)) return ((Se = !0), clearOverruns(e, we), promise.value);
        yield promise.value;
      }
    } finally {
      if ((zZn(we), e.inFlight.delete(id), we.unlink(), !Se && e.died === void 0))
        postToWorker(e, { type: "stream_close", id: id });
      for (let Ae of ke.opened.values())
        Promise.resolve(Ae.return(void 0)).catch(() => {
          return;
        });
      (ke.opened.clear(), settleWorkerIdle(e));
    }
  });
}
//@ chunk-e6aww6q8.js:4103654-4103758 placement
function runAsLoadedModule(e, n, r) {
  let any = getPluginRegistry().loadedModules.some((loadedModule) => loadedModule.environmentId === e);
  return K_n.run(any ? void 0 : n, r);
}
/**
 * 求插件调用的来源链（分发、注册、服务与根事件）。
 */
//@ chunk-e6aww6q8.js:4103758-4104203 placement
function callOriginFor(
  e,
  n,
  { dispatchId: dispatchId, registration: registration, serving: serving, rootEvent: rootEvent },
) {
  let S = e.names.get(n),
    w = dispatchId === void 0 ? void 0 : e.inFlight.get(dispatchId),
    L = w?.environments.includes(n) === !0 ? w : void 0,
    G = serving === void 0 ? void 0 : (e.pendingCalls.get(serving) ?? e.answeredCalls.get(serving));
  if (S === void 0) return L?.origin ?? [];
  let q = G?.callee === n ? G : void 0,
    Z = L === void 0 && q === void 0 && rootEvent === void 0;
  return buildCallerChain(S, {
    dispatch: L,
    held: void 0,
    registration: Z ? void 0 : registration,
    served: Z ? collectLentFrames(e.pendingCalls.values(), n) : q,
  });
}
/**
 * 为 worker 发起的宿主操作构造调用者上下文：插件、信号、来源链、cwd、根事件、按键担保、是否服务模型调用等。
 */
//@ chunk-e6aww6q8.js:4104203-4105332 placement
function buildOpCaller(e, { environmentId: environmentId, plugin: plugin, frame: frame, signal: signal }) {
  let { dispatchId: dispatchId, serving: serving } = frame,
    w = dispatchId === void 0 ? void 0 : e.inFlight.get(dispatchId),
    L = w?.environments.includes(environmentId) === !0 ? w : void 0,
    G = serving !== void 0,
    q = G ? e.pendingCalls.get(serving) : void 0,
    Z = q ?? (G ? e.answeredCalls.get(serving) : void 0),
    Se = frame.registration === void 0,
    ke = Se && Z?.callee === environmentId,
    we = ke ? inheritDispatchFacts(Z, environmentId, iY(e.pendingCalls, serving, Z)) : void 0,
    Ee = ke ? we : L,
    Ae = Se && iv(Ee?.rootEvent),
    Ie = !Se && txe(L, e.names.get(environmentId)),
    Me = !Se && L !== void 0,
    We = Se ? void 0 : L?.listedMedia,
    ze = Se && !ke,
    lt = ze ? latestGestureAt(e.sentPresses.values(), environmentId) : void 0,
    Je = Ie ? L?.gestureAt : lt,
    nt = ze ? Pei(e.keptPresses, frame.pressing, environmentId) : void 0,
    Et = !Se && isModelOriginToolCall(L, plugin) ? L : void 0;
  return {
    plugin: plugin,
    signal: signal,
    origin: callOriginFor(e, environmentId, frame),
    cwd: Ee?.cwd,
    scopeHolder: L ?? (q?.callee === environmentId ? q : void 0),
    turnHeld: Ee?.turnHeld,
    rootEvent: (Ae ? void 0 : Ee?.rootEvent) ?? frame.rootEvent,
    ownRoot: frame.rootEvent,
    ...(Je !== void 0 && { vouchedPressAt: Je }),
    ...(nt !== void 0 && { answersPress: nt }),
    ...(Et !== void 0 && { isModelCallServed: !0, takeServedSpawn: dxe(Et) }),
    ...(!Se && L?.isPersonInput === !0 && { isPersonInput: !0 }),
    ...(Me && { judging: L }),
    ...(We !== void 0 && { listedMedia: We }),
    isDispatching: ke ? we?.isDispatching : iY(e.inFlight, dispatchId, L),
    environmentId: environmentId,
    callers: callersOfServing(e, environmentId, frame.serving),
  };
}
/**
 * 为 worker 的流式宿主操作打开流：绑定中止、经 qMe 调用宿主，失败时返回 HooksError。
 */
//@ chunk-e6aww6q8.js:4105332-4106035 placement
function openOpStream(e, { environmentId: environmentId, key: key, frame: frame }) {
  let { open: open } = frame,
    y = e.names.get(environmentId);
  if (open === void 0) return new HooksError("no stream is open for this op");
  if (y === void 0) return new HooksError(`${open.op}: the plugin's environment is unloaded`);
  let abortController = new AbortController(),
    { dispatchId: dispatchId } = open,
    L = dispatchId === void 0 ? void 0 : e.inFlight.get(dispatchId),
    G = forwardAbort(L?.signal, abortController),
    q = { isOver: !1 };
  function Z() {
    ((q.isOver = !0), G(), e.opControllers.delete(key), e.opStreams.delete(key));
  }
  try {
    let Se = runAsLoadedModule(environmentId, q, () =>
        streamOpForPlugin(e.host, {
          op: open.op,
          args: open.args,
          caller: buildOpCaller(e, {
            environmentId: environmentId,
            plugin: y,
            frame: open,
            signal: abortController.signal,
          }),
        }),
      ),
      ke = { op: open.op, stream: Se, dispatchId: dispatchId, mark: q, end: Z };
    return (e.opControllers.set(key, abortController), e.opStreams.set(key, ke), ke);
  } catch (error) {
    return ((q.isOver = !0), G(), error instanceof HooksError ? error : new HooksError(errorMessage(error)));
  }
}
/**
 * 处理 worker 的 op_pull/op_close：拉取下一块并回传 op_result/op_error，关闭时中止并回收。
 */
//@ chunk-e6aww6q8.js:4106035-4106933 placement
function pumpOpStream(e, { environmentId: environmentId, port: port, frame: frame }) {
  let { opId: opId } = frame,
    y = `${environmentId}:${opId}`,
    S = e.opStreams.get(y);
  if (frame.type === "op_close") {
    (e.opControllers.get(y)?.abort(new HooksError("the stream was let go")),
      S?.end(),
      S?.stream.return(void 0).catch(() => {
        return;
      }));
    return;
  }
  function w(q, Z) {
    if (e.ports.get(environmentId) !== port) return;
    port.postMessage(q);
    let { dispatchId: dispatchId } = Z ?? {},
      ke = dispatchId === void 0 ? void 0 : e.inFlight.get(dispatchId);
    if (ke !== void 0) ke.answersSent += 1;
  }
  let L = S ?? openOpStream(e, { environmentId: environmentId, key: y, frame: frame });
  if (L instanceof HooksError) {
    w({ type: "op_error", opId: opId, error: L.message });
    return;
  }
  let G = trackPluginOp(e.work, environmentId, L.op);
  runAsLoadedModule(environmentId, L.mark, () => L.stream.next()).then(
    (q) => {
      if ((G(), q.done === !0)) L.end();
      try {
        w({ type: "op_result", opId: opId, value: { done: q.done === !0, value: q.value } }, L);
      } catch (error) {
        (L.end(),
          L.stream.return(void 0).catch(() => {
            return;
          }),
          w(
            { type: "op_error", opId: opId, error: `a chunk that is not plain data: ${errorMessage(error)}` },
            L,
          ));
      }
    },
    (q) => {
      (G(), L.end(), w({ type: "op_error", opId: opId, error: errorMessage(q) }, L));
    },
  );
}
/**
 * 处理 worker 侧操作流（op_pull/op_close/op_abort/op_result），环境已卸载时报错。
 */
//@ chunk-e6aww6q8.js:4106933-4108452 placement
function handleWorkerOpStream(e, { environmentId: environmentId, port: port, frame: frame }) {
  if (frame.type === "flushed") {
    let ze = XJ(e.pendingFlushes, `${environmentId}:${frame.flushId}`);
    if (ze)
      Promise.allSettled(
        [...(e.runningOps.get(environmentId) ?? [])].filter((lt) => !oX.get() || !e.startOps.has(lt)),
      ).then(() => {
        (ze.resolve(), settleWorkerIdle(e));
      });
    return;
  }
  if (frame.type === "op_pull" || frame.type === "op_close") {
    pumpOpStream(e, { environmentId: environmentId, port: port, frame: frame });
    return;
  }
  let h = `${environmentId}:${frame.opId}`;
  if (frame.type === "op_abort") {
    (e.opControllers.get(h)?.abort(new HooksError(frame.reason)), e.opControllers.delete(h));
    return;
  }
  let { opId: opId, op: op, dispatchId: dispatchId } = frame,
    L = e.names.get(environmentId),
    G = dispatchId !== void 0 && !y3t(op);
  function q(ze) {
    if (e.ports.get(environmentId) !== port) return;
    port.postMessage(ze);
    let lt = G ? e.inFlight.get(dispatchId) : void 0;
    if (lt !== void 0) lt.answersSent += 1;
  }
  if (L === void 0) {
    q({ type: "op_error", opId: opId, error: `${frame.op}: the plugin's environment is unloaded` });
    return;
  }
  let abortController = new AbortController();
  e.opControllers.set(h, abortController);
  let Se = trackPluginOp(e.work, environmentId, frame.op),
    ke = e.runningOps.get(environmentId) ?? new Set();
  e.runningOps.set(environmentId, ke);
  let we = dispatchId === void 0 ? void 0 : e.inFlight.get(dispatchId),
    Ee = forwardAbort(we?.signal, abortController),
    Ae = { isOver: !1 },
    Ie = runAsLoadedModule(environmentId, Ae, () =>
      VHn(() =>
        interfaceCallForPlugin(e.host, {
          op: frame.op,
          args: frame.args,
          caller: buildOpCaller(e, {
            environmentId: environmentId,
            plugin: L,
            frame: frame,
            signal: abortController.signal,
          }),
        }),
      ),
    ).finally(() => {
      ((Ae.isOver = !0), Ee(), e.opControllers.delete(h), Se(), ke.delete(Ie), e.startOps.delete(Ie));
    }),
    Me = !RZr(frame.op) && !xUe(frame.op),
    We = Boolean(oX.get() && Wme(we?.rootEvent));
  if (Me) {
    if ((ke.add(Ie), We)) e.startOps.add(Ie);
  }
  Ie.then(
    (ze) => {
      try {
        q({ type: "op_result", opId: opId, value: ze });
      } catch (error) {
        q({
          type: "op_error",
          opId: opId,
          error: `${frame.op}: result is not plain data: ` + errorMessage(error),
        });
      }
    },
    (ze) => q({ type: "op_error", opId: opId, error: errorMessage(ze) }),
  );
}
/**
 * 在 worker 中加载一个插件环境：建立专用消息端口、设置加载超时，发送 load 消息并等待注册结果。
 */
//@ chunk-e6aww6q8.js:4108452-4109085 placement
function loadEnvironmentInWorker(e, n, r) {
  if (e.died !== void 0) return Promise.reject(new HooksError(e.died));
  e.names.set(n, r.pluginName);
  let messageChannel = new MessageChannel(),
    port1 = messageChannel.port1;
  (e.ports.set(n, port1),
    (port1.onmessage = (S) => handleWorkerOpStream(e, { environmentId: n, port: port1, frame: S.data })),
    yNr(port1));
  let y = armLoadTimeout(e, {
    pending: e.pendingLoads,
    environmentId: n,
    reason: (S) => N$t(r.pluginName, S),
  });
  return new Promise((S, w) => {
    if (
      (e.pendingLoads.set(n, {
        resolve: (L) => {
          (clearTimeout(y), S(L));
        },
        reject: (L) => {
          (clearTimeout(y),
            e.names.delete(n),
            closeEnvironmentPort(e, n),
            postToWorker(e, { type: "unload", environmentId: n }),
            w(L));
        },
      }),
      e.died !== void 0)
    ) {
      w(new HooksError(e.died));
      return;
    }
    (e.worker.postMessage({ type: "load", environmentId: n, args: r, port: messageChannel.port2 }, [
      messageChannel.port2,
    ]),
      ensureHeartbeat(e));
  });
}
//@ chunk-e6aww6q8.js:4109085-4109861 placement
function uiPressInWorker(e, { environmentId: environmentId, handle: handle, e: s }) {
  if (e.died !== void 0) return Promise.reject(new HooksError(e.died));
  let h = ++e.pressCounter;
  return (
    e.worker.ref?.(),
    e.sentPresses.set(h, { environmentId: environmentId, gestureAt: getAsyncStoreS61() }),
    notePressDispatch(e.keptPresses, h, environmentId),
    new Promise((y, S) => {
      let w = setTimeout(srt, cEe, {
        pendingCalls: e.pendingPresses,
        callId: h,
        settleIdle: () => Cx(e),
        reject: S,
        reason: `ui.press: ${e.names.get(environmentId) ?? environmentId} did not answer within ${cEe}ms`,
      });
      (w.unref(), e.pendingPresses.set(h, X4(w, y, S)));
      try {
        postToWorker(e, { type: "press", pressId: h, environmentId: environmentId, handle: handle, e: s });
      } catch (error) {
        (clearTimeout(w),
          e.pendingPresses.delete(h),
          S(new HooksError(`ui.press: the press is not plain data: ${errorMessage(error)}`)));
        return;
      }
      ensureHeartbeat(e);
    }).finally(() => {
      let y = () => {
        (e.sentPresses.delete(h), markPressAnswered(e.keptPresses, h));
      };
      try {
        flushEnvironmentPort(e, environmentId, { resolve: y, reject: y });
      } catch (error) {
        (logError(error), y());
      }
    })
  );
}
/**
 * 请求 worker 解析某环境的 UI 元素表（带超时）。
 */
//@ chunk-e6aww6q8.js:4109861-4110304 placement
function resolveTablesInWorker(e, n, r) {
  if (e.died !== void 0) return Promise.reject(new HooksError(e.died));
  let s = ++e.resolveCounter;
  return new Promise((h, y) => {
    let S = setTimeout(srt, iEt + cEe, {
      pendingCalls: e.pendingResolves,
      callId: s,
      settleIdle: () => Cx(e),
      reject: y,
      reason: `ui.resolve: ${e.names.get(n) ?? n}'s element tables were not resolved within ${iEt + cEe}ms`,
    });
    (S.unref(),
      e.pendingResolves.set(s, X4(S, h, y)),
      postToWorker(e, { type: "resolve", resolveId: s, environmentId: n, requests: r }),
      ensureHeartbeat(e));
  });
}
/**
 * 卸载 worker 中的一个环境：清理名字、工作计数、按键记录与端口，并发送 unload。
 */
//@ chunk-e6aww6q8.js:4110304-4110491 placement
function unloadEnvironmentInWorker(e, n) {
  let r = e.names.get(n);
  if (r !== void 0) e.overruns.delete(r);
  (e.names.delete(n),
    e.work.delete(n),
    Iei(e.keptPresses, n),
    abortEnvironmentOps(e, n, r),
    closeEnvironmentPort(e, n),
    postToWorker(e, { type: "unload", environmentId: n }));
}
/**
 * 终止 hooks worker 并卸载各插件环境，记录未能完成的卸载。
 */
//@ chunk-e6aww6q8.js:4110491-4112415 placement
function terminateHooksWorker(e) {
  let n = spawnHooksWorker(e),
    r = nis({
      kind: "worker",
      get died() {
        return n.died;
      },
      get kept() {
        return n.kept?.crash;
      },
      isKeptVerdict: (s, h) => releaseKeptHop(n, s, h),
      unloadCrashed(s, h) {
        e.state
          .queue(async () => {
            let found = getPluginRegistry().loadedModules.find(
              (loadedModule) => loadedModule.environmentId === s,
            );
            if (found !== void 0) await unloadHooksModules(e, new Set([found.name]), h);
          })
          .catch((y) =>
            logForDebugging(
              `hooks worker: the unload of environment ${s}, kept for a .catch that matched nothing, failed: ` +
                errorMessage(y),
              { level: "error" },
            ),
          );
      },
      replaced() {
        return n.died !== void 0 && !X4o() ? waitForDeathsSettled(e) : void 0;
      },
      isDeclared: (s) => e.state.knownArgs.has(s),
      nextDispatchId: () => ++n.dispatchCounter,
      inFlight: () => n.inFlight.values(),
      workInFlight: (s) => countActingOps(n.work, n.inFlight.values(), s),
      nameOf: (s) => n.names.get(s),
      load: (s, h) => loadEnvironmentInWorker(n, s, h),
      unload: (s) => unloadEnvironmentInWorker(n, s),
      dispatch: (s, h, y) => dispatchToHooksWorker(n, { request: s, next: h, signal: y }),
      dispatchStream: (s, h, y) => dispatchStreamToHooksWorker(n, { request: s, next: h, signal: y }),
      build(s, h, y) {
        if (n.died !== void 0) return Promise.reject(new HooksError(n.died));
        let withResolvers = Promise.withResolvers();
        return (
          n.pendingBuilds.set(
            s,
            X4(
              armLoadTimeout(n, {
                pending: n.pendingBuilds,
                environmentId: s,
                reason: (w) => `${n.names.get(s) ?? s}: $ not built within ${w}ms`,
              }),
              withResolvers.resolve,
              withResolvers.reject,
            ),
          ),
          postToWorker(n, { type: "build", environmentId: s, table: h, suppressed: y }),
          ensureHeartbeat(n),
          withResolvers.promise
        );
      },
      resolveTables: (s, h) => resolveTablesInWorker(n, s, h),
      callInterface: (s, h, y) => callInterfaceInWorker(n, { environmentId: s, call: h, behind: y }),
      press: (s, h, y) => uiPressInWorker(n, { environmentId: s, handle: h, e: y }),
      releasePresses(s, h) {
        if (h.length > 0 && n.died === void 0)
          postToWorker(n, { type: "press_release", environmentId: s, handles: h });
      },
      opsDelivered() {
        if (n.died !== void 0) return Promise.reject(new HooksError(n.died));
        let mapped = [...n.ports.keys()].map(
          (h) =>
            new Promise((y, S) => {
              flushEnvironmentPort(n, h, { resolve: y, reject: S });
            }),
        );
        if (mapped.length > 0) ensureHeartbeat(n);
        return Promise.all(mapped).then(() => {
          return;
        });
      },
      terminate() {
        (markWorkerDead(n, "the hooks worker was terminated"), n.worker.terminate(), n.spawned.release?.());
      },
    });
  return (
    n.worker.addEventListener("message", (s) => handleHooksWorkerMessage(n, s.data)),
    n.worker.addEventListener("error", (s) => respawnOnWorkerEnd(n, s)),
    n.worker.addEventListener("close", (s) => respawnOnWorkerEnd(n, s)),
    n.worker.unref?.(),
    r
  );
}
/**
 * 取得当前可用的环境宿主（worker 或同线程，按 CLAUDE_CODE_HOOKS_SAME_THREAD），宿主已死或类型变化时重建。
 */
//@ chunk-e6aww6q8.js:4112415-4112612 placement
function ensureEnvironmentHost(e) {
  {
    let n = pOe(),
      environmentHost = e.state.environmentHost;
    if (environmentHost === void 0 || environmentHost.died !== void 0 || environmentHost.kind !== n) {
      environmentHost?.terminate();
      let y = n === "same-thread" ? createSameThreadEnvironmentHost(e) : terminateHooksWorker(e);
      return ((e.state.environmentHost = y), y);
    }
    return environmentHost;
  }
}
//@ chunk-e6aww6q8.js:4112612-4112726 placement
async function waitOpsDelivered(e) {
  await Promise.all([e.state.environmentHost, e.state.nativeHost].map((n) => n?.opsDelivered()));
}
//@ chunk-e6aww6q8.js:4112726-4112741 placement
var nis = (e) => e;
//@ chunk-e6aww6q8.js:4112741-4112830 placement
function Xns(e) {
  if (e.state.environmentHost?.died !== void 0) e.state.environmentHost = void 0;
}
//@ chunk-e6aww6q8.js:4112830-4112845 placement
var NUn = (e) => e;
/**
 * 判断事件是否由人的操作触发：ui.press/input/select 总是；prompt.submit/command.run/ui.scroll 看 origin 是否来自输入框、桥接或人。
 */
//@ chunk-e6aww6q8.js:4112845-4113140 placement
function isPersonGestureEvent(e, n) {
  switch (e) {
    case "ui.press":
    case "ui.input":
    case "ui.select":
      return !0;
    case "prompt.submit":
    case "command.run":
    case "ui.scroll": {
      let r = "origin" in n ? n.origin : null,
        h = typeof r === "object" && r !== null && "kind" in r ? r.kind : null;
      return h === "composer" || h === "bridge" || h === "person";
    }
    default:
      return !1;
  }
}
/**
 * prompt.submit 载荷里的附件 id 列表。
 */
//@ chunk-e6aww6q8.js:4113140-4113371 placement
function submittedAttachmentIds(e, n) {
  if (e !== "prompt.submit") return;
  let r = "attachments" in n ? n.attachments : void 0;
  return (Array.isArray(r) ? r : []).flatMap((s) => {
    let y = typeof s === "object" && s !== null && "id" in s ? s.id : void 0;
    return typeof y === "string" ? [y] : [];
  });
}
//@ chunk-e6aww6q8.js:4113371-4113524 placement
var createNativeHost = (e) => (
  logForDebugging("hooks native host made (for the plugins the binary carries)"),
  createSameThreadHost(e, {
    kind: "native",
    copy: (n) => n,
    answer: (n, r) => r,
    createEnvironment: validateHooksModuleExports,
  })
);
/**
 * 取得原生（进程内、二进制自带插件）宿主，不存在或已死时创建。
 */
//@ chunk-e6aww6q8.js:4113524-4113650 placement
function ensureNativeHost(e) {
  {
    let nativeHost = e.state.nativeHost;
    if (nativeHost !== void 0 && nativeHost.died === void 0) return nativeHost;
    let r = createNativeHost(e);
    return ((e.state.nativeHost = r), r);
  }
}
//@ chunk-e6aww6q8.js:4113650-4113746 placement = _temp0 (1)
function nlt(e, n) {
  let r = "plugin" in n ? n.plugin : void 0;
  return iv(e) && typeof r === "string" ? r : void 0;
}
//@ chunk-e6aww6q8.js:4113746-4113888 placement
function retireHosts(e) {
  (e.state.environmentHost?.terminate(),
    (e.state.environmentHost = void 0),
    e.state.nativeHost?.terminate(),
    (e.state.nativeHost = void 0));
}
//@ chunk-e6aww6q8.js:4113888-4113926 placement
function olt(e, n) {
  return withInFlightDispatches(e, n, rootEventForOrigin);
}
//@ chunk-e6aww6q8.js:4113926-4114008 placement
var rre = (e) => "hooks (same thread): a promise a plugin did not await rejected: " + e;
/**
 * 同线程宿主的拒绝处理：把宿主操作失败与环境内值转换为对应错误。
 */
//@ chunk-e6aww6q8.js:4114008-4114157 placement
var createSameThreadRejectionHandler = (e) =>
  Jun((n, r) => {
    let opFailureOf = e.opFailureOf(n);
    if (opFailureOf !== void 0) return rre(unawaitedOpMessage(opFailureOf));
    let h = n0e(n) ? r : n;
    return !n0e(h) && e.ownsValue(h) ? rre(jfr(n)) : void 0;
  });
//@ chunk-e6aww6q8.js:4114157-4114226 placement
function VUn(e) {
  let n = dpr(e);
  if (n === void 0) return;
  return rre(unawaitedOpMessage(n));
}
//@ chunk-e6aww6q8.js:4114226-4114247 placement
var res = () => Jun(VUn);
//@ chunk-e6aww6q8.js:4114247-4114285 placement
function ilt(e, n) {
  return withInFlightDispatches(e, n, turnHeldEventFor);
}
//@ chunk-e6aww6q8.js:4114285-4114329 placement
var TWo = (e, n) => `${e}: not plain data: ${n}`;
//@ chunk-e6aww6q8.js:4114329-4114400 placement
function m9s(e, n) {
  try {
    return clone(e);
  } catch (error) {
    throw new HooksError(TWo(n, errorMessage(error)));
  }
}
/**
 * tool.call 的 next 结果无法回传时，若带 ref 则改成只带 ref 的空结果。
 */
//@ chunk-e6aww6q8.js:4114400-4114510 placement
function emptyToolCallResult(e, n) {
  return e === "tool.call" && "ref" in n && typeof n.ref === "number"
    ? { ref: n.ref, result: void 0 }
    : void 0;
}
//@ chunk-e6aww6q8.js:4114510-4114711 placement
function workInFlightAcrossHosts(e, n) {
  let mapped = [e.state.environmentHost, e.state.nativeHost]
    .filter((s) => s !== void 0)
    .map((s) => s.workInFlight(n));
  return { acting: mapped.reduce((s, h) => s + h.acting, 0), epoch: mapped.reduce((s, h) => s + h.epoch, 0) };
}
//@ chunk-e6aww6q8.js:4114711-4114766 placement
var IOe = () => ({
  plays: createAudioPlayer(),
  spawns: createAgentSpawner(),
  renders: createRenderInvalidator(),
});
/**
 * 函数钩子宿主的全部状态：已知插件与参数、环境映射、崩溃计数、扣留记录、加载/折叠中的集合、环境宿主、调用链与预算等。
 */
//@ chunk-e6aww6q8.js:4114766-4115500 placement
var createHooksHostState = (e = bqe()) => ({
  knownArgs: new Map(),
  environmentArgs: new Map(),
  knownPlugins: new Map(),
  buildFailures: new Map(),
  unloadedSteps: new Map(),
  unattributedCrashes: 0,
  workerSpawns: 0,
  workerDeaths: 0,
  modsOffAt: void 0,
  crashedWithholders: new Map(),
  withholdings: new Map(),
  generations: new Map(),
  optionsReloadFailures: new Map(),
  queue: (n) => e(() => HFi(n)),
  loading: new Set(),
  loadingRead: createSignal(),
  building: void 0,
  admitting: void 0,
  lastTable: {},
  lastEndedBy: void 0,
  isSetRecord: !1,
  lastOwners: {},
  withheld: createWithholdingTable({ table: {}, order: [] }),
  staged: void 0,
  stagedBefore: void 0,
  refusalsLogged: new Set(),
  environmentHost: void 0,
  nativeHost: void 0,
  environmentCounter: 0,
  unadmitted: new Set(),
  replacedEnvironments: new Set(),
  pendingInvalidations: new Set(),
  sentCalls: new Set(),
  chainsAbove: new WeakMap(),
  budgets: IOe(),
});
//@ chunk-e6aww6q8.js:4115500-4115673 placement
function createHooksHost() {
  let e = ge(createHooksHostState(), (n) => {
    (n.budgets.renders.drop(),
      (n.budgets = IOe()),
      (n.workerSpawns = 0),
      (n.workerDeaths = 0),
      (n.modsOffAt = void 0));
  });
  return { state: e, ops: MODEL_API_CATALOG(e), streamOps: freeze_21 };
}
//@ chunk-e6aww6q8.js:4115673-4115686 placement
var sre = to();
/**
 * 初始化函数钩子宿主：注册日志与 hookFailed 处理、越过记录，返回加载/重载/卸载、接口调用、宿主操作、退役等方法的门面。
 */
//@ chunk-e6aww6q8.js:4115686-4116682 placement
function initHooksHost() {
  let e = createHooksHost();
  return (
    sre.set({ read: () => WBn(e), mayRegisterCommands: () => isLoadingAnyCommandRun(e) }),
    yrs.set(() => String(getSessionId())),
    rfr.set((n) => recordPassedBySighting(e, n)),
    dCn({
      log: (n, r) => logForDebugging(n, { level: r ?? "debug" }),
      hookFailed(n) {
        if (n.environmentId !== void 0 && e.state.replacedEnvironments.has(n.environmentId)) return;
        (emit(n), reportHookSkip(n), logFunctionHooksRun(n));
      },
    }),
    {
      loadHooksModules: (n, r) => startLoadingModules(e, n, r),
      mayHookCommand: (n) => isLoadingCommandRun(e, n),
      mayRegisterCommands: () => isLoadingAnyCommandRun(e),
      loadingScansRead: () => WBn(e),
      onLoadingScansRead: (n) => e.state.loadingRead.subscribe(n),
      pruneHooksModules: (n) => unloadDisabledPlugins(e, n),
      reloadHooksModule: (n) => Flt(n, e),
      retryUnloadedModules: () => e.state.unloadedSteps.clear(),
      refreshOptions: () =>
        HOOKS_OPTIONS_STATUS_TEXT(e, (n) => wrapReloadError(n, () => reloadHooksModuleByName(n, e))),
      retargetHooksModule: (n, r) => retargetKnownPlugin(n, e, r),
      loadedFilesOf: (n) => hooksModuleFilesOf(n, e),
      buildInterfaces: (n, r) => buildEngineApi(e, n, r),
      routeInterfaceCall: (n, r) => explainApiNotAvailable(e.state, { caller: n, callers: [], lent: [] }, r),
      runHostOp: (n, r, s) => interfaceCallForPlugin(e, { op: n, args: r, caller: s }),
      retireEnvironmentHost: () => retireHosts(e),
      opsDelivered: () => waitOpsDelivered(e),
      workInFlight: (n) => workInFlightAcrossHosts(e, n),
      applyPendingInvalidations: () => applyPendingUiInvalidations(e),
    }
  );
}

export {
  TWo,
  m9s,
  sre,
  m2r,
  ensureNativeHost,
  ensureEnvironmentHost,
  initHooksHost,
  createSameThreadRejectionHandler,
  res,
  ilt,
  olt,
  isPersonGestureEvent,
  nlt,
  submittedAttachmentIds,
  emptyToolCallResult,
  oF,
  queueModelNotice,
  validatePassedBySighting,
  ore,
  flushEnvironmentPort,
  p2r,
  f2r,
};
