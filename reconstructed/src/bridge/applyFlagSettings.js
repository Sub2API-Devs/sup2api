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
import { oQr } from "../utils/permissions/permissionSetup.js";
import { ao } from "./bridgeHostState.js";

//@ chunk-7rha57gt.js:440-506 placement
function M_e(e, r) {
  let o = resolveEffortValue(e, r);
  return typeof o === "string" ? o : null;
}
/**
 * 应用远程控制下发的 apply_flag_settings（effort 等），对远程控制禁止的项给出说明
 */
//@ chunk-7rha57gt.js:506-1889 placement
function applyBridgeFlagSettings(e, { model: model, getAppState: getAppState, setAppState: setAppState }) {
  if (!isBridgeEffortSyncEnabled())
    return (
      logFeatureBad("bridge_flag_settings", "disabled"),
      { ok: !1, error: "apply_flag_settings: effort changes over Remote Control are turned off" }
    );
  let f,
    n,
    d = !1;
  if ("effortLevel" in e && !isRequestedEffortTheHeldLevel(model, e.effortLevel, getAppState())) {
    if (((d = !0), e.effortLevel != null)) {
      let u = parseEffortValue(e.effortLevel) ?? resolveEffortKeyword(e.effortLevel);
      if (typeof u !== "string" || !isEffortLevel(u))
        return (
          logFeatureBad("bridge_flag_settings", "invalid_effort_level"),
          { ok: !1, error: "apply_flag_settings: unrecognized effortLevel" }
        );
      ((f = u), (n = clampEffortToCap(u, model)));
    }
    let p = getEffortEnvOverride();
    if (p !== void 0 && n !== p)
      return (
        logFeatureBad("bridge_flag_settings", "env_override"),
        { ok: !1, error: "apply_flag_settings: CLAUDE_CODE_EFFORT_LEVEL overrides effort for this session" }
      );
  }
  let c = parseEffortKeyword(e.effortLevel) === "ultracode",
    a = "ultracode" in e ? e.ultracode === !0 : void 0;
  if ((a === !0 || (a === void 0 && c)) && !isUltracodeAvailable(model))
    return (
      logFeatureBad("bridge_flag_settings", "ultracode_unavailable"),
      {
        ok: !1,
        error: `apply_flag_settings: ultracode is not available for this session (${isUltracodeAvailable() ? `${model} does not support it` : "dynamic workflows are off"})`,
      }
    );
  setAppState((p) => {
    let u = d && !c && isEffortChangedFromSession(model, p, f),
      i = p;
    if (d) {
      let g = toEffortSettingOrDefault(n);
      if (!isSameEffortSetting(i.sessionEffort, g)) i = { ...i, sessionEffort: g };
    }
    if (a === void 0) {
      if (c) {
        if (!i.ultracode) i = { ...i, ultracode: !0 };
      } else if (u && i.ultracode) i = { ...i, ultracode: !1 };
    } else if ((i.ultracode ?? !1) !== a) i = { ...i, ultracode: a };
    return i;
  });
  let l = getAppState();
  return (
    logForDebugging(
      `[bridge] apply_flag_settings applied effort=${resolveEffortLevel(l) ?? "auto"} ultracode=${l.ultracode === !0}`,
    ),
    { ok: !0 }
  );
}
/**
 * 解析并种下远程控制会话的 effort 等级（含 ultracode/auto），未知值报错
 */
//@ chunk-7rha57gt.js:1889-2401 placement
function seedBridgeEffortLevel(e, { getAppState: getAppState, setAppState: setAppState, latch: latch }) {
  let level = parseEffortFlag(e.trim()).level,
    n = level === void 0 ? void 0 : oQr(level);
  if (n === void 0) return { ok: !1, error: "unrecognized effort" };
  let d = parseEffortKeyword(level) === "ultracode",
    c = !d && latch.seedSetUltracode;
  return (
    (latch.seedSetUltracode = d),
    setAppState((a) => {
      let l = a;
      if (!isSameEffortSetting(a.sessionEffort, levelEffortSetting(n)))
        l = { ...l, sessionEffort: levelEffortSetting(n) };
      if (d && !l.ultracode) l = { ...l, ultracode: !0 };
      else if (c && l.ultracode) l = { ...l, ultracode: !1 };
      return l;
    }),
    logForDebugging(
      `[bridge] effort seeded effort=${resolveEffortLevel(getAppState()) ?? "auto"} ultracode=${getAppState().ultracode === !0}`,
    ),
    { ok: !0 }
  );
}
/**
 * 把 effort 等级、ultracode 状态和请求 id 中有变化的部分通过桥接 reportMetadata 上报（effort_level / is_ultracode_active / effort_request_id）。
 */
//@ chunk-7rha57gt.js:2401-2860 placement
function reportBridgeEffortMetadata({
  level: level,
  ultracodeActive: ultracodeActive,
  requestId: requestId,
}) {
  let s = E();
  if (!s || !isBridgeEffortSyncEnabled()) return;
  let f = ao(),
    n = {};
  if (level !== void 0) {
    if (((f.lastKnownEffort = level), f.lastReportedEffort !== level))
      ((f.lastReportedEffort = level), (n.effort_level = level));
  }
  if (ultracodeActive !== void 0) {
    if (((f.lastKnownUltracodeActive = ultracodeActive), f.lastReportedUltracodeActive !== ultracodeActive))
      ((f.lastReportedUltracodeActive = ultracodeActive), (n.is_ultracode_active = ultracodeActive || null));
  }
  if (requestId !== void 0) ((f.lastKnownEffortRequestId = requestId), (n.effort_request_id = requestId));
  if (Object.keys(n).length > 0) s.reportMetadata(n);
}
/**
 * 按当前模型与应用状态算出 effort 默认值和 ultracode 状态并上报给桥接。
 */
//@ chunk-7rha57gt.js:2860-2994 placement
function reportEffortForModel(e, r) {
  if (!E()) return;
  let o = getModelPickerEffortDefault(e, resolveEffortLevel(r, e) ?? carriedEffortOnly(e));
  reportBridgeEffortMetadata({
    level: o === void 0 ? null : M_e(e, o),
    ultracodeActive: isUltracodeActive(r.ultracode, e),
  });
}
//@ chunk-7rha57gt.js:2994-3034 placement
function w6n(e) {
  reportBridgeEffortMetadata({ requestId: toBoundedLabel(e) });
}
//@ chunk-7rha57gt.js:3034-3125 placement
function E() {
  let e = ao(),
    r = e.replHandle ?? e.sdkHostedHandle;
  return r && !r.outboundOnly ? r : null;
}
/**
 * 清空“已上报”记录后把最后一次已知的 effort 状态重新上报（桥接重连时用）。
 */
//@ chunk-7rha57gt.js:3125-3327 placement
function resendBridgeEffortMetadata() {
  let e = ao();
  ((e.lastReportedEffort = void 0),
    (e.lastReportedUltracodeActive = void 0),
    reportBridgeEffortMetadata({
      level: e.lastKnownEffort,
      ultracodeActive: e.lastKnownUltracodeActive,
      requestId: e.lastKnownEffortRequestId,
    }));
}

export {
  M_e,
  seedBridgeEffortLevel,
  reportEffortForModel,
  applyBridgeFlagSettings,
  w6n,
  reportBridgeEffortMetadata,
  resendBridgeEffortMetadata,
};
