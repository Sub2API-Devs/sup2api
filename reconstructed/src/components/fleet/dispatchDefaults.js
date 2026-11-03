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
import { yxs } from "../../cli/bg/bgSpare.js";
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

/**
 * 取出并删除某会话的通知记录，返回距通知的毫秒数与通知类型（用于遥测）。
 */
//@ chunk-93kwxas0.js:6143-6294 placement
function takeNotificationLatency(h, E, k) {
  let C = h.notified.get(E);
  if (!C) return;
  return (
    h.notified.delete(E),
    { ms_since_notification: Math.max(0, k - C.at), notified_kind: fromEnum(C.kind) }
  );
}
//@ chunk-93kwxas0.js:6294-6388 placement
function gi(h) {
  return { model: h.sessionModel, effort: h.sessionEffort, fastMode: h.sessionFastMode };
}
/**
 * 用派发时指定的 model/effort/fastMode 覆盖默认值。
 */
//@ chunk-93kwxas0.js:6388-6610 placement
function applyDispatchOverrides(h, E) {
  if (E.model === void 0 && E.effort === void 0 && E.fastMode === void 0) return h;
  return {
    ...h,
    ...(E.model !== void 0 && { model: E.model }),
    ...(E.effort !== void 0 && { effort: E.effort }),
    ...(E.fastMode !== void 0 && { fastMode: E.fastMode }),
  };
}
/**
 * 计算新会话的模型、effort、快速模式默认值。
 */
//@ chunk-93kwxas0.js:6610-7005 placement
function resolveDispatchDefaults({ launch: launch, window: E }) {
  let C =
      Gg(E.model ?? launch?.model ?? (env.ANTHROPIC_MODEL || getInitialSettings_2().model || void 0)) ??
      E.model ??
      (launch?.model === void 0
        ? resolveDefaultDispatchModel()
        : (Yu(launch.model, "explicit") ?? getDefaultMainLoopModel())),
    x = parseUserSpecifiedModel(C),
    T = E.effort ?? launch?.effort,
    A =
      T === void 0
        ? lookupEffortSetting(buildEffortSettingsTable(), x)
        : (resolveEffortKeyword(T) ?? parseEffortLevel(T)),
    L = modelSupportsEffort(x)
      ? normalizeEffortLevel(resolveEffortValue(x, A, { carriedEffort: null }) ?? "high")
      : void 0;
  return {
    model: renderModelSetting(C),
    effort: L,
    effortOverridden: getEffortEnvOverride() !== void 0,
    ultracode: isUltracodeActive(isUltracodeEnabled(T), x),
    ...resolveFastModeForSession(x, E.fastMode),
  };
}
/**
 * 计算派发默认值的指纹，和上次不同时触发备用会话刷新；出错时保留旧值。
 */
//@ chunk-93kwxas0.js:7005-7272 placement
function checkDispatchDefaultsChanged(h, E, k) {
  try {
    let {
        model: model,
        effort: effort,
        fast: fast,
      } = resolveDispatchDefaults({ launch: E, window: { model: void 0, effort: void 0, fastMode: void 0 } }),
      A = jsonStringify({ model: model, effort: effort, fast: fast });
    if (h !== void 0 && h !== A) yxs(k);
    return A;
  } catch (error) {
    return (logForDebugging(`Agent view spare check skipped: ${errorMessage(error)}`, { level: "error" }), h);
  }
}
/**
 * 新会话默认模型：策略/命令行设置优先，其次组织锁定默认模型、ANTHROPIC_MODEL，最后主循环默认模型。
 */
//@ chunk-93kwxas0.js:7272-7448 placement
function resolveDefaultDispatchModel() {
  let h = getEffectiveSettingSource_2("model"),
    E =
      h === "policySettings" || h === "flagSettings"
        ? getInitialSettings_2().model
        : (getOrgLockedDefaultModel()?.model ?? getInitialSettings_2().model),
    k = env.ANTHROPIC_MODEL || E || void 0;
  return (k && Yu(k, "persisted")) || getDefaultMainLoopModel();
}
//@ chunk-93kwxas0.js:7448-7521 placement
function Yu(h, E) {
  if (!isModelAllowed(h)) return stepDownRestrictedFamilyAliasPick(h) ?? void 0;
  return isUnservedModelSpelling(h, E) ? void 0 : h;
}
//@ chunk-93kwxas0.js:7521-7543 placement
function Gg(h) {
  return;
}
/**
 * 给定模型与会话选择（--fast 等标志）返回 {fast:"on"|"off", fastBlockedReason}，被托管设置或模型不支持挡住时给出原因。
 */
//@ chunk-93kwxas0.js:7543-7781 sole-consumer
function resolveFastModeForSession(h, E) {
  let k = getInitialFastModeSetting(h, E);
  return {
    fast: k,
    fastBlockedReason:
      E === void 0 || (E !== void 0 && k === (E ? "on" : "off")) || k === void 0
        ? void 0
        : E
          ? supportsFastMode(h)
            ? (getFastModeUnavailableMessage(h, buildFastModeCheckOptions(E)) ?? void 0)
            : `${renderModelSetting(h)} doesn't have fast mode`
          : "Your organization's managed settings turn it on",
  };
}

export {
  takeNotificationLatency,
  checkDispatchDefaultsChanged,
  resolveDispatchDefaults,
  gi,
  applyDispatchOverrides,
};
