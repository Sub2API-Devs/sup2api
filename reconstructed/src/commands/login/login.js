/**
 * commands/login/login.tsx
 *
 * （切分有误）确认快捷键提示与登录后钩子（runPostLoginHooks），/login 主体在 chunk-vrmtstb0
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/login/login.tsx
 * pieces: chunk-tyg7f3ek.js (1)
 * attribution: fingerprint 1
 */
import { applySettingsChange } from "../../utils/settings/applySettingsChange.js";
import { isFastModeEnabled } from "../../utils/fastMode.js";
import { refreshFastModeFromSettings } from "../fast/fast.js";
import { readAdvisorModelSetting } from "../../utils/advisor.js";
import { logEvent } from "../../services/analytics/index.js";
import { checkAutoModeInUse } from "../../utils/permissions/autoModeTransition.js";

//@ chunk-tyg7f3ek.js:509827-510177 fingerprint = call (0.322)
function call({
  session: session,
  source: source,
  getAppState: getAppState,
  setAppState: setAppState,
  storageV5: storageV5,
}) {
  if ((applySettingsChange(session, source, setAppState, storageV5), isFastModeEnabled()))
    refreshFastModeFromSettings(getAppState, setAppState, storageV5);
  let advisorModel = getAppState().advisorModel;
  setAppState((success) => {
    let w = readAdvisorModelSetting(success.settings);
    return success.advisorModel === w ? success : { ...success, advisorModel: w };
  });
  let advisorModel_2 = getAppState().advisorModel;
  if (advisorModel !== advisorModel_2)
    logEvent("tengu_advisor_settings_sync", { applied: advisorModel_2 !== void 0 });
  return checkAutoModeInUse(getAppState().toolPermissionContext, setAppState, getAppState().fastMode);
}

export { call };
