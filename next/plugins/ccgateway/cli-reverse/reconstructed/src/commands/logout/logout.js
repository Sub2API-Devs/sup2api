/**
 * commands/logout/logout.tsx
 *
 * 并入旧版已有路径：/logout 命令（登出失败提示）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/logout/logout.tsx
 * pieces: chunk-emh405f3.js (1), chunk-th8w37yz.js (5), chunk-tndsj50r.js (1)
 * attribution: placement 1, facade-exports 2, affinity 1, sole-consumer 2, fingerprint 1
 */
import { flushReplicasBeforeLogout } from "../../services/liveReplica/liveReplica.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { clearAuthRelatedCaches, clearOAuthAccountFields } from "../../cli/handlers/auth.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getSecureStorage, primarySecureStoreKind } from "../../utils/secureStorage/index.js";
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
import { removeApiKey } from "../../utils/auth.js";
import { removeConsoleProfileCredentials } from "../../utils/anthropicProfile.js";
import { forgetConsoleProfileCloudSessionsBearer } from "../../utils/teleport/api.js";
import { getErrnoCode, isEnvFsErrno, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import {
  withStorageWriteLock,
  runInsideWriteLock,
  READ_FAILED,
} from "../../utils/secureStorage/storageWriteLock.js";
import { setHostSessionsBearerSource } from "../../utils/hostSessionsBearer.js";
import { saveGlobalConfig, customApiKeyResponsesOf } from "../../utils/config.js";
import { SUBSCRIPTION_SWITCH } from "../../utils/subscriptionNoticeIds.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logAuthEvent } from "../../utils/telemetry/thirdPartyEventRecords.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { gracefulShutdownSync } from "../../utils/gracefulShutdown.js";

//@ chunk-th8w37yz.js:2187-4545 facade-exports = performLogout (0.295)
async function performLogout({
  clearOnboarding = false,
  preserveInProcessTokens = false,
  preserveNonAnthropicAuth = false,
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
    let async = await secureStorage.readAsync(credentials);
    let claudeAiOauth = async?.claudeAiOauth;
    if (claudeAiOauth?.refreshToken)
      await revokeOAuthToken(claudeAiOauth.refreshToken, claudeAiOauth.clientId);
    let designOauth = async?.designOauth;
    if (designOauth?.refreshToken) await revokeOAuthToken(designOauth.refreshToken, designOauth.clientId);
    let cloudSessionsOauth = async?.cloudSessionsOauth;
    if (cloudSessionsOauth?.refreshToken)
      await revokeOAuthToken(cloudSessionsOauth.refreshToken, cloudSessionsOauth.clientId);
  }
  if (getAPIProvider() === "gateway") {
    let deadline = Date.now() + 5000;
    for (
      let gatewayRefreshInFlight = getGatewayRefreshInFlight();
      gatewayRefreshInFlight && Date.now() < deadline;
      gatewayRefreshInFlight = getGatewayRefreshInFlight()
    )
      await withDeadline(
        gatewayRefreshInFlight.catch(() => {}),
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
  let result;
  if (preserveNonAnthropicAuth) {
    if (getAPIProvider() === "firstParty") {
      secureStorage.invalidateCache?.();
      let designOauth = (await secureStorage.readAsync(credentials))?.designOauth;
      if (designOauth?.refreshToken) await revokeOAuthToken(designOauth.refreshToken, designOauth.clientId);
    }
    await secureStorage
      .mutate((current) => {
        let updated = {
          ...current,
        };
        delete updated.claudeAiOauth;
        delete updated.organizationUuid;
        delete updated.trustedDeviceToken;
        delete updated.trustedDeviceEnrolledAfterRefusalAtMs;
        delete updated.enterpriseGateway;
        delete updated.designOauth;
        delete updated.cloudSessionsOauth;
        return updated;
      }, credentials)
      .catch((error) => {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "EPERM" || errnoCode === "ENOENT" || isEnvFsErrno(error)) {
          logForDebugging(
            `[performLogout] re-login secure-storage prune failed (${errnoCode}): ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
          return;
        }
        logError(error);
      });
  } else {
    let failed = false;
    let clearAuth = async () => {
      failed = true;
      let coworkRemoteDevice = (await readSecureStorageWithRetry(secureStorage, credentials))
        ?.coworkRemoteDevice;
      await secureStorage.delete(credentials);
      if (coworkRemoteDevice && Object.keys(coworkRemoteDevice).length > 0)
        await restoreDeviceIdentity(secureStorage, coworkRemoteDevice, credentials);
    };
    await withStorageWriteLock(clearAuth).catch((error) => {
      if (failed) throw error;
      logError(error);
      return runInsideWriteLock(clearAuth);
    });
  }
  setGatewayAuth(null);
  setAuthenticatedAccount(null);
  setHostSessionsBearerSource(null);
  await clearAuthRelatedCaches(storageV5, {
    preserveQuotaAutoResume,
    artifactAccount,
    incomingIdentity,
    credentials,
  });
  await saveGlobalConfig((current) => {
    let config = {
      ...current,
    };
    if (clearOnboarding) {
      config.hasCompletedOnboarding = false;
      config.subscriptionNoticeCount = 0;
      config.hasAvailableSubscription = false;
      if (config.customApiKeyResponses !== undefined)
        config.customApiKeyResponses = {
          approved: [],
          rejected: customApiKeyResponsesOf(config).rejected,
        };
      let key = SUBSCRIPTION_SWITCH;
      if (config.seenNotifications?.[key] !== undefined) {
        let { [key]: dropped, ...rest } = config.seenNotifications;
        config.seenNotifications = rest;
      }
    }
    clearOAuthAccountFields(config);
    return config;
  }, storageV5);
  await noopAsync();
  setResolvedOrgDefault(undefined);
  logFeatureOk("oauth_logout");
}
//@ chunk-th8w37yz.js:4545-4565 affinity
async function noopAsync() {}
//@ chunk-th8w37yz.js:5345-5650 facade-exports = authLogout (0.251)
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
    await performLogout({
      clearOnboarding: true,
      storageV5,
      credentials,
    });
    exit();
  } catch (error) {
    logError(error);
    setError(`Couldn't sign out \u2014 ${error instanceof Error ? error.message : String(error)}`);
  }
}
//@ chunk-th8w37yz.js:5650-5908 sole-consumer
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
//@ chunk-th8w37yz.js:5908-6137 sole-consumer
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
//@ chunk-emh405f3.js:228-1000 placement
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
//@ chunk-tndsj50r.js:12979-13456 fingerprint = call (0.431)
/**
 * /logout 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context) {
  let isBackground = isBgSession();
  if (!isBackground)
    logAuthEvent({
      action: "logout",
      success: true,
      authMethod: "oauth",
    });
  await performLogout({
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
  let message = jsxProd_default(Text, {
    children: "Successfully logged out from your Anthropic account.",
  });
  setTimeout(() => {
    gracefulShutdownSync(0, "logout");
  }, 200);
  return message;
}
export { signOutFailureMessage, performLogout, call, fleetHostLogout };
