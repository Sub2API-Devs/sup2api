/**
 * commands/login/login.tsx
 *
 * （切分有误）确认快捷键提示与登录后钩子（runPostLoginHooks），/login 主体在 chunk-vrmtstb0
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/login/login.tsx
 * pieces: chunk-0yw3taqg.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { applySettingsChange } from "../../utils/settings/applySettingsChange.js";
import { buildEffortSettingsTable } from "../../utils/effort.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isFastModeEnabled, refreshFastModeFromSettings } from "../../utils/fastMode.js";
import { readAdvisorModelSetting } from "../../utils/advisor.js";
import { logEvent } from "../../services/analytics/index.js";
import { checkAutoModeInUse } from "../../utils/permissions/autoModeTransition.js";

//@ chunk-0yw3taqg.js:549152-549650 placement
function call({ session, source, getAppState, setAppState, storageV5, countsAsStart }) {
  applySettingsChange(session, source, setAppState, storageV5, {
    countsAsStart,
  });
  if (countsAsStart === true) {
    let effortSettingsTable = buildEffortSettingsTable({
      flagLayerAsLaunched: true,
    });
    setAppState((success) =>
      import_sortedIndex_2(success.settingsEffortTable, effortSettingsTable)
        ? success
        : {
            ...success,
            settingsEffortTable: effortSettingsTable,
          },
    );
  }
  if (isFastModeEnabled()) refreshFastModeFromSettings(getAppState, setAppState, storageV5);
  let advisorModel = getAppState().advisorModel;
  setAppState((prev) => {
    let advisorModelSetting = readAdvisorModelSetting(prev.settings);
    return prev.advisorModel === advisorModelSetting
      ? prev
      : {
          ...prev,
          advisorModel: advisorModelSetting,
        };
  });
  let advisorModel_2 = getAppState().advisorModel;
  if (advisorModel !== advisorModel_2)
    logEvent("tengu_advisor_settings_sync", {
      applied: advisorModel_2 !== undefined,
    });
  return checkAutoModeInUse(getAppState().toolPermissionContext, setAppState, getAppState().fastMode);
}
export { call };
