/**
 * remote/tools/serve/servedAutoMode.ts
 *
 * 2.1.316 新增。远端服务调用拒绝 auto 模式的原因。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d8r64egc.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  autoModeRefusedHere,
  getAutoModeUnavailableReason,
} from "../../../utils/permissions/permissionSetup.js";
import { isServedSettingRefused } from "../servedOwnerSettings.js";
import {
  unattendedServingConsentPending,
  managedSettingsForbidUnattendedServing,
  unattendedServingConsentView,
  unattendedServingConsentUnreadable,
  hostGrantOutsideSandbox,
} from "../../../services/remoteTools/unattendedConsentStore.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../consentText.js";

//@ chunk-d8r64egc.js:356-444 placement
function autoModeRefusedForServedCalls() {
  return (
    autoModeRefusedHere() ||
    isServedSettingRefused("auto_mode_off") ||
    unattendedServingConsentPending() ||
    isServedSettingRefused("unattended_serving_off")
  );
}
//@ chunk-d8r64egc.js:444-840 placement
/**
 * 远端服务调用拒绝 auto 模式的原因。
 */
function autoModeRefusedForServedCallsWhy(session) {
  try {
    if (autoModeRefusedHere()) return getAutoModeUnavailableReason() === "settings" ? "settings" : "breaker";
    if (isServedSettingRefused("auto_mode_off")) return "settings";
    let servingOff = isServedSettingRefused("unattended_serving_off");
    if (!unattendedServingConsentPending(session) && !servingOff) return "none";
    if (managedSettingsForbidUnattendedServing() || servingOff) return "consent_forced_off";
    let consentView = unattendedServingConsentView();
    if (consentView === "declined") return "consent_declined";
    if (consentView === "accepted" || unattendedServingConsentUnreadable()) return "consent_unknown";
    return hostGrantOutsideSandbox() ? "sandbox_off" : "consent_unset";
  } catch {
    return "consent_unknown";
  }
}
//@ chunk-d8r64egc.js:840-1032 placement
function autoOffNotice(targetName) {
  let reason = autoModeRefusedForServedCallsWhy();
  if (reason === "none") return;
  return {
    key: `served-auto-off-${reason === "consent_unset" || reason === "consent_declined" ? "consent" : reason}`,
    text: REMOTE_TOOLS_CONSENT_TEXT.auto_off_notice(
      targetName,
      REMOTE_TOOLS_CONSENT_TEXT[`auto_off.reason.${reason}`],
    ),
  };
}
export { autoModeRefusedForServedCalls, autoModeRefusedForServedCallsWhy, autoOffNotice };
