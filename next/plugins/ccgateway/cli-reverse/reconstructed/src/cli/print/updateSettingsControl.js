/**
 * cli/print/updateSettingsControl.ts
 *
 * 2.1.316 新增：update_settings 控制请求的校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (4)
 * attribution: placement 4
 */
import { EFFORT_LEVELS, parseEffortLevel } from "../../utils/effort.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:662639-663503 placement
/**
 * 登录被阻止的三条提示（托管策略无法满足/无法确认恢复/旧令牌仍可能有效）与各阶段超时，以及设置来源限制（localSettings 只许 outputStyle、userSettings 只许 effortLevel）。
 */
var LOGIN_BLOCKED_MESSAGES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LOGIN_BLOCKED_POLICY_UNVERIFIED_TEXT;
var LOGIN_BLOCKED_POLICY_RESTORE_FAILED_TEXT;
var LOGIN_BLOCKED_POLICY_MAY_STILL_VALID_TEXT;
var LOGIN_REVOKE_TIMEOUT_MS;
var LOGIN_RESTORE_TIMEOUT_MS;
var LOGIN_SETTLE_TIMEOUT_MS;
var MCP_CALL_RESULT_LIMITS;
var PRINT_TURN_POLL_MS;
var SETTINGS_SOURCE_RESTRICTIONS;
deferInit("chunk-0yw3taqg.js:662639", () => {
  LOGIN_BLOCKED_MESSAGES = 15000;
  LOGIN_BLOCKED_POLICY_UNVERIFIED_TEXT =
    "Login blocked: this machine's managed settings policy could not be satisfied or verified. Run claude auth login from a terminal for details.";
  LOGIN_BLOCKED_POLICY_RESTORE_FAILED_TEXT =
    "Login blocked: this machine's managed settings policy could not be satisfied or verified; the previous sign-in state could not be confirmed restored and the refused sign-in was revoked. Sign in again: run claude auth login from a terminal for details.";
  LOGIN_BLOCKED_POLICY_MAY_STILL_VALID_TEXT =
    "Login blocked: this machine's managed settings policy could not be satisfied or verified; the previous sign-in state could not be confirmed restored and the refused sign-in may still be valid. Sign in again (run claude auth login from a terminal for details), and ask your admin to revoke it if this device is shared.";
  LOGIN_REVOKE_TIMEOUT_MS = 30000;
  LOGIN_RESTORE_TIMEOUT_MS = 15000;
  LOGIN_SETTLE_TIMEOUT_MS = 5000;
  MCP_CALL_RESULT_LIMITS = 30000;
  PRINT_TURN_POLL_MS = 5000;
  SETTINGS_SOURCE_RESTRICTIONS = {
    localSettings: new Set(["outputStyle"]),
    userSettings: new Set(["effortLevel"]),
  };
});
//@ chunk-0yw3taqg.js:663503-663565 placement (2.1.88 match: supportsPersistence, 0.792)
function isLocalOrUserSettings(destination) {
  return destination === "localSettings" || destination === "userSettings";
}
//@ chunk-0yw3taqg.js:663565-663635 placement
var EFFORT_LEVEL_ERROR; // deferred: uses EFFORT_LEVELS (../../utils/effort.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0yw3taqg.js:663565", () => {
  EFFORT_LEVEL_ERROR = `update_settings: effortLevel must be one of ${EFFORT_LEVELS.join(", ")}`;
});
//@ chunk-0yw3taqg.js:663635-664593 placement
/**
 * 校验 SDK update_settings 请求（远程传输不可用、必须是对象、effortLevel 取值等）。
 */
function validateUpdateSettings(remote, sourceEnabled, destination, settings, allowAuto = false) {
  if (remote) return "update_settings is not available over a remote transport";
  if (typeof settings !== "object" || settings === null || Array.isArray(settings))
    return `update_settings requires \`settings\` to be an object, got ${settings === null ? "null" : Array.isArray(settings) ? "an array" : typeof settings}`;
  if (!isLocalOrUserSettings(destination))
    return `update_settings: unsupported source ${String(destination)}`;
  if (!sourceEnabled)
    return `update_settings: the ${destination} source is disabled for this session (--setting-sources)`;
  let value = settings;
  if (Object.keys(value).length === 0) return "update_settings requires at least one key";
  let allowed = SETTINGS_SOURCE_RESTRICTIONS[destination];
  let filtered = Object.keys(value).filter((key) => !allowed.has(key));
  if (filtered.length > 0) return `update_settings keys not allowed: ${filtered.sort().join(", ")}`;
  let filtered_2 = Object.keys(value).filter((key) => typeof value[key] !== "string");
  if (filtered_2.length > 0)
    return `update_settings values must be strings (deletion is not supported): ${filtered_2.sort().join(", ")}`;
  if (
    destination === "userSettings" &&
    (typeof value.effortLevel !== "string" ||
      (!(allowAuto && value.effortLevel === "auto") && parseEffortLevel(value.effortLevel) === undefined))
  )
    return EFFORT_LEVEL_ERROR;
  return null;
}
export {
  LOGIN_REVOKE_TIMEOUT_MS,
  LOGIN_RESTORE_TIMEOUT_MS,
  PRINT_TURN_POLL_MS,
  LOGIN_SETTLE_TIMEOUT_MS,
  MCP_CALL_RESULT_LIMITS,
  LOGIN_BLOCKED_MESSAGES,
  LOGIN_BLOCKED_POLICY_UNVERIFIED_TEXT,
  LOGIN_BLOCKED_POLICY_RESTORE_FAILED_TEXT,
  LOGIN_BLOCKED_POLICY_MAY_STILL_VALID_TEXT,
  validateUpdateSettings,
  EFFORT_LEVEL_ERROR,
};
