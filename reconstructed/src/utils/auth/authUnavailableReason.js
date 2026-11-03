/**
 * utils/auth/authUnavailableReason.ts
 *
 * 2.1.316 新增：判断 claude.ai 账号功能不可用的原因（第三方、--bare、流量关闭、策略、未登录/云会话）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-381d7r01.js (8)
 * attribution: placement 8
 */
import { getAuthTokenSource, isHostManagedProviderAuth, isFirstPartyManagedOAuthContext } from "../auth.js";
import { isOauthTokenFromBgSnapshot, getIsRemoteMode } from "../../bootstrap/state.js";
import { isLocalAgentSession, isClaudecodeSession } from "../sessionShape.js";
import { isDesktopNonClaudecode } from "../entrypointKinds.js";
import { Jrt } from "../../services/plugins/accountSync/pluginsScopeGate.js";
import { env } from "../env.js";
import { getAPIProvider } from "../model/providers.js";
import { isBareMode } from "../envUtils.js";
import { isEssentialTrafficOnly } from "../privacyLevel.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { ALLOW_PLUGIN_PUBLISH_KEY } from "../../services/plugins/publish/publishGate.js";

//@ chunk-381d7r01.js:569-610 placement
var wAo = (o) => o.find((m) => m !== !1) || void 0;
//@ chunk-381d7r01.js:610-726 placement
function isEnvOauthTokenSource() {
  let { source: source } = getAuthTokenSource();
  return source === "CLAUDE_CODE_OAUTH_TOKEN" || source === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR";
}
//@ chunk-381d7r01.js:726-785 placement
var p = () =>
  getAuthTokenSource().source === "CCR_OAUTH_TOKEN_FILE" &&
  isOauthTokenFromBgSnapshot() &&
  isHostManagedProviderAuth();
//@ chunk-381d7r01.js:785-826 placement
var u = () =>
  isLocalAgentSession() &&
  !isClaudecodeSession() &&
  isHostManagedProviderAuth() &&
  (isEnvOauthTokenSource() || p());
//@ chunk-381d7r01.js:826-905 placement
var lGn = () =>
  isFirstPartyManagedOAuthContext() &&
  !getIsRemoteMode() &&
  ((isDesktopNonClaudecode() && getAuthTokenSource().source === "CLAUDE_CODE_OAUTH_TOKEN") || u());
//@ chunk-381d7r01.js:905-928 placement
var l = () => Jrt() || lGn();
//@ chunk-381d7r01.js:928-990 placement
var A$s = () => (env.CLAUDE_CODE_REMOTE ? "cloud-session" : "signed-out");
//@ chunk-381d7r01.js:990-1108 placement
var getAuthUnavailableReason = () =>
  wAo([
    getAPIProvider() !== "firstParty" && "third-party",
    isBareMode() && "bare",
    isEssentialTrafficOnly() && "traffic-off",
    !isPolicyAllowed(ALLOW_PLUGIN_PUBLISH_KEY) && "policy",
    !l() && A$s(),
  ]);

export { wAo, lGn, A$s, getAuthUnavailableReason };
