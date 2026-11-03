/**
 * services/mcp/signedOutFallback.ts
 *
 * 2.1.316 新增：带"已登出回退"的 MCP 连接（无令牌重连）；合并登录得到的授权服务器信息等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g2rygg7v.js (20)
 * attribution: placement 20
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { needsClientRegistration, registrationNotOffered_2 } from "./registrationStatus.js";
import { getServerKey } from "./auth.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import { logMCPDebug } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { readSecureStorageForMcp } from "./credentialStoreRead.js";
import { READ_FAILED } from "../../utils/secureStorage/storageWriteLock.js";
import { identityEpoch } from "./identityChange.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";

//@ chunk-g2rygg7v.js:1055-1115 placement
/**
 * 无令牌回退开关是否开启。
 */
function isSignedOutFallbackEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_signed_out_fallback", true);
}
//@ chunk-g2rygg7v.js:1115-1139 placement
/**
 * 允许的时钟偏差（60000 毫秒）。
 */
var MAX_TOKENLESS_REJECTION_AGE_MS = 604800000;
var CLOCK_SKEW_MS = 60000;
//@ chunk-g2rygg7v.js:1139-1213 placement
/**
 * 判断时间戳是否新鲜。
 */
function isFreshTimestamp(tokenlessRejectedAt) {
  if (tokenlessRejectedAt === undefined) return false;
  let r = Date.now() - tokenlessRejectedAt;
  return r > -CLOCK_SKEW_MS && r <= MAX_TOKENLESS_REJECTION_AGE_MS;
}
//@ chunk-g2rygg7v.js:1213-1418 placement
/**
 * 判断是否尝试无令牌连接：服务器需要客户端注册，且未记录近期的无令牌拒绝或注册不可用。
 */
function shouldTryTokenless(e, r, mcpOAuthStore) {
  if (!needsClientRegistration(e, r, mcpOAuthStore)) return false;
  if (!isSignedOutFallbackEnabled()) return true;
  let serverKey = getServerKey(e, r);
  let tokenlessRejectedAt = mcpOAuthStore?.[serverKey]?.discoveryState?.tokenlessRejectedAt;
  if (tokenlessRejectedAt !== undefined && isFreshTimestamp(tokenlessRejectedAt)) {
    getCliOwnedState().tokenlessRejections.set(serverKey, tokenlessRejectedAt);
    return true;
  }
  return registrationNotOffered_2(e, r, mcpOAuthStore);
}
//@ chunk-g2rygg7v.js:1418-1521 placement
/**
 * 去掉 OAuth 发现状态中的无令牌拒绝时间。
 */
function withoutTokenlessRejection(e) {
  if (e?.tokenlessRejectedAt === undefined) return e;
  let { tokenlessRejectedAt, ...n } = e;
  return n;
}
//@ chunk-g2rygg7v.js:1521-1533 placement
/**
 * 保存令牌后的宽限时间（60 秒）。
 */
var SAVED_TOKEN_GRACE_MS = 60000;
//@ chunk-g2rygg7v.js:1533-1689 placement
/**
 * 记录刚保存的访问令牌，并清除对应的令牌拒绝记录。
 */
function recordSavedAccessToken(serverKey, accessToken) {
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.rejectedStoredTokens.delete(serverKey);
  cliOwnedState.tokenlessRejections.delete(serverKey);
  cliOwnedState.savedAccessTokens.set(serverKey, {
    accessToken,
    savedAt: Date.now(),
  });
}
//@ chunk-g2rygg7v.js:1689-1903 placement
/**
 * 取服务器最近一次无令牌连接被拒的时间（已有令牌时不适用）。
 */
function tokenlessRejectedAt(serverKey, r) {
  if (r?.discoveryState?.tokenlessRejectedAt !== undefined) return r.discoveryState.tokenlessRejectedAt;
  if (r?.accessToken || r?.refreshToken) return;
  let n = getCliOwnedState().tokenlessRejections.get(serverKey);
  return isFreshTimestamp(n) ? n : undefined;
}
//@ chunk-g2rygg7v.js:1903-1972 placement
/**
 * 判断该令牌是否被记录为拒绝。
 */
function isTokenRejected(serverKey, accessToken) {
  return (
    isSignedOutFallbackEnabled() && getCliOwnedState().rejectedStoredTokens.get(serverKey) === accessToken
  );
}
//@ chunk-g2rygg7v.js:1972-2658 placement
/**
 * 记录无令牌请求被拒（需要登录）。
 */
async function recordTokenlessRejection(e, serverRef, authProvider) {
  let lastAuthRejection = authProvider?.lastAuthRejection;
  if (
    lastAuthRejection === undefined ||
    lastAuthRejection.accessToken !== undefined ||
    (serverRef.type !== "http" && serverRef.type !== "sse") ||
    !isSignedOutFallbackEnabled()
  )
    return;
  let serverKey = getServerKey(e, serverRef);
  let now = Date.now();
  getCliOwnedState().tokenlessRejections.set(serverKey, now);
  function l(i) {
    return (
      i?.discoveryState !== undefined &&
      !i.refreshToken &&
      (!i.accessToken || isTokenRejected(serverKey, i.accessToken)) &&
      !isFreshTimestamp(i.discoveryState.tokenlessRejectedAt)
    );
  }
  try {
    if (!l((await getSecureStorage().readAsync())?.mcpOAuth?.[serverKey])) return;
    await getSecureStorage().mutate((i) => {
      let h = i.mcpOAuth?.[serverKey];
      if (h?.discoveryState === undefined || !l(h)) return i;
      return {
        ...i,
        mcpOAuth: {
          ...i.mcpOAuth,
          [serverKey]: {
            ...h,
            discoveryState: {
              ...h.discoveryState,
              tokenlessRejectedAt: now,
            },
          },
        },
      };
    });
  } catch (error) {
    logMCPDebug(e, `Recording that the server requires a sign-in failed: ${errorMessage(error)}`);
  }
}
//@ chunk-g2rygg7v.js:2658-3257 placement
/**
 * 访问令牌被拒绝时删除并尝试无令牌连接。
 */
async function handleRejectedToken({ name: e, serverRef, authProvider, isRefreshPath401, needsAuth }) {
  let lastAuthRejection = authProvider?.lastAuthRejection;
  let accessToken = lastAuthRejection?.accessToken;
  if (
    lastAuthRejection?.status !== 401 ||
    accessToken === undefined ||
    !isRefreshPath401 ||
    authProvider?.pendingStepUpScope !== undefined ||
    (serverRef.type !== "http" && serverRef.type !== "sse") ||
    !isSignedOutFallbackEnabled()
  )
    return;
  let serverKey = getServerKey(e, serverRef);
  let cliOwnedState = getCliOwnedState();
  let M = cliOwnedState.savedAccessTokens.get(serverKey);
  if (M?.accessToken === accessToken && Date.now() - M.savedAt < SAVED_TOKEN_GRACE_MS) return;
  let secureStorageForMcp = await readSecureStorageForMcp();
  let p = secureStorageForMcp === READ_FAILED ? undefined : secureStorageForMcp?.mcpOAuth?.[serverKey];
  if (
    secureStorageForMcp === READ_FAILED ||
    p?.refreshToken ||
    isFreshTimestamp(p?.discoveryState?.tokenlessRejectedAt)
  )
    return;
  cliOwnedState.rejectedStoredTokens.set(serverKey, accessToken);
  let y = {
    name: e,
    type: "needs-auth",
    config: serverRef,
  };
  cliOwnedState.connectsToRedialWithoutToken.set(y, needsAuth);
  return y;
}
//@ chunk-g2rygg7v.js:3257-4433 placement
/**
 * 带"已登出回退"的 MCP 连接（无令牌重连）。
 */
async function connectWithSignedOutFallback(e, r, n, o) {
  let s = identityEpoch();
  let u = await e();
  let cliOwnedState = getCliOwnedState();
  if (o.type !== "http" && o.type !== "sse") return u;
  let serverKey = getServerKey(n, o);
  let h = cliOwnedState.connectsToRedialWithoutToken.get(u);
  if (h === undefined) {
    if (u.type === "connected") cliOwnedState.tokenlessRejections.delete(serverKey);
    return u;
  }
  if (!r() || identityEpoch() !== s) {
    cliOwnedState.rejectedStoredTokens.delete(serverKey);
    return r() ? h() : u;
  }
  logMCPDebug(
    n,
    "The server rejected the stored access token and no refresh token is stored; connecting again without a token",
  );
  let M = await e();
  let S = cliOwnedState.rejectedStoredTokens.get(serverKey);
  if (M.type !== "connected") {
    cliOwnedState.rejectedStoredTokens.delete(serverKey);
    let p = M.type === "needs-auth" && !cliOwnedState.connectsToRedialWithoutToken.has(M);
    logFeatureSad("mcp_signed_out_fallback", p ? "sign_in_required" : "not_connected");
    if (p) return M;
    return r() ? h() : u;
  }
  logMCPDebug(n, "Connected without the rejected access token");
  logFeatureOk("mcp_signed_out_fallback");
  cliOwnedState.tokenlessRejections.delete(serverKey);
  try {
    await getSecureStorage().mutate((p) => {
      let y = p.mcpOAuth?.[serverKey];
      if (y === undefined || y.refreshToken) return p;
      let _ = !!y.accessToken && y.accessToken === S;
      let C = withoutTokenlessRejection(y.discoveryState);
      if (!_ && C === y.discoveryState) return p;
      return {
        ...p,
        mcpOAuth: {
          ...p.mcpOAuth,
          [serverKey]: {
            ...y,
            ...(_ && {
              accessToken: "",
              expiresAt: 0,
            }),
            discoveryState: C,
          },
        },
      };
    });
  } catch (error) {
    logMCPDebug(n, `Deleting the rejected access token failed: ${errorMessage(error)}`);
  }
  return M;
}
//@ chunk-g2rygg7v.js:4433-4552 placement
function httpOrigin(authorizationServerUrl) {
  try {
    let r = new URL(authorizationServerUrl);
    if (r.protocol !== "https:" && r.protocol !== "http:") return;
    return r.origin;
  } catch {
    return;
  }
}
//@ chunk-g2rygg7v.js:4552-4741 placement
/**
 * 提取认证发现状态。
 */
function authDiscoveryState(discoveryState) {
  return {
    authorizationServerUrl: discoveryState.authorizationServerUrl,
    oauthMetadataFound: discoveryState.oauthMetadataFound,
    authServerMetadataUrl: discoveryState.authServerMetadataUrl,
    ...(discoveryState.xaaPinned && {
      xaaPinned: true,
    }),
  };
}
//@ chunk-g2rygg7v.js:4741-4804 placement
/**
 * 判断授权服务器信息是否可用（地址非空）。
 */
function hasAuthServer(previous) {
  return previous !== undefined && previous.authorizationServerUrl !== "";
}
//@ chunk-g2rygg7v.js:4804-5437 placement
/**
 * 合并新发现的授权服务器信息。
 */
function mergeDiscoveredAuth({ previous, discovered, servedMetadataUrl }) {
  if (hasAuthServer(previous) && previous.authServerMetadataUrl !== undefined)
    return {
      authorizationServerUrl: previous.authorizationServerUrl,
      oauthMetadataFound: previous.oauthMetadataFound,
      authServerMetadataUrl: previous.authServerMetadataUrl,
      ...(previous.xaaPinned && {
        xaaPinned: true,
      }),
    };
  if (!discovered.oauthMetadataFound || httpOrigin(discovered.authorizationServerUrl) === undefined)
    return hasAuthServer(previous)
      ? {
          authorizationServerUrl: previous.authorizationServerUrl,
          oauthMetadataFound: previous.oauthMetadataFound,
        }
      : {
          ...discovered,
        };
  if (hasAuthServer(previous) && previous.oauthMetadataFound !== true && servedMetadataUrl !== undefined)
    return {
      authorizationServerUrl: previous.authorizationServerUrl,
      oauthMetadataFound: previous.oauthMetadataFound,
    };
  return {
    ...discovered,
    authServerMetadataUrl: servedMetadataUrl ?? null,
  };
}
//@ chunk-g2rygg7v.js:5437-5629 placement
function withServedMetadataUrl(previous, { servedMetadataUrl, interactiveSignIn }) {
  if (!hasAuthServer(previous)) return previous;
  let o = servedMetadataUrl ?? null;
  return (
    interactiveSignIn ? previous.authServerMetadataUrl === o : previous.authServerMetadataUrl !== undefined
  )
    ? previous
    : {
        ...previous,
        authServerMetadataUrl: o,
      };
}
//@ chunk-g2rygg7v.js:5629-6448 placement
/**
 * 合并登录得到的授权服务器信息。
 */
function mergeSignInAuth({ previous, signIn, servedMetadataUrl, interactiveSignIn }) {
  if (xaaPinnedServer(previous)) return previous;
  if (
    signIn !== undefined &&
    httpOrigin(signIn.authorizationServerUrl) !== undefined &&
    (interactiveSignIn || !hasAuthServer(previous))
  ) {
    let { authServerMetadataUrl, xaaPinned, ...l } = previous ?? {
      authorizationServerUrl: "",
    };
    return interactiveSignIn || signIn.oauthMetadataFound
      ? {
          ...l,
          authorizationServerUrl: signIn.authorizationServerUrl,
          oauthMetadataFound: signIn.oauthMetadataFound,
          authServerMetadataUrl: servedMetadataUrl ?? null,
        }
      : {
          ...l,
          authorizationServerUrl: signIn.authorizationServerUrl,
          oauthMetadataFound: signIn.oauthMetadataFound,
        };
  }
  if (
    previous !== undefined &&
    !interactiveSignIn &&
    previous.oauthMetadataFound !== true &&
    previous.authServerMetadataUrl === undefined
  )
    return signIn !== undefined &&
      servedMetadataUrl === undefined &&
      signIn.oauthMetadataFound &&
      httpOrigin(signIn.authorizationServerUrl) !== undefined
      ? {
          ...previous,
          authorizationServerUrl: signIn.authorizationServerUrl,
          oauthMetadataFound: true,
          authServerMetadataUrl: null,
        }
      : previous;
  return (
    previous &&
    withServedMetadataUrl(previous, {
      servedMetadataUrl,
      interactiveSignIn,
    })
  );
}
//@ chunk-g2rygg7v.js:6448-6656 placement
/**
 * 固定 XAA 授权服务器。
 */
function pinXaaAuth({ previous, issuedBy, interactiveSignIn }) {
  let authServerMetadataUrl = previous?.authServerMetadataUrl;
  return {
    authorizationServerUrl: xaaPinnedServer(previous) ?? issuedBy,
    oauthMetadataFound: true,
    authServerMetadataUrl:
      !interactiveSignIn && authServerMetadataUrl !== undefined ? authServerMetadataUrl : null,
    xaaPinned: true,
  };
}
//@ chunk-g2rygg7v.js:6656-6734 placement
/**
 * 取固定的 XAA 授权服务器。
 */
function xaaPinnedServer(discoveryState) {
  return discoveryState?.xaaPinned === true && hasAuthServer(discoveryState)
    ? discoveryState.authorizationServerUrl
    : undefined;
}
export {
  recordTokenlessRejection,
  handleRejectedToken,
  connectWithSignedOutFallback,
  shouldTryTokenless,
  isSignedOutFallbackEnabled,
  xaaPinnedServer,
  authDiscoveryState,
  pinXaaAuth,
  isTokenRejected,
  withoutTokenlessRejection,
  mergeSignInAuth,
  recordSavedAccessToken,
  mergeDiscoveredAuth,
  tokenlessRejectedAt,
};
