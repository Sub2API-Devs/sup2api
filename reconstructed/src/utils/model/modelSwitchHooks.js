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
import { randomUUID } from "crypto";
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
import { strip1mSuffix } from "./modelIds.js";
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
import { buildContextTokensFields } from "../../services/api/claude.js";
import { hookModelMatchKey, isRecognizedModelKey } from "./canonicalModelName.js";
import { HOOK_STARTED_GRACE_MS } from "../hooks/hookEvents.js";
import { logForDebugging } from "../debug.js";
import { StreamClosedAbortError } from "../errors.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

//@ chunk-e6aww6q8.js:3423115-3423158 placement
/**
 * 取允许在 runs_turns 场景选择的模型。
 */
function allowedPickModel(e) {
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
//@ chunk-e6aww6q8.js:3423370-3423628 placement
/**
 * 计算模型切换的目标：与当前相同或解析后相同时返回 null。
 */
function getModelSwitchTarget(mainLoopModelForSession, mainLoopModel) {
  let r = allowedPickModel(mainLoopModelForSession);
  if (r === null) return null;
  if (mainLoopModel !== null && r.trim().toLowerCase() === mainLoopModel.trim().toLowerCase()) return null;
  let allowedModelPick = resolveAllowedModelPick(mainLoopModel, "idle_base");
  if (isModeDependentSetting(r) || isModeDependentSetting(allowedModelPick)) return r;
  let h = allowedModelPick === null ? getDefaultMainLoopModel() : parseUserSpecifiedModel(allowedModelPick);
  return parseUserSpecifiedModel(r).toLowerCase() === h.toLowerCase() ? null : r;
}
//@ chunk-e6aww6q8.js:3423628-3423715 placement = useMainLoopModel (1)
function useMainLoopModel(state) {
  return getModelSwitchTarget(state.mainLoopModelForSession, state.mainLoopModel) ?? state.mainLoopModel;
}
//@ chunk-e6aww6q8.js:3423715-3423815 placement
/**
 * 解析实际生效的模型（计划模式下取计划模式的组成模型）。
 */
function resolveEffectiveModel(mainLoopModel, mode) {
  let r = mainLoopModel ?? getDefaultMainLoopModelSetting();
  if (mode === "plan") {
    let s = planModeConstituentModel(r);
    if (s !== null) return s.model;
  }
  return parseUserSpecifiedModel(r);
}
//@ chunk-e6aww6q8.js:3423815-3423897 placement = useMainLoopModel (1)
function useMainLoopModel_2(e) {
  return allowedPickModel(e.mainLoopModelForSession) ?? allowedPickModel(e.mainLoopModel) ?? null;
}
//@ chunk-e6aww6q8.js:3423897-3423960 placement
/**
 * 按当前权限模式计算实际生效的主循环模型。
 */
function effectiveModelForContext(state) {
  return resolveEffectiveModel(useMainLoopModel_2(state), state.toolPermissionContext.mode);
}
//@ chunk-e6aww6q8.js:3423960-3424024 placement
function isModeDependentSetting(e) {
  return e !== null && isModeDependentModelSetting(strip1mSuffix(e.trim().toLowerCase()));
}
//@ chunk-e6aww6q8.js:3424024-3424109 placement
/**
 * 判断是否有 PreModelSwitch 钩子需要运行（插件钩子可能未注册时按有处理）。
 */
function hasPreModelSwitchHook(e) {
  if (pluginHooksMayBeUnregistered()) return true;
  return hasHookForEvent("PreModelSwitch", sessionHooksRegistrySlot.of(e).registry, e.id);
}
//@ chunk-e6aww6q8.js:3424109-3425659 placement
/**
 * 切换模型前运行 PreModelSwitch 钩子，钩子可阻止切换。
 */
async function runPreModelSwitchHooks(e, n, r = {}) {
  let s = [];
  await pendingPluginHookRegistration();
  let h = await pluginHooksUnknownCause(true);
  if (h !== undefined)
    return {
      decision: "block",
      reason: `${h}, so organization-managed PreModelSwitch hooks could not be checked. Switching models again re-checks; details are in the debug log`,
      messages: s,
    };
  if (!hasPreModelSwitchHook(e))
    return {
      decision: "proceed",
      skipConfirm: false,
      messages: s,
    };
  if (isUnresolvedInferenceProfile(n.toModel)) await getInferenceProfileBackingModel(n.toModel);
  let hookInput = {
    ...createBaseHookInput(e, hookInputCwd()),
    hook_event_name: "PreModelSwitch",
    from_model: n.fromModel,
    to_model: n.toModel,
    requested_model: n.requestedModel,
    source: n.source,
    ...buildContextTokensFields(n.toModel),
  };
  let S = hookModelMatchKey(n.toModel);
  let w;
  let reason;
  let G = false;
  let skipConfirm = false;
  try {
    for await (let Z of executeHooks({
      session: e,
      hookInput,
      toolUseID: randomUUID(),
      matchQuery: isRecognizedModelKey(S) ? S : undefined,
      sessionHooks: sessionHooksRegistrySlot.of(e).registry,
      signal: r.signal,
      timeoutMs: r.timeoutMs ?? HOOK_STARTED_GRACE_MS,
    })) {
      collectPreSwitchHookMessages(Z.message, s);
      if (
        Z.message?.type === "attachment" &&
        Z.message.attachment.type === "hook_cancelled" &&
        !r.signal?.aborted
      )
        w ??= `PreModelSwitch hook ${Z.message.attachment.hookName} did not respond before its timeout`;
      if (Z.blockingError) w ??= Z.blockingError.blockingError;
      else if (Z.permissionBehavior === "ask") {
        G = true;
        reason ??= Z.hookPermissionDecisionReason;
      } else if (Z.permissionBehavior === "allow") skipConfirm = true;
    }
  } catch (error) {
    logForDebugging(
      `PreModelSwitch hooks did not complete: ${error instanceof StreamClosedAbortError ? "control stream closed" : String(error)}`,
      {
        level: "error",
      },
    );
    w ??=
      error instanceof StreamClosedAbortError
        ? "PreModelSwitch hooks were cancelled (the control stream closed) before answering"
        : "a PreModelSwitch hook failed before answering";
  }
  if (w !== undefined)
    return {
      decision: "block",
      reason: w,
      messages: s,
    };
  if (G)
    return {
      decision: "ask",
      reason,
      messages: s,
    };
  return {
    decision: "proceed",
    skipConfirm,
    messages: s,
  };
}
//@ chunk-e6aww6q8.js:3425659-3425681 placement
class PendingSwitchSource {
  next = undefined;
}
//@ chunk-e6aww6q8.js:3425681-3425709 placement
var pendingSwitchSlot = new SessionRootSlot(() => new PendingSwitchSource());
//@ chunk-e6aww6q8.js:3425709-3425772 placement
function markPendingSwitch(e, source, requestedModel) {
  pendingSwitchSlot.of(e).next = {
    source,
    requestedModel,
  };
}
//@ chunk-e6aww6q8.js:3425772-3425851 placement
/**
 * 若生效模型会变化，记录本次切换的来源与目标。
 */
function recordSwitchIfChanged(session, n, requestedModel, source) {
  if (effectiveModelForContext(n) !== resolveEffectiveModel(requestedModel, n.toolPermissionContext.mode))
    markPendingSwitch(session, source, requestedModel);
}
//@ chunk-e6aww6q8.js:3425851-3425952 placement
/**
 * 取出并清除下一次模型切换的来源（默认 auto）。
 */
function takePendingSwitchSource(e) {
  let n = pendingSwitchSlot.of(e);
  let r = n.next ?? {
    source: "auto",
    requestedModel: null,
  };
  n.next = undefined;
  return r;
}
//@ chunk-e6aww6q8.js:3425952-3426004 placement
class PostSwitchState {
  pending = [];
  landedOn = null;
  inFlight = new Set();
}
//@ chunk-e6aww6q8.js:3426004-3426032 placement
/**
 * 会话级的"等待运行 PostModelSwitch"槽。
 */
var postSwitchSlot = new SessionRootSlot(() => new PostSwitchState());
//@ chunk-e6aww6q8.js:3426032-3427430 placement
/**
 * 切换模型后运行 PostModelSwitch 钩子。
 */
function runPostModelSwitchHooks(e, n, r = {}) {
  let s = postSwitchSlot.of(e);
  let sessionId = e.id;
  s.landedOn = {
    sessionId,
    toModel: n.toModel,
  };
  let S = (async () => {
    await pendingPluginHookRegistration();
    let w = (await pluginHooksUnknownCause(false)) ?? (await failedPluginHookRegistration());
    if (w !== undefined)
      logForDebugging(`PostModelSwitch: plugin-delivered hooks are missing from this run: ${w}`, {
        level: "error",
      });
    if (isUnresolvedInferenceProfile(n.toModel)) await getInferenceProfileBackingModel(n.toModel);
    let hookInput = {
      ...createBaseHookInput(e, hookInputCwd()),
      hook_event_name: "PostModelSwitch",
      from_model: n.fromModel,
      to_model: n.toModel,
      requested_model: n.requestedModel,
      source: n.source,
      ...buildContextTokensFields(n.toModel),
    };
    let G = [];
    let q = [];
    try {
      for await (let Z of executeHooks({
        session: e,
        hookInput,
        toolUseID: randomUUID(),
        matchQuery: isRecognizedModelKey(hookModelMatchKey(n.toModel))
          ? hookModelMatchKey(n.toModel)
          : undefined,
        sessionHooks: sessionHooksRegistrySlot.of(e).registry,
        timeoutMs: r.timeoutMs ?? HOOK_STARTED_GRACE_MS,
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
        {
          level: error instanceof StreamClosedAbortError ? "debug" : "error",
        },
      );
    }
    if (G.length > 0 || q.length > 0)
      s.pending.push({
        sessionId,
        toModel: n.toModel,
        contexts: G,
        messages: q,
      });
  })()
    .catch((error) => {
      logForDebugging(`PostModelSwitch hooks failed: ${String(error)}`, {
        level: "error",
      });
    })
    .finally(() => {
      s.inFlight.delete(S);
    });
  s.inFlight.add(S);
  return S;
}
//@ chunk-e6aww6q8.js:3427980-3428236 placement
function collectPreSwitchHookMessages(message, n) {
  if (message?.type !== "attachment") return;
  let attachment = message.attachment;
  if (attachment.type === "hook_system_message") n.push(attachment.content);
  else if (attachment.type === "hook_non_blocking_error") {
    let trimmed = attachment.stderr.trim();
    n.push(`PreModelSwitch hook ${attachment.hookName} failed${trimmed ? `: ${trimmed}` : ""}`);
  }
}
//@ chunk-e6aww6q8.js:3428236-3428279 placement
class SwitchSerializer {
  tail = Promise.resolve();
  pending = 0;
}
//@ chunk-e6aww6q8.js:3428279-3428306 placement
/**
 * 会话级的模型切换串行化状态。
 */
var switchSerializerSlot = new SessionRootSlot(() => new SwitchSerializer());
//@ chunk-e6aww6q8.js:3428306-3428433 placement
/**
 * 把模型切换操作串行化执行，并维护待处理计数。
 */
function serializeModelSwitch(session, n) {
  let r = switchSerializerSlot.of(session);
  r.pending++;
  let s = r.tail.then(n, n);
  r.tail = s.then(
    () => {
      r.pending--;
    },
    () => {
      r.pending--;
    },
  );
  return s;
}
//@ chunk-e6aww6q8.js:3428433-3428473 placement
/**
 * 会话级的钩子注册表槽（默认空）。
 */
var sessionHooksRegistrySlot = new SessionRootSlot(() => ({
  registry: undefined,
}));
export {
  postSwitchSlot,
  serializeModelSwitch,
  recordSwitchIfChanged,
  effectiveModelForContext,
  useMainLoopModel,
  useMainLoopModel_2,
  hasPreModelSwitchHook,
  getModelSwitchTarget,
  sessionHooksRegistrySlot,
  switchSerializerSlot,
  takePendingSwitchSource,
  runPostModelSwitchHooks,
  runPreModelSwitchHooks,
  resolveEffectiveModel,
  allowedPickModel,
};
