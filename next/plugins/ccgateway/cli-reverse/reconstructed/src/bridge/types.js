/**
 * bridge/types.ts
 *
 * Remote Control 文案与常量（登录要求、folder 已被占用、断开、各种账号/签名问题提示）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/types.ts
 * pieces: chunk-jbgqd2rg.js (1)
 * attribution: facade-majority 1
 */
//@ chunk-jbgqd2rg.js:191-1518 facade-majority (2.1.88 match: BRIDGE_LOGIN_INSTRUCTION, 0.138)
/**
 * Remote Control 的用户提示文字集合：需要 claude.ai 订阅、未登录、沙箱设置提示、文件夹已被服务（bridge_folder_already_served）、排队等。
 */
var BRIDGE_LOGIN_INSTRUCTION =
  "Remote Control is only available with claude.ai subscriptions. Please use `/login` to sign in with your claude.ai account.";
var BRIDGE_LOGIN_ERROR =
  "Error: You must be logged in to use Remote Control.\n\nRemote Control is only available with claude.ai subscriptions. Run `claude auth login` to sign in with your claude.ai account.";
var SANDBOX_SETTING_HINT = "To sandbox sessions, set sandbox.enabled to true in settings.";
var FOLDER_ALREADY_SERVED_ERROR_TYPE = "bridge_folder_already_served";
var REMOTE_CONTROL_DISCONNECTED_MSG = "Remote Control disconnected.";
var BRIDGE_LOGIN_HINT = "/login";
var BRIDGE_MALFORMED_RESPONSE_HINT =
  "Remote Control got an unexpected server response \u2014 try again after updating Claude Code";
var BRIDGE_SIGNATURE_WANTED_HINT =
  "the session refused a request that only the computer it is bound to can sign, so signing in again won't fix it";
var BRIDGE_ACCOUNT_UNVERIFIED_HINT =
  "Remote Control could not verify the signed-in account \u2014 run /remote-control to reconnect";
var BRIDGE_OWNER_CHANGED_HINT =
  "signed-in claude.ai account or organization changed on this machine \u2014 run /remote-control to start a session for the current account, or /login to switch back, then /remote-control";
var BRIDGE_HOST_SIGNED_OUT_HINT =
  "Remote Control stopped \u2014 the app running this session is signed out of Claude. Sign in there, then turn Remote Control back on";
var BRIDGE_HOST_ACCOUNT_CHANGED_HINT =
  "Remote Control stopped \u2014 the app running this session is now signed in to a different Claude account";
var BRIDGE_REATTACH_UNAVAILABLE_HINT =
  "Previous session is unavailable \u2014 run /remote-control to start a new one";
var WORK_STATE_QUEUED = "queued";
export {
  BRIDGE_SIGNATURE_WANTED_HINT,
  BRIDGE_LOGIN_INSTRUCTION,
  WORK_STATE_QUEUED,
  SANDBOX_SETTING_HINT,
  BRIDGE_LOGIN_ERROR,
  REMOTE_CONTROL_DISCONNECTED_MSG,
  BRIDGE_REATTACH_UNAVAILABLE_HINT,
  BRIDGE_MALFORMED_RESPONSE_HINT,
  BRIDGE_ACCOUNT_UNVERIFIED_HINT,
  BRIDGE_LOGIN_HINT,
  BRIDGE_HOST_SIGNED_OUT_HINT,
  BRIDGE_HOST_ACCOUNT_CHANGED_HINT,
  BRIDGE_OWNER_CHANGED_HINT,
  FOLDER_ALREADY_SERVED_ERROR_TYPE,
};
