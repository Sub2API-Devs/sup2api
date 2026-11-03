/**
 * components/FullscreenUpsellTrial.tsx
 *
 * 2.1.316 新增：全屏试用推荐。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-47mye09a.js (7)
 * attribution: placement 7
 */
import { j, P } from "../../vendor/react/cjs/react.production.js";
import { Cr } from "../state/AppState.js";
import { Nu } from "../context/QueuedMessageContext.js";
import { saveGlobalConfig, getGlobalConfig } from "../utils/config.js";
import { I2t, SZn, P2t, isFullscreenEnvEnabled } from "../utils/fullscreen.js";
import { getInitialSettings_2, updateSettingsForSourceWithTransform } from "../utils/settings/settings.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-47mye09a.js:1004-1008 placement
j();
//@ chunk-47mye09a.js:1008-1063 placement
function y$n() {
  let e = Cr(),
    r = Nu();
  P(() => {
    return;
  }, [e, r]);
}
//@ chunk-47mye09a.js:1063-1108 placement
var vRs = { CLAUDE_CODE_TUI_TRIAL: "fullscreen" };
//@ chunk-47mye09a.js:1108-1208 placement
function recordUpsellSeenCount(e, r) {
  saveGlobalConfig(
    (n) => ((n.fullscreenUpsellSeenCount ?? 0) >= e ? n : { ...n, fullscreenUpsellSeenCount: e }),
    r,
  );
}
//@ chunk-47mye09a.js:1208-1233 placement
function LTr(e) {
  recordUpsellSeenCount(I2t, e);
}
/**
 * 取本会话的全屏推荐展示序号（全局计数加一，受上限），首次计算时写回全局配置。
 */
//@ chunk-47mye09a.js:1233-1413 placement
function getFullscreenUpsellImpression(e) {
  let r = SZn();
  if (r.upsellImpression !== void 0) return r.upsellImpression;
  let min = Math.min((getGlobalConfig().fullscreenUpsellSeenCount ?? 0) + 1, I2t);
  return ((r.upsellImpression = min), recordUpsellSeenCount(min, e), min);
}
/**
 * 全屏试用正常时把 settings.tui=fullscreen 写入用户设置；试用期间用户已显式设置或本会话未全屏时不写。
 */
//@ chunk-47mye09a.js:1413-2287 placement
async function persistFullscreenTrial(e) {
  let trialState = SZn();
  if (trialState.persisted || P2t() !== "fullscreen") return !1;
  if (getInitialSettings_2().tui !== void 0)
    return (
      logForDebugging(
        "fullscreen trial: settings.tui was set explicitly during the trial \u2014 not persisting",
      ),
      !1
    );
  if (!isFullscreenEnvEnabled())
    return (
      logForDebugging(
        "fullscreen trial: renderer is not fullscreen this session (auto-off) \u2014 not persisting",
      ),
      !1
    );
  let tuiAlreadySet = !1,
    { error: error } = await updateSettingsForSourceWithTransform(
      "userSettings",
      (i) => ((tuiAlreadySet = i?.tui !== void 0), tuiAlreadySet ? null : { tui: "fullscreen" }),
      void 0,
      e,
    );
  if (error)
    return (logError(error), logFeatureSad("tui_fullscreen_upsell_trial", "settings_write_failed"), !1);
  if (tuiAlreadySet)
    return (
      logForDebugging(
        "fullscreen trial: settings.tui was set explicitly during the trial (seen inside the queued write) \u2014 not persisting",
      ),
      !1
    );
  return (
    LTr(e),
    (trialState.persisted = !0),
    logFeatureOk("tui_fullscreen_upsell_trial"),
    logEvent("tengu_fullscreen_upsell_trial_persisted", {
      session_age_ms: Math.round(process.uptime() * 1000),
    }),
    logForDebugging("fullscreen trial: healthy \u2014 persisted settings.tui=fullscreen"),
    !0
  );
}

export { getFullscreenUpsellImpression, LTr, vRs, y$n, persistFullscreenTrial };
