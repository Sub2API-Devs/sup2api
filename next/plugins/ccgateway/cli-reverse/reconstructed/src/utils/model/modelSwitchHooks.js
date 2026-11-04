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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3423115-3423158 placement
/**
 * 取允许在 runs_turns 场景选择的模型。
 */
function allowedPickModel(model) {
  return resolveAllowedModelPick(model, "runs_turns");
}
//@ chunk-e6aww6q8.js:3423158-3423370 placement
function resolveAllowedModelPick(model, mode) {
  if (model == null) return null;
  if (isUnservedFamilySpelling(model)) return null;
  if (isExemptDefaultResolvingPick(model)) return model;
  let allowed = isModelAllowedUnderActiveEnforcement(model);
  if (allowed ?? isModelAllowed(model)) {
    if (allowed === null && mode === "runs_turns") noteHonoredSessionModel(model);
    return model;
  }
  if (allowed === null && mode === "runs_turns" && keepsHonoredModelOnCachedDeny(model)) return model;
  return stepDownRestrictedFamilyAliasPick(model);
}
//@ chunk-e6aww6q8.js:3423370-3423628 placement
/**
 * 计算模型切换的目标：与当前相同或解析后相同时返回 null。
 */
function getModelSwitchTarget(mainLoopModelForSession, model) {
  let sessionPick = allowedPickModel(mainLoopModelForSession);
  if (sessionPick === null) return null;
  if (model !== null && sessionPick.trim().toLowerCase() === model.trim().toLowerCase()) return null;
  let setting = resolveAllowedModelPick(model, "idle_base");
  if (isModeDependentSetting(sessionPick) || isModeDependentSetting(setting)) return sessionPick;
  let baseModel = setting === null ? getDefaultMainLoopModel() : parseUserSpecifiedModel(setting);
  return parseUserSpecifiedModel(sessionPick).toLowerCase() === baseModel.toLowerCase() ? null : sessionPick;
}
//@ chunk-e6aww6q8.js:3423628-3423715 placement (2.1.88 match: useMainLoopModel, 1)
function useMainLoopModel(state) {
  return getModelSwitchTarget(state.mainLoopModelForSession, state.mainLoopModel) ?? state.mainLoopModel;
}
//@ chunk-e6aww6q8.js:3423715-3423815 placement
/**
 * 解析实际生效的模型（计划模式下取计划模式的组成模型）。
 */
function resolveEffectiveModel(modelSetting, mode) {
  let setting = modelSetting ?? getDefaultMainLoopModelSetting();
  if (mode === "plan") {
    let constituent = planModeConstituentModel(setting);
    if (constituent !== null) return constituent.model;
  }
  return parseUserSpecifiedModel(setting);
}
//@ chunk-e6aww6q8.js:3423815-3423897 placement (2.1.88 match: useMainLoopModel, 1)
function useMainLoopModel_2(state) {
  return allowedPickModel(state.mainLoopModelForSession) ?? allowedPickModel(state.mainLoopModel) ?? null;
}
//@ chunk-e6aww6q8.js:3423897-3423960 placement
/**
 * 按当前权限模式计算实际生效的主循环模型。
 */
function effectiveModelForContext(state) {
  return resolveEffectiveModel(useMainLoopModel_2(state), state.toolPermissionContext.mode);
}
//@ chunk-e6aww6q8.js:3423960-3424024 placement
function isModeDependentSetting(setting) {
  return setting !== null && isModeDependentModelSetting(strip1mSuffix(setting.trim().toLowerCase()));
}
//@ chunk-e6aww6q8.js:3424024-3424109 placement
/**
 * 判断是否有 PreModelSwitch 钩子需要运行（插件钩子可能未注册时按有处理）。
 */
function hasPreModelSwitchHook(session) {
  if (pluginHooksMayBeUnregistered()) return true;
  return hasHookForEvent("PreModelSwitch", sessionHooksRegistrySlot.of(session).registry, session.id);
}
//@ chunk-e6aww6q8.js:3424109-3425659 placement
/**
 * 切换模型前运行 PreModelSwitch 钩子，钩子可阻止切换。
 */
async function runPreModelSwitchHooks(session, change, options = {}) {
  let messages = [];
  await pendingPluginHookRegistration();
  let unknownCause = await pluginHooksUnknownCause(true);
  if (unknownCause !== undefined)
    return {
      decision: "block",
      reason: `${unknownCause}, so organization-managed PreModelSwitch hooks could not be checked. Switching models again re-checks; details are in the debug log`,
      messages,
    };
  if (!hasPreModelSwitchHook(session))
    return {
      decision: "proceed",
      skipConfirm: false,
      messages,
    };
  if (isUnresolvedInferenceProfile(change.toModel)) await getInferenceProfileBackingModel(change.toModel);
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd()),
    hook_event_name: "PreModelSwitch",
    from_model: change.fromModel,
    to_model: change.toModel,
    requested_model: change.requestedModel,
    source: change.source,
    ...buildContextTokensFields(change.toModel),
  };
  let matchKey = hookModelMatchKey(change.toModel);
  let blockReason;
  let reason;
  let asksConfirm = false;
  let skipConfirm = false;
  try {
    for await (let step of executeHooks({
      session,
      hookInput,
      toolUseID: randomUUID(),
      matchQuery: isRecognizedModelKey(matchKey) ? matchKey : undefined,
      sessionHooks: sessionHooksRegistrySlot.of(session).registry,
      signal: options.signal,
      timeoutMs: options.timeoutMs ?? HOOK_STARTED_GRACE_MS,
    })) {
      collectPreSwitchHookMessages(step.message, messages);
      if (
        step.message?.type === "attachment" &&
        step.message.attachment.type === "hook_cancelled" &&
        !options.signal?.aborted
      )
        blockReason ??= `PreModelSwitch hook ${step.message.attachment.hookName} did not respond before its timeout`;
      if (step.blockingError) blockReason ??= step.blockingError.blockingError;
      else if (step.permissionBehavior === "ask") {
        asksConfirm = true;
        reason ??= step.hookPermissionDecisionReason;
      } else if (step.permissionBehavior === "allow") skipConfirm = true;
    }
  } catch (error) {
    logForDebugging(
      `PreModelSwitch hooks did not complete: ${error instanceof StreamClosedAbortError ? "control stream closed" : String(error)}`,
      {
        level: "error",
      },
    );
    blockReason ??=
      error instanceof StreamClosedAbortError
        ? "PreModelSwitch hooks were cancelled (the control stream closed) before answering"
        : "a PreModelSwitch hook failed before answering";
  }
  if (blockReason !== undefined)
    return {
      decision: "block",
      reason: blockReason,
      messages,
    };
  if (asksConfirm)
    return {
      decision: "ask",
      reason,
      messages,
    };
  return {
    decision: "proceed",
    skipConfirm,
    messages,
  };
}
//@ chunk-e6aww6q8.js:3425659-3425681 placement
class PendingSwitchSource {
  next = undefined;
}
//@ chunk-e6aww6q8.js:3425681-3425709 placement
var pendingSwitchSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3425681", () => {
  pendingSwitchSlot = new SessionRootSlot(() => new PendingSwitchSource());
});
//@ chunk-e6aww6q8.js:3425709-3425772 placement
function markPendingSwitch(session, source, requestedModel) {
  pendingSwitchSlot.of(session).next = {
    source,
    requestedModel,
  };
}
//@ chunk-e6aww6q8.js:3425772-3425851 placement
/**
 * 若生效模型会变化，记录本次切换的来源与目标。
 */
function recordSwitchIfChanged(session, state, requestedModel, source) {
  if (
    effectiveModelForContext(state) !==
    resolveEffectiveModel(requestedModel, state.toolPermissionContext.mode)
  )
    markPendingSwitch(session, source, requestedModel);
}
//@ chunk-e6aww6q8.js:3425851-3425952 placement
/**
 * 取出并清除下一次模型切换的来源（默认 auto）。
 */
function takePendingSwitchSource(session) {
  let slot = pendingSwitchSlot.of(session);
  let next = slot.next ?? {
    source: "auto",
    requestedModel: null,
  };
  slot.next = undefined;
  return next;
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
var postSwitchSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3426004", () => {
  postSwitchSlot = new SessionRootSlot(() => new PostSwitchState());
});
//@ chunk-e6aww6q8.js:3426032-3427430 placement
/**
 * 切换模型后运行 PostModelSwitch 钩子。
 */
function runPostModelSwitchHooks(session, change, options = {}) {
  let slot = postSwitchSlot.of(session);
  let sessionId = session.id;
  slot.landedOn = {
    sessionId,
    toModel: change.toModel,
  };
  let run = (async () => {
    await pendingPluginHookRegistration();
    let unknownCause = (await pluginHooksUnknownCause(false)) ?? (await failedPluginHookRegistration());
    if (unknownCause !== undefined)
      logForDebugging(`PostModelSwitch: plugin-delivered hooks are missing from this run: ${unknownCause}`, {
        level: "error",
      });
    if (isUnresolvedInferenceProfile(change.toModel)) await getInferenceProfileBackingModel(change.toModel);
    let hookInput = {
      ...createBaseHookInput(session, hookInputCwd()),
      hook_event_name: "PostModelSwitch",
      from_model: change.fromModel,
      to_model: change.toModel,
      requested_model: change.requestedModel,
      source: change.source,
      ...buildContextTokensFields(change.toModel),
    };
    let contexts = [];
    let messages = [];
    try {
      for await (let step of executeHooks({
        session,
        hookInput,
        toolUseID: randomUUID(),
        matchQuery: isRecognizedModelKey(hookModelMatchKey(change.toModel))
          ? hookModelMatchKey(change.toModel)
          : undefined,
        sessionHooks: sessionHooksRegistrySlot.of(session).registry,
        timeoutMs: options.timeoutMs ?? HOOK_STARTED_GRACE_MS,
      })) {
        if (step.additionalContexts) contexts.push(...step.additionalContexts);
        if (step.message?.type === "attachment") {
          let attachment = step.message.attachment;
          if (attachment.type === "hook_success" && attachment.content) contexts.push(attachment.content);
          if (attachment.type !== "hook_blocking_error") messages.push(step.message);
        }
        if (step.blockingError)
          messages.push(
            getNonBlockableHookErrorMessage(
              "PostModelSwitch",
              step.blockingError,
              `PostModelSwitch:${hookModelMatchKey(change.toModel)}`,
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
    if (contexts.length > 0 || messages.length > 0)
      slot.pending.push({
        sessionId,
        toModel: change.toModel,
        contexts,
        messages,
      });
  })()
    .catch((error) => {
      logForDebugging(`PostModelSwitch hooks failed: ${String(error)}`, {
        level: "error",
      });
    })
    .finally(() => {
      slot.inFlight.delete(run);
    });
  slot.inFlight.add(run);
  return run;
}
//@ chunk-e6aww6q8.js:3427980-3428236 placement
function collectPreSwitchHookMessages(message, messages) {
  if (message?.type !== "attachment") return;
  let attachment = message.attachment;
  if (attachment.type === "hook_system_message") messages.push(attachment.content);
  else if (attachment.type === "hook_non_blocking_error") {
    let trimmed = attachment.stderr.trim();
    messages.push(`PreModelSwitch hook ${attachment.hookName} failed${trimmed ? `: ${trimmed}` : ""}`);
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
var switchSerializerSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3428279", () => {
  switchSerializerSlot = new SessionRootSlot(() => new SwitchSerializer());
});
//@ chunk-e6aww6q8.js:3428306-3428433 placement
/**
 * 把模型切换操作串行化执行，并维护待处理计数。
 */
function serializeModelSwitch(session, fn) {
  let slot = switchSerializerSlot.of(session);
  slot.pending++;
  let settled = slot.tail.then(fn, fn);
  slot.tail = settled.then(
    () => {
      slot.pending--;
    },
    () => {
      slot.pending--;
    },
  );
  return settled;
}
//@ chunk-e6aww6q8.js:3428433-3428473 placement
/**
 * 会话级的钩子注册表槽（默认空）。
 */
var sessionHooksRegistrySlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3428433", () => {
  sessionHooksRegistrySlot = new SessionRootSlot(() => ({
    registry: undefined,
  }));
});
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
