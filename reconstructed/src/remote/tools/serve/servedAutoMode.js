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
function autoModeRefusedForServedCallsWhy(n) {
  try {
    if (autoModeRefusedHere()) return getAutoModeUnavailableReason() === "settings" ? "settings" : "breaker";
    if (isServedSettingRefused("auto_mode_off")) return "settings";
    let e = isServedSettingRefused("unattended_serving_off");
    if (!unattendedServingConsentPending(n) && !e) return "none";
    if (managedSettingsForbidUnattendedServing() || e) return "consent_forced_off";
    let t = unattendedServingConsentView();
    if (t === "declined") return "consent_declined";
    if (t === "accepted" || unattendedServingConsentUnreadable()) return "consent_unknown";
    return hostGrantOutsideSandbox() ? "sandbox_off" : "consent_unset";
  } catch {
    return "consent_unknown";
  }
}
//@ chunk-vpphf2a1.js:838-1030 placement
function autoOffNotice(targetName) {
  let e = autoModeRefusedForServedCallsWhy();
  if (e === "none") return;
  return {
    key: `served-auto-off-${e === "consent_unset" || e === "consent_declined" ? "consent" : e}`,
    text: REMOTE_TOOLS_CONSENT_TEXT.auto_off_notice(
      targetName,
      REMOTE_TOOLS_CONSENT_TEXT[`auto_off.reason.${e}`],
    ),
  };
}
export { autoModeRefusedForServedCalls, autoOffNotice, autoModeRefusedForServedCallsWhy };
