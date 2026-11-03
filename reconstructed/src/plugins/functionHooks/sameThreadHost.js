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
import { createHostDispatchState, irt, countActingOps, gNr } from "./apiDispatch.js";
import {
  cEe,
  forwardGeneratorWithErrorHook,
  teeGeneratorResult,
  createPausableBudget,
} from "./dispatch/streamChain.js";
import { createHookHostBridge, EAn } from "./hostBridge.js";
import { runHostOpSameThread, runHostStreamOpSameThread } from "./interfaceCalls.js";
import {
  createSameThreadRejectionHandler,
  res,
  ilt,
  olt,
  isPersonGestureEvent,
  nlt,
  submittedAttachmentIds,
  m9s,
  emptyToolCallResult,
} from "./hooksWorkerHost.js";
import { getCwd } from "../../utils/cwd.js";
import {
  toolNameOfCall,
  N$t,
  iEt,
  copyRegistrations,
  ID,
  pluginOptionsSnapshot,
} from "./hooksModuleLoader.js";
import { KZn, zZn, getAsyncStoreS61 } from "./dispatch/dispatchScope.js";
import { Tos, filterEntriesToNullProto } from "../../utils/hooks/functionHookMatchers.js";
import { HooksError, Jeo, fEe } from "./hooksErrors.js";
import { Qni, qni } from "./hookDispatch.js";
import { Iei, notePressDispatch, kKt, markPressAnswered } from "./ui/pressFill.js";
import { Nae, hasToolSite } from "./sites/siteRules.js";
import { checkElementProps } from "./ui/elements.js";
import { apiMethodLabel, Vni } from "./hooksWorkerClient.js";
import { releaseWaitingCalls, GAe, bOn } from "./commandApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { clone } from "../../utils/slowOperations.js";
import { createHooksEnvironment } from "./vm/moduleLoader.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { SLOW_HOOK_REPORT_INTERVAL_MS } from "./dispatch/slowHookReports.js";
import {
  setRenderInterfaces,
  setRenderPlugins,
} from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { CJt } from "../../../vendor/lodash-es/uniqBy.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { Y3 } from "./mcpServerHooks.js";
import { qY } from "./mcpApi.js";
import { gMe } from "./promptApi.js";
import { uiStatusOp } from "./sessionApi.js";
import { closePluginPanes } from "./panes.js";
import { stateAtomKey, CORE_ORIGIN } from "./eventPatterns.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { frs } from "./dispatch/chain.js";
import { coreInterfaceTable } from "./api/agentToolOps.js";
import { ZAn, axt } from "./vm/vmGlobals.js";
import { invalidateToolDescriptions_2, redescribeTools } from "../../services/api/toolDescriptionCache.js";
import { forget } from "./toolCallHooks.js";
import {
  invalidatePromptSections,
  invalidatePromptContext,
  invalidateHookedPromptContext,
} from "./promptComposition.js";
import { invalidatePromptAttachments } from "./promptAttachmentHooks.js";
import { ser } from "./ui/renderInstances.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { bIn } from "./configApi.js";

/**
 * 在主线程内（不开 worker）运行 hooks 模块：实现 next()、next.to()、结果与流式块的传递。
 */
//@ chunk-e6aww6q8.js:4037205-4041759 placement
function createSameThreadHost(e, n) {
  let { kind: kind, copy: copy, answer: answer, createEnvironment: createEnvironment } = n,
    S = createHostDispatchState(),
    w = kind === "same-thread",
    L = w ? cEe : Number.POSITIVE_INFINITY,
    G = createHookHostBridge({
      hostOps: (we) => runHostOpSameThread({ host: e, state: S, copy: copy }, we),
      hostStreamOps: (we) => runHostStreamOpSameThread({ host: e, state: S, copy: copy }, we),
      createEnvironment: createEnvironment,
      servedBudgetMs: L,
    }),
    q = createSameThreadRejectionHandler(G);
  res();
  let Z = (we) => S.names.get(we);
  function Se(we, Ee, Ae) {
    (irt(S.work, Ee.environments),
      S.dispatches.set(we, {
        event: Ee.event,
        payload: Ee.payload,
        environments: Ee.environments,
        origin: Ee.hookOrigin,
        signal: Ae,
        cwd: getCwd(),
        turnHeld: ilt(e, Ee),
        rootEvent: olt(e, Ee),
        isPersonInput: isPersonGestureEvent(Ee.event, Ee.payload),
        gestureAt: Ee.gestureAt,
        pressOwner: nlt(Ee.event, Ee.payload),
        listedMedia: submittedAttachmentIds(Ee.event, Ee.payload),
        tool: toolNameOfCall(Ee.event, Ee.payload),
        scope: KZn(),
      }));
  }
  async function ke(we, Ee, Ae) {
    let Ie = ++S.dispatchCounter;
    Se(Ie, we, Ee);
    try {
      return await G.within(Ie, we.event, Ae);
    } finally {
      (zZn(S.dispatches.get(Ie)), S.dispatches.delete(Ie));
    }
  }
  return {
    kind: kind,
    get died() {
      return S.died;
    },
    nextDispatchId: () => ++S.dispatchCounter,
    inFlight: () => S.dispatches.values(),
    workInFlight: (we) => countActingOps(S.work, S.dispatches.values(), we),
    nameOf: Z,
    async load(we, Ee) {
      let withResolvers = Promise.withResolvers();
      S.pendingLoads.set(we, withResolvers);
      let Ie = gNr(S.pendingLoads, we, N$t(Ee.pluginName, iEt)),
        Me;
      try {
        Me = await Promise.race([G.load(we, Ee), withResolvers.promise]);
      } catch (error) {
        throw (G.unload(we), error);
      } finally {
        (clearTimeout(Ie), S.pendingLoads.delete(we));
      }
      let We;
      try {
        We = copyRegistrations(Tos(Me.registered), Ee.pluginName);
      } catch (error) {
        throw (G.unload(we), error);
      }
      return (S.names.set(we, Ee.pluginName), { registered: We });
    },
    unload(we) {
      let Ee = new HooksError(Qni(Z(we) ?? `environment ${we}`));
      for (let Ae of S.opControllers.get(we) ?? []) Ae.abort(Ee);
      (S.opControllers.delete(we),
        S.work.delete(we),
        S.names.delete(we),
        Iei(S.keptPresses, we),
        G.unload(we));
    },
    async dispatch(we, Ee, Ae) {
      Se(we.id, we, Ae);
      let Ie = async (Me, We, ze) =>
        answer(we.event, await Ee(copy(Me, "next() argument"), We, copy(ze, "next.to() floors")));
      try {
        let dispatch = await G.dispatch(we, Ie, Ae);
        return { ...dispatch, result: copy(dispatch.result, "result") };
      } finally {
        S.dispatches.delete(we.id);
      }
    },
    dispatchStream(we, Ee, Ae) {
      Se(we.id, we, Ae);
      let Ie = (We, ze, lt) =>
          forwardGeneratorWithErrorHook(Ee(copy(We, "next() argument"), ze, copy(lt, "next.to() floors"))),
        dispatchStream = G.dispatchStream(we, Ie, Ae);
      return teeGeneratorResult(async function* () {
        try {
          while (!0) {
            let We = await dispatchStream.next();
            if (We.done === !0) return copy(We.value, "result");
            yield copy(We.value, "chunk");
          }
        } finally {
          (await dispatchStream.return(void 0), S.dispatches.delete(we.id));
        }
      });
    },
    linkStreams(we, Ee) {
      async function Ae(Ie, Me, We) {
        let ze = ++S.dispatchCounter;
        Se(ze, { ...Ee, payload: Ie, environments: [we] }, Me);
        let lt;
        try {
          lt = await G.within(ze, Ee.event, async () => We());
        } catch (error) {
          throw (S.dispatches.delete(ze), error);
        }
        return (async function* () {
          try {
            return yield* G.withinSteps(ze, lt);
          } finally {
            S.dispatches.delete(ze);
          }
        })();
      }
      return G.linkStreams({ environmentId: we, event: Ee.event, leftOut: Ee.leftOut }).map((Ie) => {
        let Me = Ie.catch;
        return {
          ...Ie,
          run: (We, ze, lt) => Ae(We, ze.signal, () => Ie.run(We, ze, lt)),
          ...(Me !== void 0 && { catch: (We, ze, lt) => Ae(We, ze.signal, () => Me(We, ze, lt)) }),
        };
      });
    },
    link(we, Ee) {
      let link = G.link({ environmentId: we, event: Ee.event, leftOut: Ee.leftOut }),
        Ie = (lt) => ({ ...Ee, payload: lt, environments: [we] }),
        Me = link.catch,
        We = Nae(Ee.event);
      async function ze(lt, Je, nt) {
        let pt;
        return (
          await ke(
            Ie(lt),
            Je,
            async () => (
              (pt = await nt()),
              checkElementProps(pt).length > 0 && We.check?.(pt, lt, []) !== void 0 ? void 0 : pt
            ),
          ),
          pt
        );
      }
      return {
        ...link,
        run: (lt, Je, nt) => ze(lt, Je.signal, () => link.run(lt, Je, nt)),
        ...(Me !== void 0 && { catch: (lt, Je) => ze(lt, Je.signal, () => Me(lt, Je)) }),
      };
    },
    resolveTables: (we, Ee) => G.resolveTables(we, Ee),
    build(we, Ee, Ae) {
      return (G.build(we, Ee, Ae), Promise.resolve());
    },
    callInterface(we, { owner: Ee, name: Ae, method: Ie, args: Me }, We) {
      let ze = ++S.callCounter,
        lt = We?.callers ?? [],
        Je = apiMethodLabel({ name: Ae, method: Ie }),
        nt = qni(Je, Z(we) ?? Ee, L),
        pt = w ? createPausableBudget(L, nt) : void 0;
      S.servedCalls.set(ze, {
        callee: we,
        callers: lt,
        lent: We?.lent ?? [],
        facts: We?.facts,
        scope: KZn(),
      });
      let Et = Promise.resolve()
        .then(() => copy(Me, `${Je} arguments`))
        .then((yt) =>
          G.callInterface(we, { owner: Ee, name: Ae, method: Ie, args: yt }, { callId: ze, callers: lt }),
        )
        .then((yt) => copy(yt, `${Je} result`));
      return (
        pt
          ? Promise.race([
              Et,
              pt.expired.catch(() => {
                throw new Jeo(nt, Je);
              }),
            ])
          : Et
      ).finally(() => {
        (pt?.clear(), zZn(S.servedCalls.get(ze)), S.servedCalls.delete(ze));
      });
    },
    press(we, Ee, Ae) {
      let Ie = { environmentId: we, gestureAt: getAsyncStoreS61() },
        Me = { handle: Ee, sent: ++S.pressCounter };
      return (
        S.sentPresses.add(Ie),
        notePressDispatch(S.keptPresses, Me.sent, we),
        Promise.resolve()
          .then(() => copy(Ae, "ui.press argument"))
          .then((We) => kKt.run(void 0, () => G.press(we, Me, We)))
          .finally(() => {
            (S.sentPresses.delete(Ie), markPressAnswered(S.keptPresses, Me.sent));
          })
      );
    },
    releasePresses: (we, Ee) => {
      G.releasePresses(we, Ee);
    },
    opsDelivered: () => Promise.resolve(),
    terminate() {
      ((S.died = `the ${kind} runtime was replaced`), q());
      for (let we of S.names.keys())
        (e.state.replacedEnvironments.add(we), releaseWaitingCalls(e.state.sentCalls, we));
    },
  };
}
/**
 * 在主线程创建 hooks 沙箱宿主（不使用 worker），结果需可克隆。
 */
//@ chunk-e6aww6q8.js:4041759-4041983 placement
var createSameThreadEnvironmentHost = (e) => (
  logForDebugging("hooks sandbox made on this thread (no worker)"),
  createSameThreadHost(e, {
    kind: "same-thread",
    copy: m9s,
    answer(n, r) {
      try {
        return clone(r);
      } catch (error) {
        let h = emptyToolCallResult(n, r);
        if (h === void 0) throw new HooksError(Vni(error));
        return h;
      }
    },
    createEnvironment: createHooksEnvironment,
  })
);
//@ chunk-e6aww6q8.js:4041983-4042127 placement
function endOpStreams(e, n) {
  let r = n === void 0 ? "" : `${n}:`;
  for (let [s, h] of e.opStreams)
    if (s.startsWith(r))
      (h.end(),
        h.stream.return(void 0).catch(() => {
          return;
        }));
}
/**
 * 中止某环境所有进行中的宿主操作并关闭其流（环境卸载时）。
 */
//@ chunk-e6aww6q8.js:4042127-4042282 placement
function abortEnvironmentOps(e, n, r) {
  for (let [s, h] of e.opControllers)
    if (s.startsWith(`${n}:`))
      (e.opControllers.delete(s), h.abort(new HooksError(Qni(r ?? `environment ${n}`))));
  endOpStreams(e, n);
}
//@ chunk-e6aww6q8.js:4042282-4042365 placement
function p4(e) {
  (clearInterval(e.heartbeat), (e.heartbeat = void 0), (e.awaitingPong = void 0));
}
/**
 * 宿主是否完全空闲（无欠的 pong、无进行中分发/调用/按键/解析/加载/构建/flush）。
 */
//@ chunk-e6aww6q8.js:4042365-4042594 placement
function isHostIdle(e) {
  return (
    e.awaitingPong?.isOwed !== !0 &&
    e.inFlight.size === 0 &&
    e.pendingCalls.size === 0 &&
    e.pendingPresses.size === 0 &&
    e.pendingResolves.size === 0 &&
    e.pendingLoads.size === 0 &&
    e.pendingBuilds.size === 0 &&
    e.pendingFlushes.size === 0
  );
}
/**
 * 向 hooks worker 发送一帧（worker 已死则丢弃并记日志），next_* 帧计入该分发的已应答数。
 */
//@ chunk-e6aww6q8.js:4042594-4042869 placement
function postToWorker(e, n) {
  if (e.died !== void 0) {
    logForDebugging(`hooks worker: ${n.type} frame not sent (${e.died})`, { level: "verbose" });
    return;
  }
  e.worker.postMessage(n);
  let s =
    n.type === "next_result" || n.type === "next_error" || n.type === "next_step"
      ? e.inFlight.get(n.id)
      : void 0;
  if (s !== void 0) s.answersSent += 1;
}
//@ chunk-e6aww6q8.js:4042869-4042960 placement
function Hoe(e, n, r) {
  let max = Math.max(n, e.waitedUntil);
  if (r > max) ((e.waitedMs += r - max), (e.waitedUntil = r));
}
/**
 * 补发错过的心跳。
 */
//@ chunk-e6aww6q8.js:4042960-4043062 placement
function catchUpHeartbeat(e, n) {
  let r = e.beatAt + e.heartbeatMs;
  if (e.heartbeat !== void 0 && n - r >= e.heartbeatMs) Hoe(e, r, n);
}
/**
 * 生成 worker 重生遥测字段：原因、证据、所处阶段、worker 年龄、未回心跳数、欠的分发/加载/构建、死亡与罢工次数。
 */
//@ chunk-e6aww6q8.js:4043062-4043613 placement
function workerCrashTelemetry(e, n, r) {
  let {
      awaitingPong: awaitingPong,
      host: host,
      inFlight: inFlight,
      pendingBuilds: pendingBuilds,
      pendingLoads: pendingLoads,
    } = e,
    now = Date.now(),
    G = r !== "none",
    found = [
      ["loading", pendingLoads.size > 0],
      ["building", pendingBuilds.size > 0],
      ["dispatching", inFlight.size > 0],
      ["answering", !isHostIdle(e)],
    ].find(([, Z]) => Z);
  return {
    cause: fromEnum(n),
    evidence: fromEnum(r),
    phase: fromEnum(found?.[0] ?? "idle"),
    worker_age_s: Math.max(0, Math.floor((now - e.spawnedAt) / SLOW_HOOK_REPORT_INTERVAL_MS)),
    unanswered_beats: awaitingPong?.unansweredBeats ?? 0,
    ping_age_ms: Math.max(0, now - (awaitingPong?.sentAt ?? now)),
    owed_dispatches: inFlight.size,
    owed_loads: pendingLoads.size,
    owed_builds: pendingBuilds.size,
    deaths: host.state.workerDeaths,
    strikes: host.state.unattributedCrashes + (G ? 0 : 1),
  };
}
/**
 * 扣留表：记录各 $ 名词被哪些插件扣留（按顺序），支持 withhold/lift/end，refuser 求拒绝者，suppressed 给出当前被压制的名词。
 */
//@ chunk-e6aww6q8.js:4043613-4044287 placement
function createWithholdingTable({ table: table, endedBy: endedBy, order: order }) {
  let s = new Map(),
    h = endedBy;
  for (let [S, w] of Object.entries(table)) if (w.withheldBy !== void 0) s.set(S, [...w.withheldBy]);
  let y = (S) => order.indexOf(S);
  return {
    withhold: (S, w) => {
      let L = s.get(S) ?? [];
      if (L.includes(w)) return;
      let index = L.findIndex((Z) => y(Z) < y(w)),
        q = index === -1;
      s.set(S, q ? [...L, w] : [...L.slice(0, index), w, ...L.slice(index)]);
    },
    end: (S) => {
      h ??= S;
    },
    lift: (S) => {
      for (let [w, L] of s) {
        let filtered = L.filter((Z) => Z !== S);
        filtered.length === 0 ? s.delete(w) : s.set(w, filtered);
      }
      h = h === S ? void 0 : h;
    },
    withholders: (S) => s.get(S) ?? [],
    endedBy: () => h,
    refuser: (S, w) => (s.get(w) ?? []).filter((L) => L !== S).at(-1),
    suppressed: () => {
      let S = {};
      for (let [w, L] of s) {
        let at = L.at(-1);
        if (at !== void 0) S[w] = at;
      }
      return h === void 0 ? S : { "*": h, ...S };
    },
  };
}
/**
 * 从接口描述的 withheldBy 中去掉指定插件。
 */
//@ chunk-e6aww6q8.js:4044287-4044404 placement
function dropWithholders(e, n) {
  let { withheldBy: withheldBy, ...s } = e,
    h = withheldBy?.filter((y) => !n.has(y)) ?? [];
  return h.length === 0 ? s : { ...s, withheldBy: h };
}
/**
 * 重置宿主的上次折叠表、结束者、所有者与扣留状态。
 */
//@ chunk-e6aww6q8.js:4044404-4044601 placement
function resetWithholdings(e) {
  ((e.isSetRecord = !1),
    (e.lastTable = {}),
    (e.lastEndedBy = void 0),
    (e.lastOwners = {}),
    e.crashedWithholders.clear(),
    e.withholdings.clear(),
    (e.withheld = createWithholdingTable({ table: {}, order: [] })),
    e.refusalsLogged.clear());
}
//@ chunk-e6aww6q8.js:4044601-4044766 placement
function forgetChangedRefusals(e, n, r) {
  for (let s of Object.keys(n))
    if (!Object.hasOwn(r, s) || r[s] !== n[s]) {
      for (let h of e.refusalsLogged) if (h.endsWith(`:${s}`)) e.refusalsLogged.delete(h);
    }
}
//@ chunk-e6aww6q8.js:4044766-4045016 placement
var publishRenderInterfaces = (e) =>
  setRenderInterfaces([
    ...Object.entries(e.lastTable)
      .filter(([, { withheldBy: n }]) => n === void 0)
      .map(([n, { owner: r, methods: s }]) => ({ name: n, owner: r, methods: [...s] })),
    ...Object.entries(e.withheld.suppressed()).map(([n, r]) => ({ name: n, methods: [], suppressedBy: r })),
  ]);
/**
 * 记录一次 engine.create 折叠结果（表、结束者、所有者），重建扣留表并发布渲染接口。
 */
//@ chunk-e6aww6q8.js:4045016-4045226 placement
function recordFoldResult(e, n) {
  let suppressed = e.withheld.suppressed();
  ((e.lastTable = n.table),
    (e.lastEndedBy = n.endedBy),
    (e.lastOwners = n.owners),
    (e.withheld = createWithholdingTable({ table: n.table, endedBy: n.endedBy, order: [] })),
    forgetChangedRefusals(e, suppressed, e.withheld.suppressed()),
    publishRenderInterfaces(e));
}
//@ chunk-e6aww6q8.js:4045226-4045271 placement
function Pes(e) {
  return e && e.length ? CJt(e) : [];
}
//@ chunk-e6aww6q8.js:4045271-4045283 placement
var sBn = Pes;
/**
 * 列出某插件当前扣留的 $ 名词（折叠表中与额外记录）。
 */
//@ chunk-e6aww6q8.js:4045283-4045427 placement
var withheldNounsOf = (e, n) =>
  sBn([
    ...Object.entries(e.lastTable)
      .filter(([, { withheldBy: r }]) => r?.includes(n) === !0)
      .map(([r]) => r),
    ...(e.withholdings.get(n) ?? []),
  ]);
//@ chunk-e6aww6q8.js:4045427-4046096 placement
function reportWorkerCrashWithholdings(e, n) {
  let suppressed = e.withheld.suppressed();
  for (let h of n) {
    let y = withheldNounsOf(e, h),
      S = e.crashedWithholders.get(h);
    if (y.length > 0 && S === void 0)
      logForDebugging(
        `hooks worker: ${h} was unloaded for the crash; what it withheld (${y.map((w) => `$.${w}`).join(", ")}) stays withheld until ${h} reloads or is disabled`,
        { level: "warn" },
      );
    if (y.length > 0 || S !== void 0) e.crashedWithholders.set(h, new Set([...(S ?? []), ...y]));
  }
  e.lastTable = filterEntriesToNullProto(e.lastTable, (h) => !n.has(h.owner));
  let s = e.lastEndedBy !== void 0 && n.has(e.lastEndedBy);
  ((e.lastEndedBy = s ? void 0 : e.lastEndedBy),
    (e.lastOwners = filterEntriesToNullProto(e.lastOwners, (h) => !n.has(h))),
    (e.withheld = createWithholdingTable({ table: e.lastTable, endedBy: e.lastEndedBy, order: [] })),
    forgetChangedRefusals(e, suppressed, e.withheld.suppressed()),
    publishRenderInterfaces(e));
}
/**
 * 解除一组插件的扣留与所有权（卸载或拒绝时），更新折叠表并发布。
 */
//@ chunk-e6aww6q8.js:4046096-4046518 placement
function liftWithholdings(e, n) {
  let suppressed = e.withheld.suppressed();
  for (let h of n) (e.crashedWithholders.delete(h), e.withholdings.delete(h));
  e.lastTable = xr(
    filterEntriesToNullProto(e.lastTable, (h) => !n.has(h.owner)),
    (h) => dropWithholders(h, n),
  );
  let s = e.lastEndedBy !== void 0 && n.has(e.lastEndedBy);
  ((e.lastEndedBy = s ? void 0 : e.lastEndedBy),
    (e.lastOwners = filterEntriesToNullProto(e.lastOwners, (h) => !n.has(h))),
    (e.withheld = createWithholdingTable({ table: e.lastTable, endedBy: e.lastEndedBy, order: [] })),
    forgetChangedRefusals(e, suppressed, e.withheld.suppressed()),
    publishRenderInterfaces(e));
}
//@ chunk-e6aww6q8.js:4046518-4046628 placement
var envCallsOf = (e) => [
  ...(e.env?.reads ?? []).map((n) => `env.get:${n}`),
  ...(e.env?.writes ?? []).map((n) => `env.set:${n}`),
];
//@ chunk-e6aww6q8.js:4046628-4046701 placement
var aBn = (e, n) => n.state.crashedWithholders.has(e) || withheldNounsOf(n.state, e).length > 0;
//@ chunk-e6aww6q8.js:4046701-4046781 placement
function lBn(e, n) {
  let r = [...e.knownArgs.keys()];
  return r.includes(n) ? r : [...r, n];
}
//@ chunk-e6aww6q8.js:4046781-4046862 placement
function mlt(e, n) {
  let state = n.state;
  state.generations.set(e, (state.generations.get(e) ?? 0) + 1);
}
//@ chunk-e6aww6q8.js:4046862-4046901 placement
var dBn = (e) => [...e.knownArgs.values()];
/**
 * 宿主遗忘一个插件：清理已知参数、MCP、命令、代理、状态、面板等登记；非密封插件记录"模块未加载"的选项失败。
 */
//@ chunk-e6aww6q8.js:4046901-4047365 placement
function forgetPlugin(e, n) {
  let state = n.state,
    s = state.knownArgs.get(e)?.sealed === !0,
    h = s ? void 0 : state.knownPlugins.get(e);
  if (s) state.knownPlugins.delete(e);
  if (
    (state.knownArgs.delete(e),
    Y3(e),
    qY(e),
    GAe(e),
    ID(e),
    gMe(e),
    state.generations.delete(e),
    state.unloadedSteps.delete(e),
    uiStatusOp(void 0, e),
    closePluginPanes(e),
    h === void 0)
  )
    state.optionsReloadFailures.delete(e);
  else if (!state.optionsReloadFailures.has(e))
    state.optionsReloadFailures.set(e, {
      generation: void 0,
      wanted: pluginOptionsSnapshot(h).text,
      error: new HooksError(`${e}: its hooks module is not loaded`),
    });
}
//@ chunk-e6aww6q8.js:4047365-4047448 placement
function glt(e, n) {
  (e.knownArgs.delete(n.pluginName), e.knownArgs.set(n.pluginName, n));
}
/**
 * 按新折叠表更新各名词的扣留记录。
 */
//@ chunk-e6aww6q8.js:4047448-4047728 placement
function updateWithholdingRecords(e, n, r) {
  for (let s of r) {
    let filtered = [...(e.withholdings.get(s) ?? [])].filter((w) => !Object.hasOwn(n, w)),
      mapped = Object.entries(n)
        .filter(([, { withheldBy: w }]) => w?.includes(s) === !0)
        .map(([w]) => w);
    filtered.length + mapped.length === 0
      ? e.withholdings.delete(s)
      : e.withholdings.set(s, new Set([...filtered, ...mapped]));
  }
}
//@ chunk-e6aww6q8.js:4047728-4047864 placement
function stateCallsOf(e) {
  let n = (r, s = []) => s.map((h) => `${r}:${stateAtomKey(h)}`);
  return [...n("state.get", e.state?.reads), ...n("state.set", e.state?.writes)];
}
/**
 * 把已加载模块的名字、层级、事件、调用（含 next.to、env、state）与代号发布给渲染层。
 */
//@ chunk-e6aww6q8.js:4047864-4048114 placement
var publishRenderPlugins = (e) =>
  setRenderPlugins(
    getPluginRegistry().loadedModules.map((loadedModule) => ({
      name: loadedModule.name,
      tier: loadedModule.tier,
      events: [...loadedModule.patterns],
      calls: [
        ...loadedModule.args.scan.calls,
        ...(loadedModule.args.scan.nextTo ?? []).map(frs),
        ...envCallsOf(loadedModule.args.scan),
        ...stateCallsOf(loadedModule.args.scan),
      ],
      generation: e.state.generations.get(loadedModule.name) ?? 0,
    })),
  );
/**
 * 重新折叠时的基线：核心方法表加上次折叠表中除去指定插件后的部分。
 */
//@ chunk-e6aww6q8.js:4048114-4048558 placement
function foldBaseWithout(e, n, r) {
  let s = new Map();
  for (let [w, L] of Object.entries(coreInterfaceTable())) {
    let G = Object.hasOwn(e.lastTable, w) ? e.lastTable[w] : void 0;
    s.set(w, G ? dropWithholders(G, n) : L);
  }
  for (let [w, L] of Object.entries(e.lastTable)) {
    let G = dropWithholders(L, n);
    if (!n.has(L.owner) || G.withheldBy) s.set(w, G);
  }
  let h = {};
  for (let [w, L] of Object.entries(e.lastOwners)) if (!n.has(L)) h[w] = L;
  let lastEndedBy = e.lastEndedBy,
    S = lastEndedBy !== void 0 && !n.has(lastEndedBy);
  return { beneath: Object.fromEntries(s), endedBy: S ? lastEndedBy : void 0, owned: h, order: r };
}
//@ chunk-e6aww6q8.js:4048558-4048602 placement
var jes = (e, n) => foldBaseWithout(e, new Set([n]), lBn(e, n));
/**
 * 记录重新折叠的结果，并找出未知插件的所有权。
 */
//@ chunk-e6aww6q8.js:4048602-4048847 placement
function recordRefoldResult(e, n) {
  recordFoldResult(e, n);
  let r = new Set(),
    s = new Set();
  for (let [, h] of Object.entries(n.table))
    for (let y of [h.owner, ...(h.withheldBy ?? [])])
      if (y !== CORE_ORIGIN && !e.knownArgs.has(y)) (e.crashedWithholders.has(y) ? s : r).add(y);
  if (s.size > 0) reportWorkerCrashWithholdings(e, s);
  if (r.size > 0) liftWithholdings(e, r);
}
//@ chunk-e6aww6q8.js:4048847-4048924 placement
var Ges = (e) => ({ table: e.lastTable, endedBy: e.lastEndedBy, owners: e.lastOwners });
/**
 * 计算 worker 重生后的折叠基线（去掉扣留者中已不存在的插件）。
 */
//@ chunk-e6aww6q8.js:4048924-4049231 placement
function foldBaseForRespawn(e, n) {
  let state = e.state,
    create = Object.create(null);
  Object.assign(create, coreInterfaceTable());
  for (let [h, y] of Object.entries(state.lastTable)) {
    let S = dropWithholders(
      y,
      new Set((y.withheldBy ?? []).filter((L) => !state.crashedWithholders.has(L) || n.includes(L))),
    );
    if (S.withheldBy !== void 0 && (y.owner === CORE_ORIGIN || n.includes(y.owner))) create[h] = S;
  }
  return { beneath: create };
}
/**
 * 从共享心跳戳中读出正在执行的插件（调用栈或当前环境）。
 */
//@ chunk-e6aww6q8.js:4049231-4049424 placement
function stackedPluginOf(e) {
  let { stamp: stamp, names: names } = e;
  return [
    ...Array.from({ length: stamp.length - ZAn }, (s, h) => Atomics.load(stamp, ZAn + h)),
    Atomics.load(stamp, axt),
  ]
    .filter((s) => s !== 0)
    .map((s) => names.get(s))
    .find((s) => s !== void 0);
}
/**
 * 列出某插件捕获的进行中分发。
 */
//@ chunk-e6aww6q8.js:4049424-4049526 placement
var catchingDispatchesOf = (e, n) =>
  [...e.inFlight].filter(([, r]) => hasToolSite(r.event) && r.caughtBy.some((s) => e.names.get(s) === n));
/**
 * 关闭某环境的消息端口，结算其待 flush 请求。
 */
//@ chunk-e6aww6q8.js:4049526-4049742 placement
function closeEnvironmentPort(e, n) {
  let r = e.ports.get(n);
  for (let [s, h] of e.pendingFlushes) if (s.startsWith(`${n}:`)) (e.pendingFlushes.delete(s), h.resolve());
  if ((e.runningOps.delete(n), r !== void 0)) (e.ports.delete(n), (r.onmessage = null), r.close());
}
/**
 * 标记 worker 已死：中止全部进行中的分发与调用、拒绝所有待处理请求、中止宿主操作并关闭所有端口。
 */
//@ chunk-e6aww6q8.js:4049742-4050203 placement
function markWorkerDead(e, n) {
  if (e.died !== void 0) return;
  ((e.died = n), p4(e));
  for (let r of e.inFlight.values()) {
    r.unlink();
    for (let s of r.calls.values()) s.abort(new fEe(n));
    r.reject(new HooksError(n));
  }
  (e.inFlight.clear(),
    EAn(e.pendingCalls, n),
    EAn(e.pendingPresses, n),
    EAn(e.pendingResolves, n),
    EAn(e.pendingBuilds, n),
    EAn(e.pendingLoads, n),
    EAn(e.pendingFlushes, n));
  for (let r of e.opControllers.values()) r.abort(new HooksError(n));
  (e.opControllers.clear(), endOpStreams(e));
  for (let r of [...e.ports.keys()]) closeEnvironmentPort(e, r);
}
//@ chunk-e6aww6q8.js:4050203-4050230 placement
function nOe() {
  (invalidateToolDescriptions_2(), forget());
}
/**
 * $.ui.invalidate 可失效的缓存：prompt.section、prompt.context、prompt.attachment、tool.describe。
 */
//@ chunk-e6aww6q8.js:4050230-4050340 placement
var UI_INVALIDATORS = {
  "prompt.section": invalidatePromptSections,
  "prompt.context": invalidatePromptContext,
  "prompt.attachment": invalidatePromptAttachments,
  "tool.describe": () => {
    (redescribeTools(), nOe());
  },
};
//@ chunk-e6aww6q8.js:4050340-4050417 placement
function Woe() {
  (ser(),
    invalidatePromptSections(),
    invalidateHookedPromptContext(hasModuleHookingSite("prompt.context")),
    invalidatePromptAttachments(),
    nOe(),
    bOn(),
    bIn());
}

export {
  glt,
  Woe,
  publishRenderPlugins,
  forgetPlugin,
  liftWithholdings,
  resetWithholdings,
  mlt,
  foldBaseForRespawn,
  foldBaseWithout,
  aBn,
  withheldNounsOf,
  reportWorkerCrashWithholdings,
  jes,
  Ges,
  recordRefoldResult,
  UI_INVALIDATORS,
  dropWithholders,
  createWithholdingTable,
  recordFoldResult,
  updateWithholdingRecords,
  dBn,
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
};
