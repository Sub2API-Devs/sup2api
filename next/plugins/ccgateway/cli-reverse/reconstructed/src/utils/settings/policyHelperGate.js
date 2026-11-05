/**
 * utils/settings/policyHelperGate.ts
 *
 * 2.1.316 新增：策略 helper 宿主回调（读取、拒绝）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h61dq9nz.js (6)
 * attribution: placement 6
 */
import { getRemoteSettingsPathOverride } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { helperInitAttempted } from "./policyHelper/helperRemote.js";
import {
  getBasePolicySettings,
  getBasePolicySettingsOrigin,
  isAdminPolicyOrigin,
  getPolicyHelperSourceLoadErrors,
} from "./settings.js";
import { hasStaticPayload } from "./policyHelper/helperPayload.js";
import { isRemoteManagedSettingsColdStartPending } from "../../services/remoteManagedSettings/loader.js";
import { getSessionEndHookTimeoutMs } from "../hooks.js";
import { cliError } from "../../cli/exit.js";
import { isUnattendedBgSession } from "../concurrentSessions.js";
import { getTeammateAgentId } from "../../bootstrap/state.js";
import { isTerminalShutdown, latchTerminalShutdown } from "../terminalShutdown.js";
import { emitExitMessage, gracefulShutdown } from "../gracefulShutdown.js";
import { recordManagedSettingsRefusal } from "../../cli/managedConfigRefusal.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-h61dq9nz.js:38436-38602 placement
function shouldWaitForRemotePolicy() {
  if (getRemoteSettingsPathOverride()) return false;
  if (helperInitAttempted()) return false;
  let basePolicySettings = getBasePolicySettings();
  let basePolicySettingsOrigin = getBasePolicySettingsOrigin();
  if (basePolicySettingsOrigin === "remote") return hasStaticPayload(basePolicySettings);
  return (
    isAdminPolicyOrigin(basePolicySettingsOrigin) &&
    (basePolicySettings?.policyHelpers != null || basePolicySettings?.policyHelper != null) &&
    isRemoteManagedSettingsColdStartPending()
  );
}
//@ chunk-h61dq9nz.js:38602-38625 placement
var HELPER_GATE_TIMEOUT_MS = 120000;
var HELPER_GATE_HOOK_GRACE_MS = 60000;
//@ chunk-h61dq9nz.js:38625-38691 placement
function helperGateDeadline() {
  let hookTimeout = 0;
  try {
    hookTimeout = getSessionEndHookTimeoutMs();
  } catch {}
  return Math.max(HELPER_GATE_TIMEOUT_MS, hookTimeout + HELPER_GATE_HOOK_GRACE_MS);
}
//@ chunk-h61dq9nz.js:38691-38710 placement
function exitCliWithError() {
  cliError();
}
//@ chunk-h61dq9nz.js:38710-38753 placement
/**
 * armHelperGateExit：武装 helper 闸门退出定时器。
 */
function armHelperGateExit() {
  setTimeout(exitCliWithError, helperGateDeadline()).unref();
}
//@ chunk-h61dq9nz.js:38753-39079 placement
/**
 * 策略 helper 宿主回调（读取、拒绝）。
 */
var POLICY_HELPER_HOST; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var POLICY_HELPER_SUBCOMMANDS;
deferInit("chunk-h61dq9nz.js:38753", () => {
  POLICY_HELPER_HOST = {
    readBase: () => ({
      settings: getBasePolicySettings(),
      origin: getBasePolicySettingsOrigin(),
      loadErrors: getPolicyHelperSourceLoadErrors(),
    }),
    baseSettled: () => !isRemoteManagedSettingsColdStartPending(),
    isUnwatchedRepl: () => isUnattendedBgSession() || getTeammateAgentId() !== undefined,
    refuse: (message) => {
      let shuttingDown = isTerminalShutdown();
      latchTerminalShutdown();
      emitExitMessage(message);
      recordManagedSettingsRefusal("helper_failed");
      if (shuttingDown) {
        armHelperGateExit();
        return;
      }
      gracefulShutdown(1, "other", {
        suppressResumeHint: true,
      }).then(exitCliWithError, exitCliWithError);
    },
  };
  POLICY_HELPER_SUBCOMMANDS = new Set(["install", "update", "rollback", "forward-home-settings"]);
});
export { POLICY_HELPER_SUBCOMMANDS, shouldWaitForRemotePolicy, POLICY_HELPER_HOST, armHelperGateExit };
