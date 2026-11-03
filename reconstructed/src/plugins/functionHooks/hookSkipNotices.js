/**
 * plugins/functionHooks/hookSkipNotices.ts
 *
 * 2.1.316 新增：插件钩子被跳过、调用被拒、结果被扣留时的提示与遥测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (25)
 * attribution: placement 25
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
import { recordSkipNotices, MAX_TRACKED_SKIP_KEYS, Y6t } from "./dispatch/chain.js";
import { HOOK_TIER_ORDER } from "./builtinHooksModule.js";
import { takePending } from "./hostBridge.js";
import { postToWorker } from "./sameThreadHost.js";
import { HooksError } from "./hooksErrors.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { isSessionFileAt } from "../../utils/sessionStorage.js";
import { reloadControllerSlot } from "./pluginLifecycle.js";
import { scrubLine } from "./ui/textScrub.js";
import { logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:4090917-4091019 placement
function describeSkippedHook(event, n) {
  return `its ${event} hook was skipped. "${n}" runs first and sent the event on past it.`;
}
//@ chunk-e6aww6q8.js:4091019-4091337 placement
/**
 * 个人插件的钩子被跳过时，告诉该插件作者一次。
 */
function tellSkippedPersonsHook(e, n, r) {
  try {
    let { event, by } = r;
    let y = loadedModuleArgs(n);
    let S = e.state.knownPlugins.get(by);
    if (y?.isPersons !== true || S === undefined) return;
    let w = approvalLabelOrUnnamed(n);
    let L = truncateToLength(
      describeSkippedHook(event, approvalLabelOrUnnamed(getPluginDisplayName(S))),
      MAX_KEPT_TEXT_CHARS,
    );
    uiLog(n, L);
    reportInlinePluginNotice(
      {
        name: w,
        source: y.pluginStorageId,
      },
      L,
    );
    queueModelNotice(`${w}: ${L}`);
  } catch (error) {
    logForDebugging(`${n}: telling of its skipped ${r.event} hook failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-e6aww6q8.js:4091337-4091348 placement
/**
 * 16
 */
var MAX_TAG_DEPTH = 16;
//@ chunk-e6aww6q8.js:4091348-4091592 placement
function passedByMapForSession(session) {
  let hooksPassedBy = getPluginRegistry().hooksPassedBy;
  let r = String(getSessionId());
  let s = session === "" ? r : session;
  let h = hooksPassedBy.get(s);
  if (h !== undefined) {
    hooksPassedBy.delete(s);
    hooksPassedBy.set(s, h);
  }
  if (h !== undefined || s !== r) return h;
  let y = new Map();
  let S = hooksPassedBy.keys().next();
  if (hooksPassedBy.size >= MAX_TAG_DEPTH && S.done !== true) hooksPassedBy.delete(S.value);
  hooksPassedBy.set(s, y);
  return y;
}
//@ chunk-e6aww6q8.js:4091592-4091754 placement
/**
 * 记录一次"钩子被更高层越过"的观察：校验后计数，对首次出现的个人插件提示用户。
 */
function recordPassedBySighting(e, n) {
  let r = validatePassedBySighting(e, n);
  if (r !== undefined) {
    logForDebugging(`passed-by: a sighting was refused: ${r}`, {
      level: "error",
    });
    return;
  }
  for (let s of recordSkipNotices(passedByMapForSession(n.session), n)) tellSkippedPersonsHook(e, s, n);
}
//@ chunk-e6aww6q8.js:4091754-4092161 placement
/**
 * 判断值是否为合法的"被经过"记录（link 与插件列表）。
 */
function isPassedBySighting(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    "link" in e &&
    typeof e.link === "string" &&
    "plugins" in e &&
    Array.isArray(e.plugins) &&
    e.plugins.length <= MAX_TRACKED_SKIP_KEYS &&
    Array.from(e.plugins).every((plugin) => typeof plugin === "string") &&
    "tier" in e &&
    HOOK_TIER_ORDER.some((n) => n === e.tier) &&
    "event" in e &&
    typeof e.event === "string" &&
    "by" in e &&
    typeof e.by === "string" &&
    "count" in e &&
    typeof e.count === "number" &&
    "session" in e &&
    typeof e.session === "string"
  );
}
//@ chunk-e6aww6q8.js:4092161-4092434 placement
/**
 * 接收 hooks worker 发来的越过记录，校验形状后记录。
 */
function acceptWorkerPassedBy(host, sighting) {
  if (!isPassedBySighting(sighting)) {
    logForDebugging("passed-by: a hooks worker's sighting was refused: it is not shaped as one", {
      level: "error",
    });
    return;
  }
  try {
    recordPassedBySighting(host, {
      ...sighting,
      session: "",
    });
  } catch (error) {
    logForDebugging(
      `passed-by: a sighting of ${approvalLabelOrUnnamed(sighting.link)} on ${approvalLabelOrUnnamed(sighting.event)} was not recorded: ` +
        errorMessage(error),
      {
        level: "error",
      },
    );
  }
}
//@ chunk-e6aww6q8.js:4092434-4092593 placement
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
//@ chunk-e6aww6q8.js:4092593-4092758 placement
/**
 * 把插件标记为在进行中的分发里已失败。
 */
function markInFlightFailed(e, hookFailedEvent) {
  let r = hookFailedEvent.skip?.kind !== "unapplied";
  for (let s of e.inFlight.values())
    if (r && s.environments.some((environment) => e.names.get(environment) === hookFailedEvent.plugin))
      s.failed.add(hookFailedEvent.plugin);
}
//@ chunk-e6aww6q8.js:4092758-4093118 placement
/**
 * 处理 worker 的加载完成消息：解析注册表后完成等待；无等待或解析失败时通知卸载。
 */
function settlePendingLoad(e, n) {
  let r = takePending(e.pendingLoads, n.environmentId);
  if (r === undefined) {
    postToWorker(e, {
      type: "unload",
      environmentId: n.environmentId,
    });
    return;
  }
  let registered;
  try {
    registered = copyRegistrations(n.registered, e.names.get(n.environmentId) ?? String(n.environmentId));
  } catch (error) {
    postToWorker(e, {
      type: "unload",
      environmentId: n.environmentId,
    });
    r.reject(error instanceof Error ? error : new HooksError(String(error)));
    return;
  }
  r.resolve({
    registered,
  });
}
//@ chunk-e6aww6q8.js:4093118-4093648 placement
/**
 * 处理 worker 的 next 请求：调用宿主侧的下层链并把结果或错误回传 worker。
 */
function handleWorkerNext(e, n) {
  let { id, nextId } = n;
  let h = e.inFlight.get(id);
  if (h === undefined) {
    postToWorker(e, {
      type: "next_error",
      id,
      nextId,
      error: "dispatch settled",
    });
    return;
  }
  let abortController = new AbortController();
  h.calls.set(nextId, abortController);
  runInCallerScope(h, () => h.next(n.argument, abortController.signal, n.floors))
    .finally(() => h.calls.delete(nextId))
    .then(
      (S) => {
        try {
          postToWorker(e, {
            type: "next_result",
            id,
            nextId,
            result: S,
          });
        } catch (error) {
          let L = emptyToolCallResult(h.event, S);
          postToWorker(
            e,
            L === undefined
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
                  result: L,
                },
          );
        }
      },
      (error) =>
        postToWorker(e, {
          type: "next_error",
          id,
          nextId,
          error: errorMessage(error),
        }),
    );
}
//@ chunk-e6aww6q8.js:4093648-4093835 placement
function openWorkerStream({ stream, pending, frame }) {
  let abortController = new AbortController();
  pending.calls.set(frame.nextId, abortController);
  let h = stream.open(frame.open?.argument, abortController.signal, frame.open?.floors ?? Y6t);
  stream.opened.set(frame.nextId, h);
  return h;
}
//@ chunk-e6aww6q8.js:4093835-4094654 placement
/**
 * 处理 worker 的流式 next：打开或继续宿主侧流，逐块回传 next_step，结束或出错时清理。
 */
function handleWorkerStreamNext(e, n) {
  let { id, nextId } = n;
  let h = e.inFlight.get(id);
  let stream = h?.stream;
  if (stream === undefined || h === undefined) {
    postToWorker(e, {
      type: "next_error",
      id,
      nextId,
      error: "dispatch settled",
    });
    return;
  }
  let S = stream.opened.get(nextId);
  if (S === undefined && n.open === undefined) {
    postToWorker(e, {
      type: "next_error",
      id,
      nextId,
      error: "no stream is open under this nextId",
    });
    return;
  }
  let w;
  try {
    w =
      S ??
      runInCallerScope(h, () =>
        openWorkerStream({
          stream,
          pending: h,
          frame: n,
        }),
      );
  } catch (error) {
    h.calls.delete(nextId);
    postToWorker(e, {
      type: "next_error",
      id,
      nextId,
      error: errorMessage(error),
    });
    return;
  }
  runInCallerScope(h, () => w.next()).then(
    (L) => {
      if (L.done === true) {
        stream.opened.delete(nextId);
        h.calls.delete(nextId);
      }
      try {
        postToWorker(e, {
          type: "next_step",
          id,
          nextId,
          step: {
            done: L.done === true,
            value: L.value,
          },
        });
      } catch (error) {
        postToWorker(e, {
          type: "next_error",
          id,
          nextId,
          error: `a chunk that is not plain data: ${errorMessage(error)}`,
        });
      }
    },
    (error) => {
      stream.opened.delete(nextId);
      h.calls.delete(nextId);
      postToWorker(e, {
        type: "next_error",
        id,
        nextId,
        error: errorMessage(error),
      });
    },
  );
}
//@ chunk-e6aww6q8.js:4094654-4094775 placement
/**
 * 处理 worker 送来的流拉取结果，结算等待中的 pull。
 */
function handleWorkerStreamPull(e, n) {
  let stream = e.inFlight.get(n.id)?.stream;
  let pull = stream?.pull;
  if (stream !== undefined && pull !== undefined) {
    stream.pull = undefined;
    pull.resolve(n.step);
  }
}
//@ chunk-e6aww6q8.js:4094775-4095057 placement
/**
 * 取出已应答的调用，借出的帧在分发结束后释放。
 */
function takeAnsweredCall(e, callId) {
  let r = takePending(e.pendingCalls, callId);
  if (r === undefined || r.lent.length === 0) return r;
  let s = () => {
    e.answeredCalls.delete(callId);
  };
  let h = r.facts?.isDispatching?.() === true;
  e.answeredCalls.set(callId, {
    ...r,
    facts: r.facts && {
      ...r.facts,
      isDispatching: () => h,
    },
  });
  flushEnvironmentPort(e, r.callee, {
    resolve: s,
    reject: s,
  });
  return r;
}
//@ chunk-e6aww6q8.js:4095057-4095092 placement
/**
 * 标记缓存
 */
var tagCache = identity_2(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:4095092-4095166 placement
/**
 * plugin#env event s
 */
var tagKey = ({ plugin, environmentId, event }, kind) => `${plugin}#${environmentId ?? ""} ${event} ${kind}`;
//@ chunk-e6aww6q8.js:4095166-4095176 placement
/**
 * 5
 */
var MAX_TAGS_PER_KEY = 5;
//@ chunk-e6aww6q8.js:4095176-4095225 placement
/**
 * 已有标签或已满
 */
var hasTagOrFull = (e, n) => e?.has(n) === true || (e?.size ?? 0) >= MAX_TAGS_PER_KEY;
//@ chunk-e6aww6q8.js:4095258-4095434 placement
function devModEnvironmentOf(plugin) {
  let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === plugin);
  return found !== undefined &&
    isSessionFileAt(dirname(found.args.pluginRoot), getSessionId()) &&
    reloadControllerSlot.get()?.watched().includes(plugin) === true
    ? found.environmentId
    : undefined;
}
//@ chunk-e6aww6q8.js:4095434-4095653 placement
function describeModFailureForModel(plugin, n, r) {
  let s = r.subject !== undefined;
  return [
    `Your mod failed when it ran: ${approvalLabelOrUnnamed(plugin)}: ${n}.`,
    ...(s ? [`It was drawing ${scrubLine(r.subject ?? "")}.`] : []),
    "Edit the mod to mend it: it reloads when your turn ends.",
  ].join(" ");
}
//@ chunk-e6aww6q8.js:4095653-4095688 placement
/**
 * mod 失败上报表
 */
var modFailureReported = identity_2(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:4095688-4096159 placement
/**
 * mod 失败时（每个插件每种原因一次）告诉模型。
 */
function tellModelOfModFailure(e, skip, r) {
  try {
    let { plugin, environmentId } = e;
    let y = skip.kind === "unapplied" ? undefined : devModEnvironmentOf(plugin);
    if (!(y !== undefined && (environmentId ?? y) === y)) return;
    let w = `${plugin}#${y}`;
    let L = modFailureReported.get(w);
    let q = `${skip.subject?.startsWith("Pane ") ? skip.subject : ""} ${r}`;
    if (hasTagOrFull(L, q)) return;
    modFailureReported.set(w, new Set([...(L ?? []), q]));
    queueModelNotice(describeModFailureForModel(plugin, r, skip));
    logFeatureSad("plugin_dev_mods", "hook_skip_told_model");
  } catch (error) {
    logFeatureBad("plugin_dev_mods", "hook_skip_tell_failed");
    logForDebugging(`${e.plugin}: telling the model of its skipped hook failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-e6aww6q8.js:4096159-4096194 placement
/**
 * 已上报的问题集合
 */
var reportedProblems = identity_2(new Set(), (e) => e.clear());
//@ chunk-e6aww6q8.js:4096194-4096791 placement
/**
 * 处理钩子被跳过/拒绝/扣留的上报：计数、必要时告知模型（开发中 mod）、首次时报告插件问题并提示个人插件。
 */
function reportHookSkip(e) {
  let skip = e.skip;
  if (skip === undefined || e.event === "engine.create") return;
  let r = tagKey(e, skip.kind);
  let s = (tagCache.get(r) ?? 0) + 1;
  tagCache.set(r, s);
  let h = skip.isCallRejected === true;
  let y = skip.isCallRefused === true;
  let S = skip.isResultWithheld === true;
  let L =
    skip.kind === "unapplied"
      ? "hook"
      : h
        ? "call rejected"
        : y
          ? "call refused"
          : S
            ? "result withheld"
            : "hook skipped";
  let G = h ? `its hook ${skip.why}, the call interrupted` : y || S ? `its hook ${skip.why}` : skip.why;
  let q = `${e.event} ${L}: ${G}`;
  tellModelOfModFailure(e, skip, q);
  if (s !== 1) return;
  reportPluginProblem(e.plugin, q);
  let Z = `${e.plugin} ${e.event} ${L}`;
  let pluginStorageId = reportedProblems.has(Z) ? undefined : loadedModuleArgs(e.plugin)?.pluginStorageId;
  if (pluginStorageId !== undefined) {
    reportedProblems.add(Z);
    reportInlinePluginNotice(
      {
        name: e.plugin,
        source: pluginStorageId,
      },
      q,
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
