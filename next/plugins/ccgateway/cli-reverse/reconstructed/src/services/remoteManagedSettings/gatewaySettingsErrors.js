/**
 * services/remoteManagedSettings/gatewaySettingsErrors.ts
 *
 * 2.1.316 新增：网关托管设置加载失败时的处理（401 结束会话、403 等）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h61dq9nz.js (10)
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
  gatewayRequiredLoadFailedSteps,
  initializeRemoteManagedSettingsLoadingPromise,
} from "./loader.js";
import { resetRemoteSettingsSyncCache } from "../cloudSessions/eligibility.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { GATEWAY_SESSION_EXPIRED_MESSAGE } from "../gateway/constants.js";
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

//@ chunk-h61dq9nz.js:71312-71377 placement
/**
 * preAction 中调用的迁移入口：先 migrateEnableAllProjectMcpServersToSettings，再 runMigrations，再异步迁移（不等待）。
 */
async function runAllMigrations(config) {
  await migrateEnableAllProjectMcpServersToSettings();
  await runMigrations(config);
  migrateChangelogFromConfig(config).catch(() => {});
}
//@ chunk-h61dq9nz.js:71377-71456 placement
function asStringArray(optionValue) {
  return Array.isArray(optionValue) && optionValue.every((value) => typeof value === "string")
    ? optionValue
    : [];
}
//@ chunk-h61dq9nz.js:71456-71545 placement
function parseNumberOption(value) {
  let numberWithSeparators = parseNumberWithSeparators(value);
  if (Number.isNaN(numberWithSeparators)) throw new InvalidArgumentError("must be a number");
  return numberWithSeparators;
}
//@ chunk-h61dq9nz.js:71545-71621 placement
function continueSignedOutAfterGatewayEnd() {
  setGatewayAuth(null);
  stopBackgroundPolling();
  resetRemoteSettingsSyncCache();
  invalidateCommandNames();
  clearRemoteManagedSettingsPrefetch();
  process.stderr.write(
    GATEWAY_SESSION_EXPIRED_MESSAGE +
      `
`,
  );
}
//@ chunk-h61dq9nz.js:71621-71742 placement
function needsPolicyHelperVerdict() {
  if (!getGatewayAuth()?.hostVerdict) return false;
  let basePolicySettings = getBasePolicySettings();
  return (
    isAdminPolicyOrigin(getBasePolicySettingsOrigin()) &&
    (basePolicySettings?.policyHelpers != null || basePolicySettings?.policyHelper != null)
  );
}
//@ chunk-h61dq9nz.js:71742-73336 placement
/**
 * 网关托管设置加载失败时的处理（401 结束会话、403 等）。
 */
function gatewaySettingsFailure() {
  let url = getGatewayAuth()?.url ?? "";
  let isMountMode = isArtifactMountMode();
  let lastLoadStatus = getLastLoadStatus();
  let failure =
    lastLoadStatus?.state === "failed" || lastLoadStatus?.state === "stale_cache"
      ? lastLoadStatus.failure
      : undefined;
  let errorKind = failure?.errorKind;
  if (errorKind === "http_401")
    return {
      endedSession: true,
      forbidden: false,
      exitMessage: `Cloud gateway ${url} no longer accepts this session. ${isMountMode ? "Run `claude` in a terminal where this session runs, then sign in again with /login." : "Start `claude` and sign in again with /login."}`,
      gatewayUrl: url,
      reason: "gateway_signin_required",
    };
  if (errorKind === "http_403")
    return {
      endedSession: false,
      forbidden: true,
      exitMessage: `Cloud gateway ${url} refused managed settings for this account (403): Claude Code may not be enabled for your organization. ${isMountMode ? "Contact your admin. To use a different account, run `claude auth logout` in a terminal where this session runs, then start `claude` and sign in with /login." : "Contact your administrator; to sign in with a different account, run `claude auth logout` first, then start `claude` and sign in."}`,
      gatewayUrl: url,
      reason: "gateway_access_denied",
    };
  if (failure?.errorKind === "ruled_empty")
    return {
      endedSession: false,
      forbidden: false,
      exitMessage: `Couldn't load settings from Cloud gateway ${url}. None of the settings it served could be applied as written${firstRulingClause(failure.rulings)}; ask your administrator to fix them.`,
      gatewayUrl: url,
      reason: "remote_settings_required_unavailable",
    };
  let hint = isMountMode
    ? "You can check your network connection or contact your admin."
    : isGatewayLoginForced()
      ? gatewayRequiredLoadFailedSteps(failure)
      : "Check your network connection, or run `claude auth login` to re-authenticate.";
  return {
    endedSession: false,
    forbidden: false,
    exitMessage: `Couldn't load settings from Cloud gateway ${url}. ${hint}`,
    gatewayUrl: url,
    reason: "remote_settings_required_unavailable",
  };
}
//@ chunk-h61dq9nz.js:73336-73426 placement
function remoteSettingsFailureReason() {
  return getAPIProvider() === "gateway"
    ? gatewaySettingsFailure().reason
    : "remote_settings_required_unavailable";
}
//@ chunk-h61dq9nz.js:73426-73468 placement
async function exitWithStartupFailure(storageV5, message) {
  printCliError(message);
  await sendManagedSettingsRefusal(storageV5);
}
//@ chunk-h61dq9nz.js:73468-73516 placement
function redoAuthDependentStartup() {
  resetRemoteSettingsSyncCache();
  invalidateCommandNames();
  applySafeConfigEnvironmentVariables();
  configureProxyAuthHelperFromSettings();
  initializeRemoteManagedSettingsLoadingPromise();
  initializePolicyLimitsLoadingPromise();
}
//@ chunk-h61dq9nz.js:73516-73711 placement
function redoStartupAfterLauncherLogin(refreshFeatures) {
  try {
    clearOAuthTokenCache();
    resetUserData();
    redoAuthDependentStartup();
    learnLauncherHostLoginIdentity(validateLoginIdentity);
    if (refreshFeatures) refreshGrowthBookAfterAuthChange();
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[launcher-host-login] the start-up redo threw (${toError(error).name})`,
        "[launcher-host-login] the start-up redo threw",
      ),
    );
    forgetLauncherHostLogin();
    clearOAuthTokenCache();
  }
}
export {
  redoAuthDependentStartup,
  redoStartupAfterLauncherLogin,
  asStringArray,
  runAllMigrations,
  needsPolicyHelperVerdict,
  exitWithStartupFailure,
  remoteSettingsFailureReason,
  gatewaySettingsFailure,
  continueSignedOutAfterGatewayEnd,
  parseNumberOption,
};
