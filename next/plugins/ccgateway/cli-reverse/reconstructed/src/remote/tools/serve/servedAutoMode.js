/**
 * remote/tools/serve/servedAutoMode.ts
 *
 * 2.1.316 新增。远端服务调用拒绝 auto 模式的原因。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vpphf2a1.js (3)
 * attribution: placement 3
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

//@ chunk-vpphf2a1.js:355-443 placement
function autoModeRefusedForServedCalls() {
  return (
    autoModeRefusedHere() ||
    isServedSettingRefused("auto_mode_off") ||
    unattendedServingConsentPending() ||
    isServedSettingRefused("unattended_serving_off")
  );
}
//@ chunk-vpphf2a1.js:443-838 placement
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
//@ chunk-vpphf2a1.js:838-1030 placement
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
export { autoModeRefusedForServedCalls, autoOffNotice, autoModeRefusedForServedCallsWhy };
