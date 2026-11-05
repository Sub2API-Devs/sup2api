/**
 * components/LogoV2/AutoModeDefaultNotice.tsx
 *
 * 2.1.316 新增：auto mode 默认提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hnxhr3bs.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { isAutoModeFromFallback } from "../../utils/permissions/autoModeState.js";
import { isSessionRestored } from "../../utils/sessionRestore.js";
import { getRootSession, getIsRemoteMode } from "../../bootstrap/state.js";
import { isActingAsBgJob } from "../../utils/concurrentSessions.js";
import { env } from "../../utils/env.js";
import { isAutoModeGateEnabled } from "../../utils/permissions/permissionSetup.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-hnxhr3bs.js:85566-85904 placement
var AUTO_DEFAULT_NOTICE_TITLE = "Auto mode is now Claude Code's default permission mode.";
var AUTO_DEFAULT_NOTICE_BODY =
  "Auto mode lets Claude handle permission prompts automatically. Claude checks each tool call for risky actions and prompt injection before executing, runs the ones it assesses as lower-risk, and blocks the rest.";
var AUTO_DEFAULT_NOTICE_URL = "https://code.claude.com/docs/en/permission-modes";
//@ chunk-hnxhr3bs.js:85904-86085 placement
function shouldShowAutoDefaultNotice(permissionMode) {
  let globalConfig = getGlobalConfig();
  return (
    isAutoModeFromFallback() &&
    permissionMode === "auto" &&
    !isSessionRestored(getRootSession().host) &&
    !isActingAsBgJob() &&
    !getIsRemoteMode() &&
    !env.CLAUDE_BRIDGE_REATTACH_SESSION &&
    isAutoModeGateEnabled() &&
    globalConfig.hasCompletedOnboarding === true &&
    !globalConfig.hasSeenAutoDefaultNotice
  );
}
//@ chunk-hnxhr3bs.js:86085-86239 placement
function shouldShowAutoModeEntryWarning() {
  return (
    !["policySettings", "userSettings", "flagSettings"].some(
      (source) => getSettingsForSource(source)?.skipAutoPermissionPrompt === true,
    ) && !getGlobalConfig().hasSeenAutoModeEntryWarning
  );
}
//@ chunk-hnxhr3bs.js:86239-86267 placement
var AUTO_MODE_DEFAULT = "auto-mode-default";
//@ chunk-hnxhr3bs.js:86267-86397 placement
function markAutoDefaultNoticeSeen(storageV5) {
  saveGlobalConfig(
    (config) =>
      config.hasSeenAutoDefaultNotice
        ? config
        : {
            ...config,
            hasSeenAutoDefaultNotice: true,
          },
    storageV5,
  );
  logEvent("tengu_auto_default_notice_shown", {});
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
