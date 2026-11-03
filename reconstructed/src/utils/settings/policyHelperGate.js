/**
 * utils/settings/policyHelperGate.ts
 *
 * 2.1.316 新增：策略 helper 宿主回调（读取、拒绝）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cjydagjy.js (6)
 * attribution: placement 6
 */
import { getRemoteSettingsPathOverride } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { KRi } from "./policyHelper/helperRemote.js";
import {
  getBasePolicySettings,
  getBasePolicySettingsOrigin,
  isAdminPolicyOrigin,
  getPolicyHelperSourceLoadErrors,
} from "./settings.js";
import { jRi } from "./policyHelper/helperPayload.js";
import { isRemoteManagedSettingsColdStartPending } from "../../services/remoteManagedSettings/loader.js";
import { getSessionEndHookTimeoutMs } from "../hooks.js";
import { cliError } from "../../cli/exit.js";
import { isUnattendedBgSession } from "../concurrentSessions.js";
import { getTeammateAgentId } from "../../bootstrap/state.js";
import { isTerminalShutdown, latchTerminalShutdown } from "../terminalShutdown.js";
import { emitExitMessage, gracefulShutdown } from "../gracefulShutdown.js";
import { recordManagedSettingsRefusal } from "../../cli/managedConfigRefusal.js";

//@ chunk-cjydagjy.js:36599-36765 placement
function shouldWaitForRemotePolicy() {
  if (getRemoteSettingsPathOverride()) return !1;
  if (KRi()) return !1;
  let e = getBasePolicySettings(),
    r = getBasePolicySettingsOrigin();
  if (r === "remote") return jRi(e);
  return (
    isAdminPolicyOrigin(r) &&
    (e?.policyHelpers != null || e?.policyHelper != null) &&
    isRemoteManagedSettingsColdStartPending()
  );
}
//@ chunk-cjydagjy.js:36765-36788 placement
var dr = 120000,
  pr = 60000;
//@ chunk-cjydagjy.js:36788-36854 placement
function mr() {
  let e = 0;
  try {
    e = getSessionEndHookTimeoutMs();
  } catch {}
  return Math.max(dr, e + pr);
}
//@ chunk-cjydagjy.js:36854-36873 placement
function st() {
  cliError();
}
//@ chunk-cjydagjy.js:36873-36916 placement
function Zuo() {
  setTimeout(st, mr()).unref();
}
/**
 * 策略 helper 宿主回调（读取、拒绝）。
 */
//@ chunk-cjydagjy.js:36916-37242 placement
var POLICY_HELPER_HOST = {
    readBase: () => ({
      settings: getBasePolicySettings(),
      origin: getBasePolicySettingsOrigin(),
      loadErrors: getPolicyHelperSourceLoadErrors(),
    }),
    baseSettled: () => !isRemoteManagedSettingsColdStartPending(),
    isUnwatchedRepl: () => isUnattendedBgSession() || getTeammateAgentId() !== void 0,
    refuse: (e) => {
      let r = isTerminalShutdown();
      if ((latchTerminalShutdown(), emitExitMessage(e), recordManagedSettingsRefusal("helper_failed"), r)) {
        Zuo();
        return;
      }
      gracefulShutdown(1, "other", { suppressResumeHint: !0 }).then(st, st);
    },
  },
  gr = new Set(["install", "update", "rollback", "forward-home-settings"]);

export { gr, shouldWaitForRemotePolicy, POLICY_HELPER_HOST, Zuo };
