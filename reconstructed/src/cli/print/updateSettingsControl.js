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
var LOGIN_BLOCKED_MESSAGES = 15000,
  Bx =
    "Login blocked: this machine's managed settings policy could not be satisfied or verified. Run claude auth login from a terminal for details.",
  iz =
    "Login blocked: this machine's managed settings policy could not be satisfied or verified; the previous sign-in state could not be confirmed restored and the refused sign-in was revoked. Sign in again: run claude auth login from a terminal for details.",
  az =
    "Login blocked: this machine's managed settings policy could not be satisfied or verified; the previous sign-in state could not be confirmed restored and the refused sign-in may still be valid. Sign in again (run claude auth login from a terminal for details), and ask your admin to revoke it if this device is shared.",
  Hx = 30000,
  Nx = 15000,
  dz = 30000,
  lz = 5000,
  uz = { localSettings: new Set(["outputStyle"]), userSettings: new Set(["effortLevel"]) };
//@ chunk-tyg7f3ek.js:621394-621456 placement = supportsPersistence (0.79)
function isLocalOrUserSettings(destination) {
  return destination === "localSettings" || destination === "userSettings";
}
//@ chunk-tyg7f3ek.js:621456-621526 placement
var EFFORT_LEVEL_ERROR = `update_settings: effortLevel must be one of ${EFFORT_LEVELS.join(", ")}`;
/**
 * 校验 SDK update_settings 请求（远程传输不可用、必须是对象、effortLevel 取值等）。
 */
//@ chunk-tyg7f3ek.js:621526-622484 placement
function validateUpdateSettings(e, n, r, s, h = !1) {
  if (e) return "update_settings is not available over a remote transport";
  if (typeof s !== "object" || s === null || Array.isArray(s))
    return `update_settings requires \`settings\` to be an object, got ${s === null ? "null" : Array.isArray(s) ? "an array" : typeof s}`;
  if (!isLocalOrUserSettings(r)) return `update_settings: unsupported source ${String(r)}`;
  if (!n) return `update_settings: the ${r} source is disabled for this session (--setting-sources)`;
  let y = s;
  if (Object.keys(y).length === 0) return "update_settings requires at least one key";
  let S = uz[r],
    filtered = Object.keys(y).filter((P) => !S.has(P));
  if (filtered.length > 0) return `update_settings keys not allowed: ${filtered.sort().join(", ")}`;
  let filtered_2 = Object.keys(y).filter((P) => typeof y[P] !== "string");
  if (filtered_2.length > 0)
    return `update_settings values must be strings (deletion is not supported): ${filtered_2.sort().join(", ")}`;
  if (
    r === "userSettings" &&
    (typeof y.effortLevel !== "string" ||
      (!(h && y.effortLevel === "auto") && parseEffortLevel(y.effortLevel) === void 0))
  )
    return EFFORT_LEVEL_ERROR;
  return null;
}

export { Hx, Nx, lz, dz, LOGIN_BLOCKED_MESSAGES, Bx, iz, az, validateUpdateSettings, EFFORT_LEVEL_ERROR };
