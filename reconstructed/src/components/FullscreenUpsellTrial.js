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
import { init_react_production, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useAppStoreDirect } from "../state/AppState.js";
import { useCommandQueueOrDefault } from "../context/QueuedMessageContext.js";
import { saveGlobalConfig, getGlobalConfig } from "../utils/config.js";
import {
  MAX_FULLSCREEN_UPSELL_SHOWS,
  currentFullscreenTrialState,
  resolveFullscreenMode,
  isFullscreenEnvEnabled,
} from "../utils/fullscreen.js";
import { getInitialSettings_2, updateSettingsForSourceWithTransform } from "../utils/settings/settings.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-47mye09a.js:1004-1008 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-47mye09a.js:1004", () => {
  init_react_production();
});
//@ chunk-47mye09a.js:1008-1063 placement
/**
 * 函数 noopTrialEffect（空 effect）。
 */
function noopTrialEffect() {
  let appStoreDirect = useAppStoreDirect();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  useEffect(() => {
    return;
  }, [appStoreDirect, commandQueueOrDefault]);
}
//@ chunk-47mye09a.js:1063-1108 placement
/**
 * 导出值：TRIAL_ENV（CLAUDE_CODE_TUI_TRIAL=fullscreen）。
 */
var TRIAL_ENV = {
  CLAUDE_CODE_TUI_TRIAL: "fullscreen",
};
//@ chunk-47mye09a.js:1108-1208 placement
function recordUpsellSeenCount(count, storageV5) {
  saveGlobalConfig(
    (config) =>
      (config.fullscreenUpsellSeenCount ?? 0) >= count
        ? config
        : {
            ...config,
            fullscreenUpsellSeenCount: count,
          },
    storageV5,
  );
}
//@ chunk-47mye09a.js:1208-1233 placement
/**
 * 函数 setTrialFlag（写入试用标记）。
 */
function setTrialFlag(storageV5) {
  recordUpsellSeenCount(MAX_FULLSCREEN_UPSELL_SHOWS, storageV5);
}
//@ chunk-47mye09a.js:1233-1413 placement
/**
 * 取本会话的全屏推荐展示序号（全局计数加一，受上限），首次计算时写回全局配置。
 */
function getFullscreenUpsellImpression(storageV5) {
  let trialState = currentFullscreenTrialState();
  if (trialState.upsellImpression !== undefined) return trialState.upsellImpression;
  let min = Math.min((getGlobalConfig().fullscreenUpsellSeenCount ?? 0) + 1, MAX_FULLSCREEN_UPSELL_SHOWS);
  trialState.upsellImpression = min;
  recordUpsellSeenCount(min, storageV5);
  return min;
}
//@ chunk-47mye09a.js:1413-2287 placement
/**
 * 全屏试用正常时把 settings.tui=fullscreen 写入用户设置；试用期间用户已显式设置或本会话未全屏时不写。
 */
async function persistFullscreenTrial(storageV5) {
  let trialState = currentFullscreenTrialState();
  if (trialState.persisted || resolveFullscreenMode() !== "fullscreen") return false;
  if (getInitialSettings_2().tui !== undefined) {
    logForDebugging(
      "fullscreen trial: settings.tui was set explicitly during the trial \u2014 not persisting",
    );
    return false;
  }
  if (!isFullscreenEnvEnabled()) {
    logForDebugging(
      "fullscreen trial: renderer is not fullscreen this session (auto-off) \u2014 not persisting",
    );
    return false;
  }
  let tuiAlreadySet = false;
  let { error } = await updateSettingsForSourceWithTransform(
    "userSettings",
    (previous) => {
      tuiAlreadySet = previous?.tui !== undefined;
      return tuiAlreadySet
        ? null
        : {
            tui: "fullscreen",
          };
    },
    undefined,
    storageV5,
  );
  if (error) {
    logError(error);
    logFeatureSad("tui_fullscreen_upsell_trial", "settings_write_failed");
    return false;
  }
  if (tuiAlreadySet) {
    logForDebugging(
      "fullscreen trial: settings.tui was set explicitly during the trial (seen inside the queued write) \u2014 not persisting",
    );
    return false;
  }
  setTrialFlag(storageV5);
  trialState.persisted = true;
  logFeatureOk("tui_fullscreen_upsell_trial");
  logEvent("tengu_fullscreen_upsell_trial_persisted", {
    session_age_ms: Math.round(process.uptime() * 1000),
  });
  logForDebugging("fullscreen trial: healthy \u2014 persisted settings.tui=fullscreen");
  return true;
}
export { getFullscreenUpsellImpression, setTrialFlag, TRIAL_ENV, noopTrialEffect, persistFullscreenTrial };
