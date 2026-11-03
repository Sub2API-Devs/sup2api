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
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import { IT } from "../hooksModules/loadedModuleFilters.js";
import {
  oF,
  queueModelNotice,
  validatePassedBySighting,
  ore,
  emptyToolCallResult,
  flushEnvironmentPort,
} from "./hooksWorkerHost.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { cR } from "./sites/siteRules.js";
import { uiLog, Vni, reportPluginProblem } from "./hooksWorkerClient.js";
import { reportInlinePluginNotice, copyRegistrations } from "./hooksModuleLoader.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { getSessionId } from "../../bootstrap/state.js";
import { recordSkipNotices, hrs, freeze_4 as freeze_4_2 } from "./dispatch/chain.js";
import { hos } from "./builtinHooksModule.js";
import { XJ } from "./hostBridge.js";
import { postToWorker } from "./sameThreadHost.js";
import { HooksError } from "./hooksErrors.js";
import { ge } from "../../utils/identity.js";
import { sjt } from "../../utils/sessionStorage.js";
import { R8n } from "./pluginLifecycle.js";
import { scrubLine } from "./ui/textScrub.js";
import { logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:4090917-4091019 placement
function describeSkippedHook(e, n) {
  return `its ${e} hook was skipped. "${n}" runs first and sent the event on past it.`;
}
/**
 * 个人插件的钩子被跳过时，告诉该插件作者一次。
 */
//@ chunk-e6aww6q8.js:4091019-4091337 placement
function tellSkippedPersonsHook(e, n, r) {
  try {
    let { event: event, by: by } = r,
      y = IT(n),
      S = e.state.knownPlugins.get(by);
    if (y?.isPersons !== !0 || S === void 0) return;
    let w = oF(n),
      L = truncateToLength(describeSkippedHook(event, oF(getPluginDisplayName(S))), cR);
    (uiLog(n, L),
      reportInlinePluginNotice({ name: w, source: y.pluginStorageId }, L),
      queueModelNotice(`${w}: ${L}`));
  } catch (error) {
    logForDebugging(`${n}: telling of its skipped ${r.event} hook failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-e6aww6q8.js:4091337-4091348 placement
var pUn = 16;
//@ chunk-e6aww6q8.js:4091348-4091592 placement
function passedByMapForSession(e) {
  let hooksPassedBy = getPluginRegistry().hooksPassedBy,
    r = String(getSessionId()),
    s = e === "" ? r : e,
    h = hooksPassedBy.get(s);
  if (h !== void 0) (hooksPassedBy.delete(s), hooksPassedBy.set(s, h));
  if (h !== void 0 || s !== r) return h;
  let y = new Map(),
    S = hooksPassedBy.keys().next();
  if (hooksPassedBy.size >= pUn && S.done !== !0) hooksPassedBy.delete(S.value);
  return (hooksPassedBy.set(s, y), y);
}
/**
 * 记录一次"钩子被更高层越过"的观察：校验后计数，对首次出现的个人插件提示用户。
 */
//@ chunk-e6aww6q8.js:4091592-4091754 placement
function recordPassedBySighting(e, n) {
  let r = validatePassedBySighting(e, n);
  if (r !== void 0) {
    logForDebugging(`passed-by: a sighting was refused: ${r}`, { level: "error" });
    return;
  }
  for (let s of recordSkipNotices(passedByMapForSession(n.session), n)) tellSkippedPersonsHook(e, s, n);
}
/**
 * 判断值是否为合法的"被经过"记录（link 与插件列表）。
 */
//@ chunk-e6aww6q8.js:4091754-4092161 placement
function isPassedBySighting(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    "link" in e &&
    typeof e.link === "string" &&
    "plugins" in e &&
    Array.isArray(e.plugins) &&
    e.plugins.length <= hrs &&
    Array.from(e.plugins).every((n) => typeof n === "string") &&
    "tier" in e &&
    hos.some((n) => n === e.tier) &&
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
/**
 * 接收 hooks worker 发来的越过记录，校验形状后记录。
 */
//@ chunk-e6aww6q8.js:4092161-4092434 placement
function acceptWorkerPassedBy(e, n) {
  if (!isPassedBySighting(n)) {
    logForDebugging("passed-by: a hooks worker's sighting was refused: it is not shaped as one", {
      level: "error",
    });
    return;
  }
  try {
    recordPassedBySighting(e, { ...n, session: "" });
  } catch (error) {
    logForDebugging(
      `passed-by: a sighting of ${oF(n.link)} on ${oF(n.event)} was not recorded: ` + errorMessage(error),
      { level: "error" },
    );
  }
}
/**
 * 构造 hook.failed 事件。
 */
//@ chunk-e6aww6q8.js:4092434-4092593 placement
var toHookFailedEvent = ({
  plugin: plugin,
  environmentId: environmentId,
  event: event,
  reason: reason,
  effect: effect,
  hasOverrun: hasOverrun,
  skip: skip,
}) => ({
  plugin: plugin,
  environmentId: environmentId,
  event: event,
  reason: reason,
  effect: effect,
  hasOverrun: hasOverrun,
  skip: skip,
});
/**
 * 把插件标记为在进行中的分发里已失败。
 */
//@ chunk-e6aww6q8.js:4092593-4092758 placement
function markInFlightFailed(e, n) {
  let r = n.skip?.kind !== "unapplied";
  for (let s of e.inFlight.values())
    if (r && s.environments.some((environment) => e.names.get(environment) === n.plugin))
      s.failed.add(n.plugin);
}
/**
 * 处理 worker 的加载完成消息：解析注册表后完成等待；无等待或解析失败时通知卸载。
 */
//@ chunk-e6aww6q8.js:4092758-4093118 placement
function settlePendingLoad(e, n) {
  let r = XJ(e.pendingLoads, n.environmentId);
  if (r === void 0) {
    postToWorker(e, { type: "unload", environmentId: n.environmentId });
    return;
  }
  let s;
  try {
    s = copyRegistrations(n.registered, e.names.get(n.environmentId) ?? String(n.environmentId));
  } catch (error) {
    (postToWorker(e, { type: "unload", environmentId: n.environmentId }),
      r.reject(error instanceof Error ? error : new HooksError(String(error))));
    return;
  }
  r.resolve({ registered: s });
}
/**
 * 处理 worker 的 next 请求：调用宿主侧的下层链并把结果或错误回传 worker。
 */
//@ chunk-e6aww6q8.js:4093118-4093648 placement
function handleWorkerNext(e, n) {
  let { id: id, nextId: nextId } = n,
    h = e.inFlight.get(id);
  if (h === void 0) {
    postToWorker(e, { type: "next_error", id: id, nextId: nextId, error: "dispatch settled" });
    return;
  }
  let abortController = new AbortController();
  (h.calls.set(nextId, abortController),
    ore(h, () => h.next(n.argument, abortController.signal, n.floors))
      .finally(() => h.calls.delete(nextId))
      .then(
        (S) => {
          try {
            postToWorker(e, { type: "next_result", id: id, nextId: nextId, result: S });
          } catch (error) {
            let L = emptyToolCallResult(h.event, S);
            postToWorker(
              e,
              L === void 0
                ? { type: "next_error", id: id, nextId: nextId, error: Vni(error) }
                : { type: "next_result", id: id, nextId: nextId, result: L },
            );
          }
        },
        (S) => postToWorker(e, { type: "next_error", id: id, nextId: nextId, error: errorMessage(S) }),
      ));
}
//@ chunk-e6aww6q8.js:4093648-4093835 placement
function openWorkerStream({ stream: stream, pending: pending, frame: frame }) {
  let abortController = new AbortController();
  pending.calls.set(frame.nextId, abortController);
  let open = stream.open(frame.open?.argument, abortController.signal, frame.open?.floors ?? freeze_4_2);
  return (stream.opened.set(frame.nextId, open), open);
}
/**
 * 处理 worker 的流式 next：打开或继续宿主侧流，逐块回传 next_step，结束或出错时清理。
 */
//@ chunk-e6aww6q8.js:4093835-4094654 placement
function handleWorkerStreamNext(e, n) {
  let { id: id, nextId: nextId } = n,
    h = e.inFlight.get(id),
    y = h?.stream;
  if (y === void 0 || h === void 0) {
    postToWorker(e, { type: "next_error", id: id, nextId: nextId, error: "dispatch settled" });
    return;
  }
  let S = y.opened.get(nextId);
  if (S === void 0 && n.open === void 0) {
    postToWorker(e, {
      type: "next_error",
      id: id,
      nextId: nextId,
      error: "no stream is open under this nextId",
    });
    return;
  }
  let w;
  try {
    w = S ?? ore(h, () => openWorkerStream({ stream: y, pending: h, frame: n }));
  } catch (error) {
    (h.calls.delete(nextId),
      postToWorker(e, { type: "next_error", id: id, nextId: nextId, error: errorMessage(error) }));
    return;
  }
  ore(h, () => w.next()).then(
    (L) => {
      if (L.done === !0) (y.opened.delete(nextId), h.calls.delete(nextId));
      try {
        postToWorker(e, {
          type: "next_step",
          id: id,
          nextId: nextId,
          step: { done: L.done === !0, value: L.value },
        });
      } catch (error) {
        postToWorker(e, {
          type: "next_error",
          id: id,
          nextId: nextId,
          error: `a chunk that is not plain data: ${errorMessage(error)}`,
        });
      }
    },
    (L) => {
      (y.opened.delete(nextId),
        h.calls.delete(nextId),
        postToWorker(e, { type: "next_error", id: id, nextId: nextId, error: errorMessage(L) }));
    },
  );
}
/**
 * 处理 worker 送来的流拉取结果，结算等待中的 pull。
 */
//@ chunk-e6aww6q8.js:4094654-4094775 placement
function handleWorkerStreamPull(e, n) {
  let r = e.inFlight.get(n.id)?.stream,
    s = r?.pull;
  if (r !== void 0 && s !== void 0) ((r.pull = void 0), s.resolve(n.step));
}
/**
 * 取出已应答的调用，借出的帧在分发结束后释放。
 */
//@ chunk-e6aww6q8.js:4094775-4095057 placement
function takeAnsweredCall(e, n) {
  let r = XJ(e.pendingCalls, n);
  if (r === void 0 || r.lent.length === 0) return r;
  let s = () => {
      e.answeredCalls.delete(n);
    },
    h = r.facts?.isDispatching?.() === !0;
  return (
    e.answeredCalls.set(n, { ...r, facts: r.facts && { ...r.facts, isDispatching: () => h } }),
    flushEnvironmentPort(e, r.callee, { resolve: s, reject: s }),
    r
  );
}
//@ chunk-e6aww6q8.js:4095057-4095092 placement
var POe = ge(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:4095092-4095166 placement
var Ylt = ({ plugin: plugin, environmentId: environmentId, event: event }, s) =>
  `${plugin}#${environmentId ?? ""} ${event} ${s}`;
//@ chunk-e6aww6q8.js:4095166-4095176 placement
var EUn = 5;
//@ chunk-e6aww6q8.js:4095176-4095225 placement
var RUn = (e, n) => e?.has(n) === !0 || (e?.size ?? 0) >= EUn;
//@ chunk-e6aww6q8.js:4095258-4095434 placement
function devModEnvironmentOf(e) {
  let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === e);
  return found !== void 0 &&
    sjt(dirname_58(found.args.pluginRoot), getSessionId()) &&
    R8n.get()?.watched().includes(e) === !0
    ? found.environmentId
    : void 0;
}
//@ chunk-e6aww6q8.js:4095434-4095653 placement
function describeModFailureForModel(e, n, r) {
  let s = r.subject !== void 0;
  return [
    `Your mod failed when it ran: ${oF(e)}: ${n}.`,
    ...(s ? [`It was drawing ${scrubLine(r.subject ?? "")}.`] : []),
    "Edit the mod to mend it: it reloads when your turn ends.",
  ].join(" ");
}
//@ chunk-e6aww6q8.js:4095653-4095688 placement
var Xlt = ge(new Map(), (e) => e.clear());
/**
 * mod 失败时（每个插件每种原因一次）告诉模型。
 */
//@ chunk-e6aww6q8.js:4095688-4096159 placement
function tellModelOfModFailure(e, n, r) {
  try {
    let { plugin: plugin, environmentId: environmentId } = e,
      y = n.kind === "unapplied" ? void 0 : devModEnvironmentOf(plugin);
    if (!(y !== void 0 && (environmentId ?? y) === y)) return;
    let w = `${plugin}#${y}`,
      L = Xlt.get(w),
      q = `${n.subject?.startsWith("Pane ") ? n.subject : ""} ${r}`;
    if (RUn(L, q)) return;
    (Xlt.set(w, new Set([...(L ?? []), q])),
      queueModelNotice(describeModFailureForModel(plugin, r, n)),
      logFeatureSad("plugin_dev_mods", "hook_skip_told_model"));
  } catch (error) {
    (logFeatureBad("plugin_dev_mods", "hook_skip_tell_failed"),
      logForDebugging(`${e.plugin}: telling the model of its skipped hook failed: ${errorMessage(error)}`, {
        level: "error",
      }));
  }
}
//@ chunk-e6aww6q8.js:4096159-4096194 placement
var Qlt = ge(new Set(), (e) => e.clear());
/**
 * 处理钩子被跳过/拒绝/扣留的上报：计数、必要时告知模型（开发中 mod）、首次时报告插件问题并提示个人插件。
 */
//@ chunk-e6aww6q8.js:4096194-4096791 placement
function reportHookSkip(e) {
  let skip = e.skip;
  if (skip === void 0 || e.event === "engine.create") return;
  let r = Ylt(e, skip.kind),
    s = (POe.get(r) ?? 0) + 1;
  POe.set(r, s);
  let h = skip.isCallRejected === !0,
    y = skip.isCallRefused === !0,
    S = skip.isResultWithheld === !0,
    L =
      skip.kind === "unapplied"
        ? "hook"
        : h
          ? "call rejected"
          : y
            ? "call refused"
            : S
              ? "result withheld"
              : "hook skipped",
    G = h ? `its hook ${skip.why}, the call interrupted` : y || S ? `its hook ${skip.why}` : skip.why,
    q = `${e.event} ${L}: ${G}`;
  if ((tellModelOfModFailure(e, skip, q), s !== 1)) return;
  reportPluginProblem(e.plugin, q);
  let Z = `${e.plugin} ${e.event} ${L}`,
    Se = Qlt.has(Z) ? void 0 : IT(e.plugin)?.pluginStorageId;
  if (Se !== void 0) (Qlt.add(Z), reportInlinePluginNotice({ name: e.plugin, source: Se }, q));
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
