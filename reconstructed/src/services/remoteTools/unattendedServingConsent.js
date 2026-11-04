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

//@ chunk-jxcqr1hv.js:314-616 placement
/**
 * 无人值守服务授权的状态标签，以及被组织设置或用户设置关闭时的说明。
 */
var UNATTENDED_CONSENT_LABELS = {
  accepted: "Allowed",
  declined: "Not allowed",
  unset: "Not asked yet",
};
var FORBIDDEN_BY_ORG_TEXT = "Turned off by your organization's settings (remoteTools.allowUnattendedServing)";
var TURNED_OFF_BY_USER_TEXT =
  "Turned off in your user settings (remoteTools.allowUnattendedServing: false in ~/.claude/settings.json) \u2014 remove it there to re-enable";
//@ chunk-jxcqr1hv.js:616-657 placement
/**
 * 无人值守服务被禁止时的说明文字（区分用户关闭与组织禁止）。
 */
function unattendedServingForbiddenText() {
  return unattendedServingForbiddenBy() === "user" ? TURNED_OFF_BY_USER_TEXT : FORBIDDEN_BY_ORG_TEXT;
}
//@ chunk-jxcqr1hv.js:705-752 placement
/**
 * 是否已接受无人值守服务授权（或视图可能保守为是）。
 */
function isUnattendedServingAccepted() {
  return unattendedServingConsentView() === "accepted" || unattendedServingConsentMayHoldYes();
}
//@ chunk-jxcqr1hv.js:752-1005 placement
/**
 * 保存无人值守服务授权的选择：组织禁止时返回 forbidden，写入失败返回 not_saved，成功后记遥测。
 */
async function saveUnattendedServingConsent(choice) {
  if (choice === "accepted" && managedSettingsForbidUnattendedServing()) return "forbidden";
  let action =
    choice === "accepted"
      ? "accepted"
      : unattendedServingConsentView() === "accepted"
        ? "revoked"
        : "declined";
  if (!(await writeUnattendedServingConsent(choice))) return "not_saved";
  logEvent("tengu_served_unattended_consent", {
    action: fromEnum(action),
    surface: lit("cli"),
  });
  return "saved";
}
export {
  UNATTENDED_CONSENT_LABELS,
  isUnattendedServingAccepted,
  unattendedServingForbiddenText,
  saveUnattendedServingConsent,
};
