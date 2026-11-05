/**
 * hooks/notifs/useAutoModeUnavailableNotification.ts
 *
 * auto 模式不可用时（回退到 default）的通知。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useAutoModeUnavailableNotification.ts
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: fingerprint 1
 */
import { getIsRemoteMode } from "../../bootstrap/state.js";
import {
  getAutoModeUnavailableReason,
  getAutoModeUnavailableNotification,
} from "../../utils/permissions/permissionSetup.js";

//@ chunk-czq1j3j2.js:1803691-1804153 fingerprint (2.1.88 match: useAutoModeUnavailableNotification, 0.74)
var useAutoModeUnavailableNotification = {
  id: "auto-mode-unavailable",
  deps: (noticeState) => [
    noticeState.permissionMode,
    noticeState.isAutoModeAvailable,
    noticeState.addNotification,
    noticeState.store,
  ],
  setup() {
    let hasNotified = false;
    let previousMode;
    return ({ addNotification, store, permissionMode, isAutoModeAvailable }) => {
      if (previousMode === undefined) previousMode = permissionMode;
      let prevMode = previousMode;
      previousMode = permissionMode;
      if (getIsRemoteMode()) return;
      if (hasNotified) return;
      if (!(
        permissionMode === "default" &&
        prevMode !== "default" &&
        prevMode !== "auto" &&
        !isAutoModeAvailable
      ))
        return;
      let reason = getAutoModeUnavailableReason();
      if (!reason) return;
      hasNotified = true;
      addNotification({
        key: "auto-mode-unavailable",
        kind: "feedback",
        text: getAutoModeUnavailableNotification(reason),
        color: "warning",
        priority: "medium",
      });
    };
  },
};
export { useAutoModeUnavailableNotification };
