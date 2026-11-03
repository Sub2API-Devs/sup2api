/**
 * plugins/functionHooks/sameThreadHost.ts
 *
 * 2.1.316 新增：不开 worker 时在主线程内运行 hooks 模块的宿主
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (43)
 * attribution: placement 43
 */
import {
  createHostDispatchState,
  bumpPluginEpochs,
  countActingOps,
  scheduleCallTimeout,
} from "./apiDispatch.js";
import {
  DEFAULT_HOOK_TIMEOUT_MS,
  forwardGeneratorWithErrorHook,
  teeGeneratorResult,
  createPausableBudget,
} from "./dispatch/streamChain.js";
import { createHookHostBridge, rejectAllPending } from "./hostBridge.js";
import { runHostOpSameThread, runHostStreamOpSameThread } from "./interfaceCalls.js";
import {
  createSameThreadRejectionHandler,
  unhandledRejectionHandler,
  turnHeldDispatches,
  rootEventDispatches,
  isPersonGestureEvent,
  callerPluginOf,
  submittedAttachmentIds,
  cloneOrThrow,
  emptyToolCallResult,
} from "./hooksWorkerHost.js";
import { getCwd } from "../../utils/cwd.js";
import {
  toolNameOfCall,
  notLoadedWithinText,
  HOOKS_READY_TIMEOUT_MS,
  copyRegistrations,
  forgetRegisteredAgent,
  pluginOptionsSnapshot,
} from "./hooksModuleLoader.js";
import { currentScope, endScope, getAsyncStoreS61 } from "./dispatch/dispatchScope.js";
import { serializeMatcherList, filterEntriesToNullProto } from "../../utils/hooks/functionHookMatchers.js";
import { HooksError, AskRefusedError, PlainDataError } from "./hooksErrors.js";
import { envUnloadedAbortText, hookTimeoutText } from "./hookDispatch.js";
import { dropEnvPresses, notePressDispatch, pressContextStore, markPressAnswered } from "./ui/pressFill.js";
import { envSiteRuleFor, hasToolSite } from "./sites/siteRules.js";
import { checkElementProps } from "./ui/elements.js";
import { apiMethodLabel, NEXT_NOT_CLONEABLE } from "./hooksWorkerClient.js";
import { releaseWaitingCalls, forgetCachedDescribe, onHookReleased } from "./commandApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { clone } from "../../utils/slowOperations.js";
import { createHooksEnvironment } from "./vm/moduleLoader.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { SLOW_HOOK_REPORT_INTERVAL_MS_2 } from "./dispatch/slowHookReports.js";
import {
  setRenderInterfaces,
  setRenderPlugins,
} from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { CJt } from "../../../vendor/lodash-es/uniqBy.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { forgetMcpServerFor } from "./mcpServerHooks.js";
import { forgetMcpConnectsFor } from "./mcpApi.js";
import { forgetSessionStartCall } from "./promptApi.js";
import { uiStatusOp } from "./sessionApi.js";
import { closePluginPanes } from "./panes.js";
import { stateAtomKey, CORE_ORIGIN } from "./eventPatterns.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { nextToLabel } from "./dispatch/chain.js";
import { coreInterfaceTable_2 } from "./api/agentToolOps.js";
import { STAMP_CALLER_STACK_START, STAMP_ENVIRONMENT_SLOT } from "./vm/vmGlobals.js";
import { invalidateToolDescriptions_2, redescribeTools } from "../../services/api/toolDescriptionCache.js";
import { forget } from "./toolCallHooks.js";
import {
  invalidatePromptSections,
  invalidatePromptContext,
  invalidateHookedPromptContext,
} from "./promptComposition.js";
import { invalidatePromptAttachments } from "./promptAttachmentHooks.js";
import { invalidateAll } from "./ui/renderInstances.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { onConfigHookReleased } from "./configApi.js";

//@ chunk-e6aww6q8.js:4037205-4041759 placement
/**
 * 在主线程内（不开 worker）运行 hooks 模块：实现 next()、next.to()、结果与流式块的传递。
 */
function createSameThreadHost(e, n) {
  let { kind, copy, answer, createEnvironment } = n;
  let hostDispatchState = createHostDispatchState();
  let w = kind === "same-thread";
  let L = w ? DEFAULT_HOOK_TIMEOUT_MS : Number.POSITIVE_INFINITY;
  let hookHostBridge = createHookHostBridge({
    hostOps: (we) =>
      runHostOpSameThread(
        {
          host: e,
          state: hostDispatchState,
          copy,
        },
        we,
      ),
    hostStreamOps: (we) =>
      runHostStreamOpSameThread(
        {
          host: e,
          state: hostDispatchState,
          copy,
        },
        we,
      ),
    createEnvironment,
    servedBudgetMs: L,
  });
  let sameThreadRejectionHandler = createSameThreadRejectionHandler(hookHostBridge);
  unhandledRejectionHandler();
  let Z = (we) => hostDispatchState.names.get(we);
  function Se(id, Ee, signal) {
    bumpPluginEpochs(hostDispatchState.work, Ee.environments);
    hostDispatchState.dispatches.set(id, {
      event: Ee.event,
      payload: Ee.payload,
      environments: Ee.environments,
      origin: Ee.hookOrigin,
      signal,
      cwd: getCwd(),
      turnHeld: turnHeldDispatches(e, Ee),
      rootEvent: rootEventDispatches(e, Ee),
      isPersonInput: isPersonGestureEvent(Ee.event, Ee.payload),
      gestureAt: Ee.gestureAt,
      pressOwner: callerPluginOf(Ee.event, Ee.payload),
      listedMedia: submittedAttachmentIds(Ee.event, Ee.payload),
      tool: toolNameOfCall(Ee.event, Ee.payload),
      scope: currentScope(),
    });
  }
  async function ke(we, Ee, Ae) {
    let Ie = ++hostDispatchState.dispatchCounter;
    Se(Ie, we, Ee);
    try {
      return await hookHostBridge.within(Ie, we.event, Ae);
    } finally {
      endScope(hostDispatchState.dispatches.get(Ie));
      hostDispatchState.dispatches.delete(Ie);
    }
  }
  return {
    kind,
    get died() {
      return hostDispatchState.died;
    },
    nextDispatchId: () => ++hostDispatchState.dispatchCounter,
    inFlight: () => hostDispatchState.dispatches.values(),
    workInFlight: (we) => countActingOps(hostDispatchState.work, hostDispatchState.dispatches.values(), we),
    nameOf: Z,
    async load(we, Ee) {
      let deferred = Promise.withResolvers();
      hostDispatchState.pendingLoads.set(we, deferred);
      let Ie = scheduleCallTimeout(
        hostDispatchState.pendingLoads,
        we,
        notLoadedWithinText(Ee.pluginName, HOOKS_READY_TIMEOUT_MS),
      );
      let Me;
      try {
        Me = await Promise.race([hookHostBridge.load(we, Ee), deferred.promise]);
      } catch (error) {
        hookHostBridge.unload(we);
        throw error;
      } finally {
        clearTimeout(Ie);
        hostDispatchState.pendingLoads.delete(we);
      }
      let registered;
      try {
        registered = copyRegistrations(serializeMatcherList(Me.registered), Ee.pluginName);
      } catch (error) {
        hookHostBridge.unload(we);
        throw error;
      }
      hostDispatchState.names.set(we, Ee.pluginName);
      return {
        registered,
      };
    },
    unload(we) {
      let Ee = new HooksError(envUnloadedAbortText(Z(we) ?? `environment ${we}`));
      for (let Ae of hostDispatchState.opControllers.get(we) ?? []) Ae.abort(Ee);
      hostDispatchState.opControllers.delete(we);
      hostDispatchState.work.delete(we);
      hostDispatchState.names.delete(we);
      dropEnvPresses(hostDispatchState.keptPresses, we);
      hookHostBridge.unload(we);
    },
    async dispatch(we, Ee, Ae) {
      Se(we.id, we, Ae);
      let Ie = async (Me, We, ze) =>
        answer(we.event, await Ee(copy(Me, "next() argument"), We, copy(ze, "next.to() floors")));
      try {
        let Me = await hookHostBridge.dispatch(we, Ie, Ae);
        return {
          ...Me,
          result: copy(Me.result, "result"),
        };
      } finally {
        hostDispatchState.dispatches.delete(we.id);
      }
    },
    dispatchStream(we, Ee, Ae) {
      Se(we.id, we, Ae);
      let Ie = (We, ze, lt) =>
        forwardGeneratorWithErrorHook(Ee(copy(We, "next() argument"), ze, copy(lt, "next.to() floors")));
      let Me = hookHostBridge.dispatchStream(we, Ie, Ae);
      return teeGeneratorResult(async function* () {
        try {
          while (true) {
            let We = await Me.next();
            if (We.done === true) return copy(We.value, "result");
            yield copy(We.value, "chunk");
          }
        } finally {
          await Me.return(undefined);
          hostDispatchState.dispatches.delete(we.id);
        }
      });
    },
    linkStreams(we, Ee) {
      async function Ae(payload, signal, We) {
        let ze = ++hostDispatchState.dispatchCounter;
        Se(
          ze,
          {
            ...Ee,
            payload,
            environments: [we],
          },
          signal,
        );
        let lt;
        try {
          lt = await hookHostBridge.within(ze, Ee.event, async () => We());
        } catch (error) {
          hostDispatchState.dispatches.delete(ze);
          throw error;
        }
        return (async function* () {
          try {
            return yield* hookHostBridge.withinSteps(ze, lt);
          } finally {
            hostDispatchState.dispatches.delete(ze);
          }
        })();
      }
      return hookHostBridge
        .linkStreams({
          environmentId: we,
          event: Ee.event,
          leftOut: Ee.leftOut,
        })
        .map((Ie) => {
          let Me = Ie.catch;
          return {
            ...Ie,
            run: (payload, ze, lt) => Ae(payload, ze.signal, () => Ie.run(payload, ze, lt)),
            ...(Me !== undefined && {
              catch: (payload, ze, lt) => Ae(payload, ze.signal, () => Me(payload, ze, lt)),
            }),
          };
        });
    },
    link(we, Ee) {
      let Ae = hookHostBridge.link({
        environmentId: we,
        event: Ee.event,
        leftOut: Ee.leftOut,
      });
      let Ie = (payload) => ({
        ...Ee,
        payload,
        environments: [we],
      });
      let Me = Ae.catch;
      let We = envSiteRuleFor(Ee.event);
      async function ze(payload, signal, nt) {
        let pt;
        await ke(Ie(payload), signal, async () => {
          pt = await nt();
          return checkElementProps(pt).length > 0 && We.check?.(pt, payload, []) !== undefined
            ? undefined
            : pt;
        });
        return pt;
      }
      return {
        ...Ae,
        run: (lt, Je, nt) => ze(lt, Je.signal, () => Ae.run(lt, Je, nt)),
        ...(Me !== undefined && {
          catch: (lt, Je) => ze(lt, Je.signal, () => Me(lt, Je)),
        }),
      };
    },
    resolveTables: (we, Ee) => hookHostBridge.resolveTables(we, Ee),
    build(we, Ee, Ae) {
      hookHostBridge.build(we, Ee, Ae);
      return Promise.resolve();
    },
    callInterface(we, { owner, name: Ae, method, args }, We) {
      let ze = ++hostDispatchState.callCounter;
      let callers = We?.callers ?? [];
      let asked = apiMethodLabel({
        name: Ae,
        method,
      });
      let nt = hookTimeoutText(asked, Z(we) ?? owner, L);
      let pt = w ? createPausableBudget(L, nt) : undefined;
      hostDispatchState.servedCalls.set(ze, {
        callee: we,
        callers,
        lent: We?.lent ?? [],
        facts: We?.facts,
        scope: currentScope(),
      });
      let Et = Promise.resolve()
        .then(() => copy(args, `${asked} arguments`))
        .then((args) =>
          hookHostBridge.callInterface(
            we,
            {
              owner,
              name: Ae,
              method,
              args,
            },
            {
              callId: ze,
              callers,
            },
          ),
        )
        .then((yt) => copy(yt, `${asked} result`));
      return (
        pt
          ? Promise.race([
              Et,
              pt.expired.catch(() => {
                throw new AskRefusedError(nt, asked);
              }),
            ])
          : Et
      ).finally(() => {
        pt?.clear();
        endScope(hostDispatchState.servedCalls.get(ze));
        hostDispatchState.servedCalls.delete(ze);
      });
    },
    press(environmentId, handle, Ae) {
      let Ie = {
        environmentId,
        gestureAt: getAsyncStoreS61(),
      };
      let Me = {
        handle,
        sent: ++hostDispatchState.pressCounter,
      };
      hostDispatchState.sentPresses.add(Ie);
      notePressDispatch(hostDispatchState.keptPresses, Me.sent, environmentId);
      return Promise.resolve()
        .then(() => copy(Ae, "ui.press argument"))
        .then((We) => pressContextStore.run(undefined, () => hookHostBridge.press(environmentId, Me, We)))
        .finally(() => {
          hostDispatchState.sentPresses.delete(Ie);
          markPressAnswered(hostDispatchState.keptPresses, Me.sent);
        });
    },
    releasePresses: (we, Ee) => {
      hookHostBridge.releasePresses(we, Ee);
    },
    opsDelivered: () => Promise.resolve(),
    terminate() {
      hostDispatchState.died = `the ${kind} runtime was replaced`;
      sameThreadRejectionHandler();
      for (let key of hostDispatchState.names.keys()) {
        e.state.replacedEnvironments.add(key);
        releaseWaitingCalls(e.state.sentCalls, key);
      }
    },
  };
}
//@ chunk-e6aww6q8.js:4041759-4041983 placement
/**
 * 在主线程创建 hooks 沙箱宿主（不使用 worker），结果需可克隆。
 */
var createSameThreadEnvironmentHost = (e) => {
  logForDebugging("hooks sandbox made on this thread (no worker)");
  return createSameThreadHost(e, {
    kind: "same-thread",
    copy: cloneOrThrow,
    answer(n, r) {
      try {
        return clone(r);
      } catch (error) {
        let h = emptyToolCallResult(n, r);
        if (h === undefined) throw new HooksError(NEXT_NOT_CLONEABLE(error));
        return h;
      }
    },
    createEnvironment: createHooksEnvironment,
  });
};
//@ chunk-e6aww6q8.js:4041983-4042127 placement
function endOpStreams(e, n) {
  let r = n === undefined ? "" : `${n}:`;
  for (let [s, h] of e.opStreams)
    if (s.startsWith(r)) {
      h.end();
      h.stream.return(undefined).catch(() => {
        return;
      });
    }
}
//@ chunk-e6aww6q8.js:4042127-4042282 placement
/**
 * 中止某环境所有进行中的宿主操作并关闭其流（环境卸载时）。
 */
function abortEnvironmentOps(e, n, r) {
  for (let [s, h] of e.opControllers)
    if (s.startsWith(`${n}:`)) {
      e.opControllers.delete(s);
      h.abort(new HooksError(envUnloadedAbortText(r ?? `environment ${n}`)));
    }
  endOpStreams(e, n);
}
//@ chunk-e6aww6q8.js:4042282-4042365 placement
/**
 * 停掉心跳并清状态
 */
function stopHeartbeat(e) {
  clearInterval(e.heartbeat);
  e.heartbeat = undefined;
  e.awaitingPong = undefined;
}
//@ chunk-e6aww6q8.js:4042365-4042594 placement
/**
 * 宿主是否完全空闲（无欠的 pong、无进行中分发/调用/按键/解析/加载/构建/flush）。
 */
function isHostIdle(e) {
  return (
    e.awaitingPong?.isOwed !== true &&
    e.inFlight.size === 0 &&
    e.pendingCalls.size === 0 &&
    e.pendingPresses.size === 0 &&
    e.pendingResolves.size === 0 &&
    e.pendingLoads.size === 0 &&
    e.pendingBuilds.size === 0 &&
    e.pendingFlushes.size === 0
  );
}
//@ chunk-e6aww6q8.js:4042594-4042869 placement
/**
 * 向 hooks worker 发送一帧（worker 已死则丢弃并记日志），next_* 帧计入该分发的已应答数。
 */
function postToWorker(e, n) {
  if (e.died !== undefined) {
    logForDebugging(`hooks worker: ${n.type} frame not sent (${e.died})`, {
      level: "verbose",
    });
    return;
  }
  e.worker.postMessage(n);
  let s =
    n.type === "next_result" || n.type === "next_error" || n.type === "next_step"
      ? e.inFlight.get(n.id)
      : undefined;
  if (s !== undefined) s.answersSent += 1;
}
//@ chunk-e6aww6q8.js:4042869-4042960 placement
/**
 * 累计等待时长
 */
function addWaitedTime(e, n, r) {
  let max = Math.max(n, e.waitedUntil);
  if (r > max) {
    e.waitedMs += r - max;
    e.waitedUntil = r;
  }
}
//@ chunk-e6aww6q8.js:4042960-4043062 placement
/**
 * 补发错过的心跳。
 */
function catchUpHeartbeat(e, n) {
  let r = e.beatAt + e.heartbeatMs;
  if (e.heartbeat !== undefined && n - r >= e.heartbeatMs) addWaitedTime(e, r, n);
}
//@ chunk-e6aww6q8.js:4043062-4043613 placement
/**
 * 生成 worker 重生遥测字段：原因、证据、所处阶段、worker 年龄、未回心跳数、欠的分发/加载/构建、死亡与罢工次数。
 */
function workerCrashTelemetry(e, cause, r) {
  let { awaitingPong, host, inFlight, pendingBuilds, pendingLoads } = e;
  let now = Date.now();
  let G = r !== "none";
  let found = [
    ["loading", pendingLoads.size > 0],
    ["building", pendingBuilds.size > 0],
    ["dispatching", inFlight.size > 0],
    ["answering", !isHostIdle(e)],
  ].find(([, Z]) => Z);
  return {
    cause: fromEnum(cause),
    evidence: fromEnum(r),
    phase: fromEnum(found?.[0] ?? "idle"),
    worker_age_s: Math.max(0, Math.floor((now - e.spawnedAt) / SLOW_HOOK_REPORT_INTERVAL_MS_2)),
    unanswered_beats: awaitingPong?.unansweredBeats ?? 0,
    ping_age_ms: Math.max(0, now - (awaitingPong?.sentAt ?? now)),
    owed_dispatches: inFlight.size,
    owed_loads: pendingLoads.size,
    owed_builds: pendingBuilds.size,
    deaths: host.state.workerDeaths,
    strikes: host.state.unattributedCrashes + (G ? 0 : 1),
  };
}
//@ chunk-e6aww6q8.js:4043613-4044287 placement
/**
 * 扣留表：记录各 $ 名词被哪些插件扣留（按顺序），支持 withhold/lift/end，refuser 求拒绝者，suppressed 给出当前被压制的名词。
 */
function createWithholdingTable({ table, endedBy, order }) {
  let s = new Map();
  let h = endedBy;
  for (let [key, value] of Object.entries(table))
    if (value.withheldBy !== undefined) s.set(key, [...value.withheldBy]);
  let y = (S) => order.indexOf(S);
  return {
    withhold: (S, w) => {
      let L = s.get(S) ?? [];
      if (L.includes(w)) return;
      let index = L.findIndex((Z) => y(Z) < y(w));
      let q = index === -1;
      s.set(S, q ? [...L, w] : [...L.slice(0, index), w, ...L.slice(index)]);
    },
    end: (S) => {
      h ??= S;
    },
    lift: (S) => {
      for (let [w, L] of s) {
        let filtered = L.filter((Z) => Z !== S);
        if (filtered.length === 0) s.delete(w);
        else s.set(w, filtered);
      }
      h = h === S ? undefined : h;
    },
    withholders: (S) => s.get(S) ?? [],
    endedBy: () => h,
    refuser: (S, w) => (s.get(w) ?? []).filter((L) => L !== S).at(-1),
    suppressed: () => {
      let S = {};
      for (let [w, L] of s) {
        let last = L.at(-1);
        if (last !== undefined) S[w] = last;
      }
      return h === undefined
        ? S
        : {
            "*": h,
            ...S,
          };
    },
  };
}
//@ chunk-e6aww6q8.js:4044287-4044404 placement
/**
 * 从接口描述的 withheldBy 中去掉指定插件。
 */
function dropWithholders(e, n) {
  let { withheldBy, ...s } = e;
  let h = withheldBy?.filter((y) => !n.has(y)) ?? [];
  return h.length === 0
    ? s
    : {
        ...s,
        withheldBy: h,
      };
}
//@ chunk-e6aww6q8.js:4044404-4044601 placement
/**
 * 重置宿主的上次折叠表、结束者、所有者与扣留状态。
 */
function resetWithholdings(state) {
  state.isSetRecord = false;
  state.lastTable = {};
  state.lastEndedBy = undefined;
  state.lastOwners = {};
  state.crashedWithholders.clear();
  state.withholdings.clear();
  state.withheld = createWithholdingTable({
    table: {},
    order: [],
  });
  state.refusalsLogged.clear();
}
//@ chunk-e6aww6q8.js:4044601-4044766 placement
function forgetChangedRefusals(e, n, r) {
  for (let key of Object.keys(n))
    if (!Object.hasOwn(r, key) || r[key] !== n[key]) {
      for (let h of e.refusalsLogged) if (h.endsWith(`:${key}`)) e.refusalsLogged.delete(h);
    }
}
//@ chunk-e6aww6q8.js:4044766-4045016 placement
var publishRenderInterfaces = (e) =>
  setRenderInterfaces([
    ...Object.entries(e.lastTable)
      .filter(([, { withheldBy: n }]) => n === undefined)
      .map(([key, { owner: r, methods: s }]) => ({
        name: key,
        owner: r,
        methods: [...s],
      })),
    ...Object.entries(e.withheld.suppressed()).map(([key, value]) => ({
      name: key,
      methods: [],
      suppressedBy: value,
    })),
  ]);
//@ chunk-e6aww6q8.js:4045016-4045226 placement
/**
 * 记录一次 engine.create 折叠结果（表、结束者、所有者），重建扣留表并发布渲染接口。
 */
function recordFoldResult(e, n) {
  let r = e.withheld.suppressed();
  e.lastTable = n.table;
  e.lastEndedBy = n.endedBy;
  e.lastOwners = n.owners;
  e.withheld = createWithholdingTable({
    table: n.table,
    endedBy: n.endedBy,
    order: [],
  });
  forgetChangedRefusals(e, r, e.withheld.suppressed());
  publishRenderInterfaces(e);
}
//@ chunk-e6aww6q8.js:4045226-4045271 placement
/**
 * 某插件扣留的 $ 名词
 */
function withheldNounsByPlugin(e) {
  return e && e.length ? CJt(e) : [];
}
//@ chunk-e6aww6q8.js:4045271-4045283 placement
/**
 * 同上别名
 */
var withheldNounsAlias = withheldNounsByPlugin;
//@ chunk-e6aww6q8.js:4045283-4045427 placement
/**
 * 列出某插件当前扣留的 $ 名词（折叠表中与额外记录）。
 */
var withheldNounsOf = (state, n) =>
  withheldNounsAlias([
    ...Object.entries(state.lastTable)
      .filter(([, { withheldBy: r }]) => r?.includes(n) === true)
      .map(([key]) => key),
    ...(state.withholdings.get(n) ?? []),
  ]);
//@ chunk-e6aww6q8.js:4045427-4046096 placement
function reportWorkerCrashWithholdings(state, n) {
  let r = state.withheld.suppressed();
  for (let h of n) {
    let y = withheldNounsOf(state, h);
    let S = state.crashedWithholders.get(h);
    if (y.length > 0 && S === undefined)
      logForDebugging(
        `hooks worker: ${h} was unloaded for the crash; what it withheld (${y.map((w) => `$.${w}`).join(", ")}) stays withheld until ${h} reloads or is disabled`,
        {
          level: "warn",
        },
      );
    if (y.length > 0 || S !== undefined) state.crashedWithholders.set(h, new Set([...(S ?? []), ...y]));
  }
  state.lastTable = filterEntriesToNullProto(state.lastTable, (h) => !n.has(h.owner));
  let s = state.lastEndedBy !== undefined && n.has(state.lastEndedBy);
  state.lastEndedBy = s ? undefined : state.lastEndedBy;
  state.lastOwners = filterEntriesToNullProto(state.lastOwners, (h) => !n.has(h));
  state.withheld = createWithholdingTable({
    table: state.lastTable,
    endedBy: state.lastEndedBy,
    order: [],
  });
  forgetChangedRefusals(state, r, state.withheld.suppressed());
  publishRenderInterfaces(state);
}
//@ chunk-e6aww6q8.js:4046096-4046518 placement
/**
 * 解除一组插件的扣留与所有权（卸载或拒绝时），更新折叠表并发布。
 */
function liftWithholdings(state, n) {
  let r = state.withheld.suppressed();
  for (let h of n) {
    state.crashedWithholders.delete(h);
    state.withholdings.delete(h);
  }
  state.lastTable = xr(
    filterEntriesToNullProto(state.lastTable, (h) => !n.has(h.owner)),
    (h) => dropWithholders(h, n),
  );
  let s = state.lastEndedBy !== undefined && n.has(state.lastEndedBy);
  state.lastEndedBy = s ? undefined : state.lastEndedBy;
  state.lastOwners = filterEntriesToNullProto(state.lastOwners, (h) => !n.has(h));
  state.withheld = createWithholdingTable({
    table: state.lastTable,
    endedBy: state.lastEndedBy,
    order: [],
  });
  forgetChangedRefusals(state, r, state.withheld.suppressed());
  publishRenderInterfaces(state);
}
//@ chunk-e6aww6q8.js:4046518-4046628 placement
var envCallsOf = (scan) => [
  ...(scan.env?.reads ?? []).map((n) => `env.get:${n}`),
  ...(scan.env?.writes ?? []).map((n) => `env.set:${n}`),
];
//@ chunk-e6aww6q8.js:4046628-4046701 placement
/**
 * 崩溃或仍有扣留
 */
var isCrashedOrWithholding = (e, n) =>
  n.state.crashedWithholders.has(e) || withheldNounsOf(n.state, e).length > 0;
//@ chunk-e6aww6q8.js:4046701-4046781 placement
/**
 * 追加插件名
 */
function withPluginName(e, n) {
  let r = [...e.knownArgs.keys()];
  return r.includes(n) ? r : [...r, n];
}
//@ chunk-e6aww6q8.js:4046781-4046862 placement
/**
 * 递增代次
 */
function bumpGeneration(pluginName, n) {
  let state = n.state;
  state.generations.set(pluginName, (state.generations.get(pluginName) ?? 0) + 1);
}
//@ chunk-e6aww6q8.js:4046862-4046901 placement
/**
 * 已知参数列表
 */
var knownArgList = (state) => [...state.knownArgs.values()];
//@ chunk-e6aww6q8.js:4046901-4047365 placement
/**
 * 宿主遗忘一个插件：清理已知参数、MCP、命令、代理、状态、面板等登记；非密封插件记录"模块未加载"的选项失败。
 */
function forgetPlugin(e, n) {
  let state = n.state;
  let s = state.knownArgs.get(e)?.sealed === true;
  let h = s ? undefined : state.knownPlugins.get(e);
  if (s) state.knownPlugins.delete(e);
  state.knownArgs.delete(e);
  forgetMcpServerFor(e);
  forgetMcpConnectsFor(e);
  forgetCachedDescribe(e);
  forgetRegisteredAgent(e);
  forgetSessionStartCall(e);
  state.generations.delete(e);
  state.unloadedSteps.delete(e);
  uiStatusOp(undefined, e);
  closePluginPanes(e);
  if (h === undefined) state.optionsReloadFailures.delete(e);
  else if (!state.optionsReloadFailures.has(e))
    state.optionsReloadFailures.set(e, {
      generation: undefined,
      wanted: pluginOptionsSnapshot(h).text,
      error: new HooksError(`${e}: its hooks module is not loaded`),
    });
}
//@ chunk-e6aww6q8.js:4047365-4047448 placement
/**
 * 记录插件参数
 */
function setKnownArgs(state, n) {
  state.knownArgs.delete(n.pluginName);
  state.knownArgs.set(n.pluginName, n);
}
//@ chunk-e6aww6q8.js:4047448-4047728 placement
/**
 * 按新折叠表更新各名词的扣留记录。
 */
function updateWithholdingRecords(state, n, r) {
  for (let s of r) {
    let filtered = [...(state.withholdings.get(s) ?? [])].filter((w) => !Object.hasOwn(n, w));
    let mapped = Object.entries(n)
      .filter(([, { withheldBy: w }]) => w?.includes(s) === true)
      .map(([key]) => key);
    if (filtered.length + mapped.length === 0) state.withholdings.delete(s);
    else state.withholdings.set(s, new Set([...filtered, ...mapped]));
  }
}
//@ chunk-e6aww6q8.js:4047728-4047864 placement
function stateCallsOf(scan) {
  let n = (r, s = []) => s.map((h) => `${r}:${stateAtomKey(h)}`);
  return [...n("state.get", scan.state?.reads), ...n("state.set", scan.state?.writes)];
}
//@ chunk-e6aww6q8.js:4047864-4048114 placement
/**
 * 把已加载模块的名字、层级、事件、调用（含 next.to、env、state）与代号发布给渲染层。
 */
var publishRenderPlugins = (e) =>
  setRenderPlugins(
    getPluginRegistry().loadedModules.map((loadedModule) => ({
      name: loadedModule.name,
      tier: loadedModule.tier,
      events: [...loadedModule.patterns],
      calls: [
        ...loadedModule.args.scan.calls,
        ...(loadedModule.args.scan.nextTo ?? []).map(nextToLabel),
        ...envCallsOf(loadedModule.args.scan),
        ...stateCallsOf(loadedModule.args.scan),
      ],
      generation: e.state.generations.get(loadedModule.name) ?? 0,
    })),
  );
//@ chunk-e6aww6q8.js:4048114-4048558 placement
/**
 * 重新折叠时的基线：核心方法表加上次折叠表中除去指定插件后的部分。
 */
function foldBaseWithout_2(e, n, order) {
  let s = new Map();
  for (let [key, value] of Object.entries(coreInterfaceTable_2())) {
    let G = Object.hasOwn(e.lastTable, key) ? e.lastTable[key] : undefined;
    s.set(key, G ? dropWithholders(G, n) : value);
  }
  for (let [key, value] of Object.entries(e.lastTable)) {
    let G = dropWithholders(value, n);
    if (!n.has(value.owner) || G.withheldBy) s.set(key, G);
  }
  let h = {};
  for (let [key, value] of Object.entries(e.lastOwners)) if (!n.has(value)) h[key] = value;
  let lastEndedBy = e.lastEndedBy;
  let S = lastEndedBy !== undefined && !n.has(lastEndedBy);
  return {
    beneath: Object.fromEntries(s),
    endedBy: S ? lastEndedBy : undefined,
    owned: h,
    order,
  };
}
//@ chunk-e6aww6q8.js:4048558-4048602 placement
/**
 * 去掉该插件的折叠基线
 */
var foldBaseWithout = (state, n) => foldBaseWithout_2(state, new Set([n]), withPluginName(state, n));
//@ chunk-e6aww6q8.js:4048602-4048847 placement
/**
 * 记录重新折叠的结果，并找出未知插件的所有权。
 */
function recordRefoldResult(state, n) {
  recordFoldResult(state, n);
  let r = new Set();
  let s = new Set();
  for (let [, value] of Object.entries(n.table))
    for (let y of [value.owner, ...(value.withheldBy ?? [])])
      if (y !== CORE_ORIGIN && !state.knownArgs.has(y)) (state.crashedWithholders.has(y) ? s : r).add(y);
  if (s.size > 0) reportWorkerCrashWithholdings(state, s);
  if (r.size > 0) liftWithholdings(state, r);
}
//@ chunk-e6aww6q8.js:4048847-4048924 placement
/**
 * 上次折叠摘要
 */
var lastFoldSummary = (state) => ({
  table: state.lastTable,
  endedBy: state.lastEndedBy,
  owners: state.lastOwners,
});
//@ chunk-e6aww6q8.js:4048924-4049231 placement
/**
 * 计算 worker 重生后的折叠基线（去掉扣留者中已不存在的插件）。
 */
function foldBaseForRespawn(e, n) {
  let state = e.state;
  let s = Object.create(null);
  Object.assign(s, coreInterfaceTable_2());
  for (let [key, value] of Object.entries(state.lastTable)) {
    let S = dropWithholders(
      value,
      new Set((value.withheldBy ?? []).filter((L) => !state.crashedWithholders.has(L) || n.includes(L))),
    );
    if (S.withheldBy !== undefined && (value.owner === CORE_ORIGIN || n.includes(value.owner))) s[key] = S;
  }
  return {
    beneath: s,
  };
}
//@ chunk-e6aww6q8.js:4049231-4049424 placement
/**
 * 从共享心跳戳中读出正在执行的插件（调用栈或当前环境）。
 */
function stackedPluginOf(e) {
  let { stamp, names } = e;
  return [
    ...Array.from(
      {
        length: stamp.length - STAMP_CALLER_STACK_START,
      },
      (s, h) => Atomics.load(stamp, STAMP_CALLER_STACK_START + h),
    ),
    Atomics.load(stamp, STAMP_ENVIRONMENT_SLOT),
  ]
    .filter((s) => s !== 0)
    .map((s) => names.get(s))
    .find((s) => s !== undefined);
}
//@ chunk-e6aww6q8.js:4049424-4049526 placement
/**
 * 列出某插件捕获的进行中分发。
 */
var catchingDispatchesOf = (e, plugin) =>
  [...e.inFlight].filter(
    ([, r]) => hasToolSite(r.event) && r.caughtBy.some((s) => e.names.get(s) === plugin),
  );
//@ chunk-e6aww6q8.js:4049526-4049742 placement
/**
 * 关闭某环境的消息端口，结算其待 flush 请求。
 */
function closeEnvironmentPort(e, n) {
  let r = e.ports.get(n);
  for (let [s, h] of e.pendingFlushes)
    if (s.startsWith(`${n}:`)) {
      e.pendingFlushes.delete(s);
      h.resolve();
    }
  e.runningOps.delete(n);
  if (r !== undefined) {
    e.ports.delete(n);
    r.onmessage = null;
    r.close();
  }
}
//@ chunk-e6aww6q8.js:4049742-4050203 placement
/**
 * 标记 worker 已死：中止全部进行中的分发与调用、拒绝所有待处理请求、中止宿主操作并关闭所有端口。
 */
function markWorkerDead(e, n) {
  if (e.died !== undefined) return;
  e.died = n;
  stopHeartbeat(e);
  for (let r of e.inFlight.values()) {
    r.unlink();
    for (let s of r.calls.values()) s.abort(new PlainDataError(n));
    r.reject(new HooksError(n));
  }
  e.inFlight.clear();
  rejectAllPending(e.pendingCalls, n);
  rejectAllPending(e.pendingPresses, n);
  rejectAllPending(e.pendingResolves, n);
  rejectAllPending(e.pendingBuilds, n);
  rejectAllPending(e.pendingLoads, n);
  rejectAllPending(e.pendingFlushes, n);
  for (let opController of e.opControllers.values()) opController.abort(new HooksError(n));
  e.opControllers.clear();
  endOpStreams(e);
  for (let key of [...e.ports.keys()]) closeEnvironmentPort(e, key);
}
//@ chunk-e6aww6q8.js:4050203-4050230 placement
/**
 * 失效工具描述等缓存
 */
function invalidateDescribeCaches() {
  invalidateToolDescriptions_2();
  forget();
}
//@ chunk-e6aww6q8.js:4050230-4050340 placement
/**
 * $.ui.invalidate 可失效的缓存：prompt.section、prompt.context、prompt.attachment、tool.describe。
 */
var UI_INVALIDATORS = {
  "prompt.section": invalidatePromptSections,
  "prompt.context": invalidatePromptContext,
  "prompt.attachment": invalidatePromptAttachments,
  "tool.describe": () => {
    redescribeTools();
    invalidateDescribeCaches();
  },
};
//@ chunk-e6aww6q8.js:4050340-4050417 placement
/**
 * 失效全部钩子相关缓存
 */
function invalidateAllHookedCaches() {
  invalidateAll();
  invalidatePromptSections();
  invalidateHookedPromptContext(hasModuleHookingSite("prompt.context"));
  invalidatePromptAttachments();
  invalidateDescribeCaches();
  onHookReleased();
  onConfigHookReleased();
}
export {
  setKnownArgs,
  invalidateAllHookedCaches,
  publishRenderPlugins,
  forgetPlugin,
  liftWithholdings,
  resetWithholdings,
  bumpGeneration,
  foldBaseForRespawn,
  foldBaseWithout_2,
  isCrashedOrWithholding,
  withheldNounsOf,
  reportWorkerCrashWithholdings,
  foldBaseWithout,
  lastFoldSummary,
  recordRefoldResult,
  UI_INVALIDATORS,
  dropWithholders,
  createWithholdingTable,
  recordFoldResult,
  updateWithholdingRecords,
  knownArgList,
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
};
