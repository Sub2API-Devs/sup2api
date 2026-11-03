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
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
  isDeepStrictEqual as isDeepStrictEqual_5,
  isDeepStrictEqual as isDeepStrictEqual_6,
  isDeepStrictEqual as isDeepStrictEqual_7,
  isDeepStrictEqual as isDeepStrictEqual_8,
  isDeepStrictEqual as isDeepStrictEqual_9,
  isDeepStrictEqual as isDeepStrictEqual_10,
  isDeepStrictEqual as isDeepStrictEqual_11,
  isDeepStrictEqual as isDeepStrictEqual_12,
  isDeepStrictEqual as isDeepStrictEqual_13,
  isDeepStrictEqual as isDeepStrictEqual_14,
  isDeepStrictEqual as isDeepStrictEqual_15,
  isDeepStrictEqual as isDeepStrictEqual_16,
  isDeepStrictEqual as isDeepStrictEqual_17,
  isDeepStrictEqual as isDeepStrictEqual_18,
  isDeepStrictEqual as isDeepStrictEqual_19,
} from "util";
import { createWorkerSlots } from "./hooksWorker.js";
import { r2r, iEt } from "./hooksModuleLoader.js";
import { _Lr } from "./modLoadTelemetry.js";
import { XJ } from "./hostBridge.js";
import { HooksError, Jeo } from "./hooksErrors.js";
import { xUe, Teo, Aeo } from "./api/operations.js";
import { count, uniq } from "../../utils/collections.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { XLe } from "./mcpServerHooks.js";
import { iv } from "./uiHooks.js";
import {
  originKey,
  sameOrigin,
  lentModulesByChain,
  originPlugin,
  pluginStorageKey,
  Ktr,
  apiMethodLabel,
} from "./hooksWorkerClient.js";
import { Pei } from "./ui/pressFill.js";
import { RMi, getCwd } from "../../utils/cwd.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { isModuleAdmitted } from "../../utils/plugins/functionHooks/admission.js";
import { gos } from "./eventPatterns.js";
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
import { AIn } from "./configApi.js";
import { Nae } from "./sites/siteRules.js";
import { httpFetchForPlugin } from "./httpApi.js";
import { isOfficialMarketplacePlugin } from "./panes.js";
import { parsePluginIdentifier_2 } from "../../utils/plugins/pluginIdentifier.js";
import { xYr, mayLogPluginName, getTelemetryPluginScope } from "../../utils/telemetry/pluginTelemetry.js";
import { af } from "../../utils/plugins/pluginPolicy.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { LX, composeDetachedSections } from "./coreHandlers.js";
import { promptComposer } from "./promptComposition.js";
import { attachedSurfaces } from "./surfaceBinding.js";
import { Ayn } from "./dispatch/dispatchScope.js";
import { reportChainFailure, hZr, forwardAbort } from "./dispatch/chain.js";
import { lYr, freeze as freeze_26 } from "../../utils/attachmentMedia.js";
import { readPromptBox, normalizePromptBox, freeze_19 } from "./promptApi.js";
import { judgeHookInput } from "./dispatch/inputJudging.js";
import { errorMessage } from "../../utils/errors.js";
import { isPlainDataObject } from "../../utils/hooks/functionHookMatchers.js";
import { MAX_NESTING_DEPTH, NESTING_TOO_DEEP_MESSAGE } from "../../utils/structuredCloneLimits.js";
import { BPe } from "../../utils/plugins/managedPlugins.js";
import { rle } from "./eventPayloads.js";

//@ chunk-e6aww6q8.js:3709715-3709728 placement
var ZV = createWorkerSlots();
//@ chunk-e6aww6q8.js:3709728-3709819 placement
function XAe(e) {
  (ZV.notifyLoaded(new Set(e.map((n) => n.name))), r2r.get()?.(e), e.forEach(_Lr));
}
//@ chunk-e6aww6q8.js:3709819-3709863 placement
var QAe = (e, n, r) => XJ(e, n)?.reject(new HooksError(r));
//@ chunk-e6aww6q8.js:3709863-3709956 placement
function srt(e) {
  if (e.pendingCalls.delete(e.callId)) (e.settleIdle(), e.reject(new HooksError(e.reason)));
}
//@ chunk-e6aww6q8.js:3709956-3710027 placement
function gNr(e, n, r) {
  let s = setTimeout(QAe, iEt, e, n, r);
  return (s.unref(), s);
}
//@ chunk-e6aww6q8.js:3710027-3710055 placement
function yNr(e) {
  e.unref?.();
}
//@ chunk-e6aww6q8.js:3710055-3710144 placement
function irt(e, n) {
  for (let r of n) {
    let s = e.get(r) ?? { ops: 0, epoch: 0 };
    (e.set(r, s), (s.epoch += 1));
  }
}
/**
 * 为插件记一次进行中的操作（时钟类不计数）并递增 epoch，返回结束回调。
 */
//@ chunk-e6aww6q8.js:3710144-3710273 placement
function trackPluginOp(e, n, r) {
  let s = xUe(r) ? 0 : 1,
    h = e.get(n) ?? { ops: 0, epoch: 0 };
  return (
    e.set(n, h),
    (h.ops += s),
    (h.epoch += 1),
    () => {
      ((h.ops -= s), (h.epoch += 1));
    }
  );
}
/**
 * 统计匹配插件的进行中操作数与 epoch 总和（含进行中的非时钟分发）。
 */
//@ chunk-e6aww6q8.js:3710273-3710462 placement
function countActingOps(e, n, r) {
  let filtered = [...e].filter(([h]) => r(h));
  return {
    acting:
      filtered.reduce((h, [, y]) => h + y.ops, 0) +
      count([...n], (h) => !xUe(h.event) && h.environments.some(r)),
    epoch: filtered.reduce((h, [, y]) => h + y.epoch, 0),
  };
}
/**
 * 同线程宿主的分发状态：名称表、分发、按键记录、待加载、操作控制器、服务中的调用等。
 */
//@ chunk-e6aww6q8.js:3710462-3710686 placement
var createHostDispatchState = () => ({
  names: new Map(),
  dispatches: new Map(),
  sentPresses: new Set(),
  keptPresses: new Map(),
  pressCounter: 0,
  pendingLoads: new Map(),
  dispatchCounter: 0,
  died: void 0,
  opControllers: new Map(),
  work: new Map(),
  servedCalls: new Map(),
  callCounter: 0,
});
//@ chunk-e6aww6q8.js:3710686-3710743 placement
var iY = (e, n, r) => () => r !== void 0 && n !== void 0 && e.get(n) === r;
/**
 * 判断调用是否来自模型发起的工具调用（无来源链、事件为 tool.call 且是插件工具）。
 */
//@ chunk-e6aww6q8.js:3710743-3710902 placement
function isModelOriginToolCall(e, n) {
  let r = e !== void 0 && (e.origin === void 0 || e.origin.length === 0),
    s = e?.event === "tool.call" ? e.tool : void 0,
    h = s === AGENT || (s !== void 0 && XLe(n, s));
  return r && h;
}
//@ chunk-e6aww6q8.js:3710902-3710972 placement
var txe = (e, n) => iv(e?.event) && e?.pressOwner !== void 0 && e.pressOwner === n;
//@ chunk-e6aww6q8.js:3710972-3711017 placement
var oxe = (e) => e === "ui.render" || e === "ui.focus";
/**
 * 继承调用方的分发事实：仍在分发中时沿用，必要时去掉根事件。
 */
//@ chunk-e6aww6q8.js:3711017-3711220 placement
function inheritDispatchFacts(e, n, r) {
  let s = e?.facts,
    h = s?.isDispatching?.() === !0,
    y = oxe(s?.rootEvent) && e?.callers.at(-1) !== n;
  return h
    ? { ...s, ...(y && { rootEvent: void 0 }), isDispatching: () => r() && s?.isDispatching?.() === !0 }
    : void 0;
}
/**
 * 取某环境最近一次用户手势的时间。
 */
//@ chunk-e6aww6q8.js:3711220-3711356 placement
function latestGestureAt(e, n) {
  let flattened = [...e].filter((s) => s.environmentId === n).flatMap((s) => s.gestureAt ?? []);
  return flattened.length === 0 ? void 0 : Math.max(...flattened);
}
//@ chunk-e6aww6q8.js:3711356-3711430 placement
var dxe = (e) => () => {
  let n = e.isSpawnServed !== !0;
  return ((e.isSpawnServed = !0), n);
};
/**
 * 收集借给被调插件且尚未过期的调用帧（按帧去重）。
 */
//@ chunk-e6aww6q8.js:3711430-3711759 placement
function collectLentFrames(e, n) {
  let now = Date.now(),
    filtered = [...e]
      .filter((y) => y.callee === n)
      .flatMap((y) => y.lent)
      .filter((y) => now < y.until),
    h = new Map();
  for (let y of filtered) {
    let S = originKey(y.frame),
      w = h.get(S) ?? y;
    h.set(S, {
      frame: w.frame,
      until: Math.max(w.until, y.until),
      alike: uniq([...(w.alike ?? []), ...(y.alike ?? []), y.frame]),
    });
  }
  return filtered.length === 0 ? void 0 : { lent: [...h.values()] };
}
//@ chunk-e6aww6q8.js:3711759-3711821 placement
function mxe(e, n) {
  return [...(e ?? []).filter((r) => !sameOrigin(r, n)), n];
}
/**
 * 计算一次钩子调用的调用者链（借用帧、持有关系），并更新链上各模块的借用信息。
 */
//@ chunk-e6aww6q8.js:3711821-3712744 placement
function buildCallerChain(e, { dispatch: dispatch, held: held, registration: registration, served: served }) {
  let now = Date.now(),
    S = registration === void 0 ? served?.lent : void 0,
    w = held && lentModulesByChain().get(held),
    L = held?.filter((Ie, Me) => w?.[Me]?.isLent !== !0 || w[Me].isHeld === !0),
    G = (Ie) => now < Ie.until || L?.includes(Ie.frame) === !0,
    q = S?.filter((Ie) => G(Ie) && originPlugin(Ie.frame) !== e),
    Z = q?.map((Ie) => Ie.frame) ?? dispatch?.origin,
    ke = mxe(
      Z,
      dispatch !== void 0 && registration !== void 0 ? { plugin: e, registration: registration } : e,
    ),
    we =
      q?.map((Ie) => ({
        until: Ie.until,
        isLent: !0,
        isHeld: L?.includes(Ie.frame) === !0,
        alike: Ie.alike,
      })) ?? (Z === void 0 ? Z : lentModulesByChain().get(Z)),
    Ee = S?.reduce((Ie, Me) => Math.max(Ie, Me.until), Number.NEGATIVE_INFINITY),
    Ae = new Map(Z?.map((Ie, Me) => [Ie, we?.[Me]]));
  if (Ee !== void 0 && Number.isFinite(Ee) && now < Ee) Ae.set(e, { until: Ee, isLent: !1, isHeld: !1 });
  if (we !== void 0) {
    let Ie = ke.length - 1;
    lentModulesByChain().set(
      ke,
      ke.map((Me, We) => ({
        until: Ae.get(Me)?.until ?? Number.POSITIVE_INFINITY,
        isLent: We < Ie && Ae.get(Me)?.isLent === !0,
        isHeld: We < Ie && Ae.get(Me)?.isHeld === !0,
        alike: Ae.get(Me)?.alike,
      })),
    );
  }
  return ke;
}
/**
 * 为一次钩子调用构造执行环境（插件身份、可用接口、取消信号）。
 */
//@ chunk-e6aww6q8.js:3712744-3714060 placement
function buildHookEnvironment({ state: state }, n, r) {
  let {
      environmentId: environmentId,
      dispatchId: dispatchId,
      registration: registration,
      serving: serving,
    } = n,
    w = serving === void 0 ? void 0 : state.servedCalls.get(serving),
    L = dispatchId === void 0 ? void 0 : state.dispatches.get(dispatchId),
    G = state.names.get(environmentId),
    q = L?.environments.includes(environmentId),
    Z = w?.callee === environmentId,
    Se = registration === void 0,
    ke = Se && q !== !0,
    we = Se && Z,
    Ee = ke || we ? void 0 : L,
    Ae = we ? inheritDispatchFacts(w, environmentId, iY(state.servedCalls, serving, w)) : void 0,
    Ie = we ? Ae : Ee,
    Me = Se && iv(Ie?.rootEvent),
    We = !Se && txe(Ee, G),
    ze = !Se && Ee !== void 0,
    lt = Se ? void 0 : Ee?.listedMedia,
    Je = Se && !we,
    nt = Je ? latestGestureAt(state.sentPresses, environmentId) : void 0,
    pt = We ? Ee?.gestureAt : nt,
    Et = Je ? Pei(state.keptPresses, n.pressing, environmentId) : void 0,
    yt = Ee === void 0 && !Z && n.rootEvent === void 0,
    gt = Z ? w : void 0,
    It = !Se && q === !0 && G !== void 0 && isModelOriginToolCall(L, G) ? L : void 0;
  return {
    plugin: G ?? `environment ${environmentId}`,
    signal: r,
    origin:
      G === void 0
        ? (L?.origin ?? [])
        : buildCallerChain(G, {
            dispatch: Ee,
            held: yt ? void 0 : L?.origin,
            registration: yt ? void 0 : registration,
            served: yt ? collectLentFrames(state.servedCalls.values(), environmentId) : gt,
          }),
    turnHeld: Ie?.turnHeld,
    rootEvent: (Me ? void 0 : Ie?.rootEvent) ?? n.rootEvent,
    ownRoot: n.rootEvent,
    ...(pt !== void 0 && { vouchedPressAt: pt }),
    ...(Et !== void 0 && { answersPress: Et }),
    ...(It !== void 0 && { isModelCallServed: !0, takeServedSpawn: dxe(It) }),
    ...(!Se && Ee?.isPersonInput === !0 && { isPersonInput: !0 }),
    ...(ze && { judging: Ee }),
    ...(lt !== void 0 && { listedMedia: lt }),
    cwd: Ie?.cwd,
    isDispatching: we ? Ae?.isDispatching : iY(state.dispatches, dispatchId, Ee),
    scopeHolder: (q === !0 ? L : void 0) ?? gt,
    environmentId: environmentId,
    ...(Z && { callers: w.callers }),
  };
}
//@ chunk-e6aww6q8.js:3714060-3714110 placement
function aY(e, n) {
  return e.cwd === void 0 ? RMi(n) : n();
}
//@ chunk-e6aww6q8.js:3714110-3714167 placement
function wxe(e) {
  return [...(e.callers ?? []), e.environmentId];
}
//@ chunk-e6aww6q8.js:3714167-3714206 placement
var koe = (e) => e.slice(0, e.indexOf("."));
/**
 * 若插件的 hooks 模块是在已变化的策略下被评判的，返回拒绝错误。
 */
//@ chunk-e6aww6q8.js:3714206-3714476 placement
function policyChangedRefusal(e, n) {
  let r = wxe(e);
  return getPluginRegistry().loadedModules.some(
    (loadedModule) => r.includes(loadedModule.environmentId) && !isModuleAdmitted(loadedModule),
  )
    ? new HooksError(
        `${e.plugin}: $.${n} refused: its hooks module was judged under a policy that has since changed, and is off until it is judged under the one in force`,
      )
    : void 0;
}
/**
 * 被扣留名词的调用遭拒时生成拒绝说明，并对每个插件/名词只记录一次日志。
 */
//@ chunk-e6aww6q8.js:3714476-3714912 placement
function withheldCallRefusal(e, { plugin: plugin, spelling: spelling, by: by }) {
  let h = gos(spelling, by),
    y = `${plugin}:${koe(spelling)}`;
  if (!e.refusalsLogged.has(y)) {
    e.refusalsLogged.add(y);
    let S = e.knownArgs.get(plugin),
      w = S ? pluginStorageKey(S) : plugin;
    logForDebugging(
      `hooks module ${w}: ${h} (withheld at engine.create; the call reached the host past $'s stub: through a table a step captured from next(e), or through a $ built before the withholding); later calls on $.${koe(spelling)} are refused without a line`,
      { level: "warn" },
    );
  }
  return h;
}
//@ chunk-e6aww6q8.js:3714912-3715003 placement
function oIn(e, n, r) {
  for (let [s, h] of e.crashedWithholders) if (s !== n && h.has(r)) return s;
  return;
}
//@ chunk-e6aww6q8.js:3715003-3715272 placement
function findStagedRefusal(e, n, r) {
  let { staged: staged, stagedBefore: stagedBefore, building: building } = e,
    S = n.environmentId !== void 0 && building?.some((w) => w.environmentId === n.environmentId) === !0;
  return (
    (S ? staged?.refuser(n.plugin, r) : void 0) ??
    (S ? stagedBefore?.refuser(n.plugin, r) : void 0) ??
    e.withheld.refuser(n.plugin, r) ??
    oIn(e, n.plugin, r)
  );
}
/**
 * 检查 hooks 模块的静态扫描是否列出了某 $ 调用；未加载或未列出时返回宿主规则说明。
 */
//@ chunk-e6aww6q8.js:3715272-3715572 placement
function scanAllowsCall(e, n) {
  if (!e) return "no hooks module of that name is loaded, so there is no scan to allow it (host rule)";
  let included = e.calls.includes(n),
    s = e.calls.length === 0;
  return included
    ? void 0
    : "its hooks module does not call it (host rule; the scan lists " +
        (s ? "no calls" : e.calls.map((h) => `$.${h}`).join(", ")) +
        ")";
}
//@ chunk-e6aww6q8.js:3715572-3716099 placement
function refuseUnadmittedApiCall(e, { spelling: spelling, caller: caller, isClock: isClock }) {
  let h = e.state.knownArgs.get(caller.plugin),
    y = scanAllowsCall(h?.scan, spelling);
  if (h === void 0 || y !== void 0) throw new HooksError(`${caller.plugin}: $.${spelling} refused: ${y}`);
  let S = findStagedRefusal(e.state, caller, koe(spelling));
  if (S !== void 0)
    throw new HooksError(withheldCallRefusal(e.state, { plugin: caller.plugin, spelling: spelling, by: S }));
  let w = policyChangedRefusal(caller, spelling);
  if (w !== void 0) throw w;
  if (wxe(caller).some((G) => G !== void 0 && e.state.unadmitted.has(G)) && !isClock)
    throw new HooksError(
      `${caller.plugin}: $.${spelling} refused: a hooks module behind the call is not admitted (ops wait for the fold and plugin.register)`,
    );
  return h;
}
//@ chunk-e6aww6q8.js:3716099-3716275 placement = returnValue (1)
async function* returnValue_2(e, n) {
  let r = !1;
  try {
    for (;;) {
      let s = n();
      if (s !== void 0) throw s;
      let h = await e.next();
      if (h.done === !0) return ((r = !0), h.value);
      yield h.value;
    }
  } finally {
    if (!r) await closeGeneratorQuietly(e);
  }
}
/**
 * 判断正在准入的插件列表是否已过期（环境已不在已加载模块中）。
 */
//@ chunk-e6aww6q8.js:3716275-3716501 placement
function staleAdmittingList(e, n) {
  let r = e.admitting ?? [],
    index = r.findIndex((S) => S.environmentId === n.environmentId),
    h = new Set(getPluginRegistry().loadedModules.map((loadedModule) => loadedModule.environmentId));
  return r.slice(0, index + 1).some((S) => !h.has(S.environmentId)) ? e.admitting : void 0;
}
//@ chunk-e6aww6q8.js:3716501-3716552 placement = getErrnoPath (0.778)
function getErrnoPath(e) {
  return { field: "path", at: e.cwd ?? getCwd() };
}
//@ chunk-e6aww6q8.js:3716552-3716604 placement
var GN = (e, n) => n.admitted ?? e.knownArgs.get(n.plugin);
/**
 * 取已加载插件的参数，插件未加载时抛 HooksError。
 */
//@ chunk-e6aww6q8.js:3716604-3716716 placement
function requireLoadedPluginArgs(e, n, r) {
  let s = GN(e, n);
  if (s === void 0) throw new HooksError(`${n.plugin}: ${r}: not a loaded plugin`);
  return s;
}
//@ chunk-e6aww6q8.js:3717961-3718001 placement
var lFr = () => Promise.resolve(Date.now());
//@ chunk-e6aww6q8.js:3718001-3718058 placement
var uFr = (e, n) => sleep(e.ms, n, { ...(n && { abortError: () => Teo(n) }) });
//@ chunk-e6aww6q8.js:3718058-3718180 placement
function checkSleepArgs(e) {
  let n = e?.ms;
  return Aeo(n) ? void 0 : `takes { ms }, a non-negative number of milliseconds (got ${String(n)})`;
}
//@ chunk-e6aww6q8.js:3718180-3718227 placement
var xxe = { check: checkSleepArgs, run: (e, n) => uFr(e, n.signal) };
/**
 * 加载 /config 行句柄（按需导入），供插件读取配置行。
 */
//@ chunk-e6aww6q8.js:3718227-3718367 placement
async function loadConfigRowHandles(e, n) {
  let r = requireBoundSession(e, n),
    { configRowHandles: configRowHandles } = await import("./chunk-7qydycm2.js");
  return configRowHandles(r.toolContext(new AbortController()));
}
//@ chunk-e6aww6q8.js:3720668-3720787 placement
var WITHHELD_RESULT_SUFFIXES = {
  nothing: "",
  started: " started, and a plugin withheld its result",
  ran: " ran, and a plugin withheld its result",
};
/**
 * 对流式 $ 调用经过钩子链（可在钩子重启时等待），最底层调用宿主实现；被拒时按进展状态给出错误。
 */
//@ chunk-e6aww6q8.js:3720787-3721548 placement
function streamHookedApiCall({ event: event, args: args, caller: caller, bottom: bottom }) {
  let h = streamMembersFor(event, caller.origin),
    y = caller.signal ?? new AbortController().signal;
  if (h.length === 0 && bottom) return bottom.stream(args, caller);
  let S = awaitHooksRespawn({ event: event, e: args, origin: caller.origin }, caller.signal);
  if (S !== void 0)
    return AIn(S, () => streamHookedApiCall({ event: event, args: args, caller: caller, bottom: bottom }));
  let w = "nothing",
    L = () => void (w = "started");
  function G(Se) {
    return ((w = "ran"), Se);
  }
  let q =
      bottom &&
      ((Se, ke) => {
        let we = bottom.check?.(Se, caller);
        if (we !== void 0) throw new HooksError(`${event}: ${we} (host check)`);
        let stream = bottom.stream(Se, { ...caller, signal: ke });
        return (async function* () {
          return { value: G(yield* forwardGeneratorWithErrorHook(stream, L)) };
        })();
      }),
    Z = reportStreamChainFailure({
      e: args,
      handlers: h,
      site: Nae(event),
      signal: y,
      origin: hookOriginFromStack(caller.origin),
      bottom: q,
    });
  return (async function* () {
    let Se = yield* forwardGeneratorWithErrorHook(Z);
    if (Se.deny !== void 0)
      throw new HooksError(`${caller.plugin}: $.${event}${WITHHELD_RESULT_SUFFIXES[w]}: ${Se.deny}`);
    return Se.value;
  })();
}
/**
 * 包装 $.agent.spawn：检查输入暂扣，服务模型发起的派生标记 servesModel。
 */
//@ chunk-e6aww6q8.js:4008720-4008893 placement
var wrapAgentSpawnOp = (e) => (n, r) => {
  let s = r.takeServedSpawn?.() === !0,
    h = s ? void 0 : submitHoldRefusal(r, "$.agent.spawn");
  if (h === void 0) return e(n, s ? { ...r, servesModel: !0 } : r);
  return Promise.resolve({ deny: h });
};
/**
 * $.http.fetch 表项：参数为 URL，以插件身份调用 httpFetchForPlugin。
 */
//@ chunk-e6aww6q8.js:4008893-4009099 placement
var HTTP_FETCH_API = (e) => ({
  check: (n) => (typeof n?.url === "string" ? void 0 : "takes a URL"),
  run: async (n, r) => {
    let { pluginName: pluginName, pluginStorageId: pluginStorageId } = requireLoadedPluginArgs(
      e,
      r,
      "http.fetch",
    );
    return httpFetchForPlugin(n, { pluginName: pluginName, pluginStorageId: pluginStorageId }, r.signal);
  },
});
//@ chunk-e6aww6q8.js:4009099-4009198 placement
var bMe = (e) => (n, r) =>
  e(n, r.plugin, { signal: r.signal, cwd: r.cwd, pluginId: r.admitted?.pluginStorageId });
//@ chunk-e6aww6q8.js:4009198-4009271 placement
function aHn(e, n) {
  let r = GN(e, n);
  return r !== void 0 && isOfficialMarketplacePlugin(r.pluginStorageId);
}
//@ chunk-e6aww6q8.js:4009271-4009322 placement
var lHn = (e) => pluginsMatchingEvent("prompt.read", {}).some((n) => n !== e);
//@ chunk-e6aww6q8.js:4009322-4009374 placement
var Rat = (e, n) => (typeof e !== "string" || e === "" ? n : void 0);
/**
 * 生成插件遥测用的名字字段（按市场判断是否可公开插件名）。
 */
//@ chunk-e6aww6q8.js:4009374-4009489 placement
function telemetryNamesForPlugin({ plugin: plugin, admitted: admitted }) {
  let { marketplace: marketplace } = parsePluginIdentifier_2(admitted?.pluginStorageId ?? plugin);
  return xYr(plugin, marketplace, mayLogPluginName(getTelemetryPluginScope(plugin, marketplace, af())));
}
//@ chunk-e6aww6q8.js:4009489-4009573 placement
var Cat = (e, n) => [
  e.plugin,
  { querySource: n, names: telemetryNamesForPlugin(e), hookOrigin: e.origin },
  e.signal,
];
/**
 * 插件 $.prompt.compose：为给定事实组装系统提示，本进程不组装时拒绝。
 */
//@ chunk-e6aww6q8.js:4009573-4010181 placement
var promptComposeForPlugin = {
  check: (e) => (isPlainObject_4(e) ? void 0 : "takes the facts to compose for"),
  run: async (e, n) => {
    let { site: site } = LX,
      s = promptComposer(),
      h = requireBoundSession(n.plugin, "$.prompt.compose"),
      y = await s?.facts(h.tools(), h.model());
    if (y === void 0)
      throw new HooksError(`${n.plugin}: $.prompt.compose: this process composes no system prompt`);
    let S = { ...y, surfaces: attachedSurfaces(), ...e },
      w = site.checkArgument?.(S, S);
    if (w !== void 0) throw new HooksError(`${n.plugin}: $.prompt.compose: ${w}`);
    let L = { keys: site.pinnedKeys ?? [], e: S },
      G = hookMembersFor("prompt.compose", n.origin, { pinned: L });
    return Ayn(n.scopeHolder?.scope, () =>
      reportChainFailure({
        e: S,
        handlers: G,
        site: site,
        signal: n.signal,
        origin: hookOriginFromStack(n.origin),
        bottom: (q) => composeDetachedSections(q, n.origin),
      }),
    );
  },
};
//@ chunk-e6aww6q8.js:4010181-4010254 placement
var Aat = (e, n) => e.listedMedia?.includes(n) === !0 && e.isDispatching?.() === !0;
/**
 * $.prompt.attachment.read 表项：参数 {id, offset?}，只能读当前 prompt.submit 列出的附件。
 */
//@ chunk-e6aww6q8.js:4010254-4010632 placement
var ATTACHMENT_READ_API = {
  check: (e) => {
    let n = e?.offset,
      r = typeof e?.id === "string" && e.id !== "",
      s = n === void 0 || (typeof n === "number" && Number.isSafeInteger(n) && n >= 0);
    return !r
      ? "takes { id } (an attachment's id, from the prompt.submit in flight)"
      : s
        ? void 0
        : `takes offset, a whole number of bytes from 0 (got ${String(n)})`;
  },
  run: async (e, n) => {
    let r = Aat(n, e.id) ? await lYr.read(e) : freeze_26;
    return Aat(n, e.id) ? r : freeze_26;
  },
};
//@ chunk-e6aww6q8.js:4010632-4010672 placement
var TMe = { run: async (e, n) => readPromptBox(n.plugin) };
//@ chunk-e6aww6q8.js:4010672-4010724 placement
var vMe = "submit from a later event (turn.complete)";
//@ chunk-e6aww6q8.js:4010724-4010815 placement
var EMe = (e, n) => `called from a ${e} hook, it would wait on the turn this hook ${n}; ${vMe}`;
//@ chunk-e6aww6q8.js:4010815-4010981 placement
function classicHookWaitHazard(e) {
  return e !== void 0 &&
    e.startsWith("classic.") &&
    e !== "classic.SessionStart" &&
    e !== "classic.Setup" &&
    e !== "classic.SessionEnd"
    ? EMe(e, "may be holding")
    : void 0;
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
/**
 * 在会等待当前回合的钩子（prompt.submit、tool.call 等）里调用 submit 时返回说明，提示改用后续事件。
 */
//@ chunk-e6aww6q8.js:4011221-4011456 placement
function submitWaitHazard(e) {
  if (e === "prompt.submit")
    return (
      "called from a prompt.submit hook, it would wait on the turn this hook is holding; answer { text } or next(e) instead, or " +
      vMe
    );
  return e !== void 0 && TURN_HOLDING_EVENTS.includes(e) ? EMe(e, "is holding") : classicHookWaitHazard(e);
}
/**
 * 把输入框内容交给调用 $.prompt.read 的插件；没有插件调用时直接返回 undefined。
 */
//@ chunk-e6aww6q8.js:4011456-4011804 placement
function readPromptBoxForPlugin(e, n, r) {
  let s = scanAllowsCall(n, "prompt.read");
  if (s !== void 0)
    return (
      logForDebugging(`${r} (${e.plugin}): the box goes to plugins that call $.prompt.read; none (${s})`),
      Promise.resolve(void 0)
    );
  return judgeHookInput({
    event: "prompt.read",
    args: {},
    caller: e,
    ...(hZr() === void 0 && { bottom: TMe }),
  })
    .then(normalizePromptBox)
    .catch((h) => {
      logForDebugging(`${r} (${e.plugin}): the box is not answered: ` + errorMessage(h));
      return;
    });
}
//@ chunk-e6aww6q8.js:4011804-4011859 placement
async function d2r(e, n, r) {
  return (await readPromptBoxForPlugin(e, n, r)) ?? freeze_19;
}
//@ chunk-e6aww6q8.js:4011859-4012121 placement
function buildLentCallAsk({ lent: lent, judging: judging, signal: signal }, s, h) {
  let at = lent.at(-1);
  return judging !== void 0 && at !== void 0
    ? {
        maker: Ktr(at.frame),
        isAgain: (judging.origin ?? []).some((w) => Ktr(w) === Ktr(at.frame)),
        judging: judging,
        frame: at.frame,
        chain: [],
        isRepeat: !1,
        callee: s,
        call: h,
        ...(signal !== void 0 && { signal: signal }),
      }
    : void 0;
}
//@ chunk-e6aww6q8.js:4012121-4012206 placement
function SHn(e, n, r) {
  return { ...e, chain: n.map((s) => s.asked.frame), isRepeat: r.length > 0 };
}
//@ chunk-e6aww6q8.js:4012206-4012457 placement
function openCallsInChain({ sentCalls: sentCalls, chainsAbove: chainsAbove }, r) {
  let s = r.judging.origin ?? [],
    h = new Set(
      [...s, ...(lentModulesByChain().get(s) ?? []).flatMap((y) => y.alike ?? [])]
        .filter((y) => typeof y === "object")
        .flatMap((y) => [y, ...(chainsAbove.get(y) ?? [])]),
    );
  return [...sentCalls].filter((y) => h.has(y.asked.frame));
}
//@ chunk-e6aww6q8.js:4012457-4012715 placement
function sendTrackedCall({ sentCalls: sentCalls, chainsAbove: chainsAbove }, r, s) {
  let promise = new Promise((S) => {
      S(s());
    }),
    y = () => void sentCalls.delete(r);
  if ((sentCalls.add(r), typeof r.asked.frame === "object")) chainsAbove.set(r.asked.frame, r.asked.chain);
  return (promise.then(r.waited.resolve, r.waited.reject), r.waited.promise.then(y, y), promise);
}
/**
 * 把调用排到已打开的相同调用之后，等其完成或被要求时再继续。
 */
//@ chunk-e6aww6q8.js:4012715-4013184 placement
function queueBehindOpenCall(e, n, r) {
  let withResolvers = Promise.withResolvers();
  return Promise.race([n.waited.promise, withResolvers.promise])
    .finally(forwardAbort(r.asked.signal, { abort: withResolvers.reject }))
    .then(
      () => (
        r.asked.signal?.throwIfAborted(),
        sendTrackedCall(e, { asked: r.asked, waited: Promise.withResolvers() }, r.send)
      ),
      (h) => {
        if ((h instanceof Jeo && h.asked === apiMethodLabel(n.asked.call)) || r.asked.signal?.aborted === !0)
          throw h;
        if (n.heir !== void 0) return queueBehindOpenCall(e, n.heir, r);
        return (
          (n.heir = { asked: r.asked, waited: Promise.withResolvers() }),
          sendTrackedCall(e, n.heir, r.send)
        );
      },
    );
}
//@ chunk-e6aww6q8.js:4013227-4013322 placement
function vHn(e, n) {
  try {
    return isDeepStrictEqual_14(e, n);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return !1;
  }
}
//@ chunk-e6aww6q8.js:4013365-4013458 placement
var Pat = (e) => Reflect.ownKeys(e).filter((n) => Object.prototype.propertyIsEnumerable.call(e, n));
/**
 * 深比较中的一步：比较一对值并记录已比较过的对象，用于判断两次调用是否相同。
 */
//@ chunk-e6aww6q8.js:4013458-4014051 placement
function compareStep([e, n], r, s) {
  if (!(typeof e === "object" && e !== null && typeof n === "object" && n !== null))
    return ((r.isSame = Object.is(e, n)), r.isSame ? s : void 0);
  if (e === n || r.met.get(e) === n) return s;
  if (!(
    ((Array.isArray(e) && Array.isArray(n) && e.length === n.length) ||
      (isPlainDataObject(e) && isPlainDataObject(n))) &&
    Object.getPrototypeOf(e) === Object.getPrototypeOf(n)
  ))
    return ((r.isSame = vHn(e, n)), r.isSame ? s : void 0);
  let w = Pat(e),
    L = w.length === Pat(n).length && w.every((q) => Object.prototype.propertyIsEnumerable.call(n, q)),
    G = (s?.depth ?? 0) + 1;
  if (!L) {
    r.isSame = !1;
    return;
  }
  if (G > MAX_NESTING_DEPTH) throw new HooksError(NESTING_TOO_DEEP_MESSAGE);
  return (r.met.set(e, n), { first: e, second: n, keys: w, at: 0, depth: G, below: s });
}
//@ chunk-e6aww6q8.js:4014051-4014288 placement
function iterativeDeepEqual(e, n) {
  let r = { met: new Map(), isSame: !0 },
    s = compareStep([e, n], r, void 0);
  while (s !== void 0) {
    let { keys: keys, at: at } = s;
    if (at < keys.length) {
      let S = keys[at] ?? "";
      ((s.at = at + 1), (s = compareStep([Reflect.get(s.first, S), Reflect.get(s.second, S)], r, s)));
    } else s = s.below;
  }
  return r.isSame;
}
/**
 * 深比较两值：先用 isDeepStrictEqual，栈溢出（RangeError）时改用迭代比较。
 */
//@ chunk-e6aww6q8.js:4014288-4014390 placement
function safeDeepEqual(e, n) {
  try {
    return isDeepStrictEqual_15(e, n);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return iterativeDeepEqual(e, n);
  }
}
/**
 * 找出与当前调用完全相同（同发起者、被调者与事件）的仍在进行中的调用。
 */
//@ chunk-e6aww6q8.js:4014390-4014807 placement
function findIdenticalOpenCalls(e, n) {
  try {
    return e.filter(
      ({ asked: asked }) =>
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
    return (
      logForDebugging(
        `${apiMethodLabel(n.call)}: ${n.maker}'s open calls could not be compared (${errorMessage(error)}); sent at once`,
        { level: "error" },
      ),
      []
    );
  }
}
/**
 * 同一插件为同一事件第三次发出相同的开放调用时，让它排在第二次后面（第二次无答复则一起结束）。
 */
//@ chunk-e6aww6q8.js:4014807-4015204 placement
function dedupeRepeatedCall(e, n, r) {
  let s = openCallsInChain(e, n),
    h = findIdenticalOpenCalls(s, n),
    found = h.slice(1).find((w) => w.asked.isRepeat),
    S = SHn(n, s, h);
  if (found === void 0) return sendTrackedCall(e, { asked: S, waited: Promise.withResolvers() }, r);
  return (
    logForDebugging(
      `${apiMethodLabel(n.call)}: ${n.maker} makes the same call again for the same ${n.judging.event}; the third identical open call waits behind the second, and ends with it if the second goes unanswered`,
    ),
    queueBehindOpenCall(e, found, { asked: S, send: r })
  );
}
/**
 * 说明某个 $ 接口当前不可用的原因：提供它的插件未加载、尚未被 plugin.register 接纳、或策略已变。
 */
//@ chunk-e6aww6q8.js:4015204-4016330 placement
function explainApiNotAvailable(
  e,
  { caller: caller, ...r },
  { owner: owner, name: h, method: method, args: args },
) {
  let w = apiMethodLabel({ name: h, method: method }),
    L = e.building ?? [],
    at = r.callers.at(-1),
    any = L.some((ze) => ze.environmentId === at),
    loadedModules = getPluginRegistry().loadedModules,
    found = (any ? [...L, ...loadedModules] : [...loadedModules, ...L]).find((ze) => ze.name === owner);
  if (found === void 0)
    return Promise.reject(new HooksError(`${w}: plugin ${owner}, which provides $.${h}, is not loaded`));
  let found_2 = loadedModules.find((ze) => ze.environmentId === at);
  if (!isModuleAdmitted(found) || (found_2 !== void 0 && !isModuleAdmitted(found_2)))
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
  let startTime = performance.now(),
    Ae = { owner: owner, name: h, method: method, args: args },
    Ie = () => found.callInterface(Ae, r),
    Me = buildLentCallAsk(r, found.environmentId, Ae);
  return (Me !== void 0 ? dedupeRepeatedCall(e, Me, Ie) : Ie()).then(
    (ze) => (
      logForDebugging(
        `${w} (${caller} -> ${owner}) answered in ${(performance.now() - startTime).toFixed(1)}ms`,
      ),
      ze
    ),
    (ze) => {
      throw (
        logForDebugging(`${w} (${caller} -> ${owner}) failed: ${errorMessage(ze)}`, { level: "error" }),
        ze
      );
    },
  );
}
//@ chunk-e6aww6q8.js:4016330-4016365 placement
var MHn = { run: (e, n) => sessionAuthorizeForPlugin(n.plugin) };
//@ chunk-e6aww6q8.js:4016365-4016439 placement
function DHn(e, n) {
  let r = GN(e, n);
  return r !== void 0 && BPe(r.pluginStorageId);
}
//@ chunk-e6aww6q8.js:4016439-4016501 placement
var LHn = (e) => ({ run: async (n, r) => (DHn(e, r) ? sessionIdentity() : identityRefusal(r.plugin)) });
//@ chunk-e6aww6q8.js:4016501-4016554 placement
var l4 = (e, n) => e.knownArgs.get(n)?.pluginStorageId ?? n;
//@ chunk-e6aww6q8.js:4016554-4016646 placement
async function c2r(e, n, r) {
  if (r.deny !== void 0) throw new HooksError(`${e.plugin}: $.${n}: ${r.deny}`);
}
//@ chunk-e6aww6q8.js:4016646-4016942 placement
var createTelemetryOp = (e, n) => async (r, s) => {
  let h = n(r),
    y = Nae(e),
    S = hookMembersFor(e, s.origin, {
      ...(y.pinnedKeys !== void 0 && { pinned: { keys: y.pinnedKeys, e: h } }),
    });
  return S.length === 0
    ? void 0
    : c2r(
        s,
        e,
        await Ayn(s.scopeHolder?.scope, () =>
          reportChainFailure({
            e: h,
            handlers: S,
            site: y,
            signal: s.signal,
            origin: hookOriginFromStack(s.origin),
            bottom: async () => ({ value: void 0 }),
          }),
        ),
      );
};
/**
 * $.telemetry.log 表项：校验 to（anthropic 或 collector）并经钩子链记录。
 */
//@ chunk-e6aww6q8.js:4016942-4017154 placement
var TELEMETRY_LOG_API = {
  check: (e) => {
    let n = isPlainObject_4(e) ? e.to : void 0;
    return isPlainObject_4(e) && (n === void 0 || n === "anthropic" || n === "collector")
      ? void 0
      : 'takes an entry ({ to?, event, ... }, to "anthropic" or "collector")';
  },
  run: createTelemetryOp("telemetry.log", rle),
};
/**
 * $.telemetry.mark 表项：校验条目并经钩子链记录特性标记。
 */
//@ chunk-e6aww6q8.js:4017154-4017274 placement
var TELEMETRY_MARK_API = {
  check: (e) => (isPlainObject_4(e) ? void 0 : "takes an entry ({ feature, kind, reason?, props? })"),
  run: createTelemetryOp("telemetry.mark", (e) => e),
};
//@ chunk-e6aww6q8.js:4017274-4017288 placement
var Fat = 60000;
/**
 * 生成并记录"$.方法: 某文本（N 字符）保留规则"的说明文本。
 */
//@ chunk-e6aww6q8.js:4017288-4017450 placement
function describeTruncation({
  plugin: plugin,
  spelling: spelling,
  what: what,
  name: s,
  length: h,
  kept: kept,
}) {
  let S = `$.${spelling}: ${what}${s === void 0 ? "" : ` of ${s}`} (${h} characters) ${kept}`;
  return (logForDebugging(`${plugin}: ${S}`), S);
}

export {
  safeDeepEqual,
  c2r,
  d2r,
  XAe,
  ZV,
  l4,
  requireLoadedPluginArgs,
  loadConfigRowHandles,
  GN,
  getErrnoPath,
  mxe,
  oxe,
  describeTruncation,
  Cat,
  telemetryNamesForPlugin,
  Rat,
  explainApiNotAvailable,
  MHn,
  LHn,
  submitWaitHazard,
  TMe,
  ATTACHMENT_READ_API,
  readPromptBoxForPlugin,
  lHn,
  promptComposeForPlugin,
  wrapAgentSpawnOp,
  aHn,
  TELEMETRY_LOG_API,
  TELEMETRY_MARK_API,
  Fat,
  lFr,
  xxe,
  HTTP_FETCH_API,
  bMe,
  refuseUnadmittedApiCall,
  staleAdmittingList,
  returnValue_2,
  streamHookedApiCall,
  policyChangedRefusal,
  trackPluginOp,
  buildHookEnvironment,
  aY,
  createHostDispatchState,
  irt,
  countActingOps,
  gNr,
  QAe,
  srt,
  buildCallerChain,
  collectLentFrames,
  inheritDispatchFacts,
  iY,
  txe,
  latestGestureAt,
  isModelOriginToolCall,
  dxe,
  yNr,
};
