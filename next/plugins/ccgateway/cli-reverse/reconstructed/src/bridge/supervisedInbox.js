/**
 * bridge/supervisedInbox.ts
 *
 * 2.1.316 新增。受监管桥接子进程绑定 PR 订阅并拉取收件箱消息。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nzcffb6d.js (9)
 * attribution: placement 9
 */
import { getLatchedPreSettingsEnvSnapshot } from "../utils/managedEnvApply.js";
import { getBridgeBaseUrl, getBridgeAccessTokenAsync } from "./bridgeConfig.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { bridgeHostState } from "./bridgeHostState.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { isBridgeFirstParty } from "./bridgeEnabled.js";
import { checkAndRefreshOAuthTokenIfNeeded } from "../utils/auth.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { getTrustedDeviceToken } from "./trustedDevice.js";
import { prSubscriptionEventName, subscribeGithubPullRequest } from "./githubPrSubscription.js";
import { resolveBridgeOwnerPin } from "./ownerPin.js";
import { isBridgeOwnerPinnedEndEnabled } from "./bridgeGates.js";
import { fetchSessionInboxMessage } from "./sessionInbox.js";

//@ chunk-nzcffb6d.js:670-802 placement
var BRIDGE_URL_ENV_VARS = [
  "CLAUDE_BRIDGE_BASE_URL",
  "USE_LOCAL_OAUTH",
  "USE_STAGING_OAUTH",
  "CLAUDE_LOCAL_OAUTH_API_BASE",
  "CLAUDE_CODE_CUSTOM_OAUTH_URL",
];
//@ chunk-nzcffb6d.js:802-913 placement
function stableBridgeBaseUrl() {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  if (
    latchedPreSettingsEnvSnapshot !== undefined &&
    BRIDGE_URL_ENV_VARS.some((name) => process.env[name] !== latchedPreSettingsEnvSnapshot[name])
  )
    return;
  try {
    return getBridgeBaseUrl();
  } catch {
    return;
  }
}
//@ chunk-nzcffb6d.js:913-981 placement
function inboxFetchFailure(stop, eventName = "bridge_inbox_fetch") {
  logFeatureBad(eventName, stop);
  return {
    ok: false,
    reason: stop,
  };
}
//@ chunk-nzcffb6d.js:981-1659 placement
/**
 * 检查受监管桥接会话、流量、令牌与 base URL
 */
async function resolveSupervisedInboxContext(options) {
  let supervisedBridgeSession = bridgeHostState().supervisedBridgeSession;
  if (supervisedBridgeSession === null)
    return {
      stop: "no_bridge",
    };
  if (isEssentialTrafficOnly())
    return {
      stop: "traffic_disabled",
    };
  if (!isBridgeFirstParty())
    return {
      stop: "no_token",
    };
  let baseUrl = stableBridgeBaseUrl();
  if (baseUrl === undefined)
    return {
      stop: "base_url_override",
    };
  let { credentials, storageV5 } = options;
  let bridgeAccessToken = await getBridgeAccessTokenAsync(credentials);
  if (bridgeAccessToken === undefined)
    return {
      stop: "no_token",
    };
  let refusal = await verifyInboxOwner(supervisedBridgeSession, options, bridgeAccessToken);
  if (refusal)
    return {
      stop: refusal,
    };
  try {
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials,
      storageV5,
    });
  } catch (error) {
    logForDebugging(`[bridge] supervised send: token refresh failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  let bridgeAccessToken_2 = await getBridgeAccessTokenAsync(credentials);
  if (bridgeAccessToken_2 === undefined)
    return {
      stop: "no_token",
    };
  let deviceToken = await getTrustedDeviceToken();
  let freshRefusal = await verifyInboxOwner(supervisedBridgeSession, options, bridgeAccessToken_2, {
    fresh: true,
  });
  if (freshRefusal)
    return {
      stop: freshRefusal,
    };
  return {
    send: {
      sessionId: supervisedBridgeSession.bridgeSessionId,
      baseUrl,
      accessToken: bridgeAccessToken_2,
      deviceToken,
    },
  };
}
//@ chunk-nzcffb6d.js:1659-1717 placement
function isSupervisedBridgeChild() {
  return bridgeHostState().supervisedBridgeSession !== null;
}
//@ chunk-nzcffb6d.js:1717-1984 placement
/**
 * 受监管桥接子进程绑定 PR 订阅并拉取收件箱消息。
 */
async function bindSupervisedPR(subscription, repo, prNumber, options) {
  let supervisedInboxContext = await resolveSupervisedInboxContext(options);
  if ("stop" in supervisedInboxContext)
    return inboxFetchFailure(supervisedInboxContext.stop, prSubscriptionEventName(subscription));
  let { sessionId, baseUrl, accessToken, deviceToken } = supervisedInboxContext.send;
  return subscribeGithubPullRequest(subscription, {
    sessionId,
    repo,
    prNumber,
    baseUrl,
    getAccessToken: () => accessToken,
    getTrustedDeviceToken: () => Promise.resolve(deviceToken),
  });
}
//@ chunk-nzcffb6d.js:1984-2322 placement
/**
 * 为受监管会话缓存收件箱所有者 pin 的铸造
 */
function getInboxOwnerPin(session, { credentials, storageV5 }, accessToken) {
  if (session.inboxOwner !== undefined) return session.inboxOwner;
  let pin = {
    mint: resolveBridgeOwnerPin({
      getAccessToken: () => accessToken,
      storageV5,
      credentials,
      presetOwner: session.owner,
    }),
    changed: false,
  };
  session.inboxOwner = pin;
  let forgetOnFailure = (isSettled) => {
    if (!isSettled && session.inboxOwner === pin) session.inboxOwner = undefined;
  };
  pin.mint.then(
    (mintResult) => forgetOnFailure(mintResult.pin !== undefined || mintResult.reason === "not_owner"),
    () => forgetOnFailure(false),
  );
  return pin;
}
//@ chunk-nzcffb6d.js:2322-3141 placement
/**
 * 核对收件箱所有者 pin 是否一致
 */
async function verifyInboxOwner(session, options, accessToken, confirmOptions) {
  if (!isBridgeOwnerPinnedEndEnabled()) return;
  if (session.owner === undefined) return "owner_unverified";
  let inboxOwnerPin = getInboxOwnerPin(session, options, accessToken);
  if (inboxOwnerPin.changed) return "owner_changed";
  let mintResult;
  try {
    mintResult = await inboxOwnerPin.mint;
  } catch (error) {
    logForDebugging(`[bridge] inbox fetch: owner pin could not be minted: ${errorMessage(error)}`, {
      level: "error",
    });
    return "owner_unverified";
  }
  if (mintResult.pin === undefined)
    switch (mintResult.reason) {
      case "no_token":
        return "no_token";
      case "no_identity":
      case "unresolved":
        return "owner_unverified";
      case "not_owner":
        inboxOwnerPin.changed = true;
        return "owner_changed";
      case "not_store_login":
        return "owner_unverified";
      case "disabled":
        return;
    }
  if (confirmOptions?.fresh || mintResult.pin.identityLooksChanged()) {
    let confirmOutcome = await mintResult.pin.confirmChanged(confirmOptions);
    if (confirmOutcome === "changed" || inboxOwnerPin.changed) {
      inboxOwnerPin.changed = true;
      return "owner_changed";
    }
    if (confirmOutcome === "inconclusive") return "owner_unverified";
  }
  if (confirmOptions?.fresh && !mintResult.pin.ownerVerified()) return "owner_unverified";
  return inboxOwnerPin.changed ? "owner_changed" : undefined;
}
//@ chunk-nzcffb6d.js:3141-3386 placement
async function fetchSupervisedInboxMessage(fileId, options) {
  let supervisedInboxContext = await resolveSupervisedInboxContext(options);
  if ("stop" in supervisedInboxContext) return inboxFetchFailure(supervisedInboxContext.stop);
  let { sessionId, baseUrl, accessToken, deviceToken } = supervisedInboxContext.send;
  return fetchSessionInboxMessage({
    sessionId,
    fileId,
    baseUrl,
    getAccessToken: () => accessToken,
    getTrustedDeviceToken: () => Promise.resolve(deviceToken),
  });
}
export { fetchSupervisedInboxMessage, bindSupervisedPR, isSupervisedBridgeChild };
