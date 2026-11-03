/**
 * bridge/applyFlagSettings.ts
 *
 * 远程控制下发的 apply_flag_settings 处理（effort 等）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7rha57gt.js (8)
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

//@ chunk-7rha57gt.js:440-506 placement
/**
 * 把远程控制下发的 effort 取值解析成字符串，非字符串时返回 null（apply_flag_settings 用）。
 */
function resolveEffortLevelOrNull(mainLoopModel, effortLevel) {
  let effortValue = resolveEffortValue(mainLoopModel, effortLevel);
  return typeof effortValue === "string" ? effortValue : null;
}
//@ chunk-7rha57gt.js:506-1889 placement
/**
 * 应用远程控制下发的 apply_flag_settings（effort 等），对远程控制禁止的项给出说明
 */
function applyBridgeFlagSettings(e, { model, getAppState, setAppState }) {
  if (!isBridgeEffortSyncEnabled()) {
    logFeatureBad("bridge_flag_settings", "disabled");
    return {
      ok: false,
      error: "apply_flag_settings: effort changes over Remote Control are turned off",
    };
  }
  let f;
  let n;
  let d = false;
  if ("effortLevel" in e && !isRequestedEffortTheHeldLevel(model, e.effortLevel, getAppState())) {
    d = true;
    if (e.effortLevel != null) {
      let u = parseEffortValue(e.effortLevel) ?? resolveEffortKeyword(e.effortLevel);
      if (typeof u !== "string" || !isEffortLevel(u)) {
        logFeatureBad("bridge_flag_settings", "invalid_effort_level");
        return {
          ok: false,
          error: "apply_flag_settings: unrecognized effortLevel",
        };
      }
      f = u;
      n = clampEffortToCap(u, model);
    }
    let effortEnvOverride = getEffortEnvOverride();
    if (effortEnvOverride !== undefined && n !== effortEnvOverride) {
      logFeatureBad("bridge_flag_settings", "env_override");
      return {
        ok: false,
        error: "apply_flag_settings: CLAUDE_CODE_EFFORT_LEVEL overrides effort for this session",
      };
    }
  }
  let c = parseEffortKeyword(e.effortLevel) === "ultracode";
  let a = "ultracode" in e ? e.ultracode === true : undefined;
  if ((a === true || (a === undefined && c)) && !isUltracodeAvailable(model)) {
    logFeatureBad("bridge_flag_settings", "ultracode_unavailable");
    return {
      ok: false,
      error: `apply_flag_settings: ultracode is not available for this session (${isUltracodeAvailable() ? `${model} does not support it` : "dynamic workflows are off"})`,
    };
  }
  setAppState((p) => {
    let u = d && !c && isEffortChangedFromSession(model, p, f);
    let i = p;
    if (d) {
      let effortSettingOrDefault = toEffortSettingOrDefault(n);
      if (!isSameEffortSetting(i.sessionEffort, effortSettingOrDefault))
        i = {
          ...i,
          sessionEffort: effortSettingOrDefault,
        };
    }
    if (a === undefined) {
      if (c) {
        if (!i.ultracode)
          i = {
            ...i,
            ultracode: true,
          };
      } else if (u && i.ultracode)
        i = {
          ...i,
          ultracode: false,
        };
    } else if ((i.ultracode ?? false) !== a)
      i = {
        ...i,
        ultracode: a,
      };
    return i;
  });
  let appState = getAppState();
  logForDebugging(
    `[bridge] apply_flag_settings applied effort=${resolveEffortLevel(appState) ?? "auto"} ultracode=${appState.ultracode === true}`,
  );
  return {
    ok: true,
  };
}
//@ chunk-7rha57gt.js:1889-2401 placement
/**
 * 解析并种下远程控制会话的 effort 等级（含 ultracode/auto），未知值报错
 */
function seedBridgeEffortLevel(e, { getAppState, setAppState, latch }) {
  let level = parseEffortFlag(e.trim()).level;
  let n = level === undefined ? undefined : parseEffortOrKeyword(level);
  if (n === undefined)
    return {
      ok: false,
      error: "unrecognized effort",
    };
  let d = parseEffortKeyword(level) === "ultracode";
  let seedSetUltracode = !d && latch.seedSetUltracode;
  latch.seedSetUltracode = d;
  setAppState((a) => {
    let l = a;
    if (!isSameEffortSetting(a.sessionEffort, levelEffortSetting(n)))
      l = {
        ...l,
        sessionEffort: levelEffortSetting(n),
      };
    if (d && !l.ultracode)
      l = {
        ...l,
        ultracode: true,
      };
    else if (seedSetUltracode && l.ultracode)
      l = {
        ...l,
        ultracode: false,
      };
    return l;
  });
  logForDebugging(
    `[bridge] effort seeded effort=${resolveEffortLevel(getAppState()) ?? "auto"} ultracode=${getAppState().ultracode === true}`,
  );
  return {
    ok: true,
  };
}
//@ chunk-7rha57gt.js:2401-2860 placement
/**
 * 把 effort 等级、ultracode 状态和请求 id 中有变化的部分通过桥接 reportMetadata 上报（effort_level / is_ultracode_active / effort_request_id）。
 */
function reportBridgeEffortMetadata({ level, ultracodeActive, requestId }) {
  let activeOutboundBridgeHandle = getActiveOutboundBridgeHandle();
  if (!activeOutboundBridgeHandle || !isBridgeEffortSyncEnabled()) return;
  let f = bridgeHostState();
  let n = {};
  if (level !== undefined) {
    f.lastKnownEffort = level;
    if (f.lastReportedEffort !== level) {
      f.lastReportedEffort = level;
      n.effort_level = level;
    }
  }
  if (ultracodeActive !== undefined) {
    f.lastKnownUltracodeActive = ultracodeActive;
    if (f.lastReportedUltracodeActive !== ultracodeActive) {
      f.lastReportedUltracodeActive = ultracodeActive;
      n.is_ultracode_active = ultracodeActive || null;
    }
  }
  if (requestId !== undefined) {
    f.lastKnownEffortRequestId = requestId;
    n.effort_request_id = requestId;
  }
  if (Object.keys(n).length > 0) activeOutboundBridgeHandle.reportMetadata(n);
}
//@ chunk-7rha57gt.js:2860-2994 placement
/**
 * 按当前模型与应用状态算出 effort 默认值和 ultracode 状态并上报给桥接。
 */
function reportEffortForModel(mainLoopModel, r) {
  if (!getActiveOutboundBridgeHandle()) return;
  let modelPickerEffortDefault = getModelPickerEffortDefault(
    mainLoopModel,
    resolveEffortLevel(r, mainLoopModel) ?? carriedEffortOnly(mainLoopModel),
  );
  reportBridgeEffortMetadata({
    level:
      modelPickerEffortDefault === undefined
        ? null
        : resolveEffortLevelOrNull(mainLoopModel, modelPickerEffortDefault),
    ultracodeActive: isUltracodeActive(r.ultracode, mainLoopModel),
  });
}
//@ chunk-7rha57gt.js:2994-3034 placement
/**
 * 按 requestId 上报一次桥接 effort 元数据（先做有界标签化）。
 */
function reportBridgeEffortForRequest(e) {
  reportBridgeEffortMetadata({
    requestId: toBoundedLabel(e),
  });
}
//@ chunk-7rha57gt.js:3034-3125 placement
function getActiveOutboundBridgeHandle() {
  let e = bridgeHostState();
  let r = e.replHandle ?? e.sdkHostedHandle;
  return r && !r.outboundOnly ? r : null;
}
//@ chunk-7rha57gt.js:3125-3327 placement
/**
 * 清空“已上报”记录后把最后一次已知的 effort 状态重新上报（桥接重连时用）。
 */
function resendBridgeEffortMetadata() {
  let e = bridgeHostState();
  e.lastReportedEffort = undefined;
  e.lastReportedUltracodeActive = undefined;
  reportBridgeEffortMetadata({
    level: e.lastKnownEffort,
    ultracodeActive: e.lastKnownUltracodeActive,
    requestId: e.lastKnownEffortRequestId,
  });
}
export {
  resolveEffortLevelOrNull,
  seedBridgeEffortLevel,
  reportEffortForModel,
  applyBridgeFlagSettings,
  reportBridgeEffortForRequest,
  reportBridgeEffortMetadata,
  resendBridgeEffortMetadata,
};
