/**
 * utils/gatewayCredential.ts
 *
 * 2.1.316 新增：网关凭据
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-chhd9p2w.js (7)
 * attribution: placement 7
 */
import {
  isClaudeAISubscriber,
  isWIFDispatchAuth,
  hasUsableClaudeAILogin,
  getClaudeAIOAuthTokenOrigin,
  getOauthAccountInfo,
  getStoredOauthAccountInfo,
  getClaudeAIOAuthTokenOriginAsync,
} from "./auth.js";
import { getWIFPrecedenceSource } from "./wifProfile.js";

//@ chunk-chhd9p2w.js:784-902 placement
function noGatewayCredentialMessage(detail) {
  return detail
    ? `this session holds no gateway credential (${detail})`
    : "this session holds no gateway credential";
}
//@ chunk-chhd9p2w.js:902-935 placement
/**
 * 判断当前是否拥有任一网关凭据（订阅者登录或 WIF 登录）。
 */
function hasAnyGatewayCredential() {
  return isClaudeAISubscriber() || hasWifDispatchLogin();
}
//@ chunk-chhd9p2w.js:935-1017 placement
function hasWifDispatchLogin() {
  if (getWIFPrecedenceSource() !== "env-quad") return false;
  try {
    return isWIFDispatchAuth() && hasUsableClaudeAILogin();
  } catch {
    return false;
  }
}
//@ chunk-chhd9p2w.js:1017-1050 placement
/**
 * 判断是否为"非订阅者、靠 WIF 登录"的 API Key 网关会话。
 */
function isApiKeyGatewaySession() {
  return !isClaudeAISubscriber() && hasWifDispatchLogin();
}
//@ chunk-chhd9p2w.js:1050-1159 placement
function getGatewayAccountInfo() {
  let { info, storeBearerOnly } = resolveGatewayAccountInfo();
  if (!storeBearerOnly || info === undefined) return info;
  return getClaudeAIOAuthTokenOrigin() === "store" ? info : undefined;
}
//@ chunk-chhd9p2w.js:1159-1310 placement
function resolveGatewayAccountInfo() {
  let oauthAccountInfo = getOauthAccountInfo();
  if (oauthAccountInfo !== undefined)
    return {
      info: oauthAccountInfo,
      storeBearerOnly: false,
    };
  return isApiKeyGatewaySession()
    ? {
        info: getStoredOauthAccountInfo(),
        storeBearerOnly: true,
      }
    : {
        info: undefined,
        storeBearerOnly: false,
      };
}
//@ chunk-chhd9p2w.js:1310-1433 placement
async function getGatewayAccountInfoAsync(credentials) {
  let { info, storeBearerOnly } = resolveGatewayAccountInfo();
  if (!storeBearerOnly || info === undefined) return info;
  return (await getClaudeAIOAuthTokenOriginAsync(credentials)) === "store" ? info : undefined;
}
export {
  hasAnyGatewayCredential,
  isApiKeyGatewaySession,
  getGatewayAccountInfo,
  noGatewayCredentialMessage,
  getGatewayAccountInfoAsync,
  resolveGatewayAccountInfo,
};
