/**
 * hooks/notifs/useSettingsErrors.tsx
 *
 * 设置校验错误与权限模式冲突（如 workflow auto 不可用）的通知。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useSettingsErrors.tsx
 * pieces: chunk-8prszgkd.js (4), chunk-czq1j3j2.js (3)
 * attribution: placement 3, callgraph-fingerprint 1, sole-consumer 2, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState, useSetAppState } from "../../state/AppState.js";
import { useNotifications } from "../../context/notifications.js";
import { canCycleToAuto } from "../../utils/permissions/getNextPermissionMode.js";
import {
  setPermissionModeWithGuards,
  getAutoModeUnavailableText,
} from "../../utils/permissions/permissionSetup.js";
import { splitStatusNotices } from "../../utils/settings/settingsErrorsHeadless.js";
import { formatInvalidSettingNotice } from "../../utils/settings/settingsNotices.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { logSetupIssues } from "../../utils/notifications/setupIssues.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8prszgkd.js:23168-23172 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8prszgkd.js:23168", () => {
  init_react_production();
});
//@ chunk-8prszgkd.js:33880-33926 placement
function selectToolPermissionContext(appState) {
  return appState.toolPermissionContext;
}
//@ chunk-8prszgkd.js:33926-33971 placement
/**
 * 导出值：WORKFLOW_HINT_TEXT（"workflows run best with it on"）；位于「设置校验错误与权限模式冲突（如 workflow auto 不可用）的通知」模块。
 */
var WORKFLOW_HINT_TEXT = "\xB7 workflows run best with it on";
//@ chunk-8prszgkd.js:33971-34713 callgraph-fingerprint (2.1.88 match: useSettingsErrors, 0.187)
function useSettingsErrors(requestSource) {
  let $ = useMemoCache(10);
  let toolPermissionContext = useAppState(selectToolPermissionContext);
  let setAppState = useSetAppState();
  let { addNotification } = useNotifications();
  let canOfferAutoMode;
  if ($[0] !== toolPermissionContext) {
    canOfferAutoMode =
      (toolPermissionContext.mode === "default" || toolPermissionContext.mode === "acceptEdits") &&
      canCycleToAuto(toolPermissionContext);
    $[0] = toolPermissionContext;
    $[1] = canOfferAutoMode;
  } else canOfferAutoMode = $[1];
  let canOfferAutoModeFlag = canOfferAutoMode;
  let offered = requestSource?.type === "workflow-agent" && canOfferAutoModeFlag;
  let enableAutoMode;
  if ($[2] !== addNotification || $[3] !== setAppState || $[4] !== toolPermissionContext) {
    enableAutoMode = (source) => {
      let promptSource = source === undefined ? "workflow_permission_prompt" : source;
      if (
        !setPermissionModeWithGuards(
          "auto",
          toolPermissionContext,
          (update) =>
            setAppState((prev) => {
              let nextContext = update(prev.toolPermissionContext);
              if (nextContext === prev.toolPermissionContext) {
                return prev;
              }
              return {
                ...prev,
                toolPermissionContext: nextContext,
              };
            }),
          promptSource,
        ).ok
      ) {
        addNotification({
          key: "workflow-auto-mode-unavailable",
          kind: "warning",
          text: getAutoModeUnavailableText(),
          color: "warning",
          priority: "high",
        });
        return false;
      }
      return true;
    };
    $[2] = addNotification;
    $[3] = setAppState;
    $[4] = toolPermissionContext;
    $[5] = enableAutoMode;
  } else enableAutoMode = $[5];
  let enableAutoMode_2 = enableAutoMode;
  let result;
  if ($[6] !== canOfferAutoModeFlag || $[7] !== enableAutoMode_2 || $[8] !== offered) {
    result = {
      offered,
      canOfferAutoMode: canOfferAutoModeFlag,
      enableAutoMode: enableAutoMode_2,
    };
    $[6] = canOfferAutoModeFlag;
    $[7] = enableAutoMode_2;
    $[8] = offered;
    $[9] = result;
  } else result = $[9];
  return result;
}
//@ chunk-czq1j3j2.js:1835134-1835189 sole-consumer
function invalidSettingsEntries() {
  return splitStatusNotices(formatInvalidSettingNotice().errors).invalidEntries;
}
//@ chunk-czq1j3j2.js:1835189-1835254 fingerprint (2.1.88 match: SETTINGS_ERRORS_NOTIFICATION_KEY, 0.672)
var SETTINGS_ERRORS_NOTIFICATION_KEY = {
  id: "settings-errors",
  deps: (noticeState) => [noticeState.store],
  setup: () => watchSettingsErrorCount,
};
//@ chunk-czq1j3j2.js:1835254-1835521 sole-consumer
function watchSettingsErrorCount({ store }) {
  function applySettingsErrors(errors) {
    if (isRemoteSessionAvailable()) return;
    logSetupIssues("settings", errors.length);
    store.setState((state) => {
      if (state.setupIssues.settingsErrorCount === errors.length) return state;
      return {
        ...state,
        setupIssues: {
          ...state.setupIssues,
          settingsErrorCount: errors.length,
        },
      };
    });
  }
  applySettingsErrors(invalidSettingsEntries());
  return settingsChangeDetector.subscribe(() => applySettingsErrors(invalidSettingsEntries()));
}
export { useSettingsErrors, WORKFLOW_HINT_TEXT, SETTINGS_ERRORS_NOTIFICATION_KEY };
