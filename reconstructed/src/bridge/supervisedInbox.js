/**
 * bridge/supervisedInbox.ts
 *
 * 2.1.316 新增。受监管桥接子进程绑定 PR 订阅并拉取收件箱消息。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x4rjx7qa.js (9)
 * attribution: placement 9
 */
import { getLatchedPreSettingsEnvSnapshot } from "../utils/managedEnvApply.js";
import { getBridgeBaseUrl, getBridgeAccessTokenAsync } from "./bridgeConfig.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { ao } from "./bridgeHostState.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { isBridgeFirstParty } from "./bridgeEnabled.js";
import { checkAndRefreshOAuthTokenIfNeeded } from "../utils/auth.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { getTrustedDeviceToken } from "./trustedDevice.js";
import { tXo, subscribeGithubPullRequest } from "./githubPrSubscription.js";
import { resolveBridgeOwnerPin } from "./ownerPin.js";
import { isBridgeOwnerPinnedEndEnabled } from "./bridgeGates.js";
import { fetchSessionInboxMessage } from "./sessionInbox.js";

//@ chunk-x4rjx7qa.js:670-802 placement
var BRIDGE_URL_ENV_VARS = [
  "CLAUDE_BRIDGE_BASE_URL",
  "USE_LOCAL_OAUTH",
  "USE_STAGING_OAUTH",
  "CLAUDE_LOCAL_OAUTH_API_BASE",
  "CLAUDE_CODE_CUSTOM_OAUTH_URL",
];
//@ chunk-x4rjx7qa.js:802-913 placement
function stableBridgeBaseUrl() {
  let e = getLatchedPreSettingsEnvSnapshot();
  if (e !== void 0 && BRIDGE_URL_ENV_VARS.some((r) => process.env[r] !== e[r])) return;
  try {
    return getBridgeBaseUrl();
  } catch {
    return;
  }
}
//@ chunk-x4rjx7qa.js:913-981 placement
function g(e, r = "bridge_inbox_fetch") {
  return (logFeatureBad(r, e), { ok: !1, reason: e });
}
/**
 * 检查受监管桥接会话、流量、令牌与 base URL
 */
//@ chunk-x4rjx7qa.js:981-1659 placement
async function resolveSupervisedInboxContext(e) {
  let supervisedBridgeSession = ao().supervisedBridgeSession;
  if (supervisedBridgeSession === null) return { stop: "no_bridge" };
  if (isEssentialTrafficOnly()) return { stop: "traffic_disabled" };
  if (!isBridgeFirstParty()) return { stop: "no_token" };
  let a = stableBridgeBaseUrl();
  if (a === void 0) return { stop: "base_url_override" };
  let { credentials: credentials, storageV5: storageV5 } = e,
    i = await getBridgeAccessTokenAsync(credentials);
  if (i === void 0) return { stop: "no_token" };
  let s = await verifyInboxOwner(supervisedBridgeSession, e, i);
  if (s) return { stop: s };
  try {
    await checkAndRefreshOAuthTokenIfNeeded({ credentials: credentials, storageV5: storageV5 });
  } catch (error) {
    logForDebugging(`[bridge] supervised send: token refresh failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  let u = await getBridgeAccessTokenAsync(credentials);
  if (u === void 0) return { stop: "no_token" };
  let c = await getTrustedDeviceToken(),
    f = await verifyInboxOwner(supervisedBridgeSession, e, u, { fresh: !0 });
  if (f) return { stop: f };
  return {
    send: { sessionId: supervisedBridgeSession.bridgeSessionId, baseUrl: a, accessToken: u, deviceToken: c },
  };
}
//@ chunk-x4rjx7qa.js:1659-1717 placement
function isSupervisedBridgeChild() {
  return ao().supervisedBridgeSession !== null;
}
/**
 * 受监管桥接子进程绑定 PR 订阅并拉取收件箱消息。
 */
//@ chunk-x4rjx7qa.js:1717-1984 placement
async function bindSupervisedPR(e, r, a, o) {
  let n = await resolveSupervisedInboxContext(o);
  if ("stop" in n) return g(n.stop, tXo(e));
  let { sessionId: sessionId, baseUrl: baseUrl, accessToken: accessToken, deviceToken: deviceToken } = n.send;
  return subscribeGithubPullRequest(e, {
    sessionId: sessionId,
    repo: r,
    prNumber: a,
    baseUrl: baseUrl,
    getAccessToken: () => accessToken,
    getTrustedDeviceToken: () => Promise.resolve(deviceToken),
  });
}
/**
 * 为受监管会话缓存收件箱所有者 pin 的铸造
 */
//@ chunk-x4rjx7qa.js:1984-2322 placement
function getInboxOwnerPin(e, { credentials: credentials, storageV5: storageV5 }, o) {
  if (e.inboxOwner !== void 0) return e.inboxOwner;
  let n = {
    mint: resolveBridgeOwnerPin({
      getAccessToken: () => o,
      storageV5: storageV5,
      credentials: credentials,
      presetOwner: e.owner,
    }),
    changed: !1,
  };
  e.inboxOwner = n;
  let i = (s) => {
    if (!s && e.inboxOwner === n) e.inboxOwner = void 0;
  };
  return (
    n.mint.then(
      (s) => i(s.pin !== void 0 || s.reason === "not_owner"),
      () => i(!1),
    ),
    n
  );
}
/**
 * 核对收件箱所有者 pin 是否一致
 */
//@ chunk-x4rjx7qa.js:2322-3141 placement
async function verifyInboxOwner(e, r, a, o) {
  if (!isBridgeOwnerPinnedEndEnabled()) return;
  if (e.owner === void 0) return "owner_unverified";
  let n = getInboxOwnerPin(e, r, a);
  if (n.changed) return "owner_changed";
  let i;
  try {
    i = await n.mint;
  } catch (error) {
    return (
      logForDebugging(`[bridge] inbox fetch: owner pin could not be minted: ${errorMessage(error)}`, {
        level: "error",
      }),
      "owner_unverified"
    );
  }
  if (i.pin === void 0)
    switch (i.reason) {
      case "no_token":
        return "no_token";
      case "no_identity":
      case "unresolved":
        return "owner_unverified";
      case "not_owner":
        return ((n.changed = !0), "owner_changed");
      case "not_store_login":
        return "owner_unverified";
      case "disabled":
        return;
    }
  if (o?.fresh || i.pin.identityLooksChanged()) {
    let confirmChanged = await i.pin.confirmChanged(o);
    if (confirmChanged === "changed" || n.changed) return ((n.changed = !0), "owner_changed");
    if (confirmChanged === "inconclusive") return "owner_unverified";
  }
  if (o?.fresh && !i.pin.ownerVerified()) return "owner_unverified";
  return n.changed ? "owner_changed" : void 0;
}
//@ chunk-x4rjx7qa.js:3141-3386 placement
async function fetchSupervisedInboxMessage(e, r) {
  let a = await resolveSupervisedInboxContext(r);
  if ("stop" in a) return g(a.stop);
  let { sessionId: sessionId, baseUrl: baseUrl, accessToken: accessToken, deviceToken: deviceToken } = a.send;
  return fetchSessionInboxMessage({
    sessionId: sessionId,
    fileId: e,
    baseUrl: baseUrl,
    getAccessToken: () => accessToken,
    getTrustedDeviceToken: () => Promise.resolve(deviceToken),
  });
}

export { fetchSupervisedInboxMessage };
