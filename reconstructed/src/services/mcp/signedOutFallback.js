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
  let ageMs = Date.now() - tokenlessRejectedAt;
  return ageMs > -CLOCK_SKEW_MS && ageMs <= MAX_TOKENLESS_REJECTION_AGE_MS;
}
//@ chunk-g2rygg7v.js:1213-1418 placement
/**
 * 判断是否尝试无令牌连接：服务器需要客户端注册，且未记录近期的无令牌拒绝或注册不可用。
 */
function shouldTryTokenless(serverName, serverRef, store) {
  if (!needsClientRegistration(serverName, serverRef, store)) return false;
  if (!isSignedOutFallbackEnabled()) return true;
  let serverKey = getServerKey(serverName, serverRef);
  let tokenlessRejectedAt = store?.[serverKey]?.discoveryState?.tokenlessRejectedAt;
  if (tokenlessRejectedAt !== undefined && isFreshTimestamp(tokenlessRejectedAt)) {
    getCliOwnedState().tokenlessRejections.set(serverKey, tokenlessRejectedAt);
    return true;
  }
  return registrationNotOffered_2(serverName, serverRef, store);
}
//@ chunk-g2rygg7v.js:1418-1521 placement
/**
 * 去掉 OAuth 发现状态中的无令牌拒绝时间。
 */
function withoutTokenlessRejection(state) {
  if (state?.tokenlessRejectedAt === undefined) return state;
  let { tokenlessRejectedAt, ...rest } = state;
  return rest;
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
function tokenlessRejectedAt(serverKey, entry) {
  if (entry?.discoveryState?.tokenlessRejectedAt !== undefined)
    return entry.discoveryState.tokenlessRejectedAt;
  if (entry?.accessToken || entry?.refreshToken) return;
  let rejectedAt = getCliOwnedState().tokenlessRejections.get(serverKey);
  return isFreshTimestamp(rejectedAt) ? rejectedAt : undefined;
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
async function recordTokenlessRejection(serverName, serverRef, authProvider) {
  let lastAuthRejection = authProvider?.lastAuthRejection;
  if (
    lastAuthRejection === undefined ||
    lastAuthRejection.accessToken !== undefined ||
    (serverRef.type !== "http" && serverRef.type !== "sse") ||
    !isSignedOutFallbackEnabled()
  )
    return;
  let serverKey = getServerKey(serverName, serverRef);
  let now = Date.now();
  getCliOwnedState().tokenlessRejections.set(serverKey, now);
  function shouldClear(entry) {
    return (
      entry?.discoveryState !== undefined &&
      !entry.refreshToken &&
      (!entry.accessToken || isTokenRejected(serverKey, entry.accessToken)) &&
      !isFreshTimestamp(entry.discoveryState.tokenlessRejectedAt)
    );
  }
  try {
    if (!shouldClear((await getSecureStorage().readAsync())?.mcpOAuth?.[serverKey])) return;
    await getSecureStorage().mutate((storage) => {
      let entry = storage.mcpOAuth?.[serverKey];
      if (entry?.discoveryState === undefined || !shouldClear(entry)) return storage;
      return {
        ...storage,
        mcpOAuth: {
          ...storage.mcpOAuth,
          [serverKey]: {
            ...entry,
            discoveryState: {
              ...entry.discoveryState,
              tokenlessRejectedAt: now,
            },
          },
        },
      };
    });
  } catch (error) {
    logMCPDebug(serverName, `Recording that the server requires a sign-in failed: ${errorMessage(error)}`);
  }
}
//@ chunk-g2rygg7v.js:2658-3257 placement
/**
 * 访问令牌被拒绝时删除并尝试无令牌连接。
 */
async function handleRejectedToken({
  name: serverName,
  serverRef,
  authProvider,
  isRefreshPath401,
  needsAuth,
}) {
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
  let serverKey = getServerKey(serverName, serverRef);
  let cliOwnedState = getCliOwnedState();
  let saved = cliOwnedState.savedAccessTokens.get(serverKey);
  if (saved?.accessToken === accessToken && Date.now() - saved.savedAt < SAVED_TOKEN_GRACE_MS) return;
  let secureStorageForMcp = await readSecureStorageForMcp();
  let entry = secureStorageForMcp === READ_FAILED ? undefined : secureStorageForMcp?.mcpOAuth?.[serverKey];
  if (
    secureStorageForMcp === READ_FAILED ||
    entry?.refreshToken ||
    isFreshTimestamp(entry?.discoveryState?.tokenlessRejectedAt)
  )
    return;
  cliOwnedState.rejectedStoredTokens.set(serverKey, accessToken);
  let row = {
    name: serverName,
    type: "needs-auth",
    config: serverRef,
  };
  cliOwnedState.connectsToRedialWithoutToken.set(row, needsAuth);
  return row;
}
//@ chunk-g2rygg7v.js:3257-4433 placement
/**
 * 带"已登出回退"的 MCP 连接（无令牌重连）。
 */
async function connectWithSignedOutFallback(connect, shouldFallBack, serverName, config) {
  let epochAtStart = identityEpoch();
  let firstResult = await connect();
  let cliOwnedState = getCliOwnedState();
  if (config.type !== "http" && config.type !== "sse") return firstResult;
  let serverKey = getServerKey(serverName, config);
  let redialWithoutToken = cliOwnedState.connectsToRedialWithoutToken.get(firstResult);
  if (redialWithoutToken === undefined) {
    if (firstResult.type === "connected") cliOwnedState.tokenlessRejections.delete(serverKey);
    return firstResult;
  }
  if (!shouldFallBack() || identityEpoch() !== epochAtStart) {
    cliOwnedState.rejectedStoredTokens.delete(serverKey);
    return shouldFallBack() ? redialWithoutToken() : firstResult;
  }
  logMCPDebug(
    serverName,
    "The server rejected the stored access token and no refresh token is stored; connecting again without a token",
  );
  let secondResult = await connect();
  let rejectedToken = cliOwnedState.rejectedStoredTokens.get(serverKey);
  if (secondResult.type !== "connected") {
    cliOwnedState.rejectedStoredTokens.delete(serverKey);
    let signInRequired =
      secondResult.type === "needs-auth" && !cliOwnedState.connectsToRedialWithoutToken.has(secondResult);
    logFeatureSad("mcp_signed_out_fallback", signInRequired ? "sign_in_required" : "not_connected");
    if (signInRequired) return secondResult;
    return shouldFallBack() ? redialWithoutToken() : firstResult;
  }
  logMCPDebug(serverName, "Connected without the rejected access token");
  logFeatureOk("mcp_signed_out_fallback");
  cliOwnedState.tokenlessRejections.delete(serverKey);
  try {
    await getSecureStorage().mutate((storage) => {
      let entry = storage.mcpOAuth?.[serverKey];
      if (entry === undefined || entry.refreshToken) return storage;
      let isRejectedToken = !!entry.accessToken && entry.accessToken === rejectedToken;
      let discoveryState = withoutTokenlessRejection(entry.discoveryState);
      if (!isRejectedToken && discoveryState === entry.discoveryState) return storage;
      return {
        ...storage,
        mcpOAuth: {
          ...storage.mcpOAuth,
          [serverKey]: {
            ...entry,
            ...(isRejectedToken && {
              accessToken: "",
              expiresAt: 0,
            }),
            discoveryState,
          },
        },
      };
    });
  } catch (error) {
    logMCPDebug(serverName, `Deleting the rejected access token failed: ${errorMessage(error)}`);
  }
  return secondResult;
}
//@ chunk-g2rygg7v.js:4433-4552 placement
function httpOrigin(authorizationServerUrl) {
  try {
    let parsed = new URL(authorizationServerUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
    return parsed.origin;
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
  let nextUrl = servedMetadataUrl ?? null;
  return (
    interactiveSignIn
      ? previous.authServerMetadataUrl === nextUrl
      : previous.authServerMetadataUrl !== undefined
  )
    ? previous
    : {
        ...previous,
        authServerMetadataUrl: nextUrl,
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
    let { authServerMetadataUrl, xaaPinned, ...nextUrl } = previous ?? {
      authorizationServerUrl: "",
    };
    return interactiveSignIn || signIn.oauthMetadataFound
      ? {
          ...nextUrl,
          authorizationServerUrl: signIn.authorizationServerUrl,
          oauthMetadataFound: signIn.oauthMetadataFound,
          authServerMetadataUrl: servedMetadataUrl ?? null,
        }
      : {
          ...nextUrl,
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
