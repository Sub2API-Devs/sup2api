/**
 * hooks/notifs/useSettingsErrors.tsx
 *
 * 设置校验错误与权限模式冲突（如 workflow auto 不可用）的通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useSettingsErrors.tsx
 * pieces: chunk-0e8j1zzj.js (4), chunk-18hwfzwa.js (3)
 * attribution: placement 3, callgraph-fingerprint 1, sole-consumer 2, fingerprint 1
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-0e8j1zzj.js:24742-24746 placement
init_react_production();
//@ chunk-0e8j1zzj.js:24746-24792 placement
function selectToolPermissionContext(T) {
  return T.toolPermissionContext;
}
//@ chunk-0e8j1zzj.js:24792-24837 placement
/**
 * 导出值：WORKFLOW_HINT_TEXT（"workflows run best with it on"）；位于「设置校验错误与权限模式冲突（如 workflow auto 不可用）的通知」模块。
 */
var WORKFLOW_HINT_TEXT = "\xB7 workflows run best with it on";
//@ chunk-0e8j1zzj.js:24837-25579 callgraph-fingerprint = useSettingsErrors (0.187)
function useSettingsErrors(requestSource) {
  let $ = w(10);
  let toolPermissionContext = useAppState(selectToolPermissionContext);
  let setAppState = useSetAppState();
  let { addNotification } = useNotifications();
  let u;
  if ($[0] !== toolPermissionContext) {
    u =
      (toolPermissionContext.mode === "default" || toolPermissionContext.mode === "acceptEdits") &&
      canCycleToAuto(toolPermissionContext);
    $[0] = toolPermissionContext;
    $[1] = u;
  } else u = $[1];
  let i = u;
  let offered = requestSource?.type === "workflow-agent" && i;
  let k;
  if ($[2] !== addNotification || $[3] !== setAppState || $[4] !== toolPermissionContext) {
    k = (f) => {
      let g = f === undefined ? "workflow_permission_prompt" : f;
      if (
        !setPermissionModeWithGuards(
          "auto",
          toolPermissionContext,
          (M) =>
            setAppState((N) => {
              let x = M(N.toolPermissionContext);
              if (x === N.toolPermissionContext) {
                return N;
              }
              return {
                ...N,
                toolPermissionContext: x,
              };
            }),
          g,
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
    $[5] = k;
  } else k = $[5];
  let enableAutoMode = k;
  let f;
  if ($[6] !== i || $[7] !== enableAutoMode || $[8] !== offered) {
    f = {
      offered,
      canOfferAutoMode: i,
      enableAutoMode,
    };
    $[6] = i;
    $[7] = enableAutoMode;
    $[8] = offered;
    $[9] = f;
  } else f = $[9];
  return f;
}
//@ chunk-18hwfzwa.js:1787159-1787214 sole-consumer
function invalidSettingsEntries() {
  return splitStatusNotices(formatInvalidSettingNotice().errors).invalidEntries;
}
//@ chunk-18hwfzwa.js:1787214-1787279 fingerprint = SETTINGS_ERRORS_NOTIFICATION_KEY (0.672)
var SETTINGS_ERRORS_NOTIFICATION_KEY = {
  id: "settings-errors",
  deps: (h) => [h.store],
  setup: () => watchSettingsErrorCount,
};
//@ chunk-18hwfzwa.js:1787279-1787546 sole-consumer
function watchSettingsErrorCount({ store }) {
  function x(D) {
    if (isRemoteSessionAvailable()) return;
    logSetupIssues("settings", D.length);
    store.setState((L) => {
      if (L.setupIssues.settingsErrorCount === D.length) return L;
      return {
        ...L,
        setupIssues: {
          ...L.setupIssues,
          settingsErrorCount: D.length,
        },
      };
    });
  }
  x(invalidSettingsEntries());
  return settingsChangeDetector.subscribe(() => x(invalidSettingsEntries()));
}
export { useSettingsErrors, WORKFLOW_HINT_TEXT, SETTINGS_ERRORS_NOTIFICATION_KEY };
