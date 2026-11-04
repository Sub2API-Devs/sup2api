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
import { isFirstPartyClaudeAiSession } from "../../services/plugins/accountSync/pluginsScopeGate.js";
import { env } from "../env.js";
import { getAPIProvider } from "../model/providers.js";
import { isBareMode } from "../envUtils.js";
import { isEssentialTrafficOnly } from "../privacyLevel.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { ALLOW_PLUGIN_PUBLISH_KEY } from "../../services/plugins/publish/publishGate.js";

//@ chunk-381d7r01.js:569-610 placement
/**
 * 取数组里第一个非 false 的值。
 */
var firstTruthy = (values) => values.find((value) => value !== false) || undefined;
//@ chunk-381d7r01.js:610-726 placement
function isEnvOauthTokenSource() {
  let { source } = getAuthTokenSource();
  return source === "CLAUDE_CODE_OAUTH_TOKEN" || source === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR";
}
//@ chunk-381d7r01.js:726-785 placement
/**
 * 是否使用后台认证快照里的 OAuth 令牌。
 */
var hasBgSnapshotOauthToken = () =>
  getAuthTokenSource().source === "CCR_OAUTH_TOKEN_FILE" &&
  isOauthTokenFromBgSnapshot() &&
  isHostManagedProviderAuth();
//@ chunk-381d7r01.js:785-826 placement
/**
 * 本机 agent 会话（非 claudecode）是否使用自身令牌。
 */
var usesLocalAgentOwnToken = () =>
  isLocalAgentSession() &&
  !isClaudecodeSession() &&
  isHostManagedProviderAuth() &&
  (isEnvOauthTokenSource() || hasBgSnapshotOauthToken());
//@ chunk-381d7r01.js:826-905 placement
/**
 * 桌面端（非 claudecode）自带 OAuth 令牌的会话判定。
 */
var isDesktopSessionWithOwnToken = () =>
  isFirstPartyManagedOAuthContext() &&
  !getIsRemoteMode() &&
  ((isDesktopNonClaudecode() && getAuthTokenSource().source === "CLAUDE_CODE_OAUTH_TOKEN") ||
    usesLocalAgentOwnToken());
//@ chunk-381d7r01.js:905-928 placement
/**
 * 聊天或桌面会话自带令牌的统一判定。
 */
var isChatSessionWithOwnToken = () => isFirstPartyClaudeAiSession() || isDesktopSessionWithOwnToken();
//@ chunk-381d7r01.js:928-990 placement
/**
 * 云会话返回 “cloud-session”，否则 “signed-out”。
 */
var authUnavailableReasonByMode = () => (env.CLAUDE_CODE_REMOTE ? "cloud-session" : "signed-out");
//@ chunk-381d7r01.js:990-1108 placement
var getAuthUnavailableReason = () =>
  firstTruthy([
    getAPIProvider() !== "firstParty" && "third-party",
    isBareMode() && "bare",
    isEssentialTrafficOnly() && "traffic-off",
    !isPolicyAllowed(ALLOW_PLUGIN_PUBLISH_KEY) && "policy",
    !isChatSessionWithOwnToken() && authUnavailableReasonByMode(),
  ]);
export { firstTruthy, isDesktopSessionWithOwnToken, authUnavailableReasonByMode, getAuthUnavailableReason };
