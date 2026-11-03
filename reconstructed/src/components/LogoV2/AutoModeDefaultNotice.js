/**
 * components/LogoV2/AutoModeDefaultNotice.tsx
 *
 * 2.1.316 新增：auto mode 默认提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (5)
 * attribution: placement 5
 */
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { isAutoModeFromFallback } from "../../utils/permissions/autoModeState.js";
import { Xj } from "../../utils/sessionRestore.js";
import { getRootSession, getIsRemoteMode } from "../../bootstrap/state.js";
import { isActingAsBgJob } from "../../utils/concurrentSessions.js";
import { env } from "../../utils/env.js";
import { isAutoModeGateEnabled } from "../../utils/permissions/permissionSetup.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-ag5x7vhf.js:86081-86419 placement
var AUTO_DEFAULT_NOTICE_TITLE = "Auto mode is now Claude Code's default permission mode.",
  AUTO_DEFAULT_NOTICE_BODY =
    "Auto mode lets Claude handle permission prompts automatically. Claude checks each tool call for risky actions and prompt injection before executing, runs the ones it assesses as lower-risk, and blocks the rest.",
  AUTO_DEFAULT_NOTICE_URL = "https://code.claude.com/docs/en/permission-modes";
//@ chunk-ag5x7vhf.js:86419-86600 placement
function shouldShowAutoDefaultNotice(m) {
  let h = getGlobalConfig();
  return (
    isAutoModeFromFallback() &&
    m === "auto" &&
    !Xj(getRootSession().host) &&
    !isActingAsBgJob() &&
    !getIsRemoteMode() &&
    !env.CLAUDE_BRIDGE_REATTACH_SESSION &&
    isAutoModeGateEnabled() &&
    h.hasCompletedOnboarding === !0 &&
    !h.hasSeenAutoDefaultNotice
  );
}
//@ chunk-ag5x7vhf.js:86600-86754 placement
function shouldShowAutoModeEntryWarning() {
  return (
    !["policySettings", "userSettings", "flagSettings"].some(
      (h) => getSettingsForSource(h)?.skipAutoPermissionPrompt === !0,
    ) && !getGlobalConfig().hasSeenAutoModeEntryWarning
  );
}
//@ chunk-ag5x7vhf.js:86754-86782 placement
var AUTO_MODE_DEFAULT = "auto-mode-default";
//@ chunk-ag5x7vhf.js:86782-86912 placement
function markAutoDefaultNoticeSeen(m) {
  (saveGlobalConfig((h) => (h.hasSeenAutoDefaultNotice ? h : { ...h, hasSeenAutoDefaultNotice: !0 }), m),
    logEvent("tengu_auto_default_notice_shown", {}));
}

export {
  shouldShowAutoDefaultNotice,
  AUTO_MODE_DEFAULT,
  shouldShowAutoModeEntryWarning,
  markAutoDefaultNoticeSeen,
  AUTO_DEFAULT_NOTICE_TITLE,
  AUTO_DEFAULT_NOTICE_BODY,
  AUTO_DEFAULT_NOTICE_URL,
};
