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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { gracefulShutdownSync } from "../../utils/gracefulShutdown.js";

//@ chunk-th8w37yz.js:2187-4545 facade-exports = performLogout (0.295)
async function performLogout({
  clearOnboarding: clearOnboarding = !1,
  preserveInProcessTokens: preserveInProcessTokens = !1,
  preserveNonAnthropicAuth: preserveNonAnthropicAuth = !1,
  storageV5: storageV5,
  preserveQuotaAutoResume: preserveQuotaAutoResume = !1,
  artifactAccount: artifactAccount = "signed_out",
  incomingIdentity: incomingIdentity,
  credentials: credentials,
}) {
  let { flushTelemetry: flushTelemetry } = await import("./chunk-9vvvg0d3.js");
  if ((await flushTelemetry(), await flushReplicasBeforeLogout(artifactAccount), isBgSession())) {
    await clearAuthRelatedCaches(storageV5, {
      preserveQuotaAutoResume: preserveQuotaAutoResume,
      artifactAccount: artifactAccount,
      incomingIdentity: incomingIdentity,
    });
    return;
  }
  if (!preserveInProcessTokens && getAPIProvider() === "firstParty") {
    let secureStorage = getSecureStorage();
    secureStorage.invalidateCache?.();
    let async = await secureStorage.readAsync(credentials),
      c = async?.claudeAiOauth;
    if (c?.refreshToken) await revokeOAuthToken(c.refreshToken, c.clientId);
    let m = async?.designOauth;
    if (m?.refreshToken) await revokeOAuthToken(m.refreshToken, m.clientId);
    let S = async?.cloudSessionsOauth;
    if (S?.refreshToken) await revokeOAuthToken(S.refreshToken, S.clientId);
  }
  if (getAPIProvider() === "gateway") {
    let r = Date.now() + 5000;
    for (let m = getGatewayRefreshInFlight(); m && Date.now() < r; m = getGatewayRefreshInFlight())
      await withDeadline(
        m.catch(() => {}),
        r - Date.now(),
      );
    let e = getSecureStorage();
    e.invalidateCache?.();
    let c = (await e.readAsync(credentials))?.enterpriseGateway;
    if (c) await revokeGatewayToken(c, credentials);
  }
  if (!preserveInProcessTokens) (env.unset("CLAUDE_CODE_OAUTH_TOKEN"), setOauthTokenFromFd(null));
  (await removeApiKey(storageV5),
    await removeConsoleProfileCredentials({
      revoke:
        !preserveInProcessTokens && getAPIProvider() === "firstParty"
          ? ({ refreshToken: refreshToken, clientId: clientId }) => revokeOAuthToken(refreshToken, clientId)
          : void 0,
    }),
    forgetConsoleProfileCloudSessionsBearer());
  let h = getSecureStorage(),
    O;
  if (preserveNonAnthropicAuth) {
    if (getAPIProvider() === "firstParty") {
      h.invalidateCache?.();
      let r = (await h.readAsync(credentials))?.designOauth;
      if (r?.refreshToken) await revokeOAuthToken(r.refreshToken, r.clientId);
    }
    await h
      .mutate((current) => {
        let updated = { ...current };
        return (
          delete updated.claudeAiOauth,
          delete updated.organizationUuid,
          delete updated.trustedDeviceToken,
          delete updated.trustedDeviceEnrolledAfterRefusalAtMs,
          delete updated.enterpriseGateway,
          delete updated.designOauth,
          delete updated.cloudSessionsOauth,
          updated
        );
      }, credentials)
      .catch((r) => {
        let e = getErrnoCode(r);
        if (e === "EPERM" || e === "ENOENT" || isEnvFsErrno(r)) {
          logForDebugging(`[performLogout] re-login secure-storage prune failed (${e}): ${errorMessage(r)}`, {
            level: "error",
          });
          return;
        }
        logError(r);
      });
  } else {
    let r = !1,
      e = async () => {
        r = !0;
        let m = (await readSecureStorageWithRetry(h, credentials))?.coworkRemoteDevice;
        if ((await h.delete(credentials), m && Object.keys(m).length > 0))
          await restoreDeviceIdentity(h, m, credentials);
      };
    await withStorageWriteLock(e).catch((c) => {
      if (r) throw c;
      return (logError(c), runInsideWriteLock(e));
    });
  }
  (setGatewayAuth(null),
    setAuthenticatedAccount(null),
    setHostSessionsBearerSource(null),
    await clearAuthRelatedCaches(storageV5, {
      preserveQuotaAutoResume: preserveQuotaAutoResume,
      artifactAccount: artifactAccount,
      incomingIdentity: incomingIdentity,
      credentials: credentials,
    }),
    await saveGlobalConfig((r) => {
      let e = { ...r };
      if (clearOnboarding) {
        if (
          ((e.hasCompletedOnboarding = !1),
          (e.subscriptionNoticeCount = 0),
          (e.hasAvailableSubscription = !1),
          e.customApiKeyResponses !== void 0)
        )
          e.customApiKeyResponses = { approved: [], rejected: customApiKeyResponsesOf(e).rejected };
        let c = SUBSCRIPTION_SWITCH;
        if (e.seenNotifications?.[c] !== void 0) {
          let { [c]: m, ...S } = e.seenNotifications;
          e.seenNotifications = S;
        }
      }
      return (clearOAuthAccountFields(e), e);
    }, storageV5),
    await A(),
    setResolvedOrgDefault(void 0),
    logFeatureOk("oauth_logout"));
}
//@ chunk-th8w37yz.js:4545-4565 affinity
async function A() {}
/**
 * 登出（fleet 宿主侧）：清除凭证与 onboarding 后退出。
 */
//@ chunk-th8w37yz.js:5345-5650 facade-exports = authLogout (0.251)
async function fleetHostLogout({
  exit: exit,
  setError: setError,
  setInfo: setInfo,
  storageV5: storageV5,
  credentials: credentials,
}) {
  (setInfo("Signing out\u2026"), logAuthEvent({ action: "logout", success: !0, authMethod: "oauth" }));
  try {
    (await performLogout({ clearOnboarding: !0, storageV5: storageV5, credentials: credentials }), exit());
  } catch (error) {
    (logError(error),
      setError(`Couldn't sign out \u2014 ${error instanceof Error ? error.message : String(error)}`));
  }
}
//@ chunk-th8w37yz.js:5650-5908 sole-consumer
async function restoreDeviceIdentity(o, s, u) {
  let a;
  for (let f = 0; f < 2; f++)
    try {
      let mutate = await o.mutate(() => ({ coworkRemoteDevice: s }), u);
      if (mutate.success) return;
      if (
        ((a = Error("logout: the device identity could not be written back after the credential wipe")),
        !mutate.transient)
      )
        break;
    } catch (error) {
      a = error;
    }
  logError(a);
}
//@ chunk-th8w37yz.js:5908-6137 sole-consumer
async function readSecureStorageWithRetry(o, s) {
  for (let u = 0; u < 2; u++) {
    let a = await (o.readAsyncStrict?.(s) ?? o.readAsync(s));
    if (a !== READ_FAILED) return a;
  }
  logError(
    Error("logout: secure storage could not be read, so the device identity is not carried across the wipe"),
  );
  return;
}
//@ chunk-emh405f3.js:228-1000 placement
function signOutFailureMessage(o, t, e) {
  switch (t) {
    case "credential_store_failed":
      return primarySecureStoreKind() === "keychain"
        ? `Couldn't remove the saved sign-in for "${o}", so Claude Code may still use it. Claude Code could not read or update its credential store. If the macOS keychain is locked, unlock it, for example with \`security unlock-keychain\`, then ${e}.`
        : `Couldn't remove the saved sign-in for "${o}", so Claude Code may still use it. Claude Code could not read or update its credential store. ${e.charAt(0).toUpperCase()}${e.slice(1)}.`;
    case "keychain_unreadable":
      return `Couldn't confirm the sign-out from "${o}": Claude Code could not read the macOS keychain, so a saved sign-in may still be there. The keychain may be locked. Unlock it, for example with \`security unlock-keychain\`, then ${e}.`;
  }
}
/**
 * /logout 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-tndsj50r.js:12979-13456 fingerprint = call (0.431)
async function call(onDone, context) {
  let t = isBgSession();
  if (!t) logAuthEvent({ action: "logout", success: !0, authMethod: "oauth" });
  if (
    (await performLogout({
      clearOnboarding: !0,
      storageV5: context.storageV5,
      credentials: context.credentials,
    }),
    t)
  )
    return (
      onDone(
        "This background session shares credentials with other sessions; /logout here has no effect. Run /logout from your main terminal to sign out.",
        { display: "system" },
      ),
      null
    );
  let a = e(Text, { children: "Successfully logged out from your Anthropic account." });
  return (
    setTimeout(() => {
      gracefulShutdownSync(0, "logout");
    }, 200),
    a
  );
}

export { signOutFailureMessage, performLogout };
