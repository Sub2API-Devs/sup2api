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
function noGatewayCredentialMessage(e) {
  return e ? `this session holds no gateway credential (${e})` : "this session holds no gateway credential";
}
//@ chunk-99h01h55.js:869-902 placement
function nUe() {
  return isClaudeAISubscriber() || ge();
}
//@ chunk-99h01h55.js:902-984 placement
function ge() {
  if (getWIFPrecedenceSource() !== "env-quad") return !1;
  try {
    return isWIFDispatchAuth() && hasUsableClaudeAILogin();
  } catch {
    return !1;
  }
}
//@ chunk-99h01h55.js:984-1017 placement
function r6t() {
  return !isClaudeAISubscriber() && ge();
}
//@ chunk-99h01h55.js:1017-1126 placement
function getGatewayAccountInfo() {
  let { info: info, storeBearerOnly: storeBearerOnly } = resolveGatewayAccountInfo();
  if (!storeBearerOnly || info === void 0) return info;
  return getClaudeAIOAuthTokenOrigin() === "store" ? info : void 0;
}
//@ chunk-99h01h55.js:1126-1277 placement
function resolveGatewayAccountInfo() {
  let e = getOauthAccountInfo();
  if (e !== void 0) return { info: e, storeBearerOnly: !1 };
  return r6t()
    ? { info: getStoredOauthAccountInfo(), storeBearerOnly: !0 }
    : { info: void 0, storeBearerOnly: !1 };
}
//@ chunk-99h01h55.js:1277-1400 placement
async function getGatewayAccountInfoAsync(e) {
  let { info: info, storeBearerOnly: storeBearerOnly } = resolveGatewayAccountInfo();
  if (!storeBearerOnly || info === void 0) return info;
  return (await getClaudeAIOAuthTokenOriginAsync(e)) === "store" ? info : void 0;
}

export {
  getGatewayAccountInfo,
  nUe,
  r6t,
  getGatewayAccountInfoAsync,
  noGatewayCredentialMessage,
  resolveGatewayAccountInfo,
};
