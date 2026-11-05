/**
 * plugins/functionHooks/sameThreadHost.ts
 *
 * 2.1.316 新增：不开 worker 时在主线程内运行 hooks 模块的宿主
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (43)
 * attribution: placement 43
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { import_baseUniq } from "../../../vendor/lodash-es/uniqBy.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { forgetMcpServerFor } from "./mcpServerHooks.js";
import { forgetMcpConnectsFor } from "./mcpApi.js";
import { forgetSessionStartCall } from "./promptApi.js";
import { uiStatusOp, clearBackdropFor } from "./sessionApi.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4143036-4147594 placement
/**
 * 在主线程内（不开 worker）运行 hooks 模块：实现 next()、next.to()、结果与流式块的传递。
 */
function createSameThreadHost(host, options) {
  let { kind, copy, answer, createEnvironment } = options;
  let hostDispatchState = createHostDispatchState();
  let isSameThread = kind === "same-thread";
  let budgetMs = isSameThread ? DEFAULT_HOOK_TIMEOUT_MS : Number.POSITIVE_INFINITY;
  let hookHostBridge = createHookHostBridge({
    hostOps: (request) =>
      runHostOpSameThread(
        {
          host,
          state: hostDispatchState,
          copy,
        },
        request,
      ),
    hostStreamOps: (request) =>
      runHostStreamOpSameThread(
        {
          host,
          state: hostDispatchState,
          copy,
        },
        request,
      ),
    createEnvironment,
    servedBudgetMs: budgetMs,
  });
  let sameThreadRejectionHandler = createSameThreadRejectionHandler(hookHostBridge);
  unhandledRejectionHandler();
  let nameOfEnvironment = (environmentId) => hostDispatchState.names.get(environmentId);
  function noteDispatch(dispatchId, request, signal) {
    bumpPluginEpochs(hostDispatchState.work, request.environments);
    hostDispatchState.dispatches.set(dispatchId, {
      event: request.event,
      payload: request.payload,
      environments: request.environments,
      origin: request.hookOrigin,
      signal,
      cwd: getCwd(),
      turnHeld: turnHeldDispatches(host, request),
      rootEvent: rootEventDispatches(host, request),
      isPersonInput: isPersonGestureEvent(request.event, request.payload),
      gestureAt: request.gestureAt,
      pressOwner: callerPluginOf(request.event, request.payload),
      listedMedia: submittedAttachmentIds(request.event, request.payload),
      tool: toolNameOfCall(request.event, request.payload),
      scope: currentScope(),
    });
  }
  async function runWithinDispatch(request, signal, run) {
    let dispatchId = ++hostDispatchState.dispatchCounter;
    noteDispatch(dispatchId, request, signal);
    try {
      return await hookHostBridge.within(dispatchId, request.event, run);
    } finally {
      endScope(hostDispatchState.dispatches.get(dispatchId));
      hostDispatchState.dispatches.delete(dispatchId);
    }
  }
  return {
    kind,
    get died() {
      return hostDispatchState.died;
    },
    nextDispatchId: () => ++hostDispatchState.dispatchCounter,
    inFlight: () => hostDispatchState.dispatches.values(),
    workInFlight: (environmentId) =>
      countActingOps(hostDispatchState.work, hostDispatchState.dispatches.values(), environmentId),
    nameOf: nameOfEnvironment,
    async load(environmentId, options) {
      let deferred = Promise.withResolvers();
      hostDispatchState.pendingLoads.set(environmentId, deferred);
      let timer = scheduleCallTimeout(
        hostDispatchState.pendingLoads,
        environmentId,
        notLoadedWithinText(options.pluginName, HOOKS_READY_TIMEOUT_MS),
      );
      let loaded;
      try {
        loaded = await Promise.race([hookHostBridge.load(environmentId, options), deferred.promise]);
      } catch (error) {
        hookHostBridge.unload(environmentId);
        throw error;
      } finally {
        clearTimeout(timer);
        hostDispatchState.pendingLoads.delete(environmentId);
      }
      let registered;
      try {
        registered = copyRegistrations(serializeMatcherList(loaded.registered), options.pluginName);
      } catch (error) {
        hookHostBridge.unload(environmentId);
        throw error;
      }
      hostDispatchState.names.set(environmentId, options.pluginName);
      return {
        registered,
      };
    },
    unload(environmentId) {
      let abortError = new HooksError(
        envUnloadedAbortText(nameOfEnvironment(environmentId) ?? `environment ${environmentId}`),
      );
      for (let controller of hostDispatchState.opControllers.get(environmentId) ?? [])
        controller.abort(abortError);
      hostDispatchState.opControllers.delete(environmentId);
      hostDispatchState.work.delete(environmentId);
      hostDispatchState.names.delete(environmentId);
      dropEnvPresses(hostDispatchState.keptPresses, environmentId);
      hookHostBridge.unload(environmentId);
    },
    async dispatch(request, next, signal) {
      noteDispatch(request.id, request, signal);
      let nextWithCopy = async (value, context, floors) =>
        answer(
          request.event,
          await next(copy(value, "next() argument"), context, copy(floors, "next.to() floors")),
        );
      try {
        let outcome = await hookHostBridge.dispatch(request, nextWithCopy, signal);
        return {
          ...outcome,
          result: copy(outcome.result, "result"),
        };
      } finally {
        hostDispatchState.dispatches.delete(request.id);
      }
    },
    dispatchStream(request, next, signal) {
      noteDispatch(request.id, request, signal);
      let nextWithCopy = (value, context, floors) =>
        forwardGeneratorWithErrorHook(
          next(copy(value, "next() argument"), context, copy(floors, "next.to() floors")),
        );
      let steps = hookHostBridge.dispatchStream(request, nextWithCopy, signal);
      return teeGeneratorResult(async function* () {
        try {
          while (true) {
            let step = await steps.next();
            if (step.done === true) return copy(step.value, "result");
            yield copy(step.value, "chunk");
          }
        } finally {
          await steps.return(undefined);
          hostDispatchState.dispatches.delete(request.id);
        }
      });
    },
    linkStreams(environmentId, linkOptions) {
      async function runLinked(payload, signal, call) {
        let dispatchId = ++hostDispatchState.dispatchCounter;
        noteDispatch(
          dispatchId,
          {
            ...linkOptions,
            payload,
            environments: [environmentId],
          },
          signal,
        );
        let answer;
        try {
          answer = await hookHostBridge.within(dispatchId, linkOptions.event, async () => call());
        } catch (error) {
          hostDispatchState.dispatches.delete(dispatchId);
          throw error;
        }
        return (async function* () {
          try {
            return yield* hookHostBridge.withinSteps(dispatchId, answer);
          } finally {
            hostDispatchState.dispatches.delete(dispatchId);
          }
        })();
      }
      return hookHostBridge
        .linkStreams({
          environmentId,
          event: linkOptions.event,
          leftOut: linkOptions.leftOut,
        })
        .map((entry) => {
          let catchFn = entry.catch;
          return {
            ...entry,
            run: (payload, context, next) =>
              runLinked(payload, context.signal, () => entry.run(payload, context, next)),
            ...(catchFn !== undefined && {
              catch: (payload, context, next) =>
                runLinked(payload, context.signal, () => catchFn(payload, context, next)),
            }),
          };
        });
    },
    link(environmentId, linkOptions) {
      let linked = hookHostBridge.link({
        environmentId,
        event: linkOptions.event,
        leftOut: linkOptions.leftOut,
      });
      let withPayload = (payload) => ({
        ...linkOptions,
        payload,
        environments: [environmentId],
      });
      let catchFn = linked.catch;
      let siteRule = envSiteRuleFor(linkOptions.event);
      async function runChecked(payload, signal, call) {
        let result;
        await runWithinDispatch(withPayload(payload), signal, async () => {
          result = await call();
          return checkElementProps(result).length > 0 && siteRule.check?.(result, payload, []) !== undefined
            ? undefined
            : result;
        });
        return result;
      }
      return {
        ...linked,
        run: (payload, context, next) =>
          runChecked(payload, context.signal, () => linked.run(payload, context, next)),
        ...(catchFn !== undefined && {
          catch: (payload, context) => runChecked(payload, context.signal, () => catchFn(payload, context)),
        }),
      };
    },
    resolveTables: (environmentId, event) => hookHostBridge.resolveTables(environmentId, event),
    build(environmentId, options, payload) {
      hookHostBridge.build(environmentId, options, payload);
      return Promise.resolve();
    },
    callInterface(environmentId, { owner, name: apiName, method, args }, caller) {
      let callId = ++hostDispatchState.callCounter;
      let callers = caller?.callers ?? [];
      let methodLabel = apiMethodLabel({
        name: apiName,
        method,
      });
      let timeoutText = hookTimeoutText(methodLabel, nameOfEnvironment(environmentId) ?? owner, budgetMs);
      let budget = isSameThread ? createPausableBudget(budgetMs, timeoutText) : undefined;
      hostDispatchState.servedCalls.set(callId, {
        callee: environmentId,
        callers,
        lent: caller?.lent ?? [],
        facts: caller?.facts,
        scope: currentScope(),
      });
      let callPromise = Promise.resolve()
        .then(() => copy(args, `${methodLabel} arguments`))
        .then((args) =>
          hookHostBridge.callInterface(
            environmentId,
            {
              owner,
              name: apiName,
              method,
              args,
            },
            {
              callId,
              callers,
            },
          ),
        )
        .then((result) => copy(result, `${methodLabel} result`));
      return (
        budget
          ? Promise.race([
              callPromise,
              budget.expired.catch(() => {
                throw new AskRefusedError(timeoutText, methodLabel);
              }),
            ])
          : callPromise
      ).finally(() => {
        budget?.clear();
        endScope(hostDispatchState.servedCalls.get(callId));
        hostDispatchState.servedCalls.delete(callId);
      });
    },
    press(environmentId, handle, args) {
      let sending = {
        environmentId,
        gestureAt: getAsyncStoreS61(),
      };
      let press = {
        handle,
        sent: ++hostDispatchState.pressCounter,
      };
      hostDispatchState.sentPresses.add(sending);
      notePressDispatch(hostDispatchState.keptPresses, press.sent, environmentId);
      return Promise.resolve()
        .then(() => copy(args, "ui.press argument"))
        .then((args) =>
          pressContextStore.run(undefined, () => hookHostBridge.press(environmentId, press, args)),
        )
        .finally(() => {
          hostDispatchState.sentPresses.delete(sending);
          markPressAnswered(hostDispatchState.keptPresses, press.sent);
        });
    },
    releasePresses: (environmentId, refusal) => {
      hookHostBridge.releasePresses(environmentId, refusal);
    },
    opsDelivered: () => Promise.resolve(),
    terminate() {
      hostDispatchState.died = `the ${kind} runtime was replaced`;
      sameThreadRejectionHandler();
      for (let key of hostDispatchState.names.keys()) {
        host.state.replacedEnvironments.add(key);
        releaseWaitingCalls(host.state.sentCalls, key);
      }
    },
  };
}
//@ chunk-5xgkngpb.js:4147594-4147818 placement
/**
 * 在主线程创建 hooks 沙箱宿主（不使用 worker），结果需可克隆。
 */
var createSameThreadEnvironmentHost = (host) => {
  logForDebugging("hooks sandbox made on this thread (no worker)");
  return createSameThreadHost(host, {
    kind: "same-thread",
    copy: cloneOrThrow,
    answer(event, value) {
      try {
        return clone(value);
      } catch (error) {
        let emptyResult = emptyToolCallResult(event, value);
        if (emptyResult === undefined) throw new HooksError(NEXT_NOT_CLONEABLE(error));
        return emptyResult;
      }
    },
    createEnvironment: createHooksEnvironment,
  });
};
//@ chunk-5xgkngpb.js:4147818-4147962 placement
function endOpStreams(host, environmentId) {
  let keyPrefix = environmentId === undefined ? "" : `${environmentId}:`;
  for (let [streamKey, stream] of host.opStreams)
    if (streamKey.startsWith(keyPrefix)) {
      stream.end();
      stream.stream.return(undefined).catch(() => {
        return;
      });
    }
}
//@ chunk-5xgkngpb.js:4147962-4148117 placement
/**
 * 中止某环境所有进行中的宿主操作并关闭其流（环境卸载时）。
 */
function abortEnvironmentOps(state, environmentId, pluginName) {
  for (let [key, controller] of state.opControllers)
    if (key.startsWith(`${environmentId}:`)) {
      state.opControllers.delete(key);
      controller.abort(new HooksError(envUnloadedAbortText(pluginName ?? `environment ${environmentId}`)));
    }
  endOpStreams(state, environmentId);
}
//@ chunk-5xgkngpb.js:4148117-4148200 placement
/**
 * 停掉心跳并清状态
 */
function stopHeartbeat(state) {
  clearInterval(state.heartbeat);
  state.heartbeat = undefined;
  state.awaitingPong = undefined;
}
//@ chunk-5xgkngpb.js:4148200-4148429 placement
/**
 * 宿主是否完全空闲（无欠的 pong、无进行中分发/调用/按键/解析/加载/构建/flush）。
 */
function isHostIdle(state) {
  return (
    state.awaitingPong?.isOwed !== true &&
    state.inFlight.size === 0 &&
    state.pendingCalls.size === 0 &&
    state.pendingPresses.size === 0 &&
    state.pendingResolves.size === 0 &&
    state.pendingLoads.size === 0 &&
    state.pendingBuilds.size === 0 &&
    state.pendingFlushes.size === 0
  );
}
//@ chunk-5xgkngpb.js:4148429-4148704 placement
/**
 * 向 hooks worker 发送一帧（worker 已死则丢弃并记日志），next_* 帧计入该分发的已应答数。
 */
function postToWorker(state, frame) {
  if (state.died !== undefined) {
    logForDebugging(`hooks worker: ${frame.type} frame not sent (${state.died})`, {
      level: "verbose",
    });
    return;
  }
  state.worker.postMessage(frame);
  let inFlightEntry =
    frame.type === "next_result" || frame.type === "next_error" || frame.type === "next_step"
      ? state.inFlight.get(frame.id)
      : undefined;
  if (inFlightEntry !== undefined) inFlightEntry.answersSent += 1;
}
//@ chunk-5xgkngpb.js:4148704-4148795 placement
/**
 * 累计等待时长
 */
function addWaitedTime(state, fromTs, toTs) {
  let max = Math.max(fromTs, state.waitedUntil);
  if (toTs > max) {
    state.waitedMs += toTs - max;
    state.waitedUntil = toTs;
  }
}
//@ chunk-5xgkngpb.js:4148795-4148897 placement
/**
 * 补发错过的心跳。
 */
function catchUpHeartbeat(state, now) {
  let expectedBeat = state.beatAt + state.heartbeatMs;
  if (state.heartbeat !== undefined && now - expectedBeat >= state.heartbeatMs)
    addWaitedTime(state, expectedBeat, now);
}
//@ chunk-5xgkngpb.js:4148897-4149450 placement
/**
 * 生成 worker 重生遥测字段：原因、证据、所处阶段、worker 年龄、未回心跳数、欠的分发/加载/构建、死亡与罢工次数。
 */
function workerCrashTelemetry(state, cause, evidence) {
  let { awaitingPong, host, inFlight, pendingBuilds, pendingLoads } = state;
  let now = Date.now();
  let hasEvidence = evidence !== "none";
  let found = [
    ["loading", pendingLoads.size > 0],
    ["building", pendingBuilds.size > 0],
    ["dispatching", inFlight.size > 0],
    ["answering", !isHostIdle(state)],
  ].find(([, isActive]) => isActive);
  return {
    cause: fromEnum(cause),
    evidence: fromEnum(evidence),
    phase: fromEnum(found?.[0] ?? "idle"),
    worker_age_s: Math.max(0, Math.floor((now - state.spawnedAt) / SLOW_HOOK_REPORT_INTERVAL_MS_2)),
    unanswered_beats: awaitingPong?.unansweredBeats ?? 0,
    ping_age_ms: Math.max(0, now - (awaitingPong?.sentAt ?? now)),
    owed_dispatches: inFlight.size,
    owed_loads: pendingLoads.size,
    owed_builds: pendingBuilds.size,
    deaths: host.state.workerDeaths,
    strikes: host.state.unattributedCrashes + (hasEvidence ? 0 : 1),
  };
}
//@ chunk-5xgkngpb.js:4149450-4150128 placement
/**
 * 扣留表：记录各 $ 名词被哪些插件扣留（按顺序），支持 withhold/lift/end，refuser 求拒绝者，suppressed 给出当前被压制的名词。
 */
function createWithholdingTable({ table, endedBy, order }) {
  let withheld = new Map();
  let endingPlugin = endedBy;
  for (let [key, value] of Object.entries(table))
    if (value.withheldBy !== undefined) withheld.set(key, [...value.withheldBy]);
  let rankOf = (pluginName) => order.indexOf(pluginName);
  return {
    withhold: (key, holder) => {
      let holders = withheld.get(key) ?? [];
      if (holders.includes(holder)) return;
      let index = holders.findIndex((pluginName) => rankOf(pluginName) < rankOf(holder));
      let appendsAtEnd = index === -1;
      withheld.set(
        key,
        appendsAtEnd ? [...holders, holder] : [...holders.slice(0, index), holder, ...holders.slice(index)],
      );
    },
    end: (pluginName) => {
      endingPlugin ??= pluginName;
    },
    lift: (pluginName) => {
      for (let [key, holders] of withheld) {
        let filtered = holders.filter((holderName) => holderName !== pluginName);
        if (filtered.length === 0) withheld.delete(key);
        else withheld.set(key, filtered);
      }
      endingPlugin = endingPlugin === pluginName ? undefined : endingPlugin;
    },
    withholders: (key) => withheld.get(key) ?? [],
    endedBy: () => endingPlugin,
    refuser: (pluginName, key) => (withheld.get(key) ?? []).filter((holder) => holder !== pluginName).at(-1),
    suppressed: () => {
      let result = {};
      for (let [key, holders] of withheld) {
        let last = holders.at(-1);
        if (last !== undefined) result[key] = last;
      }
      return endingPlugin === undefined
        ? result
        : {
            "*": endingPlugin,
            ...result,
          };
    },
  };
}
//@ chunk-5xgkngpb.js:4150128-4150245 placement
/**
 * 从接口描述的 withheldBy 中去掉指定插件。
 */
function dropWithholders(entry, removed) {
  let { withheldBy, ...rest } = entry;
  let kept = withheldBy?.filter((holder) => !removed.has(holder)) ?? [];
  return kept.length === 0
    ? rest
    : {
        ...rest,
        withheldBy: kept,
      };
}
//@ chunk-5xgkngpb.js:4150245-4150442 placement
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
//@ chunk-5xgkngpb.js:4150442-4150607 placement
function forgetChangedRefusals(state, before, after) {
  for (let key of Object.keys(before))
    if (!Object.hasOwn(after, key) || after[key] !== before[key]) {
      for (let logged of state.refusalsLogged)
        if (logged.endsWith(`:${key}`)) state.refusalsLogged.delete(logged);
    }
}
//@ chunk-5xgkngpb.js:4150607-4150857 placement
var publishRenderInterfaces = (state) =>
  setRenderInterfaces([
    ...Object.entries(state.lastTable)
      .filter(([, { withheldBy }]) => withheldBy === undefined)
      .map(([key, { owner, methods }]) => ({
        name: key,
        owner,
        methods: [...methods],
      })),
    ...Object.entries(state.withheld.suppressed()).map(([key, value]) => ({
      name: key,
      methods: [],
      suppressedBy: value,
    })),
  ]);
//@ chunk-5xgkngpb.js:4150857-4151067 placement
/**
 * 记录一次 engine.create 折叠结果（表、结束者、所有者），重建扣留表并发布渲染接口。
 */
function recordFoldResult(state, folded) {
  let before = state.withheld.suppressed();
  state.lastTable = folded.table;
  state.lastEndedBy = folded.endedBy;
  state.lastOwners = folded.owners;
  state.withheld = createWithholdingTable({
    table: folded.table,
    endedBy: folded.endedBy,
    order: [],
  });
  forgetChangedRefusals(state, before, state.withheld.suppressed());
  publishRenderInterfaces(state);
}
//@ chunk-5xgkngpb.js:4151067-4151112 placement
/**
 * 某插件扣留的 $ 名词
 */
function withheldNounsByPlugin(nouns) {
  return nouns && nouns.length ? import_baseUniq(nouns) : [];
}
//@ chunk-5xgkngpb.js:4151112-4151124 placement
/**
 * 同上别名
 */
var withheldNounsAlias = withheldNounsByPlugin;
//@ chunk-5xgkngpb.js:4151124-4151268 placement
/**
 * 列出某插件当前扣留的 $ 名词（折叠表中与额外记录）。
 */
var withheldNounsOf = (state, pluginName) =>
  withheldNounsAlias([
    ...Object.entries(state.lastTable)
      .filter(([, { withheldBy }]) => withheldBy?.includes(pluginName) === true)
      .map(([key]) => key),
    ...(state.withholdings.get(pluginName) ?? []),
  ]);
//@ chunk-5xgkngpb.js:4151268-4151937 placement
function reportWorkerCrashWithholdings(state, crashedPlugins) {
  let before = state.withheld.suppressed();
  for (let pluginName of crashedPlugins) {
    let nouns = withheldNounsOf(state, pluginName);
    let alreadyCrashed = state.crashedWithholders.get(pluginName);
    if (nouns.length > 0 && alreadyCrashed === undefined)
      logForDebugging(
        `hooks worker: ${pluginName} was unloaded for the crash; what it withheld (${nouns.map((noun) => `$.${noun}`).join(", ")}) stays withheld until ${pluginName} reloads or is disabled`,
        {
          level: "warn",
        },
      );
    if (nouns.length > 0 || alreadyCrashed !== undefined)
      state.crashedWithholders.set(pluginName, new Set([...(alreadyCrashed ?? []), ...nouns]));
  }
  state.lastTable = filterEntriesToNullProto(state.lastTable, (entry) => !crashedPlugins.has(entry.owner));
  let isEndedByCrash = state.lastEndedBy !== undefined && crashedPlugins.has(state.lastEndedBy);
  state.lastEndedBy = isEndedByCrash ? undefined : state.lastEndedBy;
  state.lastOwners = filterEntriesToNullProto(state.lastOwners, (owner) => !crashedPlugins.has(owner));
  state.withheld = createWithholdingTable({
    table: state.lastTable,
    endedBy: state.lastEndedBy,
    order: [],
  });
  forgetChangedRefusals(state, before, state.withheld.suppressed());
  publishRenderInterfaces(state);
}
//@ chunk-5xgkngpb.js:4151937-4152359 placement
/**
 * 解除一组插件的扣留与所有权（卸载或拒绝时），更新折叠表并发布。
 */
function liftWithholdings(state, plugins) {
  let before = state.withheld.suppressed();
  for (let pluginName of plugins) {
    state.crashedWithholders.delete(pluginName);
    state.withholdings.delete(pluginName);
  }
  state.lastTable = import_mapValues(
    filterEntriesToNullProto(state.lastTable, (entry) => !plugins.has(entry.owner)),
    (entry) => dropWithholders(entry, plugins),
  );
  let isEndedByLifted = state.lastEndedBy !== undefined && plugins.has(state.lastEndedBy);
  state.lastEndedBy = isEndedByLifted ? undefined : state.lastEndedBy;
  state.lastOwners = filterEntriesToNullProto(state.lastOwners, (owner) => !plugins.has(owner));
  state.withheld = createWithholdingTable({
    table: state.lastTable,
    endedBy: state.lastEndedBy,
    order: [],
  });
  forgetChangedRefusals(state, before, state.withheld.suppressed());
  publishRenderInterfaces(state);
}
//@ chunk-5xgkngpb.js:4152359-4152469 placement
var envCallsOf = (scan) => [
  ...(scan.env?.reads ?? []).map((name) => `env.get:${name}`),
  ...(scan.env?.writes ?? []).map((name) => `env.set:${name}`),
];
//@ chunk-5xgkngpb.js:4152469-4152542 placement
/**
 * 崩溃或仍有扣留
 */
var isCrashedOrWithholding = (pluginName, host) =>
  host.state.crashedWithholders.has(pluginName) || withheldNounsOf(host.state, pluginName).length > 0;
//@ chunk-5xgkngpb.js:4152542-4152622 placement
/**
 * 追加插件名
 */
function withPluginName(state, pluginName) {
  let names = [...state.knownArgs.keys()];
  return names.includes(pluginName) ? names : [...names, pluginName];
}
//@ chunk-5xgkngpb.js:4152622-4152703 placement
/**
 * 递增代次
 */
function bumpGeneration(environmentKey, host) {
  let state = host.state;
  state.generations.set(environmentKey, (state.generations.get(environmentKey) ?? 0) + 1);
}
//@ chunk-5xgkngpb.js:4152703-4152742 placement
/**
 * 已知参数列表
 */
var knownArgList = (state) => [...state.knownArgs.values()];
//@ chunk-5xgkngpb.js:4152742-4153213 placement
/**
 * 宿主遗忘一个插件：清理已知参数、MCP、命令、代理、状态、面板等登记；非密封插件记录"模块未加载"的选项失败。
 */
function forgetPlugin(pluginName, host) {
  let state = host.state;
  let isSealed = state.knownArgs.get(pluginName)?.sealed === true;
  let knownPlugin = isSealed ? undefined : state.knownPlugins.get(pluginName);
  if (isSealed) state.knownPlugins.delete(pluginName);
  state.knownArgs.delete(pluginName);
  forgetMcpServerFor(pluginName);
  forgetMcpConnectsFor(pluginName);
  forgetCachedDescribe(pluginName);
  forgetRegisteredAgent(pluginName);
  forgetSessionStartCall(pluginName);
  state.generations.delete(pluginName);
  state.unloadedSteps.delete(pluginName);
  uiStatusOp(undefined, pluginName);
  closePluginPanes(pluginName);
  clearBackdropFor(pluginName);
  if (knownPlugin === undefined) state.optionsReloadFailures.delete(pluginName);
  else if (!state.optionsReloadFailures.has(pluginName))
    state.optionsReloadFailures.set(pluginName, {
      generation: undefined,
      wanted: pluginOptionsSnapshot(knownPlugin).text,
      error: new HooksError(`${pluginName}: its hooks module is not loaded`),
    });
}
//@ chunk-5xgkngpb.js:4153213-4153296 placement
/**
 * 记录插件参数
 */
function setKnownArgs(state, args) {
  state.knownArgs.delete(args.pluginName);
  state.knownArgs.set(args.pluginName, args);
}
//@ chunk-5xgkngpb.js:4153296-4153576 placement
/**
 * 按新折叠表更新各名词的扣留记录。
 */
function updateWithholdingRecords(state, table, plugins) {
  for (let pluginName of plugins) {
    let filtered = [...(state.withholdings.get(pluginName) ?? [])].filter(
      (noun) => !Object.hasOwn(table, noun),
    );
    let mapped = Object.entries(table)
      .filter(([, { withheldBy }]) => withheldBy?.includes(pluginName) === true)
      .map(([key]) => key);
    if (filtered.length + mapped.length === 0) state.withholdings.delete(pluginName);
    else state.withholdings.set(pluginName, new Set([...filtered, ...mapped]));
  }
}
//@ chunk-5xgkngpb.js:4153576-4153712 placement
function stateCallsOf(scan) {
  let labelReads = (prefix, atoms = []) => atoms.map((atom) => `${prefix}:${stateAtomKey(atom)}`);
  return [...labelReads("state.get", scan.state?.reads), ...labelReads("state.set", scan.state?.writes)];
}
//@ chunk-5xgkngpb.js:4153712-4153962 placement
/**
 * 把已加载模块的名字、层级、事件、调用（含 next.to、env、state）与代号发布给渲染层。
 */
var publishRenderPlugins = (host) =>
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
      generation: host.state.generations.get(loadedModule.name) ?? 0,
    })),
  );
//@ chunk-5xgkngpb.js:4153962-4154406 placement
/**
 * 重新折叠时的基线：核心方法表加上次折叠表中除去指定插件后的部分。
 */
function foldBaseWithout_2(state, removed, order) {
  let beneath = new Map();
  for (let [key, value] of Object.entries(coreInterfaceTable_2())) {
    let existing = Object.hasOwn(state.lastTable, key) ? state.lastTable[key] : undefined;
    beneath.set(key, existing ? dropWithholders(existing, removed) : value);
  }
  for (let [key, value] of Object.entries(state.lastTable)) {
    let dropped = dropWithholders(value, removed);
    if (!removed.has(value.owner) || dropped.withheldBy) beneath.set(key, dropped);
  }
  let owned = {};
  for (let [key, value] of Object.entries(state.lastOwners)) if (!removed.has(value)) owned[key] = value;
  let lastEndedBy = state.lastEndedBy;
  let keepsEndedBy = lastEndedBy !== undefined && !removed.has(lastEndedBy);
  return {
    beneath: Object.fromEntries(beneath),
    endedBy: keepsEndedBy ? lastEndedBy : undefined,
    owned,
    order,
  };
}
//@ chunk-5xgkngpb.js:4154406-4154450 placement
/**
 * 去掉该插件的折叠基线
 */
var foldBaseWithout = (state, pluginName) =>
  foldBaseWithout_2(state, new Set([pluginName]), withPluginName(state, pluginName));
//@ chunk-5xgkngpb.js:4154450-4154695 placement
/**
 * 记录重新折叠的结果，并找出未知插件的所有权。
 */
function recordRefoldResult(state, folded) {
  recordFoldResult(state, folded);
  let reloadable = new Set();
  let crashed = new Set();
  for (let [, value] of Object.entries(folded.table))
    for (let pluginName of [value.owner, ...(value.withheldBy ?? [])])
      if (pluginName !== CORE_ORIGIN && !state.knownArgs.has(pluginName))
        (state.crashedWithholders.has(pluginName) ? crashed : reloadable).add(pluginName);
  if (crashed.size > 0) reportWorkerCrashWithholdings(state, crashed);
  if (reloadable.size > 0) liftWithholdings(state, reloadable);
}
//@ chunk-5xgkngpb.js:4154695-4154772 placement
/**
 * 上次折叠摘要
 */
var lastFoldSummary = (state) => ({
  table: state.lastTable,
  endedBy: state.lastEndedBy,
  owners: state.lastOwners,
});
//@ chunk-5xgkngpb.js:4154772-4155079 placement
/**
 * 计算 worker 重生后的折叠基线（去掉扣留者中已不存在的插件）。
 */
function foldBaseForRespawn(host, respawned) {
  let state = host.state;
  let beneath = Object.create(null);
  Object.assign(beneath, coreInterfaceTable_2());
  for (let [key, value] of Object.entries(state.lastTable)) {
    let dropped = dropWithholders(
      value,
      new Set(
        (value.withheldBy ?? []).filter(
          (holder) => !state.crashedWithholders.has(holder) || respawned.includes(holder),
        ),
      ),
    );
    if (dropped.withheldBy !== undefined && (value.owner === CORE_ORIGIN || respawned.includes(value.owner)))
      beneath[key] = dropped;
  }
  return {
    beneath,
  };
}
//@ chunk-5xgkngpb.js:4155079-4155272 placement
/**
 * 从共享心跳戳中读出正在执行的插件（调用栈或当前环境）。
 */
function stackedPluginOf(state) {
  let { stamp, names } = state;
  return [
    ...Array.from(
      {
        length: stamp.length - STAMP_CALLER_STACK_START,
      },
      (unused, stackIndex) => Atomics.load(stamp, STAMP_CALLER_STACK_START + stackIndex),
    ),
    Atomics.load(stamp, STAMP_ENVIRONMENT_SLOT),
  ]
    .filter((environmentId) => environmentId !== 0)
    .map((environmentId) => names.get(environmentId))
    .find((pluginName) => pluginName !== undefined);
}
//@ chunk-5xgkngpb.js:4155272-4155374 placement
/**
 * 列出某插件捕获的进行中分发。
 */
var catchingDispatchesOf = (host, plugin) =>
  [...host.inFlight].filter(
    ([, entry]) =>
      hasToolSite(entry.event) &&
      entry.caughtBy.some((environmentId) => host.names.get(environmentId) === plugin),
  );
//@ chunk-5xgkngpb.js:4155374-4155590 placement
/**
 * 关闭某环境的消息端口，结算其待 flush 请求。
 */
function closeEnvironmentPort(state, environmentId) {
  let port = state.ports.get(environmentId);
  for (let [flushKey, deferred] of state.pendingFlushes)
    if (flushKey.startsWith(`${environmentId}:`)) {
      state.pendingFlushes.delete(flushKey);
      deferred.resolve();
    }
  state.runningOps.delete(environmentId);
  if (port !== undefined) {
    state.ports.delete(environmentId);
    port.onmessage = null;
    port.close();
  }
}
//@ chunk-5xgkngpb.js:4155590-4156051 placement
/**
 * 标记 worker 已死：中止全部进行中的分发与调用、拒绝所有待处理请求、中止宿主操作并关闭所有端口。
 */
function markWorkerDead(state, reason) {
  if (state.died !== undefined) return;
  state.died = reason;
  stopHeartbeat(state);
  for (let entry of state.inFlight.values()) {
    entry.unlink();
    for (let controller of entry.calls.values()) controller.abort(new PlainDataError(reason));
    entry.reject(new HooksError(reason));
  }
  state.inFlight.clear();
  rejectAllPending(state.pendingCalls, reason);
  rejectAllPending(state.pendingPresses, reason);
  rejectAllPending(state.pendingResolves, reason);
  rejectAllPending(state.pendingBuilds, reason);
  rejectAllPending(state.pendingLoads, reason);
  rejectAllPending(state.pendingFlushes, reason);
  for (let opController of state.opControllers.values()) opController.abort(new HooksError(reason));
  state.opControllers.clear();
  endOpStreams(state);
  for (let key of [...state.ports.keys()]) closeEnvironmentPort(state, key);
}
//@ chunk-5xgkngpb.js:4156051-4156078 placement
/**
 * 失效工具描述等缓存
 */
function invalidateDescribeCaches() {
  invalidateToolDescriptions_2();
  forget();
}
//@ chunk-5xgkngpb.js:4156078-4156188 placement
/**
 * $.ui.invalidate 可失效的缓存：prompt.section、prompt.context、prompt.attachment、tool.describe。
 */
var UI_INVALIDATORS; // deferred: uses invalidatePromptSections (./promptComposition.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4156078", () => {
  UI_INVALIDATORS = {
    "prompt.section": invalidatePromptSections,
    "prompt.context": invalidatePromptContext,
    "prompt.attachment": invalidatePromptAttachments,
    "tool.describe": () => {
      redescribeTools();
      invalidateDescribeCaches();
    },
  };
});
//@ chunk-5xgkngpb.js:4156188-4156265 placement
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
