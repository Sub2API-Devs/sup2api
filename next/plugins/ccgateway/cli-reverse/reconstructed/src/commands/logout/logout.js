/**
 * commands/logout/logout.tsx
 *
 * 并入旧版已有路径：/logout 命令（登出失败提示）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/logout/logout.tsx
 * pieces: chunk-fmp5a427.js (1), chunk-raxstmkp.js (1), chunk-wqfxt05n.js (5)
 * attribution: fingerprint 1, placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { flushReplicasBeforeLogout } from "../../services/liveReplica/liveReplica.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { clearAuthRelatedCaches, clearAccountScopedConfigFields } from "../../cli/handlers/auth.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import {
  getSecureStorage,
  getUnselectedGuardedStorages,
  primarySecureStoreKind,
} from "../../utils/secureStorage/index.js";
import { revokeOAuthToken } from "../../services/oauth/client.js";
import {
  getGatewayRefreshInFlight,
  setOauthTokenFromFd,
  setGatewayAuth,
  setAuthenticatedAccount,
  setResolvedOrgDefault,
} from "../../bootstrap/state.js";
import { withDeadline } from "../../utils/sleep.js";
import { revokeGatewayToken } from "../../services/gateway/gatewayAuth.js";
import { env } from "../../utils/env.js";
import { removeApiKey, getStoredOauthAccountInfo, sameOwnerAccount } from "../../utils/auth.js";
import { removeConsoleProfileCredentials } from "../../utils/anthropicProfile.js";
import { forgetConsoleProfileCloudSessionsBearer } from "../../utils/teleport/api.js";
import {
  withStorageWriteLock,
  runInsideWriteLock,
  READ_FAILED,
} from "../../utils/secureStorage/storageWriteLock.js";
import {
  readGlobalConfigFromDiskOrThrow,
  oauthAccountIn,
  saveGlobalConfigDurably,
  customApiKeyResponsesOf,
  configMayStillHold,
} from "../../utils/config.js";
import {
  CONFIG_READ_TIMEOUT_MS,
  withoutLoginFields,
  pruneGuardedStorage,
  LOGOUT_NOT_SAVED_MESSAGE,
} from "../../cli/handlers/performLogout.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  getErrnoCode,
  isEnvFsErrno,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { setHostSessionsBearerSource } from "../../utils/hostSessionsBearer.js";
import { SUBSCRIPTION_SWITCH } from "../../utils/subscriptionNoticeIds.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logAuthEvent } from "../../utils/telemetry/thirdPartyEventRecords.js";
import { gracefulShutdown, gracefulShutdownSync } from "../../utils/gracefulShutdown.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-wqfxt05n.js:2793-5747 placement (2.1.88 match: performLogout, 0.234)
async function performLogout({
  clearOnboarding = false,
  preserveInProcessTokens = false,
  preserveNonAnthropicAuth = false,
  keepStoredLogin = false,
  storageV5,
  preserveQuotaAutoResume = false,
  artifactAccount = "signed_out",
  incomingIdentity,
  credentials,
}) {
  let { flushTelemetry } = await import("../../utils/telemetry/bigQueryExportIntervalMs.lazy.js");
  await flushTelemetry();
  await flushReplicasBeforeLogout(artifactAccount);
  if (isBgSession()) {
    await clearAuthRelatedCaches(storageV5, {
      preserveQuotaAutoResume,
      artifactAccount,
      incomingIdentity,
    });
    return;
  }
  if (!preserveInProcessTokens && getAPIProvider() === "firstParty") {
    let secureStorage = getSecureStorage();
    secureStorage.invalidateCache?.();
    let stored = await secureStorage.readAsync(credentials);
    let claudeAiOauth = stored?.claudeAiOauth;
    if (claudeAiOauth?.refreshToken)
      await revokeOAuthToken(claudeAiOauth.refreshToken, claudeAiOauth.clientId);
    let designOauth = stored?.designOauth;
    if (designOauth?.refreshToken) await revokeOAuthToken(designOauth.refreshToken, designOauth.clientId);
    let cloudSessionsOauth = stored?.cloudSessionsOauth;
    if (cloudSessionsOauth?.refreshToken)
      await revokeOAuthToken(cloudSessionsOauth.refreshToken, cloudSessionsOauth.clientId);
  }
  if (getAPIProvider() === "gateway") {
    let deadline = Date.now() + 5000;
    for (
      let inFlight = getGatewayRefreshInFlight();
      inFlight && Date.now() < deadline;
      inFlight = getGatewayRefreshInFlight()
    )
      await withDeadline(
        inFlight.catch(() => {}),
        deadline - Date.now(),
      );
    let secureStorage = getSecureStorage();
    secureStorage.invalidateCache?.();
    let enterpriseGateway = (await secureStorage.readAsync(credentials))?.enterpriseGateway;
    if (enterpriseGateway) await revokeGatewayToken(enterpriseGateway, credentials);
  }
  if (!preserveInProcessTokens) {
    env.unset("CLAUDE_CODE_OAUTH_TOKEN");
    setOauthTokenFromFd(null);
  }
  await removeApiKey(storageV5);
  await removeConsoleProfileCredentials({
    revoke:
      !preserveInProcessTokens && getAPIProvider() === "firstParty"
        ? ({ refreshToken, clientId }) => revokeOAuthToken(refreshToken, clientId)
        : undefined,
  });
  forgetConsoleProfileCloudSessionsBearer();
  let secureStorage = getSecureStorage();
  let keepLogin;
  let pruned = false;
  if (preserveNonAnthropicAuth) {
    if (getAPIProvider() === "firstParty") {
      secureStorage.invalidateCache?.();
      let designOauth = (await secureStorage.readAsync(credentials))?.designOauth;
      if (designOauth?.refreshToken) await revokeOAuthToken(designOauth.refreshToken, designOauth.clientId);
    }
    pruned = await withStorageWriteLock(async () => {
      let stillOurs = keepStoredLogin;
      if (keepStoredLogin) {
        let storedConfig = await withDeadline(
          readGlobalConfigFromDiskOrThrow(storageV5).catch(() => {
            return;
          }),
          CONFIG_READ_TIMEOUT_MS,
        );
        let keepsLogin = getStoredOauthAccountInfo();
        stillOurs =
          (keepsLogin === undefined || sameOwnerAccount(keepsLogin, incomingIdentity)) &&
          (storedConfig === undefined || sameOwnerAccount(oauthAccountIn(storedConfig), incomingIdentity));
        if (!stillOurs)
          logForDebugging(
            "[performLogout] re-login: the account entry no longer names the account the sign-in judged it by; removing the stored login",
          );
      }
      return (
        await secureStorage.mutate((current) => {
          let stripped = withoutLoginFields(current);
          if (!stillOurs || !current.claudeAiOauth) return stripped;
          let kept = {
            ...stripped,
            claudeAiOauth: current.claudeAiOauth,
          };
          return Object.keys(kept).length === Object.keys(current).length ? current : kept;
        }, credentials)
      ).success
        ? stillOurs
        : keepStoredLogin;
    }).catch((error) => {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "EPERM" || errnoCode === "ENOENT" || isEnvFsErrno(error))
        logForDebugging(
          `[performLogout] re-login secure-storage prune failed (${errnoCode}): ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
      else logError(error);
      return keepStoredLogin;
    });
    for (let storage of getUnselectedGuardedStorages())
      await pruneGuardedStorage(storage).catch((error) => {
        logForDebugging(`[performLogout] re-login prune of ${storage.name} failed: ${errorMessage(error)}`, {
          level: "error",
        });
      });
  } else {
    let failedInsideLock = false;
    let deleteAll = async () => {
      failedInsideLock = true;
      let coworkRemoteDevice = (await readSecureStorageWithRetry(secureStorage, credentials))
        ?.coworkRemoteDevice;
      await secureStorage.delete(credentials);
      if (coworkRemoteDevice && Object.keys(coworkRemoteDevice).length > 0)
        await restoreDeviceIdentity(secureStorage, coworkRemoteDevice, credentials);
      for (let storage of getUnselectedGuardedStorages()) await storage.delete();
    };
    await withStorageWriteLock(deleteAll).catch((error) => {
      if (failedInsideLock) throw error;
      logError(error);
      return runInsideWriteLock(deleteAll);
    });
  }
  setGatewayAuth(null);
  setAuthenticatedAccount(null);
  setHostSessionsBearerSource(null);
  await clearAuthRelatedCaches(storageV5, {
    preserveQuotaAutoResume,
    artifactAccount,
    incomingIdentity,
    keepStoredLogin: pruned,
    credentials,
  });
  let saved = await saveGlobalConfigDurably((config) => {
    let updated = {
      ...config,
    };
    updated.primaryApiKey = undefined;
    if (clearOnboarding) {
      updated.hasCompletedOnboarding = false;
      updated.subscriptionNoticeCount = 0;
      updated.hasAvailableSubscription = false;
      if (updated.customApiKeyResponses !== undefined)
        updated.customApiKeyResponses = {
          approved: [],
          rejected: customApiKeyResponsesOf(updated).rejected,
        };
      let noticeKey = SUBSCRIPTION_SWITCH;
      if (updated.seenNotifications?.[noticeKey] !== undefined) {
        let { [noticeKey]: notice, ...otherNotices } = updated.seenNotifications;
        updated.seenNotifications = otherNotices;
      }
    }
    clearAccountScopedConfigFields(updated);
    return updated;
  }, storageV5);
  await noopAsync();
  setResolvedOrgDefault(undefined);
  let onFile = saved ? undefined : await configMayStillHold(storageV5);
  if (onFile !== undefined) {
    logFeatureSad("oauth_logout", "config_not_saved");
    return onFile === "key" ? "key_on_file" : "account_on_file";
  }
  logFeatureOk("oauth_logout");
  return;
}
//@ chunk-wqfxt05n.js:5747-5767 placement
async function noopAsync() {}
//@ chunk-wqfxt05n.js:6571-6945 placement
/**
 * 登出（fleet 宿主侧）：清除凭证与 onboarding 后退出。
 */
async function fleetHostLogout({ exit, setError, setInfo, storageV5, credentials }) {
  setInfo("Signing out\u2026");
  logAuthEvent({
    action: "logout",
    success: true,
    authMethod: "oauth",
  });
  try {
    if (
      (await performLogout({
        clearOnboarding: true,
        storageV5,
        credentials,
      })) !== undefined
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        LOGOUT_NOT_SAVED_MESSAGE,
        "logout could not save the config file",
      );
    exit();
  } catch (error) {
    logError(error);
    setError(`Couldn't sign out \u2014 ${error instanceof Error ? error.message : String(error)}`);
  }
}
//@ chunk-wqfxt05n.js:6945-7203 placement
async function restoreDeviceIdentity(secureStorage, coworkRemoteDevice, credentials) {
  let attempt;
  for (let j = 0; j < 2; j++)
    try {
      let mutated = await secureStorage.mutate(
        () => ({
          coworkRemoteDevice,
        }),
        credentials,
      );
      if (mutated.success) return;
      attempt = Error("logout: the device identity could not be written back after the credential wipe");
      if (!mutated.transient) break;
    } catch (error) {
      attempt = error;
    }
  logError(attempt);
}
//@ chunk-wqfxt05n.js:7203-7432 placement
async function readSecureStorageWithRetry(secureStorage, credentials) {
  for (let j = 0; j < 2; j++) {
    let read = await (secureStorage.readAsyncStrict?.(credentials) ?? secureStorage.readAsync(credentials));
    if (read !== READ_FAILED) return read;
  }
  logError(
    Error("logout: secure storage could not be read, so the device identity is not carried across the wipe"),
  );
  return;
}
//@ chunk-raxstmkp.js:228-1000 placement
function signOutFailureMessage(error, reason, detail) {
  switch (reason) {
    case "credential_store_failed":
      return primarySecureStoreKind() === "keychain"
        ? `Couldn't remove the saved sign-in for "${error}", so Claude Code may still use it. Claude Code could not read or update its credential store. If the macOS keychain is locked, unlock it, for example with \`security unlock-keychain\`, then ${detail}.`
        : `Couldn't remove the saved sign-in for "${error}", so Claude Code may still use it. Claude Code could not read or update its credential store. ${detail.charAt(0).toUpperCase()}${detail.slice(1)}.`;
    case "keychain_unreadable":
      return `Couldn't confirm the sign-out from "${error}": Claude Code could not read the macOS keychain, so a saved sign-in may still be there. The keychain may be locked. Unlock it, for example with \`security unlock-keychain\`, then ${detail}.`;
  }
}
//@ chunk-fmp5a427.js:14134-14707 fingerprint (2.1.88 match: call, 0.402)
async function call(onDone, context) {
  let isBackground = isBgSession();
  if (!isBackground)
    logAuthEvent({
      action: "logout",
      success: true,
      authMethod: "oauth",
    });
  let notSaved = await performLogout({
    clearOnboarding: true,
    storageV5: context.storageV5,
    credentials: context.credentials,
  });
  if (isBackground) {
    onDone(
      "This background session shares credentials with other sessions; /logout here has no effect. Run /logout from your main terminal to sign out.",
      {
        display: "system",
      },
    );
    return null;
  }
  if (notSaved !== undefined) {
    setTimeout(gracefulShutdown, 200, 1, "logout", {
      finalMessage: LOGOUT_NOT_SAVED_MESSAGE,
    });
    return jsxProd_default(Text, {
      children: LOGOUT_NOT_SAVED_MESSAGE,
    });
  }
  let message = jsxProd_default(Text, {
    children: "Successfully logged out from your Anthropic account.",
  });
  setTimeout(() => {
    gracefulShutdownSync(0, "logout");
  }, 200);
  return message;
}
export { signOutFailureMessage, performLogout, fleetHostLogout, call };
