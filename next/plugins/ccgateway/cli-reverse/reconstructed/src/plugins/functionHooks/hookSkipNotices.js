/**
 * plugins/functionHooks/hookSkipNotices.ts
 *
 * 2.1.316 新增：插件钩子被跳过、调用被拒、结果被扣留时的提示与遥测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (25)
 * attribution: placement 25
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { dirname } from "path";
import { loadedModuleArgs } from "../hooksModules/loadedModuleFilters.js";
import {
  approvalLabelOrUnnamed,
  queueModelNotice,
  validatePassedBySighting,
  runInCallerScope,
  emptyToolCallResult,
  flushEnvironmentPort,
} from "./hooksWorkerHost.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { MAX_KEPT_TEXT_CHARS } from "./sites/siteRules.js";
import { uiLog, NEXT_NOT_CLONEABLE, reportPluginProblem } from "./hooksWorkerClient.js";
import { reportInlinePluginNotice, copyRegistrations } from "./hooksModuleLoader.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { getSessionId } from "../../bootstrap/state.js";
import { recordSkipNotices, MAX_TRACKED_SKIP_KEYS, NO_FLOORS } from "./dispatch/chain.js";
import { HOOK_TIER_ORDER } from "./builtinHooksModule.js";
import { takePending } from "./hostBridge.js";
import { postToWorker } from "./sameThreadHost.js";
import { HooksError } from "./hooksErrors.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { isSessionFileAt } from "../../utils/sessionStorage.js";
import { reloadControllerSlot } from "./pluginLifecycle.js";
import { scrubLine } from "./ui/textScrub.js";
import { logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4196841-4196943 placement
function describeSkippedHook(event, by) {
  return `its ${event} hook was skipped. "${by}" runs first and sent the event on past it.`;
}
//@ chunk-5xgkngpb.js:4196943-4197260 placement
/**
 * 个人插件的钩子被跳过时，告诉该插件作者一次。
 */
function tellSkippedPersonsHook(ctx, name, sighting) {
  try {
    let { event, by } = sighting;
    let args = loadedModuleArgs(name);
    let thirdPlugin = ctx.state.knownPlugins.get(by);
    if (args?.isPersons !== true || thirdPlugin === undefined) return;
    let label = approvalLabelOrUnnamed(name);
    let text = truncateToLength(
      describeSkippedHook(event, approvalLabelOrUnnamed(getPluginDisplayName(thirdPlugin))),
      MAX_KEPT_TEXT_CHARS,
    );
    uiLog(name, text);
    reportInlinePluginNotice(
      {
        name: label,
        source: args.pluginStorageId,
      },
      text,
    );
    queueModelNotice(`${label}: ${text}`);
  } catch (error) {
    logForDebugging(`${name}: telling of its skipped ${sighting.event} hook failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-5xgkngpb.js:4197260-4197271 placement
/**
 * 16
 */
var MAX_TAG_DEPTH = 16;
//@ chunk-5xgkngpb.js:4197271-4197515 placement
function passedByMapForSession(session) {
  let hooksPassedBy = getPluginRegistry().hooksPassedBy;
  let sessionId = String(getSessionId());
  let key = session === "" ? sessionId : session;
  let map = hooksPassedBy.get(key);
  if (map !== undefined) {
    hooksPassedBy.delete(key);
    hooksPassedBy.set(key, map);
  }
  if (map !== undefined || key !== sessionId) return map;
  let fresh = new Map();
  let oldest = hooksPassedBy.keys().next();
  if (hooksPassedBy.size >= MAX_TAG_DEPTH && oldest.done !== true) hooksPassedBy.delete(oldest.value);
  hooksPassedBy.set(key, fresh);
  return fresh;
}
//@ chunk-5xgkngpb.js:4197515-4197677 placement
/**
 * 记录一次"钩子被更高层越过"的观察：校验后计数，对首次出现的个人插件提示用户。
 */
function recordPassedBySighting(sighting, plugin) {
  let problem = validatePassedBySighting(sighting, plugin);
  if (problem !== undefined) {
    logForDebugging(`passed-by: a sighting was refused: ${problem}`, {
      level: "error",
    });
    return;
  }
  for (let entry of recordSkipNotices(passedByMapForSession(plugin.session), plugin))
    tellSkippedPersonsHook(sighting, entry, plugin);
}
//@ chunk-5xgkngpb.js:4197677-4198084 placement
/**
 * 判断值是否为合法的"被经过"记录（link 与插件列表）。
 */
function isPassedBySighting(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    "link" in value &&
    typeof value.link === "string" &&
    "plugins" in value &&
    Array.isArray(value.plugins) &&
    value.plugins.length <= MAX_TRACKED_SKIP_KEYS &&
    Array.from(value.plugins).every((plugin) => typeof plugin === "string") &&
    "tier" in value &&
    HOOK_TIER_ORDER.some((by) => by === value.tier) &&
    "event" in value &&
    typeof value.event === "string" &&
    "by" in value &&
    typeof value.by === "string" &&
    "count" in value &&
    typeof value.count === "number" &&
    "session" in value &&
    typeof value.session === "string"
  );
}
//@ chunk-5xgkngpb.js:4198084-4198357 placement
/**
 * 接收 hooks worker 发来的越过记录，校验形状后记录。
 */
function acceptWorkerPassedBy(sighting, sighting_2) {
  if (!isPassedBySighting(sighting_2)) {
    logForDebugging("passed-by: a hooks worker's sighting was refused: it is not shaped as one", {
      level: "error",
    });
    return;
  }
  try {
    recordPassedBySighting(sighting, {
      ...sighting_2,
      session: "",
    });
  } catch (error) {
    logForDebugging(
      `passed-by: a sighting of ${approvalLabelOrUnnamed(sighting_2.link)} on ${approvalLabelOrUnnamed(sighting_2.event)} was not recorded: ` +
        errorMessage(error),
      {
        level: "error",
      },
    );
  }
}
//@ chunk-5xgkngpb.js:4198357-4198516 placement
/**
 * 构造 hook.failed 事件。
 */
var toHookFailedEvent = ({ plugin, environmentId, event, reason, effect, hasOverrun, skip }) => ({
  plugin,
  environmentId,
  event,
  reason,
  effect,
  hasOverrun,
  skip,
});
//@ chunk-5xgkngpb.js:4198516-4198681 placement
/**
 * 把插件标记为在进行中的分发里已失败。
 */
function markInFlightFailed(state, hookFailedEvent) {
  let isApplied = hookFailedEvent.skip?.kind !== "unapplied";
  for (let frame of state.inFlight.values())
    if (
      isApplied &&
      frame.environments.some((environment) => state.names.get(environment) === hookFailedEvent.plugin)
    )
      frame.failed.add(hookFailedEvent.plugin);
}
//@ chunk-5xgkngpb.js:4198681-4199041 placement
/**
 * 处理 worker 的加载完成消息：解析注册表后完成等待；无等待或解析失败时通知卸载。
 */
function settlePendingLoad(state, env) {
  let pending = takePending(state.pendingLoads, env.environmentId);
  if (pending === undefined) {
    postToWorker(state, {
      type: "unload",
      environmentId: env.environmentId,
    });
    return;
  }
  let registered;
  try {
    registered = copyRegistrations(
      env.registered,
      state.names.get(env.environmentId) ?? String(env.environmentId),
    );
  } catch (error) {
    postToWorker(state, {
      type: "unload",
      environmentId: env.environmentId,
    });
    pending.reject(error instanceof Error ? error : new HooksError(String(error)));
    return;
  }
  pending.resolve({
    registered,
  });
}
//@ chunk-5xgkngpb.js:4199041-4199571 placement
/**
 * 处理 worker 的 next 请求：调用宿主侧的下层链并把结果或错误回传 worker。
 */
function handleWorkerNext(state, msg) {
  let { id, nextId } = msg;
  let frame = state.inFlight.get(id);
  if (frame === undefined) {
    postToWorker(state, {
      type: "next_error",
      id,
      nextId,
      error: "dispatch settled",
    });
    return;
  }
  let abortController = new AbortController();
  frame.calls.set(nextId, abortController);
  runInCallerScope(frame, () => frame.next(msg.argument, abortController.signal, msg.floors))
    .finally(() => frame.calls.delete(nextId))
    .then(
      (value) => {
        try {
          postToWorker(state, {
            type: "next_result",
            id,
            nextId,
            result: value,
          });
        } catch (error) {
          let secondValue = emptyToolCallResult(frame.event, value);
          postToWorker(
            state,
            secondValue === undefined
              ? {
                  type: "next_error",
                  id,
                  nextId,
                  error: NEXT_NOT_CLONEABLE(error),
                }
              : {
                  type: "next_result",
                  id,
                  nextId,
                  result: secondValue,
                },
          );
        }
      },
      (error) =>
        postToWorker(state, {
          type: "next_error",
          id,
          nextId,
          error: errorMessage(error),
        }),
    );
}
//@ chunk-5xgkngpb.js:4199571-4199758 placement
function openWorkerStream({ stream, pending, frame }) {
  let abortController = new AbortController();
  pending.calls.set(frame.nextId, abortController);
  let secondStream = stream.open(
    frame.open?.argument,
    abortController.signal,
    frame.open?.floors ?? NO_FLOORS,
  );
  stream.opened.set(frame.nextId, secondStream);
  return secondStream;
}
//@ chunk-5xgkngpb.js:4199758-4200577 placement
/**
 * 处理 worker 的流式 next：打开或继续宿主侧流，逐块回传 next_step，结束或出错时清理。
 */
function handleWorkerStreamNext(state, msg) {
  let { id, nextId } = msg;
  let frame = state.inFlight.get(id);
  let stream = frame?.stream;
  if (stream === undefined || frame === undefined) {
    postToWorker(state, {
      type: "next_error",
      id,
      nextId,
      error: "dispatch settled",
    });
    return;
  }
  let value = stream.opened.get(nextId);
  if (value === undefined && msg.open === undefined) {
    postToWorker(state, {
      type: "next_error",
      id,
      nextId,
      error: "no stream is open under this nextId",
    });
    return;
  }
  let thirdValue;
  try {
    thirdValue =
      value ??
      runInCallerScope(frame, () =>
        openWorkerStream({
          stream,
          pending: frame,
          frame: msg,
        }),
      );
  } catch (error) {
    frame.calls.delete(nextId);
    postToWorker(state, {
      type: "next_error",
      id,
      nextId,
      error: errorMessage(error),
    });
    return;
  }
  runInCallerScope(frame, () => thirdValue.next()).then(
    (fourthValue) => {
      if (fourthValue.done === true) {
        stream.opened.delete(nextId);
        frame.calls.delete(nextId);
      }
      try {
        postToWorker(state, {
          type: "next_step",
          id,
          nextId,
          step: {
            done: fourthValue.done === true,
            value: fourthValue.value,
          },
        });
      } catch (error) {
        postToWorker(state, {
          type: "next_error",
          id,
          nextId,
          error: `a chunk that is not plain data: ${errorMessage(error)}`,
        });
      }
    },
    (error) => {
      stream.opened.delete(nextId);
      frame.calls.delete(nextId);
      postToWorker(state, {
        type: "next_error",
        id,
        nextId,
        error: errorMessage(error),
      });
    },
  );
}
//@ chunk-5xgkngpb.js:4200577-4200698 placement
/**
 * 处理 worker 送来的流拉取结果，结算等待中的 pull。
 */
function handleWorkerStreamPull(state, msg) {
  let stream = state.inFlight.get(msg.id)?.stream;
  let pull = stream?.pull;
  if (stream !== undefined && pull !== undefined) {
    stream.pull = undefined;
    pull.resolve(msg.step);
  }
}
//@ chunk-5xgkngpb.js:4200698-4200980 placement
/**
 * 取出已应答的调用，借出的帧在分发结束后释放。
 */
function takeAnsweredCall(state, callId) {
  let pending = takePending(state.pendingCalls, callId);
  if (pending === undefined || pending.lent.length === 0) return pending;
  let release = () => {
    state.answeredCalls.delete(callId);
  };
  let call = pending.facts?.isDispatching?.() === true;
  state.answeredCalls.set(callId, {
    ...pending,
    facts: pending.facts && {
      ...pending.facts,
      isDispatching: () => call,
    },
  });
  flushEnvironmentPort(state, pending.callee, {
    resolve: release,
    reject: release,
  });
  return pending;
}
//@ chunk-5xgkngpb.js:4200980-4201015 placement
/**
 * 标记缓存
 */
var tagCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4200980", () => {
  tagCache = identity_2(new Map(), (map) => map.clear());
});
//@ chunk-5xgkngpb.js:4201015-4201089 placement
/**
 * plugin#env event s
 */
var tagKey = ({ plugin, environmentId, event }, kind) => `${plugin}#${environmentId ?? ""} ${event} ${kind}`;
//@ chunk-5xgkngpb.js:4201089-4201099 placement
/**
 * 5
 */
var MAX_TAGS_PER_KEY = 5;
//@ chunk-5xgkngpb.js:4201099-4201148 placement
/**
 * 已有标签或已满
 */
var hasTagOrFull = (tags, tag) => tags?.has(tag) === true || (tags?.size ?? 0) >= MAX_TAGS_PER_KEY;
//@ chunk-5xgkngpb.js:4201181-4201357 placement
function devModEnvironmentOf(plugin) {
  let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === plugin);
  return found !== undefined &&
    isSessionFileAt(dirname(found.args.pluginRoot), getSessionId()) &&
    reloadControllerSlot.get()?.watched().includes(plugin) === true
    ? found.environmentId
    : undefined;
}
//@ chunk-5xgkngpb.js:4201357-4201576 placement
function describeModFailureForModel(plugin, message, skip) {
  let hasSubject = skip.subject !== undefined;
  return [
    `Your mod failed when it ran: ${approvalLabelOrUnnamed(plugin)}: ${message}.`,
    ...(hasSubject ? [`It was drawing ${scrubLine(skip.subject ?? "")}.`] : []),
    "Edit the mod to mend it: it reloads when your turn ends.",
  ].join(" ");
}
//@ chunk-5xgkngpb.js:4201576-4201611 placement
/**
 * mod 失败上报表
 */
var modFailureReported; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4201576", () => {
  modFailureReported = identity_2(new Map(), (map) => map.clear());
});
//@ chunk-5xgkngpb.js:4201611-4202082 placement
/**
 * mod 失败时（每个插件每种原因一次）告诉模型。
 */
function tellModelOfModFailure(ctx, skip, told) {
  try {
    let { plugin, environmentId } = ctx;
    let env = skip.kind === "unapplied" ? undefined : devModEnvironmentOf(plugin);
    if (!(env !== undefined && (environmentId ?? env) === env)) return;
    let line = `${plugin}#${env}`;
    let key = modFailureReported.get(line);
    let queue = `${skip.subject?.startsWith("Pane ") ? skip.subject : ""} ${told}`;
    if (hasTagOrFull(key, queue)) return;
    modFailureReported.set(line, new Set([...(key ?? []), queue]));
    queueModelNotice(describeModFailureForModel(plugin, told, skip));
    logFeatureSad("plugin_dev_mods", "hook_skip_told_model");
  } catch (error) {
    logFeatureBad("plugin_dev_mods", "hook_skip_tell_failed");
    logForDebugging(`${ctx.plugin}: telling the model of its skipped hook failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-5xgkngpb.js:4202082-4202117 placement
/**
 * 已上报的问题集合
 */
var reportedProblems; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4202082", () => {
  reportedProblems = identity_2(new Set(), (set) => set.clear());
});
//@ chunk-5xgkngpb.js:4202117-4202717 placement
/**
 * 处理钩子被跳过/拒绝/扣留的上报：计数、必要时告知模型（开发中 mod）、首次时报告插件问题并提示个人插件。
 */
function reportHookSkip(ctx) {
  let skip = ctx.skip;
  if (skip === undefined || ctx.event === "engine.create") return;
  let key = tagKey(ctx, skip.kind);
  let count = (tagCache.get(key) ?? 0) + 1;
  tagCache.set(key, count);
  let isCallRejected = skip.isCallRejected === true;
  let isCallRefused = skip.isCallRefused === true;
  let isWithheld = skip.isResultWithheld === true;
  let kindText =
    skip.kind === "unapplied"
      ? "hook"
      : isCallRejected
        ? "call rejected"
        : isCallRefused
          ? "call refused"
          : isWithheld
            ? "result withheld"
            : "hook skipped";
  let why = isCallRejected
    ? `its hook ${skip.why}, the call interrupted`
    : isCallRefused || isWithheld
      ? `its hook ${skip.why}`
      : skip.why;
  let line = `${ctx.event} ${kindText}: ${why}`;
  tellModelOfModFailure(ctx, skip, line);
  if (count !== 1) return;
  reportPluginProblem(ctx.plugin, line);
  let seenKey = `${ctx.plugin} ${ctx.event} ${kindText}`;
  let pluginStorageId = reportedProblems.has(seenKey)
    ? undefined
    : loadedModuleArgs(ctx.plugin)?.pluginStorageId;
  if (pluginStorageId !== undefined) {
    reportedProblems.add(seenKey);
    reportInlinePluginNotice(
      {
        name: ctx.plugin,
        source: pluginStorageId,
      },
      line,
    );
  }
}
export {
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
};
