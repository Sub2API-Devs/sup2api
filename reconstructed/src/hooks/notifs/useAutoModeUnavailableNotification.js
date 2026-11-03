/**
 * hooks/notifs/useAutoModeUnavailableNotification.ts
 *
 * auto 模式不可用时（回退到 default）的通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useAutoModeUnavailableNotification.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { getIsRemoteMode } from "../../bootstrap/state.js";
import {
  getAutoModeUnavailableReason,
  getAutoModeUnavailableNotification,
} from "../../utils/permissions/permissionSetup.js";

//@ chunk-18hwfzwa.js:1756430-1756892 fingerprint = useAutoModeUnavailableNotification (0.739)
var useAutoModeUnavailableNotification = {
  id: "auto-mode-unavailable",
  deps: (h) => [h.permissionMode, h.isAutoModeAvailable, h.addNotification, h.store],
  setup() {
    let h = !1,
      x;
    return ({
      addNotification: addNotification,
      store: store,
      permissionMode: permissionMode,
      isAutoModeAvailable: isAutoModeAvailable,
    }) => {
      if (x === void 0) x = permissionMode;
      let Re = x;
      if (((x = permissionMode), getIsRemoteMode())) return;
      if (h) return;
      if (!(permissionMode === "default" && Re !== "default" && Re !== "auto" && !isAutoModeAvailable))
        return;
      let He = getAutoModeUnavailableReason();
      if (!He) return;
      ((h = !0),
        addNotification({
          key: "auto-mode-unavailable",
          kind: "feedback",
          text: getAutoModeUnavailableNotification(He),
          color: "warning",
          priority: "medium",
        }));
    };
  },
};

export { useAutoModeUnavailableNotification };
