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
import { needsClientRegistration, registrationNotOffered } from "./registrationStatus.js";
import { getServerKey } from "./auth.js";
import { ht } from "./cliOwnedClients.js";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import { logMCPDebug } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { readSecureStorageForMcp } from "./credentialStoreRead.js";
import { READ_FAILED } from "../../utils/secureStorage/storageWriteLock.js";
import { identityEpoch } from "./identityChange.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";

//@ chunk-g2rygg7v.js:1055-1115 placement
function dZe() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_signed_out_fallback", !0);
}
//@ chunk-g2rygg7v.js:1115-1139 placement
var E = 604800000,
  j = 60000;
//@ chunk-g2rygg7v.js:1139-1213 placement
function k(e) {
  if (e === void 0) return !1;
  let r = Date.now() - e;
  return r > -j && r <= E;
}
/**
 * 判断是否尝试无令牌连接：服务器需要客户端注册，且未记录近期的无令牌拒绝或注册不可用。
 */
//@ chunk-g2rygg7v.js:1213-1418 placement
function shouldTryTokenless(e, r, n) {
  if (!needsClientRegistration(e, r, n)) return !1;
  if (!dZe()) return !0;
  let o = getServerKey(e, r),
    s = n?.[o]?.discoveryState?.tokenlessRejectedAt;
  if (s !== void 0 && k(s)) return (ht().tokenlessRejections.set(o, s), !0);
  return registrationNotOffered(e, r, n);
}
/**
 * 去掉 OAuth 发现状态中的无令牌拒绝时间。
 */
//@ chunk-g2rygg7v.js:1418-1521 placement
function withoutTokenlessRejection(e) {
  if (e?.tokenlessRejectedAt === void 0) return e;
  let { tokenlessRejectedAt: tokenlessRejectedAt, ...n } = e;
  return n;
}
//@ chunk-g2rygg7v.js:1521-1533 placement
var x = 60000;
/**
 * 记录刚保存的访问令牌，并清除对应的令牌拒绝记录。
 */
//@ chunk-g2rygg7v.js:1533-1689 placement
function recordSavedAccessToken(e, r) {
  let n = ht();
  (n.rejectedStoredTokens.delete(e),
    n.tokenlessRejections.delete(e),
    n.savedAccessTokens.set(e, { accessToken: r, savedAt: Date.now() }));
}
/**
 * 取服务器最近一次无令牌连接被拒的时间（已有令牌时不适用）。
 */
//@ chunk-g2rygg7v.js:1689-1903 placement
function tokenlessRejectedAt(e, r) {
  if (r?.discoveryState?.tokenlessRejectedAt !== void 0) return r.discoveryState.tokenlessRejectedAt;
  if (r?.accessToken || r?.refreshToken) return;
  let n = ht().tokenlessRejections.get(e);
  return k(n) ? n : void 0;
}
//@ chunk-g2rygg7v.js:1903-1972 placement
function Adn(e, r) {
  return dZe() && ht().rejectedStoredTokens.get(e) === r;
}
/**
 * 记录无令牌请求被拒（需要登录）。
 */
//@ chunk-g2rygg7v.js:1972-2658 placement
async function recordTokenlessRejection(e, r, n) {
  let o = n?.lastAuthRejection;
  if (o === void 0 || o.accessToken !== void 0 || (r.type !== "http" && r.type !== "sse") || !dZe()) return;
  let s = getServerKey(e, r),
    now = Date.now();
  ht().tokenlessRejections.set(s, now);
  function l(i) {
    return (
      i?.discoveryState !== void 0 &&
      !i.refreshToken &&
      (!i.accessToken || Adn(s, i.accessToken)) &&
      !k(i.discoveryState.tokenlessRejectedAt)
    );
  }
  try {
    if (!l((await getSecureStorage().readAsync())?.mcpOAuth?.[s])) return;
    await getSecureStorage().mutate((i) => {
      let h = i.mcpOAuth?.[s];
      if (h?.discoveryState === void 0 || !l(h)) return i;
      return {
        ...i,
        mcpOAuth: {
          ...i.mcpOAuth,
          [s]: { ...h, discoveryState: { ...h.discoveryState, tokenlessRejectedAt: now } },
        },
      };
    });
  } catch (error) {
    logMCPDebug(e, `Recording that the server requires a sign-in failed: ${errorMessage(error)}`);
  }
}
/**
 * 访问令牌被拒绝时删除并尝试无令牌连接。
 */
//@ chunk-g2rygg7v.js:2658-3257 placement
async function handleRejectedToken({
  name: e,
  serverRef: serverRef,
  authProvider: authProvider,
  isRefreshPath401: isRefreshPath401,
  needsAuth: needsAuth,
}) {
  let u = authProvider?.lastAuthRejection,
    l = u?.accessToken;
  if (
    u?.status !== 401 ||
    l === void 0 ||
    !isRefreshPath401 ||
    authProvider?.pendingStepUpScope !== void 0 ||
    (serverRef.type !== "http" && serverRef.type !== "sse") ||
    !dZe()
  )
    return;
  let i = getServerKey(e, serverRef),
    h = ht(),
    M = h.savedAccessTokens.get(i);
  if (M?.accessToken === l && Date.now() - M.savedAt < x) return;
  let S = await readSecureStorageForMcp(),
    p = S === READ_FAILED ? void 0 : S?.mcpOAuth?.[i];
  if (S === READ_FAILED || p?.refreshToken || k(p?.discoveryState?.tokenlessRejectedAt)) return;
  h.rejectedStoredTokens.set(i, l);
  let y = { name: e, type: "needs-auth", config: serverRef };
  return (h.connectsToRedialWithoutToken.set(y, needsAuth), y);
}
/**
 * 带"已登出回退"的 MCP 连接（无令牌重连）。
 */
//@ chunk-g2rygg7v.js:3257-4433 placement
async function connectWithSignedOutFallback(e, r, n, o) {
  let s = identityEpoch(),
    u = await e(),
    l = ht();
  if (o.type !== "http" && o.type !== "sse") return u;
  let i = getServerKey(n, o),
    h = l.connectsToRedialWithoutToken.get(u);
  if (h === void 0) {
    if (u.type === "connected") l.tokenlessRejections.delete(i);
    return u;
  }
  if (!r() || identityEpoch() !== s) return (l.rejectedStoredTokens.delete(i), r() ? h() : u);
  logMCPDebug(
    n,
    "The server rejected the stored access token and no refresh token is stored; connecting again without a token",
  );
  let M = await e(),
    S = l.rejectedStoredTokens.get(i);
  if (M.type !== "connected") {
    l.rejectedStoredTokens.delete(i);
    let p = M.type === "needs-auth" && !l.connectsToRedialWithoutToken.has(M);
    if ((logFeatureSad("mcp_signed_out_fallback", p ? "sign_in_required" : "not_connected"), p)) return M;
    return r() ? h() : u;
  }
  (logMCPDebug(n, "Connected without the rejected access token"),
    logFeatureOk("mcp_signed_out_fallback"),
    l.tokenlessRejections.delete(i));
  try {
    await getSecureStorage().mutate((p) => {
      let y = p.mcpOAuth?.[i];
      if (y === void 0 || y.refreshToken) return p;
      let _ = !!y.accessToken && y.accessToken === S,
        C = withoutTokenlessRejection(y.discoveryState);
      if (!_ && C === y.discoveryState) return p;
      return {
        ...p,
        mcpOAuth: {
          ...p.mcpOAuth,
          [i]: { ...y, ...(_ && { accessToken: "", expiresAt: 0 }), discoveryState: C },
        },
      };
    });
  } catch (error) {
    logMCPDebug(n, `Deleting the rejected access token failed: ${errorMessage(error)}`);
  }
  return M;
}
//@ chunk-g2rygg7v.js:4433-4552 placement
function httpOrigin(e) {
  try {
    let r = new URL(e);
    if (r.protocol !== "https:" && r.protocol !== "http:") return;
    return r.origin;
  } catch {
    return;
  }
}
/**
 * 提取认证发现状态。
 */
//@ chunk-g2rygg7v.js:4552-4741 placement
function authDiscoveryState(e) {
  return {
    authorizationServerUrl: e.authorizationServerUrl,
    oauthMetadataFound: e.oauthMetadataFound,
    authServerMetadataUrl: e.authServerMetadataUrl,
    ...(e.xaaPinned && { xaaPinned: !0 }),
  };
}
//@ chunk-g2rygg7v.js:4741-4804 placement
function A(e) {
  return e !== void 0 && e.authorizationServerUrl !== "";
}
/**
 * 合并新发现的授权服务器信息。
 */
//@ chunk-g2rygg7v.js:4804-5437 placement
function mergeDiscoveredAuth({
  previous: previous,
  discovered: discovered,
  servedMetadataUrl: servedMetadataUrl,
}) {
  if (A(previous) && previous.authServerMetadataUrl !== void 0)
    return {
      authorizationServerUrl: previous.authorizationServerUrl,
      oauthMetadataFound: previous.oauthMetadataFound,
      authServerMetadataUrl: previous.authServerMetadataUrl,
      ...(previous.xaaPinned && { xaaPinned: !0 }),
    };
  if (!discovered.oauthMetadataFound || httpOrigin(discovered.authorizationServerUrl) === void 0)
    return A(previous)
      ? {
          authorizationServerUrl: previous.authorizationServerUrl,
          oauthMetadataFound: previous.oauthMetadataFound,
        }
      : { ...discovered };
  if (A(previous) && previous.oauthMetadataFound !== !0 && servedMetadataUrl !== void 0)
    return {
      authorizationServerUrl: previous.authorizationServerUrl,
      oauthMetadataFound: previous.oauthMetadataFound,
    };
  return { ...discovered, authServerMetadataUrl: servedMetadataUrl ?? null };
}
//@ chunk-g2rygg7v.js:5437-5629 placement
function withServedMetadataUrl(
  e,
  { servedMetadataUrl: servedMetadataUrl, interactiveSignIn: interactiveSignIn },
) {
  if (!A(e)) return e;
  let o = servedMetadataUrl ?? null;
  return (interactiveSignIn ? e.authServerMetadataUrl === o : e.authServerMetadataUrl !== void 0)
    ? e
    : { ...e, authServerMetadataUrl: o };
}
/**
 * 合并登录得到的授权服务器信息。
 */
//@ chunk-g2rygg7v.js:5629-6448 placement
function mergeSignInAuth({
  previous: previous,
  signIn: signIn,
  servedMetadataUrl: servedMetadataUrl,
  interactiveSignIn: interactiveSignIn,
}) {
  if (xaaPinnedServer(previous)) return previous;
  if (
    signIn !== void 0 &&
    httpOrigin(signIn.authorizationServerUrl) !== void 0 &&
    (interactiveSignIn || !A(previous))
  ) {
    let {
      authServerMetadataUrl: authServerMetadataUrl,
      xaaPinned: xaaPinned,
      ...l
    } = previous ?? { authorizationServerUrl: "" };
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
    previous !== void 0 &&
    !interactiveSignIn &&
    previous.oauthMetadataFound !== !0 &&
    previous.authServerMetadataUrl === void 0
  )
    return signIn !== void 0 &&
      servedMetadataUrl === void 0 &&
      signIn.oauthMetadataFound &&
      httpOrigin(signIn.authorizationServerUrl) !== void 0
      ? {
          ...previous,
          authorizationServerUrl: signIn.authorizationServerUrl,
          oauthMetadataFound: !0,
          authServerMetadataUrl: null,
        }
      : previous;
  return (
    previous &&
    withServedMetadataUrl(previous, {
      servedMetadataUrl: servedMetadataUrl,
      interactiveSignIn: interactiveSignIn,
    })
  );
}
/**
 * 固定 XAA 授权服务器。
 */
//@ chunk-g2rygg7v.js:6448-6656 placement
function pinXaaAuth({ previous: previous, issuedBy: issuedBy, interactiveSignIn: interactiveSignIn }) {
  let o = previous?.authServerMetadataUrl;
  return {
    authorizationServerUrl: xaaPinnedServer(previous) ?? issuedBy,
    oauthMetadataFound: !0,
    authServerMetadataUrl: !interactiveSignIn && o !== void 0 ? o : null,
    xaaPinned: !0,
  };
}
/**
 * 取固定的 XAA 授权服务器。
 */
//@ chunk-g2rygg7v.js:6656-6734 placement
function xaaPinnedServer(e) {
  return e?.xaaPinned === !0 && A(e) ? e.authorizationServerUrl : void 0;
}

export {
  recordTokenlessRejection,
  handleRejectedToken,
  connectWithSignedOutFallback,
  shouldTryTokenless,
  dZe,
  xaaPinnedServer,
  authDiscoveryState,
  pinXaaAuth,
  Adn,
  withoutTokenlessRejection,
  mergeSignInAuth,
  recordSavedAccessToken,
  mergeDiscoveredAuth,
  tokenlessRejectedAt,
};
