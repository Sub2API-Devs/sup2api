/**
 * utils/gatewayCredential.ts
 *
 * 2.1.316 新增：网关凭据
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-99h01h55.js (7)
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

//@ chunk-99h01h55.js:751-869 placement
function noGatewayCredentialMessage(detail) {
  return detail
    ? `this session holds no gateway credential (${detail})`
    : "this session holds no gateway credential";
}
//@ chunk-99h01h55.js:869-902 placement
/**
 * 判断当前是否拥有任一网关凭据（订阅者登录或 WIF 登录）。
 */
function hasAnyGatewayCredential() {
  return isClaudeAISubscriber() || hasWifDispatchLogin();
}
//@ chunk-99h01h55.js:902-984 placement
function hasWifDispatchLogin() {
  if (getWIFPrecedenceSource() !== "env-quad") return false;
  try {
    return isWIFDispatchAuth() && hasUsableClaudeAILogin();
  } catch {
    return false;
  }
}
//@ chunk-99h01h55.js:984-1017 placement
/**
 * 判断是否为"非订阅者、靠 WIF 登录"的 API Key 网关会话。
 */
function isApiKeyGatewaySession() {
  return !isClaudeAISubscriber() && hasWifDispatchLogin();
}
//@ chunk-99h01h55.js:1017-1126 placement
function getGatewayAccountInfo() {
  let { info, storeBearerOnly } = resolveGatewayAccountInfo();
  if (!storeBearerOnly || info === undefined) return info;
  return getClaudeAIOAuthTokenOrigin() === "store" ? info : undefined;
}
//@ chunk-99h01h55.js:1126-1277 placement
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
//@ chunk-99h01h55.js:1277-1400 placement
async function getGatewayAccountInfoAsync(credentials) {
  let { info, storeBearerOnly } = resolveGatewayAccountInfo();
  if (!storeBearerOnly || info === undefined) return info;
  return (await getClaudeAIOAuthTokenOriginAsync(credentials)) === "store" ? info : undefined;
}
export {
  getGatewayAccountInfo,
  hasAnyGatewayCredential,
  isApiKeyGatewaySession,
  getGatewayAccountInfoAsync,
  noGatewayCredentialMessage,
  resolveGatewayAccountInfo,
};
