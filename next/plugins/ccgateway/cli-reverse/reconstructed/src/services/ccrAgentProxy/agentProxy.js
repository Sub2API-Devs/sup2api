/**
 * services/ccrAgentProxy/agentProxy.ts
 *
 * 2.1.316 新增：是否有可用的远程 SDK URL；会话是否以 bot 身份运行（act_as_bot）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (18)
 * attribution: placement 18
 */
import { resolveSdkUrl, checkSdkUrl } from "../../cli/transports/sdkUrlValidation.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { isRemoteEnvironmentAny, isByocEnvironment } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import { decodeJwtPayload } from "../../bridge/jwtUtils.js";

//@ chunk-aepeg2w5.js:342991-343045 placement
/**
 * 是否有可用的远程 SDK URL。
 */
function hasRemoteSdkUrl() {
  return resolveSdkUrl().status === "ok" && getSessionIngressAuthToken() !== null;
}
//@ chunk-aepeg2w5.js:343045-343107 placement
/**
 * 在远程环境里把 CLAUDE_CODE_REMOTE_SDK_URL 环境变量设为给定地址。
 */
function setRemoteSdkUrlEnv(sdkUrl) {
  if (isRemoteEnvironmentAny()) env.set("CLAUDE_CODE_REMOTE_SDK_URL", sdkUrl);
}
//@ chunk-aepeg2w5.js:343107-343230 placement
function getFallbackRemoteSdkUrl() {
  if (!isRemoteEnvironmentAny() || resolveSdkUrl().status !== "absent") return;
  let CLAUDE_CODE_REMOTE_SDK_URL = env.CLAUDE_CODE_REMOTE_SDK_URL;
  return CLAUDE_CODE_REMOTE_SDK_URL && checkSdkUrl(CLAUDE_CODE_REMOTE_SDK_URL) === null
    ? CLAUDE_CODE_REMOTE_SDK_URL
    : undefined;
}
//@ chunk-aepeg2w5.js:343230-343339 placement
function resolveRemoteSdkUrl() {
  let sdkUrl = resolveSdkUrl();
  if (sdkUrl.status !== "absent") return sdkUrl;
  let fallbackRemoteSdkUrl = getFallbackRemoteSdkUrl();
  return fallbackRemoteSdkUrl === undefined
    ? sdkUrl
    : {
        status: "ok",
        url: fallbackRemoteSdkUrl,
      };
}
//@ chunk-aepeg2w5.js:343339-343394 placement
/**
 * 是否有可用的远程 SDK 地址：常规解析成功，或回退地址存在且已持有会话入口令牌。
 */
function hasUsableRemoteSdkUrl() {
  return (
    hasRemoteSdkUrl() || (getFallbackRemoteSdkUrl() !== undefined && getSessionIngressAuthToken() !== null)
  );
}
//@ chunk-aepeg2w5.js:343394-343518 placement
function getIngressTokenClaims() {
  let sessionIngressAuthToken = getSessionIngressAuthToken();
  if (sessionIngressAuthToken === null) return null;
  let claims = decodeJwtPayload(sessionIngressAuthToken);
  return claims !== null && typeof claims === "object" && !Array.isArray(claims) ? claims : null;
}
//@ chunk-aepeg2w5.js:343518-343567 placement
/**
 * 会话是否以 bot 身份运行（act_as_bot）。
 */
function isActingAsBot() {
  let ingressTokenClaims = getIngressTokenClaims();
  return ingressTokenClaims !== null && isActAsBotClaim(ingressTokenClaims);
}
//@ chunk-aepeg2w5.js:343567-343651 placement
/**
 * 判断令牌声明 act_as_bot 是否为真（布尔 true 或字符串 "true"）。
 */
function isActAsBotClaim(ingressTokenClaims) {
  let actAsBot = "act_as_bot" in ingressTokenClaims ? ingressTokenClaims.act_as_bot : undefined;
  return actAsBot === true || actAsBot === "true";
}
//@ chunk-aepeg2w5.js:343651-343701 placement
/**
 * 判断值是否为非空字符串。
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value !== "";
}
//@ chunk-aepeg2w5.js:343701-343881 placement
/**
 * 会话令牌是否代表服务代理：无账号/sub，带 org_service_name 与 code_agent_id。
 */
function isServiceAgentSession() {
  let ingressTokenClaims = getIngressTokenClaims();
  if (ingressTokenClaims === null) return false;
  return (
    !("account_uuid" in ingressTokenClaims || "sub" in ingressTokenClaims) &&
    "org_service_name" in ingressTokenClaims &&
    isNonEmptyString(ingressTokenClaims.org_service_name) &&
    "code_agent_id" in ingressTokenClaims &&
    isNonEmptyString(ingressTokenClaims.code_agent_id)
  );
}
//@ chunk-aepeg2w5.js:343881-344105 placement
/**
 * 远程环境下令牌角色为 session_worker、无账号且带 code_agent_id，即以代理身份运行的会话 worker。
 */
function isAgentSessionWorker() {
  if (!isByocEnvironment()) return false;
  let ingressTokenClaims = getIngressTokenClaims();
  if (ingressTokenClaims === null) return false;
  let role = "ccr:role" in ingressTokenClaims ? ingressTokenClaims["ccr:role"] : undefined;
  let hasAccountId = "account_uuid" in ingressTokenClaims || "ccr:account_id" in ingressTokenClaims;
  return (
    role === "session_worker" &&
    !hasAccountId &&
    "code_agent_id" in ingressTokenClaims &&
    isNonEmptyString(ingressTokenClaims.code_agent_id)
  );
}
//@ chunk-aepeg2w5.js:344105-344355 placement
/**
 * 远程环境下令牌角色为 session_worker、带账号且无 code_agent_id，即以用户身份运行的会话 worker。
 */
function isUserSessionWorker() {
  if (!isByocEnvironment()) return false;
  let ingressTokenClaims = getIngressTokenClaims();
  if (ingressTokenClaims === null) return false;
  let role = "ccr:role" in ingressTokenClaims ? ingressTokenClaims["ccr:role"] : undefined;
  let hasAccountId =
    ("account_uuid" in ingressTokenClaims && isNonEmptyString(ingressTokenClaims.account_uuid)) ||
    ("ccr:account_id" in ingressTokenClaims && isNonEmptyString(ingressTokenClaims["ccr:account_id"]));
  return role === "session_worker" && hasAccountId && !("code_agent_id" in ingressTokenClaims);
}
//@ chunk-aepeg2w5.js:344355-344491 placement
/**
 * 令牌满足特定形态且带账号或 sub、不带代理 id 时为真。
 */
function isUserIngressToken() {
  let ingressTokenClaims = getIngressTokenClaims();
  if (ingressTokenClaims === null || !isActAsBotClaim(ingressTokenClaims)) return false;
  return (
    (("account_uuid" in ingressTokenClaims && isNonEmptyString(ingressTokenClaims.account_uuid)) ||
      ("sub" in ingressTokenClaims && isNonEmptyString(ingressTokenClaims.sub))) &&
    !hasCodeAgentId(ingressTokenClaims)
  );
}
//@ chunk-aepeg2w5.js:344491-344591 placement
function hasCodeAgentId(ingressTokenClaims) {
  let codeAgentId = "code_agent_id" in ingressTokenClaims ? ingressTokenClaims.code_agent_id : undefined;
  return codeAgentId !== undefined && codeAgentId !== null && codeAgentId !== "";
}
//@ chunk-aepeg2w5.js:344591-344698 placement
/**
 * 令牌不满足特定形态但带 account_uuid、不带代理 id 时为真。
 */
function isAccountIngressToken() {
  let ingressTokenClaims = getIngressTokenClaims();
  if (ingressTokenClaims === null || isActAsBotClaim(ingressTokenClaims)) return false;
  return (
    "account_uuid" in ingressTokenClaims &&
    isNonEmptyString(ingressTokenClaims.account_uuid) &&
    !hasCodeAgentId(ingressTokenClaims)
  );
}
//@ chunk-aepeg2w5.js:344698-344769 placement
/**
 * 匹配 /v1/code/sessions/<id> 路径并捕获会话 id 的正则。
 */
var AGENT_PROXY_PATH = "/v1/code/agent-proxy";
var CODE_SESSIONS_PATH_RE = /^\/v1\/code\/sessions\/([^/]+)\/?$/;
//@ chunk-aepeg2w5.js:344769-344936 placement
function getAgentProxyPath() {
  if (isByocEnvironment()) {
    let remoteSdkUrl = resolveRemoteSdkUrl();
    if (remoteSdkUrl.status === "ok") {
      let sessionId = CODE_SESSIONS_PATH_RE.exec(new URL(remoteSdkUrl.url).pathname)?.[1];
      if (sessionId !== undefined) return `/v1/code/sessions/${sessionId}/agent-proxy`;
    }
  }
  return AGENT_PROXY_PATH;
}
//@ chunk-aepeg2w5.js:344936-345026 placement
/**
 * 把 /api/frame/... 之类的地址改写成走代理的 /frame... 地址。
 */
function getAgentProxyFramePath(framePath) {
  let pathSuffix = framePath.startsWith("/api/frame/") ? framePath.slice(10) : framePath;
  return `${getAgentProxyPath()}/frame${pathSuffix}`;
}
export {
  isAccountIngressToken,
  isActingAsBot,
  AGENT_PROXY_PATH,
  setRemoteSdkUrlEnv,
  hasRemoteSdkUrl,
  isServiceAgentSession,
  isAgentSessionWorker,
  getAgentProxyPath,
  resolveRemoteSdkUrl,
  hasUsableRemoteSdkUrl,
  isUserIngressToken,
  getAgentProxyFramePath,
  isUserSessionWorker,
};
