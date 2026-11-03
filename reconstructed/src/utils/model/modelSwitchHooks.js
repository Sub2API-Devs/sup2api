/**
 * utils/model/modelSwitchHooks.ts
 *
 * 2.1.316 新增：切换模型前后的 Pre/PostModelSwitch 钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (23)
 * attribution: placement 23
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { isUnservedFamilySpelling } from "./model.js";
import { isExemptDefaultResolvingPick, isModelAllowedUnderActiveEnforcement } from "./defaultModel.js";
import { isModelAllowed, noteHonoredSessionModel, keepsHonoredModelOnCachedDeny } from "./modelAllowlist.js";
import {
  stepDownRestrictedFamilyAliasPick,
  getDefaultMainLoopModelSetting,
  planModeConstituentModel,
  isModeDependentModelSetting,
} from "./planModeModel.js";
import { getDefaultMainLoopModel } from "./modelFallback.js";
import { parseUserSpecifiedModel } from "./modelDisplay.js";
import { Lt } from "./modelIds.js";
import {
  pluginHooksMayBeUnregistered,
  pendingPluginHookRegistration,
  pluginHooksUnknownCause,
  failedPluginHookRegistration,
} from "../plugins/loadPluginHooks.js";
import {
  hasHookForEvent,
  createBaseHookInput,
  hookInputCwd,
  executeHooks,
  getNonBlockableHookErrorMessage,
} from "../hooks.js";
import { isUnresolvedInferenceProfile, getInferenceProfileBackingModel } from "./bedrock.js";
import { F9e } from "../../services/api/claude.js";
import { hookModelMatchKey, isRecognizedModelKey } from "./canonicalModelName.js";
import { iKo } from "../hooks/hookEvents.js";
import { logForDebugging } from "../debug.js";
import { StreamClosedAbortError } from "../errors.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

//@ chunk-e6aww6q8.js:3423115-3423158 placement
function emn(e) {
  return resolveAllowedModelPick(e, "runs_turns");
}
//@ chunk-e6aww6q8.js:3423158-3423370 placement
function resolveAllowedModelPick(e, n) {
  if (e == null) return null;
  if (isUnservedFamilySpelling(e)) return null;
  if (isExemptDefaultResolvingPick(e)) return e;
  let r = isModelAllowedUnderActiveEnforcement(e);
  if (r ?? isModelAllowed(e)) {
    if (r === null && n === "runs_turns") noteHonoredSessionModel(e);
    return e;
  }
  if (r === null && n === "runs_turns" && keepsHonoredModelOnCachedDeny(e)) return e;
  return stepDownRestrictedFamilyAliasPick(e);
}
/**
 * 计算模型切换的目标：与当前相同或解析后相同时返回 null。
 */
//@ chunk-e6aww6q8.js:3423370-3423628 placement
function getModelSwitchTarget(e, n) {
  let r = emn(e);
  if (r === null) return null;
  if (n !== null && r.trim().toLowerCase() === n.trim().toLowerCase()) return null;
  let s = resolveAllowedModelPick(n, "idle_base");
  if (cxn(r) || cxn(s)) return r;
  let h = s === null ? getDefaultMainLoopModel() : parseUserSpecifiedModel(s);
  return parseUserSpecifiedModel(r).toLowerCase() === h.toLowerCase() ? null : r;
}
//@ chunk-e6aww6q8.js:3423628-3423715 placement = useMainLoopModel (1)
function useMainLoopModel(e) {
  return getModelSwitchTarget(e.mainLoopModelForSession, e.mainLoopModel) ?? e.mainLoopModel;
}
/**
 * 解析实际生效的模型（计划模式下取计划模式的组成模型）。
 */
//@ chunk-e6aww6q8.js:3423715-3423815 placement
function resolveEffectiveModel(e, n) {
  let r = e ?? getDefaultMainLoopModelSetting();
  if (n === "plan") {
    let s = planModeConstituentModel(r);
    if (s !== null) return s.model;
  }
  return parseUserSpecifiedModel(r);
}
//@ chunk-e6aww6q8.js:3423815-3423897 placement = useMainLoopModel (1)
function useMainLoopModel_2(e) {
  return emn(e.mainLoopModelForSession) ?? emn(e.mainLoopModel) ?? null;
}
//@ chunk-e6aww6q8.js:3423897-3423960 placement
function bk(e) {
  return resolveEffectiveModel(useMainLoopModel_2(e), e.toolPermissionContext.mode);
}
//@ chunk-e6aww6q8.js:3423960-3424024 placement
function cxn(e) {
  return e !== null && isModeDependentModelSetting(Lt(e.trim().toLowerCase()));
}
//@ chunk-e6aww6q8.js:3424024-3424109 placement
function WZ(e) {
  if (pluginHooksMayBeUnregistered()) return !0;
  return hasHookForEvent("PreModelSwitch", ptt.of(e).registry, e.id);
}
/**
 * 切换模型前运行 PreModelSwitch 钩子，钩子可阻止切换。
 */
//@ chunk-e6aww6q8.js:3424109-3425659 placement
async function runPreModelSwitchHooks(e, n, r = {}) {
  let s = [];
  await pendingPluginHookRegistration();
  let h = await pluginHooksUnknownCause(!0);
  if (h !== void 0)
    return {
      decision: "block",
      reason: `${h}, so organization-managed PreModelSwitch hooks could not be checked. Switching models again re-checks; details are in the debug log`,
      messages: s,
    };
  if (!WZ(e)) return { decision: "proceed", skipConfirm: !1, messages: s };
  if (isUnresolvedInferenceProfile(n.toModel)) await getInferenceProfileBackingModel(n.toModel);
  let y = {
      ...createBaseHookInput(e, hookInputCwd()),
      hook_event_name: "PreModelSwitch",
      from_model: n.fromModel,
      to_model: n.toModel,
      requested_model: n.requestedModel,
      source: n.source,
      ...F9e(n.toModel),
    },
    S = hookModelMatchKey(n.toModel),
    w,
    L,
    G = !1,
    q = !1;
  try {
    for await (let Z of executeHooks({
      session: e,
      hookInput: y,
      toolUseID: randomUUID_35(),
      matchQuery: isRecognizedModelKey(S) ? S : void 0,
      sessionHooks: ptt.of(e).registry,
      signal: r.signal,
      timeoutMs: r.timeoutMs ?? iKo,
    })) {
      if (
        (collectPreSwitchHookMessages(Z.message, s),
        Z.message?.type === "attachment" &&
          Z.message.attachment.type === "hook_cancelled" &&
          !r.signal?.aborted)
      )
        w ??= `PreModelSwitch hook ${Z.message.attachment.hookName} did not respond before its timeout`;
      if (Z.blockingError) w ??= Z.blockingError.blockingError;
      else if (Z.permissionBehavior === "ask") ((G = !0), (L ??= Z.hookPermissionDecisionReason));
      else if (Z.permissionBehavior === "allow") q = !0;
    }
  } catch (error) {
    (logForDebugging(
      `PreModelSwitch hooks did not complete: ${error instanceof StreamClosedAbortError ? "control stream closed" : String(error)}`,
      { level: "error" },
    ),
      (w ??=
        error instanceof StreamClosedAbortError
          ? "PreModelSwitch hooks were cancelled (the control stream closed) before answering"
          : "a PreModelSwitch hook failed before answering"));
  }
  if (w !== void 0) return { decision: "block", reason: w, messages: s };
  if (G) return { decision: "ask", reason: L, messages: s };
  return { decision: "proceed", skipConfirm: q, messages: s };
}
//@ chunk-e6aww6q8.js:3425659-3425681 placement
class hxn {
  next = void 0;
}
//@ chunk-e6aww6q8.js:3425681-3425709 placement
var _xn = new SessionRootSlot(() => new hxn());
//@ chunk-e6aww6q8.js:3425709-3425772 placement
function jMr(e, n, r) {
  _xn.of(e).next = { source: n, requestedModel: r };
}
//@ chunk-e6aww6q8.js:3425772-3425851 placement
function zE(e, n, r, s) {
  if (bk(n) !== resolveEffectiveModel(r, n.toolPermissionContext.mode)) jMr(e, s, r);
}
/**
 * 取出并清除下一次模型切换的来源（默认 auto）。
 */
//@ chunk-e6aww6q8.js:3425851-3425952 placement
function takePendingSwitchSource(e) {
  let of = _xn.of(e),
    r = of.next ?? { source: "auto", requestedModel: null };
  return ((of.next = void 0), r);
}
//@ chunk-e6aww6q8.js:3425952-3426004 placement
class Sxn {
  pending = [];
  landedOn = null;
  inFlight = new Set();
}
//@ chunk-e6aww6q8.js:3426004-3426032 placement
var kxn = new SessionRootSlot(() => new Sxn());
/**
 * 切换模型后运行 PostModelSwitch 钩子。
 */
//@ chunk-e6aww6q8.js:3426032-3427430 placement
function runPostModelSwitchHooks(e, n, r = {}) {
  let of = kxn.of(e),
    id = e.id;
  of.landedOn = { sessionId: id, toModel: n.toModel };
  let S = (async () => {
    await pendingPluginHookRegistration();
    let w = (await pluginHooksUnknownCause(!1)) ?? (await failedPluginHookRegistration());
    if (w !== void 0)
      logForDebugging(`PostModelSwitch: plugin-delivered hooks are missing from this run: ${w}`, {
        level: "error",
      });
    if (isUnresolvedInferenceProfile(n.toModel)) await getInferenceProfileBackingModel(n.toModel);
    let L = {
        ...createBaseHookInput(e, hookInputCwd()),
        hook_event_name: "PostModelSwitch",
        from_model: n.fromModel,
        to_model: n.toModel,
        requested_model: n.requestedModel,
        source: n.source,
        ...F9e(n.toModel),
      },
      G = [],
      q = [];
    try {
      for await (let Z of executeHooks({
        session: e,
        hookInput: L,
        toolUseID: randomUUID_35(),
        matchQuery: isRecognizedModelKey(hookModelMatchKey(n.toModel))
          ? hookModelMatchKey(n.toModel)
          : void 0,
        sessionHooks: ptt.of(e).registry,
        timeoutMs: r.timeoutMs ?? iKo,
      })) {
        if (Z.additionalContexts) G.push(...Z.additionalContexts);
        if (Z.message?.type === "attachment") {
          let attachment = Z.message.attachment;
          if (attachment.type === "hook_success" && attachment.content) G.push(attachment.content);
          if (attachment.type !== "hook_blocking_error") q.push(Z.message);
        }
        if (Z.blockingError)
          q.push(
            getNonBlockableHookErrorMessage(
              "PostModelSwitch",
              Z.blockingError,
              `PostModelSwitch:${hookModelMatchKey(n.toModel)}`,
            ),
          );
      }
    } catch (error) {
      logForDebugging(
        error instanceof StreamClosedAbortError
          ? "PostModelSwitch hooks cancelled (control stream closed)"
          : `PostModelSwitch hooks failed: ${String(error)}`,
        { level: error instanceof StreamClosedAbortError ? "debug" : "error" },
      );
    }
    if (G.length > 0 || q.length > 0)
      of.pending.push({ sessionId: id, toModel: n.toModel, contexts: G, messages: q });
  })()
    .catch((w) => {
      logForDebugging(`PostModelSwitch hooks failed: ${String(w)}`, { level: "error" });
    })
    .finally(() => {
      of.inFlight.delete(S);
    });
  return (of.inFlight.add(S), S);
}
//@ chunk-e6aww6q8.js:3427980-3428236 placement
function collectPreSwitchHookMessages(e, n) {
  if (e?.type !== "attachment") return;
  let attachment = e.attachment;
  if (attachment.type === "hook_system_message") n.push(attachment.content);
  else if (attachment.type === "hook_non_blocking_error") {
    let trimmed = attachment.stderr.trim();
    n.push(`PreModelSwitch hook ${attachment.hookName} failed${trimmed ? `: ${trimmed}` : ""}`);
  }
}
//@ chunk-e6aww6q8.js:3428236-3428279 placement
class bxn {
  tail = Promise.resolve();
  pending = 0;
}
//@ chunk-e6aww6q8.js:3428279-3428306 placement
var sN = new SessionRootSlot(() => new bxn());
/**
 * 把模型切换操作串行化执行，并维护待处理计数。
 */
//@ chunk-e6aww6q8.js:3428306-3428433 placement
function serializeModelSwitch(e, n) {
  let of = sN.of(e);
  of.pending++;
  let s = of.tail.then(n, n);
  return (
    (of.tail = s.then(
      () => {
        of.pending--;
      },
      () => {
        of.pending--;
      },
    )),
    s
  );
}
//@ chunk-e6aww6q8.js:3428433-3428473 placement
var ptt = new SessionRootSlot(() => ({ registry: void 0 }));

export {
  kxn,
  serializeModelSwitch,
  zE,
  useMainLoopModel_2,
  WZ,
  getModelSwitchTarget,
  bk,
  useMainLoopModel,
  ptt,
  sN,
  takePendingSwitchSource,
  runPostModelSwitchHooks,
  runPreModelSwitchHooks,
  resolveEffectiveModel,
  emn,
};
