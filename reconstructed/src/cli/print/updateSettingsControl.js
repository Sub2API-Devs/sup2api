/**
 * cli/print/updateSettingsControl.ts
 *
 * 2.1.316 新增：update_settings 控制请求的校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (4)
 * attribution: placement 4
 */
import { EFFORT_LEVELS, parseEffortLevel } from "../../utils/effort.js";

//@ chunk-tyg7f3ek.js:620538-621394 placement
/**
 * 登录被阻止的三条提示（托管策略无法满足/无法确认恢复/旧令牌仍可能有效）与各阶段超时，以及设置来源限制（localSettings 只许 outputStyle、userSettings 只许 effortLevel）。
 */
var LOGIN_BLOCKED_MESSAGES = 15000;
var LOGIN_BLOCKED_POLICY_UNVERIFIED_TEXT =
  "Login blocked: this machine's managed settings policy could not be satisfied or verified. Run claude auth login from a terminal for details.";
var LOGIN_BLOCKED_POLICY_RESTORE_FAILED_TEXT =
  "Login blocked: this machine's managed settings policy could not be satisfied or verified; the previous sign-in state could not be confirmed restored and the refused sign-in was revoked. Sign in again: run claude auth login from a terminal for details.";
var LOGIN_BLOCKED_POLICY_MAY_STILL_VALID_TEXT =
  "Login blocked: this machine's managed settings policy could not be satisfied or verified; the previous sign-in state could not be confirmed restored and the refused sign-in may still be valid. Sign in again (run claude auth login from a terminal for details), and ask your admin to revoke it if this device is shared.";
var LOGIN_VERIFY_TIMEOUT_MS = 30000;
var LOGIN_RESTORE_TIMEOUT_MS = 15000;
var LOGIN_REVOKE_TIMEOUT_MS = 30000;
var LOGIN_SETTLE_TIMEOUT_MS = 5000;
var SETTINGS_SOURCE_RESTRICTIONS = {
  localSettings: new Set(["outputStyle"]),
  userSettings: new Set(["effortLevel"]),
};
//@ chunk-tyg7f3ek.js:621394-621456 placement = supportsPersistence (0.79)
function isLocalOrUserSettings(destination) {
  return destination === "localSettings" || destination === "userSettings";
}
//@ chunk-tyg7f3ek.js:621456-621526 placement
var EFFORT_LEVEL_ERROR = `update_settings: effortLevel must be one of ${EFFORT_LEVELS.join(", ")}`;
//@ chunk-tyg7f3ek.js:621526-622484 placement
/**
 * 校验 SDK update_settings 请求（远程传输不可用、必须是对象、effortLevel 取值等）。
 */
function validateUpdateSettings(e, n, destination, settings, h = false) {
  if (e) return "update_settings is not available over a remote transport";
  if (typeof settings !== "object" || settings === null || Array.isArray(settings))
    return `update_settings requires \`settings\` to be an object, got ${settings === null ? "null" : Array.isArray(settings) ? "an array" : typeof settings}`;
  if (!isLocalOrUserSettings(destination))
    return `update_settings: unsupported source ${String(destination)}`;
  if (!n)
    return `update_settings: the ${destination} source is disabled for this session (--setting-sources)`;
  let y = settings;
  if (Object.keys(y).length === 0) return "update_settings requires at least one key";
  let S = SETTINGS_SOURCE_RESTRICTIONS[destination];
  let filtered = Object.keys(y).filter((key) => !S.has(key));
  if (filtered.length > 0) return `update_settings keys not allowed: ${filtered.sort().join(", ")}`;
  let filtered_2 = Object.keys(y).filter((key) => typeof y[key] !== "string");
  if (filtered_2.length > 0)
    return `update_settings values must be strings (deletion is not supported): ${filtered_2.sort().join(", ")}`;
  if (
    destination === "userSettings" &&
    (typeof y.effortLevel !== "string" ||
      (!(h && y.effortLevel === "auto") && parseEffortLevel(y.effortLevel) === undefined))
  )
    return EFFORT_LEVEL_ERROR;
  return null;
}
export {
  LOGIN_VERIFY_TIMEOUT_MS,
  LOGIN_RESTORE_TIMEOUT_MS,
  LOGIN_SETTLE_TIMEOUT_MS,
  LOGIN_REVOKE_TIMEOUT_MS,
  LOGIN_BLOCKED_MESSAGES,
  LOGIN_BLOCKED_POLICY_UNVERIFIED_TEXT,
  LOGIN_BLOCKED_POLICY_RESTORE_FAILED_TEXT,
  LOGIN_BLOCKED_POLICY_MAY_STILL_VALID_TEXT,
  validateUpdateSettings,
  EFFORT_LEVEL_ERROR,
};
