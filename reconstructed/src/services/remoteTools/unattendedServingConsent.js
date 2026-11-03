/**
 * services/remoteTools/unattendedServingConsent.ts
 *
 * 2.1.316 新增：允许本机无人值守地为远程会话执行工具的同意（remoteTools.allowUnattendedServing）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jxcqr1hv.js (4)
 * attribution: placement 4
 */
import {
  unattendedServingForbiddenBy,
  unattendedServingConsentView,
  unattendedServingConsentMayHoldYes,
  managedSettingsForbidUnattendedServing,
  writeUnattendedServingConsent,
} from "./unattendedConsentStore.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, lit } from "../analytics/safeMetadata.js";

/**
 * 无人值守服务授权的状态标签，以及被组织设置或用户设置关闭时的说明。
 */
//@ chunk-jxcqr1hv.js:314-616 placement
var UNATTENDED_CONSENT_LABELS = { accepted: "Allowed", declined: "Not allowed", unset: "Not asked yet" },
  FORBIDDEN_BY_ORG_TEXT = "Turned off by your organization's settings (remoteTools.allowUnattendedServing)",
  TURNED_OFF_BY_USER_TEXT =
    "Turned off in your user settings (remoteTools.allowUnattendedServing: false in ~/.claude/settings.json) \u2014 remove it there to re-enable";
//@ chunk-jxcqr1hv.js:616-657 placement
function Ban() {
  return unattendedServingForbiddenBy() === "user" ? TURNED_OFF_BY_USER_TEXT : FORBIDDEN_BY_ORG_TEXT;
}
//@ chunk-jxcqr1hv.js:705-752 placement
function bKn() {
  return unattendedServingConsentView() === "accepted" || unattendedServingConsentMayHoldYes();
}
/**
 * 保存无人值守服务授权的选择：组织禁止时返回 forbidden，写入失败返回 not_saved，成功后记遥测。
 */
//@ chunk-jxcqr1hv.js:752-1005 placement
async function saveUnattendedServingConsent(choice) {
  if (choice === "accepted" && managedSettingsForbidUnattendedServing()) return "forbidden";
  let n =
    choice === "accepted"
      ? "accepted"
      : unattendedServingConsentView() === "accepted"
        ? "revoked"
        : "declined";
  if (!(await writeUnattendedServingConsent(choice))) return "not_saved";
  return (logEvent("tengu_served_unattended_consent", { action: fromEnum(n), surface: lit("cli") }), "saved");
}

export { UNATTENDED_CONSENT_LABELS, bKn, Ban, saveUnattendedServingConsent };
