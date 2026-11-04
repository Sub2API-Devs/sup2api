/**
 * components/fleet/dispatchDefaults.ts
 *
 * 2.1.316 新增：计算新会话的模型、effort、快速模式默认值。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-93kwxas0.js (9)
 * attribution: placement 8, sole-consumer 1
 */
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { getInitialSettings_2, getEffectiveSettingSource_2 } from "../../utils/settings/settings.js";
import { getDefaultMainLoopModel } from "../../utils/model/modelFallback.js";
import { parseUserSpecifiedModel, renderModelSetting } from "../../utils/model/modelDisplay.js";
import {
  lookupEffortSetting,
  buildEffortSettingsTable,
  resolveEffortKeyword,
  parseEffortLevel,
  modelSupportsEffort,
  normalizeEffortLevel,
  resolveEffortValue,
  getEffortEnvOverride,
  isUltracodeActive,
  isUltracodeEnabled,
} from "../../utils/effort.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { retireSpare } from "../../cli/bg/bgSpare.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import {
  getOrgLockedDefaultModel,
  stepDownRestrictedFamilyAliasPick,
} from "../../utils/model/planModeModel.js";
import { isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { isUnservedModelSpelling } from "../../utils/model/model.js";
import {
  getInitialFastModeSetting,
  supportsFastMode,
  getFastModeUnavailableMessage,
  buildFastModeCheckOptions,
} from "../../utils/fastMode.js";

//@ chunk-93kwxas0.js:6143-6294 placement
/**
 * 取出并删除某会话的通知记录，返回距通知的毫秒数与通知类型（用于遥测）。
 */
function takeNotificationLatency(tracker, sessionId, now) {
  let notified = tracker.notified.get(sessionId);
  if (!notified) return;
  tracker.notified.delete(sessionId);
  return {
    ms_since_notification: Math.max(0, now - notified.at),
    notified_kind: fromEnum(notified.kind),
  };
}
//@ chunk-93kwxas0.js:6294-6388 placement
function dispatchDefaultsFromJob(snapshot) {
  return {
    model: snapshot.sessionModel,
    effort: snapshot.sessionEffort,
    fastMode: snapshot.sessionFastMode,
  };
}
//@ chunk-93kwxas0.js:6388-6610 placement
/**
 * 用派发时指定的 model/effort/fastMode 覆盖默认值。
 */
function applyDispatchOverrides(dispatchDefaults, overrides) {
  if (overrides.model === undefined && overrides.effort === undefined && overrides.fastMode === undefined)
    return dispatchDefaults;
  return {
    ...dispatchDefaults,
    ...(overrides.model !== undefined && {
      model: overrides.model,
    }),
    ...(overrides.effort !== undefined && {
      effort: overrides.effort,
    }),
    ...(overrides.fastMode !== undefined && {
      fastMode: overrides.fastMode,
    }),
  };
}
//@ chunk-93kwxas0.js:6610-7005 placement
/**
 * 计算新会话的模型、effort、快速模式默认值。
 */
function resolveDispatchDefaults({ launch, window: windowOptions }) {
  let modelChoice =
    resolveFastFlagPlaceholder(
      windowOptions.model ??
        launch?.model ??
        (env.ANTHROPIC_MODEL || getInitialSettings_2().model || undefined),
    ) ??
    windowOptions.model ??
    (launch?.model === undefined
      ? resolveDefaultDispatchModel()
      : (resolveAllowedModel(launch.model, "explicit") ?? getDefaultMainLoopModel()));
  let fallback = parseUserSpecifiedModel(modelChoice);
  let effort = windowOptions.effort ?? launch?.effort;
  let effortValue =
    effort === undefined
      ? lookupEffortSetting(buildEffortSettingsTable(), fallback)
      : (resolveEffortKeyword(effort) ?? parseEffortLevel(effort));
  let effort_2 = modelSupportsEffort(fallback)
    ? normalizeEffortLevel(
        resolveEffortValue(fallback, effortValue, {
          carriedEffort: null,
        }) ?? "high",
      )
    : undefined;
  return {
    model: renderModelSetting(modelChoice),
    effort: effort_2,
    effortOverridden: getEffortEnvOverride() !== undefined,
    ultracode: isUltracodeActive(isUltracodeEnabled(effort), fallback),
    ...resolveFastModeForSession(fallback, windowOptions.fastMode),
  };
}
//@ chunk-93kwxas0.js:7005-7272 placement
/**
 * 计算派发默认值的指纹，和上次不同时触发备用会话刷新；出错时保留旧值。
 */
function checkDispatchDefaultsChanged(previousKey, launch, storage) {
  try {
    let { model, effort, fast } = resolveDispatchDefaults({
      launch,
      window: {
        model: undefined,
        effort: undefined,
        fastMode: undefined,
      },
    });
    let key = jsonStringify({
      model,
      effort,
      fast,
    });
    if (previousKey !== undefined && previousKey !== key) retireSpare(storage);
    return key;
  } catch (error) {
    logForDebugging(`Agent view spare check skipped: ${errorMessage(error)}`, {
      level: "error",
    });
    return previousKey;
  }
}
//@ chunk-93kwxas0.js:7272-7448 placement
/**
 * 新会话默认模型：策略/命令行设置优先，其次组织锁定默认模型、ANTHROPIC_MODEL，最后主循环默认模型。
 */
function resolveDefaultDispatchModel() {
  let effectiveSettingSource = getEffectiveSettingSource_2("model");
  let settingModel =
    effectiveSettingSource === "policySettings" || effectiveSettingSource === "flagSettings"
      ? getInitialSettings_2().model
      : (getOrgLockedDefaultModel()?.model ?? getInitialSettings_2().model);
  let candidate = env.ANTHROPIC_MODEL || settingModel || undefined;
  return (candidate && resolveAllowedModel(candidate, "persisted")) || getDefaultMainLoopModel();
}
//@ chunk-93kwxas0.js:7448-7521 placement
function resolveAllowedModel(model, source) {
  if (!isModelAllowed(model)) return stepDownRestrictedFamilyAliasPick(model) ?? undefined;
  return isUnservedModelSpelling(model, source) ? undefined : model;
}
//@ chunk-93kwxas0.js:7521-7543 placement
function resolveFastFlagPlaceholder(model) {
  return;
}
//@ chunk-93kwxas0.js:7543-7781 sole-consumer
/**
 * 给定模型与会话选择（--fast 等标志）返回 {fast:"on"|"off", fastBlockedReason}，被托管设置或模型不支持挡住时给出原因。
 */
function resolveFastModeForSession(model, fastMode) {
  let initialFastModeSetting = getInitialFastModeSetting(model, fastMode);
  return {
    fast: initialFastModeSetting,
    fastBlockedReason:
      fastMode === undefined ||
      (fastMode !== undefined && initialFastModeSetting === (fastMode ? "on" : "off")) ||
      initialFastModeSetting === undefined
        ? undefined
        : fastMode
          ? supportsFastMode(model)
            ? (getFastModeUnavailableMessage(model, buildFastModeCheckOptions(fastMode)) ?? undefined)
            : `${renderModelSetting(model)} doesn't have fast mode`
          : "Your organization's managed settings turn it on",
  };
}
export {
  takeNotificationLatency,
  checkDispatchDefaultsChanged,
  resolveDispatchDefaults,
  dispatchDefaultsFromJob,
  applyDispatchOverrides,
};
