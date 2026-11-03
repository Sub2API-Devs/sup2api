/**
 * services/remoteManagedSettings/gatewaySettingsErrors.ts
 *
 * 2.1.316 新增：网关托管设置加载失败时的处理（401 结束会话、403 等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cjydagjy.js (10)
 * attribution: placement 10
 */
import { migrateEnableAllProjectMcpServersToSettings } from "../../migrations/migrateEnableAllProjectMcpServersToSettings.js";
import { runMigrations } from "../../main.js";
import { migrateChangelogFromConfig } from "../../utils/releaseNotes.js";
import { parseNumberWithSeparators } from "../../utils/envUtils.js";
import { InvalidArgumentError } from "../../../vendor/commander/esm.mjs";
import { setGatewayAuth, getGatewayAuth } from "../../bootstrap/state.js";
import {
  stopBackgroundPolling,
  clearRemoteManagedSettingsPrefetch,
  firstRulingClause,
  initializeRemoteManagedSettingsLoadingPromise,
} from "./loader.js";
import { resetRemoteSettingsSyncCache } from "../cloudSessions/eligibility.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import { R3t } from "../gateway/constants.js";
import {
  getBasePolicySettings,
  isAdminPolicyOrigin,
  getBasePolicySettingsOrigin,
} from "../../utils/settings/settings.js";
import { isArtifactMountMode } from "../artifacts/artifactMount.js";
import { getLastLoadStatus } from "./remoteSettingsState.js";
import { isGatewayLoginForced, clearOAuthTokenCache } from "../../utils/auth.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { printCliError } from "../../cli/exit.js";
import { sendManagedSettingsRefusal } from "../../cli/managedConfigRefusal.js";
import { applySafeConfigEnvironmentVariables } from "../../utils/managedEnvApply.js";
import { configureProxyAuthHelperFromSettings } from "../../utils/auth/proxyAuthHelperConfig.js";
import { initializePolicyLimitsLoadingPromise } from "../policyLimits/PolicyLimitsClient.js";
import { resetUserData, refreshGrowthBookAfterAuthChange } from "../analytics/growthbook.js";
import {
  learnLauncherHostLoginIdentity,
  forgetLauncherHostLogin,
} from "../../utils/auth/launcherHostLogin.js";
import { validateLoginIdentity } from "../../cli/startup/launcherHostLogin.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, toError } from "../../utils/errors.js";

/**
 * preAction 中调用的迁移入口：先 migrateEnableAllProjectMcpServersToSettings，再 runMigrations，再异步迁移（不等待）。
 */
//@ chunk-cjydagjy.js:69366-69431 placement
async function runAllMigrations(e) {
  (await migrateEnableAllProjectMcpServersToSettings(),
    await runMigrations(e),
    migrateChangelogFromConfig(e).catch(() => {}));
}
//@ chunk-cjydagjy.js:69431-69510 placement
function asStringArray(e) {
  return Array.isArray(e) && e.every((r) => typeof r === "string") ? e : [];
}
//@ chunk-cjydagjy.js:69510-69599 placement
function parseNumberOption(e) {
  let r = parseNumberWithSeparators(e);
  if (Number.isNaN(r)) throw new InvalidArgumentError("must be a number");
  return r;
}
//@ chunk-cjydagjy.js:69599-69675 placement
function continueSignedOutAfterGatewayEnd() {
  (setGatewayAuth(null),
    stopBackgroundPolling(),
    resetRemoteSettingsSyncCache(),
    or(),
    clearRemoteManagedSettingsPrefetch(),
    process.stderr.write(
      R3t +
        `
`,
    ));
}
//@ chunk-cjydagjy.js:69675-69796 placement
function needsPolicyHelperVerdict() {
  if (!getGatewayAuth()?.hostVerdict) return !1;
  let e = getBasePolicySettings();
  return (
    isAdminPolicyOrigin(getBasePolicySettingsOrigin()) &&
    (e?.policyHelpers != null || e?.policyHelper != null)
  );
}
/**
 * 网关托管设置加载失败时的处理（401 结束会话、403 等）。
 */
//@ chunk-cjydagjy.js:69796-71446 placement
function gatewaySettingsFailure() {
  let e = getGatewayAuth()?.url ?? "",
    r = isArtifactMountMode(),
    n = getLastLoadStatus(),
    s = n?.state === "failed" || n?.state === "stale_cache" ? n.failure : void 0,
    S = s?.errorKind;
  if (S === "http_401")
    return {
      endedSession: !0,
      forbidden: !1,
      exitMessage: `Cloud gateway ${e} no longer accepts this session. ${r ? "Run `claude` in a terminal where this session runs, then sign in again with /login." : "Start `claude` and sign in again with /login."}`,
      gatewayUrl: e,
      reason: "gateway_signin_required",
    };
  if (S === "http_403")
    return {
      endedSession: !1,
      forbidden: !0,
      exitMessage: `Cloud gateway ${e} refused managed settings for this account (403): Claude Code may not be enabled for your organization. ${r ? "Contact your admin. To use a different account, run `claude auth logout` in a terminal where this session runs, then start `claude` and sign in with /login." : "Contact your administrator; to sign in with a different account, run `claude auth logout` first, then start `claude` and sign in."}`,
      gatewayUrl: e,
      reason: "gateway_access_denied",
    };
  if (s?.errorKind === "ruled_empty")
    return {
      endedSession: !1,
      forbidden: !1,
      exitMessage: `Couldn't load settings from Cloud gateway ${e}. None of the settings it served could be applied as written${firstRulingClause(s.rulings)}; ask your administrator to fix them.`,
      gatewayUrl: e,
      reason: "remote_settings_required_unavailable",
    };
  let y = r
    ? "You can check your network connection or contact your admin."
    : isGatewayLoginForced()
      ? "Check your network connection, or sign in again with /login."
      : "Check your network connection, or run `claude auth login` to re-authenticate.";
  return {
    endedSession: !1,
    forbidden: !1,
    exitMessage: `Couldn't load settings from Cloud gateway ${e}. ${y}`,
    gatewayUrl: e,
    reason: "remote_settings_required_unavailable",
  };
}
//@ chunk-cjydagjy.js:71446-71536 placement
function remoteSettingsFailureReason() {
  return getAPIProvider() === "gateway"
    ? gatewaySettingsFailure().reason
    : "remote_settings_required_unavailable";
}
//@ chunk-cjydagjy.js:71536-71578 placement
async function exitWithStartupFailure(e, r) {
  (printCliError(r), await sendManagedSettingsRefusal(e));
}
//@ chunk-cjydagjy.js:71578-71626 placement
function redoAuthDependentStartup() {
  (resetRemoteSettingsSyncCache(),
    or(),
    applySafeConfigEnvironmentVariables(),
    configureProxyAuthHelperFromSettings(),
    initializeRemoteManagedSettingsLoadingPromise(),
    initializePolicyLimitsLoadingPromise());
}
//@ chunk-cjydagjy.js:71626-71821 placement
function redoStartupAfterLauncherLogin(e) {
  try {
    if (
      (clearOAuthTokenCache(),
      resetUserData(),
      redoAuthDependentStartup(),
      learnLauncherHostLoginIdentity(validateLoginIdentity),
      e)
    )
      refreshGrowthBookAfterAuthChange();
  } catch (error) {
    (logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[launcher-host-login] the start-up redo threw (${toError(error).name})`,
        "[launcher-host-login] the start-up redo threw",
      ),
    ),
      forgetLauncherHostLogin(),
      clearOAuthTokenCache());
  }
}

export {
  gatewaySettingsFailure,
  redoAuthDependentStartup,
  redoStartupAfterLauncherLogin,
  asStringArray,
  runAllMigrations,
  needsPolicyHelperVerdict,
  exitWithStartupFailure,
  remoteSettingsFailureReason,
  continueSignedOutAfterGatewayEnd,
  parseNumberOption,
};
