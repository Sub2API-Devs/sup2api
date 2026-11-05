/**
 * bridge/applyFlagSettings.ts
 *
 * 远程控制下发的 apply_flag_settings 处理（effort 等）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-76c076m4.js (8)
 * attribution: placement 8
 */
import {
  resolveEffortValue,
  isRequestedEffortTheHeldLevel,
  parseEffortValue,
  resolveEffortKeyword,
  isEffortLevel,
  clampEffortToCap,
  getEffortEnvOverride,
  parseEffortKeyword,
  isUltracodeAvailable,
  isEffortChangedFromSession,
  toEffortSettingOrDefault,
  isSameEffortSetting,
  resolveEffortLevel,
  parseEffortFlag,
  levelEffortSetting,
  getModelPickerEffortDefault,
  carriedEffortOnly,
  isUltracodeActive,
  toBoundedLabel,
} from "../utils/effort.js";
import { isBridgeEffortSyncEnabled } from "./bridgeGates.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { parseEffortOrKeyword } from "../utils/permissions/permissionSetup.js";
import { bridgeHostState } from "./bridgeHostState.js";

//@ chunk-76c076m4.js:440-506 placement
/**
 * 把远程控制下发的 effort 取值解析成字符串，非字符串时返回 null（apply_flag_settings 用）。
 */
function resolveEffortLevelOrNull(mainLoopModel, effortLevel) {
  let effortValue = resolveEffortValue(mainLoopModel, effortLevel);
  return typeof effortValue === "string" ? effortValue : null;
}
//@ chunk-76c076m4.js:506-1889 placement
/**
 * 应用远程控制下发的 apply_flag_settings（effort 等），对远程控制禁止的项给出说明
 */
function applyBridgeFlagSettings(settings, { model, getAppState, setAppState }) {
  if (!isBridgeEffortSyncEnabled()) {
    logFeatureBad("bridge_flag_settings", "disabled");
    return {
      ok: false,
      error: "apply_flag_settings: effort changes over Remote Control are turned off",
    };
  }
  let nextLevel;
  let cappedLevel;
  let effortChanged = false;
  if (
    "effortLevel" in settings &&
    !isRequestedEffortTheHeldLevel(model, settings.effortLevel, getAppState())
  ) {
    effortChanged = true;
    if (settings.effortLevel != null) {
      let parsedLevel = parseEffortValue(settings.effortLevel) ?? resolveEffortKeyword(settings.effortLevel);
      if (typeof parsedLevel !== "string" || !isEffortLevel(parsedLevel)) {
        logFeatureBad("bridge_flag_settings", "invalid_effort_level");
        return {
          ok: false,
          error: "apply_flag_settings: unrecognized effortLevel",
        };
      }
      nextLevel = parsedLevel;
      cappedLevel = clampEffortToCap(parsedLevel, model);
    }
    let effortEnvOverride = getEffortEnvOverride();
    if (effortEnvOverride !== undefined && cappedLevel !== effortEnvOverride) {
      logFeatureBad("bridge_flag_settings", "env_override");
      return {
        ok: false,
        error: "apply_flag_settings: CLAUDE_CODE_EFFORT_LEVEL overrides effort for this session",
      };
    }
  }
  let levelIsUltracode = parseEffortKeyword(settings.effortLevel) === "ultracode";
  let requestedUltracode = "ultracode" in settings ? settings.ultracode === true : undefined;
  if (
    (requestedUltracode === true || (requestedUltracode === undefined && levelIsUltracode)) &&
    !isUltracodeAvailable(model)
  ) {
    logFeatureBad("bridge_flag_settings", "ultracode_unavailable");
    return {
      ok: false,
      error: `apply_flag_settings: ultracode is not available for this session (${isUltracodeAvailable() ? `${model} does not support it` : "dynamic workflows are off"})`,
    };
  }
  setAppState((state) => {
    let shouldClearUltracode =
      effortChanged && !levelIsUltracode && isEffortChangedFromSession(model, state, nextLevel);
    let next = state;
    if (effortChanged) {
      let effortSettingOrDefault = toEffortSettingOrDefault(cappedLevel);
      if (!isSameEffortSetting(next.sessionEffort, effortSettingOrDefault))
        next = {
          ...next,
          sessionEffort: effortSettingOrDefault,
        };
    }
    if (requestedUltracode === undefined) {
      if (levelIsUltracode) {
        if (!next.ultracode)
          next = {
            ...next,
            ultracode: true,
          };
      } else if (shouldClearUltracode && next.ultracode)
        next = {
          ...next,
          ultracode: false,
        };
    } else if ((next.ultracode ?? false) !== requestedUltracode)
      next = {
        ...next,
        ultracode: requestedUltracode,
      };
    return next;
  });
  let appState = getAppState();
  logForDebugging(
    `[bridge] apply_flag_settings applied effort=${resolveEffortLevel(appState) ?? "auto"} ultracode=${appState.ultracode === true}`,
  );
  return {
    ok: true,
  };
}
//@ chunk-76c076m4.js:1889-2401 placement
/**
 * 解析并种下远程控制会话的 effort 等级（含 ultracode/auto），未知值报错
 */
function seedBridgeEffortLevel(rawEffort, { getAppState, setAppState, latch }) {
  let level = parseEffortFlag(rawEffort.trim()).level;
  let effortValue = level === undefined ? undefined : parseEffortOrKeyword(level);
  if (effortValue === undefined)
    return {
      ok: false,
      error: "unrecognized effort",
    };
  let seedUltracode = parseEffortKeyword(level) === "ultracode";
  let seedSetUltracode = !seedUltracode && latch.seedSetUltracode;
  latch.seedSetUltracode = seedUltracode;
  setAppState((state) => {
    let next = state;
    if (!isSameEffortSetting(state.sessionEffort, levelEffortSetting(effortValue)))
      next = {
        ...next,
        sessionEffort: levelEffortSetting(effortValue),
      };
    if (seedUltracode && !next.ultracode)
      next = {
        ...next,
        ultracode: true,
      };
    else if (seedSetUltracode && next.ultracode)
      next = {
        ...next,
        ultracode: false,
      };
    return next;
  });
  logForDebugging(
    `[bridge] effort seeded effort=${resolveEffortLevel(getAppState()) ?? "auto"} ultracode=${getAppState().ultracode === true}`,
  );
  return {
    ok: true,
  };
}
//@ chunk-76c076m4.js:2401-2860 placement
/**
 * 把 effort 等级、ultracode 状态和请求 id 中有变化的部分通过桥接 reportMetadata 上报（effort_level / is_ultracode_active / effort_request_id）。
 */
function reportBridgeEffortMetadata({ level, ultracodeActive, requestId }) {
  let activeOutboundBridgeHandle = getActiveOutboundBridgeHandle();
  if (!activeOutboundBridgeHandle || !isBridgeEffortSyncEnabled()) return;
  let hostState = bridgeHostState();
  let payload = {};
  if (level !== undefined) {
    hostState.lastKnownEffort = level;
    if (hostState.lastReportedEffort !== level) {
      hostState.lastReportedEffort = level;
      payload.effort_level = level;
    }
  }
  if (ultracodeActive !== undefined) {
    hostState.lastKnownUltracodeActive = ultracodeActive;
    if (hostState.lastReportedUltracodeActive !== ultracodeActive) {
      hostState.lastReportedUltracodeActive = ultracodeActive;
      payload.is_ultracode_active = ultracodeActive || null;
    }
  }
  if (requestId !== undefined) {
    hostState.lastKnownEffortRequestId = requestId;
    payload.effort_request_id = requestId;
  }
  if (Object.keys(payload).length > 0) activeOutboundBridgeHandle.reportMetadata(payload);
}
//@ chunk-76c076m4.js:2860-2994 placement
/**
 * 按当前模型与应用状态算出 effort 默认值和 ultracode 状态并上报给桥接。
 */
function reportEffortForModel(model, appState) {
  if (!getActiveOutboundBridgeHandle()) return;
  let modelPickerEffortDefault = getModelPickerEffortDefault(
    model,
    resolveEffortLevel(appState, model) ?? carriedEffortOnly(model),
  );
  reportBridgeEffortMetadata({
    level:
      modelPickerEffortDefault === undefined
        ? null
        : resolveEffortLevelOrNull(model, modelPickerEffortDefault),
    ultracodeActive: isUltracodeActive(appState.ultracode, model),
  });
}
//@ chunk-76c076m4.js:2994-3034 placement
/**
 * 按 requestId 上报一次桥接 effort 元数据（先做有界标签化）。
 */
function reportBridgeEffortForRequest(requestId) {
  reportBridgeEffortMetadata({
    requestId: toBoundedLabel(requestId),
  });
}
//@ chunk-76c076m4.js:3034-3125 placement
function getActiveOutboundBridgeHandle() {
  let hostState = bridgeHostState();
  let handle = hostState.replHandle ?? hostState.sdkHostedHandle;
  return handle && !handle.outboundOnly ? handle : null;
}
//@ chunk-76c076m4.js:3125-3327 placement
/**
 * 清空“已上报”记录后把最后一次已知的 effort 状态重新上报（桥接重连时用）。
 */
function resendBridgeEffortMetadata() {
  let hostState = bridgeHostState();
  hostState.lastReportedEffort = undefined;
  hostState.lastReportedUltracodeActive = undefined;
  reportBridgeEffortMetadata({
    level: hostState.lastKnownEffort,
    ultracodeActive: hostState.lastKnownUltracodeActive,
    requestId: hostState.lastKnownEffortRequestId,
  });
}
export {
  seedBridgeEffortLevel,
  reportEffortForModel,
  resolveEffortLevelOrNull,
  applyBridgeFlagSettings,
  reportBridgeEffortForRequest,
  reportBridgeEffortMetadata,
  resendBridgeEffortMetadata,
};
