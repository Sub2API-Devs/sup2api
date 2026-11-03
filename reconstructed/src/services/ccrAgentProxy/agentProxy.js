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
import { uC, op } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import { decodeJwtPayload } from "../../bridge/jwtUtils.js";

/**
 * 是否有可用的远程 SDK URL。
 */
//@ chunk-aepeg2w5.js:342991-343045 placement
function hasRemoteSdkUrl() {
  return resolveSdkUrl().status === "ok" && getSessionIngressAuthToken() !== null;
}
//@ chunk-aepeg2w5.js:343045-343107 placement
function jwi(e) {
  if (uC()) env.set("CLAUDE_CODE_REMOTE_SDK_URL", e);
}
//@ chunk-aepeg2w5.js:343107-343230 placement
function getFallbackRemoteSdkUrl() {
  if (!uC() || resolveSdkUrl().status !== "absent") return;
  let CLAUDE_CODE_REMOTE_SDK_URL = env.CLAUDE_CODE_REMOTE_SDK_URL;
  return CLAUDE_CODE_REMOTE_SDK_URL && checkSdkUrl(CLAUDE_CODE_REMOTE_SDK_URL) === null
    ? CLAUDE_CODE_REMOTE_SDK_URL
    : void 0;
}
//@ chunk-aepeg2w5.js:343230-343339 placement
function resolveRemoteSdkUrl() {
  let e = resolveSdkUrl();
  if (e.status !== "absent") return e;
  let n = getFallbackRemoteSdkUrl();
  return n === void 0 ? e : { status: "ok", url: n };
}
//@ chunk-aepeg2w5.js:343339-343394 placement
function Wwi() {
  return hasRemoteSdkUrl() || (getFallbackRemoteSdkUrl() !== void 0 && getSessionIngressAuthToken() !== null);
}
//@ chunk-aepeg2w5.js:343394-343518 placement
function getIngressTokenClaims() {
  let e = getSessionIngressAuthToken();
  if (e === null) return null;
  let n = decodeJwtPayload(e);
  return n !== null && typeof n === "object" && !Array.isArray(n) ? n : null;
}
/**
 * 会话是否以 bot 身份运行（act_as_bot）。
 */
//@ chunk-aepeg2w5.js:343518-343567 placement
function isActingAsBot() {
  let e = getIngressTokenClaims();
  return e !== null && ap(e);
}
//@ chunk-aepeg2w5.js:343567-343651 placement
function ap(e) {
  let n = "act_as_bot" in e ? e.act_as_bot : void 0;
  return n === !0 || n === "true";
}
//@ chunk-aepeg2w5.js:343651-343701 placement
function tr(e) {
  return typeof e === "string" && e !== "";
}
/**
 * 会话令牌是否代表服务代理：无账号/sub，带 org_service_name 与 code_agent_id。
 */
//@ chunk-aepeg2w5.js:343701-343881 placement
function isServiceAgentSession() {
  let e = getIngressTokenClaims();
  if (e === null) return !1;
  return (
    !("account_uuid" in e || "sub" in e) &&
    "org_service_name" in e &&
    tr(e.org_service_name) &&
    "code_agent_id" in e &&
    tr(e.code_agent_id)
  );
}
/**
 * 远程环境下令牌角色为 session_worker、无账号且带 code_agent_id，即以代理身份运行的会话 worker。
 */
//@ chunk-aepeg2w5.js:343881-344105 placement
function isAgentSessionWorker() {
  if (!op()) return !1;
  let e = getIngressTokenClaims();
  if (e === null) return !1;
  let n = "ccr:role" in e ? e["ccr:role"] : void 0,
    r = "account_uuid" in e || "ccr:account_id" in e;
  return n === "session_worker" && !r && "code_agent_id" in e && tr(e.code_agent_id);
}
/**
 * 远程环境下令牌角色为 session_worker、带账号且无 code_agent_id，即以用户身份运行的会话 worker。
 */
//@ chunk-aepeg2w5.js:344105-344355 placement
function isUserSessionWorker() {
  if (!op()) return !1;
  let e = getIngressTokenClaims();
  if (e === null) return !1;
  let n = "ccr:role" in e ? e["ccr:role"] : void 0,
    r = ("account_uuid" in e && tr(e.account_uuid)) || ("ccr:account_id" in e && tr(e["ccr:account_id"]));
  return n === "session_worker" && r && !("code_agent_id" in e);
}
/**
 * 令牌满足特定形态且带账号或 sub、不带代理 id 时为真。
 */
//@ chunk-aepeg2w5.js:344355-344491 placement
function isUserIngressToken() {
  let e = getIngressTokenClaims();
  if (e === null || !ap(e)) return !1;
  return (("account_uuid" in e && tr(e.account_uuid)) || ("sub" in e && tr(e.sub))) && !hasCodeAgentId(e);
}
//@ chunk-aepeg2w5.js:344491-344591 placement
function hasCodeAgentId(e) {
  let n = "code_agent_id" in e ? e.code_agent_id : void 0;
  return n !== void 0 && n !== null && n !== "";
}
/**
 * 令牌不满足特定形态但带 account_uuid、不带代理 id 时为真。
 */
//@ chunk-aepeg2w5.js:344591-344698 placement
function isAccountIngressToken() {
  let e = getIngressTokenClaims();
  if (e === null || ap(e)) return !1;
  return "account_uuid" in e && tr(e.account_uuid) && !hasCodeAgentId(e);
}
//@ chunk-aepeg2w5.js:344698-344769 placement
var Dto = "/v1/code/agent-proxy",
  HU = /^\/v1\/code\/sessions\/([^/]+)\/?$/;
//@ chunk-aepeg2w5.js:344769-344936 placement
function getAgentProxyPath() {
  if (op()) {
    let e = resolveRemoteSdkUrl();
    if (e.status === "ok") {
      let n = HU.exec(new URL(e.url).pathname)?.[1];
      if (n !== void 0) return `/v1/code/sessions/${n}/agent-proxy`;
    }
  }
  return Dto;
}
//@ chunk-aepeg2w5.js:344936-345026 placement
function Kwi(e) {
  let n = e.startsWith("/api/frame/") ? e.slice(10) : e;
  return `${getAgentProxyPath()}/frame${n}`;
}

export {
  isAccountIngressToken,
  isActingAsBot,
  jwi,
  hasRemoteSdkUrl,
  isServiceAgentSession,
  isAgentSessionWorker,
  getAgentProxyPath,
  resolveRemoteSdkUrl,
  Dto,
  Wwi,
  isUserIngressToken,
  Kwi,
  isUserSessionWorker,
};
