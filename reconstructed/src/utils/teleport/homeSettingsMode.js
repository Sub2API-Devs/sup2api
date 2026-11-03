/**
 * utils/teleport/homeSettingsMode.ts
 *
 * 2.1.316 新增：家目录设置模式
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: placement 18
 */
import { gor, Uxe } from "../permissions/sensitivePaths.js";
import {
  isSettingsToCloudEnabled,
  isSettingsToCloudEnabledCached,
  canForwardHomeSettings,
  getHomeSettingsForwardingBlocker,
} from "../../services/analytics/violinGates.js";
import {
  getGlobalConfig,
  Obr,
  saveGlobalConfigDurably,
  saveGlobalConfig,
  readGlobalConfigFromDiskOrThrow,
} from "../config.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { getEnabledSettingSources } from "../settings/constants.js";

//@ chunk-e6aww6q8.js:1939213-1939237 placement
function bon() {
  return !1;
}
//@ chunk-e6aww6q8.js:1939237-1939261 placement
function oN(e) {
  return !1;
}
//@ chunk-e6aww6q8.js:1939261-1939346 placement
function pwt(e) {
  return oN(e)
    ? { enabled: gor, enabledNow: Uxe }
    : { enabled: isSettingsToCloudEnabled, enabledNow: isSettingsToCloudEnabledCached };
}
//@ chunk-e6aww6q8.js:1939346-1939397 placement
function kBo(e) {
  return e === "forward" ? "host" : void 0;
}
//@ chunk-e6aww6q8.js:1939397-1939421 placement
function Rpn() {
  return !0;
}
//@ chunk-e6aww6q8.js:1939421-1939465 placement
function hKe({ hostConsent: hostConsent }) {
  return kBo(hostConsent);
}
//@ chunk-e6aww6q8.js:1939465-1939561 placement
function gbe() {
  let remoteHomeSettingsMode = getGlobalConfig().remoteHomeSettingsMode;
  return fZ(remoteHomeSettingsMode) ?? (remoteHomeSettingsMode === void 0 ? void 0 : "keep_local");
}
//@ chunk-e6aww6q8.js:1939561-1939661 placement
function isForwardModeEffective(e) {
  if (e === void 0 || e === "stored") return (e === "stored" || Rpn()) && Rtr() === "forward";
  return !0;
}
//@ chunk-e6aww6q8.js:1939661-1939751 placement
function yKe({
  launchConsent: launchConsent,
  isProjectSynced: isProjectSynced,
  launchMayForward: launchMayForward,
  surface: surface,
  trigger: trigger,
}) {}
//@ chunk-e6aww6q8.js:1939751-1939761 placement
var vtr = 3;
//@ chunk-e6aww6q8.js:1939761-1939808 placement
function fZ(e) {
  return Obr.includes(e) ? e : void 0;
}
//@ chunk-e6aww6q8.js:1939808-1939884 placement
function Rtr() {
  if (!canForwardHomeSettings(isSettingsToCloudEnabledCached())) return "unspecified";
  return mwt() ?? "unspecified";
}
//@ chunk-e6aww6q8.js:1939884-1939938 placement
function mwt() {
  return fZ(getGlobalConfig().remoteHomeSettingsMode);
}
/**
 * 保存家目录设置转发模式到全局配置（forward 前检查是否被阻止），记录先前值并上报事件。
 */
//@ chunk-e6aww6q8.js:1939938-1940718 placement
async function saveHomeSettingsMode(mode, n) {
  if (mode === "forward") {
    let h = getHomeSettingsForwardingBlocker(await isSettingsToCloudEnabled());
    if (h !== null) return (logFeatureBad("remote_home_settings_mode", h), "refused");
  }
  let r = { previous: "unspecified" },
    s = await saveGlobalConfigDurably(
      (h) => (
        (r.previous = fZ(h.remoteHomeSettingsMode) ?? "unspecified"),
        { ...h, remoteHomeSettingsMode: mode }
      ),
      n,
    );
  if (r.previous !== mode)
    logEvent("tengu_home_settings_mode_set", {
      mode: fromEnum(mode),
      previous: fromEnum(r.previous),
      persisted: s,
    });
  if (!s) {
    let h = await readStoredHomeSettingsMode(n);
    if (h !== null && h.mode !== mode) {
      let mode_2 = h.mode;
      for (let S = 0; S < vtr; S++) {
        let w = mode_2,
          L = !1;
        saveGlobalConfig((q) => {
          if (L) return q;
          return ((L = !0), { ...q, remoteHomeSettingsMode: w });
        }, n);
        let G = await readStoredHomeSettingsMode(n);
        if (G === null || G.mode === mode_2) break;
        mode_2 = G.mode;
      }
      if (mode_2 !== mode) return (logFeatureBad("remote_home_settings_mode", "not_stored"), "not_stored");
    }
    return (logFeatureSad("remote_home_settings_mode", "unconfirmed"), "unconfirmed");
  }
  return (logFeatureOk("remote_home_settings_mode"), "written");
}
//@ chunk-e6aww6q8.js:1940718-1940834 placement
function shouldForwardHomeSettings(e) {
  return (
    canForwardHomeSettings(e.settingsToCloudEnabled) &&
    e.launchMayForward &&
    !oN(e.launchConsent) &&
    isForwardModeEffective(e.launchConsent)
  );
}
//@ chunk-e6aww6q8.js:1940834-1940975 placement
function shouldPromptHomeSettingsMode(e) {
  if (!canForwardHomeSettings(isSettingsToCloudEnabledCached())) return !1;
  let n = homeSettingsPromptSkipReason(e);
  if (n !== null) return (logEvent("tengu_home_settings_mode_prompt_skipped", { reason: fromEnum(n) }), !1);
  return !0;
}
/**
 * 判断为何跳过家目录设置模式询问：非交互、未保持附着、启动参数、已回答等。
 */
//@ chunk-e6aww6q8.js:1940975-1941312 placement
function homeSettingsPromptSkipReason({
  staysAttached: staysAttached,
  launchMayForward: launchMayForward,
  launchConsent: launchConsent,
}) {
  if (getIsNonInteractiveSession()) return "non_interactive";
  if (!staysAttached) return "not_attached";
  if (!launchMayForward) return "launch_flag";
  if (launchConsent !== void 0) return launchConsent === "stored" ? "answered" : launchConsent;
  if (!getEnabledSettingSources().includes("userSettings")) return "user_settings_disabled";
  if (fZ(getGlobalConfig().remoteHomeSettingsMode) !== void 0) return "answered";
  return null;
}
//@ chunk-e6aww6q8.js:1941312-1941496 placement
async function readStoredHomeSettingsMode(e) {
  let n = await readGlobalConfigFromDiskOrThrow(e).catch(() => {
    return;
  });
  if (typeof n !== "object" || n === null) return null;
  return { mode: fZ("remoteHomeSettingsMode" in n ? n.remoteHomeSettingsMode : void 0) };
}

export {
  hKe,
  gbe,
  oN,
  shouldPromptHomeSettingsMode,
  yKe,
  shouldForwardHomeSettings,
  mwt,
  Rpn,
  pwt,
  isForwardModeEffective,
  bon,
  kBo,
  saveHomeSettingsMode,
};
